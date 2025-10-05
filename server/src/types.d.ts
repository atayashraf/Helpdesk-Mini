import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      role: 'user' | 'agent' | 'admin';
    };
    idempotency?: {
      key: string;
    };
  }
}
