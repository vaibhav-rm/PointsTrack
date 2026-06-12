import type { Request, Response, NextFunction } from 'express';
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
