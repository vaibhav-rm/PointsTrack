import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, useR2 } from './config/env.js';
import { LOCAL_UPLOAD_DIR } from './lib/storage.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { eventsRouter } from './routes/events.js';
import { attendeesRouter } from './routes/attendees.js';
import { profileRouter } from './routes/profile.js';
import { pointsRouter } from './routes/points.js';
import { uploadRouter } from './routes/upload.js';

const app = express();

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

// Serve locally-stored uploads when R2 isn't configured.
// Everything lives under /uploads/<prefix>/<file> so it can't collide with API routes.
if (!useR2) {
  app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', storage: useR2 ? 'r2' : 'local', time: new Date().toISOString() });
});

app.use('/auth', authRouter);
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
