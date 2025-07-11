import { PrismaClient } from "@prisma/client";
import { transacoesExemplo } from "../data/transacoes.data";
import { FakerUtils } from "../utils/faker";
import { logger } from "../utils/logger";

export async function seedTransacoes(prisma: PrismaClient, usuarios: any, ofertas: any) {
  const transacoes = [];
  const todosUsuarios = [
    usuarios.matriz,
    usuarios.gerente,
    usuarios.usuarioComum,
    usuarios.franquiaA,
    usuarios.franquiaB,
    ...usuarios.associados
  ];

  for (let i = 0; i < transacoesExemplo.length && i < ofertas.length; i++) {
    const transacaoData = transacoesExemplo[i];
    const oferta = ofertas[i];
    
    // Escolher comprador e vendedor diferentes
    const vendedor = todosUsuarios.find((u: any) => u.idUsuario === oferta.usuarioId);
    const comprador = FakerUtils.randomFromArray(
      todosUsuarios.filter((u: any) => u.idUsuario !== vendedor?.idUsuario)
    );

    // Simular saldos anteriores e posteriores
    const saldoAnteriorComprador = FakerUtils.randomFloat(5000, 20000);
    const saldoAposComprador = saldoAnteriorComprador - transacaoData.valorRt;
    const saldoAnteriorVendedor = FakerUtils.randomFloat(3000, 15000);
    const saldoAposVendedor = saldoAnteriorVendedor + transacaoData.valorRt;

    const limiteCreditoAnterior = FakerUtils.randomFloat(10000, 50000);
    const limiteCreditoApos = limiteCreditoAnterior + (transacaoData.valorRt * 0.1);

    const transacao = await prisma.transacao.create({
      data: {
        codigo: crypto.randomUUID(),
        nomeComprador: comprador.nome,
        nomeVendedor: vendedor.nome,
        compradorId: comprador.idUsuario,
        vendedorId: vendedor.idUsuario,
        saldoUtilizado: transacaoData.saldoUtilizado,
        valorRt: transacaoData.valorRt,
        valorAdicional: transacaoData.valorAdicional,
        saldoAnteriorComprador: saldoAnteriorComprador,
        saldoAposComprador: saldoAposComprador,
        saldoAnteriorVendedor: saldoAnteriorVendedor,
        saldoAposVendedor: saldoAposVendedor,
        limiteCreditoAnteriorComprador: limiteCreditoAnterior,
        limiteCreditoAposComprador: limiteCreditoApos,
        numeroParcelas: transacaoData.numeroParcelas,
        descricao: transacaoData.descricao,
        notaAtendimento: transacaoData.notaAtendimento,
        observacaoNota: transacaoData.observacaoNota,
        status: transacaoData.status,
        emiteVoucher: transacaoData.emiteVoucher,
        ofertaId: oferta.idOferta,
        comissao: transacaoData.valorRt * 0.05, // 5% de comissão
        comissaoParcelada: (transacaoData.valorRt * 0.05) / transacaoData.numeroParcelas
      }
    });

    // Criar parcelamento se necessário
    if (transacaoData.numeroParcelas > 1) {
      const valorParcela = transacaoData.valorRt / transacaoData.numeroParcelas;
      const comissaoParcela = (transacaoData.valorRt * 0.05) / transacaoData.numeroParcelas;

      for (let parcela = 1; parcela <= transacaoData.numeroParcelas; parcela++) {
        await prisma.parcelamento.create({
          data: {
            numeroParcela: parcela,
            valorParcela: valorParcela,
            comissaoParcela: comissaoParcela,
            transacaoId: transacao.idTransacao
          }
        });
      }
      logger.info(`✅ Parcelamento criado: ${transacaoData.numeroParcelas}x de R$ ${valorParcela.toFixed(2)}`);
    }

    // Criar voucher se necessário
    if (transacaoData.emiteVoucher) {
      await prisma.voucher.create({
        data: {
          codigo: crypto.randomUUID(),
          status: "Ativo",
          transacaoId: transacao.idTransacao
        }
      });
      logger.info(`✅ Voucher criado para transação ${transacao.codigo}`);
    }

    // Criar cobrança
    await prisma.cobranca.create({
      data: {
        valorFatura: transacaoData.valorRt + transacaoData.valorAdicional,
        referencia: `Fatura ${transacao.codigo}`,
        status: transacaoData.status === "Concluída" ? "Paga" : "Pendente",
        transacaoId: transacao.idTransacao,
        usuarioId: comprador.idUsuario,
        vencimentoFatura: FakerUtils.futureDate(30)
      }
    });

    transacoes.push(transacao);
    logger.info(`✅ Transação criada: ${transacao.descricao} - R$ ${transacao.valorRt}`);
  }

  // Criar algumas solicitações de crédito
  await seedSolicitacoesCredito(prisma, usuarios);

  // Criar fundos de permuta
  await seedFundosPermuta(prisma, usuarios);

  return transacoes;
}

async function seedSolicitacoesCredito(prisma: PrismaClient, usuarios: any) {
  const solicitacoes = [
    {
      valorSolicitado: 25000.0,
      status: "Aprovado",
      descricaoSolicitante: "Necessário aumento de limite para expansão do negócio",
      comentarioAgencia: "Cliente com bom histórico, aprovado aumento",
      matrizAprovacao: true,
      comentarioMatriz: "Aprovado mediante comprovação de faturamento",
      solicitanteId: usuarios.usuarioComum.idUsuario,
      criadorId: usuarios.gerente.idUsuario,
      matrizId: usuarios.matriz.idUsuario
    },
    {
      valorSolicitado: 50000.0,
      status: "Pendente",
      descricaoSolicitante: "Solicitação de crédito para novo projeto de desenvolvimento",
      descricaoSolicitante: "Projeto de grande porte com cliente confirmado",
      solicitanteId: usuarios.franquiaA.idUsuario,
      criadorId: usuarios.matriz.idUsuario,
      matrizId: usuarios.matriz.idUsuario
    },
    {
      valorSolicitado: 15000.0,
      status: "Negado",
      motivoRejeicao: "Histórico de inadimplência recente",
      descricaoSolicitante: "Necessário para compra de equipamentos",
      comentarioAgencia: "Cliente com pendências financeiras",
      matrizAprovacao: false,
      comentarioMatriz: "Negado até regularização das pendências",
      solicitanteId: usuarios.associados[0].idUsuario,
      criadorId: usuarios.franquiaA.idUsuario,
      matrizId: usuarios.matriz.idUsuario
    }
  ];

  for (const solicitacao of solicitacoes) {
    await prisma.solicitacaoCredito.create({
      data: {
        valorSolicitado: solicitacao.valorSolicitado,
        status: solicitacao.status,
        motivoRejeicao: solicitacao.motivoRejeicao,
        usuarioSolicitanteId: solicitacao.solicitanteId,
        descricaoSolicitante: solicitacao.descricaoSolicitante,
        comentarioAgencia: solicitacao.comentarioAgencia,
        matrizAprovacao: solicitacao.matrizAprovacao,
        comentarioMatriz: solicitacao.comentarioMatriz,
        usuarioCriadorId: solicitacao.criadorId,
        matrizId: solicitacao.matrizId
      }
    });
    logger.info(`✅ Solicitação de crédito criada: R$ ${solicitacao.valorSolicitado} - ${solicitacao.status}`);
  }
}

async function seedFundosPermuta(prisma: PrismaClient, usuarios: any) {
  const todosUsuarios = [
    usuarios.matriz,
    usuarios.gerente,
    usuarios.usuarioComum,
    usuarios.franquiaA,
    usuarios.franquiaB,
    ...usuarios.associados
  ];

  for (const usuario of todosUsuarios) {
    const valorFundo = FakerUtils.randomFloat(1000, 10000);
    await prisma.fundoPermuta.create({
      data: {
        valor: valorFundo,
        usuarioId: usuario.idUsuario
      }
    });
    logger.info(`✅ Fundo de permuta criado: ${usuario.nome} - R$ ${valorFundo.toFixed(2)}`);
  }
}