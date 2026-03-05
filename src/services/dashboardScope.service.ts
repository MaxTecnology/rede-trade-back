import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export type NormalizedRole = "matriz" | "agencia" | "associado" | "outro";

const normalizeTexto = (value?: string | null) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

const isAgenciaLike = (tipo?: string | null) => {
  const normalized = normalizeTexto(tipo);
  return (
    normalized.includes("franquia") ||
    normalized.includes("agencia") ||
    normalized.includes("gerente") ||
    normalized.includes("master")
  );
};

export const ASSOCIADO_WHERE: Prisma.UsuariosWhereInput = {
  OR: [
    {
      conta: {
        tipoDaConta: {
          tipoDaConta: "Associado",
        },
      },
    },
    {
      tipo: {
        equals: "Associado",
        mode: "insensitive",
      },
    },
  ],
};

const inferRole = (tipo?: string | null): NormalizedRole => {
  const normalized = normalizeTexto(tipo);
  if (!normalized) return "outro";
  if (normalized === "matriz") return "matriz";
  if (normalized === "associado") return "associado";
  if (isAgenciaLike(tipo)) return "agencia";
  return "outro";
};

const collectOrganizationMembers = async (ownerId: number) => {
  const associados = await prisma.usuarios.findMany({
    where: {
      usuarioCriadorId: ownerId,
      ...ASSOCIADO_WHERE,
    },
    select: { idUsuario: true },
  });

  const uniqueIds = new Set<number>([
    ownerId,
    ...associados.map((assoc) => assoc.idUsuario),
  ]);

  return Array.from(uniqueIds);
};

export type DashboardScope = {
  role: NormalizedRole;
  usuarioId: number;
  agenciaOwnerId: number | null;
  associados: {
    geral: Prisma.UsuariosWhereInput;
    unidade: Prisma.UsuariosWhereInput;
  };
  ofertas: {
    geralIds: number[] | null;
    unidadeIds: number[] | null;
  };
};

export const resolveDashboardScope = async (
  userId: number
): Promise<DashboardScope> => {
  const usuario = await prisma.usuarios.findUnique({
    where: { idUsuario: userId },
    select: {
      idUsuario: true,
      usuarioCriadorId: true,
      tipo: true,
      conta: {
        select: {
          tipoDaConta: {
            select: { tipoDaConta: true },
          },
        },
      },
    },
  });

  if (!usuario) {
    throw new Error("Usuário não encontrado");
  }

  const tipoConta =
    usuario.conta?.tipoDaConta?.tipoDaConta ?? usuario.tipo ?? undefined;
  const role = inferRole(tipoConta);

  if (role === "matriz") {
    return {
      role,
      usuarioId: usuario.idUsuario,
      agenciaOwnerId: null,
      associados: {
        geral: ASSOCIADO_WHERE,
        unidade: ASSOCIADO_WHERE,
      },
      ofertas: {
        geralIds: null,
        unidadeIds: null,
      },
    };
  }

  if (role === "associado") {
    const agenciaId = usuario.usuarioCriadorId ?? usuario.idUsuario;
    const membros = await collectOrganizationMembers(agenciaId);

    return {
      role,
      usuarioId: usuario.idUsuario,
      agenciaOwnerId: agenciaId,
      associados: {
        geral: {
          ...ASSOCIADO_WHERE,
          usuarioCriadorId: agenciaId,
        },
        unidade: {
          ...ASSOCIADO_WHERE,
          usuarioCriadorId: usuario.idUsuario,
        },
      },
      ofertas: {
        geralIds: membros,
        unidadeIds: [usuario.idUsuario],
      },
    };
  }

  // Default: Agência, Gerente ou outros perfis administrativos
  const membros = await collectOrganizationMembers(usuario.idUsuario);

  return {
    role: role === "outro" ? "agencia" : role,
    usuarioId: usuario.idUsuario,
    agenciaOwnerId: usuario.idUsuario,
    associados: {
      geral: {
        ...ASSOCIADO_WHERE,
        usuarioCriadorId: usuario.idUsuario,
      },
      unidade: {
        ...ASSOCIADO_WHERE,
        usuarioCriadorId: usuario.idUsuario,
      },
    },
    ofertas: {
      geralIds: membros,
      unidadeIds: [usuario.idUsuario],
    },
  };
};
