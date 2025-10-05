import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@/config/env';

type Payload = {
  sub: string;
  role: 'user' | 'agent' | 'admin';
};

export const signToken = (payload: Payload, expiresIn: string | number = env.jwtExpiresIn) =>
  jwt.sign(payload, env.jwtSecret as jwt.Secret, { expiresIn: expiresIn as SignOptions['expiresIn'] });

export const verifyToken = (token: string): Payload =>
  jwt.verify(token, env.jwtSecret as jwt.Secret) as Payload;
