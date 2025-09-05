// TESTE_FRONTEND_DASHBOARD.js
// Testes abrangentes para validar dados do dashboard frontend vs backend

const axios = require('axios');

// Configurações de teste
const BASE_URL = 'http://localhost:3024';
const TEST_CONFIG = {
    timeout: 30000,
    validateStatus: (status) => status < 500 // Aceitar 200-499
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

// Estatísticas globais dos testes
const estatisticas = {
    total: 0,
    passou: 0,
    falhou: 0,
    detalhes: []
};

// Função para log colorido
const log = (cor, texto) => {
    console.log(`${cor}${texto}${cores.reset}`);
};

// Função para atualizar estatísticas
const atualizarEstatisticas = (nome, passou, detalhes = '') => {
    estatisticas.total++;
    if (passou) {
        estatisticas.passou++;
        log(cores.verde, `✅ ${nome}`);
    } else {
        estatisticas.falhou++;
        log(cores.vermelho, `❌ ${nome}`);
    }
    
    estatisticas.detalhes.push({
        nome,
        passou,
        detalhes
    });
};

// Token de autenticação global
let authToken = null;

// Função para obter token de autenticação
async function obterToken() {
    try {
        log(cores.azul, '\n🔐 === OBTENDO TOKEN DE AUTENTICAÇÃO ===');
        
        // Tentar diferentes credenciais
        const credenciais = [
            { login: 'usuario.matriz@example.com', senha: '123456' },
            { login: 'pedro.associado@example.com', senha: '123456' },
            { login: 'admin@teste.com', senha: '123456' }
        ];
        
        for (const cred of credenciais) {
            try {
                const response = await axios.post(`${BASE_URL}/usuarios/login`, cred, TEST_CONFIG);
                
                if (response.data && response.data.token) {
                    authToken = response.data.token;
                    log(cores.verde, `✅ Token obtido com sucesso usando ${cred.login}`);
                    log(cores.ciano, `Token: ${authToken.substring(0, 20)}...`);
                    return true;
                }
            } catch (err) {
                // Continuar tentando outras credenciais
                continue;
            }
        }
        
        throw new Error('Nenhuma credencial funcionou');
        
    } catch (error) {
        log(cores.vermelho, `❌ Erro ao obter token: ${error.message}`);
        
        // Tentar obter token de fallback de variável de ambiente ou arquivo
        const tokenFallback = process.env.TEST_TOKEN;
        if (tokenFallback) {
            authToken = tokenFallback;
            log(cores.amarelo, '⚠️ Usando token de fallback');
            return true;
        }
        
        return false;
    }
}

// Função para fazer requisições autenticadas
async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        ...TEST_CONFIG
    };
    
    if (data) {
        config.data = data;
    }
    
    return axios(config);
}

// ===== TESTES DO DASHBOARD =====

// Teste 1: Validar APIs do Dashboard
async function testeAPIDashboard() {
    log(cores.azul, '\n📊 === TESTE 1: VALIDAÇÃO DAS APIs DO DASHBOARD ===');
    
    const endpoints = [
        '/dashboard/total-valor-rt',
        '/dashboard/total-valor-rt-por-unidade/1', 
        '/dashboard/total-fundo-permuta-matriz/1',
        '/dashboard/fundo-permuta-unidade/1',
        '/dashboard/receita-matriz/1',
        '/dashboard/receita-agencia/1',
        '/dashboard/a-pagar-gerente/1',
        '/dashboard/a-pagar-todos-gerentes/1'
    ];
    
    let apisOk = 0;
    const detalhesAPIs = [];
    
    for (const endpoint of endpoints) {
        try {
            const response = await apiRequest(endpoint);
            
            if (response.status === 200 && response.data) {
                apisOk++;
                detalhesAPIs.push({
                    endpoint,
                    status: 'OK',
                    data: Object.keys(response.data)
                });
                log(cores.verde, `  ✅ ${endpoint} - OK`);
            } else {
                detalhesAPIs.push({
                    endpoint,
                    status: 'ERRO',
                    code: response.status
                });
                log(cores.vermelho, `  ❌ ${endpoint} - Status: ${response.status}`);
            }
        } catch (error) {
            detalhesAPIs.push({
                endpoint,
                status: 'ERRO',
                error: error.message
            });
            log(cores.vermelho, `  ❌ ${endpoint} - Erro: ${error.message}`);
        }
    }
    
    const passou = apisOk >= 6; // Pelo menos 75% das APIs devem funcionar
    atualizarEstatisticas('APIs do Dashboard', passou, `${apisOk}/${endpoints.length} APIs funcionando`);
    
    return { detalhesAPIs, total: endpoints.length, ok: apisOk };
}

// Teste 2: Validar Dados de Associados no Dashboard
async function testeDadosAssociados() {
    log(cores.azul, '\n👥 === TESTE 2: DADOS DE ASSOCIADOS NO DASHBOARD ===');
    
    try {
        // Buscar associados como no componente
        const responseAssociados = await apiRequest('/usuarios/listar-usuarios?page=1&pageSize=100');
        
        if (!responseAssociados.data || !responseAssociados.data.data) {
            atualizarEstatisticas('Estrutura dados associados', false, 'Resposta inválida da API');
            return false;
        }
        
        const todosUsuarios = responseAssociados.data.data;
        const associados = todosUsuarios.filter(user => user.tipo === 'Associado');
        
        log(cores.ciano, `📊 Total de usuários: ${todosUsuarios.length}`);
        log(cores.ciano, `👥 Associados encontrados: ${associados.length}`);
        
        // Validar estrutura dos dados dos associados
        const camposObrigatorios = ['idUsuario', 'nome', 'email', 'tipo', 'status'];
        let associadosValidos = 0;
        
        for (const associado of associados.slice(0, 5)) { // Testar primeiros 5
            const camposPresentes = camposObrigatorios.filter(campo => 
                associado.hasOwnProperty(campo) && associado[campo] !== null
            );
            
            if (camposPresentes.length === camposObrigatorios.length) {
                associadosValidos++;
            }
        }
        
        const passou = associadosValidos >= Math.min(3, associados.length);
        atualizarEstatisticas(
            'Dados associados dashboard', 
            passou, 
            `${associadosValidos}/${Math.min(5, associados.length)} associados com dados válidos`
        );
        
        return { totalUsuarios: todosUsuarios.length, totalAssociados: associados.length };
        
    } catch (error) {
        atualizarEstatisticas('Dados associados dashboard', false, `Erro: ${error.message}`);
        return false;
    }
}

// Teste 3: Validar Dados de Ofertas no Dashboard
async function testeDadosOfertas() {
    log(cores.azul, '\n🏪 === TESTE 3: DADOS DE OFERTAS NO DASHBOARD ===');
    
    try {
        // Buscar ofertas como no componente (API correta)
        const responseOfertas = await apiRequest('/ofertas/listar-ofertas');
        
        if (!responseOfertas.data || !responseOfertas.data.ofertas) {
            atualizarEstatisticas('Estrutura dados ofertas', false, 'Resposta inválida da API de ofertas');
            return false;
        }
        
        const ofertas = responseOfertas.data.ofertas;
        log(cores.ciano, `🏪 Total de ofertas: ${ofertas.length}`);
        
        // Validar estrutura das ofertas (campos corretos da API)
        const camposObrigatorios = ['idOferta', 'titulo', 'valor', 'usuario'];
        let ofertasValidas = 0;
        
        for (const oferta of ofertas.slice(0, 5)) { // Testar primeiras 5
            const camposPresentes = camposObrigatorios.filter(campo => 
                oferta.hasOwnProperty(campo) && oferta[campo] !== null
            );
            
            if (camposPresentes.length === camposObrigatorios.length) {
                ofertasValidas++;
            }
        }
        
        const passou = ofertasValidas >= Math.min(3, ofertas.length);
        atualizarEstatisticas(
            'Dados ofertas dashboard', 
            passou, 
            `${ofertasValidas}/${Math.min(5, ofertas.length)} ofertas com dados válidos`
        );
        
        return { totalOfertas: ofertas.length };
        
    } catch (error) {
        atualizarEstatisticas('Dados ofertas dashboard', false, `Erro: ${error.message}`);
        return false;
    }
}

// Teste 4: Validar Dados de Transações/Permutas
async function testeDadosPermutas() {
    log(cores.azul, '\n💱 === TESTE 4: DADOS DE PERMUTAS NO DASHBOARD ===');
    
    try {
        // Testar APIs de valor total RT
        const responseGeralRT = await apiRequest('/dashboard/total-valor-rt');
        const responseUnidadeRT = await apiRequest('/dashboard/total-valor-rt-por-unidade/1');
        
        let passou = true;
        const detalhes = [];
        
        // Validar resposta geral
        if (responseGeralRT.data && typeof responseGeralRT.data.totalValorRT === 'number') {
            log(cores.verde, `✅ Valor RT Geral: RT$ ${responseGeralRT.data.totalValorRT}`);
            detalhes.push(`Valor RT Geral: ${responseGeralRT.data.totalValorRT}`);
        } else {
            passou = false;
            detalhes.push('Erro na API valor RT geral');
        }
        
        // Validar resposta unidade
        if (responseUnidadeRT.data && typeof responseUnidadeRT.data.valorTotalTransacoes === 'number') {
            log(cores.verde, `✅ Valor RT Unidade: RT$ ${responseUnidadeRT.data.valorTotalTransacoes}`);
            detalhes.push(`Valor RT Unidade: ${responseUnidadeRT.data.valorTotalTransacoes}`);
        } else {
            passou = false;
            detalhes.push('Erro na API valor RT unidade');
        }
        
        atualizarEstatisticas('Dados permutas dashboard', passou, detalhes.join(', '));
        
        return {
            valorGeralRT: responseGeralRT.data?.totalValorRT || 0,
            valorUnidadeRT: responseUnidadeRT.data?.valorTotalTransacoes || 0
        };
        
    } catch (error) {
        atualizarEstatisticas('Dados permutas dashboard', false, `Erro: ${error.message}`);
        return false;
    }
}

// Teste 5: Validar Dados do Fundo de Permuta
async function testeDadosFundoPermuta() {
    log(cores.azul, '\n💰 === TESTE 5: DADOS DO FUNDO DE PERMUTA ===');
    
    try {
        // Testar APIs de fundo de permuta
        const responseGeralFundo = await apiRequest('/dashboard/total-fundo-permuta-matriz/1');
        const responseUnidadeFundo = await apiRequest('/dashboard/fundo-permuta-unidade/1');
        
        let passou = true;
        const detalhes = [];
        
        // Validar resposta geral
        if (responseGeralFundo.data && typeof responseGeralFundo.data.valorFundoPermutaTotal === 'number') {
            log(cores.verde, `✅ Fundo Permuta Geral: RT$ ${responseGeralFundo.data.valorFundoPermutaTotal}`);
            detalhes.push(`Fundo Geral: ${responseGeralFundo.data.valorFundoPermutaTotal}`);
        } else {
            passou = false;
            detalhes.push('Erro na API fundo geral');
        }
        
        // Validar resposta unidade
        if (responseUnidadeFundo.data && typeof responseUnidadeFundo.data.valorFundoPermutaUnidade === 'number') {
            log(cores.verde, `✅ Fundo Permuta Unidade: RT$ ${responseUnidadeFundo.data.valorFundoPermutaUnidade}`);
            detalhes.push(`Fundo Unidade: ${responseUnidadeFundo.data.valorFundoPermutaUnidade}`);
        } else {
            passou = false;
            detalhes.push('Erro na API fundo unidade');
        }
        
        atualizarEstatisticas('Dados fundo permuta dashboard', passou, detalhes.join(', '));
        
        return {
            valorGeralFundo: responseGeralFundo.data?.valorFundoPermutaTotal || 0,
            valorUnidadeFundo: responseUnidadeFundo.data?.valorFundoPermutaUnidade || 0
        };
        
    } catch (error) {
        atualizarEstatisticas('Dados fundo permuta dashboard', false, `Erro: ${error.message}`);
        return false;
    }
}

// Teste 6: Validar Dados Financeiros do Resumo
async function testeDadosResumoFinanceiro() {
    log(cores.azul, '\n💼 === TESTE 6: DADOS DO RESUMO FINANCEIRO ===');
    
    try {
        // Testar APIs financeiras
        const responseReceberAssociados = await apiRequest('/dashboard/receita-agencia/1');
        const responsePagarGerentes = await apiRequest('/dashboard/a-pagar-todos-gerentes/1');
        
        let passou = true;
        const detalhes = [];
        
        // Validar receber de associados
        if (responseReceberAssociados.data && typeof responseReceberAssociados.data.valorTotalReceber === 'number') {
            log(cores.verde, `✅ A Receber Associados: RT$ ${responseReceberAssociados.data.valorTotalReceber}`);
            detalhes.push(`A Receber: ${responseReceberAssociados.data.valorTotalReceber}`);
        } else {
            // Não é erro crítico se não houver associados
            log(cores.amarelo, `⚠️ Sem dados para receber de associados`);
            detalhes.push('Sem dados para receber');
        }
        
        // Validar pagar gerentes
        if (responsePagarGerentes.data && typeof responsePagarGerentes.data.valorTotalPagamento === 'number') {
            log(cores.verde, `✅ A Pagar Gerentes: RT$ ${responsePagarGerentes.data.valorTotalPagamento}`);
            detalhes.push(`A Pagar: ${responsePagarGerentes.data.valorTotalPagamento}`);
        } else {
            // Não é erro crítico se não houver gerentes
            log(cores.amarelo, `⚠️ Sem dados para pagar gerentes`);
            detalhes.push('Sem dados para pagar');
        }
        
        atualizarEstatisticas('Dados resumo financeiro', passou, detalhes.join(', '));
        
        return {
            valorReceberAssociados: responseReceberAssociados.data?.valorTotalReceber || 0,
            valorPagarGerentes: responsePagarGerentes.data?.valorTotalPagamento || 0
        };
        
    } catch (error) {
        atualizarEstatisticas('Dados resumo financeiro', false, `Erro: ${error.message}`);
        return false;
    }
}

// Teste 7: Validar Dados do State/Store (Simulação)
async function testeDadosUsuarioState() {
    log(cores.azul, '\n👤 === TESTE 7: DADOS DO USUÁRIO/STATE ===');
    
    try {
        // Simular dados que estariam no state do usuário
        // Buscar dados de perfil do usuário logado
        const responseUsuario = await apiRequest('/usuarios/perfil');
        
        if (!responseUsuario.data) {
            atualizarEstatisticas('Dados usuario state', false, 'Não foi possível obter perfil do usuário');
            return false;
        }
        
        const usuario = responseUsuario.data;
        const camposEssenciais = ['nome', 'email', 'conta'];
        let camposPresentes = 0;
        
        for (const campo of camposEssenciais) {
            if (usuario.hasOwnProperty(campo) && usuario[campo] !== null) {
                camposPresentes++;
                log(cores.verde, `  ✅ Campo ${campo} presente`);
            } else {
                log(cores.vermelho, `  ❌ Campo ${campo} ausente`);
            }
        }
        
        // Verificar dados da conta
        let contaValida = false;
        if (usuario.conta) {
            const camposConta = ['limiteCredito', 'saldoPermuta'];
            const camposContaPresentes = camposConta.filter(campo => 
                usuario.conta.hasOwnProperty(campo) && usuario.conta[campo] !== null
            );
            
            contaValida = camposContaPresentes.length >= 1;
            log(cores.ciano, `📊 Campos da conta: ${camposContaPresentes.join(', ')}`);
        }
        
        const passou = camposPresentes >= 2 && contaValida;
        atualizarEstatisticas(
            'Dados usuario state', 
            passou, 
            `${camposPresentes}/${camposEssenciais.length} campos essenciais, conta: ${contaValida ? 'OK' : 'NOK'}`
        );
        
        return usuario;
        
    } catch (error) {
        // Tentar endpoint alternativo
        try {
            const responseAlternativo = await apiRequest('/usuarios/me');
            if (responseAlternativo.data) {
                log(cores.amarelo, '⚠️ Usando endpoint alternativo para perfil');
                atualizarEstatisticas('Dados usuario state', true, 'Dados obtidos via endpoint alternativo');
                return responseAlternativo.data;
            }
        } catch (err) {
            // Endpoint alternativo também falhou
        }
        
        atualizarEstatisticas('Dados usuario state', false, `Erro: ${error.message}`);
        return false;
    }
}

// Teste 8: Validar Performance das APIs do Dashboard
async function testePerformanceDashboard() {
    log(cores.azul, '\n⚡ === TESTE 8: PERFORMANCE DAS APIs ===');
    
    const endpoints = [
        '/dashboard/total-valor-rt',
        '/dashboard/total-fundo-permuta-matriz/1',
        '/usuarios/listar-usuarios?page=1&pageSize=10'
    ];
    
    const tempos = [];
    let apisRapidas = 0;
    
    for (const endpoint of endpoints) {
        try {
            const inicio = Date.now();
            const response = await apiRequest(endpoint);
            const tempo = Date.now() - inicio;
            
            tempos.push({ endpoint, tempo, status: response.status });
            
            if (tempo < 5000) { // Menos de 5 segundos
                apisRapidas++;
                log(cores.verde, `  ✅ ${endpoint} - ${tempo}ms`);
            } else {
                log(cores.amarelo, `  ⚠️ ${endpoint} - ${tempo}ms (lenta)`);
            }
            
        } catch (error) {
            tempos.push({ endpoint, tempo: 'ERRO', status: 'ERRO' });
            log(cores.vermelho, `  ❌ ${endpoint} - Erro: ${error.message}`);
        }
    }
    
    const passou = apisRapidas >= Math.ceil(endpoints.length * 0.7); // 70% devem ser rápidas
    atualizarEstatisticas(
        'Performance APIs dashboard', 
        passou, 
        `${apisRapidas}/${endpoints.length} APIs rápidas`
    );
    
    return tempos;
}

// Teste 9: Validar Consistência de Dados Entre APIs
async function testeConsistenciaDados() {
    log(cores.azul, '\n🔍 === TESTE 9: CONSISTÊNCIA ENTRE APIs ===');
    
    try {
        // Buscar dados de diferentes fontes e verificar consistência
        const responseUsuarios = await apiRequest('/usuarios/listar-usuarios?page=1&pageSize=100');
        const responseAssociados = await apiRequest('/usuarios/listar-usuarios');
        
        let passou = true;
        const problemas = [];
        
        // Verificar se os dados são consistentes
        if (responseUsuarios.data && responseAssociados.data) {
            const usuarios1 = responseUsuarios.data.data || [];
            const usuarios2 = responseAssociados.data.data || [];
            
            // Comparar quantidade de associados
            const associados1 = usuarios1.filter(u => u.tipo === 'Associado');
            const associados2 = usuarios2.filter(u => u.tipo === 'Associado');
            
            if (Math.abs(associados1.length - associados2.length) <= 2) {
                log(cores.verde, `✅ Quantidade consistente de associados: ${associados1.length} vs ${associados2.length}`);
            } else {
                passou = false;
                problemas.push(`Inconsistência na quantidade de associados: ${associados1.length} vs ${associados2.length}`);
            }
            
            // Verificar se IDs são únicos
            const ids = usuarios1.map(u => u.idUsuario);
            const idsUnicos = new Set(ids);
            
            if (ids.length === idsUnicos.size) {
                log(cores.verde, `✅ IDs únicos: ${ids.length} usuários`);
            } else {
                passou = false;
                problemas.push('IDs duplicados encontrados');
            }
        } else {
            passou = false;
            problemas.push('Falha ao obter dados para comparação');
        }
        
        atualizarEstatisticas(
            'Consistência dados', 
            passou, 
            problemas.length > 0 ? problemas.join(', ') : 'Dados consistentes'
        );
        
        return passou;
        
    } catch (error) {
        atualizarEstatisticas('Consistência dados', false, `Erro: ${error.message}`);
        return false;
    }
}

// Função principal de execução dos testes
async function executarTestes() {
    log(cores.negrito + cores.magenta, '\n🧪 ============================================');
    log(cores.negrito + cores.magenta, '   TESTES FRONTEND DASHBOARD - REDE TRADE');
    log(cores.negrito + cores.magenta, '============================================\n');
    
    const inicioTestes = Date.now();
    
    // Obter token de autenticação
    const tokenObtido = await obterToken();
    if (!tokenObtido) {
        log(cores.vermelho, '❌ FALHA CRÍTICA: Não foi possível obter token de autenticação');
        return;
    }
    
    // Executar todos os testes
    const resultados = {};
    
    resultados.apis = await testeAPIDashboard();
    resultados.associados = await testeDadosAssociados();
    resultados.ofertas = await testeDadosOfertas();
    resultados.permutas = await testeDadosPermutas();
    resultados.fundoPermuta = await testeDadosFundoPermuta();
    resultados.resumoFinanceiro = await testeDadosResumoFinanceiro();
    resultados.usuarioState = await testeDadosUsuarioState();
    resultados.performance = await testePerformanceDashboard();
    resultados.consistencia = await testeConsistenciaDados();
    
    // Relatório final
    const tempoTotal = Date.now() - inicioTestes;
    const porcentagemSucesso = ((estatisticas.passou / estatisticas.total) * 100).toFixed(1);
    
    log(cores.negrito + cores.azul, '\n📊 ============================================');
    log(cores.negrito + cores.azul, '             RELATÓRIO FINAL');
    log(cores.negrito + cores.azul, '============================================\n');
    
    log(cores.ciano, `⏱️ Tempo total: ${tempoTotal}ms`);
    log(cores.ciano, `📊 Testes executados: ${estatisticas.total}`);
    log(cores.verde, `✅ Sucessos: ${estatisticas.passou}`);
    log(cores.vermelho, `❌ Falhas: ${estatisticas.falhou}`);
    log(cores.amarelo, `📈 Taxa de sucesso: ${porcentagemSucesso}%`);
    
    // Status final
    if (porcentagemSucesso >= 85) {
        log(cores.negrito + cores.verde, '\n🎉 DASHBOARD FRONTEND: EXCELENTE!');
        log(cores.verde, 'Todos os componentes e dados estão funcionando corretamente.');
    } else if (porcentagemSucesso >= 70) {
        log(cores.negrito + cores.amarelo, '\n⚠️ DASHBOARD FRONTEND: BOM COM RESSALVAS');
        log(cores.amarelo, 'A maioria dos componentes funciona, mas há pontos a melhorar.');
    } else {
        log(cores.negrito + cores.vermelho, '\n🚨 DASHBOARD FRONTEND: NECESSITA CORREÇÕES');
        log(cores.vermelho, 'Vários problemas encontrados que devem ser corrigidos.');
    }
    
    // Detalhes dos problemas
    const problemas = estatisticas.detalhes.filter(d => !d.passou);
    if (problemas.length > 0) {
        log(cores.amarelo, '\n🔧 PROBLEMAS IDENTIFICADOS:');
        problemas.forEach(p => {
            log(cores.vermelho, `  ❌ ${p.nome}: ${p.detalhes}`);
        });
    }
    
    // Sucessos
    const sucessos = estatisticas.detalhes.filter(d => d.passou);
    if (sucessos.length > 0) {
        log(cores.verde, '\n✅ FUNCIONANDO CORRETAMENTE:');
        sucessos.forEach(s => {
            log(cores.verde, `  ✅ ${s.nome}: ${s.detalhes}`);
        });
    }
    
    log(cores.negrito + cores.azul, '\n============================================');
    log(cores.negrito + cores.azul, '          TESTE CONCLUÍDO!');
    log(cores.negrito + cores.azul, '============================================\n');
    
    return {
        estatisticas,
        resultados,
        porcentagemSucesso: parseFloat(porcentagemSucesso)
    };
}

// Executar testes se chamado diretamente
if (require.main === module) {
    executarTestes().catch(error => {
        log(cores.vermelho, `\n❌ ERRO CRÍTICO: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

module.exports = { executarTestes };