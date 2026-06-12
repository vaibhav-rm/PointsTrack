import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

// ---- Enums ----
export const roleEnum = pgEnum('role', ['organizer', 'student']);
export const attendeeStatusEnum = pgEnum('attendee_status', [
  'pending',
  'checked-in',
  'rejected',
  'waitlisted',
]);

// ---- Accounts (unified auth for both organizers and students) ----
// Replaces Firebase Auth. One row per login identity; role decides which
// profile table holds the rest of the data.
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('accounts_email_idx').on(t.email),
  })
);

// ---- Organizers (was Firestore `organizers`) ----
export const organizers = pgTable('organizers', {
  // 1:1 with an account; account id IS the organizer id (mirrors old Firebase uid usage).
  id: uuid('id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  fullName: text('full_name'),
  clubName: text('club_name').notNull(),
  college: text('college').notNull(),
  bio: text('bio'),
  establishedDate: text('established_date'),
  coreTeam: text('core_team'),
  logo: text('logo'),
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Students (was Firestore `users`) ----
export const students = pgTable(
  'students',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    college: text('college').notNull(),
    collegeCode: text('college_code'),
    region: text('region'),
    usn: text('usn').notNull(),
    year: integer('year').notNull().default(1),
    semester: integer('semester').notNull().default(1),
    lateralEntry: boolean('lateral_entry').notNull().default(false),
    requiredPoints: integer('required_points').notNull().default(100),
    pushToken: text('push_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    collegeIdx: index('students_college_idx').on(t.college),
    usnIdx: index('students_usn_idx').on(t.usn),
  })
);

// ---- Events catalog (was Firestore `upcoming_events`) ----
// The published listings organizers broadcast and students browse/apply to.
export const eventsCatalog = pgTable(
  'events_catalog',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => organizers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    startTime: text('start_time'),
    endTime: text('end_time'),
    // Combined date used for sorting (kept for parity with the old `date` field).
    date: text('date').notNull(),
    location: text('location'),
    type: text('type').notNull().default('Activity'),
    points: integer('points').notNull().default(10),
    capacity: integer('capacity').notNull().default(0),
    clubName: text('club_name'),
    clubLogo: text('club_logo'),
    targetCollege: text('target_college'),
    openToAll: boolean('open_to_all').notNull().default(false),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    certificateUrl: text('certificate_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    organizerIdx: index('events_catalog_organizer_idx').on(t.organizerId),
    targetCollegeIdx: index('events_catalog_target_college_idx').on(t.targetCollege),
  })
);

// ---- Attendees (was Firestore `attendees`) ----
// A student's application/registration to a catalog event.
export const attendees = pgTable(
  'attendees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => eventsCatalog.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => organizers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    eventTitle: text('event_title').notNull(),
    status: attendeeStatusEnum('status').notNull().default('pending'),
    engagement: text('engagement').notNull().default('Pending'),
    pointsAwarded: integer('points_awarded').notNull().default(10),
    checkInTimestamp: timestamp('check_in_timestamp', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    organizerIdx: index('attendees_organizer_idx').on(t.organizerId),
    eventIdx: index('attendees_event_idx').on(t.eventId),
    studentIdx: index('attendees_student_idx').on(t.studentId),
  })
);

// ---- Points ledger (was Firestore `events`) ----
// One row per awarded activity; the mobile wallet sums these up.
export const pointsLedger = pgTable(
  'points_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    organizerId: uuid('organizer_id').references(() => organizers.id, {
      onDelete: 'set null',
    }),
    eventId: uuid('event_id').references(() => eventsCatalog.id, {
      onDelete: 'set null',
    }),
    clubName: text('club_name'),
    clubLogo: text('club_logo'),
    title: text('title').notNull(),
    type: text('type').notNull().default('Points Awarded'),
    description: text('description'),
    points: integer('points').notNull().default(0),
    semester: integer('semester').notNull().default(1),
    date: text('date').notNull(),
    certificateUrl: text('certificate_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    studentIdx: index('points_ledger_student_idx').on(t.studentId),
  })
);

// ---- Refresh tokens (rotation + revocation) ----
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    accountIdx: index('refresh_tokens_account_idx').on(t.accountId),
    tokenHashIdx: index('refresh_tokens_hash_idx').on(t.tokenHash),
  })
);

// ---- Inferred types ----
export type Account = typeof accounts.$inferSelect;
export type Organizer = typeof organizers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type EventCatalog = typeof eventsCatalog.$inferSelect;
export type Attendee = typeof attendees.$inferSelect;
export type PointsLedgerRow = typeof pointsLedger.$inferSelect;
