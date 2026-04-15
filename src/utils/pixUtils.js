// src/utils/pixUtils.js

// 1. Função de Validação (CRC16)
function crc16(data) {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
            else crc <<= 1;
        }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

// 2. Filtro para remover acentos, caracteres especiais e deixar tudo maiúsculo
const limparTexto = (str) => {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .toUpperCase();
};

export const gerarPixCopiaECola = (chaveOrig, nomeOrig, cidadeOrig, valor) => {
    let chave = String(chaveOrig).trim();

    // 3. Tratamento Inteligente da Chave Pix
    if (chave.includes("@")) {
        // É EMAIL: Apenas remove espaços vazios acidentais, mantém os pontos
        chave = chave.replace(/\s/g, "");
    } else if (chave.length === 36 && chave.includes("-")) {
        // É CHAVE ALEATÓRIA (UUID): Apenas remove espaços vazios
        chave = chave.replace(/\s/g, "");
    } else {
        // É CPF, CNPJ ou TELEMÓVEL: Remove tudo que não for número ou sinal de '+'
        chave = chave.replace(/[^\d+]/g, "");

        // Se a chave for telefone mas a pessoa não colocou o +55, e tiver exatamente 11 números,
        // nós não forçamos o +55 porque pode ser um CPF. A instrução correta é a loja cadastrar o telefone com +55.
    }

    // 4. Limpeza e limite de caracteres do Nome e Cidade
    const nome =
        limparTexto(nomeOrig || "Confeitaria")
            .substring(0, 25)
            .trim() || "CONFEITARIA";
    const cidade =
        limparTexto(cidadeOrig || "Cidade")
            .substring(0, 15)
            .trim() || "CIDADE";

    // Função auxiliar de montagem dos blocos EMV
    const formatar = (id, valorStr) => {
        const tam = String(valorStr.length).padStart(2, "0");
        return `${id}${tam}${valorStr}`;
    };

    const payloadInfo =
        formatar("00", "br.gov.bcb.pix") + formatar("01", chave);

    // 5. Montagem Final
    const payload = [
        formatar("00", "01"), // Payload Format Indicator
        formatar("26", payloadInfo), // Merchant Account Info
        formatar("52", "0000"), // Merchant Category Code
        formatar("53", "986"), // Currency (BRL)
        formatar("54", valor.toFixed(2)), // Valor (com 2 casas decimais)
        formatar("58", "BR"), // Country
        formatar("59", nome), // Nome da Loja
        formatar("60", cidade), // Cidade da Loja
        formatar("62", formatar("05", "***")), // TXID
        "6304", // CRC Indicator
    ].join("");

    return payload + crc16(payload);
};
