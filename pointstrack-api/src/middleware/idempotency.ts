import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq, and, lt } from 'drizzle-orm';
import { db, idempotencyKeys } from '../db/index.js';
import { badRequest, conflict, unprocessableEntity } from '../lib/errors.js';

const KEY_EXPIRY_HOURS = 24;

export function requireIdempotency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string | undefined;

    // If no Idempotency-Key header is provided, proceed normally
    if (!key) return next();

    if (!req.auth) {
      return next(badRequest('Authentication required to use Idempotency-Key'));
    }

    const accountId = req.auth.sub;
    const fullPath = req.originalUrl || `${req.baseUrl}${req.path}`;
    const requestHash = crypto
      .createHash('sha256')
      .update(`${req.method}:${fullPath}:${JSON.stringify(req.body ?? {})}`)
      .digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + KEY_EXPIRY_HOURS * 60 * 60 * 1000);

    try {
      // 1. Check existing key
      const [existing] = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.accountId, accountId),
            eq(idempotencyKeys.key, key)
          )
        );

      if (existing) {
        // If expired, delete and treat as new
        if (new Date(existing.expiresAt) < now) {
          await db
            .delete(idempotencyKeys)
            .where(eq(idempotencyKeys.id, existing.id));
        } else {
          // Payload mismatch check
          if (existing.requestHash !== requestHash) {
            return next(
              unprocessableEntity('Idempotency key reused with a different request payload')
            );
          }

          // Concurrent in-flight check
          if (existing.status === 'pending') {
            return next(
              conflict('A request with this idempotency key is currently in progress')
            );
          }

          // Replay cached response
          if (existing.status === 'completed') {
            res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_REPLAY');
            return res
              .status(existing.responseStatus ?? 200)
              .json(existing.responseBody);
          }
        }
      }

      // 2. Insert pending reservation
      let reservationId = '';
      try {
        const [inserted] = await db
          .insert(idempotencyKeys)
          .values({
            accountId,
            key,
            requestHash,
            status: 'pending',
            expiresAt,
          })
          .returning();
        reservationId = inserted.id;
      } catch (err: any) {
        // Unique constraint conflict on concurrent insert
        return next(
          conflict('A request with this idempotency key is currently in progress')
        );
      }

      // 3. Intercept response completion to save payload
      const originalJson = res.json.bind(res);

      res.json = (body: any): Response => {
        const status = res.statusCode;
        if (reservationId) {
          if (status >= 400) {
            // Delete reservation on error so user can retry cleanly
            db.delete(idempotencyKeys)
              .where(eq(idempotencyKeys.id, reservationId))
              .then(() => originalJson(body))
              .catch((err) => {
                console.error('Failed to clean up idempotency key on error:', err);
                originalJson(body);
              });
          } else {
            db.update(idempotencyKeys)
              .set({
                status: 'completed',
                responseStatus: status,
                responseBody: body,
              })
              .where(eq(idempotencyKeys.id, reservationId))
              .then(() => originalJson(body))
              .catch((err) => {
                console.error('Failed to update idempotency key:', err);
                originalJson(body);
              });
          }
          return res;
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
