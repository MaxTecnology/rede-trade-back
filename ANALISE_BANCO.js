/**
 * ANÁLISE COMPLETA DO BANCO DE DADOS
 * 
 * Este script analisa a estrutura atual do banco para entender:
 * 1. Quais usuários existem e seus tipos
 * 2. Qual é o usuário matriz (administrador)
 * 3. Estrutura de relacionamentos entre tabelas
 * 4. Dados que precisam ser preservados ou removidos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analisarUsuarios() {
    console.log("👥 ANÁLISE: Usuários no sistema");
    console.log("=" * 50);
    
    try {
        const usuarios = await prisma.usuarios.findMany({
            include: {
                conta: true,
                transacoesComprador: true,
                transacoesVendedor: true,
                ofertas: true,
                subcontas: true
            },
            orderBy: {
                idUsuario: 'asc'
            }
        });
        
        console.log(`📊 Total de usuários: ${usuarios.length}`);
        console.log("\n🔍 DETALHES DOS USUÁRIOS:");
        
        let usuarioMatriz = null;
        
        usuarios.forEach((usuario, index) => {
            console.log(`\n${index + 1}. USUÁRIO ID: ${usuario.idUsuario}`);
            console.log(`   Nome: ${usuario.nome}`);
            console.log(`   Email: ${usuario.email}`);
            console.log(`   Tipo: ${usuario.tipo}`);
            console.log(`   Nome Fantasia: ${usuario.nomeFantasia || 'N/A'}`);
            console.log(`   CPF: ${usuario.cpf || 'N/A'}`);
            console.log(`   Status: ${usuario.status ? 'Ativo' : 'Inativo'}`);
            console.log(`   Tem conta: ${usuario.conta ? 'Sim' : 'Não'}`);
            console.log(`   Transações compra: ${usuario.transacoesComprador.length}`);
            console.log(`   Transações venda: ${usuario.transacoesVendedor.length}`);
            console.log(`   Ofertas criadas: ${usuario.ofertas.length}`);
            console.log(`   Subcontas: ${usuario.subcontas.length}`);
            
            if (usuario.tipo === 'Matriz') {
                usuarioMatriz = usuario;
                console.log(`   🎯 ESTE É O USUÁRIO MATRIZ (ADMINISTRADOR)`);
            }
        });
        
        return { usuarios, usuarioMatriz };
        
    } catch (error) {
        console.error("❌ Erro ao analisar usuários:", error);
        return null;
    }
}

async function analisarContas() {
    console.log("\n💳 ANÁLISE: Contas no sistema");
    console.log("=" * 50);
    
    try {
        const contas = await prisma.conta.findMany({
            include: {
                usuario: true,
                subcontas: true,
                transacoesOrigem: true,
                transacoesDestino: true
            }
        });
        
        console.log(`📊 Total de contas: ${contas.length}`);
        
        contas.forEach((conta, index) => {
            console.log(`\n${index + 1}. CONTA ID: ${conta.idConta}`);
            console.log(`   Número: ${conta.numeroConta}`);
            console.log(`   Usuário: ${conta.usuario.nome} (${conta.usuario.tipo})`);
            console.log(`   Saldo Dinheiro: R$ ${conta.saldoDinheiro}`);
            console.log(`   Saldo Permuta: RT$ ${conta.saldoPermuta}`);
            console.log(`   Limite Crédito: R$ ${conta.limiteCredito}`);
            console.log(`   Subcontas: ${conta.subcontas.length}`);
            console.log(`   Transações: ${conta.transacoesOrigem.length + conta.transacoesDestino.length}`);
        });
        
        return contas;
        
    } catch (error) {
        console.error("❌ Erro ao analisar contas:", error);
        return null;
    }
}

async function analisarOfertas() {
    console.log("\n🛒 ANÁLISE: Ofertas no sistema");
    console.log("=" * 50);
    
    try {
        const ofertas = await prisma.ofertas.findMany({
            include: {
                usuario: true,
                categoria: true,
                subcategoria: true,
                transacoes: true
            }
        });
        
        console.log(`📊 Total de ofertas: ${ofertas.length}`);
        
        ofertas.forEach((oferta, index) => {
            console.log(`\n${index + 1}. OFERTA ID: ${oferta.idOferta}`);
            console.log(`   Título: ${oferta.titulo}`);
            console.log(`   Valor: R$ ${oferta.valor}`);
            console.log(`   Criador: ${oferta.usuario.nome} (${oferta.usuario.tipo})`);
            console.log(`   Categoria: ${oferta.categoria?.nomeCategoria || 'N/A'}`);
            console.log(`   Status: ${oferta.status ? 'Ativa' : 'Inativa'}`);
            console.log(`   Transações: ${oferta.transacoes.length}`);
        });
        
        return ofertas;
        
    } catch (error) {
        console.error("❌ Erro ao analisar ofertas:", error);
        return null;
    }
}

async function analisarTransacoes() {
    console.log("\n💸 ANÁLISE: Transações no sistema");
    console.log("=" * 50);
    
    try {
        const transacoes = await prisma.transacoes.findMany({
            include: {
                contaOrigem: {
                    include: { usuario: true }
                },
                contaDestino: {
                    include: { usuario: true }
                },
                oferta: true
            }
        });
        
        console.log(`📊 Total de transações: ${transacoes.length}`);
        
        if (transacoes.length > 0) {
            console.log("\n🔍 Resumo das transações:");
            transacoes.forEach((transacao, index) => {
                console.log(`${index + 1}. ID: ${transacao.idTransacao} | Valor: R$ ${transacao.valor} | ${transacao.contaOrigem.usuario.nome} → ${transacao.contaDestino.usuario.nome}`);
            });
        }
        
        return transacoes;
        
    } catch (error) {
        console.error("❌ Erro ao analisar transações:", error);
        return null;
    }
}

async function analisarDependencias() {
    console.log("\n🔗 ANÁLISE: Dependências e relacionamentos");
    console.log("=" * 50);
    
    const tabelas = [
        'categorias',
        'subcategorias', 
        'planos',
        'tipoConta',
        'subcontas',
        'cobrancas',
        'vouchers'
    ];
    
    for (const tabela of tabelas) {
        try {
            const count = await prisma[tabela].count();
            console.log(`📋 ${tabela}: ${count} registros`);
        } catch (error) {
            console.log(`❌ ${tabela}: Erro ao contar (${error.message})`);
        }
    }
}

async function gerarResumoReset() {
    console.log("\n📋 RESUMO PARA RESET DO BANCO");
    console.log("=" * 60);
    
    const analise = await analisarUsuarios();
    
    if (!analise || !analise.usuarioMatriz) {
        console.log("❌ ERRO: Não foi possível identificar usuário matriz!");
        console.log("🚨 ATENÇÃO: Sem usuário matriz, o reset não é seguro!");
        return null;
    }
    
    const { usuarioMatriz, usuarios } = analise;
    const outrosUsuarios = usuarios.filter(u => u.idUsuario !== usuarioMatriz.idUsuario);
    
    console.log("✅ USUÁRIO MATRIZ IDENTIFICADO:");
    console.log(`   ID: ${usuarioMatriz.idUsuario}`);
    console.log(`   Nome: ${usuarioMatriz.nome}`);
    console.log(`   Email: ${usuarioMatriz.email}`);
    console.log(`   Tipo: ${usuarioMatriz.tipo}`);
    
    console.log("\n🗑️  USUÁRIOS QUE SERÃO REMOVIDOS:");
    if (outrosUsuarios.length === 0) {
        console.log("   ✅ Nenhum usuário será removido (só existe a matriz)");
    } else {
        outrosUsuarios.forEach(user => {
            console.log(`   • ${user.nome} (${user.email}) - Tipo: ${user.tipo}`);
        });
    }
    
    console.log("\n🔧 AÇÕES DO RESET:");
    console.log("   1. Remover todas as transações");
    console.log("   2. Remover todas as ofertas"); 
    console.log("   3. Remover todas as contas (exceto da matriz)");
    console.log("   4. Remover todos os usuários (exceto matriz)");
    console.log("   5. Resetar saldos da conta matriz para 0");
    console.log("   6. Manter categorias, planos e configurações básicas");
    
    return usuarioMatriz;
}

async function executarAnaliseCompleta() {
    console.log("🔍 ANÁLISE COMPLETA DO BANCO DE DADOS");
    console.log("=" * 60);
    console.log("Data/Hora:", new Date().toLocaleString());
    
    try {
        await analisarUsuarios();
        await analisarContas();
        await analisarOfertas();
        await analisarTransacoes();
        await analisarDependencias();
        
        const usuarioMatriz = await gerarResumoReset();
        
        if (usuarioMatriz) {
            console.log("\n✅ ANÁLISE CONCLUÍDA COM SUCESSO!");
            console.log("🎯 Reset seguro pode ser executado");
            console.log(`🔐 Usuário matriz preservado: ${usuarioMatriz.nome}`);
        } else {
            console.log("\n❌ ANÁLISE COM PROBLEMAS!");
            console.log("🚨 Reset NÃO é seguro sem usuário matriz");
        }
        
    } catch (error) {
        console.error("💥 Erro na análise:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Executar análise
if (require.main === module) {
    executarAnaliseCompleta().catch(console.error);
}

module.exports = { executarAnaliseCompleta };