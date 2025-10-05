import type { NextFunction, Request, Response } from 'express';

import { verifyToken } from '@/utils/jwt';
import { HttpError } from '@/utils/errors';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    return next();
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'INVALID_AUTH', 'Invalid authorization header format'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    return next(new HttpError(401, 'INVALID_TOKEN', 'Token is invalid or expired'));
  }
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  return next();
};

export const requireRoles = (roles: Array<'user' | 'agent' | 'admin'>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    return next();
  };
