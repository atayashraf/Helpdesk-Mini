import crypto from 'node:crypto';

import type { PoolClient } from 'pg';

import { query, withTransaction } from '@/db';
import { TicketPriorityValues, TicketStatusValues, TicketStatus, type Role } from '@/utils/constants';
import { HttpError } from '@/utils/errors';
import { computeSlaDueAt } from '@/utils/sla';

type TicketRow = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: string;
  category: string | null;
  creator_id: string;
  assignee_id: string | null;
  sla_due_at: string;
  sla_breached: boolean;
  latest_comment_excerpt: string | null;
  latest_comment_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

type TicketRecord = TicketRow & {
  creator_name: string;
  assignee_name: string | null;
};

type UserSummary = {
  id: string;
  full_name: string;
  role: Role;
};

type TicketFilters = {
  requesterId: string;
  role: 'user' | 'agent' | 'admin';
  status?: string;
  assigneeId?: string;
  breached?: boolean;
  q?: string;
  limit: number;
  offset: number;
};

type CommentRecord = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
};

type TicketEventRow = {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type TicketEvent = Omit<TicketEventRow, 'payload'> & { payload: Record<string, unknown> };

type TicketWithRelations = TicketRecord & {
  comments: CommentRecord[];
  timeline: TicketEvent[];
  participants: Record<string, UserSummary>;
};

const refreshSlaBreaches = async () => {
  const nowIso = new Date().toISOString();
  await query(
    `UPDATE tickets
       SET sla_breached = TRUE, updated_at = $1
     WHERE sla_due_at <= $1
       AND sla_breached = FALSE
       AND status NOT IN ('resolved','closed')`,
    [nowIso],
  );
};

export const sweepSlaBreaches = () => refreshSlaBreaches();

export const createTicket = async (ticket: {
  id: string;
  title: string;
  description: string;
  priority: string;
  category?: string | null;
  creatorId: string;
  assigneeId?: string | null;
}): Promise<TicketWithRelations> => {
  if (!TicketPriorityValues.includes(ticket.priority as never)) {
    throw new HttpError(400, 'INVALID_PRIORITY', 'Invalid ticket priority');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const slaDueAt = computeSlaDueAt(ticket.priority, now);

  await withTransaction(async (client) => {
    await query(
      `INSERT INTO tickets (id, title, description, status, priority, category, creator_id, assignee_id, sla_due_at, sla_breached, latest_comment_excerpt, latest_comment_at, version, created_at, updated_at)
       VALUES ($1, $2, $3, 'open', $4, $5, $6, $7, $8, FALSE, NULL, NULL, 0, $9, $10)`,
      [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.priority,
        ticket.category ?? null,
        ticket.creatorId,
        ticket.assigneeId ?? null,
        slaDueAt,
        nowIso,
        nowIso,
      ],
      client,
    );

    await recordEvent(
      ticket.id,
      ticket.creatorId,
      'TICKET_CREATED',
      {
        priority: ticket.priority,
        assigneeId: ticket.assigneeId ?? null,
      },
      client,
    );
  });

  const created = await getTicketById(ticket.id);
  if (!created) {
    throw new HttpError(500, 'TICKET_NOT_CREATED', 'Ticket could not be created');
  }
  return created;
};

export const listTickets = async (filters: TicketFilters) => {
  await refreshSlaBreaches();

  if (filters.status && !TicketStatusValues.includes(filters.status as never)) {
    throw new HttpError(400, 'INVALID_STATUS', 'Invalid status filter');
  }

  const where: string[] = [];
  const values: unknown[] = [];
  let parameterIndex = 1;

  if (filters.role === 'user') {
    where.push(`(t.creator_id = $${parameterIndex} OR t.assignee_id = $${parameterIndex + 1})`);
    values.push(filters.requesterId, filters.requesterId);
    parameterIndex += 2;
  }

  if (filters.status) {
    where.push(`t.status = $${parameterIndex}`);
    values.push(filters.status);
    parameterIndex += 1;
  }

  if (filters.assigneeId) {
    where.push(`t.assignee_id = $${parameterIndex}`);
    values.push(filters.assigneeId);
    parameterIndex += 1;
  }

  if (typeof filters.breached === 'boolean') {
    where.push(`t.sla_breached = $${parameterIndex}`);
    values.push(filters.breached);
    parameterIndex += 1;
  }

  if (filters.q) {
    const search = `%${filters.q.toLowerCase()}%`;
    where.push(`(
      LOWER(t.title) LIKE $${parameterIndex}
      OR LOWER(t.description) LIKE $${parameterIndex + 1}
      OR (t.latest_comment_excerpt IS NOT NULL AND LOWER(t.latest_comment_excerpt) LIKE $${parameterIndex + 2})
    )`);
    values.push(search, search, search);
    parameterIndex += 3;
  }

  const limitIndex = parameterIndex;
  const offsetIndex = parameterIndex + 1;
  values.push(filters.limit + 1, filters.offset);

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT
      t.*,
      creator.full_name AS creator_name,
      assignee.full_name AS assignee_name
    FROM tickets t
    JOIN users creator ON creator.id = t.creator_id
    LEFT JOIN users assignee ON assignee.id = t.assignee_id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;
  const { rows } = await query<TicketRecord>(sql, values);

  const hasMore = rows.length > filters.limit;
  const items = hasMore ? rows.slice(0, filters.limit) : rows;
  const nextOffset = hasMore ? filters.offset + filters.limit : null;

  return {
    items,
    next_offset: nextOffset,
  };
};

export const getTicketById = async (id: string): Promise<TicketWithRelations | undefined> => {
  await refreshSlaBreaches();

  const { rows } = await query<TicketRecord>(
    `SELECT
       t.*,
       creator.full_name AS creator_name,
       assignee.full_name AS assignee_name
     FROM tickets t
     JOIN users creator ON creator.id = t.creator_id
     LEFT JOIN users assignee ON assignee.id = t.assignee_id
     WHERE t.id = $1`,
    [id],
  );
  const ticket = rows[0];
  if (!ticket) {
    return undefined;
  }

  const commentsResult = await query<CommentRecord>(
    `SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [id],
  );

  const timelineResult = await query<TicketEventRow>(
    `SELECT * FROM ticket_events WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [id],
  );

  const timeline: TicketEvent[] = timelineResult.rows.map((event: TicketEventRow) => ({
    ...event,
    payload: event.payload ?? {},
  }));

  const participantIds = new Set<string>();
  participantIds.add(ticket.creator_id);
  if (ticket.assignee_id) {
    participantIds.add(ticket.assignee_id);
  }
  for (const comment of commentsResult.rows) {
    participantIds.add(comment.author_id);
  }
  for (const event of timelineResult.rows) {
    if (event.actor_id) {
      participantIds.add(event.actor_id);
    }
  }

  const participants: Record<string, UserSummary> = {};
  if (participantIds.size > 0) {
    const usersResult = await query<UserSummary>(
      `SELECT id, full_name, role FROM users WHERE id = ANY($1::text[])`,
      [Array.from(participantIds)],
    );
    for (const user of usersResult.rows) {
      participants[user.id] = user;
    }
  }

  return {
    ...ticket,
    comments: commentsResult.rows,
    timeline,
    participants,
  };
};

export const updateTicket = async (
  ticketId: string,
  updates: Partial<{
    title: string;
    description: string;
    status: TicketStatus;
    priority: string;
    category: string | null;
    assigneeId: string | null;
  }>,
  version: number,
  actorId: string,
): Promise<TicketWithRelations> => {
  await withTransaction(async (client) => {
    const existingResult = await query<TicketRow>(
      `SELECT * FROM tickets WHERE id = $1 FOR UPDATE`,
      [ticketId],
      client,
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      throw new HttpError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
    }

    if (existing.version !== version) {
      throw new HttpError(409, 'VERSION_MISMATCH', 'Ticket has been modified by another process');
    }

    const now = new Date();
    const nowIso = now.toISOString();
  const updatedValues: Partial<TicketRow> = {};
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];

    if (updates.title && updates.title !== existing.title) {
      updatedValues.title = updates.title;
      events.push({ type: 'TITLE_UPDATED', payload: { title: updates.title } });
    }

    if (updates.description && updates.description !== existing.description) {
      updatedValues.description = updates.description;
      events.push({ type: 'DESCRIPTION_UPDATED', payload: {} });
    }

    if (updates.status && updates.status !== existing.status) {
      if (!TicketStatusValues.includes(updates.status as never)) {
        throw new HttpError(400, 'INVALID_STATUS', 'Invalid status value');
      }
      updatedValues.status = updates.status;
      events.push({ type: 'STATUS_CHANGED', payload: { from: existing.status, to: updates.status } });
    }

    if (updates.priority && updates.priority !== existing.priority) {
      if (!TicketPriorityValues.includes(updates.priority as never)) {
        throw new HttpError(400, 'INVALID_PRIORITY', 'Invalid priority value');
      }
      updatedValues.priority = updates.priority;
      updatedValues.sla_due_at = computeSlaDueAt(updates.priority, now);
      updatedValues.sla_breached = false;
      events.push({ type: 'PRIORITY_CHANGED', payload: { from: existing.priority, to: updates.priority } });
    }

    if (updates.category !== undefined && updates.category !== existing.category) {
      updatedValues.category = updates.category;
      events.push({ type: 'CATEGORY_CHANGED', payload: { category: updates.category } });
    }

    if (updates.assigneeId !== undefined && updates.assigneeId !== existing.assignee_id) {
      updatedValues.assignee_id = updates.assigneeId;
      events.push({
        type: 'ASSIGNEE_CHANGED',
        payload: { from: existing.assignee_id, to: updates.assigneeId },
      });
    }

    if (events.length === 0) {
      return;
    }

    const setClauses: string[] = ['updated_at = $1', 'version = $2'];
    const values: unknown[] = [nowIso, existing.version + 1];

    const assign = (column: keyof TicketRow, value: unknown) => {
      setClauses.push(`${String(column)} = $${values.length + 1}`);
      values.push(value);
    };

    if (updatedValues.title !== undefined) {
      assign('title', updatedValues.title);
    }
    if (updatedValues.description !== undefined) {
      assign('description', updatedValues.description);
    }
    if (updatedValues.status !== undefined) {
      assign('status', updatedValues.status);
    }
    if (updatedValues.priority !== undefined) {
      assign('priority', updatedValues.priority);
    }
    if (updatedValues.category !== undefined) {
      assign('category', updatedValues.category);
    }
    if (updatedValues.assignee_id !== undefined) {
      assign('assignee_id', updatedValues.assignee_id);
    }
    if (updatedValues.sla_due_at !== undefined) {
      assign('sla_due_at', updatedValues.sla_due_at);
    }
    if (updatedValues.sla_breached !== undefined) {
      assign('sla_breached', updatedValues.sla_breached);
    }

    const idParamIndex = values.length + 1;
    const params = [...values, ticketId];

    await query(
      `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${idParamIndex}`,
      params,
      client,
    );

    for (const event of events) {
      await recordEvent(ticketId, actorId, event.type, event.payload, client);
    }
  });

  const updated = await getTicketById(ticketId);
  if (!updated) {
    throw new HttpError(500, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  return updated;
};

export const addComment = async (comment: {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  parentCommentId?: string | null;
}): Promise<TicketWithRelations> => {
  await withTransaction(async (client) => {
    const existing = await query<TicketRow>(
      `SELECT id FROM tickets WHERE id = $1 FOR UPDATE`,
      [comment.ticketId],
      client,
    );

    if (existing.rowCount === 0) {
      throw new HttpError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const excerpt = comment.body.slice(0, 280);

    await query(
      `INSERT INTO ticket_comments (id, ticket_id, author_id, body, parent_comment_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [
        comment.id,
        comment.ticketId,
        comment.authorId,
        comment.body,
        comment.parentCommentId ?? null,
        nowIso,
      ],
      client,
    );

    await query(
      `UPDATE tickets
         SET latest_comment_excerpt = $1,
             latest_comment_at = $2,
             updated_at = $2
       WHERE id = $3`,
      [excerpt, nowIso, comment.ticketId],
      client,
    );

    await recordEvent(
      comment.ticketId,
      comment.authorId,
      'COMMENT_ADDED',
      {
        commentId: comment.id,
        parentCommentId: comment.parentCommentId ?? null,
      },
      client,
    );
  });

  const ticket = await getTicketById(comment.ticketId);
  if (!ticket) {
    throw new HttpError(500, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  return ticket;
};

export const recordEvent = async (
  ticketId: string,
  actorId: string | null,
  type: string,
  payload: Record<string, unknown>,
  client?: PoolClient,
) => {
  await query(
    `INSERT INTO ticket_events (id, ticket_id, actor_id, type, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [cryptoRandomId(), ticketId, actorId, type, payload],
    client,
  );
};

const cryptoRandomId = () => crypto.randomUUID();
