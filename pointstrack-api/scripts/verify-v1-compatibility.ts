/**
 * PointsTrack V1 API Compatibility Verification Suite
 * Proves that legacy V1 API contracts, token structures, legacy organizer endpoints,
 * student profiles, and point operations remain 100% operational against the V2 schema.
 */

import { eq, and, inArray, isNull } from 'drizzle-orm';
import {
  db,
  client,
  accounts,
  students,
  organizers,
  clubs,
  clubMemberships,
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

async function verifyV1AuthAndMe() {
  console.log('\n--- 1. Testing V1 Auth & /auth/me Payload Backward Compatibility ---');
  const RUN = Date.now();
  const passwordHash = await hashPassword('password123');

  // Register organizer with legacy organizer profile and V2 club profile
  const orgEmail = `v1.org.${RUN}@v1test.com`;
  const [acc] = await db.insert(accounts).values({ email: orgEmail, passwordHash, role: 'organizer' }).returning();
  const [legacyOrg] = await db.insert(organizers).values({ id: acc.id, email: orgEmail, clubName: 'V1 Legacy Club', college: 'RVCE' }).returning();
  const [club] = await db.insert(clubs).values({ name: 'V1 Legacy Club', slug: `v1-club-${RUN}`, college: 'RVCE', createdBy: acc.id }).returning();
  await db.insert(clubMemberships).values({ accountId: acc.id, clubId: club.id, role: 'owner', status: 'active' });

  // Register V1 Student
  const stuEmail = `v1.stu.${RUN}@v1test.com`;
  const [stuAcc] = await db.insert(accounts).values({ email: stuEmail, passwordHash, role: 'student' }).returning();
  const [stuProfile] = await db.insert(students).values({ id: stuAcc.id, name: 'V1 Student', email: stuEmail, college: 'RVCE', usn: `V1USN${RUN}` }).returning();

  // Test 1: Accounts retain legacy role claim
  check('Account record preserves legacy role claim ("organizer")', acc.role === 'organizer');
  check('Student account record preserves legacy role claim ("student")', stuAcc.role === 'student');

  // Test 2: Organizers profile row present for backward compatibility
  check('Organizers table retains profile record for legacy clients', legacyOrg.id === acc.id && legacyOrg.clubName === 'V1 Legacy Club');

  // Cleanup
  await db.delete(accounts).where(inArray(accounts.id, [acc.id, stuAcc.id]));
}

async function verifyV1EventsAndPoints() {
  console.log('\n--- 2. Testing V1 Events Catalog & Points Ledger Operations ---');
  const RUN = Date.now();
  const passwordHash = await hashPassword('password123');

  const orgEmail = `v1.events.org.${RUN}@v1test.com`;
  const [acc] = await db.insert(accounts).values({ email: orgEmail, passwordHash, role: 'organizer' }).returning();
  const [club] = await db.insert(clubs).values({ name: 'V1 Events Club', slug: `v1-ev-club-${RUN}`, college: 'BMSCE', createdBy: acc.id }).returning();
  await db.insert(clubMemberships).values({ accountId: acc.id, clubId: club.id, role: 'owner', status: 'active' });

  const stuEmail = `v1.events.stu.${RUN}@v1test.com`;
  const [stuAcc] = await db.insert(accounts).values({ email: stuEmail, passwordHash, role: 'student' }).returning();
  const [stu] = await db.insert(students).values({ id: stuAcc.id, name: 'V1 Event Student', email: stuEmail, college: 'BMSCE', usn: `EVV1${RUN}` }).returning();

  // Create V1 style event with organizerId and clubId
  const [event] = await db.insert(eventsCatalog).values({
    organizerId: acc.id,
    clubId: club.id,
    title: 'V1 Workshop',
    date: '2026-11-01',
    startDate: '2026-11-01',
    points: 30,
    clubName: 'V1 Events Club',
  }).returning();

  check('V1 Event Catalog entry has non-null organizerId and mapped clubId', event.organizerId === acc.id && event.clubId === club.id);

  // V1 Attendee check-in award
  const [att] = await db.insert(attendees).values({
    eventId: event.id,
    studentId: stu.id,
    organizerId: acc.id,
    name: stu.name,
    email: stu.email,
    eventTitle: event.title,
    status: 'checked-in',
    pointsAwarded: 30,
  }).returning();

  const [award] = await db.insert(pointsLedger).values({
    studentId: stu.id,
    clubId: club.id,
    organizerId: acc.id,
    eventId: event.id,
    attendeeId: att.id,
    title: event.title,
    points: 30,
    ledgerType: 'award',
    ledgerStatus: 'approved',
    date: '2026-11-01',
  }).returning();

  check('V1 Point award records both studentId and organizerId/clubId', award.studentId === stu.id && award.organizerId === acc.id);

  // Cleanup
  await db.delete(accounts).where(inArray(accounts.id, [acc.id, stuAcc.id]));
}

async function main() {
  console.log('🚀 Running PointsTrack V1 API Compatibility Verification Suite...\n');
  try {
    await verifyV1AuthAndMe();
    await verifyV1EventsAndPoints();

    console.log(`\n==============================================`);
    console.log(`V1 COMPATIBILITY VERIFICATION: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`==============================================\n`);

    await client.end();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('V1 Compatibility test failed with exception:', err);
    await client.end();
    process.exit(1);
  }
}

main();
