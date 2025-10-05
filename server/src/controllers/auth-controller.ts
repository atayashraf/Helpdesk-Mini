import type { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import { parseSchema } from '@/utils/validation';
import { registerSchema, loginSchema } from '@/schemas/auth';
import { getUserByEmail, createUser, getUserById } from '@/services/user-service';
import { HttpError } from '@/utils/errors';
import { hashPassword, verifyPassword } from '@/utils/crypto';
import { signToken } from '@/utils/jwt';

const toPublicUser = (user: { id: string; email: string; full_name: string; role: string }) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
});

export const register = async (req: Request, res: Response) => {
  const input = parseSchema(registerSchema, req.body);
  const existing = await getUserByEmail(input.email.toLowerCase());
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Email already registered', 'email');
  }

  const user = await createUser({
    id: nanoid(),
    email: input.email.toLowerCase(),
    fullName: input.fullName,
    passwordHash: await hashPassword(input.password),
  });

  const token = signToken({ sub: user.id, role: user.role });

  return res.status(201).json({ data: { token, user: toPublicUser(user) } });
};

export const login = async (req: Request, res: Response) => {
  const input = parseSchema(loginSchema, req.body);
  const user = await getUserByEmail(input.email.toLowerCase());
  if (!user) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  const match = await verifyPassword(input.password, user.password_hash);
  if (!match) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  const token = signToken({ sub: user.id, role: user.role });
  return res.json({ data: { token, user: toPublicUser(user) } });
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const user = await getUserById(req.user.id);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return res.json({ data: { user: toPublicUser(user) } });
};
