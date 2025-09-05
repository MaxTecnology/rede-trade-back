/**
 * TESTE PARA VERIFICAR A CORREÇÃO DO PROBLEMA DE CRIAÇÃO DE ASSOCIADO
 * 
 * Este teste verifica se o campo "nome" agora está sendo processado corretamente
 * após a correção da ordem dos middlewares.
 */

const axios = require('axios');
const FormData = require('form-data');

const baseURL = 'http://localhost:3024';

// Dados de teste para criação de associado
const dadosAssociado = {
    nome: "Enéas Max Teste",
    cpf: "123.456.789-00",
    email: "eneas.teste.correcao@example.com",
    senha: "123456",
    nomeFantasia: "Enéas Teste LTDA",
    razaoSocial: "Enéas Max Teste LTDA",
    cnpj: "12.345.678/0001-90",
    descricao: "Empresa de teste para verificar correção do bug de FormData",
    celular: "(11) 99999-9999",
    emailContato: "contato@eneasteste.com",
    logradouro: "Rua de Teste, 123",
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

async function testarCriacaoAssociado() {
    console.log("🧪 TESTE DE CORREÇÃO: Criação de Associado");
    console.log("=" * 50);
    
    try {
        // Criar FormData como no frontend
        const formData = new FormData();
        
        console.log("📋 Dados que serão enviados:");
        Object.keys(dadosAssociado).forEach(key => {
            const valor = dadosAssociado[key];
            console.log(`  ${key}: "${valor}"`);
            formData.append(key, valor);
        });
        
        console.log("\n📤 Enviando requisição para criar associado...");
        
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
        
        console.log("✅ SUCESSO! Associado criado com sucesso!");
        console.log("📊 Resposta do servidor:");
        console.log("  ID:", response.data.idUsuario);
        console.log("  Nome:", response.data.nome);
        console.log("  Email:", response.data.email);
        console.log("  Tipo:", response.data.tipo);
        
        return {
            sucesso: true,
            dados: response.data,
            erro: null
        };
        
    } catch (error) {
        console.log("❌ ERRO na criação do associado:");
        console.log("  Status:", error.response?.status);
        console.log("  Erro:", error.response?.data?.error || error.message);
        
        // Verificar se ainda é o erro do campo nome
        const erroNome = error.response?.data?.error?.includes("Nome") || 
                         error.response?.data?.error?.includes("nome");
        
        if (erroNome) {
            console.log("🚨 PROBLEMA PERSISTENTE: O erro do campo 'nome' ainda existe!");
        }
        
        return {
            sucesso: false,
            dados: null,
            erro: {
                status: error.response?.status,
                message: error.response?.data?.error || error.message,
                isNomeError: erroNome
            }
        };
    }
}

async function testarValidacaoEspecifica() {
    console.log("\n🔍 TESTE ESPECÍFICO: Verificar se validação está funcionando");
    console.log("=" * 60);
    
    try {
        // Enviar dados inválidos propositalmente para testar validação
        const formData = new FormData();
        formData.append('nome', ''); // Nome vazio para forçar erro
        formData.append('cpf', '123');
        formData.append('email', 'email-invalido');
        formData.append('senha', '123');
        
        console.log("📤 Enviando dados inválidos para testar validação...");
        
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
        
        console.log("⚠️  INESPERADO: Validação não rejeitou dados inválidos!");
        return false;
        
    } catch (error) {
        console.log("✅ VALIDAÇÃO FUNCIONANDO:");
        console.log("  Status:", error.response?.status);
        console.log("  Erro:", error.response?.data?.error);
        console.log("  Campo:", error.response?.data?.field);
        
        // Verificar se a validação está detectando corretamente
        const isValidationError = error.response?.status === 400;
        const hasErrorMessage = !!error.response?.data?.error;
        
        if (isValidationError && hasErrorMessage) {
            console.log("🎯 CONFIRMADO: Validação está ativa e funcionando!");
            return true;
        } else {
            console.log("❓ VALIDAÇÃO FUNCIONANDO PARCIALMENTE");
            return false;
        }
    }
}

async function executarTestes() {
    console.log("🚀 INICIANDO TESTE DE CORREÇÃO DE ASSOCIADO");
    console.log("=" * 60);
    console.log("Data/Hora:", new Date().toLocaleString());
    
    try {
        // Teste 1: Verificar se validação está funcionando
        const validacaoOk = await testarValidacaoEspecifica();
        
        // Teste 2: Tentar criar associado com dados válidos
        const resultado = await testarCriacaoAssociado();
        
        console.log("\n📊 RESUMO DOS TESTES:");
        console.log("=" * 30);
        console.log(`Validação funcionando: ${validacaoOk ? '✅ Sim' : '❌ Não'}`);
        console.log(`Criação de associado: ${resultado.sucesso ? '✅ Sucesso' : '❌ Falhou'}`);
        
        if (resultado.sucesso) {
            console.log("\n🎉 CORREÇÃO CONFIRMADA!");
            console.log("✅ O problema do campo 'nome' foi corrigido");
            console.log("✅ FormData está sendo processado corretamente");
            console.log("✅ Validação está funcionando após parse do FormData");
        } else {
            console.log("\n⚠️  CORREÇÃO INCOMPLETA");
            if (resultado.erro?.isNomeError) {
                console.log("❌ O erro do campo 'nome' ainda persiste");
                console.log("🔧 Necessária investigação adicional");
            } else {
                console.log("❓ Erro diferente - pode ser configuração ou dados");
            }
        }
        
        return resultado;
        
    } catch (error) {
        console.error("💥 Erro geral nos testes:", error.message);
        return null;
    }
}

// Executar os testes
if (require.main === module) {
    executarTestes().catch(console.error);
}

module.exports = {
    testarCriacaoAssociado,
    testarValidacaoEspecifica,
    executarTestes
};