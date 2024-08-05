// accountController.ts
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export const criarConta = async (req: Request, res: Response) => {
  try {
    const {
      tipoDaConta,
      nomeFranquia,
      diaFechamentoFatura,
      dataVencimentoFatura,
      saldoPermuta,
      saldoDinheiro,
      limiteCredito,
      limiteVendaEmpresa,
      limiteVendaMensal,
      limiteVendaTotal,
      valorVendaMensalAtual,
      valorVendaTotalAtual,
      taxaRepasseMatriz,
      planoId,
      permissoesEspecificas,
    } = req.body;
    const idUsuario = parseInt(req.params.id, 10);

    // Encontrar o usuário pelo ID
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { idUsuario },
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    // Verificar se o usuário já possui uma conta
    const usuarioContaExistente = await prisma.conta.findFirst({
      where: { usuarioId: idUsuario },
      include: {
        usuario: true,
      },
    });

    if (usuarioContaExistente) {
      return res.status(400).json({
        error: "Este usuário já possui uma conta.",
      });
    }

    // Verificar se o usuário possui um usuárioCriadorId
    const usuarioCriadorId = usuarioExistente.usuarioCriadorId;

    if (!usuarioCriadorId) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar informações do usuário criador." });
    }

    const usuarioCriador = await prisma.usuarios.findUnique({
      where: { idUsuario: usuarioCriadorId },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
          },
        },
      },
    });
    //console.log(usuarioCriador?.conta?.tipoDaConta)

    // Encontrar o tipo de conta pelo tipo informado
    const tipoConta = await prisma.tipoConta.findFirst({
      where: { tipoDaConta },
    });

    if (!tipoConta) {
      return res.status(404).json({ error: "Tipo de conta não encontrado." });
    }

    // Lógica para gerar o número da conta
    let numeroConta = "";

    if (
      usuarioCriador?.conta?.tipoDaConta &&
      usuarioCriador?.conta?.tipoDaConta.tipoDaConta === "Matriz" &&
      tipoConta.tipoDaConta === "Franquia Comum"
    ) {
      const numeroMatriz = usuarioCriador?.conta?.numeroConta.split("-")[0];

      // Encontrar o último número de conta cadastrado com o tipo de conta "Franquia Comum"
      const ultimaContaFranquia = await prisma.conta.findFirst({
        where: {
          tipoContaId: tipoConta.idTipoConta,
        },
        orderBy: { idConta: "desc" },
      });

      const prefixoFranquia = tipoConta.prefixoConta || ""; // Prefixo para Franquia Comum

      const proximoNumeroContaFranquia = ultimaContaFranquia
        ? ultimaContaFranquia.idConta + 1
        : 1;

      numeroConta = `${numeroMatriz}/${prefixoFranquia}${proximoNumeroContaFranquia}`;
    } else if (
      usuarioCriador?.conta?.tipoDaConta &&
      usuarioCriador?.conta?.tipoDaConta.tipoDaConta === "Franquia Comum" &&
      tipoConta.tipoDaConta === "Associado"
    ) {
      const usuarioCriadorAssociadoId = usuarioExistente.usuarioCriadorId;

      if (!usuarioCriadorAssociadoId) {
        return res
          .status(500)
          .json({ error: "Erro ao buscar informações do usuário criador." });
      }

      const usuarioCriadorAssociado = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioCriadorAssociadoId },
        include: {
          conta: {
            include: {
              tipoDaConta: true,
            },
          },
        },
      });

      if (!usuarioCriadorAssociado) {
        return res
          .status(500)
          .json({ error: "Erro ao buscar informações do usuário criador." });
      }
      // Encontrar o último número de conta cadastrado com o tipo de conta "Associado"
      const ultimaContaAssociado = await prisma.conta.findFirst({
        where: {
          tipoContaId: tipoConta.idTipoConta,
        },
        orderBy: { idConta: "desc" },
      });
      const prefixoAssociado = tipoConta.prefixoConta || "400"; // Prefixo para Associado
      const proximoNumeroContaAssociado = ultimaContaAssociado
        ? ultimaContaAssociado.idConta + 1
        : 1;
      const contaFranquiaPai =
        usuarioCriadorAssociado?.conta?.numeroConta.split("/")[1] || "";
      numeroConta = `${contaFranquiaPai}/${prefixoAssociado}${proximoNumeroContaAssociado}`;
    } else if (
      usuarioCriador?.conta?.tipoDaConta &&
      usuarioCriador?.conta?.tipoDaConta.tipoDaConta === "Matriz" &&
      tipoConta.tipoDaConta === "Associado"
    ) {
      const ultimaConta = await prisma.conta.findFirst({
        where: {
          tipoContaId: tipoConta.idTipoConta,
        },
        orderBy: { idConta: "desc" },
      });
      const numeroMatriz = usuarioCriador?.conta?.numeroConta.split("-")[0];

      const prefixoAssociado = tipoConta.prefixoConta || "400";

      const proximoNumeroConta = ultimaConta ? ultimaConta.idConta : 1;

      numeroConta = `${numeroMatriz}/${prefixoAssociado}${proximoNumeroConta}`;
    } else {
      // Lógica para gerar o número da conta quando não é "Matriz" ou "Franquia Comum"

      // Encontrar o último número de conta cadastrado com o tipo de conta especificado
      const ultimaConta = await prisma.conta.findFirst({
        where: {
          tipoContaId: tipoConta.idTipoConta,
        },
        orderBy: { idConta: "desc" },
      });

      const prefixoConta = tipoConta.prefixoConta || ""; // Prefixo para o tipo de conta, ajuste conforme necessário
      const proximoNumeroConta = ultimaConta ? ultimaConta.idConta + 1 : 1;

      numeroConta = `${prefixoConta}${proximoNumeroConta}`;
    }

    // Criar a conta associada ao usuário
    const novaConta = await prisma.conta.create({
      data: {
        tipoContaId: tipoConta.idTipoConta,
        usuarioId: idUsuario,
        numeroConta,
        limiteCredito: limiteCredito || 0,
        saldoPermuta: saldoPermuta || 0,
        saldoDinheiro: saldoDinheiro || 0,
        diaFechamentoFatura,
        dataVencimentoFatura,
        nomeFranquia,
        limiteVendaEmpresa,
        limiteVendaMensal,
        limiteVendaTotal,
        valorVendaMensalAtual,
        valorVendaTotalAtual,
        taxaRepasseMatriz,
        permissoesEspecificas,
        planoId,
      },
      include: {
        plano: true,
      },
    });
    // Registrar o valor no FundoPermuta
    const fundoPermutaData = {
      valor: limiteCredito || 0,
      usuarioId: idUsuario,
    };

    await prisma.fundoPermuta.create({
      data: fundoPermutaData,
    });

    return res.status(201).json(novaConta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
