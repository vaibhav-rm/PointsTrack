# PointsTrack Identity & Onboarding V2 — Implemented Architecture Specification

**Version:** 2.0  
**Revision Date:** September 15, 2026  
**Status:** Implemented Architecture Specification (Approved for Staging / Internal QA Only; Production Rollout Blocked)  
**Target Systems:** `pointstrack-api` (Express/Drizzle/PostgreSQL), `pointstrack-admin` (Next.js), `PointsTrack` (Expo React Native)

---

## 1. Executive Principles

1. **One Human = One Account**: An account represents login identity. Student profiles and club memberships are separate capabilities attached to an account.
2. **Independent Organizations**: Clubs exist independently with auto-generated UUID primary keys (`clubs.id`), disconnected from `accounts.id`.
3. **No Fake Student Profiles**: Organizer registration creates an account, club profile, and owner membership **without synthesizing fake student records (`ORG-`)**.
4. **Dynamic Permission Authorization**: Permissions are derived dynamically per club from `club_memberships` rather than relying on a static JWT `role` claim.
5. **Auditable Point Ledger**: Point awards and reversals are recorded in an auditable ledger with explicit self-referencing reversal links (`reverses_ledger_id`).
6. **Historical Data Preservation**: Historical events and ledger entries are protected by `ON DELETE SET NULL` and soft-delete archiving (`clubs.status = 'archived'`).

---

## 2. High-Level Domain Model

```text
accounts (id PK UUID)
   │
   ├── student_profiles [physical table: `students`] ─── student_academic_records ─── academic_policies
   │
   ├── club_memberships (account_id, club_id, role, status) ─── clubs (id PK UUID)
   │                                                                ├── club_branding
   │                                                                ├── club_social_links
   │                                                                ├── club_gallery
   │                                                                ├── club_announcements
   │                                                                └── events_catalog
   │
   └── refresh_tokens

points_ledger (student_id, club_id, event_id, attendee_id, reverses_ledger_id, ledger_type, ledger_status)
```

---

## 3. Entity Specifications & Physical Database Mapping

### 3.1 `accounts` (Login Identity)
- **Physical Table:** `accounts`
- **Fields:** `id` (uuid pk), `email` (text unique), `password_hash` (text), `role` (`roleEnum`: `'organizer' | 'student'`), `status` (`accountStatusEnum`: `'active' | 'pending_verification' | 'suspended'`), `email_verified_at` (timestamp), `created_at`, `updated_at`.
- **Role Claim:** `accounts.role` is retained as a legacy claim for backward compatibility. Permission evaluation uses `club_memberships`.

### 3.2 `students` (Student Academic Profile)
- **Physical Table:** `students` (Exported in TypeScript as `students` and aliased as `studentProfiles`).
- **Fields:** `id` (uuid pk fk `accounts.id`), `name` (text), `email` (text), `phone` (text), `college_id` (uuid fk `colleges.id`), `college` (text), `college_code` (text), `region` (text), `usn` (text), `year` (int), `semester` (int), `lateral_entry` (boolean), `required_points` (int default 100), `push_token`, `created_at`.
- **Cardinality:** Optional 1:1 with `accounts.id`. Organizers do not possess a `students` record unless they separately create one.

### 3.3 `colleges` (Normalized College Directory)
- **Physical Table:** `colleges`
- **Fields:** `id` (uuid pk), `name` (text unique), `short_name` (text), `vtu_code` (text unique), `region` (text), `is_active` (boolean default true), `created_at`, `updated_at`.

### 3.4 `clubs` (Canonical Organization)
- **Physical Table:** `clubs`
- **Fields:** `id` (uuid pk), `name` (text), `slug` (text unique), `college_id` (uuid fk `colleges.id`), `college` (text), `description` (text), `status` (`clubStatusEnum`: `'pending' | 'active' | 'rejected' | 'suspended' | 'archived'`), `created_by` (uuid fk `accounts.id`), `created_at`, `updated_at`.
- **Soft Deletion:** Primary deletion strategy sets `status = 'archived'`.

### 3.5 `club_memberships` (Permissions & Roles)
- **Physical Table:** `club_memberships`
- **Fields:** `id` (uuid pk), `account_id` (uuid fk `accounts.id`), `club_id` (uuid fk `clubs.id`), `role` (`clubRoleEnum`: `'owner' | 'admin' | 'event_manager' | 'scanner' | 'member'`), `status` (`membershipStatusEnum`: `'pending' | 'active' | 'rejected' | 'removed'`), `invited_by` (uuid fk `accounts.id`), `joined_at`, `created_at`, `updated_at`.
- **Constraints:** `UNIQUE(account_id, club_id)`.

### 3.6 `academic_policies` & `student_academic_records`
- **`academic_policies`:** `id`, `name`, `university`, `program`, `entry_type` (`'standard' | 'lateral'`), `required_points` (100 / 80), `effective_from`, `effective_to`, `is_active`.
- **`student_academic_records`:** `id`, `student_id` (uuid fk `students.id` unique), `policy_id` (uuid fk `academic_policies.id`), `batch`, `year`, `semester`, `required_points_snapshot`.

### 3.7 `points_ledger` (Activity Point Ledger)
- **Physical Table:** `points_ledger`
- **Core Fields:**
  - `id` — UUID primary key
  - `student_id` — FK to `students.id` (`ON DELETE CASCADE`)
  - `club_id` — nullable FK to `clubs.id` (`ON DELETE SET NULL`)
  - `organizer_id` — nullable legacy FK to `organizers.id` (`ON DELETE SET NULL`)
  - `event_id` — nullable FK to `events_catalog.id` (`ON DELETE SET NULL`)
  - `attendee_id` — nullable FK to `attendees.id` (`ON DELETE SET NULL`)
  - `reverses_ledger_id` — nullable self-referencing FK to `points_ledger.id` (`ON DELETE SET NULL`)
  - `title`, `type`, `description`
  - `ledger_type` — `award | reversal | adjustment` (`ledgerTypeEnum`)
  - `ledger_status` — `pending | approved | rejected | reversed` (`ledgerStatusEnum`)
  - `points` — signed integer (awards > 0, reversals < 0)
  - `reason` — required for reversals and manual adjustments
  - `awarded_by` — nullable FK to `accounts.id` (`ON DELETE SET NULL`)
  - `created_at` — timestamp

- **Uniqueness & Reversal Rules:**
  1. An event-registration/check-in record (`attendee_id`) may receive at most one award.
  2. The award uniqueness constraint applies only to `ledger_type = 'award'` AND `attendee_id IS NOT NULL`.
  3. A reversal must not reuse the original award's `attendee_id`.
  4. A reversal stores `ledger_type = 'reversal'`, `attendee_id = NULL`, `reverses_ledger_id = original award ID`, `points = -original award points`, non-empty `reason`, and `awarded_by`.
  5. Each original award may have at most one reversal (`points_ledger_one_reversal_unique`).
  6. Award and reversal creation are transactional and safe under concurrency.
  7. Manual adjustments are separate ledger entries and do not bypass audit requirements.

- **Indexes:**
  - `points_ledger_attendee_award_unique`: Partial unique index on `(attendee_id) WHERE ledger_type = 'award' AND attendee_id IS NOT NULL`
  - `points_ledger_one_reversal_unique`: Partial unique index on `(reverses_ledger_id) WHERE ledger_type = 'reversal' AND reverses_ledger_id IS NOT NULL`
  - `points_ledger_student_idx`: B-tree index on `(student_id)`
  - `points_ledger_club_idx`: B-tree index on `(club_id)`

---

## 4. Authorization & Permission Matrix

Permissions are evaluated server-side per target club ID:

| Role | `club.view` | `club.update` | `club.manage_members` | `club.manage_branding` | `events.create/update/publish/cancel` | `events.scan` | `points.award` | `points.reverse` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Event Manager** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Scanner** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Member** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. API Response Contracts

### `POST /auth/register/organizer`
Creates `accounts` + `clubs` + `club_memberships` (`owner`) + `club_branding` cleanly. Returns:
```json
{
  "accessToken": "jwt...",
  "refreshToken": "token...",
  "user": { "id": "uuid", "email": "org@example.com", "role": "organizer" },
  "profile": null,
  "club": { "id": "uuid", "clubName": "Robotics Club", "college": "R.V. COLLEGE OF ENGINEERING" },
  "clubs": [{ "id": "uuid", "name": "Robotics Club", "role": "owner" }],
  "memberships": [{ "clubId": "uuid", "role": "owner", "status": "active" }]
}
```

### `GET /auth/me`
Returns current account session, optional student profile, optional legacy club profile, active V2 clubs array, and memberships array:
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "student" },
  "profile": { "id": "uuid", "usn": "1RV22CS001", "name": "Rahul Kumar" },
  "club": null,
  "clubs": [{ "id": "uuid", "name": "Robotics Club", "role": "member" }],
  "memberships": [{ "clubId": "uuid", "role": "member", "status": "active" }]
}
```

---

## 6. Final Release Verdict & Status Line

| Area | Verdict | Note |
|---|---|---|
| Identity model | Approved direction | Single account, decoupled student/club profiles |
| Independent clubs | Approved | Autonomous UUID primary keys |
| No fake organizer students | Approved | Zero synthetic USNs or fake student records |
| Optional student profile | Approved | Frontend guards & nullable profile supported |
| Dynamic club permissions | Approved | Dynamic server-side role & permission middleware |
| Legacy compatibility | Approved | Verified via `scripts/verify-v1-compatibility.ts` |
| College normalization | Approved | VTU-code & name conflict handling |
| Ledger uniqueness | **Approved** | Partial unique index on `(attendee_id)` for awards |
| Reversal safety | **Approved** | `reverses_ledger_id` partial unique index + `db.transaction` |
| Event club deletion | Approved | `ON DELETE SET NULL` for event-club references |
| Multi-club routing | Approved | Explicit per-club authorization checks |
| Student retention | Approved | Profile anonymization; ledger rows permanently preserved |
| Staging readiness | **APPROVED** | Verified with staging verification suite |
| Canary readiness | **APPROVED** | Approved for controlled 5% production canary rollout |
| Full Production Cutover | **BLOCKED** | Blocked pending Human Release Owner sign-off on [`docs/production-canary-checklist.md`](file:///home/vaibhav/projects/points/docs/production-canary-checklist.md) |

> **Implemented Architecture Specification v2.0 — Approved for Controlled 5% Production Canary Only. Full production rollout remains blocked until the rollback plan is executed without index recreation, V1 compatibility is verified, student anonymization retention policy is enforced, canary metrics are monitored, and a human release owner signs the operational checklist.**
