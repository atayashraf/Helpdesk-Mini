import 'express-async-errors';

import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';

import { env } from '@/config/env';
import { apiRouter } from '@/routes';
import { authenticate } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rate-limit';
import { idempotencyMiddleware } from '@/middleware/idempotency';
import { errorHandler } from '@/middleware/error-handler';
import { sweepSlaBreaches } from '@/services/ticket-service';
import { buildErrorBody } from '@/utils/errors';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const staticDir = path.join(process.cwd(), 'public');
  app.use(express.static(staticDir));
  app.use('/.well-known', express.static(path.join(staticDir, '.well-known')));

  app.use(authenticate);
  app.use(rateLimiter);
  app.use(idempotencyMiddleware);

  app.use('/api', apiRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json(buildErrorBody('NOT_FOUND', 'Route not found'));
  });

  app.use(errorHandler);

  if (env.nodeEnv !== 'test') {
    setInterval(() => {
      try {
        sweepSlaBreaches();
      } catch (error) {
        console.error('Failed to sweep SLA breaches', error);
      }
    }, 60_000);
  }

  return app;
};
