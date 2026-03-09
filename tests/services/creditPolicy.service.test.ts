import {
  CREDIT_STATUS,
  canAccessUserCredits,
  canAgencyForwardFromStatus,
  canFinalizeFromStatus,
  canManageSolicitacao,
  isFinalCreditStatus,
  normalizeCreditStatus,
  resolveCreditRole,
  toBooleanMatrizAprovacao,
  type RequesterContext,
} from "../../src/services/creditPolicy.service";

describe("creditPolicy.service", () => {
  describe("resolveCreditRole", () => {
    it("classifica matriz", () => {
      expect(resolveCreditRole("Matriz")).toBe("MATRIZ");
    });

    it("classifica associado", () => {
      expect(resolveCreditRole("Associado")).toBe("ASSOCIADO");
    });

    it("classifica agencia por termos de franquia/agencia/gerente/master", () => {
      expect(resolveCreditRole("Franquia")).toBe("AGENCIA");
      expect(resolveCreditRole("Agencia Master")).toBe("AGENCIA");
      expect(resolveCreditRole("Gerente")).toBe("AGENCIA");
    });

    it("classifica tipos desconhecidos como OUTRO", () => {
      expect(resolveCreditRole("Operacional")).toBe("OUTRO");
      expect(resolveCreditRole(undefined)).toBe("OUTRO");
    });
  });

  describe("normalizeCreditStatus", () => {
    it("normaliza pendente", () => {
      expect(normalizeCreditStatus("PENDENTE")).toBe(CREDIT_STATUS.PENDING);
      expect(normalizeCreditStatus("pendente")).toBe(CREDIT_STATUS.PENDING);
    });

    it("normaliza encaminhado para matriz com variações", () => {
      expect(normalizeCreditStatus("ENCAMINHADO_PARA_MATRIZ")).toBe(
        CREDIT_STATUS.FORWARDED
      );
      expect(normalizeCreditStatus("Encaminhado para a matriz")).toBe(
        CREDIT_STATUS.FORWARDED
      );
    });

    it("normaliza aprovado e negado", () => {
      expect(normalizeCreditStatus("aprovado")).toBe(CREDIT_STATUS.APPROVED);
      expect(normalizeCreditStatus("negado")).toBe(CREDIT_STATUS.DENIED);
    });

    it("retorna null para status inválido", () => {
      expect(normalizeCreditStatus("OUTRO")).toBeNull();
      expect(normalizeCreditStatus(null)).toBeNull();
    });
  });

  describe("flags de status", () => {
    it("identifica status final corretamente", () => {
      expect(isFinalCreditStatus(CREDIT_STATUS.APPROVED)).toBe(true);
      expect(isFinalCreditStatus(CREDIT_STATUS.DENIED)).toBe(true);
      expect(isFinalCreditStatus(CREDIT_STATUS.PENDING)).toBe(false);
      expect(isFinalCreditStatus(null)).toBe(false);
    });

    it("permite finalizar analise apenas quando pendente/encaminhado", () => {
      expect(canFinalizeFromStatus(CREDIT_STATUS.PENDING)).toBe(true);
      expect(canFinalizeFromStatus(CREDIT_STATUS.FORWARDED)).toBe(true);
      expect(canFinalizeFromStatus(CREDIT_STATUS.APPROVED)).toBe(false);
    });

    it("permite encaminhamento por agencia apenas quando pendente", () => {
      expect(canAgencyForwardFromStatus(CREDIT_STATUS.PENDING)).toBe(true);
      expect(canAgencyForwardFromStatus(CREDIT_STATUS.FORWARDED)).toBe(false);
    });

    it("converte status para flag matrizAprovacao", () => {
      expect(toBooleanMatrizAprovacao(CREDIT_STATUS.APPROVED)).toBe(true);
      expect(toBooleanMatrizAprovacao(CREDIT_STATUS.DENIED)).toBe(false);
    });
  });

  describe("governanca de acesso", () => {
    const matrizRequester: RequesterContext = {
      idUsuario: 1,
      nome: "Matriz",
      matrizId: 1,
      usuarioCriadorId: null,
      role: "MATRIZ",
    };
    const agenciaRequester: RequesterContext = {
      idUsuario: 10,
      nome: "Agencia",
      matrizId: 1,
      usuarioCriadorId: 1,
      role: "AGENCIA",
    };
    const associadoRequester: RequesterContext = {
      idUsuario: 20,
      nome: "Associado",
      matrizId: 1,
      usuarioCriadorId: 10,
      role: "ASSOCIADO",
    };

    it("permite matriz acessar qualquer credito", () => {
      expect(canAccessUserCredits(matrizRequester, 999, 10)).toBe(true);
    });

    it("permite usuario acessar os proprios creditos", () => {
      expect(canAccessUserCredits(associadoRequester, 20, 10)).toBe(true);
    });

    it("permite agencia acessar creditos do proprio escopo", () => {
      expect(canAccessUserCredits(agenciaRequester, 20, 10)).toBe(true);
      expect(canAccessUserCredits(agenciaRequester, 20, 99)).toBe(false);
    });

    it("permite gestao de solicitacao para matriz e agencia dona", () => {
      expect(canManageSolicitacao(matrizRequester, 10)).toBe(true);
      expect(canManageSolicitacao(agenciaRequester, 10)).toBe(true);
      expect(canManageSolicitacao(agenciaRequester, 99)).toBe(false);
    });
  });
});

