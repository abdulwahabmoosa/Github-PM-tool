import { PrismaClient } from '@prisma/client';

const logLevels = process.env.NODE_ENV === 'production'
  ? ['error']
  : ['warn', 'error'];

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: logLevels });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
