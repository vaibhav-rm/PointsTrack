import { Router } from 'express';
import { z } from 'zod';
import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import {
  db,
  attendees,
  eventsCatalog,
  students,
  pointsLedger,
} from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, conflict } from '../lib/errors.js';
import { notifyStudent } from '../lib/notifications.js';

export const attendeesRouter = Router();

// ---- Student applies to an event ----
const applySchema = z.object({ eventId: z.string().uuid() });

attendeesRouter.post(
  '/',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { eventId } = parseBody(applySchema, req);
    const studentId = req.auth!.sub;

    const [event] = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, eventId));
    if (!event) throw notFound('Event not found');

    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    if (!student) throw notFound('Student profile not found');

    // Eligibility: college-only events restricted to the target college.
    if (!event.openToAll && event.targetCollege && event.targetCollege !== student.college) {
      throw forbidden(`This event is restricted to students of ${event.targetCollege}`);
    }

    // Prevent duplicate applications.
    const [existing] = await db
      .select()
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.studentId, studentId)));
    if (existing) throw conflict('You have already applied to this event');

    // Capacity: a capacity of 0 means unlimited. Once the active spots
    // (pending + checked-in) are full, new applicants join the waitlist.
    let status: 'pending' | 'waitlisted' = 'pending';
    if (event.capacity && event.capacity > 0) {
      const active = await db
        .select({ id: attendees.id })
        .from(attendees)
        .where(
          and(
            eq(attendees.eventId, eventId),
            inArray(attendees.status, ['pending', 'checked-in'])
          )
        );
      if (active.length >= event.capacity) status = 'waitlisted';
    }

    const [attendee] = await db
      .insert(attendees)
      .values({
        eventId,
        studentId,
        organizerId: event.organizerId,
        name: student.name,
        email: student.email,
        eventTitle: event.title,
        status,
        engagement: status === 'waitlisted' ? 'Waitlisted' : 'Pending',
        pointsAwarded: event.points,
        // Set only when the organizer actually checks the student in.
        checkInTimestamp: null,
      })
      .returning();

    res.status(201).json(attendee);
  })
);

// ---- Organizer checks a student in by scanning their QR ----
// The QR encodes the student's id; the organizer is already in the context of
// one of their events. Handles three cases: already-applied (check in + award),
// walk-up who never applied (create + check in), and already-checked-in (no-op).
const qrCheckinSchema = z.object({
  eventId: z.string().uuid(),
  studentId: z.string().uuid(),
});

attendeesRouter.post(
  '/checkin-by-qr',
  requireAuth,
  requireRole('organizer'),
  asyncHandler(async (req, res) => {
    const { eventId, studentId } = parseBody(qrCheckinSchema, req);

    const [event] = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, eventId));
    if (!event) throw notFound('Event not found');
    if (event.organizerId !== req.auth!.sub) throw forbidden('Not your event');

    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId));
    if (!student) throw notFound('Student not found');

    let [attendee] = await db
      .select()
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.studentId, studentId)));

    if (attendee && attendee.status === 'checked-in') {
      return res.json({ attendee, alreadyCheckedIn: true, studentName: attendee.name });
    }

    // Walk-up: the student never applied — register them on the spot.
    if (!attendee) {
      [attendee] = await db
        .insert(attendees)
        .values({
          eventId,
          studentId,
          organizerId: event.organizerId,
          name: student.name,
          email: student.email,
          eventTitle: event.title,
          status: 'pending',
          engagement: 'Pending',
          pointsAwarded: event.points,
          checkInTimestamp: null,
        })
        .returning();
    }

    const updated = await applyStatusChange(attendee, 'checked-in', 'High');
    res.json({ attendee: updated, alreadyCheckedIn: false, studentName: student.name });
  })
);

// ---- Has the current student applied to an event? ----
attendeesRouter.get(
  '/check',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const eventId = req.query.eventId as string;
    if (!eventId) throw badRequest('eventId is required');
    const [existing] = await db
      .select({ id: attendees.id, status: attendees.status })
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.studentId, req.auth!.sub)));
    res.json({ applied: !!existing, status: existing?.status ?? null });
  })
);

// ---- Student lists their own applications (for the upcoming-events feed) ----
attendeesRouter.get(
  '/mine',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(attendees)
      .where(eq(attendees.studentId, req.auth!.sub))
      .orderBy(desc(attendees.checkInTimestamp));
    res.json(rows);
  })
);

// ---- Organizer lists their attendees ----
attendeesRouter.get(
  '/',
  requireAuth,
  requireRole('organizer'),
  asyncHandler(async (req, res) => {
    // Always scoped to the calling organizer; optionally narrowed to one event
    // (?eventId=) so the dashboard can show attendees inside their own event.
    const eventId = (req.query.eventId as string) || undefined;
    const rows = await db
      .select()
      .from(attendees)
      .where(
        eventId
          ? and(
              eq(attendees.organizerId, req.auth!.sub),
              eq(attendees.eventId, eventId)
            )
          : eq(attendees.organizerId, req.auth!.sub)
      )
      .orderBy(desc(attendees.checkInTimestamp));
    res.json(rows);
  })
);

// ---- Organizer updates attendee status (approve/reject) ----
const statusSchema = z.object({
  status: z.enum(['checked-in', 'rejected']),
  engagement: z.string().default('High'),
});

// When a spot frees up on a capacity-limited event, promote the longest-waiting
// waitlisted student to pending and let them know.
async function promoteFromWaitlist(eventId: string) {
  const [event] = await db
    .select()
    .from(eventsCatalog)
    .where(eq(eventsCatalog.id, eventId));
  if (!event || !event.capacity || event.capacity <= 0) return;

  const active = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(
      and(
        eq(attendees.eventId, eventId),
        inArray(attendees.status, ['pending', 'checked-in'])
      )
    );
  if (active.length >= event.capacity) return; // still full

  const [next] = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.eventId, eventId), eq(attendees.status, 'waitlisted')))
    .orderBy(asc(attendees.createdAt))
    .limit(1);
  if (!next) return;

  await db
    .update(attendees)
    .set({ status: 'pending', engagement: 'Pending' })
    .where(eq(attendees.id, next.id));

  notifyStudent(next.studentId, {
    title: "You're off the waitlist! 🎉",
    body: `A spot opened up for ${next.eventTitle}.`,
    data: { eventId, type: 'waitlist_promoted' },
  }).catch((err) => console.error('notifyStudent failed:', err));
}

// Apply a status change to one already-fetched, ownership-verified attendee.
// On the first transition to checked-in it awards points (ledger row + push);
// it's idempotent — an attendee already checked-in is never awarded twice.
async function applyStatusChange(
  attendee: typeof attendees.$inferSelect,
  status: 'checked-in' | 'rejected',
  engagement: string = 'High'
) {
  const alreadyCheckedIn = attendee.status === 'checked-in';

  const [updated] = await db
    .update(attendees)
    .set({
      status,
      engagement,
      checkInTimestamp:
        status === 'checked-in' ? new Date() : attendee.checkInTimestamp,
    })
    .where(eq(attendees.id, attendee.id))
    .returning();

  if (status === 'checked-in' && !alreadyCheckedIn) {
    const [event] = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, attendee.eventId));

    await db.insert(pointsLedger).values({
      studentId: attendee.studentId,
      organizerId: attendee.organizerId,
      eventId: attendee.eventId,
      clubName: event?.clubName,
      clubLogo: event?.clubLogo,
      title: attendee.eventTitle,
      type: event?.type ?? 'Points Awarded',
      description:
        event?.description ??
        `You were awarded ${attendee.pointsAwarded} points for attending this event.`,
      points: attendee.pointsAwarded,
      semester: 1,
      date: new Date().toISOString().split('T')[0],
      certificateUrl: event?.certificateUrl,
    });

    notifyStudent(attendee.studentId, {
      title: 'Points Awarded! 🎉',
      body: `You just received ${attendee.pointsAwarded} points for ${attendee.eventTitle}!`,
      data: { eventId: attendee.eventId, type: 'points_awarded' },
    }).catch((err) => console.error('notifyStudent failed:', err));
  }

  // Rejecting someone who held an active spot may free room for the waitlist.
  if (status === 'rejected' && (attendee.status === 'pending' || attendee.status === 'checked-in')) {
    await promoteFromWaitlist(attendee.eventId);
  }

  return updated;
}

// ---- Bulk status update (approve/reject many at once) ----
// Registered before '/:id' so the literal path isn't captured as an id.
const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(['checked-in', 'rejected']),
  engagement: z.string().default('High'),
});

attendeesRouter.patch(
  '/bulk',
  requireAuth,
  requireRole('organizer'),
  asyncHandler(async (req, res) => {
    const { ids, status, engagement } = parseBody(bulkSchema, req);

    const rows = await db
      .select()
      .from(attendees)
      .where(inArray(attendees.id, ids));
    const owned = rows.filter((r) => r.organizerId === req.auth!.sub);

    const updated = [];
    for (const a of owned) {
      updated.push(await applyStatusChange(a, status, engagement));
    }

    res.json({ updated: updated.length, skipped: ids.length - updated.length, attendees: updated });
  })
);

attendeesRouter.patch(
  '/:id',
  requireAuth,
  requireRole('organizer'),
  asyncHandler(async (req, res) => {
    const { status, engagement } = parseBody(statusSchema, req);

    const [attendee] = await db
      .select()
      .from(attendees)
      .where(eq(attendees.id, req.params.id));
    if (!attendee) throw notFound('Attendee not found');
    if (attendee.organizerId !== req.auth!.sub) throw forbidden('Not your attendee');

    const updated = await applyStatusChange(attendee, status, engagement);
    res.json(updated);
  })
);
