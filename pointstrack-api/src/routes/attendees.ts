import { Router } from 'express';
import { z } from 'zod';
import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import {
  db,
  attendees,
  eventsCatalog,
  students,
  pointsLedger,
  eventVolunteers,
} from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, conflict } from '../lib/errors.js';
import { notifyStudent } from '../lib/notifications.js';

export const attendeesRouter = Router();

const ACTIVE_STATUSES = ['pending', 'checked-in'] as const;

// ---------------------------------------------------------------------------
// Helpers (transactional so they're correct under concurrent requests)
// ---------------------------------------------------------------------------

// Promote the longest-waiting waitlisted student when a spot frees up. Locks the
// event row first (consistent lock order with apply) to serialise capacity math.
async function promoteFromWaitlist(eventId: string) {
  const promoted = await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, eventId))
      .for('update');
    if (!event || !event.capacity || event.capacity <= 0) return null;

    const active = await tx
      .select({ id: attendees.id })
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), inArray(attendees.status, [...ACTIVE_STATUSES])));
    if (active.length >= event.capacity) return null; // still full

    const [next] = await tx
      .select()
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.status, 'waitlisted')))
      .orderBy(asc(attendees.createdAt))
      .limit(1)
      .for('update');
    if (!next) return null;

    await tx
      .update(attendees)
      .set({ status: 'pending', engagement: 'Pending' })
      .where(eq(attendees.id, next.id));
    return next;
  });

  if (promoted) {
    notifyStudent(promoted.studentId, {
      title: "You're off the waitlist! 🎉",
      body: `A spot opened up for ${promoted.eventTitle}.`,
      data: { eventId, type: 'waitlist_promoted' },
    }).catch((err) => console.error('notifyStudent failed:', err));
  }
}

// Apply a status change to one attendee (by id) inside a transaction that locks
// the attendee row. On the first transition to checked-in it awards points; the
// unique(attendee_id) ledger index + the row lock make double-awards impossible.
// Push + waitlist promotion run AFTER commit (never inside the transaction).
async function applyStatusChange(
  attendeeId: string,
  status: 'checked-in' | 'rejected',
  engagement: string = 'High'
) {
  const result = await db.transaction(async (tx) => {
    const [attendee] = await tx
      .select()
      .from(attendees)
      .where(eq(attendees.id, attendeeId))
      .for('update');
    if (!attendee) return null;

    const wasCheckedIn = attendee.status === 'checked-in';
    const heldActiveSpot = attendee.status === 'pending' || attendee.status === 'checked-in';

    const [updated] = await tx
      .update(attendees)
      .set({
        status,
        engagement,
        checkInTimestamp: status === 'checked-in' ? new Date() : attendee.checkInTimestamp,
      })
      .where(eq(attendees.id, attendeeId))
      .returning();

    let awarded = false;
    if (status === 'checked-in' && !wasCheckedIn) {
      const [event] = await tx
        .select()
        .from(eventsCatalog)
        .where(eq(eventsCatalog.id, attendee.eventId));

      const inserted = await tx
        .insert(pointsLedger)
        .values({
          attendeeId: attendee.id,
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
        })
        .onConflictDoNothing({ target: pointsLedger.attendeeId })
        .returning();
      awarded = inserted.length > 0;
    }

    return {
      updated,
      awarded,
      freedSlot: status === 'rejected' && heldActiveSpot,
      studentId: attendee.studentId,
      eventId: attendee.eventId,
      eventTitle: attendee.eventTitle,
      pointsAwarded: attendee.pointsAwarded,
    };
  });

  if (!result) throw notFound('Attendee not found');

  if (result.awarded) {
    notifyStudent(result.studentId, {
      title: 'Points Awarded! 🎉',
      body: `You just received ${result.pointsAwarded} points for ${result.eventTitle}!`,
      data: { eventId: result.eventId, type: 'points_awarded' },
    }).catch((err) => console.error('notifyStudent failed:', err));
  }
  if (result.freedSlot) {
    await promoteFromWaitlist(result.eventId);
  }

  return result.updated;
}

// ---------------------------------------------------------------------------
// Student applies to an event
// ---------------------------------------------------------------------------
const applySchema = z.object({ eventId: z.string().uuid() });

attendeesRouter.post(
  '/',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { eventId } = parseBody(applySchema, req);
    const studentId = req.auth!.sub;

    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    if (!student) throw notFound('Student profile not found');

    // Whole thing is transactional + the event row is locked, so the capacity
    // count and the insert can't race with other applicants. The DB unique index
    // on (event_id, student_id) is the final backstop against duplicates.
    const attendee = await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(eventsCatalog)
        .where(eq(eventsCatalog.id, eventId))
        .for('update');
      if (!event) throw notFound('Event not found');

      if (!event.openToAll && event.targetCollege && event.targetCollege !== student.college) {
        throw forbidden(`This event is restricted to students of ${event.targetCollege}`);
      }

      const [existing] = await tx
        .select({ id: attendees.id })
        .from(attendees)
        .where(and(eq(attendees.eventId, eventId), eq(attendees.studentId, studentId)));
      if (existing) throw conflict('You have already applied to this event');

      // capacity 0 = unlimited; otherwise full active spots → waitlist.
      let status: 'pending' | 'waitlisted' = 'pending';
      if (event.capacity && event.capacity > 0) {
        const active = await tx
          .select({ id: attendees.id })
          .from(attendees)
          .where(and(eq(attendees.eventId, eventId), inArray(attendees.status, [...ACTIVE_STATUSES])));
        if (active.length >= event.capacity) status = 'waitlisted';
      }

      const [row] = await tx
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
          checkInTimestamp: null,
        })
        .returning();
      return row;
    });

    res.status(201).json(attendee);
  })
);

// ---------------------------------------------------------------------------
// Organizer checks a student in by scanning their QR
// ---------------------------------------------------------------------------
const qrCheckinSchema = z.object({
  eventId: z.string().uuid(),
  studentId: z.string().uuid(),
});

attendeesRouter.post(
  '/checkin-by-qr',
  requireAuth, // the event owner OR an assigned volunteer may scan
  asyncHandler(async (req, res) => {
    const { eventId, studentId } = parseBody(qrCheckinSchema, req);

    const [event] = await db.select().from(eventsCatalog).where(eq(eventsCatalog.id, eventId));
    if (!event) throw notFound('Event not found');

    // Authorise: you must own this event, or be an assigned volunteer for it.
    if (event.organizerId !== req.auth!.sub) {
      const [vol] = await db
        .select({ id: eventVolunteers.id })
        .from(eventVolunteers)
        .where(and(eq(eventVolunteers.eventId, eventId), eq(eventVolunteers.studentId, req.auth!.sub)));
      if (!vol) throw forbidden('You are not authorised to scan for this event');
    }

    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    if (!student) throw notFound('Student not found');

    let [attendee] = await db
      .select()
      .from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.studentId, studentId)));

    if (attendee && attendee.status === 'checked-in') {
      return res.json({ attendee, alreadyCheckedIn: true, studentName: attendee.name });
    }

    // Walk-up who never applied — create on the spot. onConflictDoNothing absorbs
    // a concurrent create (two devices scanning the same student); we re-read after.
    if (!attendee) {
      await db
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
        .onConflictDoNothing({
          target: [attendees.eventId, attendees.studentId],
        });
      [attendee] = await db
        .select()
        .from(attendees)
        .where(and(eq(attendees.eventId, eventId), eq(attendees.studentId, studentId)));
    }

    const updated = await applyStatusChange(attendee!.id, 'checked-in', 'High');
    res.json({ attendee: updated, alreadyCheckedIn: false, studentName: student.name });
  })
);

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Has the current student applied to an event?
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

// Student's own applications (for the upcoming-events feed).
attendeesRouter.get(
  '/mine',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req);
    const rows = await db
      .select()
      .from(attendees)
      .where(eq(attendees.studentId, req.auth!.sub))
      .orderBy(desc(attendees.checkInTimestamp))
      .limit(limit)
      .offset(offset);
    res.json(rows);
  })
);

// Organizer's attendees, optionally narrowed to one event (?eventId=).
attendeesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req);
    const eventId = (req.query.eventId as string) || undefined;
    const rows = await db
      .select()
      .from(attendees)
      .where(
        eventId
          ? and(eq(attendees.organizerId, req.auth!.sub), eq(attendees.eventId, eventId))
          : eq(attendees.organizerId, req.auth!.sub)
      )
      .orderBy(desc(attendees.checkInTimestamp))
      .limit(limit)
      .offset(offset);
    res.json(rows);
  })
);

// ---------------------------------------------------------------------------
// Status updates (approve / reject)
// ---------------------------------------------------------------------------
const statusSchema = z.object({
  status: z.enum(['checked-in', 'rejected']),
  engagement: z.string().default('High'),
});

// Bulk update — registered before '/:id' so the literal path isn't captured.
const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(['checked-in', 'rejected']),
  engagement: z.string().default('High'),
});

attendeesRouter.patch(
  '/bulk',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids, status, engagement } = parseBody(bulkSchema, req);

    const rows = await db
      .select({ id: attendees.id })
      .from(attendees)
      .where(and(inArray(attendees.id, ids), eq(attendees.organizerId, req.auth!.sub)));

    const updated = [];
    for (const a of rows) {
      updated.push(await applyStatusChange(a.id, status, engagement));
    }

    res.json({ updated: updated.length, skipped: ids.length - updated.length, attendees: updated });
  })
);

attendeesRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, engagement } = parseBody(statusSchema, req);

    const [attendee] = await db
      .select({ id: attendees.id, organizerId: attendees.organizerId })
      .from(attendees)
      .where(eq(attendees.id, req.params.id));
    if (!attendee) throw notFound('Attendee not found');
    if (attendee.organizerId !== req.auth!.sub) throw forbidden('Not your attendee');

    const updated = await applyStatusChange(attendee.id, status, engagement);
    res.json(updated);
  })
);
