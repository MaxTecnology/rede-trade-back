DO $$
BEGIN
  ALTER TABLE "Matriz" ADD COLUMN "usuarioId" INTEGER UNIQUE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Filial" ADD COLUMN "usuarioId" INTEGER UNIQUE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Matriz"
    ADD CONSTRAINT "Matriz_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Filial"
    ADD CONSTRAINT "Filial_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario")
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
