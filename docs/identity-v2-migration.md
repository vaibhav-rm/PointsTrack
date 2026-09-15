# PointsTrack Identity & Onboarding V2 — Migration Guide

**Version:** 2.0  
**Scope:** Database migration, backfill scripts, and backward compatibility rules

---

## 1. Non-Destructive Schema Expansion (Phase 1 Implemented)

Migration file `src/db/migrations/0006_lethal_patriot.sql` introduces:
- New tables: `colleges`, `clubs`, `club_memberships`, `club_branding`, `club_social_links`, `club_gallery`, `club_announcements`, `academic_policies`, `student_academic_records`.
- New columns:
  - `accounts.status`, `accounts.email_verified_at`
  - `students.college_id`
  - `events_catalog.club_id`
  - `points_ledger.club_id`, `points_ledger.ledger_type`, `points_ledger.ledger_status`, `points_ledger.reason`, `points_ledger.awarded_by`

---

## 2. Seed & Backfill Strategy (Phase 2 Implemented)

The `npm run db:seed` script has been updated to:
1. Seed official VTU colleges into `colleges` with `vtu_code` (e.g., `1RV`, `1BM`, `1BI`, `1DS`, `1MS`, `4NI`, `2GI`, `3PD`).
2. Seed default `academic_policies`:
   - Standard Entry: 100 points
   - Lateral Entry: 80 points
3. For existing organizers:
   - Create a `clubs` entry with a unique slug derived from club name.
   - Create a `club_memberships` record with `role: 'owner'`.
   - Create `club_branding` with accent color.
4. For existing students:
   - Match `college` string / `college_code` to `colleges.id`.
   - Create `student_academic_records` snapshotting required points.

---

## 3. Backward Compatibility & Rollout Guards

1. **`organizers` Table Preservation**:
   - The legacy `organizers` table remains in `schema.ts` and API handlers during the transition.
   - `POST /auth/register/organizer` inserts into both `organizers` and `clubs` + `club_memberships`.
   - `/auth/me` returns `user`, `profile`, `club`, `clubs`, and `memberships`.

2. **No Fake USN Generation**:
   - New organizer registrations create `accounts` + `clubs` + `club_memberships` (`owner`) without generating synthetic `students` rows with fake USNs (`ORG-<hash>`).
