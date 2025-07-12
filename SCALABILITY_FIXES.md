# 🚀 CORREÇÕES DE ESCALABILIDADE CRÍTICAS

## ⚠️ PROBLEMAS IDENTIFICADOS QUE IMPEDEM ESCALABILIDADE

### 1. 🔴 CRÍTICO: Múltiplas Instâncias do PrismaClient

**Problema**: Cada arquivo cria sua própria instância do Prisma
**Arquivos afetados**: 22+ arquivos
**Solução**: Usar instância singleton criada em `/src/lib/prisma.ts`

**ANTES:**
```typescript
// ❌ Em cada arquivo:
const prisma = new PrismaClient();
```

**DEPOIS:**
```typescript
// ✅ Em todos os arquivos:
import prisma from '@/lib/prisma';
```

**Arquivos que precisam ser alterados:**
- `src/controllers/users.controller.ts:7`
- `src/controllers/transactions.controller.ts:5`
- `src/routes/users.routes.ts:19`
- `src/routes/offer.routes.ts:8`
- `src/routes/account.routes.ts:16`
- ... todos os outros que fazem `new PrismaClient()`

### 2. 🔴 CRÍTICO: Consultas com Includes Pesados

**Problema**: Queries carregam dados desnecessários
**Impacto**: Lentidão exponencial com mais dados

**Exemplo problemático em users.routes.ts:111-137:**
```typescript
// ❌ MUITO PESADO:
include: {
  conta: {
    include: {
      gerenteConta: true,
      tipoDaConta: true,
      plano: true,
      subContas: true,    // ← Pode ser 1000+ registros
      cobrancas: true,    // ← Pode ser 1000+ registros
    }
  },
  ofertas: true,           // ← Pode ser 1000+ registros
  transacoesComprador: true, // ← Pode ser 1000+ registros
  transacoesVendedor: true, // ← Pode ser 1000+ registros
}
```

**Solução:**
```typescript
// ✅ OTIMIZADO:
select: {
  idUsuario: true,
  nome: true,
  email: true,
  tipo: true,
  conta: {
    select: {
      idConta: true,
      numeroConta: true,
      nomeFranquia: true
    }
  }
}
```

### 3. 🔴 CRÍTICO: Sem Limitação de Resultados

**Problema**: Endpoints retornam todos os registros
**Exemplo**: `/listar-usuarios` pode retornar 100.000+ usuários

**Solução:**
```typescript
// ✅ ADICIONAR LIMITAÇÃO:
const usuarios = await prisma.usuarios.findMany({
  take: 50,        // Máximo 50 registros
  skip: page * 50, // Paginação
  // ... resto da query
});
```

### 4. 🟡 MÉDIO: Busca Ineficiente

**Problema**: Usa `contains` para busca de texto
```typescript
// ❌ LENTO:
{ nome: { contains: search, mode: 'insensitive' } }
```

**Solução:**
```typescript
// ✅ MAIS RÁPIDO:
{ 
  OR: [
    { nome: { startsWith: search, mode: 'insensitive' } },
    { email: { startsWith: search, mode: 'insensitive' } }
  ]
}
```

### 5. 🟡 MÉDIO: Middleware checkBlocked Ineficiente

**Problema**: Consulta banco a cada requisição
**Arquivo**: `src/middlewares/checkBlocked.middleware.ts`

**Solução**: Implementar cache Redis ou incluir status no JWT

## 🛠️ PLANO DE CORREÇÃO PRIORITÁRIO

### Fase 1 - URGENTE (1-2 dias)
1. ✅ Criar singleton Prisma (`/src/lib/prisma.ts`)
2. 🔄 Substituir todas as instâncias de `new PrismaClient()`
3. 🔄 Adicionar limitações a queries grandes
4. ✅ Configurar pool de conexões no DATABASE_URL

### Fase 2 - IMPORTANTE (3-5 dias)
1. 🔄 Otimizar includes pesados
2. 🔄 Implementar paginação obrigatória
3. 🔄 Melhorar queries de busca
4. 🔄 Adicionar rate limiting

### Fase 3 - MELHORIAS (1-2 semanas)
1. 🔄 Implementar cache Redis
2. 🔄 Mover uploads para cloud storage
3. 🔄 Adicionar índices no banco
4. 🔄 Monitoramento de performance

## 🧪 TESTE DE CARGA RECOMENDADO

Após correções, testar com:
- **50 usuários simultâneos** (deve funcionar bem)
- **200 usuários simultâneos** (objetivo inicial)
- **500 usuários simultâneos** (objetivo médio prazo)

## 📊 MÉTRICAS PARA MONITORAR

1. **Conexões de banco**: Máximo 20 (configurado)
2. **Tempo de resposta**: < 500ms para queries simples
3. **Uso de memória**: < 512MB por instância
4. **CPU**: < 70% sob carga normal

## ⚡ RESULTADO ESPERADO

**Antes**: ~50 usuários simultâneos
**Depois das correções**: ~200-500 usuários simultâneos
**Melhoria**: 4-10x mais capacidade