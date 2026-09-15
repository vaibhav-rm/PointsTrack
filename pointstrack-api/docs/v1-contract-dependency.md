# External Dependency Record: Historical V1 OpenAPI Contract (Gate 13)

## Status: BLOCKED — EXTERNAL DEPENDENCY MISSING

### Overview
**Gate 13 (Exact Historical V1 OpenAPI Contract Compatibility)** requires automated schema diffing and HTTP contract compatibility testing against the legacy V1 API specification (`v1-openapi-spec.json`).

Currently, the historical V1 OpenAPI contract specification file is unavailable in the `pointstrack-api` repository.

---

### External Dependency Specification
To unblock Gate 13, the legacy API team or API governance owner (`api-team@pointstrack.io`) must provide the authoritative V1 OpenAPI 3.0 JSON/YAML specification.

* **Required File Path:** `docs/contracts/v1-openapi-spec.json`
* **Target Version:** PointsTrack API v1.4.2
* **Required Endpoints to Validate:**
  - `POST /auth/login`
  - `POST /auth/register`
  - `GET /events`
  - `POST /events`
  - `POST /attendees/checkin`
  - `GET /students/me/points`

---

### Current Scope & Risk Mitigation
While Gate 13 remains **BLOCKED**, full V2 Express route specification and contract risk analysis is actively validated via:
`npx tsx scripts/verify-v1-http-compatibility.ts`

This suite provides 29 live HTTP route smoke tests verifying V2 request/response payloads, authentication header handling, status code contracts, and database write constraints.

---

### Unblocking Procedure
1. Obtain `v1-openapi-spec.json` from the legacy API repository or API gateway.
2. Commit the specification to `docs/contracts/v1-openapi-spec.json`.
3. Re-run `npx tsx scripts/verify-v1-http-compatibility.ts`.
4. Update Gate 13 status in the canonical release registry upon successful schema diffing.
