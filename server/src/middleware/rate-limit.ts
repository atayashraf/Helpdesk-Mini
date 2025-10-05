import type { NextFunction, Request, Response } from 'express';

import { env } from '@/config/env';
import { HttpError } from '@/utils/errors';

const windowMs = 60_000;

type RateEntry = {
  count: number;
  windowStart: number;
};

const store = new Map<string, RateEntry>();

export const rateLimiter = (req: Request, _res: Response, next: NextFunction) => {
  const key = (req.user?.id ?? req.ip ?? 'anonymous');
  const now = Date.now();
  const record = store.get(key);

  if (!record || now - record.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (record.count >= env.rateLimitPerMinute) {
    return next(new HttpError(429, 'RATE_LIMIT', 'Rate limit exceeded'));
  }

  record.count += 1;
  store.set(key, record);
  return next();
};
