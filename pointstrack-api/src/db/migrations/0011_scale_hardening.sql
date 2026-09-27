-- Scale hardening: FK-backed college tenancy, canonical event timestamps,
-- hot-path composite indexes, admin role, globally-unique USNs.

-- 1. Allow platform admins (previously only organizer/student).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE "role" ADD VALUE 'admin';
  END IF;
END $$;

-- 2. Events: canonical tenancy key + sortable timestamp.
ALTER TABLE "events_catalog" ADD COLUMN IF NOT EXISTS "college_id" uuid;
ALTER TABLE "events_catalog" ADD COLUMN IF NOT EXISTS "start_at" timestamp with time zone;

DO $$ BEGIN
  ALTER TABLE "events_catalog"
    ADD CONSTRAINT "events_catalog_college_id_colleges_id_fk"
    FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Best-effort backfill: match legacy target_college names to the directory.
UPDATE "events_catalog" e
SET "college_id" = c."id"
FROM "colleges" c
WHERE e."college_id" IS NULL
  AND e."target_college" IS NOT NULL
  AND c."name" = e."target_college";

-- Best-effort backfill: parse legacy ISO-like `date` text into start_at.
UPDATE "events_catalog"
SET "start_at" = "date"::timestamp with time zone
WHERE "start_at" IS NULL
  AND "date" IS NOT NULL
  AND "date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}';

-- 3. Hot-path indexes (all IF NOT EXISTS so the migration is re-runnable).
CREATE INDEX IF NOT EXISTS "students_college_id_idx" ON "students" ("college_id");
CREATE UNIQUE INDEX IF NOT EXISTS "students_usn_unique" ON "students" ("usn");

CREATE INDEX IF NOT EXISTS "events_catalog_college_id_idx" ON "events_catalog" ("college_id");
CREATE INDEX IF NOT EXISTS "events_catalog_start_at_idx" ON "events_catalog" ("start_at");
CREATE INDEX IF NOT EXISTS "events_catalog_date_idx" ON "events_catalog" ("date");
CREATE INDEX IF NOT EXISTS "events_catalog_target_college_date_idx" ON "events_catalog" ("target_college", "date");
CREATE INDEX IF NOT EXISTS "events_catalog_open_to_all_idx" ON "events_catalog" ("open_to_all");

CREATE INDEX IF NOT EXISTS "attendees_event_status_idx" ON "attendees" ("event_id", "status");
CREATE INDEX IF NOT EXISTS "attendees_organizer_status_idx" ON "attendees" ("organizer_id", "status");

CREATE INDEX IF NOT EXISTS "points_ledger_student_status_idx" ON "points_ledger" ("student_id", "ledger_status");
CREATE INDEX IF NOT EXISTS "points_ledger_event_idx" ON "points_ledger" ("event_id");

CREATE INDEX IF NOT EXISTS "club_memberships_club_status_idx" ON "club_memberships" ("club_id", "status");

-- 4. Drop the superseded non-unique USN index (kept unique from here on).
DROP INDEX IF EXISTS "students_usn_idx";
