import type { NextFunction, Request, Response } from 'express';

import { HttpError, buildErrorBody } from '@/utils/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(buildErrorBody(err.code, err.message, err.field));
  }

  console.error(err);
  return res.status(500).json(buildErrorBody('INTERNAL_ERROR', 'Unexpected server error'));
};
