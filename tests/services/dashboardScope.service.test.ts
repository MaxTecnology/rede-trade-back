import { resolveDashboardScope } from "../../src/services/dashboardScope.service";
import { prismaMock } from "../setup";

describe("dashboardScope.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolve escopo de matriz com visao global", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce({
      idUsuario: 1,
      usuarioCriadorId: null,
      tipo: "Matriz",
      conta: {
        tipoDaConta: {
          tipoDaConta: "Matriz",
        },
      },
    });

    const scope = await resolveDashboardScope(1);

    expect(scope.role).toBe("matriz");
    expect(scope.agenciaOwnerId).toBeNull();
    expect(scope.ofertas.geralIds).toBeNull();
    expect(scope.ofertas.unidadeIds).toBeNull();
    expect(prismaMock.usuarios.findMany).not.toHaveBeenCalled();
  });

  it("resolve escopo de associado com geral da agencia criadora e unidade propria", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce({
      idUsuario: 20,
      usuarioCriadorId: 10,
      tipo: "Associado",
      conta: {
        tipoDaConta: {
          tipoDaConta: "Associado",
        },
      },
    });
    prismaMock.usuarios.findMany.mockResolvedValueOnce([
      { idUsuario: 21 },
      { idUsuario: 22 },
    ]);

    const scope = await resolveDashboardScope(20);

    expect(scope.role).toBe("associado");
    expect(scope.agenciaOwnerId).toBe(10);
    expect(scope.associados.geral).toEqual(
      expect.objectContaining({ usuarioCriadorId: 10 })
    );
    expect(scope.associados.unidade).toEqual(
      expect.objectContaining({ usuarioCriadorId: 20 })
    );
    expect(scope.ofertas.unidadeIds).toEqual([20]);
    expect(scope.ofertas.geralIds).toEqual(expect.arrayContaining([10, 21, 22]));
    expect(scope.ofertas.geralIds).toHaveLength(3);
  });

  it("resolve escopo de agencia com membros da propria carteira", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce({
      idUsuario: 10,
      usuarioCriadorId: 1,
      tipo: "Agencia Master",
      conta: {
        tipoDaConta: {
          tipoDaConta: "Franquia",
        },
      },
    });
    prismaMock.usuarios.findMany.mockResolvedValueOnce([
      { idUsuario: 31 },
      { idUsuario: 32 },
    ]);

    const scope = await resolveDashboardScope(10);

    expect(scope.role).toBe("agencia");
    expect(scope.agenciaOwnerId).toBe(10);
    expect(scope.associados.geral).toEqual(
      expect.objectContaining({ usuarioCriadorId: 10 })
    );
    expect(scope.associados.unidade).toEqual(
      expect.objectContaining({ usuarioCriadorId: 10 })
    );
    expect(scope.ofertas.unidadeIds).toEqual([10]);
    expect(scope.ofertas.geralIds).toEqual(expect.arrayContaining([10, 31, 32]));
  });

  it("resolve perfil OUTRO como agencia para nao perder escopo administrativo", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce({
      idUsuario: 40,
      usuarioCriadorId: 1,
      tipo: "Operacional",
      conta: null,
    });
    prismaMock.usuarios.findMany.mockResolvedValueOnce([{ idUsuario: 41 }]);

    const scope = await resolveDashboardScope(40);

    expect(scope.role).toBe("agencia");
    expect(scope.agenciaOwnerId).toBe(40);
    expect(scope.ofertas.unidadeIds).toEqual([40]);
    expect(scope.ofertas.geralIds).toEqual(expect.arrayContaining([40, 41]));
  });

  it("retorna erro quando usuario nao existe", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce(null);

    await expect(resolveDashboardScope(999)).rejects.toThrow(
      "Usuário não encontrado"
    );
  });
});

