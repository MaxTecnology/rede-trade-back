// transaction-locks.ts - Sistema de locks para transações (Fase 1.4)
import prisma from "../lib/prisma";

// Interface para resultado de operação com lock
export interface ResultadoComLock<T = any> {
  sucesso: boolean;
  resultado?: T;
  erro?: string;
  lockObtido: boolean;
  tempoEspera?: number;
}

// Função para executar operação com lock baseado em usuários
export const executarComLockTransacao = async <T>(
  compradorId: number,
  vendedorId: number,
  operacao: () => Promise<T>,
  tempoLimite: number = 30000 // 30 segundos por padrão
): Promise<ResultadoComLock<T>> => {
  const inicioTempo = Date.now();
  
  // Ordenar IDs para evitar deadlocks (sempre bloquear na mesma ordem)
  const [id1, id2] = [compradorId, vendedorId].sort((a, b) => a - b);
  const lockKey = `transaction_${id1}_${id2}`;
  
  console.log(`🔒 Tentando obter lock para transação: ${lockKey}`);

  try {
    // Usar advisory lock do PostgreSQL
    // pg_try_advisory_lock retorna true se conseguiu o lock, false se já está bloqueado
    const lockResult = await prisma.$queryRaw<[{pg_try_advisory_lock: boolean}]>`
      SELECT pg_try_advisory_lock(${BigInt(hashStringToNumber(lockKey))}) as pg_try_advisory_lock;
    `;

    const lockObtido = lockResult[0]?.pg_try_advisory_lock ?? false;
    
    if (!lockObtido) {
      console.log(`❌ Lock já está sendo usado por outra operação: ${lockKey}`);
      
      return {
        sucesso: false,
        erro: "Operação já em andamento para estas contas. Tente novamente em alguns segundos.",
        lockObtido: false,
        tempoEspera: Date.now() - inicioTempo
      };
    }

    console.log(`✅ Lock obtido com sucesso: ${lockKey}`);

    try {
      // Executar a operação protegida
      const resultado = await operacao();
      
      const tempoTotal = Date.now() - inicioTempo;
      console.log(`🎉 Operação concluída com lock em ${tempoTotal}ms: ${lockKey}`);
      
      return {
        sucesso: true,
        resultado,
        lockObtido: true,
        tempoEspera: tempoTotal
      };

    } catch (operacaoError) {
      console.error(`💥 Erro durante operação com lock:`, operacaoError);
      
      return {
        sucesso: false,
        erro: operacaoError instanceof Error ? operacaoError.message : 'Erro desconhecido na operação',
        lockObtido: true,
        tempoEspera: Date.now() - inicioTempo
      };
    }

  } catch (lockError) {
    console.error(`💥 Erro ao obter lock:`, lockError);
    
    return {
      sucesso: false,
      erro: 'Erro interno no sistema de bloqueio',
      lockObtido: false,
      tempoEspera: Date.now() - inicioTempo
    };

  } finally {
    // Sempre liberar o lock, mesmo em caso de erro
    try {
      await prisma.$queryRaw`
        SELECT pg_advisory_unlock(${BigInt(hashStringToNumber(lockKey))});
      `;
      console.log(`🔓 Lock liberado: ${lockKey}`);
    } catch (unlockError) {
      console.error(`⚠️ Erro ao liberar lock ${lockKey}:`, unlockError);
    }
  }
};

// Função para executar operação com lock de estorno (apenas um usuário)
export const executarComLockEstorno = async <T>(
  usuarioId: number,
  transacaoId: number,
  operacao: () => Promise<T>,
  tempoLimite: number = 30000
): Promise<ResultadoComLock<T>> => {
  const inicioTempo = Date.now();
  const lockKey = `refund_${transacaoId}_${usuarioId}`;
  
  console.log(`🔒 Tentando obter lock para estorno: ${lockKey}`);

  try {
    const lockResult = await prisma.$queryRaw<[{pg_try_advisory_lock: boolean}]>`
      SELECT pg_try_advisory_lock(${BigInt(hashStringToNumber(lockKey))}) as pg_try_advisory_lock;
    `;

    const lockObtido = lockResult[0]?.pg_try_advisory_lock ?? false;
    
    if (!lockObtido) {
      return {
        sucesso: false,
        erro: "Estorno já está sendo processado para esta transação.",
        lockObtido: false,
        tempoEspera: Date.now() - inicioTempo
      };
    }

    try {
      const resultado = await operacao();
      
      return {
        sucesso: true,
        resultado,
        lockObtido: true,
        tempoEspera: Date.now() - inicioTempo
      };

    } catch (operacaoError) {
      return {
        sucesso: false,
        erro: operacaoError instanceof Error ? operacaoError.message : 'Erro no estorno',
        lockObtido: true,
        tempoEspera: Date.now() - inicioTempo
      };
    }

  } catch (lockError) {
    return {
      sucesso: false,
      erro: 'Erro interno no sistema de bloqueio',
      lockObtido: false,
      tempoEspera: Date.now() - inicioTempo
    };

  } finally {
    try {
      await prisma.$queryRaw`
        SELECT pg_advisory_unlock(${BigInt(hashStringToNumber(lockKey))});
      `;
      console.log(`🔓 Lock de estorno liberado: ${lockKey}`);
    } catch (unlockError) {
      console.error(`⚠️ Erro ao liberar lock de estorno ${lockKey}:`, unlockError);
    }
  }
};

// Função para liberar todos os locks de uma sessão (cleanup de emergência)
export const liberarTodosLocks = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT pg_advisory_unlock_all();`;
    console.log(`🔓 Todos os locks da sessão foram liberados`);
  } catch (error) {
    console.error(`⚠️ Erro ao liberar todos os locks:`, error);
  }
};

// Função para listar locks ativos (debugging)
export const listarLocksAtivos = async (): Promise<any[]> => {
  try {
    const locks = await prisma.$queryRaw<any[]>`
      SELECT 
        locktype,
        objid,
        mode,
        granted,
        pid
      FROM pg_locks 
      WHERE locktype = 'advisory';
    `;
    
    return locks;
  } catch (error) {
    console.error(`⚠️ Erro ao listar locks:`, error);
    return [];
  }
};

// Função utilitária para converter string em número hash (consistente)
function hashStringToNumber(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Garantir número positivo para advisory lock
  return Math.abs(hash);
}

// Função para verificar se um lock específico está ativo
export const verificarLockAtivo = async (compradorId: number, vendedorId: number): Promise<boolean> => {
  const [id1, id2] = [compradorId, vendedorId].sort((a, b) => a - b);
  const lockKey = `transaction_${id1}_${id2}`;
  const lockNumber = hashStringToNumber(lockKey);
  
  try {
    const result = await prisma.$queryRaw<[{exists: boolean}]>`
      SELECT EXISTS(
        SELECT 1 FROM pg_locks 
        WHERE locktype = 'advisory' 
        AND objid = ${BigInt(lockNumber)}
        AND granted = true
      ) as exists;
    `;
    
    return result[0]?.exists ?? false;
  } catch (error) {
    console.error(`⚠️ Erro ao verificar lock:`, error);
    return false;
  }
};