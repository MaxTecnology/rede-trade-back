import { Request, Response } from "express";
import { ContaInfo, obterContaInfo } from "../utils/transactions.utils";
import { enviarEmailTransacao } from "../utils/utils";
import { validarTransacao, validarEstorno, ErroFinanceiro, TipoErroFinanceiro, formatarValorRT, criarSaldoUtilizado, converterParaStringLegacy, parserarSaldoUtilizadoLegacy } from "../utils/financial-validations";
import { executarTransacaoFinanceira, calcularOperacoesTransacao, DadosNovaTransacao } from "../utils/transaction-manager";
import { executarComLockTransacao, executarComLockEstorno } from "../utils/transaction-locks";
import prisma from "../lib/prisma"; // ✅ USANDO SINGLETON

export const insertTransaction = async (req: Request, res: Response) => {
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

  // 🔒 FASE 1.4 - Sistema de Locks: Executar toda operação protegida por lock
  console.log(`🔒 Iniciando transação com sistema de locks: Comprador ${compradorId} → Vendedor ${vendedorId}`);
  
  const resultado = await executarComLockTransacao(
    compradorId,
    vendedorId,
    async (): Promise<{ novaTransacao: any, comprador: any, vendedor: any }> => {
      // Toda lógica da transação fica dentro desta função protegida
      let contaComprador: ContaInfo | null;
      let contaVendedor: ContaInfo | null;

    // Obtenha as informações da conta do comprador e vendedor usando a função
    contaComprador = await obterContaInfo(subContaCompradorId, compradorId);
    contaVendedor = await obterContaInfo(subContaVendedorId, vendedorId);

    if (!contaComprador || !contaVendedor) {
      throw new Error("Comprador ou vendedor não encontrado");
    }

    // 🔐 VALIDAÇÕES FINANCEIRAS CRÍTICAS - Fase 1
    console.log(`🔍 Validando transação: ${formatarValorRT(valorRt)} de ${contaComprador.numeroConta} para ${contaVendedor.numeroConta}`);
    
    const resultadoValidacao = validarTransacao(contaComprador, contaVendedor, valorRt);
    
    if (!resultadoValidacao.valido) {
      const erro = resultadoValidacao.erro!;
      
      // Log do erro para auditoria
      console.error(`❌ Transação rejeitada: ${erro.tipo} - ${erro.message}`, {
        compradorId,
        vendedorId,
        valor: valorRt,
        detalhes: erro.detalhes
      });
      
      throw new Error(`${erro.tipo}: ${erro.message}`);
    }
    
    // Log de alertas se existirem
    if (resultadoValidacao.alertas && resultadoValidacao.alertas.length > 0) {
      console.warn(`⚠️ Alertas na transação:`, {
        alertas: resultadoValidacao.alertas,
        compradorId,
        vendedorId,
        valor: valorRt
      });
    }

    // Otimização: usar aggregate em vez de findMany + reduce
    const resultadoAggregate = await prisma.transacao.aggregate({
      where: { vendedorId },
      _sum: {
        valorRt: true,
      },
    });

    const totalTransacoesVendedor = resultadoAggregate._sum.valorRt || 0;

    if (totalTransacoesVendedor + valorRt > contaVendedor.limiteVendaEmpresa) {
      throw new Error("Vendedor atingiu o limite de venda da empresa.");
    }

    if (totalTransacoesVendedor + valorRt > contaVendedor.limiteVendaTotal) {
      throw new Error("Vendedor atingiu o limite total de venda.");
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
      throw new Error("O comprador não possuí limite de crédito disponível para esta transação.");
    }

    // 🔒 TRANSAÇÃO ATÔMICA - Fase 1: Preparar dados para operação atômica  
    console.log(`🔒 Iniciando operação atômica para transação de ${formatarValorRT(valorRt)}`);
    
    let valorSaldoPermutaUtilizado = 0;
    let valorLimiteCreditoUtilizado = 0;
    
    if (valorRt <= saldoAnteriorComprador) {
      saldoAposComprador = saldoAnteriorComprador - valorRt;
      valorSaldoPermutaUtilizado = valorRt;
      limiteDisponivel = contaComprador.limiteCredito - contaComprador.limiteUtilizado;
      limiteUtilizado = contaComprador.limiteUtilizado; // Não muda
    } else {
      const valorAbatidoSaldoPermuta = saldoAnteriorComprador;
      const valorRestante = valorRt - valorAbatidoSaldoPermuta;

      valorSaldoPermutaUtilizado = valorAbatidoSaldoPermuta;
      valorLimiteCreditoUtilizado = valorRestante;
      
      limiteUtilizado = contaComprador.limiteUtilizado + valorRestante;
      saldoAposComprador = 0; // Zera o saldo permuta
      limiteDisponivel = contaComprador.limiteCredito - limiteUtilizado;
    }

    // 🔄 FASE 1.3 - Criar estrutura detalhada do saldoUtilizado
    const saldoUtilizadoDetalhado = criarSaldoUtilizado(valorSaldoPermutaUtilizado, valorLimiteCreditoUtilizado);
    saldoUtilizado = converterParaStringLegacy(saldoUtilizadoDetalhado);
    
    console.log(`💰 Composição do pagamento:`, {
      saldoPermuta: valorSaldoPermutaUtilizado,
      limiteCredito: valorLimiteCreditoUtilizado,
      total: valorRt,
      detalhado: saldoUtilizadoDetalhado
    });

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

    // 🔒 TRANSAÇÃO ATÔMICA - Executar todas as operações em uma única transação
    console.log(`🔒 Executando transação atômica...`);
    
    const resultadoTransacao = await prisma.$transaction(async (tx) => {
      // 1. Buscar dados dos usuários
      const comprador = await tx.usuarios.findUnique({
        where: { idUsuario: compradorId },
      });

      const vendedor = await tx.usuarios.findUnique({
        where: { idUsuario: vendedorId },
      });
      
      const compradorNome = comprador?.nome;
      const vendedorNome = vendedor?.nome;

      // 2. Atualizar conta do comprador
      await tx.conta.update({
        where: { idConta: contaComprador!.idConta },
        data: {
          saldoPermuta: saldoAposComprador,
          limiteDisponivel: limiteDisponivel!,
          limiteUtilizado: limiteUtilizado!,
        },
      });

      // 3. Atualizar conta do vendedor
      await tx.conta.update({
        where: { idConta: contaVendedor!.idConta },
        data: {
          saldoPermuta: saldoAposVendedor,
        },
      });

      // 4. Criar a transação
      const novaTransacao = await tx.transacao.create({
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

      // 5. Criar cobranças parceladas dentro da transação atômica
      if (numeroParcelas > 0 && comissaoParcelada > 0) {
        const dataAtual = new Date();
        const diaFechamentoFatura = contaComprador!.diaFechamentoFatura;

        let dataVencimento = new Date(
          dataAtual.getFullYear(),
          dataAtual.getMonth(),
          contaComprador!.dataVencimentoFatura
        );

        if (dataAtual.getDate() >= contaComprador!.diaFechamentoFatura) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }

        const cobrancasData = [];
        for (let i = 1; i <= numeroParcelas; i++) {
          cobrancasData.push({
            valorFatura: comissaoParcelada,
            referencia: `Transação #${novaTransacao.idTransacao} - Parcela ${i}`,
            status: "Emitida",
            transacaoId: novaTransacao.idTransacao,
            usuarioId: novaTransacao.compradorId,
            contaId: contaComprador!.idConta,
            vencimentoFatura: dataVencimento,
            gerenteContaId: contaComprador!.gerenteContaId,
          });
        }

        // Criar todas as cobranças em lote
        await tx.cobranca.createMany({
          data: cobrancasData
        });

        console.log(`💳 ${numeroParcelas} cobranças criadas dentro da transação atômica`);
      }

      return { novaTransacao, comprador, vendedor };
    }, {
      maxWait: 10000, // 10 segundos máximo de espera
      timeout: 30000, // 30 segundos timeout
      isolationLevel: 'Serializable' // Nível mais alto de isolamento
    });

      // Retornar dados da transação criada
      return { novaTransacao, comprador, vendedor };
    }
  );

  // 🔒 Processar resultado da operação com lock
  if (!resultado.sucesso) {
    console.error(`❌ Transação falhou:`, resultado.erro);
    return res.status(400).json({ 
      error: resultado.erro,
      lockObtido: resultado.lockObtido,
      tempoEspera: resultado.tempoEspera 
    });
  }

  const { novaTransacao, comprador, vendedor } = resultado.resultado!;
  console.log(`✅ Transação concluída com sistema de locks: ID ${novaTransacao.idTransacao}`);

  // Enviar emails de confirmação (fora do lock para não bloquear)
  try {
    const dataAtual = new Date();

    function formatarData(data: Date): string {
      const dia = String(data.getDate()).padStart(2, "0");
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const ano = data.getFullYear();
      const horas = String(data.getHours()).padStart(2, "0");
      const minutos = String(data.getMinutes()).padStart(2, "0");

      return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }

    const dataFormatada = formatarData(dataAtual);

    const corpoEmailComprador =
      `Olá ${comprador?.nome}, Obrigado por sua transação na plataforma RedeTrade. Abaixo estão os detalhes da transação:\\n\\n` +
      `Data da transação: ${dataFormatada}\\n` +
      `Código da transação: ${novaTransacao.codigo}\\n` +
      `Valor da transação: R$ ${valorRt.toFixed(2)}\\n` +
      `Número de Parcelas: ${numeroParcelas}\\n` +
      `Descrição: ${descricao}\\n` +
      `Nome do Vendedor: ${nomeVendedor}\\n` +
      `Nota de Atendimento: ${notaAtendimento}\\n` +
      `Observações: ${observacaoNota}\\n` +
      `Status: ${novaTransacao.status}\\n` +
      `Agradecemos por usar a RedeTrade!`;

    const corpoEmailVendedor =
      `Olá ${vendedor?.nome},Você recebeu uma nova transação na plataforma RedeTrade. Abaixo estão os detalhes da transação:\\n\\n` +
      `Data da transação: ${dataFormatada}\\n` +
      `Código da transação: ${novaTransacao.codigo}\\n` +
      `Data da transação: ${Date.now()}\\n` +
      `Valor da transação: RT$ ${valorRt.toFixed(2)}\\n` +
      `Número de Parcelas: ${numeroParcelas}\\n` +
      `Descrição: ${descricao}\\n` +
      `Nome do Comprador: ${nomeComprador}\\n` +
      `Nota de Atendimento: ${notaAtendimento}\\n` +
      `Observações: ${observacaoNota}\\n` +
      `Status: ${novaTransacao.status}\\n` +
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
    }

    return res.status(201).json({ novaTransacao });

  } catch (emailError) {
    console.error(`⚠️ Erro ao enviar emails (transação criada com sucesso):`, emailError);
    return res.status(201).json({ 
      novaTransacao,
      avisoEmail: "Transação criada com sucesso, mas houve problema no envio de email"
    });
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

    // Busque transações com status "Encaminhada para estorno" - OTIMIZADO
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
      select: {
        idTransacao: true,
        valorRt: true,
        status: true,
        createdAt: true,
        nomeComprador: true,
        nomeVendedor: true,
        voucher: {
          select: {
            idVoucher: true,
            status: true,
          }
        },
        cobrancas: {
          select: {
            idCobranca: true,
            status: true,
          },
          take: 10, // Limitar cobranças por transação
        },
      },
      take: 200, // Limitar resultados para performance
      orderBy: {
        createdAt: 'desc'
      }
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
  const { idTransacao } = req.params;

  // Busque a transação pelo ID primeiro (fora do lock para obter dados básicos)
  const transacao = await prisma.transacao.findUnique({
    where: { idTransacao: Number(idTransacao) },
    select: {
      compradorId: true,
      vendedorId: true,
      valorRt: true,
      saldoUtilizado: true,
      status: true
    }
  });

  if (!transacao) {
    return res.status(404).json({ error: "Transação não encontrada." });
  }

  const { compradorId, vendedorId, valorRt, saldoUtilizado } = transacao;

  if (!compradorId || !vendedorId) {
    return res.status(400).json({ error: "ID do comprador ou vendedor ausente" });
  }

  if (transacao.status === "Estornada") {
    return res.status(400).json({ error: "Transação já foi estornada" });
  }

  // 🔒 FASE 1.4 - Sistema de Locks: Executar estorno protegido por lock
  console.log(`🔒 Iniciando estorno com sistema de locks: Transação ${idTransacao}`);
  
  const resultado = await executarComLockEstorno(
    vendedorId, // Lock baseado no vendedor (quem terá saldo debitado)
    Number(idTransacao),
    async () => {
      // Toda lógica do estorno fica dentro desta função protegida

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

    // 🔐 VALIDAÇÕES DE ESTORNO - Fase 1
    console.log(`🔍 Validando estorno: ${formatarValorRT(valorRt)} da conta ${contaVendedor.numeroConta}`);
    
    const contaVendedorInfo: ContaInfo = {
      idConta: contaVendedor.idConta,
      saldoPermuta: contaVendedor.saldoPermuta,
      limiteCredito: contaVendedor.limiteCredito,
      limiteUtilizado: contaVendedor.limiteUtilizado,
      limiteVendaMensal: contaVendedor.limiteVendaMensal,
      limiteVendaTotal: contaVendedor.limiteVendaTotal,
      limiteVendaEmpresa: contaVendedor.limiteVendaEmpresa,
      valorVendaMensalAtual: contaVendedor.valorVendaMensalAtual,
      valorVendaTotalAtual: contaVendedor.valorVendaTotalAtual,
      diaFechamentoFatura: contaVendedor.diaFechamentoFatura,
      dataVencimentoFatura: contaVendedor.dataVencimentoFatura,
      numeroConta: contaVendedor.numeroConta,
      dataDeAfiliacao: contaVendedor.dataDeAfiliacao,
      nomeFranquia: contaVendedor.nomeFranquia,
      tipoContaId: contaVendedor.tipoContaId,
      planoId: contaVendedor.planoId,
      gerenteContaId: contaVendedor.gerenteContaId
    };
    
    const resultadoValidacaoEstorno = validarEstorno(contaVendedorInfo, valorRt);
    
    if (!resultadoValidacaoEstorno.valido) {
      const erro = resultadoValidacaoEstorno.erro!;
      
      console.error(`❌ Estorno rejeitado: ${erro.tipo} - ${erro.message}`, {
        transacaoId: idTransacao,
        vendedorId,
        valor: valorRt,
        saldoAtual: contaVendedor.saldoPermuta
      });
      
      return res.status(400).json({
        error: erro.message,
        tipo: erro.tipo,
        detalhes: erro.detalhes
      });
    }

    // 🔒 ESTORNO ATÔMICO - Executar todas as operações em uma única transação
    console.log(`🔒 Executando estorno atômico para transação ${idTransacao}...`);
    
    await prisma.$transaction(async (tx) => {
      // 1. Verificar se a transação ainda existe e pode ser estornada
      const transacaoAtual = await tx.transacao.findUnique({
        where: { idTransacao: Number(idTransacao) },
        select: { status: true }
      });

      if (!transacaoAtual) {
        throw new Error("Transação não encontrada");
      }

      if (transacaoAtual.status === "Estornada") {
        throw new Error("Transação já foi estornada");
      }

      // 2. Atualizar conta do vendedor (debitar o valor estornado)
      await tx.conta.update({
        where: { idConta: contaVendedor.idConta },
        data: {
          saldoPermuta: (contaVendedor.saldoPermuta ?? 0) - valorRt,
        },
      });

      // 3. Restaurar saldos do comprador usando nova estrutura
      if (saldoUtilizado) {
        console.log(`🔄 Restaurando saldos do comprador usando estrutura melhorada`);
        
        // 🔄 FASE 1.3 - Usar nova estrutura para parsear saldoUtilizado
        const saldoDetalhado = parserarSaldoUtilizadoLegacy(saldoUtilizado);
        
        let novoSaldoPermuta = contaComprador.saldoPermuta ?? 0;
        let novoLimiteUtilizado = contaComprador.limiteUtilizado ?? 0;

        // Restaurar saldo permuta se foi utilizado
        if (saldoDetalhado.saldoPermuta > 0) {
          novoSaldoPermuta = novoSaldoPermuta + saldoDetalhado.saldoPermuta;
          console.log(`💰 Restaurando saldo permuta: +${saldoDetalhado.saldoPermuta}`);
        }

        // Restaurar limite de crédito se foi utilizado
        if (saldoDetalhado.limiteCredito > 0) {
          novoLimiteUtilizado = novoLimiteUtilizado - saldoDetalhado.limiteCredito;
          console.log(`💳 Restaurando limite crédito: -${saldoDetalhado.limiteCredito}`);
        }

        const novoLimiteDisponivel = contaComprador.limiteCredito - novoLimiteUtilizado;

        console.log(`📊 Restauração completa:`, {
          saldoPermutaAntes: contaComprador.saldoPermuta,
          saldoPermutaDepois: novoSaldoPermuta,
          limiteUtilizadoAntes: contaComprador.limiteUtilizado,
          limiteUtilizadoDepois: novoLimiteUtilizado,
          estruturaOriginal: saldoDetalhado
        });

        await tx.conta.update({
          where: { idConta: contaComprador.idConta },
          data: {
            saldoPermuta: novoSaldoPermuta,
            limiteUtilizado: novoLimiteUtilizado,
            limiteDisponivel: novoLimiteDisponivel,
          },
        });
      }

      // 4. Excluir cobranças associadas à transação
      await tx.cobranca.deleteMany({
        where: { transacaoId: Number(idTransacao) },
      });

      // 5. Cancelar vouchers associados à transação
      await tx.voucher.updateMany({
        where: { transacaoId: Number(idTransacao) },
        data: {
          status: "Cancelado",
          dataCancelamento: new Date(),
        },
      });

      // 6. Atualizar status da transação
      await tx.transacao.update({
        where: { idTransacao: Number(idTransacao) },
        data: {
          status: "Estornada",
          dataDoEstorno: new Date(),
        },
      });

      console.log(`✅ Estorno atômico concluído: Transação ${idTransacao}`);
    }, {
      maxWait: 10000,
      timeout: 30000,
      isolationLevel: 'Serializable'
    });

      // Retornar sucesso
      return { message: "Transação estornada com sucesso" };
    }
  );

  // 🔒 Processar resultado da operação de estorno com lock
  if (!resultado.sucesso) {
    console.error(`❌ Estorno falhou:`, resultado.erro);
    return res.status(400).json({ 
      error: resultado.erro,
      lockObtido: resultado.lockObtido,
      tempoEspera: resultado.tempoEspera 
    });
  }

  console.log(`✅ Estorno concluído com sistema de locks: Transação ${idTransacao}`);
  return res.status(200).json(resultado.resultado);
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
      select: {
        idTransacao: true,
        valorRt: true,
        status: true,
        createdAt: true,
        dataDoEstorno: true,
        nomeComprador: true,
        nomeVendedor: true,
        voucher: {
          select: {
            idVoucher: true,
            status: true,
          }
        },
      },
      take: 1000, // Limitar resultados para performance
      orderBy: {
        dataDoEstorno: 'desc'
      }
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

    // Busque transações estornadas da agência e seus associados - OTIMIZADO
    const transacoesEstornadas = await prisma.transacao.findMany({
      where: {
        status: "Estornada",
        OR: [
          { comprador: { usuarioCriadorId: parseInt(agenciaId, 10) } },
          { vendedor: { usuarioCriadorId: parseInt(agenciaId, 10) } },
        ],
      },
      select: {
        idTransacao: true,
        valorRt: true,
        status: true,
        createdAt: true,
        nomeComprador: true,
        nomeVendedor: true,
        voucher: {
          select: {
            idVoucher: true,
            status: true,
          }
        },
      },
      take: 500, // Limitar resultados para performance
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ transacoesEstornadas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar transações estornadas." });
  }
};
