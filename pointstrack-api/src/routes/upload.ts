import { Router } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { asyncHandler } from '../lib/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest } from '../lib/errors.js';
import { storeFile } from '../lib/storage.js';

export const uploadRouter = Router();

// Uploads are event artwork/certificates: images only. The filter rejects
// executables/archives before they touch disk or object storage.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Disk-backed temp storage + streaming upload: the file is never held twice
// in RAM (once by multer, once by the uploader), so concurrent 8MB uploads
// can't spike the Node heap. Temp files are always unlinked after store.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) =>
      cb(null, `pt-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(badRequest('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
  },
});

async function storeTempFile(
  file: Express.Multer.File,
  prefix = 'events'
): Promise<string> {
  const stream = fs.createReadStream(file.path);
  try {
    return await storeFile(stream, file.originalname, file.mimetype, prefix);
  } finally {
    stream.destroy();
    fs.promises.unlink(file.path).catch(() => {});
  }
}

// ---- Single file ----
uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file provided');
    const url = await storeTempFile(req.file);
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
    // Sequential streaming keeps peak memory flat; 10 files max so latency
    // stays within a normal request budget.
    const urls: string[] = [];
    for (const f of files) urls.push(await storeTempFile(f));
    res.status(201).json({ urls });
  })
);
