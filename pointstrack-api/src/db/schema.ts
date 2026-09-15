import { sql } from 'drizzle-orm';
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
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---- Enums ----
export const roleEnum = pgEnum('role', ['organizer', 'student']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'pending_verification', 'suspended']);
export const clubStatusEnum = pgEnum('club_status', ['pending', 'active', 'rejected', 'suspended', 'archived']);
export const clubRoleEnum = pgEnum('club_role', ['owner', 'admin', 'event_manager', 'scanner', 'member']);
export const membershipStatusEnum = pgEnum('membership_status', ['pending', 'active', 'rejected', 'removed']);
export const attendeeStatusEnum = pgEnum('attendee_status', [
  'pending',
  'checked-in',
  'rejected',
  'waitlisted',
]);
export const ledgerTypeEnum = pgEnum('ledger_type', ['award', 'reversal', 'adjustment']);
export const ledgerStatusEnum = pgEnum('ledger_status', ['pending', 'approved', 'rejected', 'reversed']);

// ---- Colleges Directory ----
export const colleges = pgTable(
  'colleges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    shortName: text('short_name'),
    vtuCode: text('vtu_code').unique(),
    region: text('region'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    vtuCodeIdx: index('colleges_vtu_code_idx').on(t.vtuCode),
    regionIdx: index('colleges_region_idx').on(t.region),
  })
);

// ---- Accounts (unified auth identity) ----
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('student'),
    status: accountStatusEnum('status').notNull().default('active'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('accounts_email_idx').on(t.email),
  })
);

// ---- Clubs Entity ----
export const clubs = pgTable(
  'clubs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    collegeId: uuid('college_id').references(() => colleges.id, { onDelete: 'set null' }),
    college: text('college'),
    description: text('description'),
    status: clubStatusEnum('status').notNull().default('active'),
    createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    collegeIdx: index('clubs_college_idx').on(t.collegeId),
    slugIdx: index('clubs_slug_idx').on(t.slug),
  })
);

// ---- Club Memberships & Permissions ----
export const clubMemberships = pgTable(
  'club_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    role: clubRoleEnum('role').notNull().default('member'),
    status: membershipStatusEnum('status').notNull().default('active'),
    invitedBy: uuid('invited_by').references(() => accounts.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    accountIdx: index('club_memberships_account_idx').on(t.accountId),
    clubIdx: index('club_memberships_club_idx').on(t.clubId),
    accountClubUnique: uniqueIndex('club_memberships_account_club_unique').on(
      t.accountId,
      t.clubId
    ),
  })
);

// ---- Club Customization: Branding ----
export const clubBranding = pgTable('club_branding', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id')
    .notNull()
    .unique()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  logoUrl: text('logo_url'),
  coverImageUrl: text('cover_image_url'),
  accentColor: text('accent_color'),
  secondaryColor: text('secondary_color'),
  coverStyle: text('cover_style'), // 'gradient' | 'solid'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Club Customization: Social Links ----
export const clubSocialLinks = pgTable('club_social_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Club Customization: Gallery ----
export const clubGallery = pgTable('club_gallery', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Club Customization: Announcements ----
export const clubAnnouncements = pgTable('club_announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id')
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  externalUrl: text('external_url'),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Academic Policies ----
export const academicPolicies = pgTable('academic_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  university: text('university').notNull().default('VTU'),
  program: text('program').notNull().default('B.E.'),
  entryType: text('entry_type').notNull(), // 'standard' | 'lateral'
  requiredPoints: integer('required_points').notNull().default(100),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Organizers (Legacy profile table preserved for migration compatibility) ----
export const organizers = pgTable('organizers', {
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
  accentColor: text('accent_color'),
  links: jsonb('links').$type<{ type: string; url: string }[]>().notNull().default([]),
  gallery: jsonb('gallery').$type<string[]>().notNull().default([]),
  announcement: text('announcement'),
  announcementLink: text('announcement_link'),
  coverStyle: text('cover_style'),
  secondaryColor: text('secondary_color'),
  hiddenSections: jsonb('hidden_sections').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Students (Academic profile) ----
export const students = pgTable(
  'students',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    collegeId: uuid('college_id').references(() => colleges.id, { onDelete: 'set null' }),
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

// ---- Student Academic Records ----
export const studentAcademicRecords = pgTable('student_academic_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id')
    .notNull()
    .unique()
    .references(() => students.id, { onDelete: 'cascade' }),
  policyId: uuid('policy_id').references(() => academicPolicies.id, { onDelete: 'set null' }),
  batch: text('batch'),
  year: integer('year').notNull().default(1),
  semester: integer('semester').notNull().default(1),
  requiredPointsSnapshot: integer('required_points_snapshot').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---- Events catalog ----
export const eventsCatalog = pgTable(
  'events_catalog',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => organizers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    startTime: text('start_time'),
    endTime: text('end_time'),
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
    clubIdx: index('events_catalog_club_idx').on(t.clubId),
    organizerIdx: index('events_catalog_organizer_idx').on(t.organizerId),
    targetCollegeIdx: index('events_catalog_target_college_idx').on(t.targetCollege),
  })
);

// ---- Attendees ----
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
    eventStudentUnique: uniqueIndex('attendees_event_student_unique').on(
      t.eventId,
      t.studentId
    ),
  })
);

// ---- Points ledger ----
export const pointsLedger = pgTable(
  'points_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
    organizerId: uuid('organizer_id').references(() => organizers.id, {
      onDelete: 'set null',
    }),
    eventId: uuid('event_id').references(() => eventsCatalog.id, {
      onDelete: 'set null',
    }),
    attendeeId: uuid('attendee_id').references(() => attendees.id, {
      onDelete: 'set null',
    }),
    reversesLedgerId: uuid('reverses_ledger_id').references((): any => pointsLedger.id, {
      onDelete: 'set null',
    }),
    clubName: text('club_name'),
    clubLogo: text('club_logo'),
    title: text('title').notNull(),
    type: text('type').notNull().default('Points Awarded'),
    ledgerType: ledgerTypeEnum('ledger_type').notNull().default('award'),
    ledgerStatus: ledgerStatusEnum('ledger_status').notNull().default('approved'),
    description: text('description'),
    points: integer('points').notNull().default(0),
    semester: integer('semester').notNull().default(1),
    date: text('date').notNull(),
    reason: text('reason'),
    awardedBy: uuid('awarded_by').references(() => accounts.id, { onDelete: 'set null' }),
    certificateUrl: text('certificate_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    studentIdx: index('points_ledger_student_idx').on(t.studentId),
    clubIdx: index('points_ledger_club_idx').on(t.clubId),
    attendeeAwardUnique: uniqueIndex('points_ledger_attendee_award_unique')
      .on(t.attendeeId)
      .where(sql`ledger_type = 'award' AND attendee_id IS NOT NULL`),
    oneReversalUnique: uniqueIndex('points_ledger_one_reversal_unique')
      .on(t.reversesLedgerId)
      .where(sql`ledger_type = 'reversal' AND reverses_ledger_id IS NOT NULL`),
  })
);

// ---- Event volunteers ----
export const eventVolunteers = pgTable(
  'event_volunteers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => eventsCatalog.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    eventIdx: index('event_volunteers_event_idx').on(t.eventId),
    studentIdx: index('event_volunteers_student_idx').on(t.studentId),
    eventStudentUnique: uniqueIndex('event_volunteers_event_student_unique').on(
      t.eventId,
      t.studentId
    ),
  })
);

// ---- Refresh tokens ----
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

// ---- Idempotency Keys ----
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'completed'
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    accountKeyUnique: uniqueIndex('idempotency_keys_account_key_unique').on(
      t.accountId,
      t.key
    ),
    expiresIdx: index('idempotency_keys_expires_idx').on(t.expiresAt),
  })
);

export type ClubRole = 'owner' | 'admin' | 'event_manager' | 'scanner' | 'member';
export type Account = typeof accounts.$inferSelect;
export type College = typeof colleges.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type ClubMembership = typeof clubMemberships.$inferSelect;
export type ClubBranding = typeof clubBranding.$inferSelect;
export type ClubSocialLink = typeof clubSocialLinks.$inferSelect;
export type ClubGalleryItem = typeof clubGallery.$inferSelect;
export type ClubAnnouncement = typeof clubAnnouncements.$inferSelect;
export type AcademicPolicy = typeof academicPolicies.$inferSelect;
export type StudentAcademicRecord = typeof studentAcademicRecords.$inferSelect;
export type Organizer = typeof organizers.$inferSelect;
// Physical table name is `students`; exported alias `studentProfiles` resolves architecture naming consistency.
export const studentProfiles = students;
export type StudentProfile = typeof students.$inferSelect;

export type EventCatalog = typeof eventsCatalog.$inferSelect;
export type Attendee = typeof attendees.$inferSelect;
export type PointsLedgerRow = typeof pointsLedger.$inferSelect;
export type EventVolunteer = typeof eventVolunteers.$inferSelect;

