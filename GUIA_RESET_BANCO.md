# 🗑️ Guia para Reset do Banco de Dados

Este guia explica como fazer reset seguro do banco de dados usando as migrations e seeds do Prisma.

## 🎯 Opções Disponíveis

### 1. **Reset Completo com Dados de Teste** ✅ Recomendado
```bash
# Reset completo: limpa tudo + cria dados completos para desenvolvimento
npm run db:reset
```
**O que faz:**
- ⚠️ **APAGA TUDO** do banco de dados
- 🔄 Executa todas as migrations novamente
- 🌱 Executa o seed completo (vários usuários, ofertas, transações)
- ✅ Mantém estrutura profissional com dados realistas

**Dados criados:**
- 👑 1 Matriz: `usuario.matriz@example.com` / `123456`
- 👨‍💼 1 Gerente: `gerente.conta@example.com` / `123456`  
- 👤 1 Comerciante: `usuario.comum@example.com` / `123456`
- 🏢 2 Franquias: `franquia.a@example.com` / `senha101`
- 👥 Vários associados com dados de teste
- 🛒 Ofertas de exemplo
- 💸 Transações de exemplo

---

### 2. **Reset Limpo para Testes Manuais** 🧪 Para seus testes
```bash
# Reset + dados mínimos: só matriz para testes do zero
npm run seed:teste
```
**O que faz:**
- 🗑️ Limpa todas as tabelas (mantém structure)
- 👑 Cria APENAS 1 usuário matriz
- 💳 Cria 1 conta matriz com saldos **ZERADOS**
- 📂 Cria categorias básicas
- 📋 Cria planos básicos
- ✅ Sistema limpo para você testar criação de associados

**Dados criados:**
- 👑 **APENAS 1 USUÁRIO**: `usuario.matriz@example.com` / `123456`
- 💰 Saldos zerados: `R$ 0,00` | `RT$ 0`
- 📊 Estruturas básicas (categorias, planos, tipos de conta)

---

### 3. **Seed com Limpeza** 🔄 Híbrido
```bash
# Limpa banco + executa seed completo
npm run seed:clear
```

## 🚨 Importante: Backup

**Sempre fazer backup antes de qualquer reset:**

```bash
# Backup do banco (PostgreSQL)
pg_dump -h localhost -U seu_usuario -d nome_do_banco > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup se necessário
psql -h localhost -U seu_usuario -d nome_do_banco < backup_20250821_143000.sql
```

## 🎯 Recomendação para seus Testes

Para seus testes manuais de criação de associados, recomendo:

```bash
# 1. Fazer backup (se necessário)
pg_dump -h localhost -U seu_usuario -d rede_trade > backup_antes_teste.sql

# 2. Reset limpo para testes
npm run seed:teste

# 3. Confirmar que funcionou
# - Login: usuario.matriz@example.com
# - Senha: 123456
# - Banco limpo com apenas dados essenciais
```

## 📊 Comparação das Opções

| Comando | Usuários | Saldos | Ofertas | Transações | Uso |
|---------|----------|---------|---------|-------------|-----|
| `npm run db:reset` | Vários (12+) | Com valores | Sim | Sim | Desenvolvimento |
| `npm run seed:teste` | 1 (matriz) | Zerados | Não | Não | **Testes manuais** |
| `npm run seed:clear` | Vários (12+) | Com valores | Sim | Sim | Reset rápido |

## ✅ Vantagens da Abordagem com Migrations

1. **🔒 Segurança**: Prisma gerencia tudo automaticamente
2. **🔄 Reversível**: Sempre pode restaurar backup
3. **📋 Estruturado**: Seeds organizados e versionados
4. **⚡ Rápido**: Comandos simples e eficientes  
5. **🧪 Flexível**: Diferentes cenários para diferentes necessidades
6. **👥 Profissional**: Approach usado em produção

## 🎯 Para Seus Testes

Recomendo usar **`npm run seed:teste`** porque:

✅ Banco 100% limpo  
✅ Apenas dados essenciais  
✅ Saldos zerados  
✅ Perfeito para testar criação de associados do zero  
✅ Sem dados de exemplo que atrapalham  
✅ Login simples: matriz/123456  

## ⚠️ Avisos Importantes

- ❌ **NUNCA** execute `db:reset` em produção
- ✅ **SEMPRE** faça backup antes de reset
- 🔍 **CONFIRME** o ambiente (desenvolvimento/teste)
- 📝 **DOCUMENTE** alterações importantes

---

**Pronto para usar! 🚀**