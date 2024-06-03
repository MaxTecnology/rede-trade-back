-- CreateTable
CREATE TABLE "Usuarios" (
    "idUsuario" SERIAL NOT NULL,
    "usuarioCriadorId" INTEGER,
    "matrizId" INTEGER,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "imagem" TEXT,
    "statusConta" BOOLEAN DEFAULT true,
    "reputacao" DOUBLE PRECISION DEFAULT 0.0,
    "razaoSocial" TEXT,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "inscEstadual" TEXT,
    "inscMunicipal" TEXT,
    "mostrarNoSite" BOOLEAN NOT NULL DEFAULT true,
    "descricao" TEXT,
    "tipo" TEXT,
    "tipoDeMoeda" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "restricao" TEXT,
    "nomeContato" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "emailContato" TEXT,
    "emailSecundario" TEXT,
    "site" TEXT,
    "logradouro" TEXT,
    "numero" INTEGER,
    "cep" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "regiao" TEXT,
    "aceitaOrcamento" BOOLEAN NOT NULL,
    "aceitaVoucher" BOOLEAN NOT NULL,
    "tipoOperacao" INTEGER NOT NULL,
    "categoriaId" INTEGER,
    "subcategoriaId" INTEGER,
    "taxaComissaoGerente" INTEGER,
    "permissoesDoUsuario" TEXT NOT NULL DEFAULT '[]',
    "tokenResetSenha" TEXT,

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("idUsuario")
);

-- CreateTable
CREATE TABLE "Conta" (
    "idConta" SERIAL NOT NULL,
    "taxaRepasseMatriz" INTEGER,
    "limiteCredito" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "limiteUtilizado" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "saldoPermuta" DOUBLE PRECISION NOT NULL,
    "limiteVendaMensal" DOUBLE PRECISION NOT NULL,
    "limiteVendaTotal" DOUBLE PRECISION NOT NULL,
    "limiteVendaEmpresa" DOUBLE PRECISION NOT NULL,
    "valorVendaMensalAtual" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "valorVendaTotalAtual" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "diaFechamentoFatura" INTEGER NOT NULL,
    "dataVencimentoFatura" INTEGER NOT NULL,
    "numeroConta" TEXT NOT NULL,
    "dataDeAfiliacao" TIMESTAMP(3),
    "nomeFranquia" TEXT,
    "tipoContaId" INTEGER,
    "usuarioId" INTEGER,
    "planoId" INTEGER,
    "gerenteContaId" INTEGER,
    "permissoesEspecificas" TEXT DEFAULT '[]',

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("idConta")
);

-- CreateTable
CREATE TABLE "TipoConta" (
    "idTipoConta" SERIAL NOT NULL,
    "tipoDaConta" TEXT NOT NULL,
    "prefixoConta" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "permissoes" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "TipoConta_pkey" PRIMARY KEY ("idTipoConta")
);

-- CreateTable
CREATE TABLE "Plano" (
    "idPlano" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nomePlano" TEXT NOT NULL,
    "tipoDoPlano" TEXT,
    "imagem" TEXT,
    "taxaInscricao" DOUBLE PRECISION NOT NULL,
    "taxaComissao" DOUBLE PRECISION NOT NULL,
    "taxaManutencaoAnual" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("idPlano")
);

-- CreateTable
CREATE TABLE "SubContas" (
    "idSubContas" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "numeroSubConta" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "imagem" TEXT,
    "statusConta" BOOLEAN DEFAULT true,
    "reputacao" DOUBLE PRECISION DEFAULT 0.0,
    "telefone" TEXT,
    "celular" TEXT,
    "emailContato" TEXT,
    "logradouro" TEXT,
    "numero" INTEGER,
    "cep" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "contaPaiId" INTEGER NOT NULL,
    "permissoes" TEXT NOT NULL DEFAULT '[]',
    "tokenResetSenha" TEXT,

    CONSTRAINT "SubContas_pkey" PRIMARY KEY ("idSubContas")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "idOferta" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idFranquia" INTEGER,
    "nomeFranquia" TEXT,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "limiteCompra" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "retirada" TEXT NOT NULL,
    "obs" TEXT NOT NULL,
    "imagens" TEXT[],
    "usuarioId" INTEGER,
    "nomeUsuario" TEXT NOT NULL,
    "categoriaId" INTEGER,
    "subcategoriaId" INTEGER,
    "subcontaId" INTEGER,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("idOferta")
);

-- CreateTable
CREATE TABLE "Imagem" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ofertaId" INTEGER NOT NULL,

    CONSTRAINT "Imagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "idCategoria" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nomeCategoria" TEXT NOT NULL,
    "tipoCategoria" TEXT,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("idCategoria")
);

-- CreateTable
CREATE TABLE "Subcategoria" (
    "idSubcategoria" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nomeSubcategoria" TEXT NOT NULL,
    "categoriaId" INTEGER NOT NULL,

    CONSTRAINT "Subcategoria_pkey" PRIMARY KEY ("idSubcategoria")
);

-- CreateTable
CREATE TABLE "Transacao" (
    "idTransacao" SERIAL NOT NULL,
    "codigo" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataDoEstorno" TIMESTAMP(3),
    "nomeComprador" TEXT NOT NULL,
    "nomeVendedor" TEXT NOT NULL,
    "compradorId" INTEGER,
    "vendedorId" INTEGER,
    "saldoUtilizado" TEXT NOT NULL,
    "valorRt" DOUBLE PRECISION NOT NULL,
    "valorAdicional" DOUBLE PRECISION NOT NULL,
    "saldoAnteriorComprador" DOUBLE PRECISION NOT NULL,
    "saldoAposComprador" DOUBLE PRECISION NOT NULL,
    "saldoAnteriorVendedor" DOUBLE PRECISION NOT NULL,
    "saldoAposVendedor" DOUBLE PRECISION NOT NULL,
    "limiteCreditoAnteriorComprador" DOUBLE PRECISION,
    "limiteCreditoAposComprador" DOUBLE PRECISION,
    "numeroParcelas" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "notaAtendimento" INTEGER NOT NULL,
    "observacaoNota" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "emiteVoucher" BOOLEAN NOT NULL DEFAULT false,
    "ofertaId" INTEGER,
    "subContaCompradorId" INTEGER,
    "subContaVendedorId" INTEGER,
    "comissao" DOUBLE PRECISION NOT NULL,
    "comissaoParcelada" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("idTransacao")
);

-- CreateTable
CREATE TABLE "Parcelamento" (
    "idParcelamento" SERIAL NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "valorParcela" DOUBLE PRECISION NOT NULL,
    "comissaoParcela" DOUBLE PRECISION NOT NULL,
    "transacaoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcelamento_pkey" PRIMARY KEY ("idParcelamento")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "idVoucher" SERIAL NOT NULL,
    "codigo" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dataCancelamento" TIMESTAMP(3),
    "transacaoId" INTEGER NOT NULL,
    "status" TEXT DEFAULT 'Ativo',

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("idVoucher")
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "idCobranca" SERIAL NOT NULL,
    "valorFatura" DOUBLE PRECISION NOT NULL,
    "referencia" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "transacaoId" INTEGER,
    "usuarioId" INTEGER,
    "contaId" INTEGER,
    "vencimentoFatura" TIMESTAMP(3),
    "subContaId" INTEGER,
    "gerenteContaId" INTEGER,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("idCobranca")
);

-- CreateTable
CREATE TABLE "SolicitacaoCredito" (
    "idSolicitacaoCredito" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "valorSolicitado" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "motivoRejeicao" TEXT,
    "usuarioSolicitanteId" INTEGER NOT NULL,
    "descricaoSolicitante" TEXT,
    "comentarioAgencia" TEXT,
    "matrizAprovacao" BOOLEAN,
    "comentarioMatriz" TEXT,
    "usuarioCriadorId" INTEGER NOT NULL,
    "matrizId" INTEGER,

    CONSTRAINT "SolicitacaoCredito_pkey" PRIMARY KEY ("idSolicitacaoCredito")
);

-- CreateTable
CREATE TABLE "FundoPermuta" (
    "idFundoPermuta" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "FundoPermuta_pkey" PRIMARY KEY ("idFundoPermuta")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_cpf_key" ON "Usuarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_email_key" ON "Usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Conta_numeroConta_key" ON "Conta"("numeroConta");

-- CreateIndex
CREATE UNIQUE INDEX "Conta_usuarioId_key" ON "Conta"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "SubContas_email_key" ON "SubContas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubContas_cpf_key" ON "SubContas"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "SubContas_numeroSubConta_key" ON "SubContas"("numeroSubConta");

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_usuarioCriadorId_fkey" FOREIGN KEY ("usuarioCriadorId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("idCategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("idSubcategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_tipoContaId_fkey" FOREIGN KEY ("tipoContaId") REFERENCES "TipoConta"("idTipoConta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "contaUsuarioId" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("idPlano") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_gerenteContaId_fkey" FOREIGN KEY ("gerenteContaId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubContas" ADD CONSTRAINT "SubContas_contaPaiId_fkey" FOREIGN KEY ("contaPaiId") REFERENCES "Conta"("idConta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("idCategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("idSubcategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_subcontaId_fkey" FOREIGN KEY ("subcontaId") REFERENCES "SubContas"("idSubContas") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imagem" ADD CONSTRAINT "Imagem_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("idOferta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategoria" ADD CONSTRAINT "Subcategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("idCategoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("idOferta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "transacaoSubContaCompradorId" FOREIGN KEY ("subContaCompradorId") REFERENCES "SubContas"("idSubContas") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "transacaoSubContaVendedorId" FOREIGN KEY ("subContaVendedorId") REFERENCES "SubContas"("idSubContas") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("idTransacao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("idTransacao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("idTransacao") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("idConta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "cobrancaSubContaId" FOREIGN KEY ("subContaId") REFERENCES "SubContas"("idSubContas") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_gerenteContaId_fkey" FOREIGN KEY ("gerenteContaId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCredito" ADD CONSTRAINT "SolicitacaoCredito_usuarioSolicitanteId_fkey" FOREIGN KEY ("usuarioSolicitanteId") REFERENCES "Usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCredito" ADD CONSTRAINT "SolicitacaoCredito_usuarioCriadorId_fkey" FOREIGN KEY ("usuarioCriadorId") REFERENCES "Usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCredito" ADD CONSTRAINT "SolicitacaoCredito_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundoPermuta" ADD CONSTRAINT "FundoPermuta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;
