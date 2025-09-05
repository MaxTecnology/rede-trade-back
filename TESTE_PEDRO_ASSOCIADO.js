// TESTE_PEDRO_ASSOCIADO.js
// Teste específico para o usuário Pedro Associado e dados do dashboard

const axios = require('axios');

// Configurações de teste
const BASE_URL = 'http://localhost:3024';
const TEST_CONFIG = {
    timeout: 30000,
    validateStatus: (status) => status < 500
};

// Cores para output
const cores = {
    verde: '\x1b[32m',
    vermelho: '\x1b[31m',
    amarelo: '\x1b[33m',
    azul: '\x1b[34m',
    magenta: '\x1b[35m',
    ciano: '\x1b[36m',
    reset: '\x1b[0m',
    negrito: '\x1b[1m'
};

const log = (cor, texto) => {
    console.log(`${cor}${texto}${cores.reset}`);
};

let authToken = null;
let pedroData = null;

// Função para fazer login como Pedro
async function loginPedro() {
    try {
        log(cores.azul, '\n🔐 === LOGIN PEDRO ASSOCIADO ===');
        
        const response = await axios.post(`${BASE_URL}/usuarios/login`, {
            login: 'pedro.associado@example.com',
            senha: '123456'
        }, TEST_CONFIG);
        
        if (response.data && response.data.token) {
            authToken = response.data.token;
            pedroData = response.data.user;
            log(cores.verde, `✅ Login realizado com sucesso`);
            log(cores.ciano, `👤 Usuário: ${pedroData.nome}`);
            log(cores.ciano, `🏢 Tipo: ${pedroData.tipo}`);
            log(cores.ciano, `📧 Email: ${pedroData.email}`);
            log(cores.ciano, `⭐ Reputação: ${pedroData.reputacao}`);
            log(cores.ciano, `📊 Status: ${pedroData.status ? 'Ativo' : 'Inativo'}`);
            log(cores.ciano, `💰 Limite Crédito: RT$ ${pedroData.conta?.limiteCredito || 'N/A'}`);
            log(cores.ciano, `💱 Saldo Permuta: RT$ ${pedroData.conta?.saldoPermuta || 'N/A'}`);
            return true;
        }
        
        return false;
    } catch (error) {
        log(cores.vermelho, `❌ Erro no login: ${error.message}`);
        return false;
    }
}

// Função para fazer requisições autenticadas
async function apiRequest(endpoint) {
    const config = {
        method: 'GET',
        url: `${BASE_URL}${endpoint}`,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        ...TEST_CONFIG
    };
    
    return axios(config);
}

// Teste 1: Verificar dados específicos do Pedro
async function testeDadosPedro() {
    log(cores.azul, '\n👤 === DADOS ESPECÍFICOS DO PEDRO ===');
    
    try {
        // Buscar perfil completo do Pedro
        const responsePerfil = await apiRequest('/usuarios/perfil');
        
        if (responsePerfil.data) {
            const pedro = responsePerfil.data;
            log(cores.ciano, `📊 DADOS COMPLETOS DO PEDRO:`);
            log(cores.ciano, `   ID: ${pedro.idUsuario}`);
            log(cores.ciano, `   Nome: ${pedro.nome}`);
            log(cores.ciano, `   Email: ${pedro.email}`);
            log(cores.ciano, `   CPF: ${pedro.cpf}`);
            log(cores.ciano, `   Tipo: ${pedro.tipo}`);
            log(cores.ciano, `   Reputação: ${pedro.reputacao} ⭐`);
            log(cores.ciano, `   Status: ${pedro.status ? 'Ativo' : 'Inativo'}`);
            log(cores.ciano, `   Status Conta: ${pedro.statusConta ? 'Ativo' : 'Inativo'}`);
            
            if (pedro.conta) {
                log(cores.ciano, `   📊 DADOS DA CONTA:`);
                log(cores.ciano, `      Número: ${pedro.conta.numeroConta}`);
                log(cores.ciano, `      Limite Crédito: RT$ ${pedro.conta.limiteCredito}`);
                log(cores.ciano, `      Saldo Permuta: RT$ ${pedro.conta.saldoPermuta}`);
                log(cores.ciano, `      Limite Disponível: RT$ ${pedro.conta.limiteDisponivel || 'N/A'}`);
                log(cores.ciano, `      Saldo Dinheiro: RT$ ${pedro.conta.saldoDinheiro || 'N/A'}`);
                
                if (pedro.conta.gerenteConta) {
                    log(cores.ciano, `      Gerente: ${pedro.conta.gerenteConta.nome}`);
                }
            }
            
            if (pedro.transacoesComprador && pedro.transacoesComprador.length > 0) {
                log(cores.ciano, `   💰 TRANSAÇÕES COMO COMPRADOR: ${pedro.transacoesComprador.length}`);
                pedro.transacoesComprador.forEach((t, i) => {
                    log(cores.ciano, `      ${i+1}. RT$ ${t.valorRt} - ${t.status} (${new Date(t.createdAt).toLocaleDateString()})`);
                });
            } else {
                log(cores.amarelo, `   ⚠️ Nenhuma transação como comprador`);
            }
            
            if (pedro.transacoesVendedor && pedro.transacoesVendedor.length > 0) {
                log(cores.ciano, `   💼 TRANSAÇÕES COMO VENDEDOR: ${pedro.transacoesVendedor.length}`);
                pedro.transacoesVendedor.forEach((t, i) => {
                    log(cores.ciano, `      ${i+1}. RT$ ${t.valorRt} - ${t.status} (${new Date(t.createdAt).toLocaleDateString()})`);
                });
            } else {
                log(cores.amarelo, `   ⚠️ Nenhuma transação como vendedor`);
            }
            
            return pedro;
        }
        
        return null;
    } catch (error) {
        log(cores.vermelho, `❌ Erro ao buscar dados do Pedro: ${error.message}`);
        return null;
    }
}

// Teste 2: Verificar dados do dashboard para Pedro
async function testeDashboardPedro() {
    log(cores.azul, '\n📊 === DADOS DO DASHBOARD PARA PEDRO ===');
    
    const resultados = {};
    
    try {
        // Testar APIs do dashboard com contexto do Pedro
        log(cores.ciano, '\n🔍 Testando APIs do Dashboard:');
        
        // Total valor RT geral
        const responseValorGeral = await apiRequest('/dashboard/total-valor-rt');
        if (responseValorGeral.data) {
            resultados.valorGeralRT = responseValorGeral.data.totalValorRT;
            log(cores.verde, `✅ Valor RT Geral: RT$ ${resultados.valorGeralRT}`);
        }
        
        // Valor RT por unidade (Pedro = usuário 6)
        const responseValorUnidade = await apiRequest(`/dashboard/total-valor-rt-por-unidade/${pedroData.idUsuario}`);
        if (responseValorUnidade.data) {
            resultados.valorUnidadeRT = responseValorUnidade.data.valorTotalTransacoes;
            log(cores.verde, `✅ Valor RT Unidade Pedro: RT$ ${resultados.valorUnidadeRT}`);
        }
        
        // Fundo de permuta geral
        const responseFundoGeral = await apiRequest('/dashboard/total-fundo-permuta-matriz/1');
        if (responseFundoGeral.data) {
            resultados.fundoGeralPermuta = responseFundoGeral.data.valorFundoPermutaTotal;
            log(cores.verde, `✅ Fundo Permuta Geral: RT$ ${resultados.fundoGeralPermuta}`);
        }
        
        // Fundo de permuta da unidade do Pedro
        const responseFundoUnidade = await apiRequest(`/dashboard/fundo-permuta-unidade/${pedroData.idUsuario}`);
        if (responseFundoUnidade.data) {
            resultados.fundoUnidadePermuta = responseFundoUnidade.data.valorFundoPermutaUnidade;
            log(cores.verde, `✅ Fundo Permuta Unidade Pedro: RT$ ${resultados.fundoUnidadePermuta}`);
        }
        
        // Receita da agência (se Pedro tiver subordinados)
        const responseReceita = await apiRequest(`/dashboard/receita-agencia/${pedroData.idUsuario}`);
        if (responseReceita.data) {
            resultados.receitaAgencia = responseReceita.data.valorTotalReceber;
            log(cores.verde, `✅ A Receber Agência Pedro: RT$ ${resultados.receitaAgencia}`);
        }
        
        return resultados;
        
    } catch (error) {
        log(cores.vermelho, `❌ Erro nas APIs do dashboard: ${error.message}`);
        return resultados;
    }
}

// Teste 3: Verificar ofertas visíveis para Pedro
async function testeOfertasPedro() {
    log(cores.azul, '\n🏪 === OFERTAS VISÍVEIS PARA PEDRO ===');
    
    try {
        const responseOfertas = await apiRequest('/ofertas/listar-ofertas?page=1&limit=20');
        
        if (responseOfertas.data && responseOfertas.data.ofertas) {
            const ofertas = responseOfertas.data.ofertas;
            log(cores.verde, `✅ Total de ofertas visíveis: ${ofertas.length}`);
            
            // Mostrar primeiras 5 ofertas
            ofertas.slice(0, 5).forEach((oferta, i) => {
                log(cores.ciano, `   ${i+1}. ${oferta.titulo} - RT$ ${oferta.valor}`);
                log(cores.ciano, `      Por: ${oferta.usuario.nome} (${oferta.usuario.tipo})`);
                log(cores.ciano, `      Local: ${oferta.cidade}/${oferta.estado}`);
            });
            
            // Verificar se Pedro tem ofertas próprias
            const ofertasPedro = ofertas.filter(o => o.usuario.idUsuario === pedroData.idUsuario);
            if (ofertasPedro.length > 0) {
                log(cores.verde, `✅ Pedro tem ${ofertasPedro.length} oferta(s) própria(s)`);
                ofertasPedro.forEach((oferta, i) => {
                    log(cores.ciano, `   📦 ${i+1}. ${oferta.titulo} - RT$ ${oferta.valor}`);
                });
            } else {
                log(cores.amarelo, `⚠️ Pedro não tem ofertas próprias`);
            }
            
            return { total: ofertas.length, ofertas: ofertas };
        }
        
        return { total: 0, ofertas: [] };
        
    } catch (error) {
        log(cores.vermelho, `❌ Erro ao buscar ofertas: ${error.message}`);
        return { total: 0, ofertas: [] };
    }
}

// Teste 4: Verificar lista de associados para Pedro
async function testeAssociadosPedro() {
    log(cores.azul, '\n👥 === ASSOCIADOS VISÍVEIS PARA PEDRO ===');
    
    try {
        const responseUsuarios = await apiRequest('/usuarios/listar-usuarios?page=1&pageSize=100');
        
        if (responseUsuarios.data && responseUsuarios.data.data) {
            const usuarios = responseUsuarios.data.data;
            const associados = usuarios.filter(u => u.tipo === 'Associado');
            
            log(cores.verde, `✅ Total de usuários visíveis: ${usuarios.length}`);
            log(cores.verde, `✅ Associados visíveis: ${associados.length}`);
            
            // Verificar se Pedro está na lista
            const pedroNaLista = usuarios.find(u => u.idUsuario === pedroData.idUsuario);
            if (pedroNaLista) {
                log(cores.verde, `✅ Pedro aparece na lista de usuários`);
                log(cores.ciano, `   Pedro: ${pedroNaLista.nome} - ${pedroNaLista.tipo} - Status: ${pedroNaLista.status}`);
            } else {
                log(cores.amarelo, `⚠️ Pedro NÃO aparece na lista de usuários`);
            }
            
            // Mostrar outros associados
            const outrosAssociados = associados.filter(a => a.idUsuario !== pedroData.idUsuario);
            log(cores.ciano, `📊 Outros associados visíveis:`);
            outrosAssociados.forEach((assoc, i) => {
                log(cores.ciano, `   ${i+1}. ${assoc.nome} - Status: ${assoc.status ? 'Ativo' : 'Inativo'}`);
            });
            
            return { totalUsuarios: usuarios.length, totalAssociados: associados.length };
        }
        
        return { totalUsuarios: 0, totalAssociados: 0 };
        
    } catch (error) {
        log(cores.vermelho, `❌ Erro ao buscar usuários: ${error.message}`);
        return { totalUsuarios: 0, totalAssociados: 0 };
    }
}

// Função principal
async function executarTestes() {
    log(cores.negrito + cores.magenta, '\n🧪 ==========================================');
    log(cores.negrito + cores.magenta, '   TESTE ESPECÍFICO - PEDRO ASSOCIADO');
    log(cores.negrito + cores.magenta, '==========================================\n');
    
    const inicioTestes = Date.now();
    
    // Login
    const loginSucesso = await loginPedro();
    if (!loginSucesso) {
        log(cores.vermelho, '❌ FALHA CRÍTICA: Não foi possível fazer login com Pedro');
        return;
    }
    
    // Executar todos os testes
    const pedro = await testeDadosPedro();
    const dashboardData = await testeDashboardPedro();
    const ofertasData = await testeOfertasPedro();
    const associadosData = await testeAssociadosPedro();
    
    // Relatório final
    const tempoTotal = Date.now() - inicioTestes;
    
    log(cores.negrito + cores.azul, '\n📊 ==========================================');
    log(cores.negrito + cores.azul, '             RELATÓRIO FINAL');
    log(cores.negrito + cores.azul, '==========================================\n');
    
    log(cores.ciano, `⏱️ Tempo total: ${tempoTotal}ms`);
    
    log(cores.negrito + cores.verde, '\n✅ RESUMO DOS DADOS ENCONTRADOS:');
    
    if (pedro) {
        log(cores.verde, `👤 Pedro: ${pedro.nome} (${pedro.tipo})`);
        log(cores.verde, `⭐ Score/Reputação: ${pedro.reputacao || 'N/A'}`);
        log(cores.verde, `💰 Limite Crédito: RT$ ${pedro.conta?.limiteCredito || 'N/A'}`);
        log(cores.verde, `💱 Saldo Permuta: RT$ ${pedro.conta?.saldoPermuta || 'N/A'}`);
        log(cores.verde, `📊 Transações Comprador: ${pedro.transacoesComprador?.length || 0}`);
        log(cores.verde, `💼 Transações Vendedor: ${pedro.transacoesVendedor?.length || 0}`);
    }
    
    if (dashboardData) {
        log(cores.verde, `💱 RT Geral: RT$ ${dashboardData.valorGeralRT || 'N/A'}`);
        log(cores.verde, `🏢 RT Unidade: RT$ ${dashboardData.valorUnidadeRT || 'N/A'}`);
        log(cores.verde, `💰 Fundo Geral: RT$ ${dashboardData.fundoGeralPermuta || 'N/A'}`);
        log(cores.verde, `🏠 Fundo Unidade: RT$ ${dashboardData.fundoUnidadePermuta || 'N/A'}`);
    }
    
    if (ofertasData) {
        log(cores.verde, `🏪 Ofertas visíveis: ${ofertasData.total}`);
    }
    
    if (associadosData) {
        log(cores.verde, `👥 Usuários visíveis: ${associadosData.totalUsuarios}`);
        log(cores.verde, `🤝 Associados visíveis: ${associadosData.totalAssociados}`);
    }
    
    // Verificar problemas específicos
    log(cores.negrito + cores.amarelo, '\n🔍 ANÁLISE DE PROBLEMAS:');
    
    if (!pedro?.reputacao || pedro.reputacao === 0) {
        log(cores.vermelho, '❌ PROBLEMA: Score de reputação não está sendo exibido');
    } else {
        log(cores.verde, `✅ Score de reputação OK: ${pedro.reputacao} estrelas`);
    }
    
    if (!pedro?.conta?.limiteCredito) {
        log(cores.vermelho, '❌ PROBLEMA: Limite de crédito não encontrado');
    } else {
        log(cores.verde, `✅ Limite de crédito OK: RT$ ${pedro.conta.limiteCredito}`);
    }
    
    if (!pedro?.conta?.saldoPermuta) {
        log(cores.vermelho, '❌ PROBLEMA: Saldo de permuta não encontrado');
    } else {
        log(cores.verde, `✅ Saldo de permuta OK: RT$ ${pedro.conta.saldoPermuta}`);
    }
    
    if (!pedro?.transacoesComprador?.length && !pedro?.transacoesVendedor?.length) {
        log(cores.amarelo, '⚠️ ATENÇÃO: Pedro não tem transações registradas');
    } else {
        log(cores.verde, `✅ Pedro tem transações registradas`);
    }
    
    log(cores.negrito + cores.azul, '\n==========================================');
    log(cores.negrito + cores.azul, '          TESTE CONCLUÍDO!');
    log(cores.negrito + cores.azul, '==========================================\n');
}

// Executar testes
if (require.main === module) {
    executarTestes().catch(error => {
        log(cores.vermelho, `\n❌ ERRO CRÍTICO: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

module.exports = { executarTestes };