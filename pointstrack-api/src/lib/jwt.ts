import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Every account is a student; some also own a club. Role stays 'student' for all
// accounts now — club ownership (an `organizers` row) is what grants organizer
// powers, checked per-resource rather than by role.
export type Role = 'organizer' | 'student';

export interface AccessTokenPayload {
  sub: string; // account id
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

// Refresh tokens are opaque random strings. We store only a SHA-256 hash in the
// DB so a database leak can't be replayed as valid tokens.
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.jwt.refreshTtlDays);
  return d;
}
