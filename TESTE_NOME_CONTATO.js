/**
 * TESTE ESPECÍFICO PARA VERIFICAR SALVAMENTO DO CAMPO nomeContato
 * 
 * Este teste verifica se o campo nomeContato está sendo salvo corretamente
 * no banco de dados durante a criação de associados.
 */

const axios = require('axios');
const FormData = require('form-data');

const baseURL = 'http://localhost:3024';

async function testarNomeContato() {
    console.log("📋 TESTE: Campo nomeContato no cadastro de associado");
    console.log("=" * 60);
    
    try {
        const dadosAssociado = {
            nome: "João Silva",
            cpf: "555.666.777-88",
            email: "joao.nomecontato@example.com",
            senha: "123456",
            nomeFantasia: "João Empresas LTDA",
            razaoSocial: "João Silva Empresas LTDA",
            cnpj: "55.666.777/0001-88",
            descricao: "Empresa para teste do campo nomeContato",
            
            // 🎯 CAMPO PRINCIPAL DO TESTE
            nomeContato: "João Silva Contato", // Campo que deve ser salvo
            
            telefone: "(11) 5555-5555",
            celular: "(11) 99999-9999",
            emailContato: "contato@joaotest.com",
            logradouro: "Rua do Teste Nome, 456",
            numero: "456",
            cep: "12345-678",
            bairro: "Centro",
            cidade: "São Paulo",
            estado: "SP",
            tipoOperacao: "1",
            aceitaOrcamento: "true",
            aceitaVoucher: "true",
            mostrarNoSite: "true",
            status: "true",
            tipo: "Associado"
        };
        
        console.log("📤 Dados que serão enviados:");
        console.log(`   Nome: "${dadosAssociado.nome}"`);
        console.log(`   🎯 Nome Contato: "${dadosAssociado.nomeContato}" <- CAMPO TESTE`);
        console.log(`   Email: "${dadosAssociado.email}"`);
        
        // Criar FormData
        const formData = new FormData();
        Object.keys(dadosAssociado).forEach(key => {
            formData.append(key, dadosAssociado[key]);
        });
        
        console.log("\n📤 Enviando requisição...");
        
        const response = await axios.post(
            `${baseURL}/usuarios/criar-usuario`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer token-teste`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        
        console.log("✅ Associado criado com sucesso!");
        console.log("📊 Resposta do servidor:");
        console.log(`   ID: ${response.data.idUsuario}`);
        console.log(`   Nome: ${response.data.nome}`);
        console.log(`   🔍 Nome Contato: "${response.data.nomeContato}"`);
        
        // Verificação principal
        if (response.data.nomeContato === dadosAssociado.nomeContato) {
            console.log("🎉 SUCESSO: Campo nomeContato foi salvo corretamente!");
            return {
                sucesso: true,
                nomeContatoSalvo: response.data.nomeContato,
                nomeContatoEsperado: dadosAssociado.nomeContato
            };
        } else {
            console.log("❌ FALHA: Campo nomeContato não foi salvo corretamente!");
            console.log(`   Esperado: "${dadosAssociado.nomeContato}"`);
            console.log(`   Recebido: "${response.data.nomeContato}"`);
            return {
                sucesso: false,
                nomeContatoSalvo: response.data.nomeContato,
                nomeContatoEsperado: dadosAssociado.nomeContato
            };
        }
        
    } catch (error) {
        console.log("❌ ERRO na criação do associado:");
        console.log("  Status:", error.response?.status);
        console.log("  Erro:", error.response?.data?.error || error.message);
        
        return {
            sucesso: false,
            erro: error.response?.data?.error || error.message
        };
    }
}

async function verificarCampoNoBanco() {
    console.log("\n🗄️  TESTE: Verificar se campo existe na estrutura do banco");
    console.log("-" * 50);
    
    try {
        // Fazer uma consulta para verificar estrutura
        const response = await axios.get(`${baseURL}/usuarios/listar-usuarios?page=1&pageSize=1`, {
            headers: {
                'Authorization': `Bearer token-teste`
            }
        });
        
        if (response.data && response.data.data && response.data.data.length > 0) {
            const usuario = response.data.data[0];
            const temCampoNomeContato = 'nomeContato' in usuario;
            
            console.log("✅ Conseguiu buscar usuários do banco");
            console.log(`🔍 Campo 'nomeContato' existe na resposta: ${temCampoNomeContato ? '✅ Sim' : '❌ Não'}`);
            
            if (temCampoNomeContato) {
                console.log(`   Valor exemplo: "${usuario.nomeContato}"`);
            }
            
            return temCampoNomeContato;
        } else {
            console.log("⚠️  Nenhum usuário encontrado para verificação");
            return false;
        }
        
    } catch (error) {
        console.log("❌ Erro ao verificar banco:");
        console.log("  Status:", error.response?.status);
        console.log("  Erro:", error.response?.data?.error || error.message);
        return false;
    }
}

async function executarTestes() {
    console.log("🚀 TESTE COMPLETO: Campo nomeContato");
    console.log("=" * 60);
    console.log("Data/Hora:", new Date().toLocaleString());
    
    try {
        // Teste 1: Verificar estrutura do banco
        const campoExiste = await verificarCampoNoBanco();
        
        // Teste 2: Criar associado e verificar campo
        const resultado = await testarNomeContato();
        
        console.log("\n📊 RESUMO DOS TESTES:");
        console.log("=" * 30);
        console.log(`Campo existe no banco: ${campoExiste ? '✅ Sim' : '❌ Não'}`);
        console.log(`Salvamento do campo: ${resultado.sucesso ? '✅ Funcionando' : '❌ Falhando'}`);
        
        if (resultado.sucesso) {
            console.log("\n🎉 PROBLEMA RESOLVIDO!");
            console.log("✅ Campo nomeContato está sendo salvo corretamente");
            console.log(`✅ Valor salvo: "${resultado.nomeContatoSalvo}"`);
        } else {
            console.log("\n❌ PROBLEMA PERSISTE!");
            if (resultado.erro) {
                console.log(`❌ Erro: ${resultado.erro}`);
            } else {
                console.log("❌ Campo não está sendo salvo corretamente");
                console.log("🔧 Possíveis causas:");
                console.log("   • Campo não incluído no schema de validação");
                console.log("   • Campo não nos defaultValues do formulário");
                console.log("   • Problema na extração do req.body no backend");
                console.log("   • Campo não incluído no dadosUsuario");
            }
        }
        
        return resultado.sucesso;
        
    } catch (error) {
        console.error("💥 Erro geral nos testes:", error.message);
        return false;
    }
}

// Executar teste
if (require.main === module) {
    executarTestes().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    }).catch(error => {
        console.error("Erro fatal:", error);
        process.exit(1);
    });
}

module.exports = { executarTestes };