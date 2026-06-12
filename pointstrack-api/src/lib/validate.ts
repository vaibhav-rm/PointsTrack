import type { Request } from 'express';
import type { ZodSchema } from 'zod';

// Parses + validates the request body against a Zod schema, throwing a
// ZodError (handled centrally) on failure.
export function parseBody<T>(schema: ZodSchema<T>, req: Request): T {
  return schema.parse(req.body);
}
