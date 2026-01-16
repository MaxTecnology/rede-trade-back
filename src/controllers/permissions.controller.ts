import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { PermissionGrantType } from "@prisma/client";
import { resolveUserPermissions } from "../services/permissions.service";

type PermissionMatrix = Record<string, Record<string, boolean>>;

type PermissionSubjectType = "USUARIO" | "SUBCONTA";

const parsePermissionsPayload = (payload: any): string[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload
      .map((value) => value?.toString().trim())
      .filter(Boolean);
  }

  if (typeof payload === "object") {
    const result: string[] = [];
    Object.entries(payload as PermissionMatrix).forEach(
      ([categoria, itens]) => {
        Object.entries(itens || {}).forEach(([chave, valor]) => {
          if (!valor) return;
          const key = chave.includes(".") ? chave : `${categoria}.${chave}`;
          result.push(key.trim());
        });
      }
    );
    return result;
  }

  return [];
};

const buildMatrixFromAssignments = (
  assignments: Array<{
    permission: { categoria: string; chave: string } | null | undefined;
    valor: boolean;
  }>
): PermissionMatrix => {
  const matrix: PermissionMatrix = {};

  assignments.forEach((assignment) => {
    if (!assignment?.permission || !assignment.valor) {
      return;
    }

    const categoria = assignment.permission.categoria;
    const chave = assignment.permission.chave;

    if (!matrix[categoria]) {
      matrix[categoria] = {};
    }

    matrix[categoria][chave] = true;
  });

  return matrix;
};

const buildMatrixFromKeys = (keys: Iterable<string>): PermissionMatrix => {
  const matrix: PermissionMatrix = {};

  for (const key of keys) {
    const [categoria, action] = key.includes(".")
      ? [key.split(".")[0], key.substring(key.indexOf(".") + 1)]
      : ["geral", key];

    if (!categoria || !action) continue;

    if (!matrix[categoria]) {
      matrix[categoria] = {};
    }

    matrix[categoria][action] = true;
  }

  return matrix;
};

const formatGroupWithPermissions = (group: any) => {
  if (!group?.assignments) {
    return { ...group, permissions: {} };
  }

  const permissions: PermissionMatrix = {};

  group.assignments.forEach((assignment: any) => {
    if (!assignment?.permission || !assignment.valor) return;
    const { categoria, chave } = assignment.permission;
    if (!permissions[categoria]) {
      permissions[categoria] = {};
    }
    permissions[categoria][chave] = true;
  });

  return {
    ...group,
    permissions,
  };
};

const resolvePermissionSubject = async (
  rawSubjectId: number,
  targetParam?: string
) => {
  const normalized =
    typeof targetParam === "string" ? targetParam.toUpperCase() : undefined;

  if (normalized === "SUBCONTA") {
    const subconta = await prisma.subContas.findUnique({
      where: { idSubContas: rawSubjectId },
    });
    if (!subconta) {
      return null;
    }
    return { type: "SUBCONTA" as PermissionSubjectType, id: rawSubjectId };
  }

  const usuario = await prisma.usuarios.findUnique({
    where: { idUsuario: rawSubjectId },
  });

  if (usuario) {
    return { type: "USUARIO" as PermissionSubjectType, id: rawSubjectId };
  }

  const subconta = await prisma.subContas.findUnique({
    where: { idSubContas: rawSubjectId },
  });

  if (subconta) {
    return { type: "SUBCONTA" as PermissionSubjectType, id: rawSubjectId };
  }

  return null;
};

const buildSubjectWhereClause = (subject: {
  type: PermissionSubjectType;
  id: number;
}) => {
  if (subject.type === "SUBCONTA") {
    return { subcontaId: subject.id };
  }
  return { usuarioId: subject.id };
};

export const listPermissionGroups = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt((req.query.pageSize as string) || "20", 10))
    );
    const search = (req.query.search as string)?.trim();

    const where = search
      ? {
          nome: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.permissionGroup.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          id: "asc",
        },
      }),
      prisma.permissionGroup.count({ where }),
    ]);

    res.json({
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("❌ Erro ao listar grupos de permissão:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const getPermissionGroup = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const group = await prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado." });
    }

    res.json(formatGroupWithPermissions(group));
  } catch (error) {
    console.error("❌ Erro ao buscar grupo de permissão:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const createPermissionGroup = async (req: Request, res: Response) => {
  try {
    const { nome, descricao, isDefault, defaultForTipo, herdaDoGrupoId } =
      req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome do grupo é obrigatório." });
    }

    const group = await prisma.permissionGroup.create({
      data: {
        nome: nome.trim(),
        descricao,
        isDefault: Boolean(isDefault),
        defaultForTipo: defaultForTipo?.trim() || null,
        herdaDoGrupoId: herdaDoGrupoId ? parseInt(herdaDoGrupoId, 10) : null,
      },
    });

    res.status(201).json(group);
  } catch (error: any) {
    console.error("❌ Erro ao criar grupo:", error);
    const message =
      error?.code === "P2002"
        ? "Já existe um grupo com esse nome."
        : "Erro interno do servidor.";
    res.status(500).json({ error: message });
  }
};

export const updatePermissionGroup = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nome, descricao, isDefault, defaultForTipo, herdaDoGrupoId } =
      req.body;

    const existing = await prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Grupo não encontrado." });
    }

    const data: any = {
      descricao,
    };

    if (nome !== undefined) {
      if (!nome || !nome.trim()) {
        return res.status(400).json({ error: "Nome do grupo é obrigatório." });
      }
      data.nome = nome.trim();
    }

    if (isDefault !== undefined) {
      data.isDefault = Boolean(isDefault);
    }

    if (defaultForTipo !== undefined) {
      data.defaultForTipo = defaultForTipo ? defaultForTipo.trim() : null;
    }

    if (herdaDoGrupoId !== undefined) {
      data.herdaDoGrupoId = herdaDoGrupoId
        ? parseInt(herdaDoGrupoId, 10)
        : null;
    }

    const group = await prisma.permissionGroup.update({
      where: { id },
      data,
    });

    res.json(group);
  } catch (error: any) {
    console.error("❌ Erro ao atualizar grupo:", error);
    const message =
      error?.code === "P2002"
        ? "Já existe um grupo com esse nome."
        : "Erro interno do servidor.";
    res.status(500).json({ error: message });
  }
};

export const updatePermissionGroupPermissions = async (
  req: Request,
  res: Response
) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { permissions } = req.body;

    const group = await prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado." });
    }

    const permissionKeys = parsePermissionsPayload(permissions);

    const existingPermissions = await prisma.permission.findMany({
      where: {
        chave: {
          in: permissionKeys,
        },
      },
    });

    const validKeys = new Set(existingPermissions.map((p) => p.chave));

    await prisma.permissionGroupAssignment.deleteMany({
      where: { groupId: id },
    });

    if (existingPermissions.length > 0) {
      await prisma.permissionGroupAssignment.createMany({
        data: existingPermissions.map((permission) => ({
          groupId: id,
          permissionId: permission.id,
          valor: true,
          grantType: PermissionGrantType.ALLOW,
        })),
        skipDuplicates: true,
      });
    }

    const ignored = permissionKeys.filter((key) => !validKeys.has(key));

    const updatedGroup = await prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            permission: true,
          },
        },
      },
    });

    res.json({
      ...formatGroupWithPermissions(updatedGroup),
      ignoredPermissions: ignored,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar permissões do grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const assignPermissionGroupToUser = async (
  req: Request,
  res: Response
) => {
  try {
    const subjectId = parseInt(req.params.usuarioId, 10);
    const { groupId, escopo = "DEFAULT" } = req.body;
    const targetParam = req.query.target as string | undefined;

    if (!groupId) {
      return res.status(400).json({ error: "groupId é obrigatório." });
    }

    const subject = await resolvePermissionSubject(subjectId, targetParam);

    if (!subject) {
      return res.status(404).json({ error: "Usuário/Subconta não encontrado." });
    }

    const group = await prisma.permissionGroup.findUnique({
      where: { id: parseInt(groupId, 10) },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado." });
    }

    const scopeWhere = buildSubjectWhereClause(subject);

    if (escopo !== "OVERRIDE") {
      await prisma.usuarioPermissionGroup.deleteMany({
        where: {
          ...scopeWhere,
          escopo: {
            not: "OVERRIDE",
          },
        },
      });
    }

    const uniqueWhere =
      subject.type === "SUBCONTA"
        ? {
            subcontaId_groupId_escopo: {
              subcontaId: subject.id,
              groupId: group.id,
              escopo,
            },
          }
        : {
            usuarioId_groupId_escopo: {
              usuarioId: subject.id,
              groupId: group.id,
              escopo,
            },
          };

    const vinculo = await prisma.usuarioPermissionGroup.upsert({
      where: uniqueWhere,
      update: {},
      create: {
        ...scopeWhere,
        groupId: group.id,
        escopo,
      },
    });

    res.json(vinculo);
  } catch (error) {
    console.error("❌ Erro ao associar grupo ao usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const updateUserPermissionOverride = async (
  req: Request,
  res: Response
) => {
  try {
    const subjectId = parseInt(req.params.usuarioId, 10);
    const { groupId, override } = req.body;
    const targetParam = req.query.target as string | undefined;

    if (!groupId) {
      return res.status(400).json({ error: "groupId é obrigatório." });
    }

    const subject = await resolvePermissionSubject(subjectId, targetParam);

    if (!subject) {
      return res.status(404).json({ error: "Usuário/Subconta não encontrado." });
    }

    const group = await prisma.permissionGroup.findUnique({
      where: { id: parseInt(groupId, 10) },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado." });
    }

    const scopeWhere = buildSubjectWhereClause(subject);

    const allow = Array.isArray(override?.allow)
      ? override.allow.map((p: string) => p.trim()).filter(Boolean)
      : [];
    const deny = Array.isArray(override?.deny)
      ? override.deny.map((p: string) => p.trim()).filter(Boolean)
      : [];

    if (allow.length === 0 && deny.length === 0) {
      await prisma.usuarioPermissionGroup.deleteMany({
        where: {
          ...scopeWhere,
          groupId: group.id,
          escopo: "OVERRIDE",
        },
      });
      return res.json({ message: "Override removida." });
    }

    const vinculo = await prisma.usuarioPermissionGroup.upsert({
      where:
        subject.type === "SUBCONTA"
          ? {
              subcontaId_groupId_escopo: {
                subcontaId: subject.id,
                groupId: group.id,
                escopo: "OVERRIDE",
              },
            }
          : {
              usuarioId_groupId_escopo: {
                usuarioId: subject.id,
                groupId: group.id,
                escopo: "OVERRIDE",
              },
            },
      update: {
        permissoesExtras: {
          allow,
          deny,
        },
      },
      create: {
        ...scopeWhere,
        groupId: group.id,
        escopo: "OVERRIDE",
        permissoesExtras: {
          allow,
          deny,
        },
      },
    });

    res.json(vinculo);
  } catch (error) {
    console.error("❌ Erro ao atualizar override de usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const subjectId = parseInt(req.params.usuarioId, 10);
    const targetParam = req.query.target as string | undefined;

    const subject = await resolvePermissionSubject(subjectId, targetParam);

    if (!subject) {
      return res.status(404).json({ error: "Usuário/Subconta não encontrado." });
    }

    const scopeWhere = buildSubjectWhereClause(subject);

    const assignments = await prisma.usuarioPermissionGroup.findMany({
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
      orderBy: {
        createdAt: "asc",
      },
    });

    const { allow, deny } = await resolveUserPermissions(subjectId, {
      targetType: subject.type,
    });

    const baseAssignment = assignments.find(
      (assignment) => assignment.escopo !== "OVERRIDE"
    );
    const overrideAssignment = assignments.find(
      (assignment) => assignment.escopo === "OVERRIDE"
    );

    const baseMatrix = baseAssignment?.group
      ? buildMatrixFromAssignments(baseAssignment.group.assignments)
      : {};

    const basePermissions = baseAssignment?.group
      ? baseAssignment.group.assignments
          .filter(
            (assignment) => assignment.valor && assignment.permission !== null
          )
          .map(
            (assignment) =>
              `${assignment.permission!.categoria}.${assignment.permission!.chave}`
          )
      : [];

    const overrideExtras = overrideAssignment?.permissoesExtras as
      | { allow?: string[]; deny?: string[] }
      | null
      | undefined;

    res.json({
      subjectId,
      subjectType: subject.type,
      group: baseAssignment?.group
        ? {
            id: baseAssignment.group.id,
            nome: baseAssignment.group.nome,
            descricao: baseAssignment.group.descricao,
          }
        : null,
      basePermissions,
      baseMatrix,
      override: overrideAssignment
        ? {
            groupId: overrideAssignment.groupId,
            allow: Array.isArray(overrideExtras?.allow)
              ? [...(overrideExtras?.allow ?? [])]
              : [],
            deny: Array.isArray(overrideExtras?.deny)
              ? [...(overrideExtras?.deny ?? [])]
              : [],
          }
        : null,
      permissoes: Array.from(allow),
      resolvedMatrix: buildMatrixFromKeys(allow),
      deny: Array.from(deny),
    });
  } catch (error) {
    console.error("❌ Erro ao resolver permissões do usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};
