import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, pointsLedger } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { forbidden, notFound } from '../lib/errors.js';

export const pointsRouter = Router();

// ---- Current student's points ledger (the wallet) ----
// Clients compute totals from this, so the default page is generous; the hard
// cap still protects against a pathologically large ledger.
pointsRouter.get(
  '/',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, 500, 1000);
    const rows = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.studentId, req.auth!.sub))
      .orderBy(desc(pointsLedger.date))
      .limit(limit)
      .offset(offset);
    res.json(rows);
  })
);

// Self-tracked entry: a student manually logging an activity (with optional
// certificate). Organizer-awarded rows come in through the attendees flow.
const entrySchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1).default('Activity'),
  description: z.string().optional(),
  points: z.coerce.number().int().min(0).default(0),
  date: z.string().min(1),
  certificateUrl: z.string().optional(),
  semester: z.coerce.number().int().min(1).default(1),
});

// ---- Create a self-tracked ledger entry ----
pointsRouter.post(
  '/',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const data = parseBody(entrySchema, req);
    const [row] = await db
      .insert(pointsLedger)
      .values({
        studentId: req.auth!.sub,
        title: data.title,
        type: data.type,
        description: data.description,
        points: data.points,
        date: data.date,
        certificateUrl: data.certificateUrl,
        semester: data.semester,
      })
      .returning();
    res.status(201).json(row);
  })
);

// ---- Update a self-tracked ledger entry (owner only) ----
pointsRouter.put(
  '/:id',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const data = parseBody(entrySchema.partial(), req);
    const [existing] = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.id, req.params.id));
    if (!existing) throw notFound('Entry not found');
    if (existing.studentId !== req.auth!.sub) throw forbidden('Not your entry');

    const [updated] = await db
      .update(pointsLedger)
      .set(data)
      .where(eq(pointsLedger.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

// ---- Delete a self-tracked ledger entry (owner only) ----
pointsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.id, req.params.id));
    if (!existing) throw notFound('Entry not found');
    if (existing.studentId !== req.auth!.sub) throw forbidden('Not your entry');

    await db.delete(pointsLedger).where(eq(pointsLedger.id, req.params.id));
    res.json({ success: true });
  })
);
