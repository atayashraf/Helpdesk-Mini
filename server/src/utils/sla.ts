import dayjs from 'dayjs';

import { TicketPriorityValues } from './constants';

const SLA_HOURS: Record<string, number> = {
  urgent: 2,
  high: 6,
  medium: 12,
  low: 24,
};

export const computeSlaDueAt = (priority: string, reference = new Date()) => {
  const normalized = TicketPriorityValues.includes(priority as never) ? priority : 'medium';
  const hours = SLA_HOURS[normalized];
  return dayjs(reference).add(hours, 'hour').toISOString();
};
