const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando oferta ID 10...');
    
    const oferta = await prisma.oferta.findUnique({
      where: { idOferta: 10 },
      select: {
        idOferta: true,
        titulo: true,
        descricao: true,
        limiteCompra: true,
        valor: true,
        quantidade: true,
        retirada: true,
        obs: true
      }
    });
    
    if (oferta) {
      console.log('✅ Oferta encontrada:');
      console.log(JSON.stringify(oferta, null, 2));
      console.log('\n🎯 Análise específica:');
      console.log('limiteCompra:', oferta.limiteCompra, '(tipo:', typeof oferta.limiteCompra, ')');
      console.log('descricao:', oferta.descricao, '(tipo:', typeof oferta.descricao, ')');
    } else {
      console.log('❌ Oferta não encontrada!');
    }
    
    // Verificar todas as ofertas do usuário 1
    console.log('\n🔍 Verificando todas as ofertas do usuário 1...');
    
    const ofertas = await prisma.oferta.findMany({
      where: { usuarioId: 1 },
      select: {
        idOferta: true,
        titulo: true,
        limiteCompra: true,
        descricao: true
      }
    });
    
    console.log('📊 Total de ofertas:', ofertas.length);
    ofertas.forEach(oferta => {
      console.log(`ID ${oferta.idOferta}: limiteCompra=${oferta.limiteCompra}, descricao="${oferta.descricao}"`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();