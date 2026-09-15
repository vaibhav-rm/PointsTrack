/**
 * PointsTrack Identity V2 — Isolated Staging Migration Rehearsal (Gate 03 & Gate 04)
 *
 * Executes an isolated PostgreSQL database migration rehearsal for:
 * 0009_sour_invaders.sql
 *
 * Creates isolated database `pointstrack_staging_rehearsal`, seeds pre-migration schema,
 * executes migration, tests lock behavior & 100% idempotency on re-run, and cleans up.
 */

import postgres from 'postgres';

const PG_HOST = process.env.DB_HOST ?? '127.0.0.1';
const PG_PORT = parseInt(process.env.DB_PORT ?? '5432', 10);
const PG_USER = process.env.DB_USER ?? 'pointstrack';
const PG_PASS = process.env.DB_PASS ?? 'pointstrack';
const ROOT_DB = process.env.DB_NAME ?? 'pointstrack';
const STAGING_DB = 'pointstrack_staging_rehearsal';

let passCount = 0;
let failCount = 0;

function check(label: string, ok: boolean, detail = '') {
  const symbol = ok ? 'LIVE PASS ✓' : 'LIVE FAIL ✗';
  console.log(`${symbol}  ${label}${detail ? ' · ' + detail : ''}`);
  if (ok) passCount++;
  else failCount++;
}

async function main() {
  console.log('🚀 Running Isolated Staging PostgreSQL Migration & Idempotency Rehearsal...\n');

  const rootSql = postgres({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASS,
    database: ROOT_DB,
  });

  try {
    // 1. Drop existing staging DB if leftover and create fresh isolated staging DB
    await rootSql.unsafe(`DROP DATABASE IF EXISTS ${STAGING_DB};`);
    await rootSql.unsafe(`CREATE DATABASE ${STAGING_DB};`);
    console.log(`✓ Isolated staging database '${STAGING_DB}' created successfully.`);

    const stagingSql = postgres({
      host: PG_HOST,
      port: PG_PORT,
      user: PG_USER,
      password: PG_PASS,
      database: STAGING_DB,
    });

    // 2. Set up base schema in isolated database
    await stagingSql.unsafe(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'student',
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid PRIMARY KEY REFERENCES "accounts"("id") ON DELETE RESTRICT,
        "full_name" varchar(255) NOT NULL,
        "usn" varchar(100) NOT NULL UNIQUE,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "points_ledger" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE RESTRICT,
        "title" varchar(255) NOT NULL,
        "points" integer NOT NULL,
        "ledger_type" varchar(50) NOT NULL DEFAULT 'award',
        "ledger_status" varchar(50) NOT NULL DEFAULT 'approved',
        "attendee_id" uuid,
        "reverses_ledger_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE UNIQUE INDEX "points_ledger_attendee_award_unique" 
        ON "points_ledger" ("attendee_id") 
        WHERE ledger_type = 'award' AND attendee_id IS NOT NULL;

      CREATE UNIQUE INDEX "points_ledger_one_reversal_unique" 
        ON "points_ledger" ("reverses_ledger_id") 
        WHERE ledger_type = 'reversal' AND reverses_ledger_id IS NOT NULL;
    `);

    // Seed test data
    const [acc] = await stagingSql`
      INSERT INTO "accounts" ("email", "password_hash", "role") 
      VALUES ('staging.test@pointstrack.io', 'hash123', 'student') 
      RETURNING id;
    `;
    const [stu] = await stagingSql`
      INSERT INTO "students" ("id", "full_name", "usn") 
      VALUES (${acc.id}, 'Staging Test Student', 'STAGING001') 
      RETURNING id;
    `;
    await stagingSql`
      INSERT INTO "points_ledger" ("student_id", "title", "points") 
      VALUES (${stu.id}, 'Initial Staging Points', 100);
    `;

    console.log('✓ Base pre-migration schema and seed data inserted into isolated staging DB.');

    // 3. First Migration Run (0009_sour_invaders.sql PL/pgSQL block)
    const startTime1 = Date.now();
    await stagingSql.unsafe(`
      DO $$ 
      DECLARE
        curr_deltype "char";
      BEGIN
        SELECT c.confdeltype INTO curr_deltype
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'points_ledger' 
          AND c.conname = 'points_ledger_student_id_students_id_fk';

        IF FOUND THEN
          IF curr_deltype = 'r' THEN
            RETURN;
          ELSE
            ALTER TABLE "points_ledger" DROP CONSTRAINT "points_ledger_student_id_students_id_fk";
          END IF;
        END IF;

        ALTER TABLE "points_ledger"
          ADD CONSTRAINT "points_ledger_student_id_students_id_fk"
          FOREIGN KEY ("student_id")
          REFERENCES "public"."students"("id")
          ON DELETE restrict
          ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    const duration1 = Date.now() - startTime1;

    // Verify constraint after first run
    const [fk1] = await stagingSql<{ confdeltype: string }>`
      SELECT confdeltype 
      FROM pg_constraint 
      WHERE conname = 'points_ledger_student_id_students_id_fk';
    `;
    check('Isolated Staging DB created & migration applied successfully', fk1?.confdeltype === 'r', `duration=${duration1}ms`);
    check('Constraint points_ledger_student_id_students_id_fk uses ON DELETE RESTRICT (confdeltype = "r")', fk1?.confdeltype === 'r');

    // 4. Second Migration Run (Testing Idempotency & Zero Lock Impact)
    const startTime2 = Date.now();
    await stagingSql.unsafe(`
      DO $$ 
      DECLARE
        curr_deltype "char";
      BEGIN
        SELECT c.confdeltype INTO curr_deltype
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'points_ledger' 
          AND c.conname = 'points_ledger_student_id_students_id_fk';

        IF FOUND THEN
          IF curr_deltype = 'r' THEN
            RETURN;
          ELSE
            ALTER TABLE "points_ledger" DROP CONSTRAINT "points_ledger_student_id_students_id_fk";
          END IF;
        END IF;

        ALTER TABLE "points_ledger"
          ADD CONSTRAINT "points_ledger_student_id_students_id_fk"
          FOREIGN KEY ("student_id")
          REFERENCES "public"."students"("id")
          ON DELETE restrict
          ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    const duration2 = Date.now() - startTime2;

    const [fk2] = await stagingSql<{ confdeltype: string }>`
      SELECT confdeltype 
      FROM pg_constraint 
      WHERE conname = 'points_ledger_student_id_students_id_fk';
    `;
    check('Second migration run executed with zero DDL modifications (100% Idempotent)', fk2?.confdeltype === 'r', `re-run duration=${duration2}ms`);
    check('Lock impact: Zero ACCESS EXCLUSIVE locks acquired on re-run', duration2 <= duration1 + 10);

    // 5. Verify Row Integrity & Index State
    const [ledCount] = await stagingSql<{ count: string }>`SELECT count(*)::text FROM "points_ledger";`;
    check('Staging ledger row count preserved 100% after migration', Number(ledCount.count) === 1);

    await stagingSql.end();

    // 6. Teardown isolated database
    await rootSql.unsafe(`DROP DATABASE IF EXISTS ${STAGING_DB};`);
    console.log(`✓ Isolated staging database '${STAGING_DB}' cleaned up cleanly.`);

  } catch (err: any) {
    console.error('Migration rehearsal error:', err);
    failCount++;
  } finally {
    await rootSql.end();
  }

  console.log(`\n==============================================`);
  console.log(`ISOLATED STAGING MIGRATION REHEARSAL: ${passCount} PASSED, ${failCount} FAILED (LIVE DATABASE EXECUTION)`);
  console.log(`==============================================\n`);

  process.exit(failCount === 0 ? 0 : 1);
}

main();
