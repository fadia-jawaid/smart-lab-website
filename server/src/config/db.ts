import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export async function connectDB(): Promise<void> {
  try {
    await db.$connect();
    console.log('✅  Database connected (SQLite via Prisma)');
  } catch (err) {
    console.error('❌  Database connection failed:', err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await db.$disconnect();
  console.log('Database disconnected');
}