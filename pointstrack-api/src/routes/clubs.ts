import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
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
  students,
} from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { requireAuth, requireClubMember, requirePermission } from '../middleware/auth.js';
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
  asyncHandler(async (req, res) => {
    const data = parseBody(createClubSchema, req);
    const accountId = req.auth!.sub;

    let collegeName = data.college || '';
    if (data.collegeId) {
      const [col] = await db.select().from(colleges).where(eq(colleges.id, data.collegeId));
      if (col) collegeName = col.name;
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
          collegeId: data.collegeId ?? null,
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

// GET /clubs (Public feed of active clubs)
clubsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const collegeId = (req.query.collegeId as string) || undefined;
    const rows = await db
      .select()
      .from(clubs)
      .where(and(eq(clubs.status, 'active'), collegeId ? eq(clubs.collegeId, collegeId) : undefined))
      .orderBy(desc(clubs.createdAt));

    res.json(rows);
  })
);

// GET /clubs/my-memberships (Get caller's clubs)
clubsRouter.get(
  '/my-memberships',
  requireAuth,
  asyncHandler(async (req, res) => {
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
        and(
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

// GET /clubs/:id/members (List club members)
clubsRouter.get(
  '/:id/members',
  requireAuth,
  requireClubMember('id'),
  asyncHandler(async (req, res) => {
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
      .where(eq(clubMemberships.clubId, req.params.id))
      .orderBy(clubMemberships.createdAt);

    res.json(rows);
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
    const [targetAccount] = await db.select().from(accounts).where(eq(accounts.email, email));
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
