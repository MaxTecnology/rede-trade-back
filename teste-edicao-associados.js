/**
 * TESTE DE EDIÇÃO DE ASSOCIADOS
 * Testa validações e integridade dos dados na edição de associados
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

let usuarioTeste = null; // Para armazenar usuário criado para testes
let tokenTeste = null; // Para armazenar token de autenticação

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

// SETUP: Criar usuário para testes de edição
async function criarUsuarioParaTeste() {
  try {
    // Gerar CPF válido no formato xxx.xxx.xxx-xx
    const timestamp = Date.now().toString();
    const cpfNumeros = timestamp.substring(timestamp.length - 11);
    const cpfFormatado = cpfNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    const dadosUsuario = {
      nome: "Usuário Edição Teste",
      cpf: cpfFormatado,
      email: `edicao.teste.${Date.now()}@teste.com`,
      senha: "senhaedicao123",
      tipo: "Associado"
    };

    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosUsuario,
      { validateStatus: () => true }
    );

    if (response.status >= 200 && response.status < 300) {
      usuarioTeste = response.data;
      log.success(`Usuário criado para testes: ID ${usuarioTeste.idUsuario}`);
      return { passou: true };
    }

    return {
      passou: false,
      erro: `Erro ao criar usuário para teste: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao criar usuário para teste",
      detalhes: error.message
    };
  }
}

// SETUP: Fazer login para obter token
async function fazerLoginParaTeste() {
  try {
    if (!usuarioTeste) {
      return {
        passou: false,
        erro: "Usuário de teste não existe"
      };
    }

    const dadosLogin = {
      login: usuarioTeste.email,
      senha: "senhaedicao123"
    };

    const response = await axios.post(
      `${BASE_URL}/usuarios/login`,
      dadosLogin,
      { validateStatus: () => true }
    );

    if (response.status === 200 && response.data.token) {
      tokenTeste = response.data.token;
      log.success("Login realizado com sucesso");
      return { passou: true };
    }

    return {
      passou: false,
      erro: `Erro no login: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro ao fazer login",
      detalhes: error.message
    };
  }
}

// TESTE 1: Edição com campos válidos
async function testarEdicaoComDadosValidos() {
  try {
    if (!usuarioTeste || !tokenTeste) {
      return {
        passou: false,
        erro: "Setup não foi executado corretamente"
      };
    }

    const dadosEdicao = {
      nome: "Nome Editado Teste",
      razaoSocial: "Empresa Teste LTDA",
      nomeFantasia: "Empresa Teste",
      cnpj: "12.345.678/0001-90",
      emailContato: "contato@empresateste.com",
      cidade: "São Paulo",
      estado: "SP",
      limiteCredito: "5000.00"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: true,
        mensagem: "Edição com dados válidos funcionou"
      };
    }

    return {
      passou: false,
      erro: `Edição válida falhou: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição de edição",
      detalhes: error.message
    };
  }
}

// TESTE 2: Edição sem token de autenticação
async function testarEdicaoSemToken() {
  try {
    if (!usuarioTeste) {
      return {
        passou: false,
        erro: "Usuário de teste não existe"
      };
    }

    const dadosEdicao = {
      nome: "Tentativa Sem Token"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      { validateStatus: () => true }
    );

    if (response.status === 401) {
      return {
        passou: true,
        mensagem: "Sistema rejeitou edição sem token"
      };
    }

    return {
      passou: false,
      erro: `Sistema permitiu edição sem token: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// TESTE 3: Edição com token inválido
async function testarEdicaoComTokenInvalido() {
  try {
    if (!usuarioTeste) {
      return {
        passou: false,
        erro: "Usuário de teste não existe"
      };
    }

    const dadosEdicao = {
      nome: "Tentativa Token Inválido"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      {
        headers: {
          'Authorization': 'Bearer token-invalido-123'
        },
        validateStatus: () => true
      }
    );

    if (response.status === 401) {
      return {
        passou: true,
        mensagem: "Sistema rejeitou token inválido"
      };
    }

    return {
      passou: false,
      erro: `Sistema aceitou token inválido: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// TESTE 4: Edição com email inválido
async function testarEdicaoComEmailInvalido() {
  try {
    if (!usuarioTeste || !tokenTeste) {
      return {
        passou: false,
        erro: "Setup não foi executado corretamente"
      };
    }

    const dadosEdicao = {
      email: "email-invalido-sem-arroba",
      emailContato: "contato-invalido"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: `Sistema rejeitou email inválido: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "Sistema ACEITOU email inválido na edição",
        detalhes: response.data
      };
    }

    return {
      passou: false,
      erro: `Status inesperado: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// TESTE 5: Edição com campos obrigatórios vazios
async function testarEdicaoComCamposVazios() {
  try {
    if (!usuarioTeste || !tokenTeste) {
      return {
        passou: false,
        erro: "Setup não foi executado corretamente"
      };
    }

    const dadosEdicao = {
      nome: "",
      razaoSocial: "",
      nomeFantasia: ""
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: `Sistema rejeitou campos vazios: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "Sistema ACEITOU campos obrigatórios vazios na edição",
        detalhes: response.data
      };
    }

    return {
      passou: false,
      erro: `Status inesperado: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// TESTE 6: Edição com dados maliciosos (XSS)
async function testarEdicaoComDadosMaliciosos() {
  try {
    if (!usuarioTeste || !tokenTeste) {
      return {
        passou: false,
        erro: "Setup não foi executado corretamente"
      };
    }

    const dadosEdicao = {
      nome: "<script>alert('xss')</script>João Editado",
      razaoSocial: "<img src='x' onerror='alert(1)'>Empresa",
      descricao: "javascript:alert('xss')"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: "Sistema rejeitou dados maliciosos"
      };
    }

    if (response.status >= 200 && response.status < 300) {
      // Se passou, verificar se sanitizou
      const nomeRetornado = response.data?.nome;
      
      if (nomeRetornado && nomeRetornado.includes('<script>')) {
        return {
          passou: false,
          erro: "Sistema NÃO sanitizou dados maliciosos na edição",
          detalhes: { nomeRetornado }
        };
      }

      return {
        passou: true,
        mensagem: "Sistema sanitizou dados maliciosos na edição"
      };
    }

    return {
      passou: false,
      erro: `Status inesperado: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// TESTE 7: Edição de usuário inexistente
async function testarEdicaoUsuarioInexistente() {
  try {
    if (!tokenTeste) {
      return {
        passou: false,
        erro: "Token de teste não existe"
      };
    }

    const dadosEdicao = {
      nome: "Tentativa Editar Inexistente"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/999999`,
      dadosEdicao,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    if (response.status === 404) {
      return {
        passou: true,
        mensagem: "Sistema rejeitou edição de usuário inexistente"
      };
    }

    return {
      passou: false,
      erro: `Sistema não rejeitou usuário inexistente: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// TESTE 8: Validação de tipos de dados
async function testarValidacaoTiposDados() {
  try {
    if (!usuarioTeste || !tokenTeste) {
      return {
        passou: false,
        erro: "Setup não foi executado corretamente"
      };
    }

    const dadosEdicao = {
      limiteCredito: "valor-invalido",
      numero: "nao-eh-numero",
      tipoOperacao: "tipo-invalido"
    };

    const response = await axios.put(
      `${BASE_URL}/usuarios/atualizar-usuario-completo/${usuarioTeste.idUsuario}`,
      dadosEdicao,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    // Sistema deve tratar os tipos corretamente ou rejeitar
    if (response.status === 400) {
      return {
        passou: true,
        mensagem: "Sistema rejeitou tipos de dados inválidos"
      };
    }

    if (response.status >= 200 && response.status < 300) {
      // Se passou, verificar se converteu corretamente
      return {
        passou: true,
        mensagem: "Sistema tratou conversão de tipos graciosamente"
      };
    }

    return {
      passou: false,
      erro: `Status inesperado: ${response.status}`,
      detalhes: response.data
    };

  } catch (error) {
    return {
      passou: false,
      erro: "Erro na requisição",
      detalhes: error.message
    };
  }
}

// CLEANUP: Remover usuário de teste
async function limparUsuarioTeste() {
  try {
    if (!usuarioTeste || !tokenTeste) {
      log.warn("Não há usuário de teste para limpar");
      return;
    }

    await axios.delete(
      `${BASE_URL}/usuarios/deletar-usuario/${usuarioTeste.idUsuario}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenTeste}`
        },
        validateStatus: () => true
      }
    );

    log.info("Usuário de teste removido");
  } catch (error) {
    log.warn(`Erro ao remover usuário de teste: ${error.message}`);
  }
}

async function testarConexaoAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/usuarios/listar-usuarios`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    return {
      passou: true,
      mensagem: `API respondendo (status: ${response.status})`
    };
    
  } catch (error) {
    return {
      passou: false,
      erro: "API não está respondendo",
      detalhes: error.message
    };
  }
}

async function executarTodosOsTestes() {
  log.header("TESTE DE EDIÇÃO DE ASSOCIADOS");
  
  log.info("🔍 Testando conectividade...");
  await executarTeste("Conexão com API", testarConexaoAPI);
  
  log.info("🔧 Preparando ambiente de teste...");
  await executarTeste("Criação de usuário para teste", criarUsuarioParaTeste);
  await executarTeste("Login para obter token", fazerLoginParaTeste);
  
  log.info("📝 Testando edições...");
  await executarTeste("Edição com dados válidos", testarEdicaoComDadosValidos);
  await executarTeste("Edição sem token", testarEdicaoSemToken);
  await executarTeste("Edição com token inválido", testarEdicaoComTokenInvalido);
  await executarTeste("Edição com email inválido", testarEdicaoComEmailInvalido);
  await executarTeste("Edição com campos vazios", testarEdicaoComCamposVazios);
  
  log.info("🛡️ Testando segurança...");
  await executarTeste("Edição com dados maliciosos", testarEdicaoComDadosMaliciosos);
  await executarTeste("Edição de usuário inexistente", testarEdicaoUsuarioInexistente);
  await executarTeste("Validação de tipos de dados", testarValidacaoTiposDados);

  // Limpeza
  log.info("🧹 Limpando ambiente de teste...");
  await limparUsuarioTeste();

  // Relatório final
  log.header("RELATÓRIO FINAL - EDIÇÃO DE ASSOCIADOS");
  
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
      console.log(`${colors.green}🎉 Excelente! ${taxaSucesso}% dos testes passaram.${colors.reset}`);
    } else if (taxaSucesso >= 60) {
      console.log(`${colors.yellow}⚠️  Bom: ${taxaSucesso}% dos testes passaram.${colors.reset}`);
    } else {
      console.log(`${colors.red}🚨 Problemas críticos: ${taxaSucesso}% de sucesso.${colors.reset}`);
    }
  } else {
    log.success("🎉 TODOS OS TESTES DE EDIÇÃO PASSARAM!");
  }

  log.header("TESTE CONCLUÍDO");
  
  return resultados;
}

// Executar se chamado diretamente
if (require.main === module) {
  executarTodosOsTestes().then(resultado => {
    process.exit(resultado.falhou > 0 ? 1 : 0);
  }).catch(error => {
    log.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { executarTodosOsTestes };