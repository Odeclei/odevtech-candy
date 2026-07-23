const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// ==========================================
// EMITIR NFC-e (MODELO 65)
// ==========================================
exports.emitirNFCe = functions.https.onCall(async (data, context) => {
    // 1. Extrair dados do envelope da chamada
    const { lojaId, payloadNFCe } = data.data || {};

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
        const getBrasiliaISOString = () => {
            const now = new Date();
            const brasiliaTime = new Date(
                now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
            );
            return brasiliaTime.toISOString().replace("Z", "-03:00");
        };

        payloadFinal.data_emissao = getBrasiliaISOString();
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

        // console.log("🚀 Enviando para Focus:", { url, payload: payloadFinal });
        // console.log("### payload stringfyed ###");
        // console.log(JSON.stringify(payloadFinal, null, 2));

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
// ==========================================
// CANCELAR NFC-e (DELETE /nfce/{chave})
// ==========================================
exports.cancelarNFCe = functions.https.onCall(async (data, context) => {
    const { lojaId, referencia, motivo } = data.data || {};

    if (!lojaId || !referencia) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "lojaId e referencia (chave ou ref) são obrigatórios.",
        );
    }

    const justificativa = motivo || "Cancelamento por solicitação do cliente";
    if (justificativa.length < 15 || justificativa.length > 255) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "A justificativa deve ter entre 15 e 255 caracteres.",
        );
    }

    try {
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
        const ambiente = lojaData.focusAmbiente || "homologacao";
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

        const url = `${baseUrl}/nfce/${referencia}`;
        const auth = Buffer.from(`${token}:`).toString("base64");

        const resposta = await axios.delete(url, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            data: { justificativa },
            timeout: 30000,
        });

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

// exports.cancelarNFCe = functions.https.onCall(async (data, context) => {
//   const { lojaId, chave, motivo } = data.data || {};

//   if (!lojaId || !chave) {
//     throw new functions.https.HttpsError(
//       "invalid-argument",
//       "lojaId e chave são obrigatórios.",
//     );
//   }

//   // Valida a justificativa (15 a 255 caracteres)
//   const justificativa = motivo || "Cancelamento por solicitação do cliente";
//   if (justificativa.length < 15 || justificativa.length > 255) {
//     throw new functions.https.HttpsError(
//       "invalid-argument",
//       "A justificativa deve ter entre 15 e 255 caracteres.",
//     );
//   }

//   try {
//     // Buscar token e ambiente da loja
//     const lojaDoc = await admin
//       .firestore()
//       .collection("lojas")
//       .doc(lojaId)
//       .get();

//     if (!lojaDoc.exists) {
//       throw new functions.https.HttpsError("not-found", "Loja não encontrada.");
//     }

//     const lojaData = lojaDoc.data();
//     const ambiente = lojaData.ambiente || "homologacao";
//     const baseUrl =
//       ambiente === "producao"
//         ? "https://api.focusnfe.com.br/v2"
//         : "https://homologacao.focusnfe.com.br/v2";

//     const token =
//       ambiente === "producao"
//         ? lojaData.focusTokenProducao
//         : lojaData.focusTokenHomologacao;

//     if (!token) {
//       throw new functions.https.HttpsError(
//         "failed-precondition",
//         "Token não configurado.",
//       );
//     }

//     // URL correta: DELETE /nfce/{chave}
//     const url = `${baseUrl}/nfce/${chave}`;
//     const auth = Buffer.from(`${token}:`).toString("base64");

//     const resposta = await axios.delete(url, {
//       headers: {
//         Authorization: `Basic ${auth}`,
//         "Content-Type": "application/json",
//       },
//       data: { justificativa }, // corpo da requisição
//       timeout: 30000,
//     });

//     return {
//       sucesso: true,
//       dadosFocus: resposta.data,
//     };
//   } catch (error) {
//     console.error("❌ ERRO NO CANCELAMENTO:", error);
//     if (error.response) {
//       throw new functions.https.HttpsError(
//         "invalid-argument",
//         error.response.data.mensagem || "Erro ao cancelar",
//       );
//     }
//     throw new functions.https.HttpsError(
//       "internal",
//       "Falha ao cancelar: " + error.message,
//     );
//   }
// });

// ==========================================
// EMITIR NF-e (MODELO 55)
// ==========================================
exports.emitirNFe = functions.https.onCall(async (data, context) => {
    const { lojaId, payloadNFe } = data.data || {};

    if (!lojaId || !payloadNFe) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "lojaId e payloadNFe são obrigatórios.",
        );
    }

    try {
        // Buscar dados da loja
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

        // Ambiente e token
        const ambiente = lojaData.focusAmbiente || "homologacao";
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
                `Token não configurado para ambiente ${ambiente}.`,
            );
        }

        // Dados do emitente (complementar com os da loja)
        const emitente = {
            cnpj_emitente: lojaData.cnpj?.replace(/\D/g, ""),
            nome_emitente:
                lojaData.razaoSocial || "Razão Social não cadastrada",
            nome_fantasia_emitente: lojaData.nomeExibicao || "",
            logradouro_emitente: lojaData.logradouro || "",
            numero_emitente: lojaData.numero || "",
            bairro_emitente: lojaData.bairro || "",
            municipio_emitente: lojaData.cidade || "",
            uf_emitente: lojaData.estado || "",
            cep_emitente: lojaData.cep?.replace(/\D/g, "") || "",
            inscricao_estadual_emitente: lojaData.ie || "ISENTO",
            regime_tributario_emitente:
                parseInt(lojaData.regimeTributario) || 1,
        };

        // Mesclar payload com emitente
        const payloadFinal = { ...payloadNFe, ...emitente };

        // Gerar referência única
        const refUnica = `NFE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const url = `${baseUrl}/nfe?ref=${refUnica}`;
        const auth = Buffer.from(`${token}:`).toString("base64");
        const getBrasiliaISOString = () => {
            const now = new Date();
            const brasiliaTime = new Date(
                now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
            );
            return brasiliaTime.toISOString().replace("Z", "-03:00");
        };

        payloadFinal.data_emissao = getBrasiliaISOString();
        console.log("###");
        console.log("🚀 Emitindo NFe:", url);
        console.log(
            "📦 Payload NFe final:",
            JSON.stringify(payloadFinal, null, 2),
        );
        console.log("###");
        console.log("###");

        const resposta = await axios.post(url, payloadFinal, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        // Resposta 201 = autorizada (síncrona), 202 = processando (assíncrona)
        const status =
            resposta.status === 201 ? "autorizado" : "processando_autorizacao";
        return {
            sucesso: true,
            status,
            referencia: refUnica,
            dadosFocus: resposta.data,
        };
    } catch (error) {
        console.error("❌ ERRO emitirNFe:", error);
        if (error.response) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                error.response.data.mensagem || "Erro na emissão da NFe",
            );
        }
        throw new functions.https.HttpsError(
            "internal",
            "Falha ao emitir NFe: " + error.message,
        );
    }
});

// ==========================================
// CONSULTAR NF-e (para polling ou verificação)
// ==========================================
exports.consultarNFe = functions.https.onCall(async (data, context) => {
    const { lojaId, chave } = data.data || {};
    if (!lojaId || !chave) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "lojaId e chave são obrigatórios.",
        );
    }

    try {
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

        const ambiente = lojaData.focusAmbiente || "homologacao";
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

        const url = `${baseUrl}/nfe/${chave}`;
        const auth = Buffer.from(`${token}:`).toString("base64");

        const resposta = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        return {
            sucesso: true,
            dadosFocus: resposta.data,
        };
    } catch (error) {
        console.error("❌ ERRO consultarNFe:", error);
        if (error.response) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                error.response.data.mensagem || "Erro ao consultar NFe",
            );
        }
        throw new functions.https.HttpsError(
            "internal",
            "Falha ao consultar NFe: " + error.message,
        );
    }
});

// ==========================================
// CRIAR WEBHOOK PARA NF-e (assíncrono)
// ==========================================
exports.criarWebhookNFe = functions.https.onCall(async (data, context) => {
    const {
        lojaId,
        urlWebhook,
        event = "nfe",
        authorization,
        authorization_header,
    } = data.data || {};

    if (!lojaId || !urlWebhook) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "lojaId e urlWebhook são obrigatórios.",
        );
    }

    try {
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

        const ambiente = lojaData.focusAmbiente || "homologacao";
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

        const cnpj = lojaData.cnpj?.replace(/\D/g, "");
        if (!cnpj) {
            throw new functions.https.HttpsError(
                "failed-precondition",
                "CNPJ da loja não configurado.",
            );
        }

        const payload = {
            cnpj,
            event,
            url: urlWebhook,
        };
        if (authorization) payload.authorization = authorization;
        if (authorization_header)
            payload.authorization_header = authorization_header;

        const auth = Buffer.from(`${token}:`).toString("base64");
        const resposta = await axios.post(`${baseUrl}/hooks`, payload, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            timeout: 30000,
        });

        return {
            sucesso: true,
            webhook: resposta.data,
        };
    } catch (error) {
        console.error("❌ ERRO criarWebhookNFe:", error);
        if (error.response) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                error.response.data.mensagem || "Erro ao criar webhook",
            );
        }
        throw new functions.https.HttpsError(
            "internal",
            "Falha ao criar webhook: " + error.message,
        );
    }
});

exports.webhookReceiver = functions.https.onRequest(async (req, res) => {
    console.log("📩 Webhook recebido:", {
        method: req.method,
        headers: req.headers,
        body: req.body,
    });

    if (req.method !== "POST") {
        return res.status(405).send("Método não permitido");
    }

    try {
        const data = req.body;
        const chave = data.chave_nfe;
        const status = data.status;
        const ref = data.ref;

        if (!chave) {
            console.warn("⚠️ Webhook sem chave_nfe.");
            return res.status(200).send("OK");
        }

        const pedidosRef = admin.firestore().collection("pedidos");
        console.log(`🔍 Buscando pedido com chave: "${chave}"`);

        let querySnapshot = await pedidosRef
            .where("nfeChave", "==", chave)
            .get();

        // Fallback: buscar por ref (se a chave não foi salva ainda)
        if (querySnapshot.empty && ref) {
            console.log(`🔍 Fallback: buscando por ref: "${ref}"`);
            querySnapshot = await pedidosRef.where("nfeRef", "==", ref).get();
        }
        const getBrasiliaISOString = () => {
            const now = new Date();
            const brasiliaTime = new Date(
                now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
            );
            return brasiliaTime.toISOString().replace("Z", "-03:00");
        };

        if (!querySnapshot.empty) {
            const pedidoDoc = querySnapshot.docs[0];
            const updateData = {
                nfeStatus: status,
                nfeDanfe: data.caminho_danfe || null,
                nfeXml: data.caminho_xml_nota_fiscal || null,
                nfeAtualizadaEm: getBrasiliaISOString(),
                nfEmitida: status === "autorizado",
                caminhoPdf: data.caminho_danfe || null, // compatibilidade com frontend
            };

            // Se o pedido ainda não tem a chave salva, preenche agora
            if (!pedidoDoc.data().nfeChave) {
                updateData.nfeChave = chave;
            }

            console.log(`📝 Atualizando pedido ${pedidoDoc.id}:`, updateData);
            await pedidoDoc.ref.update(updateData);
            console.log(
                `✅ Pedido ${pedidoDoc.id} atualizado com status ${status}`,
            );
        } else {
            console.warn(
                `⚠️ Pedido não encontrado (ref: ${ref}, chave: ${chave})`,
            );
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("❌ Erro ao processar webhook:", error);
        res.status(500).send("Erro interno");
    }
});
