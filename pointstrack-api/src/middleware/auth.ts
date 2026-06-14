import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db, organizers } from '../db/index.js';
import { verifyAccessToken, type AccessTokenPayload, type Role } from '../lib/jwt.js';
import { unauthorized, forbidden } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

// Requires a valid access token; attaches the decoded payload as req.auth.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing bearer token'));
  }
  const token = header.slice('Bearer '.length);
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

// Restricts a route to one role (organizer / student).
export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (req.auth.role !== role) return next(forbidden(`Requires ${role} role`));
    next();
  };
}

// Every account is a student; some additionally own a club. This guard requires
// the caller to have a club profile (an `organizers` row) — used for actions
// that only make sense for a club, e.g. creating events. Per-resource ownership
// (this is *my* event) is still checked in the handlers.
export async function requireClub(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  const [club] = await db
    .select({ id: organizers.id })
    .from(organizers)
    .where(eq(organizers.id, req.auth.sub));
  if (!club) return next(forbidden('You need a club profile to do this. Create one first.'));
  next();
}
