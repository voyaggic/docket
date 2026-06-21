import { PrismaClient } from '@prisma/client';

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