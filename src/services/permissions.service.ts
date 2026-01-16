import prisma from "../lib/prisma";

type PermissionSubjectType = "USUARIO" | "SUBCONTA";

export type ResolvedPermissions = {
  allow: Set<string>;
  deny: Set<string>;
  subjectType: PermissionSubjectType | null;
};

const normalizeTipo = (value?: string | null) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() || "";

const findGroupMatchingTipo = async (tipo?: string | null) => {
  const normalized = normalizeTipo(tipo);
  if (!normalized) {
    return null;
  }

  const groups = await prisma.permissionGroup.findMany({
    select: {
      id: true,
      nome: true,
      defaultForTipo: true,
    },
  });

  return (
    groups.find((group) => normalizeTipo(group.defaultForTipo) === normalized) ??
    groups.find((group) => normalizeTipo(group.nome) === normalized) ??
    null
  );
};

const buildScopeWhere = (
  subjectId: number,
  subjectType: PermissionSubjectType
) =>
  subjectType === "SUBCONTA"
    ? { subcontaId: subjectId }
    : { usuarioId: subjectId };

const detectSubjectType = async (
  subjectId: number,
  explicit?: PermissionSubjectType
): Promise<PermissionSubjectType | null> => {
  if (explicit) {
    if (explicit === "USUARIO") {
      const usuario = await prisma.usuarios.findUnique({
        where: { idUsuario: subjectId },
      });
      if (usuario) {
        return "USUARIO";
      }
    } else {
      const subconta = await prisma.subContas.findUnique({
        where: { idSubContas: subjectId },
      });
      if (subconta) {
        return "SUBCONTA";
      }
    }
    return null;
  }

  const usuario = await prisma.usuarios.findUnique({
    where: { idUsuario: subjectId },
  });
  if (usuario) {
    return "USUARIO";
  }

  const subconta = await prisma.subContas.findUnique({
    where: { idSubContas: subjectId },
  });
  if (subconta) {
    return "SUBCONTA";
  }

  return null;
};

const ensureDefaultGroupAssignment = async (
  subjectId: number,
  subjectType: PermissionSubjectType
) => {
  if (subjectType !== "USUARIO") {
    return false;
  }

  const usuario = await prisma.usuarios.findUnique({
    where: { idUsuario: subjectId },
    select: {
      idUsuario: true,
      tipo: true,
      matrizId: true,
    },
  });

  if (!usuario) {
    return false;
  }

  const inferredTipo =
    usuario.tipo || (usuario.matrizId === null ? "Matriz" : "");

  const group = await findGroupMatchingTipo(inferredTipo);

  if (!group) {
    return false;
  }

  await prisma.usuarioPermissionGroup.upsert({
    where: {
      usuarioId_groupId_escopo: {
        usuarioId: usuario.idUsuario,
        groupId: group.id,
        escopo: "DEFAULT",
      },
    },
    update: {},
    create: {
      usuarioId: usuario.idUsuario,
      groupId: group.id,
      escopo: "DEFAULT",
    },
  });

  return true;
};

export const resolveUserPermissions = async (
  subjectId: number,
  options?: { targetType?: PermissionSubjectType }
): Promise<ResolvedPermissions> => {
  const subjectType = await detectSubjectType(
    subjectId,
    options?.targetType
  );

  if (!subjectType) {
    return { allow: new Set(), deny: new Set(), subjectType: null };
  }

  const scopeWhere = buildScopeWhere(subjectId, subjectType);

  let vinculos = await prisma.usuarioPermissionGroup.findMany({
    where: scopeWhere,
    include: {
      group: {
        include: {
          assignments: {
            where: { valor: true },
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!vinculos.length) {
    const ensured = await ensureDefaultGroupAssignment(subjectId, subjectType);
    if (ensured) {
      vinculos = await prisma.usuarioPermissionGroup.findMany({
        where: scopeWhere,
        include: {
          group: {
            include: {
              assignments: {
                where: { valor: true },
                include: { permission: true },
              },
            },
          },
        },
      });
    }
  }

  const allow = new Set<string>();
  const deny = new Set<string>();

  vinculos
    .filter((vinculo) => vinculo.escopo !== "OVERRIDE")
    .forEach((vinculo) => {
      vinculo.group?.assignments?.forEach((assignment) => {
        const chave = assignment.permission?.chave;
        if (assignment.valor && chave) {
          allow.add(chave);
        }
      });
    });

  vinculos
    .filter((vinculo) => vinculo.escopo === "OVERRIDE")
    .forEach((vinculo) => {
      const extras = vinculo.permissoesExtras as {
        allow?: string[];
        deny?: string[];
      };
      extras?.allow?.forEach((perm) => allow.add(perm));
      extras?.deny?.forEach((perm) => {
        allow.delete(perm);
        deny.add(perm);
      });
    });

  return { allow, deny, subjectType };
};
