import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  db,
  pointsLedger,
  students,
  studentAcademicRecords,
  academicPolicies,
  eventsCatalog,
  attendees,
  clubs,
  clubMemberships,
  organizers,
} from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination } from '../lib/pagination.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import { requireIdempotency } from '../middleware/idempotency.js';
import { forbidden, notFound, badRequest } from '../lib/errors.js';

export const pointsRouter = Router();

// ---------------------------------------------------------------------------
// Moderation scope: who may approve/reject/reverse a ledger entry?
// An entry is moderatable by the caller when ANY of these hold:
//   - caller is a platform admin
//   - entry.organizerId / entry.event's organizer / entry.attendee's
//     organizer is the caller (direct ownership chain)
//   - entry.clubId is a club where the caller is an active member with the
//     points.award permission (owner/admin/event_manager)
//   - fallback for legacy self-tracked entries with no links: the student
//     and the organizer belong to the SAME college (exact-name match,
//     consistent with event eligibility). Cross-college moderation is denied.
// ---------------------------------------------------------------------------
async function canModerateEntry(
  entry: { organizerId: string | null; eventId: string | null; attendeeId: string | null; clubId: string | null; studentId: string },
  callerId: string,
  callerRole: string
): Promise<boolean> {
  if (callerRole === 'admin') return true;
  if (entry.organizerId && entry.organizerId === callerId) return true;

  if (entry.eventId) {
    const [event] = await db
      .select({ organizerId: eventsCatalog.organizerId })
      .from(eventsCatalog)
      .where(eq(eventsCatalog.id, entry.eventId));
    if (event?.organizerId === callerId) return true;
  }

  if (entry.attendeeId) {
    const [att] = await db
      .select({ organizerId: attendees.organizerId })
      .from(attendees)
      .where(eq(attendees.id, entry.attendeeId));
    if (att?.organizerId === callerId) return true;
  }

  if (entry.clubId) {
    const [row] = await db
      .select({ role: clubMemberships.role })
      .from(clubMemberships)
      .where(and(eq(clubMemberships.clubId, entry.clubId), eq(clubMemberships.accountId, callerId), eq(clubMemberships.status, 'active')));
    if (row && (row.role === 'owner' || row.role === 'admin' || row.role === 'event_manager')) return true;
  }

  // Shared-college fallback for unlinked self-tracked entries.
  const [student] = await db
    .select({ college: students.college })
    .from(students)
    .where(eq(students.id, entry.studentId));
  if (!student?.college) return false;

  const [legacy] = await db
    .select({ college: organizers.college })
    .from(organizers)
    .where(eq(organizers.id, callerId));
  if (legacy?.college && legacy.college === student.college) return true;

  const memberClubs = await db
    .select({ college: clubs.college })
    .from(clubMemberships)
    .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
    .where(and(eq(clubMemberships.accountId, callerId), eq(clubMemberships.status, 'active')));
  return memberClubs.some((c) => c.college && c.college === student.college);
}

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

// ---- Approve a pending self-tracked ledger entry (scoped organizer/admin) ----
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
    if (!(await canModerateEntry(existing, req.auth!.sub, req.auth!.role))) {
      throw forbidden('Not authorized to approve this entry');
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

// ---- Reject a pending self-tracked ledger entry (scoped organizer/admin) ----
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
    if (!(await canModerateEntry(existing, req.auth!.sub, req.auth!.role))) {
      throw forbidden('Not authorized to reject this entry');
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

// ---- Update a self-tracked ledger entry (owner, pending drafts only) ----
// Approved/event-awarded rows are immutable here: without this guard a
// student could rewrite an approved award's points upward after approval.
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
    if (existing.ledgerStatus !== 'pending' || existing.attendeeId) {
      throw badRequest('Only pending self-tracked entries can be edited');
    }

    const [updated] = await db
      .update(pointsLedger)
      .set(data)
      .where(eq(pointsLedger.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

// ---- Delete a self-tracked ledger entry (owner, pending drafts only) ----
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
    if (existing.ledgerStatus !== 'pending' || existing.attendeeId) {
      throw badRequest('Only pending self-tracked entries can be deleted');
    }

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
      // Only approved awards can be reversed: reversing a pending entry
      // would mint a COUNTED negative row against points that never counted.
      if (existing.ledgerType === 'reversal') throw badRequest('Cannot reverse a reversal entry');
      if (existing.ledgerStatus !== 'approved') {
        throw badRequest(`Only approved entries can be reversed (current status: ${existing.ledgerStatus})`);
      }
      // Ownership chain (event/attendee/organizer links), club permission,
      // shared college, or platform admin — a NULL organizerId no longer
      // silently authorises every organizer.
      if (!(await canModerateEntry(existing, req.auth!.sub, req.auth!.role))) {
        throw forbidden('Not authorized to reverse this entry');
      }

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
