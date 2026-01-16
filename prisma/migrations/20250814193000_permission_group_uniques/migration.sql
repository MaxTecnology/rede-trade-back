-- Add unique constraint for permission group name
ALTER TABLE "PermissionGroup"
ADD CONSTRAINT "PermissionGroup_nome_key" UNIQUE ("nome");

-- Prevent duplicate assignments per user/group/escopo
ALTER TABLE "UsuarioPermissionGroup"
ADD CONSTRAINT "UsuarioPermissionGroup_usuarioId_groupId_escopo_key"
UNIQUE ("usuarioId", "groupId", "escopo");
