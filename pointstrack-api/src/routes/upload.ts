import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest } from '../lib/errors.js';
import { storeFile } from '../lib/storage.js';

export const uploadRouter = Router();

// In-memory storage; we forward the buffer to R2 or local disk ourselves.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
});

// ---- Single file ----
uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file provided');
    const url = await storeFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'events'
    );
    res.status(201).json({ url });
  })
);

// ---- Multiple files (gallery) ----
uploadRouter.post(
  '/multiple',
  requireAuth,
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) throw badRequest('No files provided');
    const urls = await Promise.all(
      files.map((f) => storeFile(f.buffer, f.originalname, f.mimetype, 'events'))
    );
    res.status(201).json({ urls });
  })
);
