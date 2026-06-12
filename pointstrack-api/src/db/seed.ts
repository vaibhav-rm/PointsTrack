import { eq, inArray } from 'drizzle-orm';
import { db, client } from './index.js';
import {
  accounts,
  organizers,
  students,
  eventsCatalog,
  attendees,
  pointsLedger,
} from './schema.js';
import { hashPassword } from '../lib/password.js';

// Local dev seed. Idempotent: re-running wipes the seeded accounts (cascading
// to their events/attendees/points) and recreates them, so you always land in
// a known state. Safe to run against an empty DB or on top of a previous seed.

const PASSWORD = 'password123';
const COLLEGE = 'Demo Institute of Technology';
const COLLEGE_CODE = 'DIT';

const ORGANIZER_EMAIL = 'organizer@demo.test';
const STUDENT_EMAILS = ['student@demo.test', 'student2@demo.test'];

function buildDate(startDate: string, startTime?: string) {
  return startTime ? `${startDate}T${startTime}` : `${startDate}T00:00`;
}

async function main() {
  const seedEmails = [ORGANIZER_EMAIL, ...STUDENT_EMAILS];

  // Clean slate: deleting accounts cascades to organizers/students and, through
  // them, to events_catalog, attendees and points_ledger.
  await db.delete(accounts).where(inArray(accounts.email, seedEmails));
  console.log('Cleared any previously seeded accounts.');

  const passwordHash = await hashPassword(PASSWORD);

  // ---- Organizer ----
  const [orgAccount] = await db
    .insert(accounts)
    .values({ email: ORGANIZER_EMAIL, passwordHash, role: 'organizer' })
    .returning();
  const [organizer] = await db
    .insert(organizers)
    .values({
      id: orgAccount.id,
      email: ORGANIZER_EMAIL,
      fullName: 'Demo Organizer',
      clubName: 'Robotics Club',
      college: COLLEGE,
      bio: 'Building cool robots and hosting events.',
    })
    .returning();

  // ---- Students ----
  const studentRows = [];
  for (let i = 0; i < STUDENT_EMAILS.length; i++) {
    const email = STUDENT_EMAILS[i];
    const [acc] = await db
      .insert(accounts)
      .values({ email, passwordHash, role: 'student' })
      .returning();
    const [student] = await db
      .insert(students)
      .values({
        id: acc.id,
        name: `Demo Student ${i + 1}`,
        email,
        college: COLLEGE,
        collegeCode: COLLEGE_CODE,
        usn: `${COLLEGE_CODE}22CS00${i + 1}`,
        year: 2,
        semester: 4,
      })
      .returning();
    studentRows.push(student);
  }

  // ---- Events (mirrors the POST /events route's derived fields) ----
  function makeEvent(
    title: string,
    startDate: string,
    points: number,
    openToAll: boolean,
    description: string
  ) {
    return {
      organizerId: organizer.id,
      title,
      description,
      startDate,
      endDate: startDate,
      date: buildDate(startDate),
      location: 'Main Auditorium',
      type: 'Activity',
      points,
      capacity: 100,
      clubName: organizer.clubName,
      clubLogo: organizer.logo,
      targetCollege: organizer.college,
      openToAll,
      images: [] as string[],
    };
  }

  const eventRows = await db
    .insert(eventsCatalog)
    .values([
      makeEvent('Intro to ROS Workshop', '2026-07-05', 50, false, 'Hands-on robotics workshop.'),
      makeEvent('Open Hack Night', '2026-07-12', 75, true, '12-hour open hackathon, all colleges welcome.'),
      makeEvent('Drone Build Day', '2026-07-20', 60, false, 'Assemble and fly your first drone.'),
    ])
    .returning();

  // ---- Attendees + points ----
  // Student 1 is checked-in to the first event (so they have a ledger entry);
  // student 2 has a pending application to the same event.
  const firstEvent = eventRows[0];

  await db.insert(attendees).values({
    eventId: firstEvent.id,
    studentId: studentRows[1].id,
    organizerId: organizer.id,
    name: studentRows[1].name,
    email: studentRows[1].email,
    eventTitle: firstEvent.title,
    status: 'pending',
    pointsAwarded: firstEvent.points,
  });

  await db.insert(attendees).values({
    eventId: firstEvent.id,
    studentId: studentRows[0].id,
    organizerId: organizer.id,
    name: studentRows[0].name,
    email: studentRows[0].email,
    eventTitle: firstEvent.title,
    status: 'checked-in',
    engagement: 'High',
    pointsAwarded: firstEvent.points,
    checkInTimestamp: new Date(),
  });

  // The ledger row the check-in would have written (mirrors PATCH /attendees/:id).
  await db.insert(pointsLedger).values({
    studentId: studentRows[0].id,
    organizerId: organizer.id,
    eventId: firstEvent.id,
    clubName: firstEvent.clubName,
    clubLogo: firstEvent.clubLogo,
    title: firstEvent.title,
    type: firstEvent.type,
    description: firstEvent.description,
    points: firstEvent.points,
    semester: 1,
    date: new Date().toISOString().split('T')[0],
  });

  console.log('\nSeed complete:');
  console.log(`  ${1} organizer, ${studentRows.length} students, ${eventRows.length} events`);
  console.log('\nLogin credentials (password for all): ' + PASSWORD);
  console.log(`  organizer: ${ORGANIZER_EMAIL}`);
  STUDENT_EMAILS.forEach((e) => console.log(`  student:   ${e}`));

  await client.end();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await client.end();
  process.exit(1);
});
