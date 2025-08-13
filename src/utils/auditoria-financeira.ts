// auditoria-financeira.ts - Sistema de auditoria financeira (Fase 2.1)
import prisma from "../lib/prisma";
import { Request } from "express";

// Enums para padronização
export enum TipoAcao {
  TRANSACAO = "TRANSACAO",
  ESTORNO = "ESTORNO", 
  AJUSTE_SALDO = "AJUSTE_SALDO",
  CRIAR_COBRANCA = "CRIAR_COBRANCA",
  CANCELAR_COBRANCA = "CANCELAR_COBRANCA",
  CRIAR_VOUCHER = "CRIAR_VOUCHER",
  CANCELAR_VOUCHER = "CANCELAR_VOUCHER",
  ATUALIZAR_LIMITE = "ATUALIZAR_LIMITE",
  LOGIN_FINANCEIRO = "LOGIN_FINANCEIRO",
  CONSULTA_SALDO = "CONSULTA_SALDO"
}

export enum TipoEntidade {
  TRANSACAO = "TRANSACAO",
  CONTA = "CONTA", 
  COBRANCA = "COBRANCA",
  VOUCHER = "VOUCHER",
  USUARIO = "USUARIO",
  SISTEMA = "SISTEMA"
}

export enum ResultadoOperacao {
  SUCESSO = "SUCESSO",
  ERRO = "ERRO",
  PENDENTE = "PENDENTE",
  CANCELADO = "CANCELADO"
}

// Interface para dados da auditoria
export interface DadosAuditoria {
  usuarioId?: number;
  usuarioExecutor?: string;
  acao: TipoAcao;
  entidade: TipoEntidade;
  entidadeId?: number;
  dadosAnteriores?: any;
  dadosNovos?: any;
  valorOperacao?: number;
  contasAfetadas?: number[];
  transacaoId?: number;
  detalhesOperacao?: string;
  resultado: ResultadoOperacao;
  tempoExecucao?: number;
  req?: Request; // Para extrair IP e User-Agent
  sessionId?: string;
  metadados?: any; // Dados adicionais específicos da operação
}

// Classe principal para auditoria
export class AuditoriaFinanceira {
  
  // Função principal para registrar auditoria
  static async registrar(dados: DadosAuditoria): Promise<void> {
    try {
      const inicioTempo = Date.now();
      
      // Extrair informações da requisição se disponível
      const ipAddress = dados.req?.ip || dados.req?.connection?.remoteAddress || null;
      const userAgent = dados.req?.get('User-Agent') || null;
      const sessionId = dados.sessionId || (dados.req as any)?.session?.id || null;

      // Criar registro de auditoria
      await prisma.auditoriaFinanceira.create({
        data: {
          usuarioId: dados.usuarioId || null,
          usuarioExecutor: dados.usuarioExecutor || null,
          acao: dados.acao,
          entidade: dados.entidade,
          entidadeId: dados.entidadeId || null,
          dadosAnteriores: dados.dadosAnteriores || null,
          dadosNovos: dados.dadosNovos || null,
          valorOperacao: dados.valorOperacao || null,
          contasAfetadas: dados.contasAfetadas ? JSON.parse(JSON.stringify(dados.contasAfetadas)) : null,
          transacaoId: dados.transacaoId || null,
          ipAddress,
          userAgent,
          detalhesOperacao: dados.detalhesOperacao || null,
          resultado: dados.resultado,
          tempoExecucao: dados.tempoExecucao || (Date.now() - inicioTempo),
          sessionId
        }
      });

      // Log para debugging (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📋 Auditoria registrada:`, {
          acao: dados.acao,
          entidade: dados.entidade,
          entidadeId: dados.entidadeId,
          usuarioId: dados.usuarioId,
          resultado: dados.resultado,
          valorOperacao: dados.valorOperacao
        });
      }

    } catch (error) {
      console.error(`💥 Erro ao registrar auditoria:`, error);
      
      // Em caso de erro na auditoria, pelo menos fazer log do erro
      console.error(`📋 Auditoria falhou para:`, {
        acao: dados.acao,
        entidade: dados.entidade,
        usuarioId: dados.usuarioId,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Função para auditar transações
  static async auditarTransacao(dadosTransacao: {
    usuarioId?: number;
    transacaoId: number;
    compradorId: number;
    vendedorId: number;
    valorOperacao: number;
    dadosCompletos: any;
    resultado: ResultadoOperacao;
    req?: Request;
    tempoExecucao?: number;
  }): Promise<void> {
    await this.registrar({
      usuarioId: dadosTransacao.usuarioId,
      acao: TipoAcao.TRANSACAO,
      entidade: TipoEntidade.TRANSACAO,
      entidadeId: dadosTransacao.transacaoId,
      dadosNovos: dadosTransacao.dadosCompletos,
      valorOperacao: dadosTransacao.valorOperacao,
      contasAfetadas: [dadosTransacao.compradorId, dadosTransacao.vendedorId],
      transacaoId: dadosTransacao.transacaoId,
      detalhesOperacao: `Transação entre comprador ${dadosTransacao.compradorId} e vendedor ${dadosTransacao.vendedorId}`,
      resultado: dadosTransacao.resultado,
      tempoExecucao: dadosTransacao.tempoExecucao,
      req: dadosTransacao.req
    });
  }

  // Função para auditar estornos
  static async auditarEstorno(dadosEstorno: {
    usuarioId?: number;
    transacaoId: number;
    valorOperacao: number;
    dadosAnteriores: any;
    contasAfetadas: number[];
    motivo?: string;
    resultado: ResultadoOperacao;
    req?: Request;
    tempoExecucao?: number;
  }): Promise<void> {
    await this.registrar({
      usuarioId: dadosEstorno.usuarioId,
      acao: TipoAcao.ESTORNO,
      entidade: TipoEntidade.TRANSACAO,
      entidadeId: dadosEstorno.transacaoId,
      dadosAnteriores: dadosEstorno.dadosAnteriores,
      valorOperacao: dadosEstorno.valorOperacao,
      contasAfetadas: dadosEstorno.contasAfetadas,
      transacaoId: dadosEstorno.transacaoId,
      detalhesOperacao: dadosEstorno.motivo || `Estorno da transação ${dadosEstorno.transacaoId}`,
      resultado: dadosEstorno.resultado,
      tempoExecucao: dadosEstorno.tempoExecucao,
      req: dadosEstorno.req
    });
  }

  // Função para auditar mudanças em contas
  static async auditarConta(dadosConta: {
    usuarioId?: number;
    contaId: number;
    acao: TipoAcao;
    dadosAnteriores: any;
    dadosNovos: any;
    valorOperacao?: number;
    transacaoId?: number;
    detalhes?: string;
    resultado: ResultadoOperacao;
    req?: Request;
  }): Promise<void> {
    await this.registrar({
      usuarioId: dadosConta.usuarioId,
      acao: dadosConta.acao,
      entidade: TipoEntidade.CONTA,
      entidadeId: dadosConta.contaId,
      dadosAnteriores: dadosConta.dadosAnteriores,
      dadosNovos: dadosConta.dadosNovos,
      valorOperacao: dadosConta.valorOperacao,
      contasAfetadas: [dadosConta.contaId],
      transacaoId: dadosConta.transacaoId,
      detalhesOperacao: dadosConta.detalhes || `Alteração na conta ${dadosConta.contaId}`,
      resultado: dadosConta.resultado,
      req: dadosConta.req
    });
  }

  // Função para auditar cobranças
  static async auditarCobranca(dadosCobranca: {
    usuarioId?: number;
    cobrancaId: number;
    acao: TipoAcao;
    dadosCobranca: any;
    valorOperacao: number;
    contaId: number;
    transacaoId?: number;
    resultado: ResultadoOperacao;
    req?: Request;
  }): Promise<void> {
    await this.registrar({
      usuarioId: dadosCobranca.usuarioId,
      acao: dadosCobranca.acao,
      entidade: TipoEntidade.COBRANCA,
      entidadeId: dadosCobranca.cobrancaId,
      dadosNovos: dadosCobranca.dadosCobranca,
      valorOperacao: dadosCobranca.valorOperacao,
      contasAfetadas: [dadosCobranca.contaId],
      transacaoId: dadosCobranca.transacaoId,
      detalhesOperacao: `${dadosCobranca.acao} cobrança ${dadosCobranca.cobrancaId}`,
      resultado: dadosCobranca.resultado,
      req: dadosCobranca.req
    });
  }

  // Função para buscar auditorias (para dashboard)
  static async buscarAuditorias(filtros: {
    usuarioId?: number;
    acao?: TipoAcao;
    entidade?: TipoEntidade;
    transacaoId?: number;
    dataInicio?: Date;
    dataFim?: Date;
    resultado?: ResultadoOperacao;
    limite?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.acao) where.acao = filtros.acao;
    if (filtros.entidade) where.entidade = filtros.entidade;
    if (filtros.transacaoId) where.transacaoId = filtros.transacaoId;
    if (filtros.resultado) where.resultado = filtros.resultado;

    if (filtros.dataInicio || filtros.dataFim) {
      where.timestamp = {};
      if (filtros.dataInicio) where.timestamp.gte = filtros.dataInicio;
      if (filtros.dataFim) where.timestamp.lte = filtros.dataFim;
    }

    return await prisma.auditoriaFinanceira.findMany({
      where,
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
            cpf: true
          }
        },
        transacao: {
          select: {
            idTransacao: true,
            valorRt: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: filtros.limite || 100,
      skip: filtros.offset || 0
    });
  }

  // Função para estatísticas de auditoria
  static async obterEstatisticas(filtros: {
    dataInicio?: Date;
    dataFim?: Date;
    usuarioId?: number;
  }) {
    const where: any = {};

    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    
    if (filtros.dataInicio || filtros.dataFim) {
      where.timestamp = {};
      if (filtros.dataInicio) where.timestamp.gte = filtros.dataInicio;
      if (filtros.dataFim) where.timestamp.lte = filtros.dataFim;
    }

    const [totalOperacoes, operacoesPorAcao, operacoesPorResultado, valorTotalOperacoes] = await Promise.all([
      // Total de operações
      prisma.auditoriaFinanceira.count({ where }),
      
      // Operações por ação
      prisma.auditoriaFinanceira.groupBy({
        by: ['acao'],
        where,
        _count: { acao: true }
      }),

      // Operações por resultado  
      prisma.auditoriaFinanceira.groupBy({
        by: ['resultado'],
        where,
        _count: { resultado: true }
      }),

      // Valor total das operações
      prisma.auditoriaFinanceira.aggregate({
        where: {
          ...where,
          valorOperacao: { not: null }
        },
        _sum: { valorOperacao: true },
        _avg: { valorOperacao: true },
        _max: { valorOperacao: true }
      })
    ]);

    return {
      totalOperacoes,
      operacoesPorAcao,
      operacoesPorResultado,
      valorTotalOperacoes: valorTotalOperacoes._sum.valorOperacao || 0,
      valorMedioOperacoes: valorTotalOperacoes._avg.valorOperacao || 0,
      maiorOperacao: valorTotalOperacoes._max.valorOperacao || 0
    };
  }
}

// Função de conveniência para auditoria rápida
export const auditar = AuditoriaFinanceira.registrar;

// Tipos e enums já foram exportados acima, não precisamos re-exportar