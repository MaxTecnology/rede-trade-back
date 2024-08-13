import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Criação de senhas criptografadas
  const hashedPassword1 = await bcrypt.hash("123456", 10);
  const hashedPassword2 = await bcrypt.hash("123456", 10);
  const hashedPassword3 = await bcrypt.hash("123456", 10);

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
    },
  });

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
    },
  });

  // Criação de um usuário matriz
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
      permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "MANAGE_FRANCHISES"]),
      usuariosCriados: {
        create: [
          {
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
            usuarioCriadorId: undefined,
            matrizId: undefined,
            permissoesDoUsuario: JSON.stringify(["MANAGE_FRANCHISES"]),
          },
          {
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
            usuarioCriadorId: undefined,
            matrizId: undefined,
            permissoesDoUsuario: JSON.stringify(["MANAGE_FRANCHISES"]),
          },
        ],
      },
    },
  });

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
      numeroConta: "12345-6",
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
      usuarioId: usuarioComum.idUsuario,
      plano: {
        create: {
          nomePlano: "Plano Básico",
          tipoDoPlano: "Mensal",
          taxaInscricao: 100,
          taxaComissao: 5,
          taxaManutencaoAnual: 50,
        },
      },
      gerenteContaId: gerenteDeConta.idUsuario,
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
      numeroConta: "65432-1",
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
      usuarioId: gerenteDeConta.idUsuario,
      plano: {
        create: {
          nomePlano: "Plano Premium",
          tipoDoPlano: "Anual",
          taxaInscricao: 1200,
          taxaComissao: 10,
          taxaManutencaoAnual: 100,
        },
      },
      gerenteContaId: usuarioMatriz.idUsuario,
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
      numeroConta: "78901-2",
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
      usuarioId: usuarioMatriz.idUsuario,
      plano: {
        create: {
          nomePlano: "Plano Matriz",
          tipoDoPlano: "Anual",
          taxaInscricao: 1500,
          taxaComissao: 15,
          taxaManutencaoAnual: 200,
        },
      },
      gerenteContaId: null,
      permissoesEspecificas: JSON.stringify(["FULL_MANAGEMENT"]),
    },
  });

  console.log({ usuarioComum, gerenteDeConta, usuarioMatriz, contaUsuarioComum, contaGerente, contaMatriz });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
