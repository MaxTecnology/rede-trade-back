// ===== seeds/seeders/usuarios.seeder.ts (ATUALIZADO COM MAIS USUÁRIOS) =====
import { PrismaClient } from "@prisma/client";
import { usuariosData, hashPasswords } from "../data/usuarios.data";
import { logger } from "../utils/logger";
import bcrypt from "bcrypt";

export async function seedUsuarios(prisma: PrismaClient) {
  const senhasHash = await hashPasswords();

  // Criar matriz primeiro
  const matriz = await prisma.usuarios.create({
    data: {
      ...usuariosData.matriz,
      senha: senhasHash.matriz,
      matrizId: null // Matriz não tem matriz superior
    }
  });
  logger.info(`✅ Matriz criada: ${matriz.email}`);

  // Criar gerente
  const gerente = await prisma.usuarios.create({
    data: {
      ...usuariosData.gerente,
      senha: senhasHash.gerente,
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Gerente criado: ${gerente.email}`);

  // Criar usuário comum
  const usuarioComum = await prisma.usuarios.create({
    data: {
      ...usuariosData.usuarioComum,
      senha: senhasHash.usuarioComum,
      usuarioCriadorId: gerente.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Usuário comum criado: ${usuarioComum.email}`);

  // Criar franquias
  const franquiaA = await prisma.usuarios.create({
    data: {
      ...usuariosData.franquias[0],
      senha: senhasHash.franquiaA,
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Franquia A criada: ${franquiaA.email}`);

  const franquiaB = await prisma.usuarios.create({
    data: {
      ...usuariosData.franquias[1],
      senha: senhasHash.franquiaB,
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Franquia B criada: ${franquiaB.email}`);

  // Criar associados
  const associados = [];
  
  const pedro = await prisma.usuarios.create({
    data: {
      nome: usuariosData.associados[0].nome,
      cpf: usuariosData.associados[0].cpf,
      email: usuariosData.associados[0].email,
      senha: senhasHash.associados.pedro,
      imagem: usuariosData.associados[0].imagem,
      statusConta: usuariosData.associados[0].statusConta,
      reputacao: usuariosData.associados[0].reputacao,
      razaoSocial: usuariosData.associados[0].razaoSocial,
      nomeFantasia: usuariosData.associados[0].nomeFantasia,
      cnpj: usuariosData.associados[0].cnpj,
      inscEstadual: usuariosData.associados[0].inscEstadual,
      inscMunicipal: usuariosData.associados[0].inscMunicipal,
      mostrarNoSite: usuariosData.associados[0].mostrarNoSite,
      descricao: usuariosData.associados[0].descricao,
      tipo: usuariosData.associados[0].tipo,
      tipoDeMoeda: usuariosData.associados[0].tipoDeMoeda,
      status: usuariosData.associados[0].status,
      nomeContato: usuariosData.associados[0].nomeContato,
      telefone: usuariosData.associados[0].telefone,
      celular: usuariosData.associados[0].celular,
      emailContato: usuariosData.associados[0].emailContato,
      emailSecundario: usuariosData.associados[0].emailSecundario,
      site: usuariosData.associados[0].site,
      logradouro: usuariosData.associados[0].logradouro,
      numero: usuariosData.associados[0].numero,
      cep: usuariosData.associados[0].cep,
      complemento: usuariosData.associados[0].complemento,
      bairro: usuariosData.associados[0].bairro,
      cidade: usuariosData.associados[0].cidade,
      estado: usuariosData.associados[0].estado,
      regiao: usuariosData.associados[0].regiao,
      aceitaOrcamento: usuariosData.associados[0].aceitaOrcamento,
      aceitaVoucher: usuariosData.associados[0].aceitaVoucher,
      tipoOperacao: usuariosData.associados[0].tipoOperacao,
      bloqueado: usuariosData.associados[0].bloqueado,
      permissoesDoUsuario: usuariosData.associados[0].permissoesDoUsuario,
      usuarioCriadorId: franquiaA.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  associados.push(pedro);
  logger.info(`✅ Associado Pedro criado: ${pedro.email}`);

  const lucia = await prisma.usuarios.create({
    data: {
      nome: usuariosData.associados[1].nome,
      cpf: usuariosData.associados[1].cpf,
      email: usuariosData.associados[1].email,
      senha: senhasHash.associados.lucia,
      imagem: usuariosData.associados[1].imagem,
      statusConta: usuariosData.associados[1].statusConta,
      reputacao: usuariosData.associados[1].reputacao,
      razaoSocial: usuariosData.associados[1].razaoSocial,
      nomeFantasia: usuariosData.associados[1].nomeFantasia,
      cnpj: usuariosData.associados[1].cnpj,
      inscEstadual: usuariosData.associados[1].inscEstadual,
      inscMunicipal: usuariosData.associados[1].inscMunicipal,
      mostrarNoSite: usuariosData.associados[1].mostrarNoSite,
      descricao: usuariosData.associados[1].descricao,
      tipo: usuariosData.associados[1].tipo,
      tipoDeMoeda: usuariosData.associados[1].tipoDeMoeda,
      status: usuariosData.associados[1].status,
      nomeContato: usuariosData.associados[1].nomeContato,
      telefone: usuariosData.associados[1].telefone,
      celular: usuariosData.associados[1].celular,
      emailContato: usuariosData.associados[1].emailContato,
      emailSecundario: usuariosData.associados[1].emailSecundario,
      site: usuariosData.associados[1].site,
      logradouro: usuariosData.associados[1].logradouro,
      numero: usuariosData.associados[1].numero,
      cep: usuariosData.associados[1].cep,
      complemento: usuariosData.associados[1].complemento,
      bairro: usuariosData.associados[1].bairro,
      cidade: usuariosData.associados[1].cidade,
      estado: usuariosData.associados[1].estado,
      regiao: usuariosData.associados[1].regiao,
      aceitaOrcamento: usuariosData.associados[1].aceitaOrcamento,
      aceitaVoucher: usuariosData.associados[1].aceitaVoucher,
      tipoOperacao: usuariosData.associados[1].tipoOperacao,
      bloqueado: usuariosData.associados[1].bloqueado,
      permissoesDoUsuario: usuariosData.associados[1].permissoesDoUsuario,
      usuarioCriadorId: franquiaB.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  associados.push(lucia);
  logger.info(`✅ Associada Lucia criada: ${lucia.email}`);

  const ricardo = await prisma.usuarios.create({
    data: {
      nome: usuariosData.associados[2].nome,
      cpf: usuariosData.associados[2].cpf,
      email: usuariosData.associados[2].email,
      senha: senhasHash.associados.ricardo,
      imagem: usuariosData.associados[2].imagem,
      statusConta: usuariosData.associados[2].statusConta,
      reputacao: usuariosData.associados[2].reputacao,
      razaoSocial: usuariosData.associados[2].razaoSocial,
      nomeFantasia: usuariosData.associados[2].nomeFantasia,
      cnpj: usuariosData.associados[2].cnpj,
      inscEstadual: usuariosData.associados[2].inscEstadual,
      inscMunicipal: usuariosData.associados[2].inscMunicipal,
      mostrarNoSite: usuariosData.associados[2].mostrarNoSite,
      descricao: usuariosData.associados[2].descricao,
      tipo: usuariosData.associados[2].tipo,
      tipoDeMoeda: usuariosData.associados[2].tipoDeMoeda,
      status: usuariosData.associados[2].status,
      nomeContato: usuariosData.associados[2].nomeContato,
      telefone: usuariosData.associados[2].telefone,
      celular: usuariosData.associados[2].celular,
      emailContato: usuariosData.associados[2].emailContato,
      emailSecundario: usuariosData.associados[2].emailSecundario,
      site: usuariosData.associados[2].site,
      logradouro: usuariosData.associados[2].logradouro,
      numero: usuariosData.associados[2].numero,
      cep: usuariosData.associados[2].cep,
      complemento: usuariosData.associados[2].complemento,
      bairro: usuariosData.associados[2].bairro,
      cidade: usuariosData.associados[2].cidade,
      estado: usuariosData.associados[2].estado,
      regiao: usuariosData.associados[2].regiao,
      aceitaOrcamento: usuariosData.associados[2].aceitaOrcamento,
      aceitaVoucher: usuariosData.associados[2].aceitaVoucher,
      tipoOperacao: usuariosData.associados[2].tipoOperacao,
      bloqueado: usuariosData.associados[2].bloqueado,
      permissoesDoUsuario: usuariosData.associados[2].permissoesDoUsuario,
      usuarioCriadorId: gerente.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  associados.push(ricardo);
  logger.info(`✅ Associado Ricardo criado: ${ricardo.email}`);

  // 🎯 CRIAR USUÁRIOS EXTRAS PARA DEMONSTRAR DIFERENTES NÍVEIS DE PERMISSÃO

  // Gerente Regional - Menos permissões que gerente principal
  const gerenteRegional = await prisma.usuarios.create({
    data: {
      nome: "Paula Mendes Regional",
      cpf: "99999999999",
      email: "gerente.regional@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "gerente_regional.png",
      statusConta: true,
      reputacao: 4.5,
      razaoSocial: "PM Gestão Regional LTDA",
      nomeFantasia: "PM Regional",
      cnpj: "99999999000199",
      inscEstadual: "999999999",
      inscMunicipal: "999999999",
      mostrarNoSite: true,
      descricao: "Gestão regional de franquias e associados",
      tipo: "Gerente Regional",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Paula Mendes",
      telefone: "1199998888",
      celular: "11988887777",
      emailContato: "paula@pmregional.com.br",
      emailSecundario: "contato@pmregional.com.br",
      site: "https://www.pmregional.com.br",
      logradouro: "Rua Regional",
      numero: 500,
      cep: "04567890",
      complemento: "Sala 10",
      bairro: "Vila Regional",
      cidade: "São Paulo",
      estado: "SP",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 2,
      taxaComissaoGerente: 12,
      bloqueado: false,
      // 🎯 PERMISSÕES GERENTE REGIONAL: Foco em franquias
      permissoesDoUsuario: JSON.stringify([
        "READ", 
        "WRITE", 
        "MANAGE_FRANCHISES"
      ]),
      usuarioCriadorId: matriz.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Gerente Regional criado: ${gerenteRegional.email}`);

  // Operador - Apenas operações básicas com algumas extras
  const operador = await prisma.usuarios.create({
    data: {
      nome: "José Silva Operador",
      cpf: "12345678901",
      email: "operador@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "operador.png",
      statusConta: true,
      reputacao: 4.2,
      razaoSocial: "JS Operações ME",
      nomeFantasia: "JS Operações",
      cnpj: "12345678000112",
      inscEstadual: "123456789",
      inscMunicipal: "123456789",
      mostrarNoSite: true,
      descricao: "Operações diárias do sistema",
      tipo: "Operador",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "José Silva",
      telefone: "2199998888",
      celular: "21988887777",
      emailContato: "jose@jsoperacoes.com.br",
      logradouro: "Rua das Operações",
      numero: 200,
      cep: "21000000",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
      taxaComissaoGerente: 8,
      bloqueado: false,
      // 🎯 PERMISSÕES OPERADOR: Básicas + transações
      permissoesDoUsuario: JSON.stringify([
        "READ", 
        "WRITE", 
        "TRADE",
        "MANAGE_TRANSACTIONS"
      ]),
      usuarioCriadorId: gerente.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Operador criado: ${operador.email}`);

  // Supervisor de Contas - Foco em gestão de contas
  const supervisorContas = await prisma.usuarios.create({
    data: {
      nome: "Amanda Oliveira Supervisor",
      cpf: "09876543210",
      email: "supervisor.contas@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "supervisor_contas.png",
      statusConta: true,
      reputacao: 4.7,
      razaoSocial: "AO Supervisão LTDA",
      nomeFantasia: "AO Supervisão",
      cnpj: "09876543000109",
      inscEstadual: "098765432",
      inscMunicipal: "098765432",
      mostrarNoSite: true,
      descricao: "Supervisão e gestão de contas corporativas",
      tipo: "Supervisor",
      tipoDeMoeda: "BRL",
      status: true,
      nomeContato: "Amanda Oliveira",
      telefone: "3199998888",
      celular: "31988887777",
      emailContato: "amanda@aosupervisao.com.br",
      emailSecundario: "contato@aosupervisao.com.br",
      site: "https://www.aosupervisao.com.br",
      logradouro: "Avenida da Supervisão",
      numero: 800,
      cep: "30000000",
      complemento: "Sala 15",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      estado: "MG",
      regiao: "Sudeste",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 2,
      taxaComissaoGerente: 15,
      bloqueado: false,
      // 🎯 PERMISSÕES SUPERVISOR: Foco em contas e relatórios
      permissoesDoUsuario: JSON.stringify([
        "READ", 
        "WRITE", 
        "MANAGE_ACCOUNTS",
        "VIEW_REPORTS"
      ]),
      usuarioCriadorId: gerente.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`✅ Supervisor de Contas criado: ${supervisorContas.email}`);

  // Associado Bloqueado - Para testar status
  const associadoBloqueado = await prisma.usuarios.create({
    data: {
      nome: "Roberto Santos Bloqueado",
      cpf: "55544433322",
      email: "associado.bloqueado@example.com",
      senha: await bcrypt.hash("123456", 10),
      imagem: "associado_bloqueado.png",
      statusConta: false, // Conta inativa
      reputacao: 2.1,
      razaoSocial: "RS Bloqueado ME",
      nomeFantasia: "RS Bloqueado",
      cnpj: "55544433000155",
      inscEstadual: "555444333",
      inscMunicipal: "555444333",
      mostrarNoSite: false,
      descricao: "Conta com restrições",
      tipo: "Associado",
      tipoDeMoeda: "BRL",
      status: false,
      nomeContato: "Roberto Santos",
      telefone: "4799998888",
      celular: "47988887777",
      emailContato: "roberto@rsbloqueado.com.br",
      logradouro: "Rua dos Bloqueados",
      numero: 50,
      cep: "88000000",
      bairro: "Periferia",
      cidade: "Florianópolis",
      estado: "SC",
      regiao: "Sul",
      aceitaOrcamento: false,
      aceitaVoucher: false,
      tipoOperacao: 1,
      bloqueado: true, // BLOQUEADO
      restricao: "Inadimplência - Aguardando regularização",
      // 🎯 PERMISSÕES ASSOCIADO BLOQUEADO: Apenas leitura
      permissoesDoUsuario: JSON.stringify([
        "READ"
      ]),
      usuarioCriadorId: franquiaB.idUsuario,
      matrizId: matriz.idUsuario
    }
  });
  logger.info(`⚠️ Associado Bloqueado criado: ${associadoBloqueado.email}`);

  return {
    matriz,
    gerente,
    usuarioComum,
    franquiaA,
    franquiaB,
    associados,
    gerenteRegional,
    operador,
    supervisorContas,
    associadoBloqueado
  };
}

// ===== MATRIZ DE TESTES DE PERMISSÕES =====
/*
🧪 CENÁRIOS DE TESTE PARA O FRONTEND:

👑 MATRIZ (usuario.matriz@example.com):
✅ Vê TODOS os menus
✅ Acesso a PLANOS e CATEGORIAS (exclusivo)
✅ Pode gerenciar tudo

👨‍💼 GERENTE (gerente.conta@example.com):
✅ Vê: AGÊNCIAS, CONTAS, GERENTES, USUÁRIOS
❌ NÃO vê: PLANOS, CATEGORIAS (exclusivo da Matriz)
✅ Pode gerenciar contas e franquias

👩‍💼 GERENTE REGIONAL (gerente.regional@example.com):
✅ Vê: AGÊNCIAS (tem MANAGE_FRANCHISES)
❌ NÃO vê: CONTAS, GERENTES, USUÁRIOS (não tem MANAGE_ACCOUNTS)
❌ NÃO vê: PLANOS, CATEGORIAS (exclusivo da Matriz)

👤 USUÁRIO COMUM (usuario.comum@example.com):
✅ Vê: Menus básicos (INÍCIO, ASSOCIADOS, TRANSAÇÕES, etc.)
❌ NÃO vê: AGÊNCIAS, CONTAS, GERENTES, USUÁRIOS
❌ NÃO vê: PLANOS, CATEGORIAS

🏪 FRANQUIA A (franquia.a@example.com):
✅ Vê: AGÊNCIAS (não é Associado)
✅ Vê: GERENTES (não é Associado)
❌ NÃO vê: PLANOS, CATEGORIAS (exclusivo da Matriz)

👥 ASSOCIADOS (pedro.associado@example.com):
✅ Vê: Menus básicos apenas
❌ NÃO vê: AGÊNCIAS (userType === "Associado")
❌ NÃO vê: GERENTES (userType === "Associado")
❌ NÃO vê: CONTAS, USUÁRIOS (não tem MANAGE_ACCOUNTS)

👨‍💻 OPERADOR (operador@example.com):
✅ Vê: TRANSAÇÕES (tem MANAGE_TRANSACTIONS)
❌ NÃO vê: AGÊNCIAS, CONTAS, GERENTES (não tem permissões)

👩‍💼 SUPERVISOR CONTAS (supervisor.contas@example.com):
✅ Vê: CONTAS (tem MANAGE_ACCOUNTS)
❌ NÃO vê: AGÊNCIAS (não tem MANAGE_FRANCHISES)
✅ Pode ver relatórios (tem VIEW_REPORTS)

🚫 ASSOCIADO BLOQUEADO (associado.bloqueado@example.com):
✅ Vê: Apenas menus básicos com READ
❌ Funcionalidades limitadas por status bloqueado
❌ statusConta = false, bloqueado = true

📊 PERMISSÕES RESUMIDAS:

ADMIN: Matriz
MANAGE_ACCOUNTS: Gerente, Supervisor Contas
MANAGE_FRANCHISES: Gerente, Gerente Regional, Franquias
MANAGE_TRANSACTIONS: Gerente, Operador
READ/WRITE/TRADE: Todos (menos bloqueado)
*/