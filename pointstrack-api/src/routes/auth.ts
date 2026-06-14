import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db, accounts, organizers, students, refreshTokens } from '../db/index.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiry,
} from '../lib/jwt.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { unauthorized, notFound } from '../lib/errors.js';

export const authRouter = Router();

const organizerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  clubName: z.string().min(1),
  college: z.string().min(1),
  bio: z.string().optional(),
  establishedDate: z.string().optional(),
  coreTeam: z.string().optional(),
});

const studentRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
  college: z.string().min(1),
  collegeCode: z.string().optional(),
  region: z.string().optional(),
  usn: z.string().min(1),
  year: z.coerce.number().int().min(1).default(1),
  semester: z.coerce.number().int().min(1).default(1),
  lateralEntry: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Issues an access token + persists a hashed refresh token, returning both.
async function issueTokens(account: { id: string; email: string; role: 'organizer' | 'student' }) {
  const accessToken = signAccessToken({
    sub: account.id,
    role: account.role,
    email: account.email,
  });
  const { token: refreshToken, hash } = generateRefreshToken();
  await db.insert(refreshTokens).values({
    accountId: account.id,
    tokenHash: hash,
    expiresAt: refreshExpiry(),
  });
  return { accessToken, refreshToken };
}

// ---- Register: organizer ----
// Every account is a student; an organizer is a student who also owns a club.
// So this creates BOTH a student profile and a club, sharing one account id.
authRouter.post(
  '/register/organizer',
  asyncHandler(async (req, res) => {
    const data = parseBody(organizerRegisterSchema, req);
    const passwordHash = await hashPassword(data.password);

    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({ email: data.email, passwordHash, role: 'student' })
        .returning();
      // Student profile (synthesised where the club form doesn't ask). The
      // organizer can complete these fields later in the app/settings.
      const [student] = await tx
        .insert(students)
        .values({
          id: account.id,
          name: data.fullName || data.clubName,
          email: data.email,
          college: data.college,
          usn: `ORG-${account.id.slice(0, 8)}`,
          requiredPoints: 100,
        })
        .returning();
      const [club] = await tx
        .insert(organizers)
        .values({
          id: account.id,
          email: data.email,
          fullName: data.fullName,
          clubName: data.clubName,
          college: data.college,
          bio: data.bio,
          establishedDate: data.establishedDate,
          coreTeam: data.coreTeam,
        })
        .returning();
      return { account, student, club };
    });

    const tokens = await issueTokens(result.account);
    res.status(201).json({
      ...tokens,
      user: { id: result.account.id, email: result.account.email, role: 'student' },
      profile: result.student,
      club: result.club,
    });
  })
);

// ---- Register: student ----
authRouter.post(
  '/register/student',
  asyncHandler(async (req, res) => {
    const data = parseBody(studentRegisterSchema, req);
    const passwordHash = await hashPassword(data.password);
    const requiredPoints = data.lateralEntry ? 80 : 100;

    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({ email: data.email, passwordHash, role: 'student' })
        .returning();
      const [profile] = await tx
        .insert(students)
        .values({
          id: account.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          college: data.college,
          collegeCode: data.collegeCode,
          region: data.region,
          usn: data.usn,
          year: data.year,
          semester: data.semester,
          lateralEntry: data.lateralEntry,
          requiredPoints,
        })
        .returning();
      return { account, profile };
    });

    const tokens = await issueTokens(result.account);
    res.status(201).json({
      ...tokens,
      user: { id: result.account.id, email: result.account.email, role: 'student' },
      profile: result.profile,
    });
  })
);

// ---- Login (works for both roles) ----
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = parseBody(loginSchema, req);
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, data.email));
    if (!account) throw unauthorized('Invalid email or password');

    const ok = await verifyPassword(data.password, account.passwordHash);
    if (!ok) throw unauthorized('Invalid email or password');

    // Everyone is a student; some also own a club. Return both.
    const [profile] = await db.select().from(students).where(eq(students.id, account.id));
    const [club] = await db.select().from(organizers).where(eq(organizers.id, account.id));

    const tokens = await issueTokens(account);
    res.json({
      ...tokens,
      user: { id: account.id, email: account.email, role: account.role },
      profile,
      club: club ?? null,
    });
  })
);

// ---- Forgot password ----
// Always returns success so callers can't probe which emails exist. Actually
// delivering the reset link requires wiring up an email provider (SMTP/Resend/
// SES); until then this is a no-op that keeps the client flow intact.
const forgotSchema = z.object({ email: z.string().email() });

authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = parseBody(forgotSchema, req);
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    if (account) {
      // TODO: generate a single-use reset token and email it to the user.
      console.log(`[forgot-password] reset requested for ${email} (no email provider configured)`);
    }
    res.json({ success: true });
  })
);

// ---- Refresh (rotates the refresh token) ----
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = parseBody(refreshSchema, req);
    const tokenHash = hashToken(refreshToken);

    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date())
        )
      );
    if (!row) throw unauthorized('Invalid refresh token');

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, row.accountId));
    if (!account) throw unauthorized('Account not found');

    // Rotate: revoke the used token, issue a fresh pair.
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, row.id));

    const tokens = await issueTokens(account);
    res.json(tokens);
  })
);

// ---- Logout (revoke a refresh token) ----
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = parseBody(refreshSchema, req);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
    res.json({ success: true });
  })
);

// ---- Current user + profile ----
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sub, role, email } = req.auth!;
    const [profile] = await db.select().from(students).where(eq(students.id, sub));
    const [club] = await db.select().from(organizers).where(eq(organizers.id, sub));
    if (!profile && !club) throw notFound('Profile not found');
    res.json({ user: { id: sub, email, role }, profile: profile ?? null, club: club ?? null });
  })
);

// ---- Delete own account (student "delete account" flow) ----
authRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Cascades to profile + related rows via FK onDelete.
    await db.delete(accounts).where(eq(accounts.id, req.auth!.sub));
    res.json({ success: true });
  })
);
