// src/utils/validators.js

/**
 * Validadores centralizados para o projeto
 * Reutilizar em todo o código para consistência
 */

// ==========================================
// VALIDAÇÃO DE TELEFONE
// ==========================================
export const validarTelefone = (telefone) => {
    if (!telefone) return false;
    const clean = telefone.replace(/\D/g, "");

    // Aceita números brasileiros com 11 dígitos
    return (
        clean.length === 11 || (clean.length === 12 && clean.startsWith("55"))
    );
};

export const formatarTelefone = (telefone, incluirCodigo = false) => {
    if (!telefone) return "";

    let clean = telefone.replace(/\D/g, "");

    if (incluirCodigo && !clean.startsWith("55")) {
        clean = `55${clean}`;
    }

    return clean;
};

export const formatarTelefoneDisplay = (telefone) => {
    const clean = telefone.replace(/\D/g, "");

    if (clean.length === 11) {
        // (XX) 9XXXX-XXXX
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }

    return telefone;
};

// ==========================================
// VALIDAÇÃO DE CPF
// ==========================================
export const validarCPF = (cpf) => {
    if (!cpf) return false;

    const clean = cpf.replace(/\D/g, "");

    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false; // Todos os dígitos iguais

    let soma = 0;
    let resto;

    // Primeira verificação
    for (let i = 1; i <= 9; i++) {
        soma += parseInt(clean.substring(i - 1, i)) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(clean.substring(9, 10))) return false;

    // Segunda verificação
    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(clean.substring(i - 1, i)) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;

    return resto === parseInt(clean.substring(10, 11));
};

export const formatarCPF = (cpf) => {
    if (!cpf) return "";
    const clean = cpf.replace(/\D/g, "");
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

// ==========================================
// VALIDAÇÃO DE CNPJ
// ==========================================
export const validarCNPJ = (cnpj) => {
    if (!cnpj) return false;

    const clean = cnpj.replace(/\D/g, "");

    if (clean.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(clean)) return false; // Todos os dígitos iguais

    let tamanho = clean.length - 2;
    let numeros = clean.substring(0, tamanho);
    let digitos = clean.substring(tamanho);
    let soma = 0;
    let posicao = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * posicao--;
        if (posicao < 2) posicao = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);

    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = clean.substring(0, tamanho);
    soma = 0;
    posicao = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * posicao--;
        if (posicao < 2) posicao = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);

    return resultado === parseInt(digitos.charAt(1));
};

export const formatarCNPJ = (cnpj) => {
    if (!cnpj) return "";
    const clean = cnpj.replace(/\D/g, "");
    return clean.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
    );
};

// ==========================================
// VALIDAÇÃO DE EMAIL
// ==========================================
export const validarEmail = (email) => {
    if (!email) return false;

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const normalizarEmail = (email) => {
    return email.toLowerCase().trim();
};

// ==========================================
// VALIDAÇÃO DE CHAVE PIX
// ==========================================
export const validarChavePix = (chave) => {
    if (!chave) return false;

    chave = String(chave).trim();

    // Email
    if (chave.includes("@")) {
        return validarEmail(chave);
    }

    // UUID (Chave aleatória)
    if (chave.length === 36 && chave.includes("-")) {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(chave);
    }

    // CPF ou Telefone
    const clean = chave.replace(/\D/g, "");

    if (clean.length === 11) {
        // Pode ser CPF ou telefone
        return validarCPF(chave) || validarTelefone(chave);
    }

    if (clean.length === 14) {
        return validarCNPJ(chave);
    }

    return false;
};

// ==========================================
// VALIDAÇÃO DE ARQUIVO
// ==========================================
export const validarImagem = (file, options = {}) => {
    const {
        maxSizeMB = 5,
        allowedTypes = ["image/jpeg", "image/png", "image/webp"],
    } = options;

    const erros = [];

    if (!file) {
        erros.push("Arquivo não selecionado");
        return { valido: false, erros };
    }

    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
        erros.push(
            `Tipo de arquivo não permitido. Aceitos: ${allowedTypes.join(", ")}`,
        );
    }

    // Validar tamanho
    if (file.size > maxSizeMB * 1024 * 1024) {
        erros.push(`Arquivo deve ter no máximo ${maxSizeMB}MB`);
    }

    return {
        valido: erros.length === 0,
        erros,
    };
};

// ==========================================
// VALIDAÇÃO DE DATA
// ==========================================
export const validarData = (data) => {
    if (!data) return false;

    const d = new Date(data);
    return d instanceof Date && !isNaN(d);
};

export const validarDataNoFuturo = (data) => {
    if (!validarData(data)) return false;

    const d = new Date(data);
    return d > new Date();
};

export const validarDataNoPassado = (data) => {
    if (!validarData(data)) return false;

    const d = new Date(data);
    return d < new Date();
};

// ==========================================
// VALIDAÇÃO DE TEXTO
// ==========================================
export const validarTexto = (texto, opcoes = {}) => {
    const { minLength = 1, maxLength = 255, permitirEspecial = true } = opcoes;

    if (!texto) return false;

    const trim = texto.trim();

    if (trim.length < minLength || trim.length > maxLength) {
        return false;
    }

    if (!permitirEspecial) {
        // Apenas letras, números e espaços
        return /^[a-zA-Z0-9\s]+$/.test(trim);
    }

    return true;
};

export const sanitizarTexto = (texto) => {
    if (!texto) return "";

    return texto
        .trim()
        .replace(/[<>]/g, "") // Remove < e >
        .substring(0, 255); // Limita a 255 caracteres
};

// ==========================================
// VALIDAÇÃO DE NÚMEROS
// ==========================================
export const validarNumero = (valor, opcoes = {}) => {
    const { min = 0, max = Infinity, inteiro = false } = opcoes;

    const num = parseFloat(valor);

    if (isNaN(num)) return false;
    if (inteiro && !Number.isInteger(num)) return false;
    if (num < min || num > max) return false;

    return true;
};

// ==========================================
// VALIDAÇÃO DE PEDIDO
// ==========================================
export const validarPedido = (pedido) => {
    const erros = [];

    if (!pedido.cliente?.trim()) {
        erros.push("Nome do cliente é obrigatório");
    } else if (pedido.cliente.length > 100) {
        erros.push("Nome do cliente muito longo (máx 100 caracteres)");
    }

    if (!pedido.telefone?.trim()) {
        erros.push("Telefone é obrigatório");
    } else if (!validarTelefone(pedido.telefone)) {
        erros.push("Telefone inválido");
    }

    if (!pedido.itens || pedido.itens.length === 0) {
        erros.push("Carrinho vazio");
    }

    if (pedido.dataEntrega) {
        if (!validarData(pedido.dataEntrega)) {
            erros.push("Data inválida");
        } else if (!validarDataNoFuturo(pedido.dataEntrega)) {
            erros.push("Data deve ser no futuro");
        }
    }

    return {
        valido: erros.length === 0,
        erros,
    };
};

// ==========================================
// VALIDAÇÃO DE CONFIGURAÇÃO DE LOJA
// ==========================================
export const validarConfigLoja = (config) => {
    const erros = [];

    if (!config.nomeExibicao?.trim()) {
        erros.push("Nome da loja é obrigatório");
    }

    if (config.chavePix && !validarChavePix(config.chavePix)) {
        erros.push("Chave PIX inválida");
    }

    if (config.whatsapp && !validarTelefone(config.whatsapp)) {
        erros.push("Telefone do WhatsApp inválido");
    }

    return {
        valido: erros.length === 0,
        erros,
    };
};
