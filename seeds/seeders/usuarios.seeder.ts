import { PrismaClient, UsuarioAuthTipo } from "@prisma/client";
import { usuariosData, hashPasswords } from "../data/usuarios.data";
import { logger } from "../utils/logger";

export async function seedUsuarios(prisma: PrismaClient) {
  const { matriz: matrizHash } = await hashPasswords();

  const matriz = await prisma.usuarios.upsert({
    where: { cpf: usuariosData.matriz.cpf },
    update: {
      senha: matrizHash,
      email: usuariosData.matriz.email,
      nome: usuariosData.matriz.nome,
      nomeFantasia: usuariosData.matriz.nomeFantasia,
      cnpj: usuariosData.matriz.cnpj,
      descricao: usuariosData.matriz.descricao,
      telefone: usuariosData.matriz.telefone,
      celular: usuariosData.matriz.celular,
      emailContato: usuariosData.matriz.emailContato,
      emailSecundario: usuariosData.matriz.emailSecundario,
      site: usuariosData.matriz.site,
      logradouro: usuariosData.matriz.logradouro,
      numero: usuariosData.matriz.numero,
      complemento: usuariosData.matriz.complemento,
      bairro: usuariosData.matriz.bairro,
      cidade: usuariosData.matriz.cidade,
      estado: usuariosData.matriz.estado,
      cep: usuariosData.matriz.cep,
      regiao: usuariosData.matriz.regiao,
      tipo: "Matriz",
      matrizId: null,
      usuarioCriadorId: null,
      tipoAuth: UsuarioAuthTipo.OPERACIONAL,
    },
    create: {
      ...usuariosData.matriz,
      senha: matrizHash,
      matrizId: null,
      usuarioCriadorId: null,
      tipoAuth: UsuarioAuthTipo.OPERACIONAL,
    },
  });

  logger.info(`✅ Matriz disponível: ${matriz.email}`);

  const matrizRegistro = await prisma.matriz.upsert({
    where: { usuarioId: matriz.idUsuario },
    update: {
      nome: usuariosData.matriz.nomeFantasia || usuariosData.matriz.nome,
      cnpj: usuariosData.matriz.cnpj,
      descricao: usuariosData.matriz.descricao,
      contatos: {
        nomeContato: usuariosData.matriz.nomeContato,
        telefone: usuariosData.matriz.telefone,
        celular: usuariosData.matriz.celular,
        emailContato: usuariosData.matriz.emailContato,
        emailSecundario: usuariosData.matriz.emailSecundario,
        site: usuariosData.matriz.site,
      },
      endereco: {
        logradouro: usuariosData.matriz.logradouro,
        numero: usuariosData.matriz.numero,
        complemento: usuariosData.matriz.complemento,
        bairro: usuariosData.matriz.bairro,
        cidade: usuariosData.matriz.cidade,
        estado: usuariosData.matriz.estado,
        cep: usuariosData.matriz.cep,
        regiao: usuariosData.matriz.regiao,
      },
    },
    create: {
      nome: usuariosData.matriz.nomeFantasia || usuariosData.matriz.nome,
      cnpj: usuariosData.matriz.cnpj,
      descricao: usuariosData.matriz.descricao,
      contatos: {
        nomeContato: usuariosData.matriz.nomeContato,
        telefone: usuariosData.matriz.telefone,
        celular: usuariosData.matriz.celular,
        emailContato: usuariosData.matriz.emailContato,
        emailSecundario: usuariosData.matriz.emailSecundario,
        site: usuariosData.matriz.site,
      },
      endereco: {
        logradouro: usuariosData.matriz.logradouro,
        numero: usuariosData.matriz.numero,
        complemento: usuariosData.matriz.complemento,
        bairro: usuariosData.matriz.bairro,
        cidade: usuariosData.matriz.cidade,
        estado: usuariosData.matriz.estado,
        cep: usuariosData.matriz.cep,
        regiao: usuariosData.matriz.regiao,
      },
      usuarioId: matriz.idUsuario,
    },
  });

  const filialMatrizMaster = await prisma.filial.upsert({
    where: { usuarioId: matriz.idUsuario },
    update: {
      nomeFantasia: usuariosData.matriz.nomeFantasia || usuariosData.matriz.nome,
      cnpj: usuariosData.matriz.cnpj,
      tipo: "MASTER",
      matrizId: matrizRegistro.id,
      contatos: {
        nomeContato: usuariosData.matriz.nomeContato,
        telefone: usuariosData.matriz.telefone,
        celular: usuariosData.matriz.celular,
        emailContato: usuariosData.matriz.emailContato,
        emailSecundario: usuariosData.matriz.emailSecundario,
        site: usuariosData.matriz.site,
      },
      endereco: {
        logradouro: usuariosData.matriz.logradouro,
        numero: usuariosData.matriz.numero,
        complemento: usuariosData.matriz.complemento,
        bairro: usuariosData.matriz.bairro,
        cidade: usuariosData.matriz.cidade,
        estado: usuariosData.matriz.estado,
        cep: usuariosData.matriz.cep,
        regiao: usuariosData.matriz.regiao,
      },
    },
    create: {
      nomeFantasia: usuariosData.matriz.nomeFantasia || usuariosData.matriz.nome,
      cnpj: usuariosData.matriz.cnpj,
      tipo: "MASTER",
      matrizId: matrizRegistro.id,
      contatos: {
        nomeContato: usuariosData.matriz.nomeContato,
        telefone: usuariosData.matriz.telefone,
        celular: usuariosData.matriz.celular,
        emailContato: usuariosData.matriz.emailContato,
        emailSecundario: usuariosData.matriz.emailSecundario,
        site: usuariosData.matriz.site,
      },
      endereco: {
        logradouro: usuariosData.matriz.logradouro,
        numero: usuariosData.matriz.numero,
        complemento: usuariosData.matriz.complemento,
        bairro: usuariosData.matriz.bairro,
        cidade: usuariosData.matriz.cidade,
        estado: usuariosData.matriz.estado,
        cep: usuariosData.matriz.cep,
        regiao: usuariosData.matriz.regiao,
      },
      usuarioId: matriz.idUsuario,
    },
  });

  const tipoContaMatriz =
    (await prisma.tipoConta.findFirst({ where: { tipoDaConta: "Matriz" } })) ||
    (await prisma.tipoConta.create({
      data: {
        tipoDaConta: "Matriz",
        prefixoConta: "MTZ",
        descricao: "Conta padrão da matriz",
        permissoes: JSON.stringify([]),
      },
    }));

  const existingConta = await prisma.conta.findFirst({ where: { usuarioId: matriz.idUsuario } });

  if (!existingConta) {
    const contasExistentes = await prisma.conta.findMany({
      where: { numeroConta: { startsWith: "MTZ" } },
      select: { numeroConta: true },
      orderBy: { numeroConta: "desc" },
      take: 1,
    });

    let numeroConta = "MTZ000001";
    if (contasExistentes.length > 0) {
      const proximo = parseInt(contasExistentes[0].numeroConta.replace("MTZ", ""), 10) + 1;
      numeroConta = `MTZ${proximo.toString().padStart(6, "0")}`;
    }

    await prisma.conta.create({
      data: {
        usuarioId: matriz.idUsuario,
        matrizId: matrizRegistro.id,
        filialId: filialMatrizMaster.id,
        clienteId: null,
        tipoContaId: tipoContaMatriz.idTipoConta,
        numeroConta,
        nomeFranquia: matrizRegistro.nome,
        limiteCredito: 0,
        limiteUtilizado: 0,
        saldoPermuta: 0,
        saldoDinheiro: 0,
        limiteVendaMensal: 0,
        limiteVendaTotal: 0,
        limiteVendaEmpresa: 0,
        valorVendaMensalAtual: 0,
        valorVendaTotalAtual: 0,
        dataDeAfiliacao: new Date(),
        diaFechamentoFatura: 25,
        dataVencimentoFatura: 10,
        permissoesEspecificas: JSON.stringify([]),
        status: "ATIVA",
      },
    });
  }

  return matriz;
}
