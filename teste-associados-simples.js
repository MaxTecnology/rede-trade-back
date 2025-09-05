/**
 * TESTE SIMPLES PARA ASSOCIADOS - PÓS-CORREÇÃO
 * Testa as validações implementadas na API
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

// Dados de teste - ATUALIZADOS PARA TESTAR AS CORREÇÕES
const dadosTeste = {
  valido: {
    nome: "João Silva Teste",
    cpf: "123.456.789-01",
    email: `teste.${Date.now()}@email.com`,
    senha: "senha123",
    tipo: "Associado"
  },
  camposVazios: {
    nome: "",
    cpf: "",
    email: "",
    senha: ""
  },
  emailInvalido: {
    nome: "João Silva",
    cpf: "123.456.789-01",
    email: "email-invalido",
    senha: "senha123"
  },
  cpfInvalido: {
    nome: "João Silva",
    cpf: "123", // Apenas 3 dígitos
    email: `cpf.invalido.${Date.now()}@teste.com`,
    senha: "senha123"
  },
  dadosMaliciosos: {
    nome: "<script>alert('xss')</script>João",
    cpf: "123.456.789-01",
    email: `malicioso.${Date.now()}@teste.com`,
    senha: "senha123"
  },
  // NOVOS TESTES PARA VALIDAÇÕES ESPECÍFICAS
  nomeMuitoCurto: {
    nome: "J", // 1 caractere apenas
    cpf: "123.456.789-01",
    email: `nome.curto.${Date.now()}@teste.com`,
    senha: "senha123"
  },
  senhaMuitoCurta: {
    nome: "João Silva",
    cpf: "123.456.789-01",
    email: `senha.curta.${Date.now()}@teste.com`,
    senha: "123" // Apenas 3 caracteres
  },
  emailSemArroba: {
    nome: "João Silva",
    cpf: "123.456.789-01",
    email: "emailsemarroba.com",
    senha: "senha123"
  }
};

let resultados = {
  total: 0,
  passou: 0,
  falhou: 0,
  problemas: []
};

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

// TESTES ATUALIZADOS PARA VERIFICAR AS CORREÇÕES

async function testarCamposObrigatoriosVazios() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.camposVazios,
      { validateStatus: () => true }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: `✅ Sistema rejeitou campos vazios: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "❌ Sistema AINDA ACEITA campos obrigatórios vazios",
        detalhes: {
          status: response.status,
          data: response.data
        }
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

async function testarEmailInvalido() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.emailInvalido,
      { validateStatus: () => true }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: `✅ Sistema rejeitou email inválido: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "❌ Sistema AINDA ACEITA email inválido",
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

async function testarCPFInvalido() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.cpfInvalido,
      { validateStatus: () => true }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: `✅ Sistema rejeitou CPF inválido: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "❌ Sistema AINDA ACEITA CPF inválido",
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

async function testarNomeMuitoCurto() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.nomeMuitoCurto,
      { validateStatus: () => true }
    );

    if (response.status === 400 && response.data.error.toLowerCase().includes('nome')) {
      return {
        passou: true,
        mensagem: `✅ Sistema rejeitou nome muito curto: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "❌ Sistema aceita nome com 1 caractere apenas",
        detalhes: response.data
      };
    }

    return {
      passou: false,
      erro: `Status inesperado ou erro não relacionado ao nome: ${response.status}`,
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

async function testarSenhaMuitoCurta() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.senhaMuitoCurta,
      { validateStatus: () => true }
    );

    if (response.status === 400 && response.data.error.toLowerCase().includes('senha')) {
      return {
        passou: true,
        mensagem: `✅ Sistema rejeitou senha muito curta: ${response.data.error}`
      };
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: false,
        erro: "❌ Sistema aceita senha com menos de 6 caracteres",
        detalhes: response.data
      };
    }

    return {
      passou: false,
      erro: `Status inesperado ou erro não relacionado à senha: ${response.status}`,
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

async function testarSanitizacaoXSS() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.dadosMaliciosos,
      { validateStatus: () => true }
    );

    if (response.status === 400) {
      return {
        passou: true,
        mensagem: "✅ Sistema rejeitou dados maliciosos"
      };
    }

    if (response.status >= 200 && response.status < 300) {
      // Se passou, verificar se sanitizou
      const nomeRetornado = response.data?.nome || response.data?.user?.nome;
      
      if (nomeRetornado && nomeRetornado.includes('<script>')) {
        return {
          passou: false,
          erro: "❌ Sistema NÃO sanitizou dados maliciosos",
          detalhes: { nomeRetornado }
        };
      }

      return {
        passou: true,
        mensagem: "✅ Sistema sanitizou dados maliciosos"
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

async function testarListarSemToken() {
  try {
    const response = await axios.get(
      `${BASE_URL}/usuarios/listar-usuarios`,
      { validateStatus: () => true }
    );

    if (response.status === 401) {
      return {
        passou: true,
        mensagem: "✅ Sistema exige autenticação"
      };
    }

    return {
      passou: false,
      erro: `❌ Sistema permitiu acesso sem token (status: ${response.status})`,
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

async function testarConexaoAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/usuarios/listar-usuarios`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    // Qualquer resposta significa que API está funcionando
    return {
      passou: true,
      mensagem: `✅ API respondendo (status: ${response.status})`
    };
    
  } catch (error) {
    return {
      passou: false,
      erro: "❌ API não está respondendo",
      detalhes: error.message
    };
  }
}

// TESTE EXTRA: Dado válido deve funcionar
async function testarDadosValidos() {
  try {
    const response = await axios.post(
      `${BASE_URL}/usuarios/criar-usuario`,
      dadosTeste.valido,
      { validateStatus: () => true }
    );

    if (response.status >= 200 && response.status < 300) {
      return {
        passou: true,
        mensagem: `✅ Sistema criou usuário com dados válidos`
      };
    }

    return {
      passou: false,
      erro: `❌ Sistema rejeitou dados válidos (status: ${response.status})`,
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

async function executarTodosOsTestes() {
  log.header("TESTE DE CORREÇÕES - FORMULÁRIOS DE ASSOCIADOS");
  
  log.info("🔍 Testando conectividade...");
  await executarTeste("Conexão com API", testarConexaoAPI);
  
  log.info("🔐 Testando validações corrigidas...");
  await executarTeste("Campos obrigatórios vazios", testarCamposObrigatoriosVazios);
  await executarTeste("Email inválido", testarEmailInvalido);
  await executarTeste("CPF inválido", testarCPFInvalido);
  await executarTeste("Nome muito curto", testarNomeMuitoCurto);
  await executarTeste("Senha muito curta", testarSenhaMuitoCurta);
  
  log.info("🛡️ Testando segurança...");
  await executarTeste("Sanitização XSS", testarSanitizacaoXSS);
  
  log.info("🔒 Testando autorização...");
  await executarTeste("Listar sem token", testarListarSemToken);
  
  log.info("✅ Testando caso positivo...");
  await executarTeste("Dados válidos", testarDadosValidos);

  // Relatório final
  log.header("RELATÓRIO FINAL - PÓS-CORREÇÃO");
  
  console.log(`📊 Total de testes: ${resultados.total}`);
  console.log(`${colors.green}✅ Passou: ${resultados.passou}${colors.reset}`);
  console.log(`${colors.red}❌ Falhou: ${resultados.falhou}${colors.reset}`);
  
  const taxaSucesso = Math.round((resultados.passou / resultados.total) * 100);
  console.log(`📈 Taxa de sucesso: ${taxaSucesso}%`);
  
  if (resultados.problemas.length > 0) {
    log.header("PROBLEMAS AINDA PENDENTES");
    
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
      console.log(`${colors.blue}💡 Apenas ${resultados.problemas.length} problemas restantes.${colors.reset}`);
    } else if (taxaSucesso >= 50) {
      console.log(`${colors.yellow}⚠️  Bom progresso! ${taxaSucesso}% dos testes passaram.${colors.reset}`);
      console.log(`${colors.blue}💡 Ainda há ${resultados.problemas.length} problemas para corrigir.${colors.reset}`);
    } else {
      console.log(`${colors.red}🚨 Ainda há problemas significativos (${taxaSucesso}% de sucesso).${colors.reset}`);
    }
  } else {
    log.success("🎉 TODAS AS CORREÇÕES FUNCIONARAM! Todos os testes passaram.");
    console.log(`${colors.green}✨ Sistema de associados agora tem validações robustas!${colors.reset}`);
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