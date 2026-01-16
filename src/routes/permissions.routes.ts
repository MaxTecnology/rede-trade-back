import { Router } from "express";
import {
  assignPermissionGroupToUser,
  createPermissionGroup,
  getPermissionGroup,
  getUserPermissions,
  listPermissionGroups,
  updatePermissionGroup,
  updatePermissionGroupPermissions,
  updateUserPermissionOverride,
} from "../controllers/permissions.controller";

const permissionsRouter = Router();

permissionsRouter.get("/permission-groups", listPermissionGroups);
permissionsRouter.get("/permission-groups/:id", getPermissionGroup);
permissionsRouter.post("/permission-groups", createPermissionGroup);
permissionsRouter.put("/permission-groups/:id", updatePermissionGroup);
permissionsRouter.put(
  "/permission-groups/:id/permissions",
  updatePermissionGroupPermissions
);

permissionsRouter.post(
  "/usuarios/:usuarioId/permission-group",
  assignPermissionGroupToUser
);
permissionsRouter.put(
  "/usuarios/:usuarioId/permission-override",
  updateUserPermissionOverride
);
permissionsRouter.get(
  "/usuarios/:usuarioId/permissoes",
  getUserPermissions
);

export default permissionsRouter;
