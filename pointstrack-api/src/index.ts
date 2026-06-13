import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, useR2 } from './config/env.js';
import { LOCAL_UPLOAD_DIR, getFileStream } from './lib/storage.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { eventsRouter } from './routes/events.js';
import { attendeesRouter } from './routes/attendees.js';
import { profileRouter } from './routes/profile.js';
import { pointsRouter } from './routes/points.js';
import { uploadRouter } from './routes/upload.js';

const app = express();

// Behind a load balancer / reverse proxy in production, so rate-limit & logging
// see the real client IP rather than the proxy's.
app.set('trust proxy', 1);

app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin (mobile apps, curl) and any configured web origin.
      // In development, also allow any localhost/127.0.0.1 port so the admin
      // dev server works even when Next picks a non-default port (3001, etc.).
      const isLocalhost =
        !!origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (
        !origin ||
        env.corsOrigins.includes(origin) ||
        env.corsOrigins.includes('*') ||
        (!env.isProd && isLocalhost)
      ) {
        return cb(null, true);
      }
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// Rate limiting. A generous global ceiling protects every route from abuse,
// and a strict limiter on /auth blunts brute-force / credential-stuffing.
// (In-memory store is per-instance; swap in a Redis store when running >1 node.)
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: env.isProd ? 300 : 100_000,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: env.isProd ? 50 : 100_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});
app.use(globalLimiter);

// Serve locally-stored uploads when object storage isn't configured.
// Everything lives under /uploads/<prefix>/<file> so it can't collide with API routes.
if (!useR2) {
  app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));
}

// Object-storage proxy: streams assets from a (possibly private) bucket so they
// stay public-readable without needing a public bucket / CDN. Long-cached since
// stored keys are immutable (UUID filenames).
if (useR2) {
  app.get('/files/*', async (req, res) => {
    const key = (req.params as unknown as string[])[0];
    if (!key) return res.status(400).json({ error: 'Missing file key' });
    try {
      const file = await getFileStream(key);
      if (!file) return res.status(404).json({ error: 'Not found' });
      if (file.contentType) res.setHeader('Content-Type', file.contentType);
      if (file.contentLength) res.setHeader('Content-Length', String(file.contentLength));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      file.body.on('error', () => res.destroy());
      file.body.pipe(res);
    } catch {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', storage: useR2 ? 'r2' : 'local', time: new Date().toISOString() });
});

app.use('/auth', authLimiter, authRouter);
app.use('/events', eventsRouter);
app.use('/attendees', attendeesRouter);
app.use('/profile', profileRouter);
app.use('/points', pointsRouter);
app.use('/upload', uploadRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 pointstrack-api listening on ${env.apiUrl} (port ${env.port})`);
  console.log(`   storage: ${useR2 ? 'Cloudflare R2' : 'local disk (./uploads)'}`);
});
