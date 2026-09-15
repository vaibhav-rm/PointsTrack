import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull, gt } from 'drizzle-orm';
import {
  db,
  accounts,
  organizers,
  students,
  clubs,
  clubMemberships,
  clubBranding,
  colleges,
  academicPolicies,
  studentAcademicRecords,
  refreshTokens,
} from '../db/index.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiry,
} from '../lib/jwt.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { unauthorized, notFound, conflict } from '../lib/errors.js';

export const authRouter = Router();

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const organizerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  clubName: z.string().min(1),
  college: z.string().min(1),
  collegeId: z.string().uuid().optional(),
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
  collegeId: z.string().uuid().optional(),
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

// Helper to fetch user's active club memberships + details
async function fetchUserClubs(accountId: string) {
  const userMemberships = await db
    .select({
      membership: clubMemberships,
      club: clubs,
      branding: clubBranding,
    })
    .from(clubMemberships)
    .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
    .leftJoin(clubBranding, eq(clubBranding.clubId, clubs.id))
    .where(
      and(
        eq(clubMemberships.accountId, accountId),
        eq(clubMemberships.status, 'active')
      )
    );

  return userMemberships;
}

// ---- Register: organizer ----
authRouter.post(
  '/register/organizer',
  asyncHandler(async (req, res) => {
    const data = parseBody(organizerRegisterSchema, req);

    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, data.email.toLowerCase()));
    if (existingAccount) throw conflict('An account with this email already exists.');

    const passwordHash = await hashPassword(data.password);

    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({
          email: data.email.toLowerCase(),
          passwordHash,
          role: 'organizer',
          status: 'active',
        })
        .returning();

      // Legacy organizer profile
      const [legacyOrganizer] = await tx
        .insert(organizers)
        .values({
          id: account.id,
          email: data.email.toLowerCase(),
          fullName: data.fullName,
          clubName: data.clubName,
          college: data.college,
          bio: data.bio,
          establishedDate: data.establishedDate,
          coreTeam: data.coreTeam,
        })
        .returning();

      // Canonical V2 Club
      const baseSlug = slugify(data.clubName);
      const slug = `${baseSlug}-${account.id.slice(0, 6)}`;

      const [newClub] = await tx
        .insert(clubs)
        .values({
          name: data.clubName,
          slug,
          collegeId: data.collegeId ?? null,
          college: data.college,
          description: data.bio,
          createdBy: account.id,
          status: 'active',
        })
        .returning();

      // Owner membership
      const [membership] = await tx
        .insert(clubMemberships)
        .values({
          accountId: account.id,
          clubId: newClub.id,
          role: 'owner',
          status: 'active',
        })
        .returning();

      // Branding
      const [branding] = await tx
        .insert(clubBranding)
        .values({
          clubId: newClub.id,
          accentColor: '#06B6D4',
        })
        .returning();

      return { account, legacyOrganizer, newClub, membership, branding };
    });

    const tokens = await issueTokens(result.account);
    res.status(201).json({
      ...tokens,
      user: { id: result.account.id, email: result.account.email, role: 'organizer' },
      profile: null, // No fake student profile generated
      club: result.legacyOrganizer,
      clubs: [{ ...result.newClub, branding: result.branding, role: 'owner' }],
      memberships: [result.membership],
    });
  })
);

// ---- Register: student ----
authRouter.post(
  '/register/student',
  asyncHandler(async (req, res) => {
    const data = parseBody(studentRegisterSchema, req);

    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, data.email.toLowerCase()));
    if (existingAccount) throw conflict('An account with this email already exists.');

    const passwordHash = await hashPassword(data.password);
    const requiredPoints = data.lateralEntry ? 80 : 100;
    const normalizedUsn = data.usn.trim().toUpperCase();

    // Verify college or match from colleges table if collegeId provided
    let collegeId = data.collegeId;
    if (!collegeId && data.collegeCode) {
      const [matchedCollege] = await db
        .select()
        .from(colleges)
        .where(eq(colleges.vtuCode, data.collegeCode.toUpperCase()));
      if (matchedCollege) collegeId = matchedCollege.id;
    }

    // Resolve active academic policy
    const policyType = data.lateralEntry ? 'lateral' : 'standard';
    const [policy] = await db
      .select()
      .from(academicPolicies)
      .where(and(eq(academicPolicies.entryType, policyType), eq(academicPolicies.isActive, true)));

    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({
          email: data.email.toLowerCase(),
          passwordHash,
          role: 'student',
          status: 'active',
        })
        .returning();

      const [profile] = await tx
        .insert(students)
        .values({
          id: account.id,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          collegeId: collegeId ?? null,
          college: data.college,
          collegeCode: data.collegeCode,
          region: data.region,
          usn: normalizedUsn,
          year: data.year,
          semester: data.semester,
          lateralEntry: data.lateralEntry,
          requiredPoints,
        })
        .returning();

      // Create academic record snapshot
      await tx.insert(studentAcademicRecords).values({
        studentId: profile.id,
        policyId: policy?.id ?? null,
        year: data.year,
        semester: data.semester,
        requiredPointsSnapshot: requiredPoints,
      });

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

// ---- Login (works for all roles) ----
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = parseBody(loginSchema, req);
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, data.email.toLowerCase()));
    if (!account) throw unauthorized('Invalid email or password');

    const ok = await verifyPassword(data.password, account.passwordHash);
    if (!ok) throw unauthorized('Invalid email or password');

    const [profile] = await db.select().from(students).where(eq(students.id, account.id));
    const [legacyClub] = await db.select().from(organizers).where(eq(organizers.id, account.id));
    const userClubs = await fetchUserClubs(account.id);

    const tokens = await issueTokens(account);
    res.json({
      ...tokens,
      user: { id: account.id, email: account.email, role: account.role },
      profile: profile ?? null,
      club: legacyClub ?? (userClubs.length > 0 ? {
        id: userClubs[0].club.id,
        email: account.email,
        clubName: userClubs[0].club.name,
        college: userClubs[0].club.college || '',
        accentColor: userClubs[0].branding?.accentColor || null,
        logo: userClubs[0].branding?.logoUrl || null,
      } as any : null),
      clubs: userClubs.map((uc) => ({
        ...uc.club,
        branding: uc.branding,
        role: uc.membership.role,
      })),
      memberships: userClubs.map((uc) => uc.membership),
    });
  })
);

// ---- Forgot password ----
const forgotSchema = z.object({ email: z.string().email() });

authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = parseBody(forgotSchema, req);
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email.toLowerCase()));
    if (account) {
      console.log(`[forgot-password] reset requested for ${email}`);
    }
    res.json({ success: true });
  })
);

// ---- Refresh ----
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
    if (!account || account.status === 'suspended') throw unauthorized('Account is suspended or disabled');

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, row.id));

    const tokens = await issueTokens(account);
    res.json(tokens);
  })
);

// ---- Logout ----
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

// ---- Current user + profiles + memberships ----
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sub, role, email } = req.auth!;
    const [profile] = await db.select().from(students).where(eq(students.id, sub));
    const [legacyClub] = await db.select().from(organizers).where(eq(organizers.id, sub));
    const userClubs = await fetchUserClubs(sub);

    if (!profile && !legacyClub && userClubs.length === 0) {
      // User logged in but has neither student nor club profile yet
      return res.json({
        user: { id: sub, email, role },
        profile: null,
        club: null,
        clubs: [],
        memberships: [],
      });
    }

    res.json({
      user: { id: sub, email, role },
      profile: profile ?? null,
      club: legacyClub ?? (userClubs.length > 0 ? {
        id: userClubs[0].club.id,
        email,
        clubName: userClubs[0].club.name,
        college: userClubs[0].club.college || '',
        accentColor: userClubs[0].branding?.accentColor || null,
        logo: userClubs[0].branding?.logoUrl || null,
      } as any : null),
      clubs: userClubs.map((uc) => ({
        ...uc.club,
        branding: uc.branding,
        role: uc.membership.role,
      })),
      memberships: userClubs.map((uc) => uc.membership),
    });
  })
);

// ---- Delete account ----
authRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    await db.delete(accounts).where(eq(accounts.id, req.auth!.sub));
    res.json({ success: true });
  })
);

// ---- Admin system status (Admin role guard test) ----
authRouter.get(
  '/admin/system-status',
  requireAuth,
  requireRole('admin' as any),
  asyncHandler(async (_req, res) => {
    res.json({ status: 'ok', environment: 'production-canary' });
  })
);
