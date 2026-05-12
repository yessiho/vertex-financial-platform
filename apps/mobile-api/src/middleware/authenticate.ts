import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

export interface AuthPayload {
  sub: string;
  org_id: string;
  entity_id: string;
  role: string;
  mfa_verified: boolean;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request { user: AuthPayload; }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  if ((req as any).skipAuth) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next(new AppError('Missing Authorization header', 401));
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(new AppError('Token expired', 401));
    return next(new AppError('Invalid token', 401));
  }
}
