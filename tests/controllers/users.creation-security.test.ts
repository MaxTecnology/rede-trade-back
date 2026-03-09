import { criarUsuario } from "../../src/controllers/users.controller";
import { prismaMock } from "../setup";

const runCriarUsuario = criarUsuario[1] as (
  req: any,
  res: any
) => Promise<unknown>;

const createResponse = (userId?: number) => {
  const res: any = {
    locals: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  if (userId !== undefined) {
    res.locals.userId = userId;
  }

  return res;
};

const baseBody = {
  nome: "Usuario Teste",
  email: "usuario.teste@example.com",
  cpf: "31007215003",
  senha: "123456",
  tipo: "Associado",
};

describe("Users Controller - segurança de criação", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 quando userId autenticado é inválido", async () => {
    const req: any = { body: baseBody, file: undefined };
    const res = createResponse();

    await runCriarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("autenticado inválido"),
      })
    );
  });

  it("bloqueia spoof de usuarioCriadorId diferente do token", async () => {
    const req: any = {
      body: {
        ...baseBody,
        usuarioCriadorId: 999,
      },
      file: undefined,
    };
    const res = createResponse(10);

    await runCriarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("criador diferente do usuário autenticado"),
      })
    );
    expect(prismaMock.usuarios.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("bloqueia criador associado para cadastro de usuário", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce({
      idUsuario: 25,
      tipo: "Associado",
      matrizId: 4,
      conta: {
        tipoDaConta: {
          tipoDaConta: "Associado",
        },
      },
      filialAuth: null,
    });

    const req: any = {
      body: baseBody,
      file: undefined,
    };
    const res = createResponse(25);

    await runCriarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Matriz ou Agência"),
      })
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("bloqueia agência comum cadastrando outra agência", async () => {
    prismaMock.usuarios.findUnique.mockResolvedValueOnce({
      idUsuario: 30,
      tipo: "Agencia Comum",
      matrizId: 4,
      conta: {
        tipoDaConta: {
          tipoDaConta: "Franquia",
        },
      },
      filialAuth: {
        id: 3,
        tipo: "COMUM",
      },
    });

    const req: any = {
      body: {
        ...baseBody,
        tipo: "Agencia Comum",
      },
      file: undefined,
    };
    const res = createResponse(30);

    await runCriarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("cadastrar novas agências"),
      })
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
