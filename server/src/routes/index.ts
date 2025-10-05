import { Router } from 'express';

import { authRouter } from './auth';
import { ticketsRouter } from './tickets';
import { systemRouter } from './system';

export const apiRouter = Router();

apiRouter.use(systemRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/tickets', ticketsRouter);
