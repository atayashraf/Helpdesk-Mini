import type { NextFunction, Request, Response } from 'express';

import { query } from '@/db';
import { hashPayload } from '@/utils/hash';

type IdempotencyRecord = {
  key: string;
  user_id: string | null;
  method: string;
  path: string;
  request_hash: string;
  response_body: unknown;
  status_code: number;
  created_at: string;
};

const fetchRecord = async (key: string): Promise<IdempotencyRecord | null> => {
  const { rows } = await query<IdempotencyRecord>(
    `SELECT * FROM idempotency_keys WHERE key = $1`,
    [key],
  );
  return rows[0] ?? null;
};

const persistRecord = async (record: IdempotencyRecord) => {
  await query(
    `INSERT INTO idempotency_keys (key, user_id, method, path, request_hash, response_body, status_code, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (key) DO UPDATE
     SET user_id = EXCLUDED.user_id,
         method = EXCLUDED.method,
         path = EXCLUDED.path,
         request_hash = EXCLUDED.request_hash,
         response_body = EXCLUDED.response_body,
         status_code = EXCLUDED.status_code,
         created_at = EXCLUDED.created_at`,
    [
      record.key,
      record.user_id,
      record.method,
      record.path,
      record.request_hash,
      record.response_body,
      record.status_code,
      record.created_at,
    ],
  );
};

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.method !== 'POST') {
      return next();
    }

    const key = req.header('Idempotency-Key');
    if (!key) {
      return next();
    }

    const existing = await fetchRecord(key);

    if (existing) {
      res.setHeader('X-Idempotent-Replay', '1');
      return res.status(existing.status_code).json(existing.response_body);
    }

    req.idempotency = { key };

    const originalJson = res.json.bind(res);
    res.json = (async (body: unknown) => {
      if (req.idempotency) {
        const requestHash = hashPayload({
          method: req.method,
          path: req.path,
          body: req.body,
          query: req.query,
        });
        try {
          await persistRecord({
            key: req.idempotency.key,
            user_id: req.user?.id ?? null,
            method: req.method,
            path: req.path,
            request_hash: requestHash,
            response_body: body,
            status_code: res.statusCode,
            created_at: new Date().toISOString(),
          });
        } catch {
          // swallow persistence errors to avoid impacting request flow
        }
      }

      return originalJson(body);
    }) as unknown as typeof res.json;

    return next();
  } catch (error) {
    return next(error);
  }
};
