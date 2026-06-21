import { PrismaClient } from '@prisma/client';

// Define a fallback DATABASE_URL if missing to prevent Prisma Client from crashing on startup
if (!process.env.DATABASE_URL) {
  console.warn('[Prisma] WARNING: DATABASE_URL environment variable is not defined. Falling back to a dummy postgres URL to prevent startup crash.');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/docket?schema=public';
}

// Singleton pattern — prevents exhausting Postgres connections when the dev
// server hot-reloads (each reload would otherwise spin up a brand new
// PrismaClient and leak a new connection pool).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}