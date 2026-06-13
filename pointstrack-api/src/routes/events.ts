import { Router } from 'express';
import { z } from 'zod';
import { eq, or, desc, sql } from 'drizzle-orm';
import { db, eventsCatalog, organizers, attendees } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { forbidden, notFound } from '../lib/errors.js';
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

// ---- Public feed: events a student can see (their college + open-to-all) ----
// GET /events?college=NAME  -> for students browsing
eventsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const college = (req.query.college as string) || undefined;
    const { limit, offset } = parsePagination(req);

    const rows = await db
      .select()
      .from(eventsCatalog)
      .where(
        college
          ? or(eq(eventsCatalog.openToAll, true), eq(eventsCatalog.targetCollege, college))
          : undefined
      )
      .orderBy(desc(eventsCatalog.date))
      .limit(limit)
      .offset(offset);

    res.json(rows);
  })
);

// ---- Organizer's own events ----
eventsRouter.get(
  '/mine',
  requireAuth,
  requireRole('organizer'),
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req);
    const rows = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.organizerId, req.auth!.sub))
      .orderBy(desc(eventsCatalog.date))
      .limit(limit)
      .offset(offset);

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
    const rows = await db
      .select()
      .from(eventsCatalog)
      .where(eq(eventsCatalog.organizerId, req.params.id))
      .orderBy(desc(eventsCatalog.date))
      .limit(limit)
      .offset(offset);
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

// ---- Create event (organizer) ----
eventsRouter.post(
  '/',
  requireAuth,
  requireRole('organizer'),
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
        location: data.location,
        type: 'Activity',
        points: data.points,
        capacity: data.capacity,
        clubName: profile.clubName,
        clubLogo: profile.logo,
        targetCollege: profile.college,
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

// ---- Update event (organizer, owner only) ----
eventsRouter.put(
  '/:id',
  requireAuth,
  requireRole('organizer'),
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
  requireRole('organizer'),
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
