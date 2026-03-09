import { FilialTipo } from "@prisma/client";
import {
  evaluateUserCreationPolicy,
  resolveCreatorRole,
  validateCreatorIdPayload,
} from "../../src/services/userCreationPolicy.service";

describe("userCreationPolicy.service", () => {
  describe("validateCreatorIdPayload", () => {
    it("permite quando usuarioCriadorId nao foi enviado", () => {
      const result = validateCreatorIdPayload(10, null);
      expect(result.allowed).toBe(true);
    });

    it("rejeita usuarioCriadorId invalido", () => {
      const result = validateCreatorIdPayload(10, Number.NaN);
      expect(result.allowed).toBe(false);
      expect(result.httpStatus).toBe(400);
    });

    it("rejeita usuarioCriadorId diferente do usuario autenticado", () => {
      const result = validateCreatorIdPayload(10, 20);
      expect(result.allowed).toBe(false);
      expect(result.httpStatus).toBe(403);
    });
  });

  describe("resolveCreatorRole", () => {
    it("classifica matriz corretamente", () => {
      const role = resolveCreatorRole({
        tipo: "Matriz",
        tipoConta: "Matriz",
        filialTipo: null,
      });

      expect(role.isMatriz).toBe(true);
      expect(role.isAgencia).toBe(false);
    });

    it("classifica agencia master por filial.tipo", () => {
      const role = resolveCreatorRole({
        tipo: "Agencia",
        tipoConta: "Franquia",
        filialTipo: FilialTipo.MASTER,
      });

      expect(role.isAgencia).toBe(true);
      expect(role.isAgenciaMaster).toBe(true);
      expect(role.isAgenciaComum).toBe(false);
    });

    it("classifica agencia comum por filial.tipo", () => {
      const role = resolveCreatorRole({
        tipo: "Agencia",
        tipoConta: "Franquia",
        filialTipo: FilialTipo.COMUM,
      });

      expect(role.isAgencia).toBe(true);
      expect(role.isAgenciaMaster).toBe(false);
      expect(role.isAgenciaComum).toBe(true);
    });
  });

  describe("evaluateUserCreationPolicy", () => {
    const matrizRole = resolveCreatorRole({
      tipo: "Matriz",
      tipoConta: "Matriz",
      filialTipo: null,
    });
    const agenciaMasterRole = resolveCreatorRole({
      tipo: "Agencia Master",
      tipoConta: "Franquia",
      filialTipo: FilialTipo.MASTER,
    });
    const agenciaComumRole = resolveCreatorRole({
      tipo: "Agencia Comum",
      tipoConta: "Franquia",
      filialTipo: FilialTipo.COMUM,
    });
    const associadoRole = resolveCreatorRole({
      tipo: "Associado",
      tipoConta: "Associado",
      filialTipo: null,
    });

    it("permite matriz criar agencia", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Agencia Comum",
        creatorRole: matrizRole,
      });
      expect(result.allowed).toBe(true);
    });

    it("permite agencia master criar agencia", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Agencia Comum",
        creatorRole: agenciaMasterRole,
      });
      expect(result.allowed).toBe(true);
    });

    it("bloqueia agencia comum criando agencia", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Agencia Comum",
        creatorRole: agenciaComumRole,
      });
      expect(result.allowed).toBe(false);
      expect(result.httpStatus).toBe(403);
    });

    it("permite agencia comum criar gerente", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Gerente",
        creatorRole: agenciaComumRole,
      });
      expect(result.allowed).toBe(true);
    });

    it("permite agencia comum criar associado", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Associado",
        creatorRole: agenciaComumRole,
      });
      expect(result.allowed).toBe(true);
    });

    it("bloqueia criacao quando criador nao eh matriz/agencia", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Associado",
        creatorRole: associadoRole,
      });
      expect(result.allowed).toBe(false);
      expect(result.httpStatus).toBe(403);
    });

    it("bloqueia criacao de matriz por nao-matriz", () => {
      const result = evaluateUserCreationPolicy({
        targetTipo: "Matriz",
        creatorRole: agenciaMasterRole,
      });
      expect(result.allowed).toBe(false);
      expect(result.httpStatus).toBe(403);
    });
  });
});
