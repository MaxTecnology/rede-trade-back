import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

export async function clearDatabase(prisma: PrismaClient) {
  logger.warning('🗑️ Limpando banco de dados...');
  
  const tablenames = await prisma.$queryRaw<Array<{tablename: string}>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter(name => name !== '_prisma_migrations')
    .map(name => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    logger.success('✅ Banco de dados limpo!');
  } catch (error) {
    logger.error('❌ Erro ao limpar banco:', error);
  }
}
