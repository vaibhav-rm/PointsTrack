/**
 * PointsTrack Identity V2 — Master Release Evidence Generator
 * Runs all executable verification suites, captures raw outputs, exit codes,
 * and formats the release evidence manifest document.
 */

import { execSync } from 'child_process';
import * as path from 'path';

function runSuite(name: string, cmd: string): { output: string; exitCode: number } {
  console.log(`\n================================================================================`);
  console.log(`EXECUTING: ${name}`);
  console.log(`COMMAND:   ${cmd}`);
  console.log(`================================================================================\n`);
  try {
    const output = execSync(cmd, { cwd: path.resolve(process.cwd()), encoding: 'utf-8' });
    console.log(output);
    return { output, exitCode: 0 };
  } catch (err: any) {
    const output = (err.stdout ?? '') + '\n' + (err.stderr ?? '');
    console.error(output);
    return { output, exitCode: err.status ?? 1 };
  }
}

function main() {
  const gitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const timestamp = new Date().toISOString();

  console.log(`PointsTrack V2 Master Release Evidence Generator`);
  console.log(`Git Commit SHA: ${gitSha}`);
  console.log(`Timestamp:      ${timestamp}\n`);

  const results = [
    runSuite('1. Complete Authorization Matrix Suite', 'npx tsx scripts/verify-authorization-matrix.ts'),
    runSuite('2. V2 HTTP Compatibility & Smoke Suite', 'npx tsx scripts/verify-v1-http-compatibility.ts'),
    runSuite('3. Student Retention & Anonymization Suite', 'npx tsx scripts/verify-student-retention.ts'),
    runSuite('4. Concurrent Award & Reversal Idempotency Suite', 'npx tsx scripts/concurrency-proof.ts'),
    runSuite('5. Isolated Staging Migration Rehearsal', 'npx tsx scripts/rehearse-isolated-staging-migration.ts'),
    runSuite('6. Rollback Procedure & Schema Integrity Rehearsal', 'npx tsx scripts/rehearse-rollback-procedure.ts'),
    runSuite('7. Point-in-Time Recovery (PITR) Rehearsal', 'npx tsx scripts/rehearse-pitr-recovery.ts'),
    runSuite('8. Cloudflare R2 Integration Suite', 'npx tsx scripts/verify-r2-integration.ts'),
    runSuite('9. Ledger Reconciliation Suite', 'npx tsx scripts/reconcile-canary-ledger.ts'),
  ];

  const allPassed = results.every((r) => r.exitCode === 0);
  console.log(`\n================================================================================`);
  console.log(`MASTER RELEASE EVIDENCE GENERATION COMPLETE`);
  console.log(`Git SHA: ${gitSha}`);
  console.log(`Overall Result: ${allPassed ? 'ALL SUITES PASSED ✓' : 'FAILURES DETECTED ✗'}`);
  console.log(`================================================================================\n`);

  process.exit(allPassed ? 0 : 1);
}

main();
