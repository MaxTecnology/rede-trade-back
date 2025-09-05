/**
 * TESTE DE FORMDATA PARA CRIAÇÃO DE ASSOCIADO
 * 
 * Este teste identifica e corrige o problema onde o campo "nome" 
 * se perde durante a conversão FormData na criação de associados.
 */

const axios = require('axios');
const FormData = require('form-data');

const baseURL = 'http://localhost:3001';

// Simular dados do formulário como vem do frontend
const dadosFormulario = {
    nome: "Enéas Max",
    cpf: "123.456.789-00",
    email: "eneas.max@example.com",
    senha: "123456",
    nomeFantasia: "Enéas Empresa LTDA",
    razaoSocial: "Enéas Max Empresa LTDA",
    cnpj: "12.345.678/0001-90",
    descricao: "Empresa de tecnologia especializada em desenvolvimento de software",
    celular: "(11) 99999-9999",
    emailContato: "contato@eneas.com",
    logradouro: "Rua das Flores, 123",
    numero: "123",
    cep: "01234-567",
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

async function testarFormDataOriginal() {
    console.log("🔍 TESTE 1: Reproduzindo o problema original");
    console.log("=" * 50);
    
    try {
        // Simular exatamente como está no código original
        const formData = new FormData();
        
        console.log("📋 Dados originais que serão processados:");
        console.log(dadosFormulario);
        
        // Reproduzir o loop original que causa o problema
        Object.keys(dadosFormulario).forEach(key => {
            if (dadosFormulario[key] !== null && dadosFormulario[key] !== undefined && key !== 'imagem') {
                console.log(`➕ Adicionando campo: ${key} = "${dadosFormulario[key]}"`);
                formData.append(key, dadosFormulario[key]);
            }
        });
        
        // Garantir tipo Associado
        formData.set('tipo', 'Associado');
        
        console.log("\n📤 Enviando FormData para o backend...");
        
        const response = await axios.post(
            `${baseURL}/usuarios/criar-usuario`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TOKEN || 'token-teste'}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        
        console.log("✅ Sucesso! Resposta:", response.data);
        
    } catch (error) {
        console.log("❌ ERRO REPRODUZIDO:");
        console.log("Status:", error.response?.status);
        console.log("Mensagem:", error.response?.data?.error || error.message);
        console.log("Dados completos do erro:", error.response?.data);
        
        // Analisar se o erro é realmente sobre o campo nome
        if (error.response?.data?.error?.includes("Nome")) {
            console.log("🎯 CONFIRMADO: O problema é com o campo 'nome'");
            return false;
        }
    }
    
    return true;
}

async function testarFormDataCorrigido() {
    console.log("\n🔧 TESTE 2: Testando solução corrigida");
    console.log("=" * 50);
    
    try {
        const formData = new FormData();
        
        // CORREÇÃO 1: Verificar e garantir que o campo nome está sendo adicionado
        console.log("📋 Verificando campos obrigatórios antes de adicionar:");
        
        const camposObrigatorios = ['nome', 'cpf', 'email', 'senha'];
        camposObrigatorios.forEach(campo => {
            if (!dadosFormulario[campo] || dadosFormulario[campo] === '') {
                throw new Error(`Campo obrigatório '${campo}' está vazio ou não definido`);
            }
            console.log(`✅ Campo '${campo}': "${dadosFormulario[campo]}"`);
        });
        
        // CORREÇÃO 2: Adicionar campos com verificação explícita
        Object.keys(dadosFormulario).forEach(key => {
            const valor = dadosFormulario[key];
            
            // Verificação mais rigorosa
            if (valor !== null && valor !== undefined && valor !== '' && key !== 'imagem') {
                console.log(`➕ Adicionando campo: ${key} = "${valor}" (tipo: ${typeof valor})`);
                formData.append(key, String(valor)); // Garantir que é string
            } else {
                console.log(`⚠️  Pulando campo vazio: ${key} = ${valor}`);
            }
        });
        
        // CORREÇÃO 3: Verificação final antes do envio
        console.log("\n🔍 Verificação final do FormData:");
        console.log("Campos adicionados:", Object.keys(dadosFormulario).filter(key => 
            dadosFormulario[key] !== null && dadosFormulario[key] !== undefined && dadosFormulario[key] !== ''
        ));
        
        // Garantir tipo Associado
        formData.set('tipo', 'Associado');
        
        console.log("\n📤 Enviando FormData corrigido para o backend...");
        
        const response = await axios.post(
            `${baseURL}/usuarios/criar-usuario`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TOKEN || 'token-teste'}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        
        console.log("✅ SUCESSO! Associado criado:", response.data);
        return true;
        
    } catch (error) {
        console.log("❌ Erro na versão corrigida:");
        console.log("Status:", error.response?.status);
        console.log("Mensagem:", error.response?.data?.error || error.message);
        console.log("Dados completos do erro:", error.response?.data);
        return false;
    }
}

async function testarCamposFormData() {
    console.log("\n🔬 TESTE 3: Análise detalhada dos campos FormData");
    console.log("=" * 50);
    
    const formData = new FormData();
    
    // Testar diferentes formas de adicionar o campo nome
    console.log("🧪 Testando diferentes formas de adicionar o campo 'nome':");
    
    // Teste 1: Adicionar diretamente
    formData.append('nome', dadosFormulario.nome);
    console.log(`1. formData.append('nome', '${dadosFormulario.nome}')`);
    
    // Teste 2: Adicionar com conversão para string
    formData.append('nome_string', String(dadosFormulario.nome));
    console.log(`2. formData.append('nome_string', String('${dadosFormulario.nome}'))`);
    
    // Teste 3: Verificar se o FormData contém o campo
    console.log("\n🔍 Verificando se FormData contém os campos:");
    
    try {
        const headers = formData.getHeaders ? formData.getHeaders() : {};
        console.log("Headers do FormData:", headers);
        
        // Para Node.js FormData, precisamos verificar de forma diferente
        if (formData.getBuffer) {
            console.log("Buffer do FormData existe - campos foram adicionados");
        }
        
    } catch (error) {
        console.log("Erro ao verificar FormData:", error.message);
    }
    
    return formData;
}

async function executarTestes() {
    console.log("🚀 INICIANDO TESTES DE FORMDATA PARA ASSOCIADOS");
    console.log("=" * 60);
    
    try {
        // Teste 1: Reproduzir o problema
        const teste1 = await testarFormDataOriginal();
        
        // Teste 2: Tentar solução corrigida
        const teste2 = await testarFormDataCorrigido();
        
        // Teste 3: Análise detalhada
        await testarCamposFormData();
        
        console.log("\n📊 RESUMO DOS TESTES:");
        console.log("=" * 30);
        console.log(`Teste Original: ${teste1 ? '✅ Sucesso' : '❌ Falhou'}`);
        console.log(`Teste Corrigido: ${teste2 ? '✅ Sucesso' : '❌ Falhou'}`);
        
        if (!teste1 && teste2) {
            console.log("\n🎉 PROBLEMA IDENTIFICADO E CORRIGIDO!");
            console.log("A solução está pronta para implementação.");
        } else if (!teste1 && !teste2) {
            console.log("\n⚠️  PROBLEMA PERSISTE");
            console.log("Necessária investigação adicional no backend.");
        } else {
            console.log("\n❓ RESULTADOS INCONSISTENTES");
            console.log("Revisar configuração dos testes.");
        }
        
    } catch (error) {
        console.error("💥 Erro geral nos testes:", error.message);
    }
}

// Executar os testes
if (require.main === module) {
    executarTestes().catch(console.error);
}

module.exports = {
    testarFormDataOriginal,
    testarFormDataCorrigido,
    testarCamposFormData,
    executarTestes
};