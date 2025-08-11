// financial-validations.ts - Sistema de validações financeiras
import { ContaInfo } from "./transactions.utils";

// Limites do sistema
export const LIMITES_SISTEMA = {
  VALOR_MIN_TRANSACAO: 0.01,
  VALOR_MAX_TRANSACAO: 50000,
  SALDO_MAX_PERMUTA: 100000,
  LIMITE_MAX_CREDITO: 200000,
  TRANSACOES_MAX_DIA: 50,
  PERCENTUAL_LIMITE_ALERTA: 0.9 // 90%
} as const;

// Tipos de erro financeiro
export enum TipoErroFinanceiro {
  VALOR_INVALIDO = "VALOR_INVALIDO",
  SALDO_INSUFICIENTE = "SALDO_INSUFICIENTE",
  SALDO_NEGATIVO = "SALDO_NEGATIVO",
  LIMITE_EXCEDIDO = "LIMITE_EXCEDIDO",
  CONTA_BLOQUEADA = "CONTA_BLOQUEADA",
  LIMITE_DIARIO_EXCEDIDO = "LIMITE_DIARIO_EXCEDIDO"
}

export class ErroFinanceiro extends Error {
  constructor(
    public tipo: TipoErroFinanceiro,
    message: string,
    public detalhes?: any
  ) {
    super(message);
    this.name = "ErroFinanceiro";
  }
}

// Interface para resultado da validação
export interface ResultadoValidacao {
  valido: boolean;
  erro?: ErroFinanceiro;
  alertas?: string[];
}

// Função principal de validação de transação
export const validarTransacao = (
  contaComprador: ContaInfo,
  contaVendedor: ContaInfo,
  valor: number
): ResultadoValidacao => {
  const alertas: string[] = [];

  try {
    // 1. Validar valor da transação
    validarValorTransacao(valor);

    // 2. Validar estado das contas
    validarEstadoConta(contaComprador, "comprador");
    validarEstadoConta(contaVendedor, "vendedor");

    // 3. Validar saldo do comprador
    validarSaldoComprador(contaComprador, valor);

    // 4. Validar limites do vendedor
    validarLimitesVendedor(contaVendedor, valor);

    // 5. Verificar alertas (não impedem transação)
    const alertasDetectados = verificarAlertas(contaComprador, contaVendedor, valor);
    alertas.push(...alertasDetectados);

    return {
      valido: true,
      alertas: alertas.length > 0 ? alertas : undefined
    };

  } catch (error) {
    if (error instanceof ErroFinanceiro) {
      return {
        valido: false,
        erro: error,
        alertas: alertas.length > 0 ? alertas : undefined
      };
    }
    
    // Erro não esperado
    return {
      valido: false,
      erro: new ErroFinanceiro(
        TipoErroFinanceiro.VALOR_INVALIDO,
        "Erro interno na validação",
        { originalError: error }
      )
    };
  }
};

// Validar valor da transação
const validarValorTransacao = (valor: number): void => {
  if (typeof valor !== 'number' || isNaN(valor)) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.VALOR_INVALIDO,
      "Valor da transação deve ser um número válido"
    );
  }

  if (valor <= 0) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.VALOR_INVALIDO,
      "Valor da transação deve ser maior que zero"
    );
  }

  if (valor < LIMITES_SISTEMA.VALOR_MIN_TRANSACAO) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.VALOR_INVALIDO,
      `Valor mínimo para transação é R$ ${LIMITES_SISTEMA.VALOR_MIN_TRANSACAO.toFixed(2)}`
    );
  }

  if (valor > LIMITES_SISTEMA.VALOR_MAX_TRANSACAO) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.LIMITE_EXCEDIDO,
      `Valor máximo para transação é R$ ${LIMITES_SISTEMA.VALOR_MAX_TRANSACAO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
  }
};

// Validar estado da conta
const validarEstadoConta = (conta: ContaInfo, tipo: "comprador" | "vendedor"): void => {
  if (!conta) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.CONTA_BLOQUEADA,
      `Conta do ${tipo} não encontrada`
    );
  }

  // Verificar se os saldos fazem sentido
  const saldoPermuta = conta.saldoPermuta ?? 0;
  if (saldoPermuta < 0) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.SALDO_NEGATIVO,
      `Conta do ${tipo} possui saldo negativo: RT$ ${saldoPermuta.toFixed(2)}`
    );
  }

  if (conta.limiteUtilizado < 0) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.VALOR_INVALIDO,
      `Limite utilizado não pode ser negativo para ${tipo}`
    );
  }

  if (conta.limiteUtilizado > conta.limiteCredito) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.LIMITE_EXCEDIDO,
      `Limite utilizado (${conta.limiteUtilizado}) excede limite de crédito (${conta.limiteCredito}) para ${tipo}`
    );
  }
};

// Validar saldo do comprador
const validarSaldoComprador = (conta: ContaInfo, valor: number): void => {
  const saldoPermutaDisponivel = conta.saldoPermuta || 0;
  const limiteCreditoDisponivel = conta.limiteCredito - conta.limiteUtilizado;
  const saldoTotalDisponivel = saldoPermutaDisponivel + limiteCreditoDisponivel;

  if (limiteCreditoDisponivel < 0) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.LIMITE_EXCEDIDO,
      "Limite de crédito já foi ultrapassado"
    );
  }

  if (saldoTotalDisponivel < valor) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.SALDO_INSUFICIENTE,
      `Saldo insuficiente. Disponível: RT$ ${saldoTotalDisponivel.toFixed(2)}, Necessário: RT$ ${valor.toFixed(2)}`,
      {
        saldoPermuta: saldoPermutaDisponivel,
        limiteCredito: limiteCreditoDisponivel,
        total: saldoTotalDisponivel,
        valorSolicitado: valor
      }
    );
  }
};

// Validar limites do vendedor
const validarLimitesVendedor = (conta: ContaInfo, valor: number): void => {
  // Verificar limite de venda mensal
  if (conta.valorVendaMensalAtual + valor > conta.limiteVendaMensal) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.LIMITE_EXCEDIDO,
      `Limite de venda mensal seria excedido. Disponível: RT$ ${(conta.limiteVendaMensal - conta.valorVendaMensalAtual).toFixed(2)}`
    );
  }

  // Verificar limite de venda total
  if (conta.valorVendaTotalAtual + valor > conta.limiteVendaTotal) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.LIMITE_EXCEDIDO,
      `Limite de venda total seria excedido. Disponível: RT$ ${(conta.limiteVendaTotal - conta.valorVendaTotalAtual).toFixed(2)}`
    );
  }

  // Verificar limite de venda da empresa
  if (conta.valorVendaTotalAtual + valor > conta.limiteVendaEmpresa) {
    throw new ErroFinanceiro(
      TipoErroFinanceiro.LIMITE_EXCEDIDO,
      `Limite de venda da empresa seria excedido. Disponível: RT$ ${(conta.limiteVendaEmpresa - conta.valorVendaTotalAtual).toFixed(2)}`
    );
  }
};

// Verificar alertas (não impedem transação)
const verificarAlertas = (
  contaComprador: ContaInfo,
  contaVendedor: ContaInfo,
  valor: number
): string[] => {
  const alertas: string[] = [];

  // Alerta: Transação de alto valor
  if (valor > 5000) {
    alertas.push(`Transação de alto valor: RT$ ${valor.toFixed(2)}`);
  }

  // Alerta: Comprador ficará com saldo baixo
  const saldoAposTransacao = (contaComprador.saldoPermuta || 0) - Math.min(valor, contaComprador.saldoPermuta || 0);
  if (saldoAposTransacao < 100) {
    alertas.push(`Comprador ficará com saldo baixo: RT$ ${saldoAposTransacao.toFixed(2)}`);
  }

  // Alerta: Uso de crédito próximo ao limite
  const percentualUsoCredito = (contaComprador.limiteUtilizado / contaComprador.limiteCredito);
  if (percentualUsoCredito > LIMITES_SISTEMA.PERCENTUAL_LIMITE_ALERTA) {
    alertas.push(`Uso de crédito alto: ${(percentualUsoCredito * 100).toFixed(1)}%`);
  }

  // Alerta: Vendedor próximo do limite mensal
  const percentualVendaMensal = ((contaVendedor.valorVendaMensalAtual + valor) / contaVendedor.limiteVendaMensal);
  if (percentualVendaMensal > LIMITES_SISTEMA.PERCENTUAL_LIMITE_ALERTA) {
    alertas.push(`Vendedor próximo do limite mensal: ${(percentualVendaMensal * 100).toFixed(1)}%`);
  }

  return alertas;
};

// Função para validar estorno
export const validarEstorno = (
  contaVendedor: ContaInfo,
  valorEstorno: number
): ResultadoValidacao => {
  try {
    // Verificar se o vendedor tem saldo suficiente para o estorno
    const saldoPermutaAtual = contaVendedor.saldoPermuta || 0;
    
    if (saldoPermutaAtual < valorEstorno) {
      throw new ErroFinanceiro(
        TipoErroFinanceiro.SALDO_INSUFICIENTE,
        `Vendedor não possui saldo suficiente para estorno. Disponível: RT$ ${saldoPermutaAtual.toFixed(2)}, Necessário: RT$ ${valorEstorno.toFixed(2)}`
      );
    }

    return { valido: true };

  } catch (error) {
    if (error instanceof ErroFinanceiro) {
      return {
        valido: false,
        erro: error
      };
    }
    
    return {
      valido: false,
      erro: new ErroFinanceiro(
        TipoErroFinanceiro.VALOR_INVALIDO,
        "Erro interno na validação de estorno",
        { originalError: error }
      )
    };
  }
};

// Interface para estrutura do saldoUtilizado (Fase 1.3)
export interface SaldoUtilizadoDetalhado {
  saldoPermuta: number;
  limiteCredito: number;
  total: number;
  timestamp: Date;
  descrição: string;
}

// Função para criar estrutura detalhada do saldo utilizado
export const criarSaldoUtilizado = (
  valorSaldoPermuta: number = 0, 
  valorLimiteCredito: number = 0
): SaldoUtilizadoDetalhado => {
  const total = valorSaldoPermuta + valorLimiteCredito;
  const partesDescricao = [];
  
  if (valorSaldoPermuta > 0) {
    partesDescricao.push(`saldoPermuta: RT$ ${valorSaldoPermuta.toFixed(2)}`);
  }
  
  if (valorLimiteCredito > 0) {
    partesDescricao.push(`limiteCredito: RT$ ${valorLimiteCredito.toFixed(2)}`);
  }
  
  return {
    saldoPermuta: valorSaldoPermuta,
    limiteCredito: valorLimiteCredito,
    total: total,
    timestamp: new Date(),
    descrição: partesDescricao.join(" + ") || "Sem utilização"
  };
};

// Função para parsear saldoUtilizado legacy (String) para novo formato
export const parserarSaldoUtilizadoLegacy = (saldoUtilizadoString: string): SaldoUtilizadoDetalhado => {
  let valorSaldoPermuta = 0;
  let valorLimiteCredito = 0;

  if (saldoUtilizadoString && saldoUtilizadoString.trim() !== "") {
    const parts = saldoUtilizadoString.split("/");
    
    for (const part of parts) {
      const [tipo, valorStr] = part.trim().split(" - ");
      const valor = parseFloat(valorStr) || 0;
      
      if (tipo.trim() === "saldoPermuta") {
        valorSaldoPermuta = valor;
      } else if (tipo.trim() === "limiteCredito") {
        valorLimiteCredito = valor;
      }
    }
  }

  return criarSaldoUtilizado(valorSaldoPermuta, valorLimiteCredito);
};

// Função para converter estrutura detalhada para string legacy (compatibilidade)
export const converterParaStringLegacy = (saldoDetalhado: SaldoUtilizadoDetalhado): string => {
  const partes = [];
  
  if (saldoDetalhado.saldoPermuta > 0) {
    partes.push(`saldoPermuta - ${saldoDetalhado.saldoPermuta}`);
  }
  
  if (saldoDetalhado.limiteCredito > 0) {
    partes.push(`limiteCredito - ${saldoDetalhado.limiteCredito}`);
  }
  
  return partes.join(" / ");
};

// Função utilitária para formatar valores em reais
export const formatarValorRT = (valor: number): string => {
  return `RT$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};