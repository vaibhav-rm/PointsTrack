# PointsTrack — Free Hosting & Deployment Guide

A zero-cost stack to get PointsTrack live for a pilot. Everything below has a genuine free
tier (no credit card required for most), and the app is built to run on it with only env-var changes.

---

## Recommended free stack

| Piece | Service | Free tier | Why |
|---|---|---|---|
| **Database** | **[Neon](https://neon.tech)** | ~0.5 GB storage, scale-to-zero, branching | Best free serverless Postgres; just a connection string |
| **API** (`pointstrack-api`) | **[Render](https://render.com)** Web Service | 750 hrs/mo, sleeps after 15 min idle | Simplest Node deploy; Docker not required |
| **Web admin** (`pointstrack-admin`) | **[Vercel](https://vercel.com)** Hobby | Generous bandwidth/builds | Built for Next.js — near-zero config |
| **File uploads** | **Supabase Storage** (no card) or **Cloudflare R2** (needs card) | 1 GB / 10 GB | Any S3-compatible store — set env vars, no code change |
| **Push notifications** | **Expo Push** | Free | Already wired in |
| **Email** (password reset) | **Gmail SMTP** or **[Brevo](https://www.brevo.com)** | Free, no domain needed | See `product-direction`: free + no domain |
| **Mobile distribution** | **Expo / EAS** | Expo Go + limited free builds | Android APK is free; iOS needs Apple Dev ($99/yr) |

**Alternatives:** Supabase (Postgres **and** storage in one free project) · Fly.io or Koyeb (API, always-on free allowance) · Netlify (instead of Vercel).

---

## Step by step

### 1. Database — Neon
1. Create a Neon project → copy the connection string (looks like
   `postgres://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require`).
2. You'll paste it into the API's `DATABASE_URL`.

### 2. File storage — pick any S3-compatible provider
The API speaks the **S3 protocol**, so any of these work by setting env vars — no code change.
Leave them all blank and uploads fall back to local disk (fine for a demo, but files reset on
redeploy/restart, so use a real bucket for anything lasting).

**Cloudflare R2** (10 GB free, but **requires a card** to enable):
```
R2_ACCOUNT_ID=...   R2_ACCESS_KEY_ID=...   R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...       R2_PUBLIC_URL=https://<your-r2-public-url>
```

**Supabase Storage** (1 GB free, **no card** — recommended if R2 won't take your card):
1. In your Supabase project: create a public **Storage bucket**, then create **S3 access keys**
   (Project Settings → Storage → S3 connection).
2. Set:
   ```
   S3_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
   S3_REGION=<your project region, e.g. ap-south-1>
   R2_ACCESS_KEY_ID=<S3 access key>
   R2_SECRET_ACCESS_KEY=<S3 secret>
   R2_BUCKET=<your bucket name>
   R2_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>
   ```

**Backblaze B2** (10 GB free, S3-compatible): same shape — set `S3_ENDPOINT` to the B2 S3
endpoint (e.g. `https://s3.us-west-004.backblazeb2.com`), `S3_REGION` to the region, and a
public bucket for `R2_PUBLIC_URL`.

### 3. API — Render
1. New → **Web Service** → connect the repo → root directory `pointstrack-api`.
2. **Build command:** `npm install && npm run build`
   **Start command:** `npm run db:migrate && npm start`
3. Set environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<your Neon string>
   JWT_ACCESS_SECRET=<openssl rand -hex 32>
   JWT_REFRESH_SECRET=<openssl rand -hex 32>
   API_URL=https://<your-service>.onrender.com
   CORS_ORIGINS=https://<your-vercel-app>.vercel.app
   # R2_* and SMTP_* as needed
   ```
4. Deploy. Health check: `https://<your-service>.onrender.com/health`.

### 4. Web admin — Vercel
1. New Project → import the repo → root directory `pointstrack-admin`.
2. Environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://<your-render-api>.onrender.com
   ```
3. Deploy. Vercel auto-detects Next.js.

### 5. Mobile — Expo
1. In `PointsTrack/.env` (or EAS secrets): `EXPO_PUBLIC_API_URL=https://<your-render-api>.onrender.com`.
2. **Testing:** `npx expo start` → scan with Expo Go.
3. **Share an installable build:** `eas build -p android --profile preview` → free EAS build → download/share the APK.
4. iOS App Store / TestFlight requires an Apple Developer account ($99/yr); Android Play Store is a one-time $25.

### 6. Email (when you wire up password reset)
- **Gmail SMTP:** enable 2FA on the Google account → create an **App Password** → set
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<you>@gmail.com`, `SMTP_PASS=<app password>`,
  `EMAIL_FROM=<you>@gmail.com`. Free, no domain, ~500 emails/day.
- **Brevo:** verify a single sender email (no domain), use their SMTP creds. 300 emails/day free.

---

## Honest caveats of the free tier

- **Cold starts.** Render free **sleeps after ~15 min** of inactivity, and Neon free **scales to
  zero** — so the first request after idle can take ~30–60 s. Perfectly fine for a pilot/demo; for
  an always-on feel you'd upgrade the API to a cheap paid instance later (or ping `/health` every
  ~10 min with a free scheduler like [cron-job.org] — note this mostly defers, not eliminates, sleep).
- **Rate-limit store is in-memory** — correct for one instance. Multiple instances need a Redis store.
- **Large push broadcasts run inline** — fine for a college; add a queue for 50k+ recipients.
- Free DB storage/compute and Vercel bandwidth have monthly caps — comfortable for a single-college pilot.

---

## Production hardening checklist (when you outgrow free)

- [ ] Set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (`openssl rand -hex 32`).
- [ ] `CORS_ORIGINS` = your real admin URL only.
- [ ] Switch uploads to R2 (`R2_*` set).
- [ ] Move to an always-on API instance (no cold starts).
- [ ] Add a Redis-backed rate-limit store if running >1 API instance.
- [ ] Add a background queue for push broadcasts.
- [ ] Point a custom domain at Vercel (admin) and Render (API).
