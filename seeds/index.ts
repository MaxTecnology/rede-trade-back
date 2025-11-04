import { PrismaClient } from "@prisma/client";
import { logger } from "./utils/logger";
import { clearDatabase } from "./utils/database";
import { seedUsuarios } from "./seeders/usuarios.seeder";

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('🌱 Iniciando processo de seeding...');
    
    // Limpar banco de dados (opcional)
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearDatabase(prisma);
    }

    // Executar seeds em ordem
    logger.info('👤 Criando usuário Matriz...');
    const matriz = await seedUsuarios(prisma);

    logger.success('✅ Seeds executados com sucesso!');
    logger.info('');
    logger.info('=== DADOS DE ACESSO ===');
    logger.info(`👑 Matriz: ${matriz.email} | Senha: 123456`);

    return {
      matriz
    };

  } catch (error) {
    logger.error('❌ Erro ao executar seeds:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
