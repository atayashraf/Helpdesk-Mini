import type { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import { parseSchema } from '@/utils/validation';
import { createTicketSchema, updateTicketSchema, createCommentSchema } from '@/schemas/tickets';
import { createTicket, listTickets, getTicketById, updateTicket, addComment } from '@/services/ticket-service';
import { listAgentsAndAdmins } from '@/services/user-service';
import { HttpError } from '@/utils/errors';
import { buildCommentTree } from '@/utils/comments';
import { Roles } from '@/utils/constants';

const ensureAccessToTicket = (req: Request, ticket: { creator_id: string; assignee_id: string | null }) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  if (req.user.role === Roles.Admin || req.user.role === Roles.Agent) {
    return;
  }
  if (ticket.creator_id === req.user.id || ticket.assignee_id === req.user.id) {
    return;
  }
  throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this ticket');
};

type ParticipantsRecord = Record<string, { id: string; full_name: string; role: string }>;

type ParticipantView = {
  id: string;
  fullName: string;
  role: string;
};

type ParticipantsView = Record<string, ParticipantView>;

const mapParticipants = (participants: ParticipantsRecord): ParticipantsView =>
  Object.fromEntries(
    Object.entries(participants).map(([id, participant]) => [
      id,
      {
        id,
        fullName: participant.full_name,
        role: participant.role,
      },
    ]),
  );

const labelFromType = (value: string | null | undefined) =>
  value ? value.toString().replace(/_/g, ' ') : 'Unassigned';

const describeEvent = (
  event: { type: string; payload?: Record<string, unknown>; actor_id: string | null },
  participants: ParticipantsView,
) => {
  const actorName = event.actor_id ? participants[event.actor_id]?.fullName ?? 'Unknown user' : 'System';
  const payload = event.payload ?? {};

  switch (event.type) {
    case 'TICKET_CREATED':
      return `${actorName} created the ticket`;
    case 'STATUS_CHANGED':
      return `${actorName} changed status from ${labelFromType(payload.from as string)} to ${labelFromType(payload.to as string)}`;
    case 'PRIORITY_CHANGED':
      return `${actorName} changed priority from ${labelFromType(payload.from as string)} to ${labelFromType(payload.to as string)}`;
    case 'ASSIGNEE_CHANGED': {
      const fromId = payload.from as string | null;
      const toId = payload.to as string | null;
      const fromLabel = fromId ? participants[fromId]?.fullName ?? 'Unknown user' : 'Unassigned';
      const toLabel = toId ? participants[toId]?.fullName ?? 'Unknown user' : 'Unassigned';
      return `${actorName} reassigned the ticket from ${fromLabel} to ${toLabel}`;
    }
    case 'CATEGORY_CHANGED':
      return `${actorName} set category to ${labelFromType(payload.category as string)}`;
    case 'TITLE_UPDATED':
      return `${actorName} updated the title`;
    case 'DESCRIPTION_UPDATED':
      return `${actorName} updated the description`;
    case 'COMMENT_ADDED':
      return `${actorName} added a comment`;
    default:
      return `${actorName} recorded ${labelFromType(event.type)}`;
  }
};

const mapCommentNode = (
  comment: ReturnType<typeof buildCommentTree>[number],
  participants: ParticipantsView,
): any => ({
  id: comment.id,
  body: comment.body,
  authorId: comment.author_id,
  authorName: participants[comment.author_id]?.fullName ?? 'Unknown user',
  authorRole: participants[comment.author_id]?.role ?? 'user',
  createdAt: comment.created_at,
  replies: comment.replies.map((reply) => mapCommentNode(reply, participants)),
});

const mapTimelineEvent = (event: any, participants: ParticipantsView) => ({
  id: event.id,
  actorId: event.actor_id,
  actorName: event.actor_id ? participants[event.actor_id]?.fullName ?? 'Unknown user' : 'System',
  actorRole: event.actor_id ? participants[event.actor_id]?.role ?? 'user' : 'system',
  type: event.type,
  description: describeEvent(event, participants),
  payload: event.payload ?? {},
  createdAt: event.created_at,
});

const summaryFromTicket = (ticket: any) => ({
  id: ticket.id,
  title: ticket.title,
  status: ticket.status,
  priority: ticket.priority,
  category: ticket.category,
  creatorId: ticket.creator_id,
  creatorName: ticket.creator_name,
  assigneeId: ticket.assignee_id,
  assigneeName: ticket.assignee_name,
  slaDueAt: ticket.sla_due_at,
  slaBreached: Boolean(ticket.sla_breached),
  latestCommentExcerpt: ticket.latest_comment_excerpt,
  latestCommentAt: ticket.latest_comment_at,
  version: ticket.version,
  createdAt: ticket.created_at,
  updatedAt: ticket.updated_at,
});

const detailFromTicket = (ticket: any) => {
  const participants = mapParticipants(ticket.participants ?? {});
  const commentTree = buildCommentTree(ticket.comments ?? []);

  return {
    ...summaryFromTicket(ticket),
    description: ticket.description,
    participants,
    comments: commentTree.map((node) => mapCommentNode(node, participants)),
    timeline: (ticket.timeline ?? []).map((event: any) => mapTimelineEvent(event, participants)),
  };
};

export const createTicketController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const input = parseSchema(createTicketSchema, req.body);

  if (req.user.role === Roles.User && input.assigneeId) {
    throw new HttpError(403, 'FORBIDDEN', 'Users cannot assign tickets at creation');
  }

  const ticket = await createTicket({
    id: nanoid(),
    title: input.title,
    description: input.description,
    priority: input.priority,
    category: input.category ?? null,
    creatorId: req.user.id,
    assigneeId: input.assigneeId ?? null,
  });

  ensureAccessToTicket(req, ticket);

  return res.status(201).json({ data: { ticket: detailFromTicket(ticket) } });
};

export const listTicketsController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const status = req.query.status ? String(req.query.status) : undefined;
  const assigneeId = req.query.assigneeId ? String(req.query.assigneeId) : undefined;
  const breached = req.query.breached ? req.query.breached === 'true' : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;

  const results = await listTickets({
    requesterId: req.user.id,
    role: req.user.role,
    status,
    assigneeId,
    breached,
    q,
    limit,
    offset,
  });

  return res.json({
    data: {
      items: results.items.map(summaryFromTicket),
      next_offset: results.next_offset,
    },
  });
};

export const getTicketController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }
  ensureAccessToTicket(req, ticket);
  return res.json({ data: { ticket: detailFromTicket(ticket) } });
};

export const updateTicketController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const input = parseSchema(updateTicketSchema, req.body);
  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }
  ensureAccessToTicket(req, ticket);

  if (req.user.role === Roles.User) {
    const forbiddenFields = ['status', 'priority', 'assigneeId'];
    for (const field of forbiddenFields) {
      if (Object.prototype.hasOwnProperty.call(input, field)) {
        throw new HttpError(403, 'FORBIDDEN', 'Users cannot modify ticket workflow fields', field);
      }
    }
  }

  const updated = await updateTicket(
    ticket.id,
    {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      category: input.category ?? null,
      assigneeId: input.assigneeId ?? undefined,
    },
    input.version,
    req.user.id,
  );

  return res.json({ data: { ticket: detailFromTicket(updated) } });
};

export const addCommentController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const input = parseSchema(createCommentSchema, req.body);
  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }
  ensureAccessToTicket(req, ticket);

  const updated = await addComment({
    id: nanoid(),
    ticketId: ticket.id,
    authorId: req.user.id,
    body: input.body,
    parentCommentId: input.parentCommentId ?? null,
  });

  return res.status(201).json({ data: { ticket: detailFromTicket(updated) } });
};

export const listSupportTeamController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  if (req.user.role === Roles.User) {
    throw new HttpError(403, 'FORBIDDEN', 'Only agents or admins may view the support roster');
  }

  const members = await listAgentsAndAdmins();

  return res.json({
    data: {
      members: members.map((member) => ({
        id: member.id,
        fullName: member.full_name,
        email: member.email,
        role: member.role,
      })),
    },
  });
};
