import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, organizers, students } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { badRequest, notFound } from '../lib/errors.js';

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
