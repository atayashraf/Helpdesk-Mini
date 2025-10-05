export const Roles = {
  User: 'user',
  Agent: 'agent',
  Admin: 'admin',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const TicketStatusValues = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TicketStatusValues)[number];

export const TicketPriorityValues = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TicketPriorityValues)[number];
