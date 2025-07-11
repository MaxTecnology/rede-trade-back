# 🔐 Guia de Teste do Sistema de Permissões

## 📋 Usuários Criados para Teste

### 👑 **MATRIZ** - Acesso Total
```
Email: usuario.matriz@example.com
Senha: 123456
Tipo: Matriz
Permissões: ["ADMIN", "READ", "WRITE", "DELETE", "MANAGE_FRANCHISES", "MANAGE_USERS", "MANAGE_ACCOUNTS", "MANAGE_CREDITS", "ADMIN_PANEL", "FINANCIAL_REPORTS", "VIEW_REPORTS"]
```
**✅ Deve Ver:** TODOS os menus (incluindo PLANOS e CATEGORIAS)

### 👨‍💼 **GERENTE PRINCIPAL** - Gestão Completa
```
Email: gerente.conta@example.com
Senha: 123456
Tipo: Gerente
Permissões: ["READ", "WRITE", "MANAGE_ACCOUNTS", "MANAGE_TRANSACTIONS", "MANAGE_FRANCHISES", "VIEW_REPORTS"]
```
**✅ Deve Ver:** AGÊNCIAS, CONTAS, GERENTES, USUÁRIOS
**❌ NÃO Deve Ver:** PLANOS, CATEGORIAS (exclusivo da Matriz)

### 👩‍💼 **GERENTE REGIONAL** - Foco em Franquias
```
Email: gerente.regional@example.com
Senha: 123456
Tipo: Gerente Regional
Permissões: ["READ", "WRITE", "MANAGE_FRANCHISES"]
```
**✅ Deve Ver:** AGÊNCIAS
**❌ NÃO Deve Ver:** CONTAS, GERENTES, USUÁRIOS, PLANOS, CATEGORIAS

### 👨‍💻 **OPERADOR** - Transações
```
Email: operador@example.com
Senha: 123456
Tipo: Operador
Permissões: ["READ", "WRITE", "TRADE", "MANAGE_TRANSACTIONS"]
```
**✅ Deve Ver:** Menus básicos + TRANSAÇÕES
**❌ NÃO Deve Ver:** AGÊNCIAS, CONTAS, GERENTES, USUÁRIOS

### 👩‍💼 **SUPERVISOR DE CONTAS** - Gestão de Contas
```
Email: supervisor.contas@example.com
Senha: 123456
Tipo: Supervisor
Permissões: ["READ", "WRITE", "MANAGE_ACCOUNTS", "VIEW_REPORTS"]
```
**✅ Deve Ver:** CONTAS, GERENTES, USUÁRIOS
**❌ NÃO Deve Ver:** AGÊNCIAS (não tem MANAGE_FRANCHISES)

### 👤 **USUÁRIO COMUM** - Operações Básicas
```
Email: usuario.comum@example.com
Senha: 123456
Tipo: Comerciante
Permissões: ["READ", "WRITE", "TRADE"]
```
**✅ Deve Ver:** Menus básicos (INÍCIO, ASSOCIADOS, TRANSAÇÕES, OFERTAS, etc.)
**❌ NÃO Deve Ver:** AGÊNCIAS, CONTAS, GERENTES, USUÁRIOS, PLANOS, CATEGORIAS

### 🏪 **FRANQUIA A** - Gestão Regional
```
Email: franquia.a@example.com
Senha: senha101
Tipo: Franquia
Permissões: ["READ", "WRITE", "TRADE", "MANAGE_FRANCHISES", "MANAGE_LOCAL_USERS"]
```
**✅ Deve Ver:** AGÊNCIAS, GERENTES (não é Associado)
**❌ NÃO Deve Ver:** PLANOS, CATEGORIAS

### 🏪 **FRANQUIA B** - Gestão Regional
```
Email: franquia.b@example.com
Senha: senha102
Tipo: Franquia
Permissões: ["READ", "WRITE", "TRADE", "MANAGE_FRANCHISES", "MANAGE_LOCAL_USERS"]
```
**✅ Deve Ver:** AGÊNCIAS, GERENTES (não é Associado)
**❌ NÃO Deve Ver:** PLANOS, CATEGORIAS

### 👥 **ASSOCIADOS** - Acesso Limitado
```
Pedro: pedro.associado@example.com | Senha: 123456
Lucia: lucia.associada@example.com | Senha: 123456
Ricardo: ricardo.associado@example.com | Senha: 123456
Tipo: Associado
Permissões: ["READ", "WRITE", "TRADE"]
```
**✅ Deve Ver:** Menus básicos apenas
**❌ NÃO Deve Ver:** AGÊNCIAS, GERENTES (userType === "Associado"), CONTAS, USUÁRIOS

### 🚫 **ASSOCIADO BLOQUEADO** - Restrições
```
Email: associado.bloqueado@example.com
Senha: 123456
Tipo: Associado
Status: BLOQUEADO
Permissões: ["READ"]
```
**✅ Deve Ver:** Apenas menus básicos (somente leitura)
**⚠️ Status:** statusConta: false, bloqueado: true

## 🧪 Cenários de Teste

### 1. **Teste de Hierarquia**
- Faça login como **Matriz** → Deve ver TODOS os menus
- Faça login como **Associado** → Menu mais restrito

### 2. **Teste de Permissões Específicas**
- **PLANOS/CATEGORIAS**: Apenas **Matriz** deve ver
- **AGÊNCIAS**: **Gerente**, **Franquias** veem, **Associados** não
- **CONTAS**: **Matriz**, **Gerente**, **Supervisor** veem

### 3. **Teste de Lógica Especial**
- **Associados** não devem ver AGÊNCIAS nem GERENTES
- **Franquias** devem ver AGÊNCIAS e GERENTES (não são Associados)

### 4. **Teste de Status**
- **Associado Bloqueado** deve ter funcionalidades limitadas

## 🎯 Validações do Frontend

O código do Sidebar deve:

1. **Verificar permissões** com `hasPermission()` e `hasAnyPermission()`
2. **Identificar tipo de usuário** com `getType()`
3. **Validar se é Matriz** com `isMatrizUser()`
4. **Aplicar lógica especial** para PLANOS/CATEGORIAS (exclusivo Matriz)
5. **Bloquear AGÊNCIAS/GERENTES** para Associados

## 📊 Matriz de Permissões

| Menu | Matriz | Gerente | G.Regional | Operador | Supervisor | Usuário | Franquia | Associado |
|------|--------|---------|------------|----------|------------|---------|----------|-----------|
| INÍCIO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ASSOCIADOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AGÊNCIAS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| TRANSAÇÕES | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OFERTAS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| VOUCHER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRÉDITOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EXTRATOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CONTAS | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| PLANOS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CATEGORIAS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GERENTES | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| USUÁRIOS | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

## 🚀 Como Executar os Testes

1. **Execute os seeds atualizados:**
   ```bash
   npm run seed:clear
   ```

2. **Teste cada usuário:**
   - Faça login com cada email/senha
   - Verifique quais menus aparecem no sidebar
   - Confirme se a lógica está correta

3. **Validar console:**
   - Abra DevTools
   - Veja os logs de permissões: `👤 Permissões do usuário:`

## ✨ Benefícios da Implementação

- **🔒 Segurança Granular**: Cada usuário vê apenas o que pode acessar
- **🎯 Flexibilidade**: Fácil adicionar novas permissões
- **📱 UX Melhorada**: Interface limpa sem opções irrelevantes
- **🔧 Manutenibilidade**: Sistema organizado e escalável
- **✅ Compatibilidade**: Funciona com sistema antigo e novo

Este sistema garante que cada tipo de usuário tenha a experiência adequada ao seu nível de acesso! 🎉