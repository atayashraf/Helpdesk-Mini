import dotenv from 'dotenv';
import path from 'node:path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}. Using safe defaults.`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://neondb_owner:npg_gu6pnrQ1VeWa@ep-muddy-paper-adyhqh22-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MIN ?? 60),
};
