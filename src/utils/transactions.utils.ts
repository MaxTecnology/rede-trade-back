// transactions.utils.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ContaInfo {
  idConta: number;
  saldoPermuta: number | null;
  limiteCredito: number;
  limiteUtilizado: number;
  limiteVendaMensal: number;
  limiteVendaTotal: number;
  limiteVendaEmpresa: number;
  valorVendaMensalAtual: number;
  valorVendaTotalAtual: number;
  diaFechamentoFatura: number;
  dataVencimentoFatura: number;
  numeroConta: string;
  dataDeAfiliacao: Date | null;
  nomeFranquia: string | null;
  tipoContaId: number | null;
  planoId: number | null;
  gerenteContaId: number | null;
}

export async function obterContaInfo(
  subContaId?: number,
  usuarioId?: number
): Promise<ContaInfo | null> {
  try {
    if (subContaId) {
      const subContaInfo = await prisma.subContas.findUnique({
        where: { idSubContas: subContaId },
        include: {
          contaPai: {
            select: {
              idConta: true,
              saldoPermuta: true,
              limiteCredito: true,
              limiteUtilizado: true,
              limiteVendaMensal: true,
              limiteVendaTotal: true,
              limiteVendaEmpresa: true,
              valorVendaMensalAtual: true,
              valorVendaTotalAtual: true,
              diaFechamentoFatura: true,
              dataVencimentoFatura: true,
              numeroConta: true,
              dataDeAfiliacao: true,
              nomeFranquia: true,
              tipoContaId: true,
              planoId: true,
              gerenteContaId: true,
            },
          },
        },
      });

      if (subContaInfo && subContaInfo.contaPai) {
        return subContaInfo.contaPai;
      }
    } else if (usuarioId) {
      const usuarioInfo = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioId },
        include: {
          conta: {
            select: {
              idConta: true,
              saldoPermuta: true,
              limiteCredito: true,
              limiteUtilizado: true,
              limiteVendaMensal: true,
              limiteVendaTotal: true,
              limiteVendaEmpresa: true,
              valorVendaMensalAtual: true,
              valorVendaTotalAtual: true,
              diaFechamentoFatura: true,
              dataVencimentoFatura: true,
              numeroConta: true,
              dataDeAfiliacao: true,
              nomeFranquia: true,
              tipoContaId: true,
              planoId: true,
              gerenteContaId: true,
            },
          },
        },
      });

      if (usuarioInfo && usuarioInfo.conta) {
        return usuarioInfo.conta;
      }
    }

    return null;
  } catch (error) {
    console.error("Erro ao obter informações da conta:", error);
    return null;
  }
}
