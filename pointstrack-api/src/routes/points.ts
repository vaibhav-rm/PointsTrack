import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, pointsLedger, students, studentAcademicRecords, academicPolicies } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination } from '../lib/pagination.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import { requireIdempotency } from '../middleware/idempotency.js';
import { forbidden, notFound, badRequest } from '../lib/errors.js';

export const pointsRouter = Router();

// ---- Current student's points ledger (the wallet) ----
pointsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, 500, 1000);
    const rows = await db
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.studentId, req.auth!.sub),
          eq(pointsLedger.ledgerStatus, 'approved')
        )
      )
      .orderBy(desc(pointsLedger.date))
      .limit(limit)
      .offset(offset);
    res.json(rows);
  })
);

// ---- Points summary & academic target for current student ----
pointsRouter.get(
  '/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = req.auth!.sub;
    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    if (!student) throw notFound('Student profile not found');

    const [record] = await db
      .select({
        record: studentAcademicRecords,
        policy: academicPolicies,
      })
      .from(studentAcademicRecords)
      .leftJoin(academicPolicies, eq(academicPolicies.id, studentAcademicRecords.policyId))
      .where(eq(studentAcademicRecords.studentId, studentId));

    const totalEarnedRows = await db
      .select({ total: sql<number>`COALESCE(SUM(${pointsLedger.points}), 0)` })
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.studentId, studentId),
          eq(pointsLedger.ledgerStatus, 'approved')
        )
      );

    const totalPoints = Number(totalEarnedRows[0]?.total ?? 0);
    const requiredPoints = student.requiredPoints ?? 100;
    const progressPercentage = Math.min(Math.round((totalPoints / requiredPoints) * 100), 100);

    res.json({
      studentId: student.id,
      totalPoints,
      requiredPoints,
      progressPercentage,
      academicPolicy: record?.policy ?? null,
    });
  })
);

const entrySchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1).default('Activity'),
  description: z.string().optional(),
  points: z.coerce.number().int().min(1, 'Points must be at least 1').max(100, 'Points cannot exceed 100 per self-tracked entry').default(10),
  date: z.string().min(1),
  certificateUrl: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(8).default(1),
});

// ---- Create a self-tracked ledger entry (starts as pending, requiring approval) ----
pointsRouter.post(
  '/',
  requireAuth,
  requireIdempotency(),
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const data = parseBody(entrySchema, req);
    const [row] = await db
      .insert(pointsLedger)
      .values({
        studentId: req.auth!.sub,
        title: data.title,
        type: data.type,
        ledgerType: 'award',
        ledgerStatus: 'pending', // Requires organizer/admin approval before adding to total points
        description: data.description,
        points: data.points,
        date: data.date,
        certificateUrl: data.certificateUrl,
        semester: data.semester,
        awardedBy: null,
      })
      .returning();
    res.status(201).json(row);
  })
);

// ---- Approve a pending self-tracked ledger entry (Organizer / Admin only) ----
pointsRouter.post(
  '/:id/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth!.role === 'student') {
      throw forbidden('Students cannot approve points entries');
    }
    const [existing] = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.id, req.params.id));
    if (!existing) throw notFound('Ledger entry not found');
    if (existing.ledgerStatus !== 'pending') {
      throw badRequest(`Only pending entries can be approved (current status: ${existing.ledgerStatus})`);
    }

    const [updated] = await db
      .update(pointsLedger)
      .set({
        ledgerStatus: 'approved',
        awardedBy: req.auth!.sub,
      })
      .where(eq(pointsLedger.id, req.params.id))
      .returning();

    res.json(updated);
  })
);

// ---- Reject a pending self-tracked ledger entry (Organizer / Admin only) ----
pointsRouter.post(
  '/:id/reject',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth!.role === 'student') {
      throw forbidden('Students cannot reject points entries');
    }
    const [existing] = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.id, req.params.id));
    if (!existing) throw notFound('Ledger entry not found');
    if (existing.ledgerStatus !== 'pending') {
      throw badRequest(`Only pending entries can be rejected (current status: ${existing.ledgerStatus})`);
    }

    const [updated] = await db
      .update(pointsLedger)
      .set({
        ledgerStatus: 'rejected',
        awardedBy: req.auth!.sub,
      })
      .where(eq(pointsLedger.id, req.params.id))
      .returning();

    res.json(updated);
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

// ---- Reverse points (Admin / Club Owner flow) ----
const reverseSchema = z.object({
  reason: z.string().min(1),
  clubId: z.string().uuid().optional(),
});

pointsRouter.post(
  '/:id/reverse',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { reason, clubId } = parseBody(reverseSchema, req);

    if (req.auth!.role === 'student') {
      throw forbidden('Students cannot reverse points entries');
    }

    const reversal = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(pointsLedger)
        .where(eq(pointsLedger.id, req.params.id));

      if (!existing) throw notFound('Ledger entry not found');
      if (existing.organizerId && existing.organizerId !== req.auth!.sub) {
        throw forbidden('Not authorized to reverse points for another club');
      }
      if (existing.ledgerType === 'reversal') throw badRequest('Cannot reverse a reversal entry');
      if (existing.ledgerStatus === 'reversed') throw badRequest('Entry has already been reversed');

      // Check if a reversal already exists for this entry
      const [alreadyReversed] = await tx
        .select()
        .from(pointsLedger)
        .where(
          and(
            eq(pointsLedger.reversesLedgerId, existing.id),
            eq(pointsLedger.ledgerType, 'reversal')
          )
        );
      if (alreadyReversed) throw badRequest('A reversal for this entry already exists');

      // Create negative reversal row
      const [rev] = await tx
        .insert(pointsLedger)
        .values({
          studentId: existing.studentId,
          clubId: clubId || existing.clubId,
          organizerId: existing.organizerId,
          eventId: existing.eventId,
          attendeeId: null, // NULL to avoid unique constraint collision
          reversesLedgerId: existing.id,
          clubName: existing.clubName,
          clubLogo: existing.clubLogo,
          title: `Reversal: ${existing.title}`,
          type: 'Reversal',
          ledgerType: 'reversal',
          ledgerStatus: 'approved',
          description: `Points reversed: ${reason}`,
          points: -Math.abs(existing.points),
          semester: existing.semester,
          date: new Date().toISOString().split('T')[0],
          reason,
          awardedBy: req.auth!.sub,
        })
        .returning();

      // Mark existing as reversed
      await tx
        .update(pointsLedger)
        .set({ ledgerStatus: 'reversed' })
        .where(eq(pointsLedger.id, existing.id));

      return rev;
    });

    res.status(201).json(reversal);
  })
);
