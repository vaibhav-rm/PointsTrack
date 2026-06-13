import type { Request } from 'express';

// Parses ?limit & ?offset into safe, bounded values so a single request can
// never ask the database for an unbounded number of rows. Clients that don't
// pass anything get the first page at `defaultLimit`.
export function parsePagination(req: Request, defaultLimit = 100, maxLimit = 500) {
  const rawLimit = parseInt(String(req.query.limit ?? ''), 10);
  const rawOffset = parseInt(String(req.query.offset ?? ''), 10);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, rawLimit))
    : defaultLimit;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  return { limit, offset };
}
