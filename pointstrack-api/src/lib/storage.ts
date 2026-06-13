import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { env, useR2 } from '../config/env.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

let s3: S3Client | null = null;
if (useR2) {
  // Use an explicit endpoint when given (Supabase / B2 / MinIO), otherwise derive
  // the Cloudflare R2 endpoint from the account id. Custom endpoints need
  // path-style addressing (bucket in the path, not the hostname).
  const endpoint =
    env.storage.s3Endpoint ||
    `https://${env.storage.r2AccountId}.r2.cloudflarestorage.com`;
  s3 = new S3Client({
    region: env.storage.s3Region,
    endpoint,
    forcePathStyle: !!env.storage.s3Endpoint,
    credentials: {
      accessKeyId: env.storage.r2AccessKeyId,
      secretAccessKey: env.storage.r2SecretAccessKey,
    },
  });
} else {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

/**
 * Stores a file and returns its public URL.
 * - With R2 configured: uploads to the bucket, returns the R2 public URL.
 * - Otherwise: writes to ./uploads, returns a local /uploads/<file> URL.
 * The calling code never changes — only env vars do.
 */
export async function storeFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  prefix = 'uploads'
): Promise<string> {
  const key = `${prefix}/${safeName(originalName)}`;

  if (useR2 && s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.storage.r2Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    // Public bucket / CDN configured → return the direct URL (fastest).
    const base = env.storage.r2PublicUrl.replace(/\/$/, '');
    if (base) return `${base}/${key}`;
    // Private bucket (no public access / no card) → serve it back through this
    // API, which holds the credentials and can read the object. See GET /files.
    return `${env.apiUrl.replace(/\/$/, '')}/files/${key}`;
  }

  // Local disk fallback. Served under /uploads to avoid clashing with API routes.
  const filePath = path.join(UPLOAD_DIR, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return `${env.apiUrl.replace(/\/$/, '')}/uploads/${key}`;
}

export const LOCAL_UPLOAD_DIR = UPLOAD_DIR;

/**
 * Streams an object back from object storage (used by the GET /files proxy so a
 * private bucket can serve public-readable assets without a public bucket / CDN).
 * Returns null when object storage isn't configured.
 */
export async function getFileStream(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
} | null> {
  if (!useR2 || !s3) return null;
  const out = await s3.send(
    new GetObjectCommand({ Bucket: env.storage.r2Bucket, Key: key })
  );
  return {
    body: out.Body as Readable,
    contentType: out.ContentType,
    contentLength: out.ContentLength,
  };
}
