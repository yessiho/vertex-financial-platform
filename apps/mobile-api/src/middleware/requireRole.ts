import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

const HIERARCHY: Record<string, number> = {
  superadmin: 4, admin: 3, accountant: 2, client: 1,
};

export function requireRole(allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return next(new AppError('Unauthorized', 401));
    const userRank = HIERARCHY[role] ?? 0;
    const maxAllowed = Math.max(...allowed.map(r => HIERARCHY[r] ?? 0));
    if (userRank >= maxAllowed) return next();
    return next(new AppError(`Required role: ${allowed.join(' or ')}`, 403));
  };
}
