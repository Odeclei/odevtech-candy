import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const functions = getFunctions(app, "us-central1");

export const focusNFeService = {
    async emitirNFCe(nomeDaLoja, payload) {
        try {
            // console.log("📤 Enviando:", { lojaId: nomeDaLoja, payload });

            const emitirNFCeFn = httpsCallable(functions, "emitirNFCe");

            const result = await emitirNFCeFn({
                lojaId: nomeDaLoja,
                payloadNFCe: payload,
            });

            console.log("✅ Sucesso emitir focusnfeservice:", result.data);
            return result.data;
        } catch (error) {
            console.error("❌ Erro completo:", error);
            throw new Error(error.message || "Falha na emissão");
        }
    },

    async cancelarNFCe(
        nomeDaLoja,
        chave,
        motivo = "Cancelamento por solicitação do cliente",
    ) {
        try {
            const cancelarFn = httpsCallable(functions, "cancelarNFCe");
            const result = await cancelarFn({
                lojaId: nomeDaLoja,
                chave: chave,
                motivo: motivo,
            });
            return result.data;
        } catch (error) {
            console.error("❌ Erro ao cancelar:", error);
            throw new Error(error.message || "Falha no cancelamento");
        }
    },
};
