import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, count, ilike, inArray } from 'drizzle-orm';
import {
  db,
  clubs,
  clubMemberships,
  clubBranding,
  clubSocialLinks,
  clubGallery,
  clubAnnouncements,
  colleges,
  accounts,
  organizers,
  students,
} from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination, setTotalCount } from '../lib/pagination.js';
import { requireAuth, requireClubMember, requirePermission, requireRole } from '../middleware/auth.js';
import { requireIdempotency } from '../middleware/idempotency.js';
import { badRequest, forbidden, notFound, conflict } from '../lib/errors.js';

export const clubsRouter = Router();

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const createClubSchema = z.object({
  name: z.string().min(1),
  collegeId: z.string().uuid().optional(),
  college: z.string().min(1).optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateClubSchema = z.object({
  name: z.string().min(1).optional(),
  collegeId: z.string().uuid().optional(),
  college: z.string().optional(),
  description: z.string().optional(),
});

const adminClubStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'rejected', 'suspended', 'archived']),
});

const brandingSchema = z.object({
  logoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  coverStyle: z.enum(['gradient', 'solid']).optional(),
});

// POST /clubs (Create a club — defaults to pending until approved by admin)
clubsRouter.post(
  '/',
  requireAuth,
  requireIdempotency(),
  asyncHandler(async (req, res) => {
    const data = parseBody(createClubSchema, req);
    const accountId = req.auth!.sub;

    let collegeName = data.college || '';
    let collegeId = data.collegeId ?? null;
    if (collegeId) {
      const [col] = await db.select().from(colleges).where(eq(colleges.id, collegeId));
      if (col) collegeName = col.name;
      else collegeId = null;
    }
    if (!collegeId && collegeName) {
      const [named] = await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.name, collegeName));
      if (named) collegeId = named.id;
    }

    if (!collegeName) {
      throw badRequest('College or collegeId is required');
    }

    // Generate unique slug
    const baseSlug = slugify(data.name);
    const slug = `${baseSlug}-${accountId.slice(0, 6)}`;

    const existingSlug = await db.select().from(clubs).where(eq(clubs.slug, slug));
    if (existingSlug.length > 0) {
      throw conflict('A club with a similar name already exists.');
    }

    const result = await db.transaction(async (tx) => {
      const [club] = await tx
        .insert(clubs)
        .values({
          name: data.name,
          slug,
          collegeId,
          college: collegeName,
          description: data.description,
          createdBy: accountId,
          status: 'pending', // Requires admin activation
        })
        .returning();

      // Create owner membership
      const [membership] = await tx
        .insert(clubMemberships)
        .values({
          accountId,
          clubId: club.id,
          role: 'owner',
          status: 'active',
        })
        .returning();

      // Create branding record
      const [branding] = await tx
        .insert(clubBranding)
        .values({
          clubId: club.id,
          logoUrl: data.logoUrl,
          coverImageUrl: data.coverImageUrl,
          accentColor: data.accentColor || '#06B6D4',
        })
        .returning();

      return { club, membership, branding };
    });

    res.status(201).json(result);
  })
);

// POST /clubs/onboard (First-club onboarding for a logged-in account that has
// none yet — the same bundle POST /auth/register/organizer creates: legacy
// profile + ACTIVE canonical club + owner membership + branding, atomically.
// This is what the admin "Create your club" page must call: creating only the
// legacy row leaves requireClub failing with 403 on event creation.
// Returns 409 if the caller already owns an active club.)
const onboardClubSchema = z.object({
  name: z.string().min(1),
  collegeId: z.string().uuid().optional(),
  college: z.string().min(1).optional(),
  description: z.string().optional(),
  fullName: z.string().optional(),
});

clubsRouter.post(
  '/onboard',
  requireAuth,
  requireIdempotency(),
  asyncHandler(async (req, res) => {
    const data = parseBody(onboardClubSchema, req);
    const accountId = req.auth!.sub;

    const [hasActive] = await db
      .select({ id: clubMemberships.id })
      .from(clubMemberships)
      .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
      .where(
        and(
          eq(clubMemberships.accountId, accountId),
          eq(clubMemberships.status, 'active'),
          eq(clubs.status, 'active')
        )
      );
    if (hasActive) throw conflict('You already have an active club.');

    let collegeName = data.college || '';
    let collegeId = data.collegeId ?? null;
    if (collegeId) {
      const [col] = await db.select().from(colleges).where(eq(colleges.id, collegeId));
      if (col) collegeName = col.name;
      else collegeId = null;
    }
    if (!collegeId && collegeName) {
      const [named] = await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.name, collegeName));
      if (named) collegeId = named.id;
    }
    if (!collegeName) throw badRequest('College or collegeId is required');

    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) throw notFound('Account not found');

    const baseSlug = slugify(data.name);
    const slug = `${baseSlug}-${accountId.slice(0, 6)}`;

    const result = await db.transaction(async (tx) => {
      // Legacy profile: insert or refresh (the create-club form may have
      // already created one via PATCH /profile/organizer).
      const [legacy] = await tx
        .insert(organizers)
        .values({
          id: accountId,
          email: account.email,
          fullName: data.fullName,
          clubName: data.name,
          college: collegeName,
          bio: data.description,
        })
        .onConflictDoUpdate({
          target: organizers.id,
          set: { fullName: data.fullName, clubName: data.name, college: collegeName, bio: data.description },
        })
        .returning();

      const [club] = await tx
        .insert(clubs)
        .values({
          name: data.name,
          slug,
          collegeId,
          college: collegeName,
          description: data.description,
          createdBy: accountId,
          status: 'active',
        })
        .returning();

      const [membership] = await tx
        .insert(clubMemberships)
        .values({ accountId, clubId: club.id, role: 'owner', status: 'active' })
        .returning();

      const [branding] = await tx
        .insert(clubBranding)
        .values({ clubId: club.id, accentColor: '#06B6D4' })
        .returning();

      return { legacy, club, membership, branding };
    });

    res.status(201).json({
      club: result.legacy,
      clubs: [{ ...result.club, branding: result.branding, role: 'owner' }],
      memberships: [result.membership],
    });
  })
);

// GET /clubs (Public feed of active clubs, searchable + paginated)
clubsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, 50, 200);
    const collegeId = (req.query.collegeId as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const filters = [eq(clubs.status, 'active' as any)];
    if (collegeId) filters.push(eq(clubs.collegeId, collegeId));
    if (search) filters.push(ilike(clubs.name, `%${search}%`));
    const where = and(...filters);
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(clubs).where(where).orderBy(desc(clubs.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(clubs).where(where),
    ]);
    setTotalCount(res, total);
    res.json(rows);
  })
);

// GET /clubs/pending (Admin moderation queue — clubs awaiting approval)
clubsRouter.get(
  '/pending',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req, 50, 200);
    const where = eq(clubs.status, 'pending' as any);
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(clubs).where(where).orderBy(desc(clubs.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(clubs).where(where),
    ]);
    setTotalCount(res, total);
    res.json(rows);
  })
);

// PATCH /clubs/:id/status (Admin moderation: approve / reject / suspend)
clubsRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = parseBody(adminClubStatusSchema, req);
    const [updated] = await db
      .update(clubs)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(clubs.id, req.params.id))
      .returning();
    if (!updated) throw notFound('Club not found');
    res.json(updated);
  })
);

// GET /clubs/my-memberships (Get caller's clubs; ?includePending=true adds
// pending verification requests so students can track them)
clubsRouter.get(
  '/my-memberships',
  requireAuth,
  asyncHandler(async (req, res) => {
    const includePending = (req.query.includePending as string) === 'true';
    const rows = await db
      .select({
        membership: clubMemberships,
        club: clubs,
        branding: clubBranding,
      })
      .from(clubMemberships)
      .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
      .leftJoin(clubBranding, eq(clubBranding.clubId, clubs.id))
      .where(
        includePending
          ? and(
              eq(clubMemberships.accountId, req.auth!.sub),
              inArray(clubMemberships.status, ['active', 'pending'])
            )
          : and(
              eq(clubMemberships.accountId, req.auth!.sub),
              eq(clubMemberships.status, 'active')
            )
      );

    res.json(rows);
  })
);

// GET /clubs/:id (Single club details + branding)
clubsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, req.params.id));
    if (!club) throw notFound('Club not found');

    const [branding] = await db.select().from(clubBranding).where(eq(clubBranding.clubId, club.id));
    const socialLinks = await db.select().from(clubSocialLinks).where(eq(clubSocialLinks.clubId, club.id));
    const gallery = await db.select().from(clubGallery).where(eq(clubGallery.clubId, club.id));
    const announcements = await db.select().from(clubAnnouncements).where(eq(clubAnnouncements.clubId, club.id));

    res.json({
      ...club,
      branding: branding ?? null,
      socialLinks,
      gallery,
      announcements,
    });
  })
);

// PATCH /clubs/:id (Update club)
clubsRouter.patch(
  '/:id',
  requireAuth,
  requireClubMember('id'),
  requirePermission('club.update', 'id'),
  asyncHandler(async (req, res) => {
    const data = parseBody(updateClubSchema, req);
    const [updated] = await db
      .update(clubs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clubs.id, req.params.id))
      .returning();

    if (!updated) throw notFound('Club not found');
    res.json(updated);
  })
);

// GET /clubs/:id/members (List club members; ?status=pending shows the
// verification queue for owners/admins)
clubsRouter.get(
  '/:id/members',
  requireAuth,
  requireClubMember('id'),
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || undefined;
    const rows = await db
      .select({
        membershipId: clubMemberships.id,
        accountId: clubMemberships.accountId,
        role: clubMemberships.role,
        status: clubMemberships.status,
        joinedAt: clubMemberships.joinedAt,
        studentName: students.name,
        studentEmail: students.email,
        usn: students.usn,
      })
      .from(clubMemberships)
      .leftJoin(students, eq(students.id, clubMemberships.accountId))
      .where(
        status
          ? and(eq(clubMemberships.clubId, req.params.id), eq(clubMemberships.status, status as any))
          : eq(clubMemberships.clubId, req.params.id)
      )
      .orderBy(clubMemberships.createdAt);

    res.json(rows);
  })
);

// POST /clubs/:id/join (Student requests membership — starts as pending
// until a club owner/admin verifies. Idempotent: re-requesting while pending
// returns the existing request; a rejected/removed user may request again.)
clubsRouter.post(
  '/:id/join',
  requireAuth,
  requireIdempotency(),
  asyncHandler(async (req, res) => {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, req.params.id));
    if (!club) throw notFound('Club not found');
    if (club.status !== 'active') throw forbidden('This club is not accepting members right now');

    const [existing] = await db
      .select()
      .from(clubMemberships)
      .where(
        and(
          eq(clubMemberships.clubId, req.params.id),
          eq(clubMemberships.accountId, req.auth!.sub)
        )
      );

    if (existing) {
      if (existing.status === 'active') throw conflict('You are already a member of this club');
      if (existing.status === 'pending') return res.json(existing);
      // Rejected/removed → back to the verification queue.
      const [reopened] = await db
        .update(clubMemberships)
        .set({ status: 'pending', role: 'member', updatedAt: new Date() })
        .where(eq(clubMemberships.id, existing.id))
        .returning();
      return res.json(reopened);
    }

    const [created] = await db
      .insert(clubMemberships)
      .values({
        clubId: req.params.id,
        accountId: req.auth!.sub,
        role: 'member',
        status: 'pending',
      })
      .returning();
    res.status(201).json(created);
  })
);

const moderateMemberSchema = z.object({
  status: z.enum(['active', 'rejected', 'removed']),
  role: z.enum(['admin', 'event_manager', 'scanner', 'member']).optional(),
});

// PATCH /clubs/:id/members/:membershipId (Owner/admin verifies, rejects, or
// removes a member; optionally sets their role on approval)
clubsRouter.patch(
  '/:id/members/:membershipId',
  requireAuth,
  requireClubMember('id'),
  requirePermission('club.manage_members', 'id'),
  asyncHandler(async (req, res) => {
    const data = parseBody(moderateMemberSchema, req);
    const [existing] = await db
      .select()
      .from(clubMemberships)
      .where(
        and(
          eq(clubMemberships.id, req.params.membershipId),
          eq(clubMemberships.clubId, req.params.id)
        )
      );
    if (!existing) throw notFound('Membership not found');

    // Never strand a club: the last active owner can't be removed/rejected.
    if (existing.role === 'owner' && data.status !== 'active') {
      const owners = await db
        .select({ id: clubMemberships.id })
        .from(clubMemberships)
        .where(
          and(
            eq(clubMemberships.clubId, req.params.id),
            eq(clubMemberships.role, 'owner'),
            eq(clubMemberships.status, 'active')
          )
        );
      if (owners.length <= 1 && owners[0]?.id === existing.id) {
        throw badRequest('Cannot remove the last active owner. Transfer ownership first.');
      }
    }

    const [updated] = await db
      .update(clubMemberships)
      .set({
        status: data.status,
        ...(data.role ? { role: data.role } : {}),
        updatedAt: new Date(),
      })
      .where(eq(clubMemberships.id, existing.id))
      .returning();
    res.json(updated);
  })
);

// DELETE /clubs/:id/members/:membershipId (Leave the club yourself, or be
// removed by someone with manage_members — same last-owner guard)
clubsRouter.delete(
  '/:id/members/:membershipId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select()
      .from(clubMemberships)
      .where(
        and(
          eq(clubMemberships.id, req.params.membershipId),
          eq(clubMemberships.clubId, req.params.id)
        )
      );
    if (!existing) throw notFound('Membership not found');

    const isSelf = existing.accountId === req.auth!.sub;
    if (!isSelf) {
      // Removal by others needs the permission (member check inline to keep
      // the route usable for non-member self-leavers too).
      const [row] = await db
        .select({ role: clubMemberships.role })
        .from(clubMemberships)
        .where(
          and(
            eq(clubMemberships.accountId, req.auth!.sub),
            eq(clubMemberships.clubId, req.params.id),
            eq(clubMemberships.status, 'active')
          )
        );
      const permissions: Record<string, string[]> = {
        owner: ['club.manage_members'],
        admin: ['club.manage_members'],
        event_manager: [],
        scanner: [],
        member: [],
      };
      if (!row || !(permissions[row.role] ?? []).includes('club.manage_members')) {
        throw forbidden('Only club managers can remove other members');
      }
    }

    if (existing.role === 'owner' && existing.status === 'active') {
      const owners = await db
        .select({ id: clubMemberships.id })
        .from(clubMemberships)
        .where(
          and(
            eq(clubMemberships.clubId, req.params.id),
            eq(clubMemberships.role, 'owner'),
            eq(clubMemberships.status, 'active')
          )
        );
      if (owners.length <= 1 && owners[0]?.id === existing.id) {
        throw badRequest('Cannot remove the last active owner. Transfer ownership first.');
      }
    }

    await db.delete(clubMemberships).where(eq(clubMemberships.id, existing.id));
    res.json({ success: true });
  })
);

// POST /clubs/:id/members/invite (Add/invite member)
const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'event_manager', 'scanner', 'member']).default('member'),
});

clubsRouter.post(
  '/:id/members/invite',
  requireAuth,
  requireClubMember('id'),
  requirePermission('club.manage_members', 'id'),
  asyncHandler(async (req, res) => {
    const { email, role } = parseBody(inviteMemberSchema, req);
    // Accounts are stored lowercased — normalize so 'Member@X.edu' resolves.
    const normalizedEmail = email.trim().toLowerCase();
    const [targetAccount] = await db.select().from(accounts).where(eq(accounts.email, normalizedEmail));
    if (!targetAccount) throw notFound('No account found with that email address');

    const [existing] = await db
      .select()
      .from(clubMemberships)
      .where(
        and(
          eq(clubMemberships.clubId, req.params.id),
          eq(clubMemberships.accountId, targetAccount.id)
        )
      );

    if (existing) {
      if (existing.status === 'active') throw conflict('User is already a member of this club');
      // Reactivate
      const [updated] = await db
        .update(clubMemberships)
        .set({ role, status: 'active', updatedAt: new Date() })
        .where(eq(clubMemberships.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(clubMemberships)
      .values({
        clubId: req.params.id,
        accountId: targetAccount.id,
        role,
        status: 'active',
        invitedBy: req.auth!.sub,
      })
      .returning();

    res.status(201).json(created);
  })
);

// PATCH /clubs/:id/branding (Update club branding)
clubsRouter.patch(
  '/:id/branding',
  requireAuth,
  requireClubMember('id'),
  requirePermission('club.manage_branding', 'id'),
  asyncHandler(async (req, res) => {
    const data = parseBody(brandingSchema, req);
    const [existing] = await db
      .select()
      .from(clubBranding)
      .where(eq(clubBranding.clubId, req.params.id));

    if (existing) {
      const [updated] = await db
        .update(clubBranding)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(clubBranding.clubId, req.params.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(clubBranding)
      .values({
        clubId: req.params.id,
        logoUrl: data.logoUrl ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        accentColor: data.accentColor || '#06B6D4',
        secondaryColor: data.secondaryColor ?? null,
        coverStyle: data.coverStyle || 'gradient',
      })
      .returning();

    res.status(201).json(created);
  })
);
