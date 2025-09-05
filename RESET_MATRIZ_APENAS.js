/**
 * RESET MANTENDO APENAS MATRIZ
 * 
 * Limpa todas as tabelas e cria apenas:
 * - Usuário matriz com saldos zerados
 * - Mantém estruturas básicas (tipos de conta, planos, categorias)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function limparDados() {
    console.log('🗑️ Limpando dados do banco (mantendo estrutura)...');
    
    try {
        // Limpar em ordem correta (foreign keys primeiro)
        await prisma.parcelamento.deleteMany({});
        console.log('   ✅ Parcelamentos removidos');
        
        await prisma.voucher.deleteMany({});
        console.log('   ✅ Vouchers removidos');
        
        await prisma.transacao.deleteMany({});
        console.log('   ✅ Transações removidas');
        
        await prisma.imagem.deleteMany({});
        console.log('   ✅ Imagens removidas');
        
        await prisma.oferta.deleteMany({});
        console.log('   ✅ Ofertas removidas');
        
        await prisma.subContas.deleteMany({});
        console.log('   ✅ Subcontas removidas');
        
        await prisma.conta.deleteMany({});
        console.log('   ✅ Contas removidas');
        
        await prisma.usuarios.deleteMany({});
        console.log('   ✅ Usuários removidos');
        
        // Limpar outras tabelas relacionais se existirem
        try {
            await prisma.cobranca.deleteMany({});
            console.log('   ✅ Cobranças removidas');
        } catch (e) { /* tabela pode não existir ou estar vazia */ }
        
        try {
            await prisma.solicitacaoCredito.deleteMany({});
            console.log('   ✅ Solicitações de crédito removidas');
        } catch (e) { /* tabela pode não existir ou estar vazia */ }
        
        try {
            await prisma.fundoPermuta.deleteMany({});
            console.log('   ✅ Fundos de permuta removidos');
        } catch (e) { /* tabela pode não existir ou estar vazia */ }
        
        // Manter estruturas básicas (não deletar)
        console.log('   ✅ Mantendo: categorias, planos, tipos de conta');
        
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error.message);
        throw error;
    }
}

async function criarMatrizZerada() {
    console.log('👑 Criando usuário matriz com saldos zerados...');
    
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
            mostrarNoSite: false,
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
    
    console.log(`✅ Matriz criada: ${matriz.email} (ID: ${matriz.idUsuario})`);
    return matriz;
}

async function criarContaZerada(matriz) {
    console.log('💳 Criando conta matriz com saldos zerados...');
    
    // Buscar tipo de conta Matriz
    const tipoMatriz = await prisma.tipoConta.findFirst({
        where: { tipoDaConta: 'Matriz' }
    });
    
    // Buscar qualquer plano disponível
    const plano = await prisma.plano.findFirst();
    
    const conta = await prisma.conta.create({
        data: {
            numeroConta: "MTZ000001",
            usuarioId: matriz.idUsuario,
            tipoContaId: tipoMatriz?.idTipoConta || 1,
            planoId: plano?.idPlano || 1,
            saldoDinheiro: 0,        // 🎯 ZERADO
            saldoPermuta: 0,         // 🎯 ZERADO
            limiteCredito: 1000000,
            limiteVendaMensal: 1000000,
            limiteVendaTotal: 1000000,
            limiteVendaEmpresa: 1000000,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            taxaRepasseMatriz: 0,
            diaFechamentoFatura: 1,
            dataVencimentoFatura: 1,
            nomeFranquia: "Matriz Principal",
            statusConta: true
        }
    });
    
    console.log(`✅ Conta criada: ${conta.numeroConta} - Saldos: R$ 0,00 | RT$ 0`);
    return conta;
}

async function verificarResultado() {
    console.log('🔍 Verificando resultado...');
    
    const contadores = {
        usuarios: await prisma.usuarios.count(),
        contas: await prisma.conta.count(),
        ofertas: await prisma.oferta.count(),
        transacoes: await prisma.transacao.count(),
        categorias: await prisma.categoria.count(),
        planos: await prisma.plano.count(),
        tiposConta: await prisma.tipoConta.count()
    };
    
    console.log('📊 Estado final do banco:');
    console.log(`   • ${contadores.usuarios} usuário(s)`);
    console.log(`   • ${contadores.contas} conta(s)`);
    console.log(`   • ${contadores.ofertas} ofertas`);
    console.log(`   • ${contadores.transacoes} transações`);
    console.log(`   • ${contadores.categorias} categorias (mantidas)`);
    console.log(`   • ${contadores.planos} planos (mantidos)`);
    console.log(`   • ${contadores.tiposConta} tipos de conta (mantidos)`);
    
    const perfeito = contadores.usuarios === 1 && 
                    contadores.contas === 1 && 
                    contadores.ofertas === 0 && 
                    contadores.transacoes === 0;
    
    if (perfeito) {
        console.log('🎉 PERFEITO! Apenas matriz com banco limpo.');
        return true;
    } else {
        console.log('⚠️  Resultado diferente do esperado.');
        return false;
    }
}

async function main() {
    console.log('🧪 RESET MANTENDO APENAS MATRIZ');
    console.log('=' * 50);
    console.log('Data/Hora:', new Date().toLocaleString());
    
    try {
        // 1. Limpar dados (manter estruturas)
        await limparDados();
        
        // 2. Criar matriz zerada
        const matriz = await criarMatrizZerada();
        
        // 3. Criar conta zerada
        const conta = await criarContaZerada(matriz);
        
        // 4. Verificar resultado
        const sucesso = await verificarResultado();
        
        if (sucesso) {
            console.log('\n🎉 RESET EXECUTADO COM SUCESSO!');
            console.log('✅ Banco limpo mantendo apenas matriz');
            console.log('✅ Saldos zerados para testes');
            console.log('✅ Estruturas básicas mantidas');
            console.log('');
            console.log('=== DADOS DE ACESSO ===');
            console.log('👑 MATRIZ (ÚNICO USUÁRIO):');
            console.log('   Email: usuario.matriz@example.com');
            console.log('   Senha: 123456');
            console.log('   Conta: MTZ000001');
            console.log('   Saldo Dinheiro: R$ 0,00');
            console.log('   Saldo Permuta: RT$ 0');
            console.log('');
            console.log('🧪 Pronto para testes limpos de criação de associados!');
        }
        
    } catch (error) {
        console.error('💥 Erro no reset:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);