/**
 * SEED PARA TESTES LIMPOS
 * 
 * Este seed cria apenas:
 * - 1 usuário matriz (administrador)
 * - 1 conta para a matriz com saldos zerados
 * - Categorias e subcategorias básicas (necessárias)
 * - Planos básicos (necessários)
 * - Tipos de conta (necessários)
 * 
 * Ideal para testes manuais começando do zero.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function limparBanco() {
    console.log('🗑️ Limpando banco de dados...');
    
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
        console.log('✅ Banco de dados limpo!');
    } catch (error) {
        console.log('❌ Erro ao limpar banco:', error);
    }
}

async function criarTiposConta() {
    console.log('🏷️ Criando tipos de conta...');
    
    const tipos = [
        { tipoDaConta: 'Básica', descricao: 'Conta básica para associados' },
        { tipoDaConta: 'Premium', descricao: 'Conta premium com benefícios extras' },
        { tipoDaConta: 'Matriz', descricao: 'Conta administrativa matriz' },
        { tipoDaConta: 'Franquia', descricao: 'Conta para franquias' },
        { tipoDaConta: 'Gerente', descricao: 'Conta para gerentes' }
    ];
    
    for (const tipo of tipos) {
        await prisma.tipoConta.upsert({
            where: { tipoDaConta: tipo.tipoDaConta },
            update: {},
            create: tipo
        });
    }
    
    console.log('✅ Tipos de conta criados!');
}

async function criarPlanos() {
    console.log('📋 Criando planos...');
    
    const planos = [
        {
            nomePlano: 'Plano Básico',
            tipoDoPlano: 'Associado',
            taxaInscricao: 0,
            taxaComissao: 5,
            taxaManutencaoAnual: 120
        },
        {
            nomePlano: 'Plano Premium',
            tipoDoPlano: 'Associado',
            taxaInscricao: 500,
            taxaComissao: 3,
            taxaManutencaoAnual: 200
        },
        {
            nomePlano: 'Plano Gold',
            tipoDoPlano: 'Associado',
            taxaInscricao: 1000,
            taxaComissao: 2,
            taxaManutencaoAnual: 300
        }
    ];
    
    for (const plano of planos) {
        await prisma.planos.create({
            data: plano
        });
    }
    
    console.log('✅ Planos criados!');
}

async function criarCategorias() {
    console.log('📂 Criando categorias...');
    
    const categorias = [
        {
            nomeCategoria: 'Tecnologia',
            subcategorias: {
                create: [
                    { nomeSubcategoria: 'Computadores' },
                    { nomeSubcategoria: 'Celulares' },
                    { nomeSubcategoria: 'Acessórios' }
                ]
            }
        },
        {
            nomeCategoria: 'Casa e Jardim',
            subcategorias: {
                create: [
                    { nomeSubcategoria: 'Móveis' },
                    { nomeSubcategoria: 'Decoração' },
                    { nomeSubcategoria: 'Jardim' }
                ]
            }
        },
        {
            nomeCategoria: 'Automóveis',
            subcategorias: {
                create: [
                    { nomeSubcategoria: 'Carros' },
                    { nomeSubcategoria: 'Motos' },
                    { nomeSubcategoria: 'Peças' }
                ]
            }
        }
    ];
    
    for (const categoria of categorias) {
        await prisma.categorias.create({
            data: categoria
        });
    }
    
    console.log('✅ Categorias criadas!');
}

async function criarUsuarioMatriz() {
    console.log('👑 Criando usuário matriz...');
    
    // Hash da senha
    const senhaHash = await bcrypt.hash('123456', 10);
    
    const matriz = await prisma.usuarios.create({
        data: {
            nome: 'Administrador Matriz',
            cpf: '111.111.111-11',
            email: 'usuario.matriz@example.com',
            senha: senhaHash,
            tipo: 'Matriz',
            nomeFantasia: 'Matriz Corp',
            razaoSocial: 'Matriz Corporação LTDA',
            cnpj: '11.111.111/0001-11',
            descricao: 'Conta administrativa principal do sistema',
            status: true,
            statusConta: true,
            mostrarNoSite: false,
            reputacao: 5.0,
            nomeContato: 'Administrador Sistema',
            telefone: '(11) 1111-1111',
            celular: '(11) 91111-1111',
            emailContato: 'admin@matriz.com',
            logradouro: 'Rua Matriz, 1',
            numero: 1,
            cep: '11111-111',
            bairro: 'Centro',
            cidade: 'São Paulo',
            estado: 'SP',
            aceitaOrcamento: true,
            aceitaVoucher: true,
            tipoOperacao: 3, // Compra e Venda
            tipoDeMoeda: 'BRL'
        }
    });
    
    console.log(`✅ Matriz criada: ${matriz.email}`);
    return matriz;
}

async function criarContaMatriz(matriz: any) {
    console.log('🏦 Criando conta da matriz...');
    
    // Buscar tipo de conta Matriz
    const tipoContaMatriz = await prisma.tipoConta.findFirst({
        where: { tipoDaConta: 'Matriz' }
    });
    
    if (!tipoContaMatriz) {
        throw new Error('Tipo de conta Matriz não encontrado');
    }
    
    // Buscar plano básico
    const planoBasico = await prisma.planos.findFirst({
        where: { nomePlano: 'Plano Básico' }
    });
    
    if (!planoBasico) {
        throw new Error('Plano básico não encontrado');
    }
    
    const conta = await prisma.conta.create({
        data: {
            numeroConta: 'MTZ000001',
            usuarioId: matriz.idUsuario,
            tipoContaId: tipoContaMatriz.idTipoConta,
            planoId: planoBasico.idPlano,
            saldoDinheiro: 0, // Começar zerado para testes limpos
            saldoPermuta: 0,  // Começar zerado para testes limpos
            limiteCredito: 1000000, // Limite alto para matriz
            limiteVendaMensal: 1000000,
            limiteVendaTotal: 1000000,
            limiteVendaEmpresa: 1000000,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            taxaRepasseMatriz: 0, // Matriz não repassa para ninguém
            diaFechamentoFatura: 1,
            dataVencimentoFatura: 1,
            nomeFranquia: 'Matriz Principal',
            statusConta: true
        }
    });
    
    console.log(`✅ Conta criada: ${conta.numeroConta}`);
    return conta;
}

async function main() {
    console.log('🧪 SEED PARA TESTES LIMPOS');
    console.log('=' * 50);
    console.log('Data/Hora:', new Date().toLocaleString());
    
    try {
        // 1. Limpar banco
        await limparBanco();
        
        // 2. Criar estruturas básicas necessárias
        await criarTiposConta();
        await criarPlanos();
        await criarCategorias();
        
        // 3. Criar usuário matriz
        const matriz = await criarUsuarioMatriz();
        
        // 4. Criar conta da matriz
        const conta = await criarContaMatriz(matriz);
        
        console.log('\n🎉 SEED EXECUTADO COM SUCESSO!');
        console.log('✅ Banco limpo e configurado para testes');
        console.log('');
        console.log('=== DADOS DE ACESSO ===');
        console.log('👑 MATRIZ (ADMINISTRADOR):');
        console.log('   Email: usuario.matriz@example.com');
        console.log('   Senha: 123456');
        console.log('   Conta: MTZ000001');
        console.log('   Saldos: R$ 0,00 | RT$ 0');
        console.log('');
        console.log('🔧 CONFIGURAÇÕES CRIADAS:');
        console.log('   • 5 tipos de conta');
        console.log('   • 3 planos de associado');
        console.log('   • 3 categorias com subcategorias');
        console.log('   • 1 usuário matriz');
        console.log('   • 1 conta zerada');
        console.log('');
        console.log('✅ Sistema pronto para testes manuais!');
        
    } catch (error) {
        console.error('❌ Erro ao executar seed:', error);
        process.exit(1);
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