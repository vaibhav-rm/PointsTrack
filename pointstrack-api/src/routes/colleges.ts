import { Router } from 'express';
import { z } from 'zod';
import { eq, or, ilike, and, count } from 'drizzle-orm';
import { db, colleges } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { parseBody } from '../lib/validate.js';
import { parsePagination, setTotalCount } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { notFound, conflict } from '../lib/errors.js';

export const collegesRouter = Router();

// GET /colleges?search=RVCE&region=Bangalore (public directory, paginated)
collegesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = (req.query.search as string) || '';
    const region = (req.query.region as string) || '';
    const { limit, offset } = parsePagination(req, 100, 500);

    const conditions = [];
    if (region) {
      conditions.push(eq(colleges.region, region));
    }
    if (search) {
      const like = or(
        ilike(colleges.name, `%${search}%`),
        ilike(colleges.shortName, `%${search}%`),
        ilike(colleges.vtuCode, `%${search}%`)
      );
      if (like) conditions.push(like);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(colleges).where(where).orderBy(colleges.name).limit(limit).offset(offset),
      db.select({ total: count() }).from(colleges).where(where),
    ]);
    setTotalCount(res, total);
    res.json(rows);
  })
);

// POST /colleges (admin: add a college to the directory so registrations can
// resolve a canonical collegeId instead of drifting into free-text names)
const createCollegeSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional(),
  vtuCode: z.string().optional(),
  region: z.string().optional(),
});

collegesRouter.post(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = parseBody(createCollegeSchema, req);
    const [existing] = await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.name, data.name));
    if (existing) throw conflict('A college with this name already exists.');
    const [row] = await db.insert(colleges).values(data).returning();
    res.status(201).json(row);
  })
);

// PATCH /colleges/:id (admin: rename / activate / deactivate)
const updateCollegeSchema = z.object({
  name: z.string().min(1).optional(),
  shortName: z.string().nullable().optional(),
  vtuCode: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

collegesRouter.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = parseBody(updateCollegeSchema, req);
    const [updated] = await db
      .update(colleges)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(colleges.id, req.params.id))
      .returning();
    if (!updated) throw notFound('College not found');
    res.json(updated);
  })
);

// GET /colleges/:id (by UUID or vtuCode)
collegesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [college] = await db
      .select()
      .from(colleges)
      .where(or(eq(colleges.id, id), eq(colleges.vtuCode, id.toUpperCase())));

    if (!college) throw notFound('College not found');
    res.json(college);
  })
);
