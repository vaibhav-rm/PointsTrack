import type { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, accounts, organizers, clubs, clubMemberships, type ClubRole } from '../db/index.js';
import { verifyAccessToken, type AccessTokenPayload, type Role } from '../lib/jwt.js';
import { unauthorized, forbidden } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
      clubMembership?: {
        clubId: string;
        role: ClubRole;
        status: string;
      };
    }
  }
}

// Fixed role permission map per PRD Section 6.6
const ROLE_PERMISSIONS: Record<ClubRole, string[]> = {
  owner: [
    'club.view',
    'club.update',
    'club.manage_members',
    'club.manage_branding',
    'events.create',
    'events.update',
    'events.publish',
    'events.cancel',
    'events.scan',
    'points.award',
    'points.reverse',
    'analytics.view',
  ],
  admin: [
    'club.view',
    'club.update',
    'club.manage_members',
    'club.manage_branding',
    'events.create',
    'events.update',
    'events.publish',
    'events.cancel',
    'events.scan',
    'points.award',
    'points.reverse',
    'analytics.view',
  ],
  event_manager: [
    'club.view',
    'events.create',
    'events.update',
    'events.publish',
    'events.cancel',
    'events.scan',
    'points.award',
    'analytics.view',
  ],
  scanner: ['club.view', 'events.scan'],
  member: ['club.view'],
};

// Requires a valid access token; attaches the decoded payload as req.auth.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing bearer token'));
  }
  const token = header.slice('Bearer '.length);
  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }

  try {
    const [account] = await db
      .select({ status: accounts.status })
      .from(accounts)
      .where(eq(accounts.id, payload.sub));
    if (!account || account.status === 'suspended') {
      return next(unauthorized('Account is suspended or disabled'));
    }
    req.auth = payload;
    next();
  } catch (err) {
    // Database error passes to Express 500 handler
    next(err);
  }
}

// Restricts a route to one role (organizer / student / admin).
export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (req.auth.role !== role) return next(forbidden(`Requires ${role} role`));
    next();
  };
}

// Guard requiring caller to have an active club profile or active club membership.
export async function requireClub(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());

  // Check V2 club memberships + active club status
  const [membership] = await db
    .select({ membership: clubMemberships, clubStatus: clubs.status })
    .from(clubMemberships)
    .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
    .where(
      and(
        eq(clubMemberships.accountId, req.auth.sub),
        eq(clubMemberships.status, 'active'),
        eq(clubs.status, 'active')
      )
    );
  if (membership) return next();

  // Fallback: check if user created an active club directly
  const [createdClub] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(and(eq(clubs.createdBy, req.auth.sub), eq(clubs.status, 'active')));
  if (createdClub) return next();

  return next(forbidden('You need an active club profile or active club membership to do this.'));
}

// Helper to extract club ID from request (route param, body, or header)
function resolveClubId(req: Request, paramName = 'clubId'): string | null {
  return (
    (req.params[paramName] as string) ||
    (req.params.id as string) ||
    (req.body[paramName] as string) ||
    (req.query[paramName] as string) ||
    (req.headers['x-club-id'] as string) ||
    null
  );
}

// Requires caller to be an active member of the target club.
export function requireClubMember(paramName = 'clubId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    const clubId = resolveClubId(req, paramName);
    if (!clubId) return next(forbidden('Target club ID could not be resolved'));

    const [row] = await db
      .select({ membership: clubMemberships, clubStatus: clubs.status })
      .from(clubMemberships)
      .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
      .where(
        and(
          eq(clubMemberships.accountId, req.auth.sub),
          eq(clubMemberships.clubId, clubId),
          eq(clubMemberships.status, 'active')
        )
      );

    if (!row) {
      return next(forbidden('You are not an active member of this club'));
    }
    if (row.clubStatus !== 'active') {
      return next(forbidden('Target club is suspended or inactive'));
    }

    req.clubMembership = {
      clubId: row.membership.clubId,
      role: row.membership.role as ClubRole,
      status: row.membership.status,
    };
    next();
  };
}

// Requires caller to have a specific role in the target club.
export function requireClubRole(allowedRoles: ClubRole[], paramName = 'clubId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    const clubId = resolveClubId(req, paramName);
    if (!clubId) return next(forbidden('Target club ID could not be resolved'));

    const [row] = await db
      .select({ membership: clubMemberships, clubStatus: clubs.status })
      .from(clubMemberships)
      .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
      .where(
        and(
          eq(clubMemberships.accountId, req.auth.sub),
          eq(clubMemberships.clubId, clubId),
          eq(clubMemberships.status, 'active')
        )
      );

    if (!row || !allowedRoles.includes(row.membership.role as ClubRole)) {
      return next(forbidden(`Requires one of roles: ${allowedRoles.join(', ')}`));
    }
    if (row.clubStatus !== 'active') {
      return next(forbidden('Target club is suspended or inactive'));
    }

    req.clubMembership = {
      clubId: row.membership.clubId,
      role: row.membership.role as ClubRole,
      status: row.membership.status,
    };
    next();
  };
}

// Requires caller to have a specific permission in the target club.
export function requirePermission(permission: string, paramName = 'clubId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    const clubId = resolveClubId(req, paramName);
    if (!clubId) return next(forbidden('Target club ID could not be resolved'));

    const [row] = await db
      .select({ membership: clubMemberships, clubStatus: clubs.status })
      .from(clubMemberships)
      .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
      .where(
        and(
          eq(clubMemberships.accountId, req.auth.sub),
          eq(clubMemberships.clubId, clubId),
          eq(clubMemberships.status, 'active')
        )
      );

    if (!row) {
      return next(forbidden('You are not an active member of this club'));
    }
    if (row.clubStatus !== 'active') {
      return next(forbidden('Target club is suspended or inactive'));
    }

    const role = row.membership.role as ClubRole;
    const permissions = ROLE_PERMISSIONS[role] || [];
    if (!permissions.includes(permission)) {
      return next(forbidden(`Insufficient permission: ${permission}`));
    }

    req.clubMembership = {
      clubId: row.membership.clubId,
      role,
      status: row.membership.status,
    };
    next();
  };
}
