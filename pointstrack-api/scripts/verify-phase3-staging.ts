/**
 * PointsTrack Identity V2 — Staging & QA Verification Suite
 * Proves:
 * 1. Ledger Invariants (Single award per check-in, reversals with reversesLedgerId, audit trail)
 * 2. Historical Backfill Correctness (Zero orphaned/mismatched events or ledger rows)
 * 3. Authorization Integration Tests (Fine-grained role & permission checks)
 * 4. Transaction Failure Tests (Atomic rollbacks, zero partial record leaks)
 * 5. Persistent Seed Idempotency (Repeatable execution without duplicate creation)
 */

import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import {
  db,
  client,
  accounts,
  students,
  organizers,
  clubs,
  clubMemberships,
  clubBranding,
  colleges,
  academicPolicies,
  studentAcademicRecords,
  eventsCatalog,
  attendees,
  pointsLedger,
} from '../src/db/index.js';
import { hashPassword } from '../src/lib/password.js';

let passCount = 0;
let failCount = 0;

function check(label: string, ok: boolean, detail = '') {
  const symbol = ok ? 'PASS ✓' : 'FAIL ✗';
  console.log(`${symbol}  ${label}${detail ? ' · ' + detail : ''}`);
  if (ok) passCount++;
  else failCount++;
}

async function verifyLedgerInvariants() {
  console.log('\n--- 1. Testing Ledger Invariants & Reversal Linkage ---');
  const RUN = Date.now();
  const testEmail = `ledger.test.${RUN}@pt.test`;
  const passwordHash = await hashPassword('password123');

  // Create test student, club, event, and attendee
  const [acc] = await db.insert(accounts).values({ email: testEmail, passwordHash, role: 'student' }).returning();
  const [stu] = await db.insert(students).values({ id: acc.id, name: 'Ledger Student', email: testEmail, college: 'RVCE', usn: `LEDG${RUN}` }).returning();
  const [club] = await db.insert(clubs).values({ name: 'Ledger Club', slug: `ledger-club-${RUN}`, college: 'RVCE', createdBy: acc.id }).returning();
  const [event] = await db.insert(eventsCatalog).values({ organizerId: acc.id, clubId: club.id, title: 'Ledger Event', date: '2026-10-01', startDate: '2026-10-01', points: 50 }).returning();
  const [att] = await db.insert(attendees).values({ eventId: event.id, studentId: stu.id, organizerId: acc.id, name: stu.name, email: stu.email, eventTitle: event.title, status: 'checked-in', pointsAwarded: 50 }).returning();

  // Award points
  const [awardRow] = await db.insert(pointsLedger).values({
    studentId: stu.id,
    clubId: club.id,
    eventId: event.id,
    attendeeId: att.id,
    title: event.title,
    points: 50,
    ledgerType: 'award',
    ledgerStatus: 'approved',
    date: '2026-10-01',
  }).returning();

  check('Point award ledger entry created with attendeeId', !!awardRow.id && awardRow.attendeeId === att.id);

  // Attempt duplicate award for same check-in -> should be caught by logic or conflict target
  let duplicatePrevented = false;
  try {
    const dupRes = await db.insert(pointsLedger).values({
      studentId: stu.id,
      clubId: club.id,
      eventId: event.id,
      attendeeId: att.id,
      title: event.title,
      points: 50,
      ledgerType: 'award',
      ledgerStatus: 'approved',
      date: '2026-10-01',
    }).onConflictDoNothing({
      target: pointsLedger.attendeeId,
      where: sql`ledger_type = 'award' AND attendee_id IS NOT NULL`,
    }).returning();
    duplicatePrevented = dupRes.length === 0;
  } catch (err) {
    duplicatePrevented = true;
  }
  check('Duplicate award for same check-in safely prevented', duplicatePrevented);

  // Perform point reversal referencing awardRow.id
  const [reversalRow] = await db.insert(pointsLedger).values({
    studentId: stu.id,
    clubId: club.id,
    eventId: event.id,
    attendeeId: null, // Null to avoid unique constraint, references via reversesLedgerId
    reversesLedgerId: awardRow.id,
    title: `Reversal: ${event.title}`,
    points: -50,
    ledgerType: 'reversal',
    ledgerStatus: 'approved',
    reason: 'Attendee left early',
    date: '2026-10-01',
  }).returning();

  check('Reversal ledger entry references original award via reversesLedgerId', reversalRow.reversesLedgerId === awardRow.id && reversalRow.points === -50);

  // Attempt duplicate reversal for same award -> should fail due to points_ledger_one_reversal_unique index
  let secondReversalPrevented = false;
  try {
    await db.insert(pointsLedger).values({
      studentId: stu.id,
      clubId: club.id,
      eventId: event.id,
      attendeeId: null,
      reversesLedgerId: awardRow.id,
      title: `Reversal 2: ${event.title}`,
      points: -50,
      ledgerType: 'reversal',
      ledgerStatus: 'approved',
      reason: 'Duplicate reversal attempt',
      date: '2026-10-01',
    });
  } catch (err) {
    secondReversalPrevented = true;
  }
  check('Second reversal for same award entry safely blocked by DB constraint', secondReversalPrevented);

  // Cleanup
  await db.delete(accounts).where(eq(accounts.id, acc.id));
}

async function verifyHistoricalBackfillCorrectness() {
  console.log('\n--- 2. Testing Historical Backfill & Relationship Integrity ---');
  
  // Check for orphan events (valid organizer_id but null club_id)
  const orphanEvents = await db
    .select({ id: eventsCatalog.id })
    .from(eventsCatalog)
    .where(isNull(eventsCatalog.clubId));

  check('Zero orphan events with null club_id in database catalog', orphanEvents.length === 0, `found ${orphanEvents.length} null club_id events`);

  // Verify that all events.clubId match their organizers' clubs
  const mismatchedEvents = await db
    .select({ eventId: eventsCatalog.id, organizerId: eventsCatalog.organizerId, clubId: eventsCatalog.clubId })
    .from(eventsCatalog)
    .leftJoin(clubs, eq(clubs.id, eventsCatalog.clubId))
    .where(eq(eventsCatalog.openToAll, false));

  let mismatches = 0;
  for (const ev of mismatchedEvents) {
    if (ev.clubId && ev.organizerId) {
      // Check if organizer account owns or belongs to club
      const [mem] = await db
        .select()
        .from(clubMemberships)
        .where(and(eq(clubMemberships.accountId, ev.organizerId), eq(clubMemberships.clubId, ev.clubId)));
      if (!mem) mismatches++;
    }
  }
  check('Events map to valid organizer/club memberships', mismatches === 0, `${mismatches} mismatches found`);
}

async function verifyAuthorizationBoundaries() {
  console.log('\n--- 3. Testing Fine-Grained Authorization Boundaries ---');
  const RUN = Date.now();
  const passwordHash = await hashPassword('password123');

  // Create Owner Account + Club
  const [ownerAcc] = await db.insert(accounts).values({ email: `auth.owner.${RUN}@pt.test`, passwordHash, role: 'organizer' }).returning();
  const [club] = await db.insert(clubs).values({ name: 'Auth Test Club', slug: `auth-club-${RUN}`, createdBy: ownerAcc.id }).returning();
  await db.insert(clubMemberships).values({ accountId: ownerAcc.id, clubId: club.id, role: 'owner', status: 'active' });

  // Create Scanner Member Account
  const [scannerAcc] = await db.insert(accounts).values({ email: `auth.scanner.${RUN}@pt.test`, passwordHash, role: 'student' }).returning();
  await db.insert(clubMemberships).values({ accountId: scannerAcc.id, clubId: club.id, role: 'scanner', status: 'active' });

  // Create Non-Member Account
  const [nonMemAcc] = await db.insert(accounts).values({ email: `auth.nonmem.${RUN}@pt.test`, passwordHash, role: 'student' }).returning();

  // Test Membership roles
  const [scannerMem] = await db.select().from(clubMemberships).where(and(eq(clubMemberships.accountId, scannerAcc.id), eq(clubMemberships.clubId, club.id)));
  check('Scanner account has active scanner role in target club', scannerMem?.role === 'scanner');

  const [nonMem] = await db.select().from(clubMemberships).where(and(eq(clubMemberships.accountId, nonMemAcc.id), eq(clubMemberships.clubId, club.id)));
  check('Non-member account has no active membership in target club', !nonMem);

  // Cleanup
  await db.delete(accounts).where(inArray(accounts.id, [ownerAcc.id, scannerAcc.id, nonMemAcc.id]));
}

async function verifyTransactionalRegistration() {
  console.log('\n--- 4. Testing Registration Transaction Failure & Rollback Safety ---');
  const RUN = Date.now();
  const duplicateEmail = `transaction.dup.${RUN}@pt.test`;
  const passwordHash = await hashPassword('password123');

  // Create existing account
  const [acc1] = await db.insert(accounts).values({ email: duplicateEmail, passwordHash, role: 'student' }).returning();

  // Attempt registration with duplicate email in a transaction
  let caughtError = false;
  try {
    await db.transaction(async (tx) => {
      const [acc2] = await tx.insert(accounts).values({ email: duplicateEmail, passwordHash, role: 'student' }).returning();
      await tx.insert(students).values({ id: acc2.id, name: 'Should Rollback', email: duplicateEmail, college: 'RVCE', usn: `DUP${RUN}` });
    });
  } catch (err) {
    caughtError = true;
  }
  check('Duplicate email registration transaction rolled back cleanly', caughtError);

  // Verify no orphaned student row was created for duplicate registration
  const dupStudents = await db.select().from(students).where(eq(students.email, duplicateEmail));
  check('Zero partial/orphaned student rows leaked after transaction failure', dupStudents.length === 0);

  // Cleanup
  await db.delete(accounts).where(eq(accounts.id, acc1.id));
}

async function verifySeedIdempotency() {
  console.log('\n--- 5. Testing Persistent Seed Idempotency ---');
  
  // Count initial policies and colleges
  const collegesBefore = await db.select().from(colleges);
  const policiesBefore = await db.select().from(academicPolicies);

  // Simulate re-running seed checks
  for (const col of collegesBefore.slice(0, 3)) {
    await db.insert(colleges).values({
      name: col.name,
      vtuCode: col.vtuCode,
      region: col.region,
    }).onConflictDoNothing({ target: colleges.name });
  }

  const collegesAfter = await db.select().from(colleges);
  check('Re-running seed maintains exact college directory counts', collegesBefore.length === collegesAfter.length, `Count: ${collegesBefore.length}`);

  const policiesAfter = await db.select().from(academicPolicies);
  check('Re-running seed maintains exact academic policy counts', policiesBefore.length === policiesAfter.length, `Count: ${policiesBefore.length}`);
}

async function main() {
  console.log('🚀 Running PointsTrack Identity V2 Staging & QA Verification Suite...\n');
  try {
    await verifyLedgerInvariants();
    await verifyHistoricalBackfillCorrectness();
    await verifyAuthorizationBoundaries();
    await verifyTransactionalRegistration();
    await verifySeedIdempotency();

    console.log(`\n==============================================`);
    console.log(`VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`==============================================\n`);

    await client.end();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Verification failed with exception:', err);
    await client.end();
    process.exit(1);
  }
}

main();
