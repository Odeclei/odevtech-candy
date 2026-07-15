const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
// Opcional: para gerar ref único, instale: npm install uuid
// const { v4: uuidv4 } = require("uuid");

admin.initializeApp();

exports.emitirNFCe = functions.https.onCall(async (data, context) => {
    // 1. Extrair dados do envelope da chamada
    const { lojaId, payloadNFCe } = data.data || {};

    console.log("🔑 lojaId:", lojaId);
    console.log("📦 payloadNFCe:", payloadNFCe);

    // 2. Validações
    if (!lojaId || typeof lojaId !== "string" || lojaId.trim() === "") {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "lojaId não informado ou inválido.",
        );
    }
    if (!payloadNFCe || typeof payloadNFCe !== "object") {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Payload não informado ou inválido.",
        );
    }

    try {
        // 3. Buscar documento da loja no Firestore
        const lojaDoc = await admin
            .firestore()
            .collection("lojas")
            .doc(lojaId)
            .get();
        if (!lojaDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                `Loja ${lojaId} não encontrada.`,
            );
        }

        const lojaData = lojaDoc.data();

        // 4. Definir ambiente (homologação ou produção)
        const ambiente = lojaData.ambiente || "homologacao"; // padrão homologação
        const baseUrl =
            ambiente === "producao"
                ? "https://api.focusnfe.com.br/v2"
                : "https://homologacao.focusnfe.com.br/v2";

        const token =
            ambiente === "producao"
                ? lojaData.focusTokenProducao
                : lojaData.focusTokenHomologacao;

        if (!token) {
            throw new functions.https.HttpsError(
                "failed-precondition",
                `Token da Focus NFe não configurado para o ambiente ${ambiente}.`,
            );
        }

        const cnpjEmitente = lojaData.cnpj;
        if (!cnpjEmitente) {
            throw new functions.https.HttpsError(
                "failed-precondition",
                "CNPJ da loja não configurado.",
            );
        }

        // 5. Complementar o payload com campos obrigatórios e corrigir situação tributária
        // Clonar o payload para não modificar o original
        const payloadFinal = { ...payloadNFCe };

        // Adicionar campos obrigatórios
        payloadFinal.cnpj_emitente = cnpjEmitente;
        payloadFinal.modalidade_frete = "9"; // 9 = Sem frete (ajuste conforme necessidade)

        // Processar os itens: corrigir icms_situacao_tributaria -> csosn
        if (payloadFinal.items && Array.isArray(payloadFinal.items)) {
            payloadFinal.items = payloadFinal.items.map((item) => {
                // Se tiver icms_situacao_tributaria, converte para csosn
                let csosn = "102"; // valor padrão para Simples Nacional com crédito
                if (item.icms_situacao_tributaria) {
                    // Remove zeros à esquerda e usa como csosn (ex: "0102" -> "102")
                    csosn = item.icms_situacao_tributaria.replace(/^0+/, "");
                    // Se ficar vazio, volta para padrão
                    if (!csosn) csosn = "102";
                }
                // Remove o campo antigo para não gerar conflito
                const newItem = { ...item };
                delete newItem.icms_situacao_tributaria;
                // Adiciona csosn
                newItem.csosn = csosn;
                return newItem;
            });
        }

        // 6. Gerar referência única (ref)
        const refUnica = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        // Se preferir usar uuid:
        // const refUnica = `PED-${uuidv4()}`;

        // 7. Montar URL e cabeçalhos
        const url = `${baseUrl}/nfce?ref=${refUnica}&completa=1`;
        const auth = Buffer.from(`${token}:`).toString("base64");

        console.log("🚀 Enviando para Focus:", {
            url,
            payload: payloadFinal,
        });

        // 8. Fazer a requisição para a Focus
        const resposta = await axios.post(url, payloadFinal, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        // 9. Retornar sucesso
        console.log("✅ NFC-e emitida com sucesso:", resposta.data);
        return {
            sucesso: true,
            referencia: refUnica,
            dadosFocus: resposta.data,
        };
    } catch (error) {
        // 10. Tratamento de erros
        console.error("❌ ERRO COMPLETO:", error);
        if (error.response) {
            // A Focus respondeu com status de erro
            const erroFocus = error.response.data;
            console.error(
                "❌ ERRO FOCUS (status:",
                error.response.status,
                "):",
                erroFocus,
            );
            // Lança um erro específico com a mensagem da Focus
            throw new functions.https.HttpsError(
                "invalid-argument",
                erroFocus.mensagem || "Erro na emissão da NFC-e",
            );
        } else {
            // Erro de rede ou outro
            console.error("❌ ERRO NA REQUISIÇÃO:", error.message);
            throw new functions.https.HttpsError(
                "internal",
                "Falha ao comunicar com a Focus NFe: " + error.message,
            );
        }
    }
});

// const functions = require("firebase-functions");
// const admin = require("firebase-admin");
// const axios = require("axios");

// admin.initializeApp();

// exports.emitirNFCe = functions.https.onCall(async (data, context) => {
//     const { lojaId, payloadNFCe } = data.data; // ← CORREÇÃO AQUI

//     console.log("🔑 lojaId:", lojaId);
//     console.log("📦 payloadNFCe:", payloadNFCe);

//     console.log("🔍 Tipo de data:", typeof data);
//     console.log("🔍 Chaves de data:", Object.keys(data));

//     // const lojaId = data.data.lojaId;
//     // const payloadNFCe = data.payloadNFCe || data.payload;

//     if (!lojaId || typeof lojaId !== "string" || lojaId.trim() === "") {
//         throw new functions.https.HttpsError(
//             "invalid-argument",
//             "lojaId não informado ou inválido.",
//         );
//     }

//     if (!payloadNFCe || typeof payloadNFCe !== "object") {
//         throw new functions.https.HttpsError(
//             "invalid-argument",
//             "Payload não informado ou inválido.",
//         );
//     }

//     try {
//         const lojaDoc = await admin
//             .firestore()
//             .collection("lojas")
//             .doc(lojaId)
//             .get();

//         if (!lojaDoc.exists) {
//             throw new functions.https.HttpsError(
//                 "not-found",
//                 `Loja ${lojaId} não encontrada.`,
//             );
//         }

//         const lojaData = lojaDoc.data();
//         const token = lojaData.focusTokenHomologacao;

//         if (!token) {
//             throw new functions.https.HttpsError(
//                 "failed-precondition",
//                 "Token da Focus NFe não configurado.",
//             );
//         }

//         const baseUrl = "https://homologacao.focusnfe.com.br/v2";
//         const refUnica = `PED-${Date.now()}`;

//         const resposta = await axios.post(
//             `${baseUrl}/nfce?ref=${refUnica}&completa=1`,
//             payloadNFCe,
//             {
//                 headers: {
//                     Authorization: `Basic ${Buffer.from(token + ":").toString("base64")}`,
//                     "Content-Type": "application/json",
//                 },
//                 timeout: 30000,
//             },
//         );

//         return {
//             sucesso: true,
//             referencia: refUnica,
//             dadosFocus: resposta.data,
//         };
//     } catch (error) {
//         const mensagem =
//             error.response?.data?.mensagem ||
//             error.message ||
//             "Erro desconhecido";
//         console.error("❌ ERRO FOCUS:", error.response?.data || error);
//         throw new functions.https.HttpsError("internal", mensagem);
//     }
// });
