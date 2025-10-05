import crypto from 'node:crypto';

export const hashPayload = (value: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
