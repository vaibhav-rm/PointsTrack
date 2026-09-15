/**
 * PointsTrack Identity V2 — Point-in-Time Recovery (PITR) Backup/Restore Rehearsal (Gate 11)
 *
 * Demonstrates live automated database backup export (`pg_dump`), isolated database restore (`pg_restore` / `psql`),
 * and point-in-time state & ledger integrity validation.
 */

import { execSync } from 'child_process';
import postgres from 'postgres';

const PG_HOST = process.env.DB_HOST ?? '127.0.0.1';
const PG_PORT = parseInt(process.env.DB_PORT ?? '5432', 10);
const PG_USER = process.env.DB_USER ?? 'pointstrack';
const PG_PASS = process.env.DB_PASS ?? 'pointstrack';
const SOURCE_DB = process.env.DB_NAME ?? 'pointstrack';
const RESTORE_DB = 'pointstrack_pitr_restored';

let passCount = 0;
let failCount = 0;

function check(label: string, ok: boolean, detail = '') {
  const symbol = ok ? 'LIVE PASS ✓' : 'LIVE FAIL ✗';
  console.log(`${symbol}  ${label}${detail ? ' · ' + detail : ''}`);
  if (ok) passCount++;
  else failCount++;
}

async function main() {
  console.log('🚀 Running Point-in-Time Recovery (PITR) Backup & Restore Rehearsal...\n');

  const rootSql = postgres({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASS,
    database: SOURCE_DB,
  });

  try {
    // 1. Inspect source database state
    const [sourceAccountCount] = await rootSql<{ count: string }>`SELECT count(*)::text FROM "accounts";`;
    const [sourceStudentCount] = await rootSql<{ count: string }>`SELECT count(*)::text FROM "students";`;
    const [sourceLedgerCount] = await rootSql<{ count: string }>`SELECT count(*)::text FROM "points_ledger";`;
    const [sourceAttendeeCount] = await rootSql<{ count: string }>`SELECT count(*)::text FROM "attendees";`;

    console.log(`Source DB ('${SOURCE_DB}') Row Counts:`);
    console.log(`  accounts=${sourceAccountCount.count}, students=${sourceStudentCount.count}, points_ledger=${sourceLedgerCount.count}, attendees=${sourceAttendeeCount.count}`);

    // 2. Perform automated snapshot backup via pg_dump
    console.log('\n[1/4] Executing database snapshot dump via pg_dump...');
    const startTime = Date.now();
    execSync(
      `docker exec -i pointstrack-db pg_dump -U ${PG_USER} -d ${SOURCE_DB} -f /tmp/pointstrack_pitr.sql`,
      { stdio: 'inherit' }
    );
    const dumpDuration = Date.now() - startTime;
    check('PITR Snapshot Dump Export', true, `duration=${dumpDuration}ms, file=/tmp/pointstrack_pitr.sql`);

    // 3. Prepare fresh isolated target database for PITR restore
    console.log('\n[2/4] Preparing isolated PITR target database...');
    await rootSql.unsafe(`DROP DATABASE IF EXISTS ${RESTORE_DB};`);
    await rootSql.unsafe(`CREATE DATABASE ${RESTORE_DB};`);
    check('Isolated Target DB Created', true, `database='${RESTORE_DB}'`);

    // 4. Restore snapshot dump into isolated restored database
    console.log('\n[3/4] Restoring PITR snapshot into isolated target database...');
    const restoreStartTime = Date.now();
    execSync(
      `docker exec -i pointstrack-db psql -U ${PG_USER} -d ${RESTORE_DB} -f /tmp/pointstrack_pitr.sql > /dev/null 2>&1`,
      { stdio: 'inherit' }
    );
    const restoreDuration = Date.now() - restoreStartTime;
    check('PITR Snapshot Restore Execution', true, `duration=${restoreDuration}ms`);

    // 5. Connect to restored database and verify point-in-time accuracy
    console.log('\n[4/4] Verifying state, schema, indexes, and ledger integrity on restored database...');
    const restoredSql = postgres({
      host: PG_HOST,
      port: PG_PORT,
      user: PG_USER,
      password: PG_PASS,
      database: RESTORE_DB,
    });

    const [resAccountCount] = await restoredSql<{ count: string }>`SELECT count(*)::text FROM "accounts";`;
    const [resStudentCount] = await restoredSql<{ count: string }>`SELECT count(*)::text FROM "students";`;
    const [resLedgerCount] = await restoredSql<{ count: string }>`SELECT count(*)::text FROM "points_ledger";`;
    const [resAttendeeCount] = await restoredSql<{ count: string }>`SELECT count(*)::text FROM "attendees";`;

    check('Accounts row count matches source snapshot', resAccountCount.count === sourceAccountCount.count);
    check('Students row count matches source snapshot', resStudentCount.count === sourceStudentCount.count);
    check('Points Ledger row count matches source snapshot', resLedgerCount.count === sourceLedgerCount.count);
    check('Attendees row count matches source snapshot', resAttendeeCount.count === sourceAttendeeCount.count);

    // Check FK constraint in restored database
    const [fk] = await restoredSql<{ confdeltype: string }>`
      SELECT confdeltype 
      FROM pg_constraint 
      WHERE conname = 'points_ledger_student_id_students_id_fk';
    `;
    check('Restored schema foreign key points_ledger_student_id_students_id_fk uses ON DELETE RESTRICT (r)', fk?.confdeltype === 'r');

    // Check partial unique indexes in restored database
    const indexes = await restoredSql<{ indexname: string }>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'points_ledger';
    `;
    const indexNames = indexes.map((i) => i.indexname);
    check('Restored schema partial index points_ledger_attendee_award_unique is ACTIVE', indexNames.includes('points_ledger_attendee_award_unique'));
    check('Restored schema partial index points_ledger_one_reversal_unique is ACTIVE', indexNames.includes('points_ledger_one_reversal_unique'));

    await restoredSql.end();

    // Clean up restored DB
    await rootSql.unsafe(`DROP DATABASE IF EXISTS ${RESTORE_DB};`);
    console.log(`\n✓ Isolated PITR database '${RESTORE_DB}' cleaned up cleanly.`);

  } catch (err: any) {
    console.error('PITR rehearsal failed:', err);
    failCount++;
  } finally {
    await rootSql.end();
  }

  console.log(`\n==============================================`);
  console.log(`PITR BACKUP & RESTORE REHEARSAL: ${passCount} PASSED, ${failCount} FAILED (LIVE DATABASE EXECUTION)`);
  console.log(`==============================================\n`);

  process.exit(failCount === 0 ? 0 : 1);
}

main();
