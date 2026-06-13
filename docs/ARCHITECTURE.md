# PointsTrack — System Architecture, Robustness & Scalability

_How the platform is built, why it stays correct under load, and how it scales._

---

## 1. What PointsTrack is

PointsTrack digitizes **AICTE Activity Points** for engineering students. Clubs/organizers
publish events, students discover and register for them, organizers check students in
(manually or by scanning a QR), and points are awarded automatically and tracked toward
the student's graduation goal (100 points, or 80 for lateral entry).

It replaces a previous Firebase stack with a **custom, self-hosted backend** for full
control over data, cost, and behavior.

---

## 2. The three components

| Component | Tech | Who uses it |
|---|---|---|
| **`pointstrack-api`** | Express + TypeScript, PostgreSQL + Drizzle ORM, JWT | Backend for both clients |
| **`pointstrack-admin`** | Next.js (App Router) + Tailwind, deployed static/SSR | Organizers (web dashboard) + public landing |
| **`PointsTrack`** | React Native + Expo | Students + organizers (mobile) |

```
                 ┌─────────────────────┐         ┌─────────────────────┐
   Students  ──▶ │  PointsTrack (Expo) │         │ pointstrack-admin   │ ◀── Organizers
   (mobile)      │  iOS / Android      │         │ (Next.js web)       │     (web)
                 └──────────┬──────────┘         └──────────┬──────────┘
                            │  HTTPS + JWT (Bearer)         │
                            └───────────────┬──────────────┘
                                            ▼
                              ┌──────────────────────────┐
                              │   pointstrack-api         │
                              │   Express + TypeScript    │
                              │   JWT auth · rate limit   │
                              │   transactional writes    │
                              └───────┬───────────┬───────┘
                                      ▼           ▼
                          ┌───────────────┐  ┌──────────────────┐
                          │  PostgreSQL   │  │ Cloudflare R2 /  │
                          │  (Drizzle)    │  │ local disk (files)│
                          └───────────────┘  └──────────────────┘
                                      │
                                      ▼
                          Expo Push  ·  Email (SMTP)
```

---

## 3. Data model

PostgreSQL via Drizzle ORM. One identity table feeds two profile tables; events, attendance
and the points "wallet" are separate tables linked by foreign keys.

| Table | Purpose |
|---|---|
| `accounts` | Unified login identity — email + password hash + role (`organizer`/`student`) |
| `organizers` | Club profile (1:1 with an account) |
| `students` | Student profile (1:1 with an account) — college, USN, year, push token |
| `events_catalog` | Published events organizers broadcast and students browse |
| `attendees` | A student's registration to an event (`pending`/`checked-in`/`rejected`/`waitlisted`) |
| `points_ledger` | The wallet — one row per awarded activity; the mobile app sums these |
| `refresh_tokens` | Hashed, rotating refresh tokens for session management |

**Key relationships & guarantees**
- `attendees(event_id, student_id)` is **UNIQUE** → a student can register for an event only once.
- `points_ledger.attendee_id` is **UNIQUE** → a single check-in can award points exactly once.
- All foreign keys cascade on delete, so removing an account cleanly removes its data.

---

## 4. How a typical flow works (check-in → points)

1. **Organizer** creates an event (`POST /events`). It's broadcast to eligible students via Expo Push.
2. **Student** sees it in their feed (`GET /events?college=…`) and registers (`POST /attendees`).
   - If the event is at capacity, they're placed on the **waitlist** instead.
3. At the venue the organizer **checks the student in** — either tapping "Allot Points" in the
   dashboard, or scanning the student's **QR code** with the mobile scanner
   (`POST /attendees/checkin-by-qr`).
4. The API, **inside a single database transaction**:
   - locks the attendee row, flips status to `checked-in`,
   - writes one `points_ledger` row (the award),
   - and — only if this is the first time — fires a push notification.
5. The points appear instantly in the student's wallet (`GET /points`) and count toward their goal.
6. If a checked-in/registered student is later **rejected**, a freed seat **auto-promotes** the
   longest-waiting waitlisted student.

---

## 5. Authentication & security

- **JWT access tokens** (short-lived, ~15 min) + **rotating refresh tokens** (long-lived, hashed
  in the DB with expiry and revocation). Stolen refresh tokens can be revoked; access tokens expire fast.
- Passwords hashed with **bcrypt**.
- **Role-based access** (`requireRole('organizer' | 'student')`) on every protected route, plus
  **ownership checks** (an organizer can only touch their own events/attendees).
- **`helmet`** security headers, configured **CORS** (strict allow-list in production), and a
  **1 MB JSON body limit**.
- **Rate limiting**: a generous global ceiling on every route + a strict limiter on `/auth`
  to blunt brute-force and credential-stuffing.

---

## 6. Robustness — correct under concurrency

The hard part of an attendance/points system is **concurrent writes**: two people tapping
"check in" at once, a double-tapped button, or a popular event filling up as dozens register
simultaneously. Naive code corrupts data here (double points, over-capacity, duplicates).
PointsTrack defends against this at two layers:

**Database constraints (the backstop)**
- `UNIQUE(event_id, student_id)` on attendees → duplicate registrations are impossible.
- `UNIQUE(attendee_id)` on the ledger → a check-in can never create two award rows.

**Transactional logic with row locks (the primary defense)**
- Point award, capacity checks, waitlist promotion, and QR walk-up creation all run inside
  **`db.transaction`** with **`SELECT … FOR UPDATE`** row locks.
- The capacity check locks the **event row**, so concurrent applicants are serialized and the
  seat count can't be over-sold.
- The award locks the **attendee row** and re-checks status inside the lock, so only the first
  check-in awards points.
- Side effects (push notifications, waitlist promotion) run **after** the transaction commits —
  never holding a lock open on slow network I/O.
- Lock ordering is consistent (event row before attendee rows) to avoid deadlocks.

**Proven by tests**
| Scenario | Result |
|---|---|
| 12 simultaneous check-ins of one attendee | **1** ledger row, 50 pts (not 600) |
| 10 simultaneous duplicate applications | **1** attendee row |
| capacity = 1, 6 simultaneous applications | **1** active + **5** waitlisted |

**Error handling** is centralized: Zod validation → 400, typed `HttpError` → its status,
Postgres unique violations → 409, everything else → 500 with a clean message (no stack leaks).

---

## 7. Scalability — built to grow

**Stateless API.** Authentication is a JWT in the request — the server keeps no session state.
That means you can run **N identical API instances behind a load balancer** and scale horizontally.

**Bounded queries.** Every list endpoint (`/events`, `/attendees`, `/points`, …) uses
**capped `limit`/`offset` pagination**. No request can ever ask the database for an unbounded
number of rows, so payloads and memory stay flat as data grows.

**Efficient reads.** Indexes cover every hot lookup (organizer, event, student, college, email,
token hash). Per-event registration counts come from a **single grouped query**, not N queries.

**Database scaling.** The app touches only `DATABASE_URL` — swap in **managed Postgres
(Neon/Supabase)** for instant provisioning, autoscaling, and branching. Connection pooling is
configurable (`DB_POOL_MAX`) with idle/lifetime limits; add pgBouncer/Neon pooling when running
many instances.

**Storage abstraction.** Uploads write to **Cloudflare R2** (or any S3-compatible store) in
production and fall back to local disk in dev — switched by env vars with zero code change.
This is what lets the API run as multiple stateless instances.

**Lean transport.** `compression` (gzip) shrinks responses; pushes are chunked through the Expo SDK.

**Where it goes next (additive, not rewrites):**
- Redis-backed rate-limit store when running multiple instances.
- A background job/queue for very large push broadcasts (50k+ recipients).
- Client-side "load more" UI to page through large attendee lists.

---

## 8. Capacity, honestly

- **As-is — one API instance + managed Postgres:** comfortably a full college,
  low-thousands of users, **correct under bursty check-in load** (the moment most apps break).
- **To 50k+ / multi-college:** add the Redis rate-limit store, the broadcast queue, and R2.
  All additive — roughly a day of work, no architectural changes.

---

## 9. Tech stack summary

- **Backend:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, JWT, bcrypt, Zod,
  helmet, express-rate-limit, compression.
- **Web:** Next.js (App Router), React, Tailwind CSS, Framer Motion.
- **Mobile:** React Native, Expo, NativeWind, React Navigation, expo-camera (QR),
  expo-print (transcript), react-native-view-shot (share cards).
- **Infra:** PostgreSQL, Cloudflare R2, Expo Push, SMTP email.

See **`DEPLOYMENT.md`** for a step-by-step free-hosting guide.
