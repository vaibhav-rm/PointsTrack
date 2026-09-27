import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or, desc, sql, count, ilike } from 'drizzle-orm';
import { db, eventsCatalog, organizers, attendees, students, eventVolunteers, clubs, clubMemberships, colleges } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination, setTotalCount } from '../lib/pagination.js';
import { requireAuth, requireClub } from '../middleware/auth.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { notifyStudentsByCollege } from '../lib/notifications.js';

export const eventsRouter = Router();

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  points: z.coerce.number().int().min(0).default(10),
  capacity: z.coerce.number().int().min(0).default(0),
  openToAll: z.boolean().default(false),
  images: z.array(z.string()).default([]),
});

function buildDate(startDate: string, startTime?: string) {
  return startTime ? `${startDate}T${startTime}` : `${startDate}T00:00`;
}

// Canonical timestamp for the new start_at column. Returns null for
// unparseable input so inserts never fail on a bad date string.
function buildStartAt(startDate: string, startTime?: string): Date | null {
  const d = new Date(buildDate(startDate, startTime));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Newest-first ordering that prefers the indexed start_at column and falls
// back to the legacy text date for rows predating the backfill.
const newestFirst = [
  sql`${eventsCatalog.startAt} DESC NULLS LAST`,
  desc(eventsCatalog.date),
];

// Tenancy resolution: collegeId is the canonical key; the legacy college
// name still works and is resolved best-effort so old clients keep working.
async function resolveCollegeId(
  collegeName?: string | null,
  hintId?: string | null
): Promise<string | null> {
  if (hintId) {
    const [c] = await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.id, hintId));
    if (c) return c.id;
  }
  if (collegeName) {
    const [c] = await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.name, collegeName));
    if (c) return c.id;
  }
  return null;
}

// The creator's club determines event tenancy: prefer their first active
// club's college, else fall back to matching their legacy profile college.
async function resolveCreatorCollege(accountId: string, fallbackCollege: string) {
  const [row] = await db
    .select({ collegeId: clubs.collegeId })
    .from(clubMemberships)
    .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
    .where(and(eq(clubMemberships.accountId, accountId), eq(clubMemberships.status, 'active')));
  if (row?.collegeId) return row.collegeId;
  return resolveCollegeId(fallbackCollege);
}

// ---- Public feed: events a student can see (their college + open-to-all) ----
// GET /events?college=NAME&collegeId=UUID&search=..&clubId=..&openToAll=true
// College scoping prefers collegeId (indexed FK); `college` name is resolved
// best-effort for backwards compatibility with old mobile builds.
eventsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const college = (req.query.college as string) || undefined;
    const collegeIdParam = (req.query.collegeId as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const clubId = (req.query.clubId as string) || undefined;
    const openToAllOnly = (req.query.openToAll as string) === 'true';
    const { limit, offset } = parsePagination(req);

    const collegeId = collegeIdParam ?? (college ? await resolveCollegeId(college) : null);

    const filters = [];
    if (openToAllOnly) {
      filters.push(eq(eventsCatalog.openToAll, true));
    } else if (collegeId) {
      filters.push(or(eq(eventsCatalog.openToAll, true), eq(eventsCatalog.collegeId, collegeId)));
    } else if (college) {
      // Legacy name-based scoping for rows predating the college_id backfill.
      filters.push(or(eq(eventsCatalog.openToAll, true), eq(eventsCatalog.targetCollege, college)));
    }
    if (search) filters.push(ilike(eventsCatalog.title, `%${search}%`));
    if (clubId) filters.push(eq(eventsCatalog.clubId, clubId));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(eventsCatalog).where(where).orderBy(...newestFirst).limit(limit).offset(offset),
      db.select({ total: count() }).from(eventsCatalog).where(where),
    ]);
    setTotalCount(res, total);
    res.json(rows);
  })
);

// ---- Organizer's own events ----
eventsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req);
    const search = (req.query.search as string) || undefined;
    const where = search
      ? and(eq(eventsCatalog.organizerId, req.auth!.sub), ilike(eventsCatalog.title, `%${search}%`))
      : eq(eventsCatalog.organizerId, req.auth!.sub);
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(eventsCatalog).where(where).orderBy(...newestFirst).limit(limit).offset(offset),
      db.select({ total: count() }).from(eventsCatalog).where(where),
    ]);
    setTotalCount(res, total);

    // Attach per-event registration counts so the dashboard can show how many
    // students applied / were checked in without an extra round-trip per card.
    const counts = await db
      .select({
        eventId: attendees.eventId,
        total: sql<number>`(count(*))::int`,
        checkedIn: sql<number>`(count(*) filter (where ${attendees.status} = 'checked-in'))::int`,
      })
      .from(attendees)
      .where(eq(attendees.organizerId, req.auth!.sub))
      .groupBy(attendees.eventId);

    const countMap = new Map(counts.map((c) => [c.eventId, c]));
    const withCounts = rows.map((e) => ({
      ...e,
      attendeeCount: countMap.get(e.id)?.total ?? 0,
      checkedInCount: countMap.get(e.id)?.checkedIn ?? 0,
    }));

    res.json(withCounts);
  })
);

// ---- A given organizer's events (public club profile in the mobile app) ----
eventsRouter.get(
  '/by-organizer/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req);
    const where = eq(eventsCatalog.organizerId, req.params.id);
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(eventsCatalog).where(where).orderBy(...newestFirst).limit(limit).offset(offset),
      db.select({ total: count() }).from(eventsCatalog).where(where),
    ]);
    setTotalCount(res, total);
    res.json(rows);
  })
);

// ---- Single event ----
eventsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [event] = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, req.params.id));
    if (!event) throw notFound('Event not found');
    res.json(event);
  })
);

// ---- Create event (must own a club) ----
eventsRouter.post(
  '/',
  requireAuth,
  requireClub,
  asyncHandler(async (req, res) => {
    const data = parseBody(eventSchema, req);
    const [profile] = await db
      .select()
      .from(organizers)
      .where(eq(organizers.id, req.auth!.sub));
    if (!profile) throw notFound('Organizer profile not found');

    const [event] = await db
      .insert(eventsCatalog)
      .values({
        organizerId: req.auth!.sub,
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate || data.startDate,
        startTime: data.startTime,
        endTime: data.endTime,
        date: buildDate(data.startDate, data.startTime),
        startAt: buildStartAt(data.startDate, data.startTime),
        location: data.location,
        type: 'Activity',
        points: data.points,
        capacity: data.capacity,
        clubName: profile.clubName,
        clubLogo: profile.logo,
        targetCollege: profile.college,
        collegeId: await resolveCreatorCollege(req.auth!.sub, profile.college),
        openToAll: data.openToAll,
        images: data.images ?? [],
        certificateUrl: data.images?.[0] ?? null,
      })
      .returning();

    // Fire-and-forget broadcast to eligible students.
    notifyStudentsByCollege(
      {
        title: `New event: ${event.title}`,
        body: `${profile.clubName} just posted a new activity worth ${event.points} points.`,
        data: { eventId: event.id, type: 'event_update' },
      },
      event.openToAll ? null : event.targetCollege
    ).catch((err) => console.error('Broadcast failed:', err));

    res.status(201).json(event);
  })
);

// ---------------------------------------------------------------------------
// Volunteers — students the owner authorises to scan/check-in for an event.
// ---------------------------------------------------------------------------

// Ensures the caller owns the event; returns it. Used by volunteer routes.
async function getOwnedEvent(eventId: string, accountId: string) {
  const [event] = await db.select().from(eventsCatalog).where(eq(eventsCatalog.id, eventId));
  if (!event) throw notFound('Event not found');
  if (event.organizerId !== accountId) throw forbidden('Not your event');
  return event;
}

// List volunteers for an event (owner only).
eventsRouter.get(
  '/:id/volunteers',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getOwnedEvent(req.params.id, req.auth!.sub);
    const rows = await db
      .select({
        studentId: eventVolunteers.studentId,
        name: students.name,
        email: students.email,
        usn: students.usn,
        addedAt: eventVolunteers.createdAt,
      })
      .from(eventVolunteers)
      .innerJoin(students, eq(students.id, eventVolunteers.studentId))
      .where(eq(eventVolunteers.eventId, req.params.id))
      .orderBy(desc(eventVolunteers.createdAt));
    res.json(rows);
  })
);

// Add a volunteer by USN or email (owner only).
const addVolunteerSchema = z
  .object({ usn: z.string().optional(), email: z.string().email().optional() })
  .refine((d) => d.usn || d.email, { message: 'Provide a USN or email' });

eventsRouter.post(
  '/:id/volunteers',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getOwnedEvent(req.params.id, req.auth!.sub);
    const { usn, email } = parseBody(addVolunteerSchema, req);

    // Normalize exactly like registration does (USN uppercased, email
    // lowercased) so '1rv22cs001' / 'John@X.com' still resolve.
    const [student] = await db
      .select()
      .from(students)
      .where(
        usn
          ? eq(students.usn, usn.trim().toUpperCase())
          : eq(students.email, email!.trim().toLowerCase())
      );
    if (!student) throw notFound('No student found with that USN/email');
    if (student.id === req.auth!.sub) throw badRequest('You already own this event');

    await db
      .insert(eventVolunteers)
      .values({ eventId: req.params.id, studentId: student.id })
      .onConflictDoNothing({ target: [eventVolunteers.eventId, eventVolunteers.studentId] });

    res.status(201).json({ studentId: student.id, name: student.name, email: student.email, usn: student.usn });
  })
);

// Remove a volunteer (owner only).
eventsRouter.delete(
  '/:id/volunteers/:studentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getOwnedEvent(req.params.id, req.auth!.sub);
    await db
      .delete(eventVolunteers)
      .where(
        and(
          eq(eventVolunteers.eventId, req.params.id),
          eq(eventVolunteers.studentId, req.params.studentId)
        )
      );
    res.json({ success: true });
  })
);

// Whether the caller can scan this event (owner or volunteer) — drives the
// mobile UI (show "Scan" vs "Apply").
eventsRouter.get(
  '/:id/scan-access',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [event] = await db
      .select({ organizerId: eventsCatalog.organizerId })
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, req.params.id));
    if (!event) throw notFound('Event not found');

    const isOwner = event.organizerId === req.auth!.sub;
    let isVolunteer = false;
    if (!isOwner) {
      const [vol] = await db
        .select({ id: eventVolunteers.id })
        .from(eventVolunteers)
        .where(
          and(
            eq(eventVolunteers.eventId, req.params.id),
            eq(eventVolunteers.studentId, req.auth!.sub)
          )
        );
      isVolunteer = !!vol;
    }
    res.json({ isOwner, isVolunteer, canScan: isOwner || isVolunteer });
  })
);

// ---- Update event (organizer, owner only) ----
eventsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseBody(eventSchema.partial(), req);
    const [existing] = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, req.params.id));
    if (!existing) throw notFound('Event not found');
    if (existing.organizerId !== req.auth!.sub) throw forbidden('Not your event');

    const startDate = data.startDate ?? existing.startDate;
    const startTime = data.startTime ?? existing.startTime ?? undefined;

    const [updated] = await db
      .update(eventsCatalog)
      .set({
        ...data,
        endDate: data.endDate ?? existing.endDate,
        date: buildDate(startDate, startTime),
        startAt: buildStartAt(startDate, startTime),
        certificateUrl: data.images ? data.images[0] ?? null : existing.certificateUrl,
      })
      .where(eq(eventsCatalog.id, req.params.id))
      .returning();

    res.json(updated);
  })
);

// ---- Delete event (organizer, owner only) ----
eventsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, req.params.id));
    if (!existing) throw notFound('Event not found');
    if (existing.organizerId !== req.auth!.sub) throw forbidden('Not your event');

    await db.delete(eventsCatalog).where(eq(eventsCatalog.id, req.params.id));
    res.json({ success: true });
  })
);
