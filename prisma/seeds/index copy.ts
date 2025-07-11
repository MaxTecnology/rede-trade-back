import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeds...');

  // Criação de senhas criptografadas
  const hashedPassword1 = await bcrypt.hash("123456", 10);
  const hashedPassword2 = await bcrypt.hash("123456", 10);
  const hashedPassword3 = await bcrypt.hash("123456", 10);

  console.log('👤 Criando usuário matriz...');
  // Criação de um usuário matriz (criar primeiro para ser referenciado)
  const usuarioMatriz = await prisma.usuarios.create({
    data: {
      nome: "Usuário Matriz",
      cpf: "33333333333",
      email: "usuario.matriz@example.com",
      senha: hashedPassword3,
      imagem: "usuario_matriz.png",
      statusConta: true,
      reputacao: 5.0,
      razaoSocial: "Matriz LTDA",
      nomeFantasia: "Matriz Corporation",
      cnpj: "33333333000103",
      inscEstadual: "333333333",
      inscMunicipal: "333333333",
      mostrarNoSite: true,
      descricao: "Gestão empresarial",
      tipo: "Gestão",
      tipoDeMoeda: "BRL",
      status: true,
      restricao: null,
      nomeContato: "Usuário Matriz",
      telefone: "31987654323",
      celular: "31987654323",
      emailContato: "contato@usuariomatriz.com",
      emailSecundario: "secundario@usuariomatriz.com",
      site: "www.usuariomatriz.com",
      logradouro: "Rua C",
      numero: 300,
      cep: "30030000",
      complemento: "Edifício Matriz",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      estado: "MG",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 3,
      taxaComissaoGerente: 20,
      bloqueado: false,
      tokenResetSenha: null,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "MANAGE_FRANCHISES", "ADMIN"]),
    },
  });

  console.log('👤 Criando gerente de conta...');
  // Criação de um gerente de conta
  const gerenteDeConta = await prisma.usuarios.create({
    data: {
      nome: "Gerente de Conta",
      cpf: "22222222222",
      email: "gerente.conta@example.com",
      senha: hashedPassword2,
      imagem: "gerente_conta.png",
      statusConta: true,
      reputacao: 5.0,
      razaoSocial: "Gerente Conta LTDA",
      nomeFantasia: "GC Consultoria",
      cnpj: "22222222000102",
      inscEstadual: "222222222",
      inscMunicipal: "222222222",
      mostrarNoSite: true,
      descricao: "Consultoria empresarial",
      tipo: "Consultoria",
      tipoDeMoeda: "BRL",
      status: true,
      restricao: null,
      nomeContato: "Gerente de Conta",
      telefone: "21987654322",
      celular: "21987654322",
      emailContato: "contato@gerenteconta.com",
      emailSecundario: "secundario@gerenteconta.com",
      site: "www.gerenteconta.com",
      logradouro: "Avenida B",
      numero: 200,
      cep: "20020000",
      complemento: "Sala 202",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 2,
      taxaComissaoGerente: 15,
      bloqueado: false,
      tokenResetSenha: null,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "MANAGE_ACCOUNTS"]),
      usuarioCriadorId: usuarioMatriz.idUsuario, // Matriz criou este gerente
      matrizId: usuarioMatriz.idUsuario, // Vinculado à matriz
    },
  });

  console.log('👤 Criando usuário comum...');
  // Criação de um usuário comum
  const usuarioComum = await prisma.usuarios.create({
    data: {
      nome: "Usuário Comum",
      cpf: "11111111111",
      email: "usuario.comum@example.com",
      senha: hashedPassword1,
      imagem: "usuario_comum.png",
      statusConta: true,
      reputacao: 4.5,
      razaoSocial: "Usuário Comum ME",
      nomeFantasia: "UC Serviços",
      cnpj: "11111111000101",
      inscEstadual: "111111111",
      inscMunicipal: "111111111",
      mostrarNoSite: true,
      descricao: "Serviços gerais",
      tipo: "Prestador de serviços",
      tipoDeMoeda: "BRL",
      status: true,
      restricao: null,
      nomeContato: "Usuário Comum",
      telefone: "11987654321",
      celular: "11987654321",
      emailContato: "contato@usuariocomum.com",
      emailSecundario: "secundario@usuariocomum.com",
      site: "www.usuariocomum.com",
      logradouro: "Rua A",
      numero: 100,
      cep: "01001000",
      complemento: "Apto 101",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      taxaComissaoGerente: 10,
      bloqueado: false,
      tokenResetSenha: null,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE"]),
      usuarioCriadorId: gerenteDeConta.idUsuario, // Gerente criou este usuário
      matrizId: usuarioMatriz.idUsuario, // Vinculado à matriz
    },
  });

  console.log('👥 Criando franquias...');
  // Criação de franquias vinculadas à matriz
  const franquiaA = await prisma.usuarios.create({
    data: {
      nome: "Franquia A",
      cpf: "44444444444",
      email: "franquia.a@example.com",
      senha: await bcrypt.hash("senha101", 10),
      nomeFantasia: "Franquia A",
      razaoSocial: "Franquia A LTDA",
      tipo: "Franquia",
      cidade: "Cidade A",
      estado: "SP",
      regiao: "Sudeste",
      status: true,
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      usuarioCriadorId: usuarioMatriz.idUsuario,
      matrizId: usuarioMatriz.idUsuario,
      mostrarNoSite: true,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "MANAGE_FRANCHISES"]),
    },
  });

  const franquiaB = await prisma.usuarios.create({
    data: {
      nome: "Franquia B",
      cpf: "55555555555",
      email: "franquia.b@example.com",
      senha: await bcrypt.hash("senha102", 10),
      nomeFantasia: "Franquia B",
      razaoSocial: "Franquia B LTDA",
      tipo: "Franquia",
      cidade: "Cidade B",
      estado: "RJ",
      regiao: "Sudeste",
      status: true,
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      usuarioCriadorId: usuarioMatriz.idUsuario,
      matrizId: usuarioMatriz.idUsuario,
      mostrarNoSite: true,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "MANAGE_FRANCHISES"]),
    },
  });

  console.log('🏦 Criando contas...');
  // Criação de contas para os usuários
  const contaUsuarioComum = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 5,
      limiteCredito: 10000,
      limiteUtilizado: 5000,
      limiteDisponivel: 5000,
      saldoPermuta: 2000,
      saldoDinheiro: 1000,
      limiteVendaMensal: 20000,
      limiteVendaTotal: 100000,
      limiteVendaEmpresa: 50000,
      valorVendaMensalAtual: 10000,
      valorVendaTotalAtual: 50000,
      diaFechamentoFatura: 10,
      dataVencimentoFatura: 20,
      numeroConta: "BSC000001",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia X",
      tipoDaConta: {
        create: {
          tipoDaConta: "Básica",
          prefixoConta: "BSC",
          descricao: "Conta Básica",
          permissoes: JSON.stringify(["BASIC"]),
        },
      },
      usuario: {
        connect: { idUsuario: usuarioComum.idUsuario }
      },
      plano: {
        create: {
          nomePlano: "Plano Básico",
          tipoDoPlano: "Mensal",
          taxaInscricao: 100,
          taxaComissao: 5,
          taxaManutencaoAnual: 50,
        },
      },
      gerenteConta: {
        connect: { idUsuario: gerenteDeConta.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["BASIC_ACCESS"]),
    },
  });

  const contaGerente = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 10,
      limiteCredito: 20000,
      limiteUtilizado: 10000,
      limiteDisponivel: 10000,
      saldoPermuta: 5000,
      saldoDinheiro: 2000,
      limiteVendaMensal: 40000,
      limiteVendaTotal: 200000,
      limiteVendaEmpresa: 100000,
      valorVendaMensalAtual: 20000,
      valorVendaTotalAtual: 100000,
      diaFechamentoFatura: 15,
      dataVencimentoFatura: 25,
      numeroConta: "PRM000001",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia Y",
      tipoDaConta: {
        create: {
          tipoDaConta: "Premium",
          prefixoConta: "PRM",
          descricao: "Conta Premium",
          permissoes: JSON.stringify(["ALL"]),
        },
      },
      usuario: {
        connect: { idUsuario: gerenteDeConta.idUsuario }
      },
      plano: {
        create: {
          nomePlano: "Plano Premium",
          tipoDoPlano: "Anual",
          taxaInscricao: 1200,
          taxaComissao: 10,
          taxaManutencaoAnual: 100,
        },
      },
      gerenteConta: {
        connect: { idUsuario: usuarioMatriz.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["FULL_ACCESS"]),
    },
  });

  const contaMatriz = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 15,
      limiteCredito: 50000,
      limiteUtilizado: 25000,
      limiteDisponivel: 25000,
      saldoPermuta: 15000,
      saldoDinheiro: 5000,
      limiteVendaMensal: 100000,
      limiteVendaTotal: 500000,
      limiteVendaEmpresa: 250000,
      valorVendaMensalAtual: 50000,
      valorVendaTotalAtual: 250000,
      diaFechamentoFatura: 20,
      dataVencimentoFatura: 30,
      numeroConta: "MTZ000001",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia Z",
      tipoDaConta: {
        create: {
          tipoDaConta: "Matriz",
          prefixoConta: "MTZ",
          descricao: "Conta Matriz",
          permissoes: JSON.stringify(["ALL", "MANAGE_FRANCHISES"]),
        },
      },
      usuario: {
        connect: { idUsuario: usuarioMatriz.idUsuario }
      },
      plano: {
        create: {
          nomePlano: "Plano Matriz",
          tipoDoPlano: "Anual",
          taxaInscricao: 1500,
          taxaComissao: 15,
          taxaManutencaoAnual: 200,
        },
      },
      permissoesEspecificas: JSON.stringify(["FULL_MANAGEMENT"]),
    },
  });

  // Criar contas para as franquias
  const contaFranquiaA = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 8,
      limiteCredito: 15000,
      limiteUtilizado: 7500,
      limiteDisponivel: 7500,
      saldoPermuta: 3000,
      saldoDinheiro: 1500,
      limiteVendaMensal: 30000,
      limiteVendaTotal: 150000,
      limiteVendaEmpresa: 75000,
      valorVendaMensalAtual: 15000,
      valorVendaTotalAtual: 75000,
      diaFechamentoFatura: 5,
      dataVencimentoFatura: 15,
      numeroConta: "FRQ000001",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia A",
      usuario: {
        connect: { idUsuario: franquiaA.idUsuario }
      },
      tipoDaConta: {
        connect: { idTipoConta: 1 } // Usar o tipo básico criado anteriormente
      },
      plano: {
        connect: { idPlano: 1 } // Usar o plano básico criado anteriormente
      },
      gerenteConta: {
        connect: { idUsuario: usuarioMatriz.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["FRANCHISE_ACCESS"]),
    },
  });

  const contaFranquiaB = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 8,
      limiteCredito: 15000,
      limiteUtilizado: 7500,
      limiteDisponivel: 7500,
      saldoPermuta: 3000,
      saldoDinheiro: 1500,
      limiteVendaMensal: 30000,
      limiteVendaTotal: 150000,
      limiteVendaEmpresa: 75000,
      valorVendaMensalAtual: 15000,
      valorVendaTotalAtual: 75000,
      diaFechamentoFatura: 5,
      dataVencimentoFatura: 15,
      numeroConta: "FRQ000002",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia B",
      usuario: {
        connect: { idUsuario: franquiaB.idUsuario }
      },
      tipoDaConta: {
        connect: { idTipoConta: 1 } // Usar o tipo básico criado anteriormente
      },
      plano: {
        connect: { idPlano: 1 } // Usar o plano básico criado anteriormente
      },
      gerenteConta: {
        connect: { idUsuario: usuarioMatriz.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["FRANCHISE_ACCESS"]),
    },
  });

  console.log('🏷️ Criando categorias e subcategorias...');
  // Criar categorias para as ofertas
  const categoriaTecnologia = await prisma.categoria.create({
    data: {
      nomeCategoria: "Tecnologia",
      tipoCategoria: "produto"
    }
  });

  const categoriaServicos = await prisma.categoria.create({
    data: {
      nomeCategoria: "Serviços",
      tipoCategoria: "servico"
    }
  });

  const categoriaAlimentos = await prisma.categoria.create({
    data: {
      nomeCategoria: "Alimentos e Bebidas",
      tipoCategoria: "produto"
    }
  });

  // Criar subcategorias
  const subcategoriaHardware = await prisma.subcategoria.create({
    data: {
      nomeSubcategoria: "Hardware",
      categoriaId: categoriaTecnologia.idCategoria
    }
  });

  const subcategoriaSoftware = await prisma.subcategoria.create({
    data: {
      nomeSubcategoria: "Software",
      categoriaId: categoriaTecnologia.idCategoria
    }
  });

  const subcategoriaConsultoria = await prisma.subcategoria.create({
    data: {
      nomeSubcategoria: "Consultoria",
      categoriaId: categoriaServicos.idCategoria
    }
  });

  const subcategoriaRestaurante = await prisma.subcategoria.create({
    data: {
      nomeSubcategoria: "Restaurante",
      categoriaId: categoriaAlimentos.idCategoria
    }
  });

  console.log('🛍️ Criando ofertas de exemplo...');
  // Criar algumas ofertas de exemplo
  const oferta1 = await prisma.oferta.create({
    data: {
      titulo: "Notebook Dell Inspiron",
      tipo: "produto",
      status: true,
      descricao: "Notebook Dell Inspiron 15 3000, Intel Core i5, 8GB RAM, 256GB SSD",
      quantidade: 5,
      valor: 2500.00,
      limiteCompra: 1,
      vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      cidade: "São Paulo",
      estado: "SP",
      retirada: "Loja física ou entrega",
      obs: "Produto novo, com garantia de 1 ano",
      imagens: ["notebook-dell-1.jpg", "notebook-dell-2.jpg"],
      nomeUsuario: "Usuário Comum",
      usuario: {
        connect: { idUsuario: usuarioComum.idUsuario }
      },
      categoria: {
        connect: { idCategoria: categoriaTecnologia.idCategoria }
      },
      subcategoria: {
        connect: { idSubcategoria: subcategoriaHardware.idSubcategoria }
      },
    }
  });

  const oferta2 = await prisma.oferta.create({
    data: {
      titulo: "Consultoria em Marketing Digital",
      tipo: "servico",
      status: true,
      descricao: "Consultoria especializada em marketing digital para pequenas e médias empresas",
      quantidade: 10,
      valor: 500.00,
      limiteCompra: 1,
      vencimento: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 dias
      cidade: "Rio de Janeiro",
      estado: "RJ",
      retirada: "Online ou presencial",
      obs: "Inclui análise completa e plano de ação",
      imagens: ["consultoria-marketing.jpg"],
      nomeUsuario: "Gerente de Conta",
      usuario: {
        connect: { idUsuario: gerenteDeConta.idUsuario }
      },
      categoria: {
        connect: { idCategoria: categoriaServicos.idCategoria }
      },
      subcategoria: {
        connect: { idSubcategoria: subcategoriaConsultoria.idSubcategoria }
      },
    }
  });

  console.log('👥 Criando usuários associados...');
  // Criar tipo de conta "Associado" primeiro
  const tipoContaAssociado = await prisma.tipoConta.create({
    data: {
      tipoDaConta: "Associado",
      prefixoConta: "ASS",
      descricao: "Conta de Associado",
      permissoes: JSON.stringify(["READ", "WRITE", "TRADE"]),
    },
  });

  // Criar plano para associados
  const planoAssociado = await prisma.plano.create({
    data: {
      nomePlano: "Plano Associado",
      tipoDoPlano: "Mensal",
      taxaInscricao: 50,
      taxaComissao: 3,
      taxaManutencaoAnual: 30,
    },
  });

  // Criar usuários associados de diferentes agências e estados
  const associado1 = await prisma.usuarios.create({
    data: {
      nome: "João Silva Associado",
      cpf: "66666666666",
      email: "joao.associado@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "joao_associado.png",
      statusConta: true,
      reputacao: 4.2,
      razaoSocial: "João Silva ME",
      nomeFantasia: "JS Comércio",
      cnpj: "66666666000106",
      inscEstadual: "666666666",
      inscMunicipal: "666666666",
      mostrarNoSite: true,
      descricao: "Comércio de produtos diversos",
      tipo: "Comércio",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "João Silva",
      telefone: "11999888777",
      celular: "11999888777",
      emailContato: "contato@jscomercio.com",
      site: "www.jscomercio.com",
      logradouro: "Rua das Flores",
      numero: 123,
      cep: "01234567",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      categoriaId: categoriaTecnologia.idCategoria,
      bloqueado: false,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "TRADE"]),
      usuarioCriadorId: franquiaA.idUsuario,
      matrizId: usuarioMatriz.idUsuario,
    },
  });

  const associado2 = await prisma.usuarios.create({
    data: {
      nome: "Maria Santos Associada",
      cpf: "77777777777",
      email: "maria.associada@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "maria_associada.png",
      statusConta: true,
      reputacao: 4.8,
      razaoSocial: "Maria Santos LTDA",
      nomeFantasia: "MS Serviços",
      cnpj: "77777777000107",
      inscEstadual: "777777777",
      inscMunicipal: "777777777",
      mostrarNoSite: true,
      descricao: "Prestação de serviços especializados",
      tipo: "Serviços",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Maria Santos",
      telefone: "21888777666",
      celular: "21888777666",
      emailContato: "contato@msservicos.com",
      site: "www.msservicos.com",
      logradouro: "Avenida Atlântica",
      numero: 456,
      cep: "22000000",
      bairro: "Copacabana",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 2,
      categoriaId: categoriaServicos.idCategoria,
      bloqueado: false,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "TRADE"]),
      usuarioCriadorId: franquiaB.idUsuario,
      matrizId: usuarioMatriz.idUsuario,
    },
  });

  const associado3 = await prisma.usuarios.create({
    data: {
      nome: "Carlos Oliveira Associado",
      cpf: "88888888888",
      email: "carlos.associado@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "carlos_associado.png",
      statusConta: true,
      reputacao: 3.9,
      razaoSocial: "Carlos Oliveira EPP",
      nomeFantasia: "CO Alimentação",
      cnpj: "88888888000108",
      inscEstadual: "888888888",
      inscMunicipal: "888888888",
      mostrarNoSite: true,
      descricao: "Setor de alimentação e bebidas",
      tipo: "Alimentação",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Carlos Oliveira",
      telefone: "31777666555",
      celular: "31777666555",
      emailContato: "contato@coalimentacao.com",
      site: "www.coalimentacao.com",
      logradouro: "Rua da Liberdade",
      numero: 789,
      cep: "30000000",
      bairro: "Savassi",
      cidade: "Belo Horizonte",
      estado: "MG",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      categoriaId: categoriaAlimentos.idCategoria,
      bloqueado: false,
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "TRADE"]),
      usuarioCriadorId: gerenteDeConta.idUsuario,
      matrizId: usuarioMatriz.idUsuario,
    },
  });

  // Criar contas para os associados
  const contaAssociado1 = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 3,
      limiteCredito: 5000,
      limiteUtilizado: 1500,
      limiteDisponivel: 3500,
      saldoPermuta: 800,
      saldoDinheiro: 200,
      limiteVendaMensal: 10000,
      limiteVendaTotal: 50000,
      limiteVendaEmpresa: 25000,
      valorVendaMensalAtual: 3500,
      valorVendaTotalAtual: 12000,
      diaFechamentoFatura: 5,
      dataVencimentoFatura: 15,
      numeroConta: "ASS000001",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia A",
      usuario: {
        connect: { idUsuario: associado1.idUsuario }
      },
      tipoDaConta: {
        connect: { idTipoConta: tipoContaAssociado.idTipoConta }
      },
      plano: {
        connect: { idPlano: planoAssociado.idPlano }
      },
      gerenteConta: {
        connect: { idUsuario: franquiaA.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["ASSOCIATE_ACCESS"]),
    },
  });

  const contaAssociado2 = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 3,
      limiteCredito: 7500,
      limiteUtilizado: 2200,
      limiteDisponivel: 5300,
      saldoPermuta: 1200,
      saldoDinheiro: 400,
      limiteVendaMensal: 15000,
      limiteVendaTotal: 75000,
      limiteVendaEmpresa: 37500,
      valorVendaMensalAtual: 5200,
      valorVendaTotalAtual: 18000,
      diaFechamentoFatura: 10,
      dataVencimentoFatura: 20,
      numeroConta: "ASS000002",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia B",
      usuario: {
        connect: { idUsuario: associado2.idUsuario }
      },
      tipoDaConta: {
        connect: { idTipoConta: tipoContaAssociado.idTipoConta }
      },
      plano: {
        connect: { idPlano: planoAssociado.idPlano }
      },
      gerenteConta: {
        connect: { idUsuario: franquiaB.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["ASSOCIATE_ACCESS"]),
    },
  });

  const contaAssociado3 = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 3,
      limiteCredito: 6000,
      limiteUtilizado: 1800,
      limiteDisponivel: 4200,
      saldoPermuta: 950,
      saldoDinheiro: 300,
      limiteVendaMensal: 12000,
      limiteVendaTotal: 60000,
      limiteVendaEmpresa: 30000,
      valorVendaMensalAtual: 4100,
      valorVendaTotalAtual: 15000,
      diaFechamentoFatura: 15,
      dataVencimentoFatura: 25,
      numeroConta: "ASS000003",
      dataDeAfiliacao: new Date(),
      nomeFranquia: "Franquia Y",
      usuario: {
        connect: { idUsuario: associado3.idUsuario }
      },
      tipoDaConta: {
        connect: { idTipoConta: tipoContaAssociado.idTipoConta }
      },
      plano: {
        connect: { idPlano: planoAssociado.idPlano }
      },
      gerenteConta: {
        connect: { idUsuario: gerenteDeConta.idUsuario }
      },
      permissoesEspecificas: JSON.stringify(["ASSOCIATE_ACCESS"]),
    },
  });

  console.log('✅ Seeds executados com sucesso!');
  console.log('');
  console.log('👤 Usuários criados:');
  console.log('📧 Matriz: usuario.matriz@example.com | 🔑 Senha: 123456');
  console.log('📧 Gerente: gerente.conta@example.com | 🔑 Senha: 123456');
  console.log('📧 Usuário: usuario.comum@example.com | 🔑 Senha: 123456');
  console.log('📧 Franquia A: franquia.a@example.com | 🔑 Senha: senha101');
  console.log('📧 Franquia B: franquia.b@example.com | 🔑 Senha: senha102');
  console.log('');
  console.log('👥 Associados criados:');
  console.log('📧 João Silva: joao.associado@example.com | 🔑 Senha: 123456 | 🏢 Franquia A | 📍 São Paulo/SP');
  console.log('📧 Maria Santos: maria.associada@example.com | 🔑 Senha: 123456 | 🏢 Franquia B | 📍 Rio de Janeiro/RJ');
  console.log('📧 Carlos Oliveira: carlos.associado@example.com | 🔑 Senha: 123456 | 🏢 Gerente Conta | 📍 Belo Horizonte/MG');
  console.log('');
  console.log('🏦 Contas criadas: BSC000001, PRM000001, MTZ000001, FRQ000001, FRQ000002, ASS000001, ASS000002, ASS000003');
  console.log('');
  console.log('🛍️ Ofertas criadas: 2 ofertas de exemplo');

  return {
    usuarios: { usuarioComum, gerenteDeConta, usuarioMatriz, franquiaA, franquiaB, associado1, associado2, associado3 },
    contas: { contaUsuarioComum, contaGerente, contaMatriz, contaFranquiaA, contaFranquiaB, contaAssociado1, contaAssociado2, contaAssociado3 },
    categorias: { categoriaTecnologia, categoriaServicos, categoriaAlimentos },
    subcategorias: { subcategoriaHardware, subcategoriaSoftware, subcategoriaConsultoria, subcategoriaRestaurante },
    ofertas: { oferta1, oferta2 },
    tiposContas: { tipoContaAssociado },
    planos: { planoAssociado }
  };
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seeds:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });