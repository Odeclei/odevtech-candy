import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const functions = getFunctions(app, "us-central1");

export const focusNFeService = {
    async emitirNFCe(nomeDaLoja, payload) {
        try {
            console.log("📤 Enviando:", { lojaId: nomeDaLoja, payload });

            const emitirNFCeFn = httpsCallable(functions, "emitirNFCe");

            const result = await emitirNFCeFn({
                lojaId: nomeDaLoja,
                payloadNFCe: payload,
            });

            console.log("✅ Sucesso:", result.data);
            return result.data;
        } catch (error) {
            console.error("❌ Erro completo:", error);
            throw new Error(error.message || "Falha na emissão");
        }
    },
};
// src/services/focusNFeService.js
// import { doc, getDoc } from "firebase/firestore";
// import { db } from "../firebase";

// export const focusNFeService = {
//     async emitirNFCe(nomeDaLoja, payload) {
//         try {
//             console.log("📤 Enviando payload para Cloud Function:", payload);

//             const response = await fetch(
//                 "https://us-central1-odevtech-doceapp.cloudfunctions.net/emitirNFCe",
//                 {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({
//                         lojaId: nomeDaLoja,
//                         payloadNFCe: payload,
//                     }),
//                 },
//             );

//             const data = await response.json();
//             console.log("📥 Resposta da Cloud Function:", data);

//             if (!response.ok) {
//                 throw new Error(
//                     data.message || data.error || "Erro ao emitir NFC-e",
//                 );
//             }

//             return data;
//         } catch (error) {
//             console.error("❌ Erro completo na emissão:", error);
//             throw new Error(
//                 error.message || "Falha na comunicação com a Focus NFe.",
//             );
//         }
//     },
// };
// // src/services/focusNFeService.js
// import { doc, getDoc } from "firebase/firestore";
// import { db } from "../firebase";

// const FOCUS_BASE_URL = "https://api.focusnfe.com.br";

// export const focusNFeService = {
//     // Busca configuração da loja (tokens + ambiente)
//     async getConfig(nomeDaLoja) {
//         const lojaRef = doc(db, "lojas", nomeDaLoja);
//         const snap = await getDoc(lojaRef);
//         if (!snap.exists()) throw new Error("Loja não encontrada");

//         const data = snap.data();
//         const ambiente = data.focusAmbiente || "homologacao";
//         const token =
//             ambiente === "producao"
//                 ? data.focusTokenProducao
//                 : data.focusTokenHomologacao;

//         if (!token) throw new Error(`Token de ${ambiente} não configurado`);

//         return {
//             token,
//             ambiente,
//             baseUrl:
//                 ambiente === "producao"
//                     ? FOCUS_BASE_URL
//                     : `${FOCUS_BASE_URL}/v2`,
//         };
//     },

//     // Emite NFC-e (principal para delivery/confeitaria)
//     async emitirNFCe(nomeDaLoja, payload) {
//         const { token, baseUrl } = await this.getConfig(nomeDaLoja);

//         const response = await fetch(`${baseUrl}/nfc-e?token=${token}`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(payload),
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             console.error("Erro Focus NFe:", data);
//             throw new Error(data.erro || data.message || "Erro na emissão");
//         }

//         return data;
//     },

//     // Consulta status da nota
//     async consultarNFCe(nomeDaLoja, uuid) {
//         const { token, baseUrl } = await this.getConfig(nomeDaLoja);
//         const res = await fetch(`${baseUrl}/nfc-e/${uuid}?token=${token}`, {
//             method: "GET",
//         });
//         return res.json();
//     },

//     // Cancela nota
//     async cancelarNFCe(nomeDaLoja, uuid, motivo) {
//         const { token, baseUrl } = await this.getConfig(nomeDaLoja);
//         const res = await fetch(
//             `${baseUrl}/nfc-e/${uuid}/cancelar?token=${token}`,
//             {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ motivo }),
//             },
//         );
//         return res.json();
//     },
// };
