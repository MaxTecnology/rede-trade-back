import { PrismaClient } from "@prisma/client";
import { logger } from "./utils/logger";
import { clearDatabase } from "./utils/database";
import { seedUsuarios } from "./seeders/usuarios.seeder";
import { seedCategorias } from "./seeders/categorias.seeder";
import { seedContas } from "./seeders/contas.seeder";
import { seedOfertas } from "./seeders/ofertas.seeder";
import { seedTransacoes } from "./seeders/transacoes.seeder";

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
    logger.info('👤 Criando usuários...');
    const usuarios = await seedUsuarios(prisma);

    logger.info('🏷️ Criando categorias e subcategorias...');
    const categorias = await seedCategorias(prisma);

    logger.info('🏦 Criando contas...');
    const contas = await seedContas(prisma, usuarios);

    logger.info('🛍️ Criando ofertas...');
    const ofertas = await seedOfertas(prisma, usuarios, categorias);

    logger.info('💰 Criando transações...');
    const transacoes = await seedTransacoes(prisma, usuarios, ofertas);

    logger.success('✅ Seeds executados com sucesso!');
    logger.info('');
    logger.info('=== DADOS DE ACESSO ===');
    logger.info('👑 Matriz: usuario.matriz@example.com | Senha: 123456');
    logger.info('👨‍💼 Gerente: gerente.conta@example.com | Senha: 123456');
    logger.info('👤 Usuário: usuario.comum@example.com | Senha: 123456');
    logger.info('🏢 Franquia A: franquia.a@example.com | Senha: senha101');
    logger.info('🏢 Franquia B: franquia.b@example.com | Senha: senha102');
    
    return {
      usuarios,
      categorias,
      contas,
      ofertas,
      transacoes
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