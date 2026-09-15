import { Router } from 'express';
import { eq, or, ilike, and } from 'drizzle-orm';
import { db, colleges } from '../db/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { notFound } from '../lib/errors.js';

export const collegesRouter = Router();

// GET /colleges?search=RVCE&region=Bangalore
collegesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = (req.query.search as string) || '';
    const region = (req.query.region as string) || '';

    const conditions = [];
    if (region) {
      conditions.push(eq(colleges.region, region));
    }
    if (search) {
      conditions.push(
        or(
          ilike(colleges.name, `%${search}%`),
          ilike(colleges.shortName, `%${search}%`),
          ilike(colleges.vtuCode, `%${search}%`)
        )
      );
    }

    const rows = await db
      .select()
      .from(colleges)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(colleges.name);

    res.json(rows);
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
