// transaction-manager.ts - Gerenciador de transações atômicas
import prisma from "../lib/prisma";
import { ContaInfo } from "./transactions.utils";

// Interface para operação de transação
export interface OperacaoTransacao {
  tipo: 'CREDITO' | 'DEBITO';
  contaId: number;
  valor: number;
  campo: 'saldoPermuta' | 'limiteUtilizado' | 'valorVendaMensalAtual' | 'valorVendaTotalAtual';
  valorAtual: number;
}

// Interface para resultado da transação
export interface ResultadoTransacaoAtomica {
  sucesso: boolean;
  transacaoId?: number;
  erro?: string;
  detalhes?: any;
}

// Interface para dados da nova transação
export interface DadosNovaTransacao {
  compradorId: number;
  vendedorId: number;
  valorRt: number;
  numeroParcelas: number;
  descricao: string;
  saldoAnteriorComprador: number;
  saldoAnteriorVendedor: number;
  saldoAposComprador: number;
  saldoAposVendedor: number;
  limiteCreditoAnteriorComprador: number;
  limiteCreditoAposComprador: number;
  comissao: number;
  comissaoParcelada: number;
  nomeComprador: string;
  nomeVendedor: string;
  notaAtendimento: number;
  subContaCompradorId?: number;
  subContaVendedorId?: number;
  valorAdicional: number;
  observacaoNota: string;
  ofertaId?: number;
  saldoUtilizado: string;
  status: string;
}

// Função principal para executar transação com atomicidade
export const executarTransacaoFinanceira = async (
  dadosTransacao: DadosNovaTransacao,
  operacoes: OperacaoTransacao[],
  cobrancas: any[] = []
): Promise<ResultadoTransacaoAtomica> => {
  try {
    console.log(`🔄 Iniciando transação atômica: ${operacoes.length} operações`);
    
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Verificar saldos atuais antes de executar
      for (const operacao of operacoes) {
        const contaAtual = await tx.conta.findUnique({
          where: { idConta: operacao.contaId },
          select: { 
            saldoPermuta: true,
            limiteUtilizado: true,
            valorVendaMensalAtual: true,
            valorVendaTotalAtual: true,
            numeroConta: true 
          }
        });

        if (!contaAtual) {
          throw new Error(`Conta ${operacao.contaId} não encontrada`);
        }

        // Obter valor atual do campo específico
        let valorAtualBD = 0;
        switch (operacao.campo) {
          case 'saldoPermuta':
            valorAtualBD = contaAtual.saldoPermuta || 0;
            break;
          case 'limiteUtilizado':
            valorAtualBD = contaAtual.limiteUtilizado || 0;
            break;
          case 'valorVendaMensalAtual':
            valorAtualBD = contaAtual.valorVendaMensalAtual || 0;
            break;
          case 'valorVendaTotalAtual':
            valorAtualBD = contaAtual.valorVendaTotalAtual || 0;
            break;
          default:
            throw new Error(`Campo ${operacao.campo} não suportado`);
        }
        
        // Verificar se o valor não mudou desde a última leitura
        if (Math.abs(valorAtualBD - operacao.valorAtual) > 0.01) {
          console.error(`⚠️ Inconsistência detectada na conta ${operacao.contaId}:`, {
            campo: operacao.campo,
            valorEsperado: operacao.valorAtual,
            valorAtual: valorAtualBD,
            diferenca: Math.abs(valorAtualBD - operacao.valorAtual)
          });
          
          throw new Error(`Saldo da conta ${contaAtual.numeroConta} foi modificado por outra transação. Tente novamente.`);
        }
      }

      // 2. Executar todas as operações de conta
      const updatePromises = operacoes.map(async (operacao) => {
        const novoValor = operacao.tipo === 'CREDITO' 
          ? operacao.valorAtual + operacao.valor
          : operacao.valorAtual - operacao.valor;

        // Verificar se o resultado seria negativo (exceto para casos permitidos)
        if (novoValor < 0 && operacao.campo === 'saldoPermuta' && operacao.tipo === 'DEBITO') {
          // Permitir saldo negativo apenas se estiver usando crédito junto
          const operacaoCredito = operacoes.find(op => 
            op.contaId === operacao.contaId && op.campo === 'limiteUtilizado' && op.tipo === 'CREDITO'
          );
          
          if (!operacaoCredito) {
            throw new Error(`Operação resultaria em saldo negativo não permitido: ${novoValor}`);
          }
        }

        console.log(`💰 ${operacao.tipo}: Conta ${operacao.contaId}, ${operacao.campo}: ${operacao.valorAtual} → ${novoValor}`);

        return tx.conta.update({
          where: { idConta: operacao.contaId },
          data: { [operacao.campo]: novoValor }
        });
      });

      await Promise.all(updatePromises);

      // 3. Criar a transação
      const novaTransacao = await tx.transacao.create({
        data: dadosTransacao
      });

      console.log(`✅ Transação criada: ID ${novaTransacao.idTransacao}`);

      // 4. Criar cobranças se fornecidas
      if (cobrancas.length > 0) {
        const cobrancasComTransacao = cobrancas.map(cobranca => ({
          ...cobranca,
          transacaoId: novaTransacao.idTransacao
        }));

        await tx.cobranca.createMany({
          data: cobrancasComTransacao
        });

        console.log(`💳 ${cobrancas.length} cobranças criadas`);
      }

      // 5. Atualizar valores de venda (se necessário)
      const operacoesVenda = operacoes.filter(op => 
        op.campo === 'valorVendaMensalAtual' || op.campo === 'valorVendaTotalAtual'
      );

      if (operacoesVenda.length > 0) {
        const vendedorId = dadosTransacao.vendedorId;
        const valorTransacao = dadosTransacao.valorRt;

        await tx.conta.updateMany({
          where: { usuarioId: vendedorId },
          data: {
            valorVendaMensalAtual: { increment: valorTransacao },
            valorVendaTotalAtual: { increment: valorTransacao }
          }
        });

        console.log(`📈 Valores de venda atualizados para vendedor ${vendedorId}`);
      }

      return novaTransacao.idTransacao;
    }, {
      // Configurações da transação
      maxWait: 10000, // 10 segundos máximo de espera
      timeout: 30000, // 30 segundos timeout
      isolationLevel: 'Serializable' // Nível mais alto de isolamento
    });

    console.log(`🎉 Transação atômica concluída com sucesso: ID ${resultado}`);

    return {
      sucesso: true,
      transacaoId: resultado
    };

  } catch (error) {
    console.error(`💥 Erro na transação atômica:`, error);
    
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
      detalhes: error
    };
  }
};

// Função para executar estorno com atomicidade
export const executarEstornoAtomica = async (
  transacaoId: number,
  operacoesEstorno: OperacaoTransacao[],
  statusAtualizado: string = "Estornada"
): Promise<ResultadoTransacaoAtomica> => {
  try {
    console.log(`🔄 Iniciando estorno atômico: Transação ${transacaoId}`);
    
    await prisma.$transaction(async (tx) => {
      // 1. Verificar se a transação existe e pode ser estornada
      const transacao = await tx.transacao.findUnique({
        where: { idTransacao: transacaoId },
        select: { status: true, valorRt: true }
      });

      if (!transacao) {
        throw new Error(`Transação ${transacaoId} não encontrada`);
      }

      if (transacao.status === "Estornada") {
        throw new Error(`Transação ${transacaoId} já foi estornada`);
      }

      // 2. Verificar saldos atuais
      for (const operacao of operacoesEstorno) {
        const contaAtual = await tx.conta.findUnique({
          where: { idConta: operacao.contaId },
          select: { 
            saldoPermuta: true,
            limiteUtilizado: true,
            valorVendaMensalAtual: true,
            valorVendaTotalAtual: true,
            numeroConta: true 
          }
        });

        if (!contaAtual) {
          throw new Error(`Conta ${operacao.contaId} não encontrada para estorno`);
        }

        // Obter valor atual do campo específico
        let valorAtualBD = 0;
        switch (operacao.campo) {
          case 'saldoPermuta':
            valorAtualBD = contaAtual.saldoPermuta || 0;
            break;
          case 'limiteUtilizado':
            valorAtualBD = contaAtual.limiteUtilizado || 0;
            break;
          case 'valorVendaMensalAtual':
            valorAtualBD = contaAtual.valorVendaMensalAtual || 0;
            break;
          case 'valorVendaTotalAtual':
            valorAtualBD = contaAtual.valorVendaTotalAtual || 0;
            break;
          default:
            throw new Error(`Campo ${operacao.campo} não suportado no estorno`);
        }
        
        if (Math.abs(valorAtualBD - operacao.valorAtual) > 0.01) {
          throw new Error(`Saldo da conta ${contaAtual.numeroConta} foi modificado. Estorno não pode ser processado.`);
        }
      }

      // 3. Executar operações de estorno
      const updatePromises = operacoesEstorno.map(async (operacao) => {
        const novoValor = operacao.tipo === 'CREDITO' 
          ? operacao.valorAtual + operacao.valor
          : operacao.valorAtual - operacao.valor;

        console.log(`🔄 Estorno ${operacao.tipo}: Conta ${operacao.contaId}, ${operacao.campo}: ${operacao.valorAtual} → ${novoValor}`);

        return tx.conta.update({
          where: { idConta: operacao.contaId },
          data: { [operacao.campo]: novoValor }
        });
      });

      await Promise.all(updatePromises);

      // 4. Atualizar status da transação
      await tx.transacao.update({
        where: { idTransacao: transacaoId },
        data: {
          status: statusAtualizado,
          dataDoEstorno: new Date()
        }
      });

      // 5. Cancelar vouchers relacionados
      await tx.voucher.updateMany({
        where: { transacaoId: transacaoId },
        data: {
          status: "Cancelado",
          dataCancelamento: new Date()
        }
      });

      console.log(`✅ Estorno concluído: Transação ${transacaoId}`);
    }, {
      maxWait: 10000,
      timeout: 30000,
      isolationLevel: 'Serializable'
    });

    return {
      sucesso: true,
      transacaoId: transacaoId
    };

  } catch (error) {
    console.error(`💥 Erro no estorno atômico:`, error);
    
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido no estorno',
      detalhes: error
    };
  }
};

// Função utilitária para calcular operações de transação
export const calcularOperacoesTransacao = (
  contaComprador: ContaInfo,
  contaVendedor: ContaInfo,
  valorTransacao: number
): OperacaoTransacao[] => {
  const operacoes: OperacaoTransacao[] = [];
  
  const saldoPermutaComprador = contaComprador.saldoPermuta || 0;
  const limiteCreditoDisponivel = contaComprador.limiteCredito - contaComprador.limiteUtilizado;

  if (valorTransacao <= saldoPermutaComprador) {
    // Usar apenas saldo permuta
    operacoes.push({
      tipo: 'DEBITO',
      contaId: contaComprador.idConta,
      valor: valorTransacao,
      campo: 'saldoPermuta',
      valorAtual: saldoPermutaComprador
    });
  } else {
    // Usar saldo permuta + crédito
    const valorDoSaldo = saldoPermutaComprador;
    const valorDoCredito = valorTransacao - valorDoSaldo;

    if (valorDoSaldo > 0) {
      operacoes.push({
        tipo: 'DEBITO',
        contaId: contaComprador.idConta,
        valor: valorDoSaldo,
        campo: 'saldoPermuta',
        valorAtual: saldoPermutaComprador
      });
    }

    operacoes.push({
      tipo: 'CREDITO',
      contaId: contaComprador.idConta,
      valor: valorDoCredito,
      campo: 'limiteUtilizado',
      valorAtual: contaComprador.limiteUtilizado
    });
  }

  // Creditar vendedor
  operacoes.push({
    tipo: 'CREDITO',
    contaId: contaVendedor.idConta,
    valor: valorTransacao,
    campo: 'saldoPermuta',
    valorAtual: contaVendedor.saldoPermuta || 0
  });

  return operacoes;
};

// Função utilitária para calcular operações de estorno
export const calcularOperacoesEstorno = (
  contaComprador: ContaInfo,
  contaVendedor: ContaInfo,
  valorEstorno: number,
  saldoUtilizadoOriginal: string
): OperacaoTransacao[] => {
  const operacoes: OperacaoTransacao[] = [];

  // Debitar do vendedor
  operacoes.push({
    tipo: 'DEBITO',
    contaId: contaVendedor.idConta,
    valor: valorEstorno,
    campo: 'saldoPermuta',
    valorAtual: contaVendedor.saldoPermuta || 0
  });

  // Analisar como foi pago originalmente para reverter
  if (saldoUtilizadoOriginal.includes('limiteCredito')) {
    // Foi usado crédito - extrair valores
    const match = saldoUtilizadoOriginal.match(/saldoPermuta - ([\d.]+).*limiteCredito - ([\d.]+)/);
    if (match) {
      const valorSaldoUsado = parseFloat(match[1]);
      const valorCreditoUsado = parseFloat(match[2]);

      if (valorSaldoUsado > 0) {
        operacoes.push({
          tipo: 'CREDITO',
          contaId: contaComprador.idConta,
          valor: valorSaldoUsado,
          campo: 'saldoPermuta',
          valorAtual: contaComprador.saldoPermuta || 0
        });
      }

      if (valorCreditoUsado > 0) {
        operacoes.push({
          tipo: 'DEBITO',
          contaId: contaComprador.idConta,
          valor: valorCreditoUsado,
          campo: 'limiteUtilizado',
          valorAtual: contaComprador.limiteUtilizado
        });
      }
    }
  } else {
    // Foi usado apenas saldo permuta
    operacoes.push({
      tipo: 'CREDITO',
      contaId: contaComprador.idConta,
      valor: valorEstorno,
      campo: 'saldoPermuta',
      valorAtual: contaComprador.saldoPermuta || 0
    });
  }

  return operacoes;
};