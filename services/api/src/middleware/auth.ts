import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/auth';
import { db } from '../db';
import { UserRole } from '@aurex/shared';

export interface AuthRequest extends Request {
  user?: JwtPayload & { banned?: boolean; email_verified?: boolean };
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Authentication required' } });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = db.prepare('SELECT banned, email_verified FROM users WHERE id=?').get(payload.sub) as { banned: number; email_verified: number } | undefined;
    if (!user) return res.status(401).json({ success: false, error: { code: 'INVALID_USER', message: 'User not found' } });
    if (user.banned) return res.status(403).json({ success: false, error: { code: 'BANNED', message: 'Account suspended' } });
    req.user = { ...payload, banned: !!user.banned, email_verified: !!user.email_verified };
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Authentication required' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}
