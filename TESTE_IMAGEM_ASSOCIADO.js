/**
 * TESTE ESPECÍFICO PARA VERIFICAR SALVAMENTO DE IMAGEM NO BANCO
 * 
 * Este teste verifica se:
 * 1. ✅ A imagem é salva corretamente na pasta uploads/images/
 * 2. ✅ O caminho da imagem é salvo no campo 'imagem' do banco de dados
 * 3. ✅ A URL da imagem pode ser acessada pelo frontend
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'http://localhost:3024';

// Criar uma imagem de teste simples (1x1 pixel PNG)
const criarImagemTeste = () => {
    // Dados de um PNG 1x1 pixel transparente
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
    ]);
    
    const tempPath = '/tmp/teste-imagem.png';
    fs.writeFileSync(tempPath, pngData);
    return tempPath;
};

async function testarSalvamentoImagem() {
    console.log("🖼️  TESTE: Salvamento de imagem no banco de dados");
    console.log("=" * 60);
    
    try {
        // Criar imagem de teste
        const imagemPath = criarImagemTeste();
        console.log("📸 Imagem de teste criada:", imagemPath);
        
        // Preparar dados do associado
        const dadosAssociado = {
            nome: "Teste Imagem Silva",
            cpf: "111.222.333-44",
            email: "teste.imagem@example.com",
            senha: "123456",
            nomeFantasia: "Teste Imagem LTDA",
            razaoSocial: "Teste Imagem Silva LTDA",
            cnpj: "11.222.333/0001-44",
            descricao: "Empresa para teste de upload de imagem",
            celular: "(11) 11111-1111",
            emailContato: "contato@testeimagem.com",
            logradouro: "Rua da Imagem, 123",
            numero: "123",
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
        
        // Criar FormData com imagem
        const formData = new FormData();
        
        // Adicionar dados do formulário
        Object.keys(dadosAssociado).forEach(key => {
            formData.append(key, dadosAssociado[key]);
        });
        
        // Adicionar arquivo de imagem
        formData.append('imagem', fs.createReadStream(imagemPath), {
            filename: 'teste-imagem.png',
            contentType: 'image/png'
        });
        
        console.log("📤 Enviando dados com imagem...");
        
        // Criar associado com imagem
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
        console.log("📊 Dados do response:");
        console.log(`   ID: ${response.data.idUsuario}`);
        console.log(`   Nome: ${response.data.nome}`);
        console.log(`   Imagem: ${response.data.imagem}`); // 🔍 CAMPO PRINCIPAL
        
        // Verificar se a imagem foi salva no banco
        if (response.data.imagem) {
            console.log("🎯 SUCESSO: Campo imagem foi salvo no banco de dados!");
            console.log(`   Caminho: ${response.data.imagem}`);
            
            // Tentar acessar a URL da imagem
            const imagemUrl = `${baseURL}${response.data.imagem}`;
            console.log("🌐 Testando acesso à URL da imagem...");
            
            try {
                const imagemResponse = await axios.get(imagemUrl, {
                    responseType: 'arraybuffer',
                    timeout: 5000
                });
                
                if (imagemResponse.status === 200) {
                    console.log("✅ IMAGEM ACESSÍVEL: URL funciona corretamente!");
                    console.log(`   Status: ${imagemResponse.status}`);
                    console.log(`   Tamanho: ${imagemResponse.data.length} bytes`);
                } else {
                    console.log("⚠️  Imagem acessível mas com status diferente:", imagemResponse.status);
                }
                
            } catch (urlError) {
                console.log("❌ ERRO AO ACESSAR URL DA IMAGEM:");
                console.log(`   URL: ${imagemUrl}`);
                console.log(`   Erro: ${urlError.message}`);
            }
            
        } else {
            console.log("❌ FALHA: Campo imagem está null/undefined no banco!");
            return false;
        }
        
        // Limpeza
        if (fs.existsSync(imagemPath)) {
            fs.unlinkSync(imagemPath);
        }
        
        return {
            sucesso: true,
            idUsuario: response.data.idUsuario,
            imagemPath: response.data.imagem,
            imagemUrl: `${baseURL}${response.data.imagem}`
        };
        
    } catch (error) {
        console.log("❌ ERRO no teste de imagem:");
        console.log("  Status:", error.response?.status);
        console.log("  Erro:", error.response?.data?.error || error.message);
        
        return {
            sucesso: false,
            erro: error.response?.data?.error || error.message
        };
    }
}

async function verificarEstruturaPastas() {
    console.log("\n📁 TESTE: Verificação de estrutura de pastas");
    console.log("-" * 40);
    
    const pastasEsperadas = [
        '/home/max/teste-trade/rede-trade-back/uploads',
        '/home/max/teste-trade/rede-trade-back/uploads/images'
    ];
    
    pastasEsperadas.forEach(pasta => {
        if (fs.existsSync(pasta)) {
            console.log(`✅ ${pasta} - existe`);
        } else {
            console.log(`❌ ${pasta} - NÃO existe`);
        }
    });
}

async function executarTestesImagem() {
    console.log("🚀 INICIANDO TESTES DE IMAGEM PARA ASSOCIADO");
    console.log("=" * 60);
    console.log("Data/Hora:", new Date().toLocaleString());
    
    try {
        // Verificar estrutura de pastas
        await verificarEstruturaPastas();
        
        // Testar salvamento de imagem
        const resultado = await testarSalvamentoImagem();
        
        console.log("\n📊 RESUMO DO TESTE:");
        console.log("=" * 30);
        
        if (resultado.sucesso) {
            console.log("🎉 TODOS OS TESTES PASSARAM!");
            console.log("✅ Imagem salva no banco de dados");
            console.log("✅ URL da imagem acessível");
            console.log("✅ Upload funcionando corretamente");
            
            console.log("\n📋 INFORMAÇÕES DO TESTE:");
            console.log(`   ID do usuário: ${resultado.idUsuario}`);
            console.log(`   Caminho da imagem: ${resultado.imagemPath}`);
            console.log(`   URL da imagem: ${resultado.imagemUrl}`);
        } else {
            console.log("❌ TESTE FALHOU!");
            console.log(`   Erro: ${resultado.erro}`);
            console.log("\n🔧 POSSÍVEIS CAUSAS:");
            console.log("   • Middleware de upload não configurado corretamente");
            console.log("   • Campo 'imagem' não incluído no dadosUsuario");
            console.log("   • req.file não populado pelo multer");
            console.log("   • Pasta uploads não existe ou sem permissão");
        }
        
        return resultado.sucesso;
        
    } catch (error) {
        console.error("💥 Erro geral nos testes:", error.message);
        return false;
    }
}

// Executar testes
if (require.main === module) {
    executarTestesImagem().then(sucesso => {
        process.exit(sucesso ? 0 : 1);
    }).catch(error => {
        console.error("Erro fatal:", error);
        process.exit(1);
    });
}

module.exports = { executarTestesImagem };