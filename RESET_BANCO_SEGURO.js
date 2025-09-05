/**
 * RESET SEGURO DO BANCO DE DADOS
 * 
 * Este script faz reset do banco mantendo APENAS o usuário matriz.
 * 
 * ⚠️  ATENÇÃO: Este processo é IRREVERSÍVEL!
 * ✅ SEMPRE fazer backup antes de executar!
 * 
 * O que será mantido:
 * - Usuário matriz (Administrador)
 * - Categorias, subcategorias, planos
 * - Tipos de conta
 * - Estrutura do banco
 * 
 * O que será removido:
 * - Todos os outros usuários
 * - Todas as contas (exceto matriz)
 * - Todas as transações
 * - Todas as ofertas
 * - Saldos da conta matriz zerados
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Interface para perguntas ao usuário
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para fazer perguntas
function pergunta(questao) {
    return new Promise(resolve => {
        rl.question(questao, resolve);
    });
}

async function identificarMatriz() {
    console.log("🔍 IDENTIFICANDO USUÁRIO MATRIZ...");
    
    const usuarios = await prisma.usuarios.findMany({
        where: { tipo: 'Matriz' }
    });
    
    if (usuarios.length === 0) {
        throw new Error("❌ ERRO CRÍTICO: Nenhum usuário matriz encontrado!");
    }
    
    if (usuarios.length > 1) {
        console.log("⚠️  MÚLTIPLAS MATRIZES ENCONTRADAS:");
        usuarios.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.nome} (${u.email}) - ID: ${u.idUsuario}`);
        });
        throw new Error("❌ ERRO: Múltiplas matrizes encontradas. Corrija manualmente.");
    }
    
    const matriz = usuarios[0];
    console.log("✅ MATRIZ IDENTIFICADA:");
    console.log(`   ID: ${matriz.idUsuario}`);
    console.log(`   Nome: ${matriz.nome}`);
    console.log(`   Email: ${matriz.email}`);
    
    return matriz;
}

async function confirmarReset(matriz) {
    console.log("\n⚠️  CONFIRMAÇÃO DE RESET");
    console.log("=" * 50);
    
    // Contar usuários que serão removidos
    const totalUsuarios = await prisma.usuarios.count();
    const usuariosParaRemover = totalUsuarios - 1;
    
    // Contar outros dados
    const totalContas = await prisma.conta.count();
    
    console.log("📊 SITUAÇÃO ATUAL:");
    console.log(`   • ${totalUsuarios} usuários total`);
    console.log(`   • ${usuariosParaRemover} usuários serão REMOVIDOS`);
    console.log(`   • ${totalContas} contas existem`);
    console.log(`   • ${totalContas - 1} contas serão REMOVIDAS`);
    
    console.log("\n✅ SERÁ MANTIDO:");
    console.log(`   • Usuário: ${matriz.nome} (${matriz.email})`);
    console.log(`   • Conta da matriz (saldos zerados)`);
    console.log(`   • Categorias e subcategorias`);
    console.log(`   • Planos e tipos de conta`);
    
    console.log("\n❌ SERÁ REMOVIDO:");
    console.log(`   • ${usuariosParaRemover} usuários`);
    console.log(`   • ${totalContas - 1} contas`);
    console.log(`   • Todas as transações`);
    console.log(`   • Todas as ofertas`);
    
    console.log("\n🚨 ESTE PROCESSO É IRREVERSÍVEL!");
    
    const resposta1 = await pergunta("\n❓ Você fez BACKUP do banco? (sim/não): ");
    if (resposta1.toLowerCase() !== 'sim') {
        throw new Error("❌ Faça backup antes de continuar!");
    }
    
    const resposta2 = await pergunta("❓ Confirma o RESET COMPLETO? (digite 'CONFIRMO'): ");
    if (resposta2 !== 'CONFIRMO') {
        throw new Error("❌ Reset cancelado pelo usuário");
    }
    
    const resposta3 = await pergunta("❓ ÚLTIMA CONFIRMAÇÃO - Reset será executado (digite 'EXECUTAR'): ");
    if (resposta3 !== 'EXECUTAR') {
        throw new Error("❌ Reset cancelado pelo usuário");
    }
    
    console.log("✅ Confirmações recebidas. Iniciando reset em 3 segundos...");
    await new Promise(resolve => setTimeout(resolve, 3000));
}

async function executarReset(matriz) {
    console.log("\n🚀 INICIANDO RESET DO BANCO DE DADOS");
    console.log("=" * 60);
    
    try {
        // Usar transação para garantir atomicidade
        await prisma.$transaction(async (tx) => {
            console.log("1/6 🗑️  Removendo transações...");
            try {
                const deletedTransacoes = await tx.transacoes.deleteMany({});
                console.log(`   ✅ ${deletedTransacoes.count || 0} transações removidas`);
            } catch (error) {
                console.log(`   ⚠️  Transações: ${error.message.split('.')[0]}`);
            }
            
            console.log("2/6 🗑️  Removendo ofertas...");
            try {
                const deletedOfertas = await tx.ofertas.deleteMany({});
                console.log(`   ✅ ${deletedOfertas.count || 0} ofertas removidas`);
            } catch (error) {
                console.log(`   ⚠️  Ofertas: ${error.message.split('.')[0]}`);
            }
            
            console.log("3/6 🗑️  Removendo contas (exceto matriz)...");
            const deletedContas = await tx.conta.deleteMany({
                where: {
                    usuarioId: {
                        not: matriz.idUsuario
                    }
                }
            });
            console.log(`   ✅ ${deletedContas.count} contas removidas`);
            
            console.log("4/6 🗑️  Removendo usuários (exceto matriz)...");
            const deletedUsuarios = await tx.usuarios.deleteMany({
                where: {
                    idUsuario: {
                        not: matriz.idUsuario
                    }
                }
            });
            console.log(`   ✅ ${deletedUsuarios.count} usuários removidos`);
            
            console.log("5/6 🔄 Zerrando saldos da conta matriz...");
            const contaMatriz = await tx.conta.findFirst({
                where: { usuarioId: matriz.idUsuario }
            });
            
            if (contaMatriz) {
                await tx.conta.update({
                    where: { idConta: contaMatriz.idConta },
                    data: {
                        saldoDinheiro: 0,
                        saldoPermuta: 0,
                        valorVendaMensalAtual: 0,
                        valorVendaTotalAtual: 0
                    }
                });
                console.log(`   ✅ Saldos da conta ${contaMatriz.numeroConta} zerados`);
            } else {
                console.log(`   ⚠️  Conta da matriz não encontrada`);
            }
            
            console.log("6/6 🔄 Resetando dados opcionais do usuário matriz...");
            await tx.usuarios.update({
                where: { idUsuario: matriz.idUsuario },
                data: {
                    reputacao: 0,
                    // Manter dados básicos como nome, email, senha
                }
            });
            console.log(`   ✅ Dados opcionais da matriz resetados`);
        });
        
        console.log("\n🎉 RESET CONCLUÍDO COM SUCESSO!");
        console.log("✅ Banco de dados limpo");
        console.log("✅ Apenas usuário matriz mantido");
        console.log("✅ Sistema pronto para novos testes");
        
    } catch (error) {
        console.error("💥 ERRO DURANTE O RESET:");
        console.error(error.message);
        throw error;
    }
}

async function verificarResultado(matriz) {
    console.log("\n🔍 VERIFICANDO RESULTADO DO RESET");
    console.log("=" * 50);
    
    try {
        const usuarios = await prisma.usuarios.count();
        const contas = await prisma.conta.count();
        
        console.log("📊 SITUAÇÃO PÓS-RESET:");
        console.log(`   • ${usuarios} usuário(s) restante(s)`);
        console.log(`   • ${contas} conta(s) restante(s)`);
        
        if (usuarios === 1 && contas === 1) {
            console.log("✅ RESET PERFEITO! Apenas matriz mantida.");
            
            // Verificar dados da matriz
            const matrizAtual = await prisma.usuarios.findUnique({
                where: { idUsuario: matriz.idUsuario },
                include: { conta: true }
            });
            
            if (matrizAtual) {
                console.log("\n👤 USUÁRIO MATRIZ FINAL:");
                console.log(`   Nome: ${matrizAtual.nome}`);
                console.log(`   Email: ${matrizAtual.email}`);
                console.log(`   Tipo: ${matrizAtual.tipo}`);
                console.log(`   Saldo Dinheiro: R$ ${matrizAtual.conta?.saldoDinheiro || 0}`);
                console.log(`   Saldo Permuta: RT$ ${matrizAtual.conta?.saldoPermuta || 0}`);
            }
            
            return true;
        } else {
            console.log("⚠️  RESULTADO INESPERADO!");
            console.log(`   Esperado: 1 usuário, 1 conta`);
            console.log(`   Encontrado: ${usuarios} usuários, ${contas} contas`);
            return false;
        }
        
    } catch (error) {
        console.error("❌ Erro na verificação:", error.message);
        return false;
    }
}

async function executarResetCompleto() {
    console.log("🗑️  RESET SEGURO DO BANCO DE DADOS");
    console.log("=" * 60);
    console.log("Data/Hora:", new Date().toLocaleString());
    
    try {
        // Passo 1: Identificar matriz
        const matriz = await identificarMatriz();
        
        // Passo 2: Confirmar com usuário
        await confirmarReset(matriz);
        
        // Passo 3: Executar reset
        await executarReset(matriz);
        
        // Passo 4: Verificar resultado
        const sucesso = await verificarResultado(matriz);
        
        if (sucesso) {
            console.log("\n🎉 RESET EXECUTADO COM SUCESSO!");
            console.log("✅ Banco limpo e pronto para testes");
            console.log(`✅ Login: ${matriz.email}`);
            console.log("✅ Senha: (senha original mantida)");
        } else {
            console.log("\n⚠️  RESET COM PROBLEMAS!");
            console.log("🔍 Verifique o banco manualmente");
        }
        
        return sucesso;
        
    } catch (error) {
        console.error("💥 ERRO NO RESET:", error.message);
        return false;
    } finally {
        rl.close();
        await prisma.$disconnect();
    }
}

// Executar reset se chamado diretamente
if (require.main === module) {
    executarResetCompleto()
        .then(sucesso => {
            process.exit(sucesso ? 0 : 1);
        })
        .catch(error => {
            console.error("Erro fatal:", error);
            process.exit(1);
        });
}

module.exports = { executarResetCompleto };