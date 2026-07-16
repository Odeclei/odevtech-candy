const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

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
        const ambiente = lojaData.ambiente || "homologacao";
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

        // 5. Clonar payload e adicionar campos obrigatórios da loja
        const payloadFinal = { ...payloadNFCe };
        payloadFinal.cnpj_emitente = cnpjEmitente;
        payloadFinal.modalidade_frete = "9"; // Sem frete

        // ⚠️ NÃO MODIFICAR OS ITENS – o frontend já envia a estrutura correta
        // Apenas validar se items é um array (opcional)
        if (!payloadFinal.items || !Array.isArray(payloadFinal.items)) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Payload não contém a lista de itens.",
            );
        }

        // 6. Gerar referência única
        const refUnica = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // 7. Montar URL e cabeçalhos
        const url = `${baseUrl}/nfce?ref=${refUnica}&completa=1`;
        const auth = Buffer.from(`${token}:`).toString("base64");

        console.log("🚀 Enviando para Focus:", { url, payload: payloadFinal });
        console.log("### payload stringfyed ###");
        console.log(JSON.stringify(payloadFinal, null, 2));

        // 8. Enviar para a Focus
        const resposta = await axios.post(url, payloadFinal, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        // 9. Sucesso
        console.log("✅ NFC-e emitida com sucesso:", resposta.data);
        return {
            sucesso: true,
            referencia: refUnica,
            dadosFocus: resposta.data,
        };
    } catch (error) {
        console.error("❌ ERRO COMPLETO:", error);
        if (error.response) {
            const erroFocus = error.response.data;
            console.error(
                "❌ ERRO FOCUS (status:",
                error.response.status,
                "):",
                erroFocus,
            );
            throw new functions.https.HttpsError(
                "invalid-argument",
                erroFocus.mensagem || "Erro na emissão da NFC-e",
            );
        } else {
            console.error("❌ ERRO NA REQUISIÇÃO:", error.message);
            throw new functions.https.HttpsError(
                "internal",
                "Falha ao comunicar com a Focus NFe: " + error.message,
            );
        }
    }
});

// Adicione esta função no seu index.js
exports.cancelarNFCe = functions.https.onCall(async (data, context) => {
    const { lojaId, chave, motivo } = data.data || {};

    if (!lojaId || !chave) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "lojaId e chave são obrigatórios.",
        );
    }

    try {
        // Buscar token e ambiente da loja (igual à emissão)
        const lojaDoc = await admin
            .firestore()
            .collection("lojas")
            .doc(lojaId)
            .get();

        if (!lojaDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Loja não encontrada.",
            );
        }

        const lojaData = lojaDoc.data();
        const ambiente = lojaData.ambiente || "homologacao";
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
                "Token não configurado.",
            );
        }

        const url = `${baseUrl}/nfce/${chave}/cancelar`;
        const auth = Buffer.from(`${token}:`).toString("base64");

        const resposta = await axios.post(
            url,
            { motivo: motivo || "Cancelamento por solicitação do cliente" },
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            },
        );

        // Remover os dados da nota do pedido após o cancelamento
        // (opcional: atualizar o pedido no Firestore)
        return {
            sucesso: true,
            dadosFocus: resposta.data,
        };
    } catch (error) {
        console.error("❌ ERRO NO CANCELAMENTO:", error);
        if (error.response) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                error.response.data.mensagem || "Erro ao cancelar",
            );
        }
        throw new functions.https.HttpsError(
            "internal",
            "Falha ao cancelar: " + error.message,
        );
    }
});
