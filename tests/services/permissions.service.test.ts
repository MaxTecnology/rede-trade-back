import { resolveUserPermissions } from "../../src/services/permissions.service";
import { prismaMock } from "../setup";

const buildAssignment = (categoria: string, chave: string) => ({
  valor: true,
  permission: { categoria, chave },
});

describe("resolveUserPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.usuarioPermissionGroup.findMany?.mockResolvedValue([]);
    prismaMock.usuarios.findUnique?.mockResolvedValue(null);
    prismaMock.subContas.findUnique?.mockResolvedValue(null);
  });

  it("retorna permissões do usuário quando há grupo padrão aplicado", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValue({ idUsuario: 1 });
    prismaMock.usuarioPermissionGroup.findMany.mockResolvedValue([
      {
        escopo: "DEFAULT",
        group: {
          assignments: [buildAssignment("associados", "associados.ver")],
        },
      },
    ]);

    const result = await resolveUserPermissions(1);

    expect(result.subjectType).toBe("USUARIO");
    expect(result.allow.has("associados.ver")).toBe(true);
    expect(result.deny.size).toBe(0);
    expect(prismaMock.subContas.findUnique).not.toHaveBeenCalled();
  });

  it("aplica overrides (allow e deny) para usuários", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValue({ idUsuario: 10 });
    prismaMock.usuarioPermissionGroup.findMany.mockResolvedValue([
      {
        escopo: "DEFAULT",
        group: {
          assignments: [
            buildAssignment("associados", "associados.ver"),
            buildAssignment("creditos", "creditos.listar"),
          ],
        },
      },
      {
        escopo: "OVERRIDE",
        permissoesExtras: {
          allow: ["planos.associados"],
          deny: ["associados.ver"],
        },
      },
    ]);

    const result = await resolveUserPermissions(10);

    expect(result.allow.has("planos.associados")).toBe(true);
    expect(result.allow.has("creditos.listar")).toBe(true);
    expect(result.allow.has("associados.ver")).toBe(false);
    expect(result.deny.has("associados.ver")).toBe(true);
  });

  it("identifica subcontas e resolve permissões corretamente", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValue(null);
    prismaMock.subContas.findUnique.mockResolvedValue({ idSubContas: 5 });
    prismaMock.usuarioPermissionGroup.findMany.mockResolvedValue([
      {
        escopo: "DEFAULT",
        group: {
          assignments: [buildAssignment("usuarios", "usuarios.listar")],
        },
      },
    ]);

    const result = await resolveUserPermissions(5);

    expect(result.subjectType).toBe("SUBCONTA");
    expect(result.allow.has("usuarios.listar")).toBe(true);
    expect(prismaMock.usuarios.findUnique).toHaveBeenCalled();
  });

  it("retorna conjuntos vazios quando usuário/subconta não existem", async () => {
    const result = await resolveUserPermissions(9999);
    expect(result.subjectType).toBeNull();
    expect(result.allow.size).toBe(0);
    expect(result.deny.size).toBe(0);
    expect(prismaMock.usuarioPermissionGroup.findMany).not.toHaveBeenCalled();
  });
});
