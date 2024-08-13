import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ContaInfo, obterContaInfo } from "../utils/transactions.utils";
import { enviarEmailTransacao } from "../utils/utils";
const prisma = new PrismaClient();

export const insertTransaction = async (req: Request, res: Response) => {
  try {
    let contaComprador: ContaInfo | null;
    let contaVendedor: ContaInfo | null;
    const {
      compradorId,
      vendedorId,
      subContaCompradorId,
      subContaVendedorId,
      valorRt,
      numeroParcelas,
      descricao,
      nomeComprador,
      nomeVendedor,
      notaAtendimento,
      valorAdicional,
      observacaoNota,
      ofertaId,
    } = req.body;

    // Obtenha as informações da conta do comprador e vendedor usando a função
    contaComprador = await obterContaInfo(subContaCompradorId, compradorId);
    contaVendedor = await obterContaInfo(subContaVendedorId, vendedorId);

    if (!contaComprador || !contaVendedor) {
      return res
        .status(400)
        .json({ error: "Comprador ou vendedor não encontrado" });
    }

    const transacoesVendedor = await prisma.transacao.findMany({
      where: { vendedorId },
    });

    const totalTransacoesVendedor = transacoesVendedor.reduce(
      (total, transacao) => total + transacao.valorRt,
      0
    );

    if (totalTransacoesVendedor + valorRt > contaVendedor.limiteVendaEmpresa) {
      return res
        .status(400)
        .json({ error: "Vendedor atingiu o limite de venda da empresa." });
    }

    if (totalTransacoesVendedor + valorRt > contaVendedor.limiteVendaTotal) {
      return res
        .status(400)
        .json({ error: "Vendedor atingiu o limite total de venda." });
    }
    let saldoUtilizado: string | null = null;
    let limiteUtilizado: number | null = 0;
    let limiteDisponivel: number | null = null;

    const saldoCreditoDisponivel =
      contaComprador.limiteCredito - contaComprador.limiteUtilizado;

    const saldoAnteriorComprador = contaComprador.saldoPermuta ?? 0;
    let saldoAposComprador = 0;

    const saldoAnteriorVendedor = contaVendedor.saldoPermuta ?? 0;
    let saldoAposVendedor = 0;

    let limiteCreditoDisponivelAnterior = saldoCreditoDisponivel;

    const saldoTotalDisponivel =
      saldoCreditoDisponivel + saldoAnteriorComprador;

    if (saldoTotalDisponivel < valorRt) {
      return res.json({
        message:
          "O comprador não possuí limite de crédito disponível para esta transação.",
      });
    }

    if (valorRt <= saldoAnteriorComprador) {
      saldoAposComprador = saldoAnteriorComprador - valorRt;
      saldoUtilizado = `saldoPermuta - ${valorRt}`;
      limiteDisponivel =
        contaComprador.limiteCredito - contaComprador.limiteUtilizado;
      await prisma.conta.update({
        where: { idConta: contaComprador.idConta },
        data: {
          saldoPermuta: saldoAposComprador,
          limiteDisponivel,
        },
      });
    } else {
      const valorAbatidoSaldoPermuta = saldoAnteriorComprador;
      const valorRestante = valorRt - valorAbatidoSaldoPermuta;

      limiteUtilizado = valorRestante;
      saldoAposComprador = saldoAnteriorComprador - valorRt;
      limiteDisponivel = contaComprador.limiteCredito - (limiteUtilizado ?? 0);
      saldoUtilizado = `saldoPermuta - ${valorAbatidoSaldoPermuta} / limiteCredito - ${limiteUtilizado}`;
      await prisma.conta.update({
        where: { idConta: contaComprador.idConta },
        data: {
          saldoPermuta: saldoAposComprador,
          limiteDisponivel,
          limiteUtilizado,
        },
      });
    }

    let limiteCreditoDisponivelAposComprador = limiteDisponivel;
    saldoAposVendedor = saldoAnteriorVendedor + valorRt;

    let comissao = 0;
    let comissaoParcelada = 0;

    if (contaComprador && contaComprador.planoId) {
      const plano = await prisma.plano.findUnique({
        where: { idPlano: contaComprador.planoId },
      });

      if (plano) {
        comissao = (plano.taxaComissao / 100) * valorRt;

        if (numeroParcelas) {
          comissaoParcelada = comissao / numeroParcelas;
        }
      }
    }

    const comprador = await prisma.usuarios.findUnique({
      where: { idUsuario: compradorId },
    });

    const vendedor = await prisma.usuarios.findUnique({
      where: { idUsuario: vendedorId },
    });
    const compradorNome = comprador?.nome;
    const vendedorNome = vendedor?.nome;

    const novaTransacao = await prisma.transacao.create({
      data: {
        compradorId,
        vendedorId,
        valorRt,
        numeroParcelas,
        descricao,
        saldoAnteriorComprador,
        saldoAnteriorVendedor,
        saldoAposComprador,
        limiteCreditoAnteriorComprador: limiteCreditoDisponivelAnterior,
        limiteCreditoAposComprador: limiteCreditoDisponivelAposComprador,
        saldoAposVendedor,
        comissao,
        comissaoParcelada,
        nomeComprador: compradorNome || nomeComprador,
        nomeVendedor: vendedorNome || nomeVendedor,
        notaAtendimento,
        subContaCompradorId: subContaCompradorId || null,
        subContaVendedorId: subContaVendedorId || null,
        valorAdicional,
        observacaoNota,
        ofertaId,
        saldoUtilizado: saldoUtilizado || "",
        status: "Concluída",
      },
    });

    await prisma.conta.update({
      where: { idConta: contaVendedor.idConta },
      data: {
        saldoPermuta: saldoAposVendedor,
      },
    });

    const dataAtual = new Date();
    const diaFechamentoFatura = contaComprador.diaFechamentoFatura;

    let dataVencimento = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      contaComprador.dataVencimentoFatura
    );

    if (dataAtual.getDate() >= diaFechamentoFatura) {
      dataVencimento.setMonth(dataVencimento.getMonth() + 1);
    }

    const cobrancasParceladas = [];

    for (let i = 1; i <= numeroParcelas; i++) {
      const novaCobrancaParcelada = await prisma.cobranca.create({
        data: {
          valorFatura: comissaoParcelada,
          referencia: `Transação #${novaTransacao.idTransacao} - Parcela ${i}`,
          status: "Emitida",
          transacaoId: novaTransacao.idTransacao,
          usuarioId: novaTransacao.compradorId,
          contaId: contaComprador.idConta,
          vencimentoFatura: dataVencimento,
          gerenteContaId: contaComprador.gerenteContaId,
        },
      });

      cobrancasParceladas.push(novaCobrancaParcelada);
    }

    function formatarData(data: Date): string {
      const dia = String(data.getDate()).padStart(2, "0");
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const ano = data.getFullYear();
      const horas = String(data.getHours()).padStart(2, "0");
      const minutos = String(data.getMinutes()).padStart(2, "0");

      return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }

    const dataFormatada = formatarData(new Date());

    const corpoEmailComprador =
      `Olá ${comprador?.nome}, Obrigado por sua transação na plataforma RedeTrade. Abaixo estão os detalhes da transação:\n\n` +
      `Data da transação: ${dataFormatada}\n` +
      `Código da transação: ${novaTransacao.codigo}\n` +
      `Valor da transação: R$ ${valorRt.toFixed(2)}\n` +
      `Número de Parcelas: ${numeroParcelas}\n` +
      `Descrição: ${descricao}\n` +
      `Nome do Vendedor: ${nomeVendedor}\n` +
      `Nota de Atendimento: ${notaAtendimento}\n` +
      `Observações: ${observacaoNota}\n` +
      `Status: ${novaTransacao.status}\n` +
      `Agradecemos por usar a RedeTrade!`;

    const corpoEmailVendedor =
      `Olá ${vendedor?.nome},Você recebeu uma nova transação na plataforma RedeTrade. Abaixo estão os detalhes da transação:\n\n` +
      `Data da transação: ${dataFormatada}\n` +
      `Código da transação: ${novaTransacao.codigo}\n` +
      `Data da transação: ${Date.now()}\n` +
      `Valor da transação: RT$ ${valorRt.toFixed(2)}\n` +
      `Número de Parcelas: ${numeroParcelas}\n` +
      `Descrição: ${descricao}\n` +
      `Nome do Comprador: ${nomeComprador}\n` +
      `Nota de Atendimento: ${notaAtendimento}\n` +
      `Observações: ${observacaoNota}\n` +
      `Status: ${novaTransacao.status}\n` +
      `Agradecemos por usar a RedeTrade!`;

    const emailComprador = comprador?.email;
    const emailVendedor = vendedor?.email;

    if (emailComprador && emailVendedor) {
      await enviarEmailTransacao(
        emailComprador,
        "Confirmação de Transação - RedeTrade",
        corpoEmailComprador
      );
      await enviarEmailTransacao(
        emailVendedor,
        "Confirmação de Transação - RedeTrade",
        corpoEmailVendedor
      );
      return res.status(201).json({ novaTransacao, cobrancasParceladas });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar transação." });
  }
};

export const encaminharEstorno = async (req: Request, res: Response) => {
  try {
    const { idTransacao } = req.params;

    // Atualize o status da transação para "Encaminhada para estorno"
    await prisma.transacao.update({
      where: { idTransacao: Number(idTransacao) },
      data: { status: "Encaminhada para estorno" },
    });

    return res
      .status(200)
      .json({ message: "Transação encaminhada para estorno com sucesso." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao encaminhar transação para estorno." });
  }
};
export const visualizarTransacoesEstorno = async (
  req: Request,
  res: Response
) => {
  try {
    const { idFranquia } = req.params;

    // Busque todas as transações com status "Encaminhada para estorno"
    const transacoes = await prisma.transacao.findMany({
      where: {
        OR: [
          {
            comprador: {
              usuarioCriadorId: Number(idFranquia),
            },
          },
          {
            vendedor: {
              usuarioCriadorId: Number(idFranquia),
            },
          },
        ],
        status: "Encaminhada para estorno",
      },
      include: {
        voucher: true,
        cobrancas: true,
      },
    });

    return res.status(200).json({ "Solicitações de estorno": transacoes });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erro ao visualizar transações encaminhadas para estorno.",
    });
  }
};
export const encaminharSolicitacaoEstornoMatriz = async (
  req: Request,
  res: Response
) => {
  try {
    const { idTransacao } = req.params;

    // Atualize o status da transação para "Encaminhada solicitação de estorno para matriz"
    await prisma.transacao.update({
      where: { idTransacao: Number(idTransacao) },
      data: { status: "Encaminhada solicitação de estorno para matriz" },
    });

    return res.status(200).json({
      message: "Solicitação de estorno encaminhada para matriz com sucesso.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erro ao encaminhar solicitação de estorno para matriz.",
    });
  }
};
export const visualizarTransacoesEstornoMatriz = async (
  req: Request,
  res: Response
) => {
  try {
    const { idMatriz } = req.params;

    // Busque todas as transações com status "Encaminhada solicitação de estorno para matriz"
    const transacoes = await prisma.transacao.findMany({
      where: {
        OR: [
          { comprador: { matrizId: Number(idMatriz) } },
          { vendedor: { matrizId: Number(idMatriz) } },
        ],
        status: "Encaminhada solicitação de estorno para matriz",
      },
    });

    return res.status(200).json({ transacoes });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erro ao visualizar transações encaminhadas para matriz.",
    });
  }
};
export const estornarTransacao = async (req: Request, res: Response) => {
  try {
    const { idTransacao } = req.params;

    // Busque a transação pelo ID
    const transacao = await prisma.transacao.findUnique({
      where: { idTransacao: Number(idTransacao) },
    });

    if (!transacao) {
      return res.status(404).json({ error: "Transação não encontrada." });
    }
    const { compradorId, vendedorId, valorRt, saldoUtilizado } = transacao;

    if (!compradorId || !vendedorId) {
      return res
        .status(400)
        .json({ error: "ID do comprador ou vendedor ausente" });
    }

    // Obtendo a conta do comprador
    const usuarioComprador = await prisma.usuarios.findUnique({
      where: { idUsuario: compradorId },
      include: { conta: true },
    });

    if (
      !usuarioComprador ||
      !usuarioComprador.conta ||
      usuarioComprador.conta.idConta === null
    ) {
      return res
        .status(404)
        .json({ error: "Conta do comprador não encontrada" });
    }

    const contaComprador = usuarioComprador.conta;

    // Restaurando os saldos
    // Restaurando os saldos
    if (saldoUtilizado) {
      const saldoUtilizadoParts = saldoUtilizado.split("/");
      let novoSaldoPermuta = contaComprador.saldoPermuta ?? 0;
      let novoLimiteUtilizado = contaComprador.limiteUtilizado ?? 0;
      let saldoPermutaUtilizado = 0;
      let limiteUtilizado = 0;

      await Promise.all(
        saldoUtilizadoParts.map(async (part) => {
          const [tipoSaldo, valorStr] = part.trim().split("-");
          const valor = parseInt(valorStr);

          if (tipoSaldo.trim() === "saldoPermuta") {
            novoSaldoPermuta = (novoSaldoPermuta ?? 0) + valor;
            saldoPermutaUtilizado = valor;
          } else if (tipoSaldo.trim() === "limiteCredito") {
            novoLimiteUtilizado -= valor;
            limiteUtilizado = valor;
          }
        })
      );

      const novoLimiteDisponivel =
        contaComprador.limiteCredito - novoLimiteUtilizado;
      const saldoPermutaEstornar =
        limiteUtilizado > 0 ? (novoSaldoPermuta ?? 0) + limiteUtilizado : novoSaldoPermuta ?? 0;

      // Atualizar a conta com os novos saldos
      await prisma.conta.update({
        where: { idConta: contaComprador.idConta },
        data: {
          saldoPermuta: saldoPermutaEstornar,
          limiteUtilizado: novoLimiteUtilizado,
          limiteDisponivel: novoLimiteDisponivel,
        },
      });
    }

    // Debitando do saldoPermuta do vendedor
    const usuarioVendedor = await prisma.usuarios.findUnique({
      where: { idUsuario: vendedorId },
      include: { conta: true },
    });

    if (
      !usuarioVendedor ||
      !usuarioVendedor.conta ||
      usuarioVendedor.conta.idConta === null
    ) {
      return res.status(404).json({ error: "Conta do vendedor não encontrada" });
    }

    const contaVendedor = usuarioVendedor.conta;
    await prisma.conta.update({
      where: { idConta: contaVendedor.idConta },
      data: {
        saldoPermuta: (contaVendedor.saldoPermuta ?? 0) - valorRt,
      },
    });

    // Excluir cobranças associadas à transação
    await prisma.cobranca.deleteMany({
      where: { transacaoId: Number(idTransacao) },
    });

    // Buscar os vouchers associados à transação
    const vouchers = await prisma.voucher.findMany({
      where: { transacaoId: Number(idTransacao) },
    });

    // Atualizar status e adicionar data de estorno nos vouchers
    await Promise.all(
      vouchers.map(async (voucher) => {
        await prisma.voucher.update({
          where: { idVoucher: voucher.idVoucher },
          data: {
            status: "Cancelado",
            dataCancelamento: new Date(),
          },
        });
      })
    );

    // Atualizar status e adicionar data de estorno na transação
    await prisma.transacao.update({
      where: { idTransacao: Number(idTransacao) },
      data: {
        status: "Estornada",
        dataDoEstorno: new Date(),
      },
    });

    return res.status(200).json({ message: "Transação estornada com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao estornar transação." });
  }
};
// Controlador para listar todas as transações estornadas
export const listarTransacoesEstornadas = async (
  req: Request,
  res: Response
) => {
  try {
    const transacoesEstornadas = await prisma.transacao.findMany({
      where: {
        status: "Estornada",
      },
      include: {
        voucher: true,
      },
    });
    return res.status(200).json({ transacoesEstornadas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar transações estornadas." });
  }
};
// Controlador para listar todas as transações estornadas de uma unidade (agência) e seus associados
export const listarTransacoesEstornadasPorAgencia = async (
  req: Request,
  res: Response
) => {
  try {
    const { agenciaId } = req.params;

    // Verifique se o ID da agência foi fornecido
    if (!agenciaId) {
      return res.status(400).json({ error: "ID da agência não fornecido" });
    }

    // Verifique se o usuário criador tem uma conta com tipoDaConta "Franquia"
    const usuarioCriador = await prisma.usuarios.findUnique({
      where: { idUsuario: parseInt(agenciaId, 10) },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
          },
        },
      },
    });

    if (
      !usuarioCriador ||
      !usuarioCriador.conta ||
      usuarioCriador.conta.tipoDaConta?.tipoDaConta !== "Franquia"
    ) {
      return res
        .status(403)
        .json({ error: "Usuário criador não é uma franquia válida." });
    }

    // Busque todas as transações estornadas da agência e seus associados
    const transacoesEstornadas = await prisma.transacao.findMany({
      where: {
        status: "Estornada",
        OR: [
          { comprador: { usuarioCriadorId: parseInt(agenciaId, 10) } },
          { vendedor: { usuarioCriadorId: parseInt(agenciaId, 10) } },
        ],
      },
      include: {
        voucher: true,
      },
    });

    return res.status(200).json({ transacoesEstornadas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar transações estornadas." });
  }
};
