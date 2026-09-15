import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { env, useR2 } from '../config/env.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

let s3: S3Client | null = null;
if (useR2) {
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
    if (base) return `${base}/${key}`;
    return `${env.apiUrl.replace(/\/$/, '')}/files/${key}`;
  }

  const filePath = path.join(UPLOAD_DIR, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return `${env.apiUrl.replace(/\/$/, '')}/uploads/${key}`;
}

export async function deleteFile(key: string): Promise<boolean> {
  if (useR2 && s3) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: env.storage.r2Bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  const filePath = path.join(UPLOAD_DIR, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

export const LOCAL_UPLOAD_DIR = UPLOAD_DIR;

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
