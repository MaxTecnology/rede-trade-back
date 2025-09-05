# 🧪 Guia: Banco Limpo para Testes Manuais

Este é o guia definitivo para ter um banco limpo com apenas a matriz para seus testes.

## 🎯 O que você quer

✅ **Banco recriado limpo** (sem dados fictícios)  
✅ **Apenas 1 usuário matriz** (administrador)  
✅ **Saldos zerados** para testes  
✅ **Estruturas básicas** (categorias, planos, tipos de conta)  
✅ **Pronto para cadastrar associados** manualmente  

## 🚀 Como fazer (2 comandos simples)

### 1️⃣ **Recriar banco limpo (sem seeds)**
```bash
npm run db:limpo
```
**O que faz:**
- 🗑️ Apaga tudo do banco
- 🏗️ Executa todas as migrations (recria estrutura)
- ✅ **NÃO executa seeds** (fica vazio)
- ⚡ Banco limpo com apenas estrutura

### 2️⃣ **Criar apenas usuário matriz**
```bash
npm run matriz:criar
```
**O que faz:**
- 👑 Cria 1 usuário matriz
- 💳 Cria 1 conta com saldos **zerados**
- ✅ Pronto para seus testes

## 📋 Resultado Final

Após executar os 2 comandos, você terá:

```
📊 BANCO DE DADOS:
• 1 usuário (matriz)
• 1 conta (saldos zerados)
• 0 associados
• 0 ofertas  
• 0 transações
• ✅ Estruturas básicas (categorias, planos, tipos)

🔑 LOGIN:
Email: usuario.matriz@example.com
Senha: 123456
Saldos: R$ 0,00 | RT$ 0
```

## 🔄 Para resetar novamente

Sempre que quiser limpar e começar do zero:

```bash
# 1. Limpar tudo
npm run db:limpo

# 2. Criar matriz
npm run matriz:criar
```

## 🆚 Comparação com outras opções

| Comando | Resultado | Usuários | Seeds | Uso |
|---------|-----------|----------|-------|-----|
| `npm run db:reset` | Banco + dados fictícios | Muitos | Sim | ❌ Não é o que você quer |
| `npm run seed:clear` | Dados fictícios | Muitos | Sim | ❌ Não é o que você quer |  
| **`npm run db:limpo`** | **Banco limpo** | **0** | **Não** | **✅ Exatamente o que você quer** |
| **`npm run matriz:criar`** | **+ Só matriz** | **1** | **Não** | **✅ Perfeito para testes** |

## ✅ Agora você pode

1. **Testar criação de associados** do zero
2. **Ver funcionalidades** sem dados fictícios
3. **Controlar** exatamente o que tem no banco
4. **Resetar** facilmente sempre que precisar

---

**Resumo: `npm run db:limpo` + `npm run matriz:criar` = Banco perfeito para seus testes! 🎯**