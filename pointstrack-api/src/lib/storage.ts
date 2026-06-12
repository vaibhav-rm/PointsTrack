import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env, useR2 } from '../config/env.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

let s3: S3Client | null = null;
if (useR2) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.storage.r2AccountId}.r2.cloudflarestorage.com`,
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
    const base = env.storage.r2PublicUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }

  // Local disk fallback. Served under /uploads to avoid clashing with API routes.
  const filePath = path.join(UPLOAD_DIR, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return `${env.apiUrl.replace(/\/$/, '')}/uploads/${key}`;
}

export const LOCAL_UPLOAD_DIR = UPLOAD_DIR;
