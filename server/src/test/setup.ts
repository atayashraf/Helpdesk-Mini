// @ts-nocheck
import { afterAll, beforeAll } from 'vitest';

import { closeDatabase, initializeDatabase, query } from '@/db';

const truncateTables = async () => {
  await query('TRUNCATE TABLE ticket_events, ticket_comments, tickets, idempotency_keys, users RESTART IDENTITY CASCADE');
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await import('@/config/env');
  await initializeDatabase();
  await truncateTables();
});

afterAll(async () => {
  await truncateTables();
  await closeDatabase();
});
