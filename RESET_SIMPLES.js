/**
 * RESET SIMPLES DO BANCO
 * 
 * 1. Executa prisma migrate reset (recria banco limpo)
 * 2. Cria apenas usuário matriz com saldos zerados
 * 
 * Muito mais simples e seguro que scripts customizados!
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function resetMigrations() {
    console.log('🔄 Executando reset das migrations...');
    console.log('⚠️  Isso vai recriar o banco completamente!');
    
    try {
        // Executar prisma migrate reset
        execSync('npx prisma migrate reset --force', { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        console.log('✅ Migrations resetadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao resetar migrations:', error.message);
        throw error;
    }
}

async function criarUsuarioMatriz() {
    console.log('👑 Criando usuário matriz...');
    
    // Dados do usuário matriz (baseado no seed existente)
    const senhaHash = await bcrypt.hash('123456', 10);
    
    const matriz = await prisma.usuarios.create({
        data: {
            nome: "Administrador Matriz",
            cpf: "111.111.111-11",
            email: "usuario.matriz@example.com", 
            senha: senhaHash,
            statusConta: true,
            reputacao: 5.0,
            razaoSocial: "Matriz Corporação LTDA",
            nomeFantasia: "Matriz Corp",
            cnpj: "11.111.111/0001-11",
            inscEstadual: "111.111.111",
            inscMunicipal: "111.111.111",
            mostrarNoSite: false, // Matriz não aparece no site
            descricao: "Administração central do sistema",
            tipo: "Matriz",
            tipoDeMoeda: "BRL", 
            status: true,
            nomeContato: "Admin Matriz",
            telefone: "(11) 3333-4444",
            celular: "(11) 99999-8888",
            emailContato: "contato@matrizcorp.com.br",
            emailSecundario: "admin@matrizcorp.com.br",
            site: "https://www.matrizcorp.com.br",
            logradouro: "Avenida Paulista",
            numero: 1000,
            cep: "01310-000",
            complemento: "Conjunto 101",
            bairro: "Bela Vista", 
            cidade: "São Paulo",
            estado: "SP",
            regiao: "Sudeste",
            aceitaOrcamento: true,
            aceitaVoucher: true,
            tipoOperacao: 3 // Compra e venda
        }
    });
    
    console.log(`✅ Usuário matriz criado: ${matriz.email}`);
    return matriz;
}

async function criarContaMatriz(matriz) {
    console.log('💳 Criando conta matriz com saldos zerados...');
    
    // Buscar tipo de conta para matriz
    const tipoConta = await prisma.tipoConta.findFirst({
        where: { tipoDaConta: 'Matriz' }
    });
    
    if (!tipoConta) {
        throw new Error('Tipo de conta Matriz não encontrado após migrations!');
    }
    
    // Buscar um plano (qualquer um para a matriz)
    const plano = await prisma.planos.findFirst();
    
    if (!plano) {
        throw new Error('Nenhum plano encontrado após migrations!');
    }
    
    const conta = await prisma.conta.create({
        data: {
            numeroConta: "MTZ000001",
            usuarioId: matriz.idUsuario,
            tipoContaId: tipoConta.idTipoConta,
            planoId: plano.idPlano,
            saldoDinheiro: 0,        // 🎯 ZERADO PARA TESTES
            saldoPermuta: 0,         // 🎯 ZERADO PARA TESTES  
            limiteCredito: 1000000,  // Alto para matriz
            limiteVendaMensal: 1000000,
            limiteVendaTotal: 1000000, 
            limiteVendaEmpresa: 1000000,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            taxaRepasseMatriz: 0,    // Matriz não repassa
            diaFechamentoFatura: 1,
            dataVencimentoFatura: 1,
            nomeFranquia: "Matriz Principal",
            statusConta: true
        }
    });
    
    console.log(`✅ Conta criada: ${conta.numeroConta} (saldos zerados)`);
    return conta;
}

async function verificarEstrutura() {
    console.log('🔍 Verificando estrutura criada pelas migrations...');
    
    // Verificar se tabelas essenciais existem
    const contadores = await Promise.all([
        prisma.tipoConta.count(),
        prisma.planos.count(), 
        prisma.categorias.count(),
        prisma.usuarios.count(),
        prisma.conta.count()
    ]);
    
    console.log('📊 Estrutura do banco:');
    console.log(`   • ${contadores[0]} tipos de conta`);
    console.log(`   • ${contadores[1]} planos`); 
    console.log(`   • ${contadores[2]} categorias`);
    console.log(`   • ${contadores[3]} usuários`);
    console.log(`   • ${contadores[4]} contas`);
    
    if (contadores[0] === 0 || contadores[1] === 0 || contadores[2] === 0) {
        throw new Error('❌ Estrutura básica não criada pelas migrations!');
    }
    
    console.log('✅ Estrutura básica OK!');
}

async function main() {
    console.log('🚀 RESET SIMPLES DO BANCO DE DADOS');
    console.log('=' * 50);
    console.log('Data/Hora:', new Date().toLocaleString());
    
    try {
        // 1. Reset migrations (recria banco limpo)
        await resetMigrations();
        
        // 2. Verificar estrutura
        await verificarEstrutura();
        
        // 3. Criar usuário matriz 
        const matriz = await criarUsuarioMatriz();
        
        // 4. Criar conta matriz zerada
        const conta = await criarContaMatriz(matriz);
        
        console.log('\n🎉 RESET EXECUTADO COM SUCESSO!');
        console.log('✅ Banco limpo e recriado pelas migrations');
        console.log('✅ Estruturas básicas criadas automaticamente');
        console.log('✅ Apenas usuário matriz criado');
        console.log('');
        console.log('=== DADOS DE ACESSO ===');
        console.log('👑 MATRIZ (ADMINISTRADOR):');
        console.log('   Email: usuario.matriz@example.com');
        console.log('   Senha: 123456');
        console.log('   Conta: MTZ000001');
        console.log('   Saldo Dinheiro: R$ 0,00');
        console.log('   Saldo Permuta: RT$ 0');
        console.log('');
        console.log('✅ Pronto para seus testes manuais! 🧪');
        
    } catch (error) {
        console.error('💥 Erro no reset:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);