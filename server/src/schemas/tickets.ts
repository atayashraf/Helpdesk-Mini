import { z } from 'zod';

import { TicketPriorityValues, TicketStatusValues } from '@/utils/constants';

export const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  priority: z.enum(TicketPriorityValues),
  category: z.string().optional(),
  assigneeId: z.string().min(1).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  status: z.enum(TicketStatusValues).optional(),
  priority: z.enum(TicketPriorityValues).optional(),
  category: z.string().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  version: z.number().int().nonnegative(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1),
  parentCommentId: z.string().uuid().nullable().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
