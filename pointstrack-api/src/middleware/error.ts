import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

// Centralized error handler. Maps known error types to clean JSON responses.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Postgres unique violation
  if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
