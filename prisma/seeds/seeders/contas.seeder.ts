import { PrismaClient } from "@prisma/client";
import { tiposContaData, planosData } from "../data/contas.data";
import { FakerUtils } from "../utils/faker";
import { logger } from "../utils/logger";

export async function seedContas(prisma: PrismaClient, usuarios: any) {
  // Criar tipos de conta
  const tiposConta = [];
  for (const tipoData of tiposContaData) {
    const tipo = await prisma.tipoConta.create({
      data: tipoData
    });
    tiposConta.push(tipo);
    logger.info(`✅ Tipo de conta criado: ${tipo.tipoDaConta}`);
  }

  // Criar planos
  const planos = [];
  for (const planoData of planosData) {
    const plano = await prisma.plano.create({
      data: planoData
    });
    planos.push(plano);
    logger.info(`✅ Plano criado: ${plano.nomePlano}`);
  }

  // Criar contas para cada usuário
  const contas = [];

  // Conta Matriz
  const contaMatriz = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 15,
      limiteCredito: 100000.0,
      limiteUtilizado: 25000.0,
      limiteDisponivel: 75000.0,
      saldoPermuta: 50000.0,
      saldoDinheiro: 25000.0,
      limiteVendaMensal: 200000.0,
      limiteVendaTotal: 1000000.0,
      limiteVendaEmpresa: 500000.0,
      valorVendaMensalAtual: 87500.0,
      valorVendaTotalAtual: 456000.0,
      diaFechamentoFatura: 25,
      dataVencimentoFatura: 10,
      numeroConta: "MTZ000001",
      dataDeAfiliacao: new Date("2023-01-15"),
      nomeFranquia: "Matriz Corp",
      tipoContaId: tiposConta[2].idTipoConta, // Matriz
      usuarioId: usuarios.matriz.idUsuario,
      planoId: planos[2].idPlano, // Plano Matriz
      permissoesEspecificas: JSON.stringify(["FULL_MANAGEMENT", "FINANCIAL_CONTROL"])
    }
  });
  contas.push(contaMatriz);
  logger.info(`✅ Conta Matriz criada: ${contaMatriz.numeroConta}`);

  // Conta Gerente
  const contaGerente = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 10,
      limiteCredito: 50000.0,
      limiteUtilizado: 15000.0,
      limiteDisponivel: 35000.0,
      saldoPermuta: 18000.0,
      saldoDinheiro: 7500.0,
      limiteVendaMensal: 75000.0,
      limiteVendaTotal: 300000.0,
      limiteVendaEmpresa: 150000.0,
      valorVendaMensalAtual: 32500.0,
      valorVendaTotalAtual: 125000.0,
      diaFechamentoFatura: 15,
      dataVencimentoFatura: 5,
      numeroConta: "PRM000001",
      dataDeAfiliacao: new Date("2023-02-20"),
      nomeFranquia: "CE Gestão",
      tipoContaId: tiposConta[1].idTipoConta, // Premium
      usuarioId: usuarios.gerente.idUsuario,
      planoId: planos[1].idPlano, // Plano Premium
      gerenteContaId: usuarios.matriz.idUsuario,
      permissoesEspecificas: JSON.stringify(["ACCOUNT_MANAGEMENT", "REPORT_ACCESS"])
    }
  });
  contas.push(contaGerente);
  logger.info(`✅ Conta Gerente criada: ${contaGerente.numeroConta}`);

  // Conta Usuário Comum
  const contaUsuarioComum = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 5,
      limiteCredito: 15000.0,
      limiteUtilizado: 4500.0,
      limiteDisponivel: 10500.0,
      saldoPermuta: 8200.0,
      saldoDinheiro: 2800.0,
      limiteVendaMensal: 25000.0,
      limiteVendaTotal: 100000.0,
      limiteVendaEmpresa: 50000.0,
      valorVendaMensalAtual: 12800.0,
      valorVendaTotalAtual: 38400.0,
      diaFechamentoFatura: 10,
      dataVencimentoFatura: 25,
      numeroConta: "BSC000001",
      dataDeAfiliacao: new Date("2023-03-10"),
      nomeFranquia: "APS Commerce",
      tipoContaId: tiposConta[0].idTipoConta, // Básica
      usuarioId: usuarios.usuarioComum.idUsuario,
      planoId: planos[0].idPlano, // Plano Básico
      gerenteContaId: usuarios.gerente.idUsuario,
      permissoesEspecificas: JSON.stringify(["BASIC_TRADE"])
    }
  });
  contas.push(contaUsuarioComum);
  logger.info(`✅ Conta Usuário Comum criada: ${contaUsuarioComum.numeroConta}`);

  // Contas das Franquias
  const contaFranquiaA = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 12,
      limiteCredito: 75000.0,
      limiteUtilizado: 22500.0,
      limiteDisponivel: 52500.0,
      saldoPermuta: 28000.0,
      saldoDinheiro: 12000.0,
      limiteVendaMensal: 120000.0,
      limiteVendaTotal: 500000.0,
      limiteVendaEmpresa: 250000.0,
      valorVendaMensalAtual: 54000.0,
      valorVendaTotalAtual: 180000.0,
      diaFechamentoFatura: 20,
      dataVencimentoFatura: 8,
      numeroConta: "FRQ000001",
      dataDeAfiliacao: new Date("2023-01-25"),
      nomeFranquia: "Franquia Salvador",
      tipoContaId: tiposConta[3].idTipoConta, // Franquia
      usuarioId: usuarios.franquiaA.idUsuario,
      planoId: planos[3].idPlano, // Plano Franquia
      gerenteContaId: usuarios.matriz.idUsuario,
      permissoesEspecificas: JSON.stringify(["FRANCHISE_MANAGEMENT", "LOCAL_USER_CONTROL"])
    }
  });
  contas.push(contaFranquiaA);
  logger.info(`✅ Conta Franquia A criada: ${contaFranquiaA.numeroConta}`);

  const contaFranquiaB = await prisma.conta.create({
    data: {
      taxaRepasseMatriz: 12,
      limiteCredito: 75000.0,
      limiteUtilizado: 28000.0,
      limiteDisponivel: 47000.0,
      saldoPermuta: 31500.0,
      saldoDinheiro: 15500.0,
      limiteVendaMensal: 120000.0,
      limiteVendaTotal: 500000.0,
      limiteVendaEmpresa: 250000.0,
      valorVendaMensalAtual: 67000.0,
      valorVendaTotalAtual: 220000.0,
      diaFechamentoFatura: 20,
      dataVencimentoFatura: 8,
      numeroConta: "FRQ000002",
      dataDeAfiliacao: new Date("2023-02-01"),
      nomeFranquia: "Franquia Porto Alegre",
      tipoContaId: tiposConta[3].idTipoConta, // Franquia
      usuarioId: usuarios.franquiaB.idUsuario,
      planoId: planos[3].idPlano, // Plano Franquia
      gerenteContaId: usuarios.matriz.idUsuario,
      permissoesEspecificas: JSON.stringify(["FRANCHISE_MANAGEMENT", "LOCAL_USER_CONTROL"])
    }
  });
  contas.push(contaFranquiaB);
  logger.info(`✅ Conta Franquia B criada: ${contaFranquiaB.numeroConta}`);

  // Contas dos Associados
  const associadosContas = [];
  let contadorAssociado = 1;

  for (const associado of usuarios.associados) {
    const contaAssociado = await prisma.conta.create({
      data: {
        taxaRepasseMatriz: 3,
        limiteCredito: FakerUtils.randomFloat(5000, 20000),
        limiteUtilizado: FakerUtils.randomFloat(1000, 5000),
        saldoPermuta: FakerUtils.randomFloat(500, 3000),
        saldoDinheiro: FakerUtils.randomFloat(200, 1000),
        limiteVendaMensal: FakerUtils.randomFloat(8000, 30000),
        limiteVendaTotal: FakerUtils.randomFloat(40000, 150000),
        limiteVendaEmpresa: FakerUtils.randomFloat(20000, 75000),
        valorVendaMensalAtual: FakerUtils.randomFloat(2000, 8000),
        valorVendaTotalAtual: FakerUtils.randomFloat(8000, 30000),
        diaFechamentoFatura: FakerUtils.randomFromArray([5, 10, 15, 20, 25]),
        dataVencimentoFatura: FakerUtils.randomFromArray([5, 10, 15, 20, 25, 30]),
        numeroConta: `ASS${String(contadorAssociado).padStart(6, '0')}`,
        dataDeAfiliacao: FakerUtils.futureDate(-Math.floor(Math.random() * 365)),
        nomeFranquia: associado.nomeFantasia,
        tipoContaId: tiposConta[4].idTipoConta, // Associado
        usuarioId: associado.idUsuario,
        planoId: planos[4].idPlano, // Plano Associado
        gerenteContaId: usuarios.franquiaA.idUsuario, // Distribuir entre franquias
        permissoesEspecificas: JSON.stringify(["ASSOCIATE_TRADE"])
      }
    });
    
    // Calcular limiteDisponivel
    await prisma.conta.update({
      where: { idConta: contaAssociado.idConta },
      data: {
        limiteDisponivel: contaAssociado.limiteCredito - contaAssociado.limiteUtilizado
      }
    });

    associadosContas.push(contaAssociado);
    logger.info(`✅ Conta Associado ${contadorAssociado} criada: ${contaAssociado.numeroConta}`);
    contadorAssociado++;
  }

  // Criar SubContas de exemplo
  const subContas = [];
  
  const subConta1 = await prisma.subContas.create({
    data: {
      nome: "Filial São Paulo APS",
      email: "filial.sp@apscommerce.com.br",
      cpf: "99999999999",
      numeroSubConta: "BSC000001-001",
      senha: await require('bcrypt').hash("123456", 10),
      imagem: "subconta_sp.png",
      statusConta: true,
      reputacao: 4.0,
      telefone: "1133334455",
      celular: "11999887766",
      emailContato: "filial.sp@apscommerce.com.br",
      logradouro: "Rua das Filiais",
      numero: 100,
      cep: "01234567",
      bairro: "Vila Madalena",
      cidade: "São Paulo",
      estado: "SP",
      contaPaiId: contaUsuarioComum.idConta,
      permissoes: JSON.stringify(["READ", "WRITE", "TRADE_LIMITED"])
    }
  });
  subContas.push(subConta1);
  logger.info(`✅ SubConta criada: ${subConta1.numeroSubConta}`);

  return {
    tiposConta,
    planos,
    contas,
    subContas,
    contaMatriz,
    contaGerente,
    contaUsuarioComum,
    contaFranquiaA,
    contaFranquiaB,
    associadosContas
  };
}