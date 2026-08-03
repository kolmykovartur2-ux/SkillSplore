import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { marketingPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.marketingPrisma ??
  new PrismaClient({
    log: process.env.APP_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.marketingPrisma = prisma;
