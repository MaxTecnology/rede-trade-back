// auditoria.routes.ts - Rotas para auditoria financeira (Fase 2.1)
import { Router } from 'express';
import {
  listarAuditorias,
  obterEstatisticasAuditoria,
  obterAuditoriaTransacao,
  obterAuditoriaUsuario,
  obterAuditoriasRecentes
} from '../controllers/auditoria.controller';

const router = Router();

// 📋 Rotas de Auditoria Financeira - Fase 2.1

/**
 * GET /auditoria
 * Lista auditorias com filtros
 * Query params: usuarioId, acao, entidade, transacaoId, dataInicio, dataFim, resultado, limite, offset
 */
router.get('/', listarAuditorias);

/**
 * GET /auditoria/estatisticas
 * Obter estatísticas de auditoria
 * Query params: dataInicio, dataFim, usuarioId
 */
router.get('/estatisticas', obterEstatisticasAuditoria);

/**
 * GET /auditoria/recentes
 * Buscar auditorias recentes (últimas 24h)
 * Query params: limite
 */
router.get('/recentes', obterAuditoriasRecentes);

/**
 * GET /auditoria/transacao/:idTransacao
 * Buscar auditoria de uma transação específica
 */
router.get('/transacao/:idTransacao', obterAuditoriaTransacao);

/**
 * GET /auditoria/usuario/:idUsuario
 * Buscar auditoria de um usuário específico
 * Query params: dataInicio, dataFim, acao, limite, offset
 */
router.get('/usuario/:idUsuario', obterAuditoriaUsuario);

export default router;