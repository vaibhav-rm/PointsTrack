# PointsTrack Identity & Onboarding V2 — Codebase Audit Report

**Date:** September 15, 2026  
**Status:** Audit Complete (Phase 0)  
**Target:** PointsTrack Monorepo (`pointstrack-api`, `pointstrack-admin`, `PointsTrack`)

---

## 1. Executive Architecture Summary

The existing PointsTrack codebase is organized into three primary applications:
1. **`pointstrack-api`**: Express.js REST API written in TypeScript, backed by PostgreSQL and Drizzle ORM, using JWT authentication with stored refresh token hashes.
2. **`pointstrack-admin`**: Next.js (App Router) web dashboard for club organizers to manage club profiles, announcements, branding, events, attendees, and volunteers.
3. **`PointsTrack`**: React Native (Expo) mobile application for students to register, browse activities, track activity points, display student QR codes, and scan event QR codes (for volunteers/organizers).

### Core Identity Assumption in Current Codebase
Currently, `accounts` serves as the single authentication table. However, the system enforces a strict **1:1 mapping** between `accounts.id`, `students.id`, and `organizers.id`:
- Every `accounts` row maps to a `students` row (`students.id = accounts.id`).
- When a user registers directly as an organizer (`POST /auth/register/organizer`), the backend creates:
  1. An `accounts` row with `role: 'student'`.
  2. A **synthesized student profile** in `students` with a fake USN (`ORG-${account.id.slice(0, 8)}`) and `name: fullName || clubName`.
  3. An `organizers` row with `organizers.id = accounts.id`.
- If an existing student promotes themselves to an organizer (`PATCH /profile/organizer`), a row in `organizers` is inserted with `id = account.id`.
- Therefore, "organizer capability" is currently determined solely by whether a record exists in `organizers` where `organizers.id === accounts.id`.

---

## 2. Existing Schema & Data Relationships

### Tables & Relationships (`pointstrack-api/src/db/schema.ts`)

```
accounts (id PK UUID)
  ├── 1:1 ── students (id PK UUID -> accounts.id ON DELETE CASCADE)
  ├── 1:1 ── organizers (id PK UUID -> accounts.id ON DELETE CASCADE)
  └── 1:N ── refresh_tokens (account_id FK -> accounts.id ON DELETE CASCADE)

organizers (id PK UUID)
  ├── 1:N ── events_catalog (organizer_id FK -> organizers.id ON DELETE CASCADE)
  ├── 1:N ── attendees (organizer_id FK -> organizers.id ON DELETE CASCADE)
  └── 1:N ── points_ledger (organizer_id FK -> organizers.id ON DELETE SET NULL)

students (id PK UUID)
  ├── 1:N ── attendees (student_id FK -> students.id ON DELETE CASCADE)
  ├── 1:N ── points_ledger (student_id FK -> students.id ON DELETE CASCADE)
  └── 1:N ── event_volunteers (student_id FK -> students.id ON DELETE CASCADE)

events_catalog (id PK UUID)
  ├── 1:N ── attendees (event_id FK -> events_catalog.id ON DELETE CASCADE)
  ├── 1:N ── points_ledger (event_id FK -> events_catalog.id ON DELETE SET NULL)
  └── 1:N ── event_volunteers (event_id FK -> events_catalog.id ON DELETE CASCADE)
```

### Table Definitions Detail

1. **`accounts`**:
   - Columns: `id` (uuid), `email` (text unique), `password_hash` (text), `role` (`roleEnum`: `'organizer' | 'student'`), `created_at` (timestamp).
2. **`organizers`**:
   - Columns: `id` (uuid, fk `accounts.id`), `email`, `full_name`, `club_name`, `college`, `bio`, `established_date`, `core_team`, `logo`, `cover_image`, `accent_color`, `links` (jsonb), `gallery` (jsonb), `announcement`, `announcement_link`, `cover_style`, `secondary_color`, `hidden_sections` (jsonb), `created_at`.
3. **`students`**:
   - Columns: `id` (uuid, fk `accounts.id`), `name`, `email`, `phone`, `college`, `college_code`, `region`, `usn` (text), `year` (int), `semester` (int), `lateral_entry` (boolean), `required_points` (int default 100), `push_token`, `created_at`.
4. **`events_catalog`**:
   - Columns: `id` (uuid), `organizer_id` (fk `organizers.id`), `title`, `description`, `start_date`, `end_date`, `start_time`, `end_time`, `date`, `location`, `type`, `points`, `capacity`, `club_name`, `club_logo`, `target_college`, `open_to_all`, `images` (jsonb), `certificate_url`, `created_at`.
5. **`attendees`**:
   - Columns: `id` (uuid), `event_id` (fk `events_catalog.id`), `student_id` (fk `students.id`), `organizer_id` (fk `organizers.id`), `name`, `email`, `event_title`, `status` (`attendeeStatusEnum`: `'pending' | 'checked-in' | 'rejected' | 'waitlisted'`), `engagement`, `points_awarded`, `check_in_timestamp`, `created_at`.
   - Constraints: `UNIQUE(event_id, student_id)`.
6. **`points_ledger`**:
   - Columns: `id` (uuid), `student_id` (fk `students.id`), `organizer_id` (fk `organizers.id`), `event_id` (fk `events_catalog.id`), `attendee_id` (fk `attendees.id`), `club_name`, `club_logo`, `title`, `type`, `description`, `points`, `semester`, `date`, `certificate_url`, `created_at`.
   - Constraints: `UNIQUE(attendee_id)`.
7. **`event_volunteers`**:
   - Columns: `id` (uuid), `event_id` (fk `events_catalog.id`), `student_id` (fk `students.id`), `created_at`.
   - Constraints: `UNIQUE(event_id, student_id)`.
8. **`refresh_tokens`**:
   - Columns: `id` (uuid), `account_id` (fk `accounts.id`), `token_hash`, `expires_at`, `revoked_at`, `created_at`.

---

## 3. Comprehensive List of Affected Files

### Backend (`pointstrack-api/`)
- `src/db/schema.ts` — Database table schemas, enums, FK constraints, and Drizzle types.
- `src/db/seed.ts` — Database seed data script.
- `src/middleware/auth.ts` — Middleware functions `requireAuth`, `requireRole`, and `requireClub`.
- `src/routes/auth.ts` — `/auth/register/organizer`, `/auth/register/student`, `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`.
- `src/routes/profile.ts` — `/profile/organizer` (club creation/updates) and `/profile/student`.
- `src/routes/events.ts` — `/events` CRUD, `/events/mine`, `/events/by-organizer/:id`, and volunteer endpoints.
- `src/routes/attendees.ts` — Attendance application, `/attendees/checkin-by-qr`, status updates, bulk updates.
- `src/routes/points.ts` — `/points` ledger GET, self-tracked entry POST/PUT/DELETE.
- `src/lib/jwt.ts` — JWT token payload interfaces and signing/verification.
- `scripts/merge-proof.ts` — Proof of migration verification script.

### Web Admin Dashboard (`pointstrack-admin/`)
- `lib/api.ts` — Frontend API client, payload types (`AuthUser`, `OrganizerProfile`), auth functions.
- `contexts/AuthContext.tsx` — Global auth state, session loading from `/auth/me`, route protection logic.
- `app/organizer/(auth)/register/page.tsx` — Organizer registration form.
- `app/organizer/create-club/page.tsx` — Post-registration / student-to-club creation page.
- `app/organizer/settings/page.tsx` — Club settings and branding customization.
- `app/organizer/dashboard/page.tsx` — Dashboard overview.
- `app/organizer/events/page.tsx` & `page.create.tsx` — Event management.
- `app/organizer/attendees/page.tsx` — Attendees management.
- `components/organizer/ProfileCompletionBanner.tsx` — Profile completion checklist banner.
- `lib/colleges.ts` — Hardcoded college list in web application.

### Mobile App (`PointsTrack/`)
- `src/lib/api.ts` — API client and type definitions (`AuthUser`, `StudentProfile`).
- `src/contexts/AuthContext.tsx` — Mobile authentication state provider.
- `src/screens/auth/RegisterScreen.tsx` — Student registration screen (college selection, USN check, lateral entry).
- `src/data/colleges.ts` — Hardcoded VTU colleges array in mobile app.
- `src/screens/profile/ProfileScreen.tsx` — Student profile screen.
- `src/screens/events/EventDetailsScreen.tsx` — Event details and QR scanning/volunteer check-in button.
- `src/screens/events/ScanQRScreen.tsx` — Volunteer/organizer QR scanner screen.

---

## 4. Data Migration Risks

1. **Foreign Key Coupling (`organizers.id = accounts.id`)**:
   - Existing `events_catalog`, `attendees`, and `points_ledger` records point directly to `organizers.id` (which is currently equal to `accounts.id`).
   - Introducing a new `clubs` table with its own independent UUID primary keys requires remapping existing `organizers` rows into `clubs` rows while preserving foreign key integrity across all existing events and ledger entries.
2. **Fake Organizer Student Accounts (`usn LIKE 'ORG-%'`)**:
   - Organizer accounts currently possess a dummy row in `students` with USN `ORG-<hash>`.
   - If these fake student rows are immediately deleted, existing foreign keys in `points_ledger` or `attendees` (if any exist for test organizers) could fail, or existing code expecting `GET /auth/me` to return a `profile` object will throw errors.
3. **String-based College Names**:
   - `students.college` and `organizers.college` store arbitrary string names (e.g. `"R.V.COLLEGE OF ENGINEERING"` vs `"R.V. College of Engineering"`).
   - Migrating to a normalized `colleges` table requires a fuzzy or exact match backfill strategy for existing records, with a fallback for unmatched colleges.
4. **Hardcoded Required Points Snapshot**:
   - `students.required_points` (100 or 80) is stored directly on the `students` table.
   - Migrating to `student_academic_records` + `academic_policies` requires snapshotting existing values so student targets do not unexpectedly change upon system migration.

---

## 5. Compatibility Risks

1. **API Contract Breaking Changes (`/auth/me` & `/auth/login`)**:
   - Mobile app (`PointsTrack`) expects `GET /auth/me` to return `{ user, profile }` where `profile` is the `StudentProfile`.
   - Web admin dashboard (`pointstrack-admin`) expects `GET /auth/me` to return `{ user, club }` where `club` is the organizer profile.
   - Modifying response payloads without preserving top-level keys will break mobile or web authentication context initialization.
2. **JWT Payload Role Field**:
   - Current JWT access tokens encode `{ sub: account.id, role: 'student' | 'organizer', email }`.
   - Under Identity V2, permission checks depend on `club_memberships` and permissions rather than a single `role` claim in the JWT token.
   - Code relying on `req.auth.role` in backend route guards will break if `role` is removed without a migration path.
3. **Single Club vs. Multi-Club Context**:
   - Web admin dashboard routes (`/events/mine`, `/attendees`, `/profile/organizer`) assume 1 user = 1 organizer profile (`req.auth.sub`).
   - Multi-club support requires endpoints to accept or resolve a target `clubId` (e.g. `/clubs/:clubId/events`), requiring updates to web admin API calls.
4. **Mobile App College Selection**:
   - Mobile currently imports a static `COLLEGES` array from `src/data/colleges.ts`.
   - Replacing this with `GET /colleges` must be backward-compatible so offline or slow connections don't block registration.

---

## 6. PRD vs. Existing Codebase Conflicts & Resolution Plan

| # | PRD Requirement | Existing Codebase State | Conflict Analysis & Recommended Resolution |
|---|---|---|---|
| 1 | **Independent Identity (`accounts` separated from `student_profiles` & `clubs`)** | `students.id` and `organizers.id` both use `accounts.id` as PK (1:1 relationship). | **Conflict:** Account ID cannot be reused as Club ID if 1 account can own multiple clubs or a club exists independently.<br>**Resolution:** Create `clubs` table with auto-generated UUID PK. Create `student_profiles` referencing `account_id`. Backfill `clubs.id` for existing organizers and map `club_memberships` with `role = 'owner'`. |
| 2 | **No Fake Student Profiles for Organizers** | `/auth/register/organizer` automatically creates a `students` row with `usn: ORG-<hash>`. | **Conflict:** PRD mandates no fake student records.<br>**Resolution:** Update `/auth/register/organizer` (or club creation) to create only `accounts`, `clubs`, and `club_memberships`. Retain legacy synthesized student records with a flag or ignore them in student queries. |
| 3 | **Normalized Colleges Table** | College stored as raw string in `students.college`, `organizers.college`, `events_catalog.target_college`. | **Conflict:** No `colleges` table exists.<br>**Resolution:** Add `colleges` table with seed data (from `data/colleges.ts`). Add `college_id` FK to `student_profiles` and `clubs`, keeping string `college` columns for backward compatibility during Phase 2. |
| 4 | **Club Memberships & Roles (`owner`, `admin`, `event_manager`, `scanner`, `member`)** | Access is binary: presence of `organizers` row where `id = account.id`. Volunteers use `event_volunteers` per event. | **Conflict:** No multi-club membership or fine-grained roles exist.<br>**Resolution:** Add `club_memberships` table. Replace `requireClub` with `requireClubMember(clubId)` and `requirePermission(permission)`. |
| 5 | **Academic Policies & Records** | `students.required_points` is integer column (default 100/80). | **Conflict:** Points logic is hardcoded in registration.<br>**Resolution:** Add `academic_policies` and `student_academic_records` tables. Populate standard (100) and lateral (80) policies. Backfill snapshots for existing students. |
| 6 | **Activity Point Ledger Refactoring** | `points_ledger` exists with `student_id`, `organizer_id`, `event_id`, `attendee_id`, `points`. | **Alignment:** Codebase already has a `points_ledger` table with unique constraint on `attendee_id`!<br>**Resolution:** Retain and extend existing `points_ledger` table by adding `club_id` (referencing `clubs.id`) and `type` / `status` / `reason` columns as required by PRD Section 7.3. |

---

## 7. Phased Implementation Plan Overview

### Phase 0: Audit & Documentation (CURRENT)
- [x] Inspect existing database schema, ORM, authentication routes, middleware, registration, web admin, and mobile app.
- [x] Produce `docs/identity-v2-audit.md`.

### Phase 1: Database Schema Expansion (Non-destructive)
- Create new tables: `colleges`, `clubs`, `club_memberships`, `club_branding`, `club_social_links`, `club_gallery`, `club_announcements`, `academic_policies`, `student_academic_records`.
- Extend `accounts` with `status` and `email_verified_at`.
- Add `club_id` to `events_catalog` and `points_ledger`.

### Phase 2: Data Backfill & Seed
- Seed `colleges` table with VTU colleges list.
- Seed default `academic_policies` (Standard 100, Lateral 80).
- Backfill `clubs` and `club_memberships` (owner role) from existing `organizers`.
- Backfill `student_academic_records` for existing students.
- Map string `college` fields to `college_id` foreign keys.

### Phase 3: Backend Authorization & API Refactor
- Implement `requireClubMember(clubId)` and `requirePermission(permission)` middleware.
- Add `/colleges` endpoints (`GET /colleges`, `GET /colleges/:id`).
- Add `/clubs` endpoints (`POST /clubs`, `GET /clubs`, `GET /clubs/:id`, `PATCH /clubs/:id`, `GET /clubs/:id/members`).
- Update `/auth/register/organizer` to create account + club + owner membership without creating fake student profiles.
- Update `/auth/me` to return account details, student profile (if any), and active club memberships.

### Phase 4: Web Dashboard & Mobile Onboarding Refactor
- Update Next.js `AuthContext` and API client to handle multi-club memberships and club switching.
- Refactor `Create Club` flow on web dashboard for existing and new users.
- Update mobile student registration to query `GET /colleges` and validate USN dynamically.

### Phase 5: Activity Points Ledger & Academic Policy Integration
- Integrate `academic_policies` snapshot logic into student registration.
- Verify `points_ledger` uniqueness and add reversal endpoint support.

### Phase 6: Testing, Cleanup & Verification
- Integration tests for registration, club creation, multi-club access, and points ledger.
- Deprecate legacy organizer checks and verify zero regression for existing accounts.
