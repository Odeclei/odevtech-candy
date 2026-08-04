import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const functions = getFunctions(app, "us-central1");

export const focusNFeService = {
  // ==========================================
  // EMITIR NFC-e (MODELO 65)
  // ==========================================
  async emitirNFCe(nomeDaLoja, payload) {
    try {
      const emitirNFCeFn = httpsCallable(functions, "emitirNFCe");
      const result = await emitirNFCeFn({
        lojaId: nomeDaLoja,
        payloadNFCe: payload,
      });
      return result.data;
    } catch (error) {
      console.error("❌ Erro ao emitir NFCe:", error);
      throw new Error(error.message || "Falha na emissão da NFC-e");
    }
  },

  // ==========================================
  // CANCELAR NFC-e
  // ==========================================
  async cancelarNFCe(
    nomeDaLoja,
    referencia,
    motivo = "Cancelamento por solicitação do cliente",
  ) {
    try {
      const cancelarFn = httpsCallable(functions, "cancelarNFCe");
      const result = await cancelarFn({
        lojaId: nomeDaLoja,
        referencia: referencia,
        motivo: motivo,
      });
      return result.data;
    } catch (error) {
      console.error("❌ Erro ao cancelar NFCe:", error);
      throw new Error(error.message || "Falha no cancelamento");
    }
  },

  // ==========================================
  // EMITIR NF-e (MODELO 55)
  // ==========================================
  async emitirNFe(nomeDaLoja, payload) {
    try {
      const emitirNFeFn = httpsCallable(functions, "emitirNFe");
      const result = await emitirNFeFn({
        lojaId: nomeDaLoja,
        payloadNFe: payload,
      });
      return result.data;
    } catch (error) {
      console.error("❌ Erro ao emitir NFe:", error);
      throw new Error(error.message || "Falha na emissão da NFe");
    }
  },

  // ==========================================
  // CONSULTAR NF-e (para fallback)
  // ==========================================
  async consultarNFe(nomeDaLoja, chave) {
    try {
      const consultarFn = httpsCallable(functions, "consultarNFe");
      const result = await consultarFn({
        lojaId: nomeDaLoja,
        chave: chave,
      });
      return result.data;
    } catch (error) {
      console.error("❌ Erro ao consultar NFe:", error);
      throw new Error(error.message || "Falha na consulta da NFe");
    }
  },
};
