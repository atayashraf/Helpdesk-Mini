import { Router } from 'express';

import {
  addCommentController,
  createTicketController,
  getTicketController,
  listTicketsController,
  listSupportTeamController,
  updateTicketController,
} from '@/controllers/ticket-controller';
import { requireAuth } from '@/middleware/auth';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

ticketsRouter.post('/', createTicketController);
ticketsRouter.get('/', listTicketsController);
ticketsRouter.get('/support-team', listSupportTeamController);
ticketsRouter.get('/:id', getTicketController);
ticketsRouter.patch('/:id', updateTicketController);
ticketsRouter.post('/:id/comments', addCommentController);
