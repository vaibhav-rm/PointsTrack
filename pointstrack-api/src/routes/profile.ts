import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, organizers, students } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { notFound } from '../lib/errors.js';

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
});

profileRouter.patch(
  '/organizer',
  requireAuth,
  requireRole('organizer'),
  asyncHandler(async (req, res) => {
    const data = parseBody(organizerUpdateSchema, req);
    const [updated] = await db
      .update(organizers)
      .set(data)
      .where(eq(organizers.id, req.auth!.sub))
      .returning();
    if (!updated) throw notFound('Organizer not found');
    res.json(updated);
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
