# PointsTrack Identity & Onboarding V2 — Operational Production Canary Runbook

**Document ID:** `PT-V2-CANARY-RUNBOOK-REVISED-2026-09-15`  
**Git Commit SHA:** `49659795f99e97beba03b2e7815df6fe52f345c9`  
**Release ID:** `PT-V2-REL-20260915-01`  
**Build ID:** `PT-BUILD-20260915-49659795`  
**Status:** **CONDITIONALLY APPROVED FOR 5% CONTROLLED PRODUCTION CANARY ONLY**  
**100% Production Traffic Cutover Status:** **BLOCKED PENDING HUMAN RELEASE OWNER SIGN-OFF**  

---

## 1. Release Decision Logic & Canary Thresholds

### 1.1 Immediate Rollback Triggers
The release owner or automated monitoring must trigger an **IMMEDIATE ROLLBACK** if any of the following occur:
1. **Ledger Discrepancy**: Any duplicate point award, duplicate reversal, or ledger total inconsistency.
2. **Unhandled Ledger Error**: Any unhandled `5xx` error on point award or reversal endpoints (`/attendees/checkin-by-qr`, `/points/:id/reverse`) — *applies immediately regardless of request volume*.
3. **Cross-Club Security Failure**: Any unauthorized cross-club administrative access or permission escalation succeeds.
4. **Authentication Break**: Any critical authentication failure or confirmed V1 API contract compatibility break.
5. **Data Loss**: Any unexpected record deletion or foreign key cascade violation.
6. **Schema Drift**: Any migration failure or database schema inconsistency.
7. **Error Rate Spike**: Sustained `5xx` error rate > **0.1%** over a 5-minute rolling window (minimum 1,000 requests).
8. **Latency Degradation**: P99 request latency > **150ms** for 10 consecutive minutes.

### 1.2 Canary Metric Rules & Exclusions
- **Evaluation Window**: 5-minute rolling window with minimum 1,000 requests per stage.
- **Excluded Responses**: HTTP `400 Bad Request` (validation errors) and HTTP `409 Conflict` (duplicate registration conflicts) are business responses and are **EXCLUDED** from server error-rate metrics.
- **Excluded Endpoints**: Health check endpoints (`/health`) are excluded from traffic volume and error rate metrics.
- **Warning Threshold**: Server error rate > **0.02%** or P95 latency > **100ms** over a 5-minute window generates high-priority ops alert but does not trigger auto-rollback unless Stage 1.1 triggers met.

---

## 2. Canary Stage Promotion Rules

| Stage | Target Audience | Traffic Share | Minimum Duration | Promotion Requirements |
|---|---|:---:|:---:|---|
| **Stage 1 (Canary 5%)** | Selected Pilot Clubs (5 Institutions) | **5%** | 2 Hours | Zero Section 1.1 immediate rollback triggers; Error Rate < 0.02%, P99 < 150ms |
| **Stage 2 (Canary 25%)** | Regional Beta Institutions (20 Clubs) | **25%** | 12 Hours | Zero confirmed ledger discrepancies and zero successful unauthorized cross-club access over 12 hours (minimum 1,000 requests). Any confirmed occurrence blocks promotion permanently and requires incident review. |
| **Stage 3 (Full Cutover)**| Global Production Traffic (All Users) | **100%** | Permanent | Human Release Owner signs Section 6 Operational Checklist with attached raw test output. |

---

## 3. Safe Rollback Strategy (NO Legacy Index Recreation)

> [!CAUTION]
> **DO NOT EXECUTE `CREATE UNIQUE INDEX "points_ledger_attendee_unique" ON "points_ledger" ("attendee_id")` DURING ROLLBACK.**
> Recreating the legacy global unique index on `attendee_id` reintroduces the exact global uniqueness defect that V2 fixed, causes duplicate key errors on valid reversal rows, and can lock or crash production Postgres.

### 3.1 Default Application Rollback Procedure
1. **Stop & Drain Writes**: Immediately drain V2 write traffic at the load balancer or API gateway.
2. **Traffic Fallback**: Shift traffic to a V1 API build **only if V1 compatibility is verified** against the migrated schema via `scripts/verify-v1-http-compatibility.ts`.
3. **Preserve V2 Schema**: Keep the V2 PostgreSQL schema and partial unique indexes (`points_ledger_attendee_award_unique` and `points_ledger_one_reversal_unique`) active in Postgres.

### 3.2 Point-In-Time Recovery (PITR) Disaster Recovery Procedure
> **PITR is a disaster-recovery procedure, not the default application rollback mechanism.**
> It requires Human Release Owner and DBA approval because it may remove valid post-recovery-target writes.

- **Approval Requirement**: Requires joint sign-off from Human Release Owner and Lead DBA.
- **Write Freeze Duration**: Maximum 15-minute write freeze window during snapshot restoration.
- **Post-Snapshot Reconciliation Strategy**: Post-recovery target writes are identified via audit log, replayed, and verified via post-deployment ledger reconciliation queries before reopening public traffic.

---

## 4. Student Deletion vs. Immutable Ledger Retention Policy

1. **Database-Enforced Retention (`ON DELETE RESTRICT`)**:
   - `points_ledger.student_id` foreign key constraint is set to **`ON DELETE RESTRICT`** (`0009_sour_invaders.sql`).
   - PostgreSQL strictly **REJECTS** (`23503 foreign_key_violation`) any attempted hard-deletion of student profiles or accounts with activity ledger history.
2. **Account Deactivation & Anonymization Procedure**:
   - Account status updated to `accountStatusEnum = 'suspended'`.
   - PII fields anonymized: `students.name = 'Anonymized Student'`, `students.email = 'anonymized.<uuid>@deleted.invalid'`, `phone = null`, `pushToken = null`.
   - `students.id` primary key and all referencing `points_ledger` records remain intact, preserving immutable point balances and audit trails.

---

## 5. Verification Evidence Reference

- **Git Commit SHA Verification Output**: `git rev-parse HEAD` -> `49659795f99e97beba03b2e7815df6fe52f345c9`
- **Migration SQL (`0009_sour_invaders.sql`)**: [`docs/production-release-evidence.md#1-migration-0009_sour_invaderssql-raw-sql-output`](file:///home/vaibhav/projects/points/docs/production-release-evidence.md#1-migration-0009_sour_invaderssql-raw-sql-output)
- **V1 HTTP Integration Log**: [`docs/production-release-evidence.md#3-real-http-api-integration-suite-raw-log-scriptsverify-v1-http-compatibilityts`](file:///home/vaibhav/projects/points/docs/production-release-evidence.md#3-real-http-api-integration-suite-raw-log-scriptsverify-v1-http-compatibilityts)
- **Student Retention Test Log**: [`docs/production-release-evidence.md#4-student-retention--anonymization-raw-log-scriptsverify-student-retentionts`](file:///home/vaibhav/projects/points/docs/production-release-evidence.md#4-student-retention--anonymization-raw-log-scriptsverify-student-retentionts)
- **Authorization Matrix Log**: [`docs/production-release-evidence.md#5-authorization-matrix-negative-integration-log-scriptsverify-authorization-matrixts`](file:///home/vaibhav/projects/points/docs/production-release-evidence.md#5-authorization-matrix-negative-integration-log-scriptsverify-authorization-matrixts)
- **Rollback Safety Log**: [`docs/production-release-evidence.md#6-rollback-safety--index-integrity-log-scriptsverify-rollback-safetyts`](file:///home/vaibhav/projects/points/docs/production-release-evidence.md#6-rollback-safety--index-integrity-log-scriptsverify-rollback-safetyts)

---

## 6. Operational Production Checklist (Human Release Owner Sign-Off)

*This checklist must be signed by the designated Human Release Owner prior to promoting canary traffic from 5% to 100%.*

- [ ] **1. V1 HTTP compatibility test passed against the migrated schema** (`scripts/verify-v1-http-compatibility.ts`).
- [ ] **2. Rollback procedure was executed successfully in staging** (draining traffic without recreating legacy global index).
- [ ] **3. No automatic recreation of the legacy global attendee uniqueness index** (verifying safe rollback strategy).
- [ ] **4. Production backup/PITR restore was tested** (verifying snapshot restoration window < 15 mins).
- [ ] **5. Cross-club authorization negative tests passed** (verifying unauthorized access returns HTTP 403 Forbidden across all matrix routes).
- [ ] **6. Expected 400/409 business responses are excluded from error-rate metrics** (verified monitoring filters).
- [ ] **7. Database migration lock/timeout behavior was tested** (verifying `lock_timeout = '5s'`).
- [ ] **8. Post-deployment ledger reconciliation query completed** (verifying zero point delta mismatches).
- [ ] **9. On-call owner and escalation contacts confirmed** (primary on-call engineer and database DBA listed).

### Release Sign-Off Signature

```text
Human Release Owner: ___________________________
Signature Date:      ___________________________
Verdict:             [ ] REJECTED   [ ] APPROVED FOR 100% PRODUCTION CUTOVER
```
