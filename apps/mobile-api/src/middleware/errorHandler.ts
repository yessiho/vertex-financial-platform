import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('API Error:', err.message, err.stack?.split('\n')[1]);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
  });
}
