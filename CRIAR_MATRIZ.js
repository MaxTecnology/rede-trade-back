/**
 * CRIAR APENAS USUÁRIO MATRIZ
 * 
 * Script simples para criar apenas o usuário matriz com saldos zerados.
 * Use após `npm run db:limpo` para ter um banco limpo com apenas a matriz.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Dados essenciais que o sistema precisa para funcionar
const tiposContaEssenciais = [
    { tipoDaConta: "Básica", prefixoConta: "BSC", descricao: "Conta básica para usuários iniciantes", permissoes: JSON.stringify(["READ", "WRITE", "TRADE"]) },
    { tipoDaConta: "Premium", prefixoConta: "PRM", descricao: "Conta premium com recursos avançados", permissoes: JSON.stringify(["READ", "WRITE", "TRADE", "MANAGE_ACCOUNTS", "VIEW_REPORTS"]) },
    { tipoDaConta: "Matriz", prefixoConta: "MTZ", descricao: "Conta matriz com acesso total", permissoes: JSON.stringify(["ALL", "MANAGE_FRANCHISES", "ADMIN_PANEL"]) },
    { tipoDaConta: "Franquia", prefixoConta: "FRQ", descricao: "Conta de franquia com gestão regional", permissoes: JSON.stringify(["READ", "WRITE", "TRADE", "MANAGE_LOCAL_USERS"]) },
    { tipoDaConta: "Associado", prefixoConta: "ASS", descricao: "Conta de associado com recursos básicos", permissoes: JSON.stringify(["READ", "WRITE", "TRADE"]) }
];

const planosEssenciais = [
    { nomePlano: "Plano Básico", tipoDoPlano: "Mensal", imagem: "plano_basico.png", taxaInscricao: 100.0, taxaComissao: 3.0, taxaManutencaoAnual: 360.0 },
    { nomePlano: "Plano Premium", tipoDoPlano: "Mensal", imagem: "plano_premium.png", taxaInscricao: 300.0, taxaComissao: 5.0, taxaManutencaoAnual: 1200.0 },
    { nomePlano: "Plano Matriz", tipoDoPlano: "Anual", imagem: "plano_matriz.png", taxaInscricao: 2000.0, taxaComissao: 10.0, taxaManutencaoAnual: 5000.0 },
    { nomePlano: "Plano Franquia", tipoDoPlano: "Anual", imagem: "plano_franquia.png", taxaInscricao: 1500.0, taxaComissao: 8.0, taxaManutencaoAnual: 3600.0 },
    { nomePlano: "Plano Associado", tipoDoPlano: "Mensal", imagem: "plano_associado.png", taxaInscricao: 50.0, taxaComissao: 2.5, taxaManutencaoAnual: 240.0 }
];

const categoriasEssenciais = [
    { nomeCategoria: "Tecnologia", tipoCategoria: "produto", subcategorias: ["Hardware", "Software", "Desenvolvimento", "Consultoria TI", "Equipamentos de Rede", "Dispositivos Móveis"] },
    { nomeCategoria: "Serviços Empresariais", tipoCategoria: "servico", subcategorias: ["Consultoria", "Marketing Digital", "Recursos Humanos", "Contabilidade", "Jurídico", "Gestão de Projetos"] },
    { nomeCategoria: "Alimentação e Bebidas", tipoCategoria: "produto", subcategorias: ["Restaurantes", "Catering", "Produtos Orgânicos", "Bebidas Especiais", "Confeitaria", "Food Truck"] },
    { nomeCategoria: "Educação e Treinamento", tipoCategoria: "servico", subcategorias: ["Cursos Online", "Treinamento Corporativo", "Workshops", "Mentoria", "Certificações", "Idiomas"] },
    { nomeCategoria: "Saúde e Bem-estar", tipoCategoria: "servico", subcategorias: ["Medicina do Trabalho", "Fisioterapia", "Nutrição", "Psicologia", "Academia", "Spa Corporativo"] }
];

async function criarMatriz() {
    console.log('👑 Criando usuário matriz...');
    
    const senhaHash = await bcrypt.hash('123456', 10);
    
    const matriz = await prisma.usuarios.create({
        data: {
            nome: "Administrador Matriz",
            cpf: "111.111.111-11",
            email: "usuario.matriz@example.com",
            senha: senhaHash,
            statusConta: true,
            reputacao: 5.0,
            razaoSocial: "Matriz Corporação LTDA",
            nomeFantasia: "Matriz Corp",
            cnpj: "11.111.111/0001-11",
            inscEstadual: "111.111.111",
            inscMunicipal: "111.111.111",
            mostrarNoSite: true,
            descricao: "Administração central do sistema",
            tipo: "Matriz",
            tipoDeMoeda: "BRL",
            status: true,
            nomeContato: "Admin Matriz",
            telefone: "(11) 3333-4444",
            celular: "(11) 99999-8888",
            emailContato: "contato@matrizcorp.com.br",
            emailSecundario: "admin@matrizcorp.com.br",
            site: "https://www.matrizcorp.com.br",
            logradouro: "Avenida Paulista",
            numero: 1000,
            cep: "01310-000",
            complemento: "Conjunto 101",
            bairro: "Bela Vista",
            cidade: "São Paulo",
            estado: "SP",
            regiao: "Sudeste",
            aceitaOrcamento: true,
            aceitaVoucher: true,
            tipoOperacao: 3, // Compra e venda
            taxaComissaoGerente: 25,
            bloqueado: false,
            permissoesDoUsuario: JSON.stringify(["READ", "WRITE", "DELETE", "MANAGE_FRANCHISES", "MANAGE_USERS", "MANAGE_CREDITS", "ADMIN_PANEL", "FINANCIAL_REPORTS"])
        }
    });
    
    console.log(`✅ Matriz criada: ${matriz.email} (ID: ${matriz.idUsuario})`);
    return matriz;
}

async function criarContaMatriz(matriz) {
    console.log('💳 Criando conta matriz...');
    
    // Buscar tipo de conta Matriz
    const tipoMatriz = await prisma.tipoConta.findFirst({
        where: { tipoDaConta: 'Matriz' }
    });
    
    // Buscar plano matriz
    const plano = await prisma.plano.findFirst({
        where: { nomePlano: 'Plano Matriz' }
    });
    
    const conta = await prisma.conta.create({
        data: {
            numeroConta: "MTZ000001",
            usuarioId: matriz.idUsuario,
            tipoContaId: tipoMatriz?.idTipoConta,
            planoId: plano?.idPlano,
            saldoDinheiro: 0,        // 🎯 ZERADO PARA TESTES
            saldoPermuta: 0,         // 🎯 ZERADO PARA TESTES
            limiteCredito: 1000000,
            limiteUtilizado: 0,
            limiteDisponivel: 1000000,
            limiteVendaMensal: 1000000,
            limiteVendaTotal: 1000000,
            limiteVendaEmpresa: 1000000,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            taxaRepasseMatriz: 0,
            diaFechamentoFatura: 1,
            dataVencimentoFatura: 1,
            nomeFranquia: "Matriz Principal",
            dataDeAfiliacao: new Date(),
            permissoesEspecificas: JSON.stringify(["FULL_MANAGEMENT", "FINANCIAL_CONTROL", "USER_MANAGEMENT", "SYSTEM_CONFIG"])
        }
    });
    
    console.log(`✅ Conta criada: ${conta.numeroConta}`);
    return conta;
}

async function criarDadosEssenciais() {
    console.log('🔧 Criando dados essenciais do sistema...');
    
    // Criar tipos de conta
    for (const tipo of tiposContaEssenciais) {
        const existe = await prisma.tipoConta.findFirst({
            where: { tipoDaConta: tipo.tipoDaConta }
        });
        if (!existe) {
            await prisma.tipoConta.create({ data: tipo });
            console.log(`   ✅ Tipo: ${tipo.tipoDaConta}`);
        }
    }
    
    // Criar planos
    for (const plano of planosEssenciais) {
        const existe = await prisma.plano.findFirst({
            where: { nomePlano: plano.nomePlano }
        });
        if (!existe) {
            await prisma.plano.create({ data: plano });
            console.log(`   ✅ Plano: ${plano.nomePlano}`);
        }
    }
    
    // Criar categorias
    for (const catData of categoriasEssenciais) {
        const existe = await prisma.categoria.findFirst({
            where: { nomeCategoria: catData.nomeCategoria }
        });
        
        let categoria;
        if (!existe) {
            categoria = await prisma.categoria.create({
                data: {
                    nomeCategoria: catData.nomeCategoria,
                    tipoCategoria: catData.tipoCategoria
                }
            });
            console.log(`   ✅ Categoria: ${categoria.nomeCategoria}`);
        } else {
            categoria = existe;
        }
        
        // Criar subcategorias
        for (const subNome of catData.subcategorias) {
            const subExiste = await prisma.subcategoria.findFirst({
                where: { 
                    nomeSubcategoria: subNome,
                    categoriaId: categoria.idCategoria 
                }
            });
            if (!subExiste) {
                await prisma.subcategoria.create({
                    data: {
                        nomeSubcategoria: subNome,
                        categoriaId: categoria.idCategoria
                    }
                });
            }
        }
    }
}

async function main() {
    console.log('🏗️  CRIANDO SISTEMA COMPLETO PARA PRODUÇÃO');
    console.log('='.repeat(50));
    console.log('Data/Hora:', new Date().toLocaleString());
    
    try {
        // Verificar se matriz já existe
        const matrizExistente = await prisma.usuarios.findUnique({
            where: { email: 'usuario.matriz@example.com' }
        });
        
        if (matrizExistente) {
            console.log('✅ Matriz já existe!');
            console.log('📊 Dados existentes:');
            console.log(`   Email: ${matrizExistente.email}`);
            console.log(`   Nome: ${matrizExistente.nome}`);
            console.log(`   ID: ${matrizExistente.idUsuario}`);
            
            const contaExistente = await prisma.conta.findFirst({
                where: { usuarioId: matrizExistente.idUsuario }
            });
            
            if (contaExistente) {
                console.log(`   Conta: ${contaExistente.numeroConta}`);
                console.log(`   Saldos: R$ ${contaExistente.saldoDinheiro || 0} | RT$ ${contaExistente.saldoPermuta || 0}`);
            }
            
            console.log('\n🎉 Sistema já configurado!');
            return;
        }
        
        const usuariosExistentes = await prisma.usuarios.count();
        if (usuariosExistentes > 0) {
            console.log(`⚠️  ATENÇÃO: Já existem ${usuariosExistentes} outros usuários no banco!`);
            console.log('💡 Para banco limpo, execute primeiro: npm run db:limpo');
        }
        
        // 1. Criar dados essenciais do sistema
        await criarDadosEssenciais();
        console.log('');
        
        // 2. Criar matriz
        const matriz = await criarMatriz();
        const conta = await criarContaMatriz(matriz);
        
        // Verificar resultado final
        const stats = {
            usuarios: await prisma.usuarios.count(),
            contas: await prisma.conta.count(),
            tiposConta: await prisma.tipoConta.count(),
            planos: await prisma.plano.count(),
            categorias: await prisma.categoria.count(),
            subcategorias: await prisma.subcategoria.count()
        };
        
        console.log('\n🎉 SISTEMA PRONTO PARA PRODUÇÃO!');
        console.log('📊 Estatísticas do banco:');
        console.log(`   Usuários: ${stats.usuarios}`);
        console.log(`   Contas: ${stats.contas}`);
        console.log(`   Tipos de Conta: ${stats.tiposConta}`);
        console.log(`   Planos: ${stats.planos}`);
        console.log(`   Categorias: ${stats.categorias}`);
        console.log(`   Subcategorias: ${stats.subcategorias}`);
        console.log('');
        console.log('=== DADOS DE ACESSO ===');
        console.log('👑 MATRIZ:');
        console.log('   Email: usuario.matriz@example.com');
        console.log('   Senha: 123456');
        console.log('   Conta: MTZ000001');
        console.log('   Saldos: R$ 0,00 | RT$ 0');
        console.log('');
        console.log('✅ Usuários podem agora se cadastrar normalmente! 🚀');
        
    } catch (error) {
        console.error('💥 Erro:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);