/**
 * ANÁLISE SIMPLIFICADA DO BANCO DE DADOS
 * 
 * Este script analisa o banco usando apenas consultas básicas
 * para identificar o usuário matriz e preparar reset seguro.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analisarUsuarios() {
    console.log("👥 ANÁLISE: Usuários no sistema");
    console.log("=" * 50);
    
    try {
        // Consulta básica sem includes complexos
        const usuarios = await prisma.usuarios.findMany({
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
            console.log(`   CPF: ${usuario.cpf || 'N/A'}`);
            console.log(`   Tipo: ${usuario.tipo}`);
            console.log(`   Nome Fantasia: ${usuario.nomeFantasia || 'N/A'}`);
            console.log(`   Status: ${usuario.status ? 'Ativo' : 'Inativo'}`);
            console.log(`   Criado por: ${usuario.usuarioCriadorId || 'Sistema'}`);
            console.log(`   Matriz ID: ${usuario.matrizId || 'N/A'}`);
            
            if (usuario.tipo === 'Matriz') {
                usuarioMatriz = usuario;
                console.log(`   🎯 ESTE É O USUÁRIO MATRIZ (ADMINISTRADOR)`);
            }
        });
        
        return { usuarios, usuarioMatriz };
        
    } catch (error) {
        console.error("❌ Erro ao analisar usuários:", error.message);
        return null;
    }
}

async function analisarContas() {
    console.log("\n💳 ANÁLISE: Contas no sistema");
    console.log("=" * 50);
    
    try {
        const contas = await prisma.conta.findMany({
            orderBy: {
                idConta: 'asc'
            }
        });
        
        console.log(`📊 Total de contas: ${contas.length}`);
        
        for (let i = 0; i < contas.length; i++) {
            const conta = contas[i];
            
            // Buscar usuário da conta separadamente
            const usuario = await prisma.usuarios.findUnique({
                where: { idUsuario: conta.usuarioId }
            });
            
            console.log(`\n${i + 1}. CONTA ID: ${conta.idConta}`);
            console.log(`   Número: ${conta.numeroConta}`);
            console.log(`   Usuário: ${usuario?.nome || 'N/A'} (${usuario?.tipo || 'N/A'})`);
            console.log(`   Saldo Dinheiro: R$ ${conta.saldoDinheiro || 0}`);
            console.log(`   Saldo Permuta: RT$ ${conta.saldoPermuta || 0}`);
            console.log(`   Limite Crédito: R$ ${conta.limiteCredito || 0}`);
        }
        
        return contas;
        
    } catch (error) {
        console.error("❌ Erro ao analisar contas:", error.message);
        return null;
    }
}

async function contarTabelas() {
    console.log("\n📊 ANÁLISE: Contagem de registros");
    console.log("=" * 50);
    
    const tabelas = [
        { nome: 'usuarios', model: 'usuarios' },
        { nome: 'conta', model: 'conta' },
        { nome: 'ofertas', model: 'ofertas' },
        { nome: 'transacoes', model: 'transacoes' },
        { nome: 'categorias', model: 'categorias' },
        { nome: 'subcategorias', model: 'subcategorias' },
        { nome: 'planos', model: 'planos' },
        { nome: 'tipoConta', model: 'tipoConta' }
    ];
    
    for (const tabela of tabelas) {
        try {
            const count = await prisma[tabela.model].count();
            console.log(`📋 ${tabela.nome}: ${count} registros`);
        } catch (error) {
            console.log(`❌ ${tabela.nome}: Erro (${error.message.split('.')[0]})`);
        }
    }
}

async function gerarPlanoReset(usuarioMatriz, usuarios) {
    console.log("\n📋 PLANO DE RESET DO BANCO");
    console.log("=" * 60);
    
    if (!usuarioMatriz) {
        console.log("❌ ERRO CRÍTICO: Usuário matriz não identificado!");
        console.log("🚨 RESET NÃO É SEGURO!");
        return null;
    }
    
    const outrosUsuarios = usuarios.filter(u => u.idUsuario !== usuarioMatriz.idUsuario);
    
    console.log("✅ USUÁRIO MATRIZ (SERÁ PRESERVADO):");
    console.log(`   🔐 ID: ${usuarioMatriz.idUsuario}`);
    console.log(`   👤 Nome: ${usuarioMatriz.nome}`);
    console.log(`   📧 Email: ${usuarioMatriz.email}`);
    console.log(`   🏢 Tipo: ${usuarioMatriz.tipo}`);
    
    console.log(`\n🗑️  USUÁRIOS A SEREM REMOVIDOS (${outrosUsuarios.length}):`);
    if (outrosUsuarios.length === 0) {
        console.log("   ✅ Nenhum (só existe a matriz)");
    } else {
        outrosUsuarios.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.nome} (${user.email}) - ${user.tipo}`);
        });
    }
    
    console.log("\n🔧 SEQUÊNCIA DE RESET (ORDEM IMPORTANTE):");
    console.log("   1. 🗑️  Deletar transações (se existirem)");
    console.log("   2. 🗑️  Deletar ofertas (se existirem)");
    console.log("   3. 🗑️  Deletar contas dos outros usuários");
    console.log("   4. 🗑️  Deletar outros usuários (manter matriz)");
    console.log("   5. 🔄 Resetar saldos da conta matriz para 0");
    console.log("   6. ✅ Manter: categorias, planos, tipos de conta");
    
    console.log("\n⚠️  CONFIRMAÇÕES NECESSÁRIAS:");
    console.log("   • Backup foi feito? (recomendado)");
    console.log("   • Usuário matriz correto identificado?");
    console.log("   • Processo será irreversível!");
    
    return {
        usuarioMatriz,
        outrosUsuarios,
        totalUsuarios: usuarios.length,
        usuariosParaRemover: outrosUsuarios.length
    };
}

async function executarAnalise() {
    console.log("🔍 ANÁLISE PARA RESET DO BANCO DE DADOS");
    console.log("=" * 60);
    console.log("Data/Hora:", new Date().toLocaleString());
    
    try {
        // Analisar usuários
        const resultadoUsuarios = await analisarUsuarios();
        if (!resultadoUsuarios) {
            throw new Error("Falha na análise de usuários");
        }
        
        // Analisar contas
        await analisarContas();
        
        // Contar tabelas
        await contarTabelas();
        
        // Gerar plano de reset
        const plano = await gerarPlanoReset(
            resultadoUsuarios.usuarioMatriz, 
            resultadoUsuarios.usuarios
        );
        
        if (plano) {
            console.log("\n✅ ANÁLISE CONCLUÍDA COM SUCESSO!");
            console.log("🎯 Reset pode ser executado com segurança");
            console.log(`🔐 Matriz preservada: ${plano.usuarioMatriz.nome}`);
            console.log(`🗑️  ${plano.usuariosParaRemover} usuários serão removidos`);
            
            return plano;
        } else {
            console.log("\n❌ ANÁLISE FALHOU!");
            console.log("🚨 Reset NÃO é seguro");
            return null;
        }
        
    } catch (error) {
        console.error("💥 Erro crítico na análise:", error.message);
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

// Executar análise
if (require.main === module) {
    executarAnalise().catch(console.error);
}

module.exports = { executarAnalise };