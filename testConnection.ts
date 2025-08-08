import prisma from './src/lib/prisma';

async function testConnection() {
  try {
    // Teste de conexão com limitação de resultados para performance
    const users = await prisma.usuarios.findMany({
      take: 5, // Limitar a 5 resultados para teste
      select: {
        idUsuario: true,
        nome: true,
        email: true,
        tipo: true,
        statusConta: true
      }
    });
    console.log('Conexão bem-sucedida:', users);
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
  } finally {
    // Não desconectar o singleton, deixar o Node.js gerenciar
    console.log('Teste de conexão finalizado');
  }
}

testConnection();