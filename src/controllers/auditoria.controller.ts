// auditoria.controller.ts - Controller para auditoria financeira (Fase 2.1)
import { Request, Response } from "express";
import { AuditoriaFinanceira, TipoAcao, TipoEntidade, ResultadoOperacao } from "../utils/auditoria-financeira";

// Listar auditorias com filtros
export const listarAuditorias = async (req: Request, res: Response) => {
  try {
    const {
      usuarioId,
      acao,
      entidade,
      transacaoId,
      dataInicio,
      dataFim,
      resultado,
      limite = 50,
      offset = 0
    } = req.query;

    console.log(`📋 Consultando auditorias com filtros:`, req.query);

    const filtros: any = {
      limite: Number(limite),
      offset: Number(offset)
    };

    if (usuarioId) filtros.usuarioId = Number(usuarioId);
    if (acao) filtros.acao = acao as TipoAcao;
    if (entidade) filtros.entidade = entidade as TipoEntidade;
    if (transacaoId) filtros.transacaoId = Number(transacaoId);
    if (resultado) filtros.resultado = resultado as ResultadoOperacao;

    if (dataInicio) {
      filtros.dataInicio = new Date(dataInicio as string);
    }

    if (dataFim) {
      filtros.dataFim = new Date(dataFim as string);
    }

    const auditorias = await AuditoriaFinanceira.buscarAuditorias(filtros);

    console.log(`📋 ${auditorias.length} registros de auditoria encontrados`);

    return res.status(200).json({
      auditorias,
      filtros: {
        ...filtros,
        total: auditorias.length
      },
      metadados: {
        limite: Number(limite),
        offset: Number(offset),
        proximoOffset: Number(offset) + auditorias.length
      }
    });

  } catch (error) {
    console.error(`💥 Erro ao listar auditorias:`, error);
    
    return res.status(500).json({
      error: "Erro interno ao consultar auditorias",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
};

// Obter estatísticas de auditoria
export const obterEstatisticasAuditoria = async (req: Request, res: Response) => {
  try {
    const {
      dataInicio,
      dataFim,
      usuarioId
    } = req.query;

    console.log(`📊 Gerando estatísticas de auditoria`);

    const filtros: any = {};

    if (usuarioId) filtros.usuarioId = Number(usuarioId);

    if (dataInicio) {
      filtros.dataInicio = new Date(dataInicio as string);
    }

    if (dataFim) {
      filtros.dataFim = new Date(dataFim as string);
    }

    const estatisticas = await AuditoriaFinanceira.obterEstatisticas(filtros);

    console.log(`📊 Estatísticas geradas:`, {
      totalOperacoes: estatisticas.totalOperacoes,
      valorTotal: estatisticas.valorTotalOperacoes
    });

    return res.status(200).json({
      estatisticas,
      periodo: {
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim
      },
      filtros
    });

  } catch (error) {
    console.error(`💥 Erro ao gerar estatísticas:`, error);
    
    return res.status(500).json({
      error: "Erro interno ao gerar estatísticas de auditoria",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
};

// Buscar auditoria de uma transação específica
export const obterAuditoriaTransacao = async (req: Request, res: Response) => {
  try {
    const { idTransacao } = req.params;

    if (!idTransacao) {
      return res.status(400).json({
        error: "ID da transação é obrigatório"
      });
    }

    console.log(`📋 Buscando auditoria da transação: ${idTransacao}`);

    const auditorias = await AuditoriaFinanceira.buscarAuditorias({
      transacaoId: Number(idTransacao),
      limite: 100 // Transações geralmente têm poucas auditorias
    });

    if (auditorias.length === 0) {
      return res.status(404).json({
        error: "Nenhuma auditoria encontrada para esta transação",
        transacaoId: idTransacao
      });
    }

    console.log(`📋 ${auditorias.length} registros de auditoria encontrados para transação ${idTransacao}`);

    return res.status(200).json({
      transacaoId: idTransacao,
      auditorias,
      resumo: {
        totalRegistros: auditorias.length,
        acoes: [...new Set(auditorias.map(a => a.acao))],
        resultados: [...new Set(auditorias.map(a => a.resultado))],
        primeiroRegistro: auditorias[auditorias.length - 1]?.timestamp,
        ultimoRegistro: auditorias[0]?.timestamp
      }
    });

  } catch (error) {
    console.error(`💥 Erro ao buscar auditoria da transação:`, error);
    
    return res.status(500).json({
      error: "Erro interno ao buscar auditoria da transação",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
};

// Buscar auditoria de um usuário específico
export const obterAuditoriaUsuario = async (req: Request, res: Response) => {
  try {
    const { idUsuario } = req.params;
    const { 
      dataInicio, 
      dataFim, 
      acao,
      limite = 20,
      offset = 0 
    } = req.query;

    if (!idUsuario) {
      return res.status(400).json({
        error: "ID do usuário é obrigatório"
      });
    }

    console.log(`📋 Buscando auditoria do usuário: ${idUsuario}`);

    const filtros: any = {
      usuarioId: Number(idUsuario),
      limite: Number(limite),
      offset: Number(offset)
    };

    if (acao) filtros.acao = acao as TipoAcao;

    if (dataInicio) {
      filtros.dataInicio = new Date(dataInicio as string);
    }

    if (dataFim) {
      filtros.dataFim = new Date(dataFim as string);
    }

    const auditorias = await AuditoriaFinanceira.buscarAuditorias(filtros);

    console.log(`📋 ${auditorias.length} registros de auditoria encontrados para usuário ${idUsuario}`);

    // Calcular estatísticas do usuário
    const estatisticas = await AuditoriaFinanceira.obterEstatisticas({
      usuarioId: Number(idUsuario),
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim
    });

    return res.status(200).json({
      usuarioId: idUsuario,
      auditorias,
      estatisticas,
      metadados: {
        limite: Number(limite),
        offset: Number(offset),
        proximoOffset: Number(offset) + auditorias.length
      }
    });

  } catch (error) {
    console.error(`💥 Erro ao buscar auditoria do usuário:`, error);
    
    return res.status(500).json({
      error: "Erro interno ao buscar auditoria do usuário",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
};

// Buscar auditorias recentes (dashboard)
export const obterAuditoriasRecentes = async (req: Request, res: Response) => {
  try {
    const { limite = 10 } = req.query;

    console.log(`📋 Buscando ${limite} auditorias mais recentes`);

    // Pegar auditorias das últimas 24 horas
    const dataInicio = new Date();
    dataInicio.setHours(dataInicio.getHours() - 24);

    const auditorias = await AuditoriaFinanceira.buscarAuditorias({
      dataInicio,
      limite: Number(limite)
    });

    // Contar por tipo de ação
    const contagemAcoes = auditorias.reduce((acc: any, auditoria) => {
      acc[auditoria.acao] = (acc[auditoria.acao] || 0) + 1;
      return acc;
    }, {});

    // Contar por resultado
    const contagemResultados = auditorias.reduce((acc: any, auditoria) => {
      acc[auditoria.resultado] = (acc[auditoria.resultado] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      auditorias,
      resumo: {
        total: auditorias.length,
        periodo: "últimas 24 horas",
        contagemAcoes,
        contagemResultados
      },
      metadados: {
        limite: Number(limite),
        geradoEm: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`💥 Erro ao buscar auditorias recentes:`, error);
    
    return res.status(500).json({
      error: "Erro interno ao buscar auditorias recentes",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
};