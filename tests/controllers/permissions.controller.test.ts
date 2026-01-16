import express from "express";
import request from "supertest";
import permissionsRouter from "../../src/routes/permissions.routes";
import { prismaMock } from "../setup";

const app = express();
app.use(express.json());
app.use("/permissions", permissionsRouter);

const buildAssignment = (categoria: string, chave: string) => ({
  valor: true,
  permission: { categoria, chave },
});

describe("Permissions Router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.usuarioPermissionGroup.findMany.mockResolvedValue([]);
    prismaMock.permissionGroup.findUnique.mockResolvedValue(null);
    prismaMock.subContas.findUnique.mockResolvedValue(null);
    prismaMock.usuarios.findUnique.mockResolvedValue(null);
  });

  describe("GET /permissions/usuarios/:id/permissoes", () => {
    it("retorna matriz resolvida para subconta com override aplicado", async () => {
      prismaMock.subContas.findUnique.mockResolvedValue({
        idSubContas: 77,
      });

      prismaMock.usuarioPermissionGroup.findMany.mockResolvedValue([
        {
          escopo: "DEFAULT",
          groupId: 10,
          group: {
            id: 10,
            nome: "Subconta Padrão",
            descricao: "Grupo base",
            assignments: [buildAssignment("associados", "associados.ver")],
          },
        },
        {
          escopo: "OVERRIDE",
          groupId: 10,
          permissoesExtras: {
            allow: ["planos.associados"],
            deny: ["associados.ver"],
          },
        },
      ]);

      const response = await request(app)
        .get("/permissions/usuarios/77/permissoes")
        .query({ target: "subconta" });

      expect(response.status).toBe(200);
      expect(response.body.subjectType).toBe("SUBCONTA");
      expect(response.body.group).toEqual(
        expect.objectContaining({ id: 10, nome: "Subconta Padrão" })
      );
      expect(
        response.body.baseMatrix.associados["associados.ver"]
      ).toBe(true);
      expect(response.body.override.allow).toContain("planos.associados");
      expect(response.body.permissoes).toContain("planos.associados");
      expect(response.body.permissoes).not.toContain("associados.ver");
    });
  });

  describe("POST /permissions/usuarios/:id/permission-group", () => {
    it("associa grupo padrão a uma subconta", async () => {
      prismaMock.subContas.findUnique.mockResolvedValue({
        idSubContas: 55,
      });
      prismaMock.permissionGroup.findUnique.mockResolvedValue({
        id: 3,
        nome: "Grupo Subconta",
      });
      prismaMock.usuarioPermissionGroup.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaMock.usuarioPermissionGroup.upsert.mockResolvedValue({
        id: 99,
        groupId: 3,
        subcontaId: 55,
        escopo: "DEFAULT",
      });

      const response = await request(app)
        .post("/permissions/usuarios/55/permission-group")
        .query({ target: "subconta" })
        .send({ groupId: 3, escopo: "DEFAULT" });

      expect(response.status).toBe(200);
      expect(prismaMock.permissionGroup.findUnique).toHaveBeenCalledWith({
        where: { id: 3 },
      });
      expect(
        prismaMock.usuarioPermissionGroup.deleteMany
      ).toHaveBeenCalledWith({
        where: {
          subcontaId: 55,
          escopo: {
            not: "OVERRIDE",
          },
        },
      });
      expect(prismaMock.usuarioPermissionGroup.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            subcontaId: 55,
            groupId: 3,
            escopo: "DEFAULT",
          }),
        })
      );
    });
  });
});
