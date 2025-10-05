import type { Request, Response } from 'express';
import { Router } from 'express';
import packageJson from '../../package.json' assert { type: 'json' };

const startedAt = Date.now();

export const systemRouter = Router();

systemRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

systemRouter.get('/_meta', (_req: Request, res: Response) => {
  res.json({
    service: 'helpdesk-mini',
    version: packageJson.version,
    uptime: Date.now() - startedAt,
    node_env: process.env.NODE_ENV ?? 'development',
  });
});
