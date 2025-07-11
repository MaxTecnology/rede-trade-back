export const tiposContaData = [
    {
      tipoDaConta: "Básica",
      prefixoConta: "BSC",
      descricao: "Conta básica para usuários iniciantes",
      permissoes: JSON.stringify(["READ", "WRITE", "TRADE"])
    },
    {
      tipoDaConta: "Premium",
      prefixoConta: "PRM",
      descricao: "Conta premium com recursos avançados",
      permissoes: JSON.stringify(["READ", "WRITE", "TRADE", "MANAGE_ACCOUNTS", "VIEW_REPORTS"])
    },
    {
      tipoDaConta: "Matriz",
      prefixoConta: "MTZ",
      descricao: "Conta matriz com acesso total",
      permissoes: JSON.stringify(["ALL", "MANAGE_FRANCHISES", "ADMIN_PANEL"])
    },
    {
      tipoDaConta: "Franquia",
      prefixoConta: "FRQ",
      descricao: "Conta de franquia com gestão regional",
      permissoes: JSON.stringify(["READ", "WRITE", "TRADE", "MANAGE_LOCAL_USERS"])
    },
    {
      tipoDaConta: "Associado",
      prefixoConta: "ASS",
      descricao: "Conta de associado com recursos básicos",
      permissoes: JSON.stringify(["READ", "WRITE", "TRADE"])
    }
  ];
  
  export const planosData = [
    {
      nomePlano: "Plano Básico",
      tipoDoPlano: "Mensal",
      imagem: "plano_basico.png",
      taxaInscricao: 100.0,
      taxaComissao: 3.0,
      taxaManutencaoAnual: 360.0
    },
    {
      nomePlano: "Plano Premium",
      tipoDoPlano: "Mensal",
      imagem: "plano_premium.png",
      taxaInscricao: 300.0,
      taxaComissao: 5.0,
      taxaManutencaoAnual: 1200.0
    },
    {
      nomePlano: "Plano Matriz",
      tipoDoPlano: "Anual",
      imagem: "plano_matriz.png",
      taxaInscricao: 2000.0,
      taxaComissao: 10.0,
      taxaManutencaoAnual: 5000.0
    },
    {
      nomePlano: "Plano Franquia",
      tipoDoPlano: "Anual",
      imagem: "plano_franquia.png",
      taxaInscricao: 1500.0,
      taxaComissao: 8.0,
      taxaManutencaoAnual: 3600.0
    },
    {
      nomePlano: "Plano Associado",
      tipoDoPlano: "Mensal",
      imagem: "plano_associado.png",
      taxaInscricao: 50.0,
      taxaComissao: 2.5,
      taxaManutencaoAnual: 240.0
    }
  ];