// ===== seeds/data/usuarios.data.ts (AJUSTADO PARA O FRONTEND) =====
import bcrypt from "bcrypt";

export const usuariosData = {
  matriz: {
    nome: "Administrador Matriz",
    cpf: "11111111111",
    email: "usuario.matriz@example.com",
    senha: "123456",
    imagem: "matriz_avatar.png",
    statusConta: true,
    reputacao: 5.0,
    razaoSocial: "Matriz Corporação LTDA",
    nomeFantasia: "Matriz Corp",
    cnpj: "11111111000111",
    inscEstadual: "111111111",
    inscMunicipal: "111111111",
    mostrarNoSite: true,
    descricao: "Administração central do sistema de permutas corporativas",
    tipo: "Matriz",
    tipoDeMoeda: "BRL",
    status: true,
    nomeContato: "Admin Matriz",
    telefone: "1133334444",
    celular: "11999998888",
    emailContato: "contato@matrizcorp.com.br",
    emailSecundario: "admin@matrizcorp.com.br",
    site: "https://www.matrizcorp.com.br",
    logradouro: "Avenida Paulista",
    numero: 1000,
    cep: "01310000",
    complemento: "Torre A - 30º andar",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    regiao: "Sudeste",
    aceitaOrcamento: true,
    aceitaVoucher: true,
    tipoOperacao: 3,
    taxaComissaoGerente: 25,
    bloqueado: false,
  },

  gerente: {
    nome: "Carlos Eduardo Gerente",
    cpf: "22222222222",
    email: "gerente.conta@example.com",
    senha: "123456",
    imagem: "gerente_avatar.png",
    statusConta: true,
    reputacao: 4.8,
    razaoSocial: "CE Consultoria e Gestão LTDA",
    nomeFantasia: "CE Gestão",
    cnpj: "22222222000122",
    inscEstadual: "222222222",
    inscMunicipal: "222222222",
    mostrarNoSite: true,
    descricao: "Consultoria especializada em gestão de contas e relacionamento comercial",
    tipo: "Gerente",
    tipoDeMoeda: "BRL",
    status: true,
    nomeContato: "Carlos Eduardo",
    telefone: "2133335555",
    celular: "21988887777",
    emailContato: "carlos@cegestao.com.br",
    emailSecundario: "contato@cegestao.com.br",
    site: "https://www.cegestao.com.br",
    logradouro: "Rua do Ouvidor",
    numero: 150,
    cep: "20040030",
    complemento: "Sala 1205",
    bairro: "Centro",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    regiao: "Sudeste",
    aceitaOrcamento: true,
    aceitaVoucher: true,
    tipoOperacao: 2,
    taxaComissaoGerente: 20,
    bloqueado: false,
  },

  usuarioComum: {
    nome: "Ana Paula Silva",
    cpf: "33333333333",
    email: "usuario.comum@example.com",
    senha: "123456",
    imagem: "ana_avatar.png",
    statusConta: true,
    reputacao: 4.3,
    razaoSocial: "APS Comércio e Serviços ME",
    nomeFantasia: "APS Commerce",
    cnpj: "33333333000133",
    inscEstadual: "333333333",
    inscMunicipal: "333333333",
    mostrarNoSite: true,
    descricao: "Comércio de produtos tecnológicos e prestação de serviços especializados",
    tipo: "Comerciante",
    tipoDeMoeda: "BRL",
    status: true,
    nomeContato: "Ana Paula",
    telefone: "1144446666",
    celular: "11977776666",
    emailContato: "ana@apscommerce.com.br",
    emailSecundario: "vendas@apscommerce.com.br",
    site: "https://www.apscommerce.com.br",
    logradouro: "Rua Augusta",
    numero: 2500,
    cep: "01412100",
    complemento: "Loja 15",
    bairro: "Consolação",
    cidade: "São Paulo",
    estado: "SP",
    regiao: "Sudeste",
    aceitaOrcamento: true,
    aceitaVoucher: true,
    tipoOperacao: 1,
    taxaComissaoGerente: 10,
    bloqueado: false,
  },

  franquias: [
    {
      nome: "João Roberto Franqueado",
      cpf: "44444444444",
      email: "franquia.a@example.com",
      senha: "senha101",
      imagem: "joao_franqueado.png",
      statusConta: true,
      reputacao: 4.6,
      razaoSocial: "JR Franquia Nordeste LTDA",
      nomeFantasia: "Franquia Salvador",
      cnpj: "44444444000144",
      inscEstadual: "444444444",
      inscMunicipal: "444444444",
      mostrarNoSite: true,
      descricao: "Franquia especializada no mercado nordestino",
      tipo: "Franquia",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "João Roberto",
      telefone: "7133337777",
      celular: "71999998888",
      emailContato: "joao@franquiasalvador.com.br",
      emailSecundario: "contato@franquiasalvador.com.br",
      site: "https://www.franquiasalvador.com.br",
      logradouro: "Avenida Tancredo Neves",
      numero: 2915,
      cep: "41820021",
      complemento: "Edifício CEO - Sala 1801",
      bairro: "Caminho das Árvores",
      cidade: "Salvador",
      estado: "BA",
      regiao: "Nordeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      taxaComissaoGerente: 15,
      bloqueado: false,
    },
    {
      nome: "Marina Costa Franqueada",
      cpf: "55555555555",
      email: "franquia.b@example.com",
      senha: "senha102",
      imagem: "marina_franqueada.png",
      statusConta: true,
      reputacao: 4.7,
      razaoSocial: "MC Franquia Sul LTDA",
      nomeFantasia: "Franquia Porto Alegre",
      cnpj: "55555555000155",
      inscEstadual: "555555555",
      inscMunicipal: "555555555",
      mostrarNoSite: true,
      descricao: "Franquia especializada no mercado sulista",
      tipo: "Franquia",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Marina Costa",
      telefone: "5133338888",
      celular: "51988889999",
      emailContato: "marina@franquiapoa.com.br",
      emailSecundario: "contato@franquiapoa.com.br",
      site: "https://www.franquiapoa.com.br",
      logradouro: "Avenida Carlos Gomes",
      numero: 700,
      cep: "90480003",
      complemento: "Sala 2101",
      bairro: "Petrópolis",
      cidade: "Porto Alegre",
      estado: "RS",
      regiao: "Sul",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      taxaComissaoGerente: 15,
      bloqueado: false,
    }
  ],

  associados: [
    {
      nome: "Pedro Henrique Santos",
      cpf: "66666666666",
      email: "pedro.associado@example.com",
      senha: "123456",
      imagem: "pedro_associado.png",
      statusConta: true,
      reputacao: 4.1,
      razaoSocial: "PHS Tecnologia ME",
      nomeFantasia: "TechPedro",
      cnpj: "66666666000166",
      inscEstadual: "666666666",
      inscMunicipal: "666666666",
      mostrarNoSite: true,
      descricao: "Desenvolvimento de soluções tecnológicas para pequenas empresas",
      tipo: "Associado",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Pedro Henrique",
      telefone: "7144449999",
      celular: "71999887766",
      emailContato: "pedro@techpedro.com.br",
      emailSecundario: "contato@techpedro.com.br",
      site: "https://www.techpedro.com.br",
      logradouro: "Rua da Tecnologia",
      numero: 123,
      cep: "40070110",
      complemento: "Sala 101",
      bairro: "Iguatemi",
      cidade: "Salvador",
      estado: "BA",
      regiao: "Nordeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      bloqueado: false,
    },
    {
      nome: "Lucia Fernandes Oliveira",
      cpf: "77777777777",
      email: "lucia.associada@example.com",
      senha: "123456",
      imagem: "lucia_associada.png",
      statusConta: true,
      reputacao: 4.4,
      razaoSocial: "LFO Consultoria EIRELI",
      nomeFantasia: "Lucia Consultoria",
      cnpj: "77777777000177",
      inscEstadual: "777777777",
      inscMunicipal: "777777777",
      mostrarNoSite: true,
      descricao: "Consultoria em gestão empresarial e recursos humanos",
      tipo: "Associado",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Lucia Fernandes",
      telefone: "5155550000",
      celular: "51988776655",
      emailContato: "lucia@luciaconsultoria.com.br",
      emailSecundario: "contato@luciaconsultoria.com.br",
      site: "https://www.luciaconsultoria.com.br",
      logradouro: "Rua dos Consultores",
      numero: 456,
      cep: "91350240",
      complemento: "Conjunto 302",
      bairro: "Sarandi",
      cidade: "Porto Alegre",
      estado: "RS",
      regiao: "Sul",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 2,
      bloqueado: false,
    },
    {
      nome: "Ricardo Almeida Costa",
      cpf: "88888888888",
      email: "ricardo.associado@example.com",
      senha: "123456",
      imagem: "ricardo_associado.png",
      statusConta: true,
      reputacao: 3.9,
      razaoSocial: "RAC Alimentação LTDA",
      nomeFantasia: "Sabores do Ricardo",
      cnpj: "88888888000188",
      inscEstadual: "888888888",
      inscMunicipal: "888888888",
      mostrarNoSite: true,
      descricao: "Restaurante especializado em culinária regional brasileira",
      tipo: "Associado",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Ricardo Almeida",
      telefone: "3133339999",
      celular: "31987654321",
      emailContato: "ricardo@saboresricardo.com.br",
      emailSecundario: "pedidos@saboresricardo.com.br",
      site: "https://www.saboresricardo.com.br",
      logradouro: "Avenida do Contorno",
      numero: 7315,
      cep: "30110017",
      complemento: "Loja A",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      estado: "MG",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      bloqueado: false,
    }
  ]
};

export async function hashPasswords() {
  const hash = async (password: string) => await bcrypt.hash(password, 10);

  return {
    matriz: await hash(usuariosData.matriz.senha),
  };
}

// ===== DOCUMENTAÇÃO DO SISTEMA DE PERMISSÕES =====
/*
🔐 SISTEMA DE PERMISSÕES GRANULAR

📋 PERMISSÕES DISPONÍVEIS:
- ADMIN: Acesso total ao sistema
- READ: Leitura de dados
- WRITE: Escrita/criação de dados
- DELETE: Exclusão de dados
- TRADE: Realizar transações/permutas
- MANAGE_FRANCHISES: Gerenciar franquias
- MANAGE_USERS: Gerenciar usuários
- MANAGE_ACCOUNTS: Gerenciar contas
- MANAGE_CREDITS: Gerenciar créditos
- MANAGE_TRANSACTIONS: Gerenciar transações
- MANAGE_LOCAL_USERS: Gerenciar usuários locais (franquia)
- ADMIN_PANEL: Acesso ao painel administrativo
- FINANCIAL_REPORTS: Relatórios financeiros
- VIEW_REPORTS: Visualizar relatórios

👤 PERFIS DE USUÁRIO:

🏢 MATRIZ (ADMIN COMPLETO):
- Todas as permissões
- Acesso a PLANOS e CATEGORIAS (exclusivo)
- Gerenciamento total do sistema

👨‍💼 GERENTE:
- MANAGE_ACCOUNTS: Pode gerenciar contas
- MANAGE_FRANCHISES: Pode gerenciar franquias
- MANAGE_TRANSACTIONS: Pode gerenciar transações
- Não vê PLANOS e CATEGORIAS (exclusivo da Matriz)

🏪 FRANQUIA:
- MANAGE_FRANCHISES: Gestão da própria franquia
- MANAGE_LOCAL_USERS: Gerenciar associados da sua região
- Acesso a AGÊNCIAS e GERENTES (não é Associado)

👤 USUÁRIO COMUM:
- READ, WRITE, TRADE: Operações básicas
- Acesso limitado ao sistema

👥 ASSOCIADO:
- READ, WRITE, TRADE: Apenas operações básicas
- Não vê AGÊNCIAS nem GERENTES
- Menu mais restrito

🎯 LÓGICA DE EXIBIÇÃO DOS MENUS:

✅ TODOS PODEM VER:
- INÍCIO
- ASSOCIADOS (com READ)
- TRANSAÇÕES (com READ)
- OFERTAS (com READ)
- VOUCHER (com READ)
- CRÉDITOS (com READ)
- EXTRATOS (com READ)

🔒 REQUER PERMISSÕES ESPECÍFICAS:
- AGÊNCIAS: MANAGE_FRANCHISES, MANAGE_ACCOUNTS ou ADMIN
- CONTAS: MANAGE_ACCOUNTS ou ADMIN
- GERENTES: MANAGE_ACCOUNTS, MANAGE_FRANCHISES ou ADMIN
- USUÁRIOS: MANAGE_ACCOUNTS ou ADMIN

🏢 EXCLUSIVO DA MATRIZ:
- PLANOS: Só quem tem ADMIN ou isMatrizUser()
- CATEGORIAS: Só quem tem ADMIN ou isMatrizUser()

🚫 ASSOCIADOS NÃO VEEM:
- AGÊNCIAS (lógica especial: userType !== "Associado")
- GERENTES (lógica especial: userType !== "Associado")
*/
