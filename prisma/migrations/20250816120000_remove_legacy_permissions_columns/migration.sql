-- Drop legacy permission columns migrated to permission groups
ALTER TABLE "Usuarios" DROP COLUMN "permissoesDoUsuario";

ALTER TABLE "SubContas" DROP COLUMN "permissoes";
