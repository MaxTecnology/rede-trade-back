-- CreateTable
CREATE TABLE "AuditoriaFinanceira" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,
    "usuarioExecutor" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" INTEGER,
    "dadosAnteriores" JSONB,
    "dadosNovos" JSONB,
    "valorOperacao" DOUBLE PRECISION,
    "contasAfetadas" JSONB,
    "transacaoId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "detalhesOperacao" TEXT,
    "resultado" TEXT NOT NULL,
    "tempoExecucao" INTEGER,
    "sessionId" TEXT,

    CONSTRAINT "AuditoriaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditoriaFinanceira_timestamp_idx" ON "AuditoriaFinanceira"("timestamp");

-- CreateIndex
CREATE INDEX "AuditoriaFinanceira_usuarioId_idx" ON "AuditoriaFinanceira"("usuarioId");

-- CreateIndex
CREATE INDEX "AuditoriaFinanceira_acao_idx" ON "AuditoriaFinanceira"("acao");

-- CreateIndex
CREATE INDEX "AuditoriaFinanceira_transacaoId_idx" ON "AuditoriaFinanceira"("transacaoId");

-- CreateIndex
CREATE INDEX "AuditoriaFinanceira_resultado_idx" ON "AuditoriaFinanceira"("resultado");

-- AddForeignKey
ALTER TABLE "AuditoriaFinanceira" ADD CONSTRAINT "AuditoriaFinanceira_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaFinanceira" ADD CONSTRAINT "AuditoriaFinanceira_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("idTransacao") ON DELETE SET NULL ON UPDATE CASCADE;
