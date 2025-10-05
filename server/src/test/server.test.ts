import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { nanoid } from 'nanoid';

import { createApp } from '@/app';
import { createUser } from '@/services/user-service';
import { hashPassword } from '@/utils/crypto';
import { Roles } from '@/utils/constants';

let app = createApp();

describe('system routes', () => {
  test('health endpoint works', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('meta endpoint works', async () => {
    const response = await request(app).get('/api/_meta');
    expect(response.status).toBe(200);
    expect(response.body.service).toBe('helpdesk-mini');
  });
});

describe('auth flow', () => {
  test('register and login user', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('Idempotency-Key', nanoid())
      .send({
        email: 'user1@example.com',
        password: 'password123',
        fullName: 'User One',
      });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.email).toBe('user1@example.com');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
  });
});

describe('ticket lifecycle', () => {
  let token: string;
  let ticketId: string;
  let version: number;
  let agentToken: string;
  let agentId: string;

  test('login as user', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'password123' });
    token = loginRes.body.data.token;
    expect(token).toBeDefined();
  });

  test('create ticket with idempotency', async () => {
    const key = nanoid();
    const payload = {
      title: 'Email outage',
      description: 'Cannot access email service since morning',
      priority: 'high',
    };

    const res1 = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(payload);

    expect(res1.status).toBe(201);
    ticketId = res1.body.data.ticket.id;
    version = res1.body.data.ticket.version;
    expect(res1.body.data.ticket.slaBreached).toBe(false);

    const res2 = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.headers['x-idempotent-replay']).toBe('1');
    expect(res2.body.data.ticket.id).toBe(ticketId);
  });

  test('list tickets with pagination', async () => {
    const res = await request(app)
      .get('/api/tickets?limit=10&offset=0')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.next_offset).toBeNull();
  });

  test('update ticket with optimistic locking', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Email downtime',
        description: 'Issue persists',
        category: 'IT',
        version,
      });
    expect(res.status).toBe(200);
    version = res.body.data.ticket.version;
    expect(res.body.data.ticket.title).toBe('Email downtime');
  });

  test('stale update returns 409', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Another change', version: version - 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_MISMATCH');
  });

  test('add threaded comment', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Any update?' });
    expect(res.status).toBe(201);
    const comments = res.body.data.ticket.comments;
    expect(comments.length).toBe(1);
    expect(comments[0].body).toBe('Any update?');
  });

  test('agent can update workflow fields', async () => {
    const agentEmail = `agent+${nanoid()}@example.com`;
    const agentPassword = 'password123';
    agentId = nanoid();
    await createUser({
      id: agentId,
      email: agentEmail,
      fullName: 'Agent User',
      passwordHash: await hashPassword(agentPassword),
      role: Roles.Agent,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: agentEmail, password: agentPassword });
    agentToken = loginRes.body.data.token;

    const res = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        status: 'in_progress',
        assigneeId: agentId,
        version,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe('in_progress');
  });

  test('search returns results', async () => {
    const res = await request(app)
      .get('/api/tickets?q=email')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].title.toLowerCase()).toContain('email');
  });

  test('support roster visible to agents', async () => {
    const res = await request(app)
      .get('/api/tickets/support-team')
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.members.length).toBeGreaterThan(0);
    expect(res.body.data.members[0]).toMatchObject({ role: expect.stringMatching(/agent|admin/) });
  });

  test('support roster forbidden for requesters', async () => {
    const res = await request(app)
      .get('/api/tickets/support-team')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
