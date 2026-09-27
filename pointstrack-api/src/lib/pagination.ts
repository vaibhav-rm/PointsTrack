import type { Request, Response } from 'express';

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

// Offset pagination over ever-growing tables (attendees, ledger) can skip or
// duplicate rows when concurrent writes shift offsets. For list endpoints we
// still use offset (simple, cacheable) but always expose the total so clients
// can render real pagers instead of fetching "everything". Responses stay
// backwards compatible: the body is still a JSON array.
export function setTotalCount(res: Response, total: number) {
  res.setHeader('X-Total-Count', String(total));
  // Lets browsers on any origin read the count header.
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
}
