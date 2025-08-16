const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('🔍 Teste direto da query que a API usa...');
    
    // Simular exatamente a query da API
    const whereClause = {
      usuarioId: 1,
      status: true,
      vencimento: {
        gt: new Date()
      }
    };
    
    console.log('📋 whereClause:', JSON.stringify(whereClause, null, 2));
    
    const ofertas = await prisma.oferta.findMany({
      where: whereClause,
      take: 10,
      skip: 0,
      select: {
        idOferta: true,
        titulo: true,
        tipo: true,
        status: true,
        descricao: true,
        quantidade: true,
        valor: true,
        limiteCompra: true,
        vencimento: true,
        cidade: true,
        estado: true,
        retirada: true,
        obs: true,
        imagens: true,
        createdAt: true,
        categoria: {
          select: {
            idCategoria: true,
            nomeCategoria: true,
          },
        },
        usuario: {
          select: {
            idUsuario: true,
            nome: true,
            tipo: true,
            nomeFantasia: true,
          },
        },
        subconta: {
          select: {
            idSubContas: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('📊 Total ofertas encontradas:', ofertas.length);
    
    if (ofertas.length > 0) {
      console.log('🎯 Primeira oferta:');
      console.log('- idOferta:', ofertas[0].idOferta);
      console.log('- titulo:', ofertas[0].titulo);
      console.log('- limiteCompra:', ofertas[0].limiteCompra, '(tipo:', typeof ofertas[0].limiteCompra, ')');
      console.log('- descricao:', ofertas[0].descricao);
      console.log('- Propriedades disponíveis:', Object.keys(ofertas[0]));
      console.log('- JSON completo:', JSON.stringify(ofertas[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();