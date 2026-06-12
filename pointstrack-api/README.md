# PointsTrack API

Custom backend for PointsTrack — replaces Firebase (Auth + Firestore + Storage).

**Stack:** Express + TypeScript · PostgreSQL + Drizzle ORM · JWT (access + rotating refresh) · Cloudflare R2 (with local-disk fallback) · Expo push notifications.

## Quick start (local)

```bash
cp .env.example .env        # defaults work for local docker postgres
npm install
npm run db:up               # start postgres in docker
npm run db:migrate          # apply migrations
npm run db:seed             # (optional) load demo data + print login credentials
npm run dev                 # http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start API with hot reload (tsx watch) |
| `npm run db:up` / `db:down` | Start/stop local Postgres (Docker) |
| `npm run db:generate` | Generate a new SQL migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Load demo data (1 organizer, 2 students, 3 events) — idempotent |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` / `start` | Compile to `dist/` and run |

## Data model

| Table | Replaces (Firestore) | Notes |
|---|---|---|
| `accounts` | Firebase Auth | email + password hash + role |
| `organizers` | `organizers` | 1:1 with an account (role=organizer) |
| `students` | `users` | 1:1 with an account (role=student) |
| `events_catalog` | `upcoming_events` | published event listings |
| `attendees` | `attendees` | student registrations to events |
| `points_ledger` | `events` | per-student awarded-points records (the wallet) |
| `refresh_tokens` | — | hashed, rotating refresh tokens |

## API surface

**Auth** (`/auth`)
- `POST /register/organizer` · `POST /register/student`
- `POST /login` · `POST /refresh` · `POST /logout`
- `GET /me` · `DELETE /me`

**Events** (`/events`, auth required)
- `GET /?college=NAME` — student feed (their college + open-to-all)
- `GET /mine` — organizer's own events
- `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` (organizer, owner-only for writes)

**Attendees** (`/attendees`)
- `POST /` (student applies) · `GET /check?eventId=` (student)
- `GET /` (organizer lists own) · `PATCH /:id` (organizer approve/reject → awards points)

**Profile** (`/profile`)
- `PATCH /organizer` · `GET /organizer/:id`
- `PATCH /student` · `PUT /student/push-token`

**Points** (`/points`)
- `GET /` — current student's ledger (student)

**Upload** (`/upload`)
- `POST /` (single) · `POST /multiple` (gallery) — returns `{ url }` / `{ urls }`

## Storage

With `R2_*` env vars unset, uploads go to `./uploads` and are served at `/uploads/...`.
Set the `R2_*` vars (Cloudflare R2 or any S3-compatible store) to switch — no code changes.

## Database

The app runs on **PostgreSQL** (via Drizzle ORM). The only thing that changes
between environments is `DATABASE_URL` — the code never does.

**Local:** `npm run db:up` starts the Docker Postgres in `docker-compose.yml`
and the default `DATABASE_URL` in `.env` already points at it.

**Recommended for production: [Neon](https://neon.tech)** — serverless Postgres
with a generous free tier, instant provisioning, branching, and scale-to-zero.
It's the lowest-friction managed Postgres for this kind of app. (Supabase or
Railway Postgres work identically — anything that gives you a connection string.)

To link a hosted database, just swap the one line:

```bash
# .env
DATABASE_URL=postgres://USER:PASSWORD@HOST/DB?sslmode=require   # e.g. from Neon
```

Then apply the schema and you're live:

```bash
npm run db:migrate
```

## Deploying to Railway

1. Create a Railway project, add the **PostgreSQL** plugin → it injects `DATABASE_URL`
   (or point it at your Neon URL).
2. Deploy this folder as a service. Set env vars: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
   (`openssl rand -hex 32`), `API_URL` (the service's public URL), `CORS_ORIGINS`
   (your web admin URL), and the `R2_*` vars.
3. Set the start command to run migrations then boot: `npm run db:migrate && npm start`.
