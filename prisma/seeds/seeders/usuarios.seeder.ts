import { PrismaClient } from "@prisma/client";
import { usuariosData, hashPasswords } from "../data/usuarios.data";
import { logger } from "../utils/logger";

export async function seedUsuarios(prisma: PrismaClient) {
  const senhasHash = await hashPasswords();

  // Criar matriz primeiro
  const matriz = await prisma.usuarios.create({
    data: {
      ...usuariosData.matriz,
      senha: senhasHash.matriz
    }
  });
  logger.info(`✅ Matriz criada: ${matriz.email}`);

  // Criar gerente
  const gerente = await prisma.usuarios.create({
    data: {
      ...usuariosData.gerente,
      senha: senhasHash.gerente,
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Gerente criado: ${gerente.email}`);

  // Criar usuário comum
  const usuarioComum = await prisma.usuarios.create({
    data: {
      ...usuariosData.usuarioComum,
      senha: senhasHash.usuarioComum,
      usuarioCriadorId: gerente.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Usuário comum criado: ${usuarioComum.email}`);

  // Criar franquias
  const franquiaA = await prisma.usuarios.create({
    data: {
      ...usuariosData.franquias[0],
      senha: senhasHash.franquiaA,
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Franquia A criada: ${franquiaA.email}`);

  const franquiaB = await prisma.usuarios.create({
    data: {
      ...usuariosData.franquias[1],
      senha: senhasHash.franquiaB,
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Franquia B criada: ${franquiaB.email}`);

  // Criar associados
  const associados = [];
  
  const pedro = await prisma.usuarios.create({
    data: {
      ...usuariosData.associados[0],
      senha: senhasHash.associados.pedro,
      usuarioCriadorId: franquiaA.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  associados.push(pedro);
  logger.info(`✅ Associado Pedro criado: ${pedro.email}`);

  const lucia = await prisma.usuarios.create({
    data: {
      ...usuariosData.associados[1],
      senha: senhasHash.associados.lucia,
      usuarioCriadorId: franquiaB.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  associados.push(lucia);
  logger.info(`✅ Associada Lucia criada: ${lucia.email}`);

  const ricardo = await prisma.usuarios.create({
    data: {
      ...usuariosData.associados[2],
      senha: senhasHash.associados.ricardo,
      usuarioCriadorId: gerente.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  associados.push(ricardo);
  logger.info(`✅ Associado Ricardo criado: ${ricardo.email}`);

  return {
    matriz,
    gerente,
    usuarioComum,
    franquiaA,
    franquiaB,
    associados
  };
}