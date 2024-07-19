import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Tenta recuperar a lista de usuários (ou qualquer outra tabela que você tenha)
    const users = await prisma.usuarios.findMany();
    console.log('Conexão bem-sucedida:', users);
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();