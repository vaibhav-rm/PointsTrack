import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or, inArray } from 'drizzle-orm';
import { db, organizers, students, clubMemberships, attendees, eventsCatalog } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, notFound, forbidden } from '../lib/errors.js';

export const profileRouter = Router();

// ---- Organizer profile update (settings page) ----
const organizerUpdateSchema = z.object({
  clubName: z.string().min(1).optional(),
  college: z.string().min(1).optional(),
  bio: z.string().optional(),
  establishedDate: z.string().optional(),
  coreTeam: z.string().optional(),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  fullName: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #4F46E5').optional(),
  // ---- Public club-page customization ----
  links: z.array(z.object({ type: z.string().min(1), url: z.string().min(1) })).max(12).optional(),
  gallery: z.array(z.string()).max(20).optional(),
  announcement: z.string().max(280).nullable().optional(),
  announcementLink: z.string().nullable().optional(),
  coverStyle: z.enum(['gradient', 'solid']).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color').nullable().optional(),
  hiddenSections: z.array(z.string()).max(10).optional(),
});

// Create or update the caller's club. Any student can create one (that's how a
// student "becomes an organizer"); editing requires nothing more than owning it.
profileRouter.patch(
  '/organizer',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseBody(organizerUpdateSchema, req);
    const [existing] = await db
      .select({ id: organizers.id })
      .from(organizers)
      .where(eq(organizers.id, req.auth!.sub));

    if (existing) {
      const [updated] = await db
        .update(organizers)
        .set(data)
        .where(eq(organizers.id, req.auth!.sub))
        .returning();
      return res.json(updated);
    }

    // First time → create the club. Name + college are required to exist.
    if (!data.clubName || !data.college) {
      throw badRequest('clubName and college are required to create a club');
    }
    const [created] = await db
      .insert(organizers)
      .values({
        id: req.auth!.sub,
        email: req.auth!.email,
        clubName: data.clubName,
        college: data.college,
        fullName: data.fullName,
        bio: data.bio,
        establishedDate: data.establishedDate,
        coreTeam: data.coreTeam,
        logo: data.logo,
        coverImage: data.coverImage,
        accentColor: data.accentColor,
      })
      .returning();
    res.status(201).json(created);
  })
);

// ---- Public organizer profile (mobile ClubProfile screen) ----
profileRouter.get(
  '/organizer/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [profile] = await db
      .select()
      .from(organizers)
      .where(eq(organizers.id, req.params.id));
    if (!profile) throw notFound('Organizer not found');
    res.json(profile);
  })
);

// ---- Student profile update ----
const studentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  year: z.coerce.number().int().min(1).optional(),
  semester: z.coerce.number().int().min(1).optional(),
  pushToken: z.string().optional(),
});

profileRouter.patch(
  '/student',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const data = parseBody(studentUpdateSchema, req);
    const [updated] = await db
      .update(students)
      .set(data)
      .where(eq(students.id, req.auth!.sub))
      .returning();
    if (!updated) throw notFound('Student not found');
    res.json(updated);
  })
);

// ---- Save/refresh push token (called by the mobile app) ----
const pushTokenSchema = z.object({ pushToken: z.string().min(1) });

profileRouter.put(
  '/student/push-token',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { pushToken } = parseBody(pushTokenSchema, req);
    await db
      .update(students)
      .set({ pushToken })
      .where(eq(students.id, req.auth!.sub));
    res.json({ success: true });
  })
);

// ---- Get single student private profile (Relational Privacy Guard) ----
profileRouter.get(
  '/student/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const callerId = req.auth!.sub;
    const targetStudentId = req.params.id;

    // 1. Student caller accessing own profile
    if (callerId === targetStudentId) {
      const [profile] = await db.select().from(students).where(eq(students.id, targetStudentId));
      if (!profile) throw notFound('Student not found');
      return res.json(profile);
    }

    // 2. Admin caller accessing student profile
    if (req.auth!.role === ('admin' as any)) {
      const [profile] = await db.select().from(students).where(eq(students.id, targetStudentId));
      if (!profile) throw notFound('Student not found');
      return res.json(profile);
    }

    // 3. Organizer caller: Allowed ONLY if target student registered/checked into an event owned by caller or caller's active clubs
    if (req.auth!.role === 'organizer') {
      const userClubs = await db
        .select({ clubId: clubMemberships.clubId })
        .from(clubMemberships)
        .where(
          and(
            eq(clubMemberships.accountId, callerId),
            eq(clubMemberships.status, 'active')
          )
        );
      
      const clubIds = userClubs.map((c) => c.clubId);

      // Schema-proven inner join: attendees.eventId -> eventsCatalog.id
      // Checks eventsCatalog.organizerId == callerId (account ID) AND eventsCatalog.clubId IN (clubIds)
      const [relatedAttendee] = await db
        .select({ id: attendees.id })
        .from(attendees)
        .innerJoin(eventsCatalog, eq(eventsCatalog.id, attendees.eventId))
        .where(
          and(
            eq(attendees.studentId, targetStudentId),
            or(
              eq(eventsCatalog.organizerId, callerId),
              clubIds.length > 0 ? inArray(eventsCatalog.clubId, clubIds) : undefined
            )
          )
        );

      if (relatedAttendee) {
        const [profile] = await db.select().from(students).where(eq(students.id, targetStudentId));
        if (!profile) throw notFound('Student not found');
        return res.json(profile);
      }

      // Organizer has no event registration/club relationship with target student -> DENIED 403
      throw forbidden("Cannot access private profile of a student with no club/event relationship");
    }

    // 4. Deny access to any other unauthorized caller (e.g., student accessing another student)
    throw forbidden("Cannot access private profile of another student");
  })
);
