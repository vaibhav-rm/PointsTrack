import { eq, inArray } from 'drizzle-orm';
import { db, client } from './index.js';
import {
  accounts,
  colleges,
  clubs,
  clubMemberships,
  clubBranding,
  academicPolicies,
  studentAcademicRecords,
  organizers,
  students,
  eventsCatalog,
  attendees,
  pointsLedger,
} from './schema.js';
import { hashPassword } from '../lib/password.js';

const PASSWORD = 'password123';
const COLLEGE = 'R.V. COLLEGE OF ENGINEERING';
const COLLEGE_CODE = '1RV';

const ORGANIZER_EMAIL = 'organizer@demo.test';
const STUDENT_EMAILS = ['student@demo.test', 'student2@demo.test'];

const INITIAL_COLLEGES = [
  { name: 'R.V. COLLEGE OF ENGINEERING', shortName: 'RVCE', vtuCode: '1RV', region: 'Bangalore' },
  { name: 'BMS COLLEGE OF ENGINEERING', shortName: 'BMSCE', vtuCode: '1BM', region: 'Bangalore' },
  { name: 'BANGALORE INSTITUTE OF TECHNOLOGY', shortName: 'BIT', vtuCode: '1BI', region: 'Bangalore' },
  { name: 'DAYANANDA SAGAR COLLEGE OF ENGINEERING', shortName: 'DSCE', vtuCode: '1DS', region: 'Bangalore' },
  { name: 'M.S.RAMAIAH INSTITUTE OF TECHNOLOGY', shortName: 'MSRIT', vtuCode: '1MS', region: 'Bangalore' },
  { name: 'NATIONAL INSTITUTE OF ENGINEERING', shortName: 'NIE', vtuCode: '4NI', region: 'Mysuru' },
  { name: 'KLS GOGTE INSTITUTE OF TECHNOLOGY', shortName: 'GIT', vtuCode: '2GI', region: 'Belagavi' },
  { name: 'POOJYA DODDAPPA COLLEGE OF ENGINEERING', shortName: 'PDACE', vtuCode: '3PD', region: 'Kalaburgi' },
  { name: 'Demo Institute of Technology', shortName: 'DIT', vtuCode: 'DIT', region: 'Bangalore' },
];

function buildDate(startDate: string, startTime?: string) {
  return startTime ? `${startDate}T${startTime}` : `${startDate}T00:00`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const seedEmails = [ORGANIZER_EMAIL, ...STUDENT_EMAILS];

  // Clean slate for seeded emails
  await db.delete(accounts).where(inArray(accounts.email, seedEmails));
  console.log('Cleared any previously seeded accounts.');

  // Seed colleges (on conflict do nothing)
  console.log('Seeding initial colleges...');
  for (const col of INITIAL_COLLEGES) {
    await db
      .insert(colleges)
      .values(col)
      .onConflictDoNothing({ target: colleges.name });
  }

  const [rvceCollege] = await db
    .select()
    .from(colleges)
    .where(eq(colleges.vtuCode, COLLEGE_CODE));

  // Seed academic policies
  console.log('Seeding academic policies...');
  let [stdPolicy] = await db
    .select()
    .from(academicPolicies)
    .where(eq(academicPolicies.entryType, 'standard'));
  if (!stdPolicy) {
    [stdPolicy] = await db
      .insert(academicPolicies)
      .values({
        name: 'AICTE Standard 100 Points Policy',
        university: 'VTU',
        program: 'B.E.',
        entryType: 'standard',
        requiredPoints: 100,
      })
      .returning();
  }

  let [latPolicy] = await db
    .select()
    .from(academicPolicies)
    .where(eq(academicPolicies.entryType, 'lateral'));
  if (!latPolicy) {
    [latPolicy] = await db
      .insert(academicPolicies)
      .values({
        name: 'AICTE Lateral Entry 80 Points Policy',
        university: 'VTU',
        program: 'B.E.',
        entryType: 'lateral',
        requiredPoints: 80,
      })
      .returning();
  }

  const passwordHash = await hashPassword(PASSWORD);

  // ---- Organizer Identity & Club ----
  const [orgAccount] = await db
    .insert(accounts)
    .values({ email: ORGANIZER_EMAIL, passwordHash, role: 'organizer' })
    .returning();

  // Legacy organizer profile
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

  // Canonical V2 Club
  const [club] = await db
    .insert(clubs)
    .values({
      name: 'Robotics Club',
      slug: slugify(`Robotics Club ${rvceCollege?.id ? rvceCollege.id.slice(0, 4) : 'rvce'}`),
      collegeId: rvceCollege?.id ?? null,
      college: COLLEGE,
      description: 'Building cool robots and hosting events.',
      status: 'active',
      createdBy: orgAccount.id,
    })
    .returning();

  // Club Membership: owner
  await db.insert(clubMemberships).values({
    accountId: orgAccount.id,
    clubId: club.id,
    role: 'owner',
    status: 'active',
  });

  // Club Branding
  await db.insert(clubBranding).values({
    clubId: club.id,
    accentColor: '#06B6D4',
    secondaryColor: '#4F46E5',
    coverStyle: 'gradient',
  });

  // ---- Students ----
  const studentRows = [];
  for (let i = 0; i < STUDENT_EMAILS.length; i++) {
    const email = STUDENT_EMAILS[i];
    const isLat = i === 1; // student 2 is lateral entry
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
        collegeId: rvceCollege?.id ?? null,
        college: COLLEGE,
        collegeCode: COLLEGE_CODE,
        usn: `${COLLEGE_CODE}22CS00${i + 1}`,
        year: 2,
        semester: 4,
        lateralEntry: isLat,
        requiredPoints: isLat ? 80 : 100,
      })
      .returning();

    studentRows.push(student);

    // Academic Record
    await db.insert(studentAcademicRecords).values({
      studentId: student.id,
      policyId: isLat ? latPolicy.id : stdPolicy.id,
      batch: '2022-2026',
      year: 2,
      semester: 4,
      requiredPointsSnapshot: isLat ? 80 : 100,
    });

    // Also give students a member role in the Robotics Club
    await db.insert(clubMemberships).values({
      accountId: acc.id,
      clubId: club.id,
      role: 'member',
      status: 'active',
    });
  }

  // ---- Events ----
  function makeEvent(
    title: string,
    startDate: string,
    points: number,
    openToAll: boolean,
    description: string
  ) {
    return {
      clubId: club.id,
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
      clubName: club.name,
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

  // ---- Attendees + Points Ledger ----
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

  const [checkedInAttendee] = await db
    .insert(attendees)
    .values({
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
    })
    .returning();

  await db.insert(pointsLedger).values({
    studentId: studentRows[0].id,
    clubId: club.id,
    organizerId: organizer.id,
    eventId: firstEvent.id,
    attendeeId: checkedInAttendee.id,
    clubName: firstEvent.clubName,
    clubLogo: firstEvent.clubLogo,
    title: firstEvent.title,
    type: firstEvent.type,
    ledgerType: 'award',
    ledgerStatus: 'approved',
    description: firstEvent.description,
    points: firstEvent.points,
    semester: 1,
    date: new Date().toISOString().split('T')[0],
    awardedBy: orgAccount.id,
  });

  console.log('\nSeed complete:');
  console.log(`  Colleges seeded, Policies seeded`);
  console.log(`  1 organizer, 1 club (${club.name}), ${studentRows.length} students, ${eventRows.length} events`);
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
