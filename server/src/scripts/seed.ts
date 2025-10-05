import { nanoid } from 'nanoid';

import '@/config/env';
import { initializeDatabase, closeDatabase, query } from '@/db';
import { createUser, getUserByEmail, updateUserRole } from '@/services/user-service';
import { addComment, createTicket, updateTicket } from '@/services/ticket-service';
import { Roles } from '@/utils/constants';
import { hashPassword } from '@/utils/crypto';

const seed = async () => {
  await initializeDatabase();

  const ensureUser = async (
    email: string,
    fullName: string,
    password: string,
    role: (typeof Roles)[keyof typeof Roles],
  ) => {
    const existing = await getUserByEmail(email);
    if (!existing) {
      const created = await createUser({
        id: nanoid(),
        email,
        fullName,
        passwordHash: await hashPassword(password),
        role,
      });
      console.log(`Seeded ${role} user: ${created.email}`);
      return created;
    }
    if (existing.role !== role) {
      const updated = await updateUserRole(existing.id, role);
      console.log(`Updated role for ${email} to ${role}`);
      return updated ?? existing;
    }
    return existing;
  };

  const admin = await ensureUser('admin@mail.com', 'Admin User', 'admin123', Roles.Admin);
  const agent = await ensureUser('agent@mail.com', 'Agent User', 'agent123', Roles.Agent);
  const requester = await ensureUser('user@mail.com', 'Requester User', 'user123', Roles.User);

  const ticketsCount = await query<{ count: string }>('SELECT COUNT(*)::int AS count FROM tickets');
  if (Number(ticketsCount.rows[0]?.count ?? '0') === 0) {
    console.log('Seeding demo tickets...');

    let vpnTicket = await createTicket({
      id: nanoid(),
      title: 'Cannot access VPN gateway',
      description: 'VPN client fails with AUTH_FAILED since this morning.',
      priority: 'high',
      category: 'Networking',
      creatorId: requester.id,
      assigneeId: agent.id,
    });

    vpnTicket = await updateTicket(
      vpnTicket.id,
      { status: 'in_progress' },
      vpnTicket.version,
      agent.id,
    );

    await addComment({
      id: nanoid(),
      ticketId: vpnTicket.id,
      authorId: agent.id,
      body: 'Gathering VPN gateway logs now. Expect update within the hour.',
    });

    let billingTicket = await createTicket({
      id: nanoid(),
      title: 'Billing report totals look inflated',
      description: 'Monthly invoice shows duplicated line items for March. Please verify calculations.',
      priority: 'medium',
      category: 'Billing',
      creatorId: requester.id,
    });

    await addComment({
      id: nanoid(),
      ticketId: billingTicket.id,
      authorId: requester.id,
      body: 'Happy to hop on a call if more context is helpful.',
    });

    billingTicket = await updateTicket(
      billingTicket.id,
      { assigneeId: admin.id },
      billingTicket.version,
      admin.id,
    );

    await addComment({
      id: nanoid(),
      ticketId: billingTicket.id,
      authorId: admin.id,
      body: 'Investigating. I will post a fix ETA shortly.',
    });

    console.log('Seeded example tickets with comments.');
  } else {
    console.log('Existing tickets detected; skipping ticket seeding.');
  }
};

seed()
  .then(async () => {
    console.log('Seed complete');
    await closeDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed', error);
    await closeDatabase();
    process.exit(1);
  });
