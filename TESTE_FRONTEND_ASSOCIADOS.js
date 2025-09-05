/**
 * TESTE FRONTEND - PÁGINAS DE ASSOCIADOS
 * Verifica se os dados do backend estão sendo exibidos corretamente no frontend
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3024';

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}🧪 ${msg}${colors.reset}\n`)
};

let resultados = {
  total: 0,
  passou: 0,
  falhou: 0,
  problemas: []
};

let tokenTeste = null;
let usuariosSample = [];

async function executarTeste(nome, testeFuncao) {
  resultados.total++;
  try {
    log.info(`Executando: ${nome}`);
    const resultado = await testeFuncao();
    if (resultado.passou) {
      log.success(`${nome} - PASSOU`);
      resultados.passou++;
    } else {
      log.error(`${nome} - FALHOU: ${resultado.erro}`);
      resultados.falhou++;
      resultados.problemas.push({
        teste: nome,
        erro: resultado.erro,
        detalhes: resultado.detalhes
      });
    }
  } catch (error) {
    log.error(`${nome} - ERRO: ${error.message}`);
    resultados.falhou++;
    resultados.problemas.push({
      teste: nome,
      erro: 'Erro de execução',
      detalhes: error.message
    });
  }
}

// ========================================
// SETUP: Obter token de autenticação
// ========================================
async function obterTokenAutenticacao() {
  try {
    // Tentar usar usuário existente
    const response = await axios.post(`${BASE_URL}/usuarios/login`, {
      login: "teste.final.validacao@teste.com",
      senha: "senha123"
    }, { validateStatus: () => true });
    
    if (response.status === 200 && response.data.token) {
      tokenTeste = response.data.token;
      return {
        passou: true,
        mensagem: "Token obtido com sucesso"
      };
    }
    
    // Se não funcionou, criar novo usuário
    const criarResp = await axios.post(`${BASE_URL}/usuarios/criar-usuario`, {
      nome: "Admin Teste Frontend",
      cpf: "999.888.777-66",
      email: "admin.frontend@teste.com",
      senha: "senha123"
    }, { validateStatus: () => true });
    
    if (criarResp.status >= 400) {
      // Se deu erro na criação, tentar login novamente
      const loginResp = await axios.post(`${BASE_URL}/usuarios/login`, {
        login: "admin.frontend@teste.com",
        senha: "senha123"
      });
      tokenTeste = loginResp.data.token;
    } else {
      // Se criou com sucesso, fazer login
      const loginResp = await axios.post(`${BASE_URL}/usuarios/login`, {
        login: "admin.frontend@teste.com",
        senha: "senha123"
      });
      tokenTeste = loginResp.data.token;
    }
    
    return {
      passou: true,
      mensagem: "Token obtido com sucesso"
    };
  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao obter token",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 1: Estrutura de Dados da API
// ========================================
async function testarEstruturaAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/usuarios/listar-usuarios?pageSize=20`,
      {
        headers: { Authorization: `Bearer ${tokenTeste}` },
        validateStatus: () => true
      }
    );

    if (response.status !== 200) {
      return {
        passou: false,
        erro: `API retornou status ${response.status}`,
        detalhes: response.data
      };
    }

    const { data, meta } = response.data;
    
    if (!data || !Array.isArray(data)) {
      return {
        passou: false,
        erro: "API não retornou array de dados",
        detalhes: response.data
      };
    }

    if (!meta || typeof meta.total === 'undefined') {
      return {
        passou: false,
        erro: "API não retornou metadados de paginação",
        detalhes: response.data
      };
    }

    // Armazenar sample para outros testes
    usuariosSample = data.slice(0, 5);

    return {
      passou: true,
      mensagem: `API retornou ${data.length} usuários com metadados corretos`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição da API",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 2: Campos Obrigatórios Presentes
// ========================================
async function testarCamposObrigatorios() {
  try {
    if (usuariosSample.length === 0) {
      return {
        passou: false,
        erro: "Nenhum usuário para testar campos"
      };
    }

    const camposObrigatorios = [
      'idUsuario',
      'nome',
      'email',
      'tipo',
      'status',
      'statusConta'
    ];

    const problemas = [];

    usuariosSample.forEach((usuario, index) => {
      camposObrigatorios.forEach(campo => {
        if (usuario[campo] === undefined || usuario[campo] === null) {
          problemas.push(`Usuário ${index}: Campo '${campo}' ausente`);
        }
      });
    });

    if (problemas.length > 0) {
      return {
        passou: false,
        erro: "Campos obrigatórios ausentes",
        detalhes: problemas
      };
    }

    return {
      passou: true,
      mensagem: `Todos os ${camposObrigatorios.length} campos obrigatórios presentes`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao verificar campos obrigatórios",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 3: Estrutura de Conta e Relacionamentos
// ========================================
async function testarEstruturaContaRelacionamentos() {
  try {
    const associados = usuariosSample.filter(u => u.tipo === 'Associado');
    
    if (associados.length === 0) {
      return {
        passou: false,
        erro: "Nenhum associado encontrado para testar relacionamentos"
      };
    }

    const problemas = [];

    associados.forEach((associado, index) => {
      // Verificar estrutura da conta
      if (!associado.conta) {
        problemas.push(`Associado ${index}: Sem dados de conta`);
      } else {
        // Campos essenciais da conta
        const camposConta = ['numeroConta', 'tipoContaId', 'usuarioId'];
        camposConta.forEach(campo => {
          if (associado.conta[campo] === undefined || associado.conta[campo] === null) {
            problemas.push(`Associado ${index}: Campo conta.${campo} ausente`);
          }
        });
      }

      // Verificar se tem categoria (pode ser null, mas deve estar presente)
      if (!associado.hasOwnProperty('categoriaId')) {
        problemas.push(`Associado ${index}: Campo categoriaId ausente`);
      }
    });

    if (problemas.length > 0) {
      return {
        passou: false,
        erro: "Problemas na estrutura de relacionamentos",
        detalhes: problemas
      };
    }

    return {
      passou: true,
      mensagem: `Estrutura de conta e relacionamentos OK para ${associados.length} associados`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao verificar estrutura de relacionamentos",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 4: Filtros da API
// ========================================
async function testarFiltrosAPI() {
  try {
    const filtros = [
      { nome: 'search', param: 'search', valor: 'teste' },
      { nome: 'estado', param: 'estado', valor: 'SP' },
      { nome: 'cidade', param: 'cidade', valor: 'São Paulo' }
    ];

    const resultadosFiltros = [];

    for (const filtro of filtros) {
      try {
        const response = await axios.get(
          `${BASE_URL}/usuarios/listar-usuarios?${filtro.param}=${encodeURIComponent(filtro.valor)}`,
          {
            headers: { Authorization: `Bearer ${tokenTeste}` },
            validateStatus: () => true
          }
        );

        if (response.status === 200) {
          resultadosFiltros.push({
            filtro: filtro.nome,
            funcionando: true,
            quantidade: response.data.data?.length || 0
          });
        } else {
          resultadosFiltros.push({
            filtro: filtro.nome,
            funcionando: false,
            erro: `Status ${response.status}`
          });
        }
      } catch (error) {
        resultadosFiltros.push({
          filtro: filtro.nome,
          funcionando: false,
          erro: error.message
        });
      }
    }

    const filtrosFuncionando = resultadosFiltros.filter(r => r.funcionando).length;
    const totalFiltros = filtros.length;

    if (filtrosFuncionando === totalFiltros) {
      return {
        passou: true,
        mensagem: `Todos os ${totalFiltros} filtros funcionando`,
        detalhes: resultadosFiltros
      };
    } else {
      return {
        passou: false,
        erro: `Apenas ${filtrosFuncionando}/${totalFiltros} filtros funcionando`,
        detalhes: resultadosFiltros
      };
    }

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao testar filtros da API",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 5: Dados para Cards de Associados
// ========================================
async function testarDadosCards() {
  try {
    const associados = usuariosSample.filter(u => u.tipo === 'Associado');
    
    if (associados.length === 0) {
      return {
        passou: false,
        erro: "Nenhum associado para testar dados de cards"
      };
    }

    const problemas = [];
    
    // Campos necessários para AssociadosCard
    const camposCard = [
      { campo: 'nome', fallback: 'nomeFantasia', essencial: true },
      { campo: 'nomeFantasia', fallback: 'nome', essencial: true },
      { campo: 'email', fallback: 'emailContato', essencial: false },
      { campo: 'telefone', fallback: 'celular', essencial: false },
      { campo: 'estado', fallback: null, essencial: false },
      { campo: 'reputacao', fallback: null, essencial: false },
      { campo: 'status', fallback: null, essencial: true }
    ];

    associados.forEach((associado, index) => {
      camposCard.forEach(({ campo, fallback, essencial }) => {
        const temValor = associado[campo] !== undefined && associado[campo] !== null && associado[campo] !== '';
        const temFallback = fallback && associado[fallback] !== undefined && associado[fallback] !== null && associado[fallback] !== '';
        
        if (essencial && !temValor && !temFallback) {
          problemas.push(`Associado ${index}: Campo essencial '${campo}' sem valor e sem fallback '${fallback || 'N/A'}'`);
        }
      });

      // Verificar estrutura específica para card
      if (associado.conta) {
        if (!associado.conta.numeroConta) {
          problemas.push(`Associado ${index}: Sem número da conta para exibição`);
        }
      }
    });

    if (problemas.length > 0) {
      return {
        passou: false,
        erro: "Dados insuficientes para renderização de cards",
        detalhes: problemas
      };
    }

    return {
      passou: true,
      mensagem: `Dados suficientes para renderizar ${associados.length} cards de associados`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao verificar dados para cards",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 6: Dados para Tabela de Associados
// ========================================
async function testarDadosTabela() {
  try {
    const associados = usuariosSample.filter(u => u.tipo === 'Associado');
    
    if (associados.length === 0) {
      return {
        passou: false,
        erro: "Nenhum associado para testar dados de tabela"
      };
    }

    const problemas = [];
    
    // Campos necessários para tabela (baseado em constants.js)
    const colunasTabela = [
      { coluna: 'Conta', accessor: 'conta.numeroConta', essencial: true },
      { coluna: 'Nome Fantasia', accessor: 'nomeFantasia', fallback: 'nome', essencial: true },
      { coluna: 'E-mail', accessor: 'email', fallback: 'emailContato', essencial: false },
      { coluna: 'Telefone', accessor: 'telefone', fallback: 'celular', essencial: false },
      { coluna: 'Estado', accessor: 'estado', essencial: false },
      { coluna: 'Cidade', accessor: 'cidade', essencial: false },
      { coluna: 'Status', accessor: 'status', essencial: true },
      { coluna: 'Reputação', accessor: 'reputacao', essencial: false }
    ];

    associados.forEach((associado, index) => {
      colunasTabela.forEach(({ coluna, accessor, fallback, essencial }) => {
        let valor;
        
        if (accessor.includes('.')) {
          const [obj, prop] = accessor.split('.');
          valor = associado[obj]?.[prop];
        } else {
          valor = associado[accessor];
        }
        
        const temValor = valor !== undefined && valor !== null && valor !== '';
        const temFallback = fallback && associado[fallback] !== undefined && associado[fallback] !== null && associado[fallback] !== '';
        
        if (essencial && !temValor && !temFallback) {
          problemas.push(`Associado ${index}: Coluna '${coluna}' sem dados (accessor: ${accessor})`);
        }
      });
    });

    if (problemas.length > 0) {
      return {
        passou: false,
        erro: "Dados insuficientes para renderização de tabela",
        detalhes: problemas
      };
    }

    return {
      passou: true,
      mensagem: `Dados suficientes para tabela com ${colunasTabela.length} colunas`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao verificar dados para tabela",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 7: Paginação
// ========================================
async function testarPaginacao() {
  try {
    // Testar primeira página
    const page1 = await axios.get(
      `${BASE_URL}/usuarios/listar-usuarios?page=1&pageSize=5`,
      {
        headers: { Authorization: `Bearer ${tokenTeste}` },
        validateStatus: () => true
      }
    );

    if (page1.status !== 200) {
      return {
        passou: false,
        erro: `Página 1 retornou status ${page1.status}`,
        detalhes: page1.data
      };
    }

    const meta1 = page1.data.meta;
    if (!meta1 || typeof meta1.page !== 'number' || typeof meta1.total !== 'number') {
      return {
        passou: false,
        erro: "Metadados de paginação ausentes ou inválidos",
        detalhes: page1.data
      };
    }

    // Se há mais de uma página, testar segunda página
    if (meta1.totalPages > 1) {
      const page2 = await axios.get(
        `${BASE_URL}/usuarios/listar-usuarios?page=2&pageSize=5`,
        {
          headers: { Authorization: `Bearer ${tokenTeste}` },
          validateStatus: () => true
        }
      );

      if (page2.status !== 200) {
        return {
          passou: false,
          erro: `Página 2 retornou status ${page2.status}`,
          detalhes: page2.data
        };
      }

      const meta2 = page2.data.meta;
      if (meta2.page !== 2) {
        return {
          passou: false,
          erro: `Página 2 retornou meta.page = ${meta2.page}`,
          detalhes: meta2
        };
      }
    }

    return {
      passou: true,
      mensagem: `Paginação funcionando: ${meta1.total} itens em ${meta1.totalPages} páginas`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao testar paginação",
      detalhes: error.message
    };
  }
}

// ========================================
// TESTE 8: Performance da API
// ========================================
async function testarPerformanceAPI() {
  try {
    const inicio = Date.now();
    
    const response = await axios.get(
      `${BASE_URL}/usuarios/listar-usuarios?pageSize=50`,
      {
        headers: { Authorization: `Bearer ${tokenTeste}` },
        validateStatus: () => true
      }
    );
    
    const tempo = Date.now() - inicio;
    
    if (response.status !== 200) {
      return {
        passou: false,
        erro: `API retornou status ${response.status}`,
        detalhes: response.data
      };
    }

    // Considerar lento se demorar mais de 2 segundos
    if (tempo > 2000) {
      return {
        passou: false,
        erro: `API muito lenta: ${tempo}ms`,
        detalhes: { tempo, quantidade: response.data.data?.length }
      };
    }

    return {
      passou: true,
      mensagem: `API respondeu em ${tempo}ms para ${response.data.data?.length || 0} registros`
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro no teste de performance",
      detalhes: error.message
    };
  }
}

// ========================================
// EXECUÇÃO PRINCIPAL
// ========================================
async function executarTodosOsTestes() {
  log.header("TESTE FRONTEND - PÁGINAS DE ASSOCIADOS");
  
  log.info("🔐 Configurando autenticação...");
  await executarTeste("Obter token de autenticação", obterTokenAutenticacao);
  
  if (!tokenTeste) {
    log.error("❌ Não foi possível obter token. Abortando testes.");
    return;
  }
  
  log.info("🔍 Testando estrutura da API...");
  await executarTeste("Estrutura de dados da API", testarEstruturaAPI);
  await executarTeste("Campos obrigatórios presentes", testarCamposObrigatorios);
  await executarTeste("Estrutura de conta e relacionamentos", testarEstruturaContaRelacionamentos);
  
  log.info("🔧 Testando filtros...");
  await executarTeste("Filtros da API", testarFiltrosAPI);
  await executarTeste("Paginação", testarPaginacao);
  
  log.info("🎨 Testando dados para interface...");
  await executarTeste("Dados para cards de associados", testarDadosCards);
  await executarTeste("Dados para tabela de associados", testarDadosTabela);
  
  log.info("⚡ Testando performance...");
  await executarTeste("Performance da API", testarPerformanceAPI);

  // Relatório final
  log.header("RELATÓRIO FINAL - FRONTEND ASSOCIADOS");
  
  console.log(`📊 Total de testes: ${resultados.total}`);
  console.log(`${colors.green}✅ Passou: ${resultados.passou}${colors.reset}`);
  console.log(`${colors.red}❌ Falhou: ${resultados.falhou}${colors.reset}`);
  
  const taxaSucesso = Math.round((resultados.passou / resultados.total) * 100);
  console.log(`📈 Taxa de sucesso: ${taxaSucesso}%`);
  
  if (resultados.problemas.length > 0) {
    log.header("PROBLEMAS ENCONTRADOS");
    
    resultados.problemas.forEach((problema, index) => {
      console.log(`\n${colors.red}🐛 PROBLEMA ${index + 1}: ${problema.teste}${colors.reset}`);
      console.log(`   ${colors.yellow}Erro: ${problema.erro}${colors.reset}`);
      
      if (problema.detalhes) {
        console.log(`   ${colors.blue}Detalhes:${colors.reset}`);
        if (typeof problema.detalhes === 'object') {
          console.log(JSON.stringify(problema.detalhes, null, 2));
        } else {
          console.log(`   ${problema.detalhes}`);
        }
      }
    });
    
    log.header("ANÁLISE");
    if (taxaSucesso >= 80) {
      console.log(`${colors.green}🎉 Frontend está funcionando bem! ${taxaSucesso}% dos testes passaram.${colors.reset}`);
      console.log(`${colors.blue}💡 Apenas ${resultados.problemas.length} problemas encontrados.${colors.reset}`);
    } else if (taxaSucesso >= 50) {
      console.log(`${colors.yellow}⚠️  Frontend precisa de atenção! ${taxaSucesso}% dos testes passaram.${colors.reset}`);
      console.log(`${colors.blue}💡 ${resultados.problemas.length} problemas precisam ser resolvidos.${colors.reset}`);
    } else {
      console.log(`${colors.red}🚨 Frontend tem problemas críticos (${taxaSucesso}% de sucesso).${colors.reset}`);
    }
  } else {
    log.success("🎉 FRONTEND FUNCIONANDO PERFEITAMENTE! Todos os testes passaram.");
    console.log(`${colors.green}✨ Dados do backend são exibidos corretamente no frontend!${colors.reset}`);
  }

  log.header("TESTE CONCLUÍDO");
  
  return resultados;
}

// Executar se chamado diretamente
if (require.main === module) {
  executarTodosOsTestes().then(resultado => {
    process.exit((resultado && resultado.falhou > 0) ? 1 : 0);
  }).catch(error => {
    log.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { executarTodosOsTestes };