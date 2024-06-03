// dashboard.routes.ts

import express from "express";
import { calcularPagamentoGerente, calcularPagamentoTodosGerentes, calcularReceitaMatriz, fundoPermutaGeralMatriz, fundoPermutaUnidade,  getTotalValorRT, getValorTotalCreditosAprovados, getValorTotalPorUnidade, valorTotalReceberAssociados } from "../controllers/dashboard.controller";
import { getTipoDeContaUsuario } from "../controllers/users.controller";


const dashboardRouter = express.Router();

// Rota para obter o total do valor RT de todas as transações
dashboardRouter.get("/total-valor-rt", getTotalValorRT);

dashboardRouter.get("/total-valor-rt-por-unidade/:usuarioCriadorId", getValorTotalPorUnidade);

dashboardRouter.get("/total-fundo-permuta-matriz/:matrizId", fundoPermutaGeralMatriz);

dashboardRouter.get( "/total-creditos-aprovados/", getValorTotalCreditosAprovados);

dashboardRouter.get("/fundo-permuta-unidade/:idFranquia", fundoPermutaUnidade);

dashboardRouter.get("/receita-matriz/:matrizId", calcularReceitaMatriz)

dashboardRouter.get("/receita-agencia/:agenciaId", valorTotalReceberAssociados);

dashboardRouter.get("/a-pagar-gerente/:idGerente", calcularPagamentoGerente);

dashboardRouter.get("/a-pagar-todos-gerentes/:idAgencia", calcularPagamentoTodosGerentes);


export default dashboardRouter;
