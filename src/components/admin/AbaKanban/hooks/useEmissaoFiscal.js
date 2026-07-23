// src/components/admin/AbaKanban/hooks/useEmissaoFiscal.js

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { focusNFeService } from "../../../../services/focusNFeService";
import {
  gerarPayloadNFCe,
  gerarPayloadNFe,
} from "../../../../utils/fiscalUtils";
import { getFunctions, httpsCallable } from "firebase/functions";

export const useEmissaoFiscal = (
  nomeDaLoja,
  configLoja,
  onPedidoAtualizado,
) => {
  const [modalNfOpen, setModalNfOpen] = useState(false);
  const [pedidoNfAlvo, setPedidoNfAlvo] = useState(null);
  const [formNf, setFormNf] = useState({
    tipoNota: "NFCe",
    cpf: "",
    nome: "",
    email: "",
    ie: "",
    indicadorIE: 9,
    logradouro: "",
    numero: "",
    bairro: "",
    municipio: "",
    uf: "",
    cep: "",
    telefone: "",
  });
  const [emitindoNf, setEmitindoNf] = useState(false);
  const [itensEditados, setItensEditados] = useState([]);

  const garantirWebhook = async (loja) => {
    try {
      const functions = getFunctions();
      const criarWebhook = httpsCallable(functions, "criarWebhookNFe");
      const result = await criarWebhook({
        lojaId: loja,
        urlWebhook:
          "https://us-central1-odevtech-doceapp.cloudfunctions.net/webhookReceiver",
        event: "nfe",
      });
      return result.data.webhook;
    } catch (error) {
      if (error.message?.includes("Já existe um gatilho")) return true;
      return null;
    }
  };

  const abrirModalEmissao = (pedido, clientesCadastrados) => {
    const cliente = clientesCadastrados?.find(
      (c) => c.documento === pedido.cpf || c.nome === pedido.cliente,
    );
    setPedidoNfAlvo(pedido);
    setFormNf({
      tipoNota: "NFCe",
      cpf: pedido.cpf || "",
      nome: pedido.cliente || "",
      email: "",
      ie: cliente?.inscricaoEstadual || "",
      indicadorIE: cliente?.tipo === "PJ" ? 1 : 9,
      logradouro: cliente?.endereco?.logradouro || "",
      numero: cliente?.endereco?.numero || "",
      bairro: cliente?.endereco?.bairro || "",
      municipio: cliente?.endereco?.cidade || "",
      uf: cliente?.endereco?.estado || "",
      cep: cliente?.endereco?.cep || "",
      telefone: cliente?.telefone || "",
    });
    const itensIniciais = (pedido.itens || []).map((item) => ({
      id: item.id || `item-${Math.random()}`,
      numero_item: item.numero_item || 1,
      codigo_produto: item.id,
      descricao: item.nome,
      quantidade: item.quantidade || item.qtd_total || 1,
      valor_unitario: item.preco || 0,
      csosn: item.csosn || "102",
      cfop: item.cfop || "5102",
      pisCst: item.pisCst || "49",
      cofinsCst: item.cofinsCst || "49",
    }));
    setItensEditados(itensIniciais);
    setModalNfOpen(true);
  };

  const confirmarEmissaoNf = async (e) => {
    e.preventDefault();
    if (!pedidoNfAlvo) return;
    setEmitindoNf(true);
    try {
      const pedidoRef = doc(db, "pedidos", pedidoNfAlvo.id);

      if (formNf.tipoNota === "NFCe") {
        // NFC-e
        const payload = gerarPayloadNFCe(
          pedidoNfAlvo,
          configLoja,
          formNf.cpf,
          configLoja?.mensagemComplementar,
        );
        const resultado = await focusNFeService.emitirNFCe(nomeDaLoja, payload);
        const dados = resultado.dadosFocus || {};
        const chave = dados.chave_nfe || dados.chave || null;
        const ref = resultado.referencia || dados.ref || null;

        await updateDoc(pedidoRef, {
          nfEmitida: true,
          statusNFCe: dados.status || "processando",
          numeroNota: dados.numero || null,
          nfceRef: ref,
          nfceChave: chave || null,
          nfceDanfe: dados.caminho_danfe || null,
          nfceXml: dados.caminho_xml_nota_fiscal || null,
          nfceEmitidaEm: new Date().toISOString(),
          nfceCanceladaEm: null,
          caminhoPdf: dados.caminho_danfe || null,
          caminhoXml: dados.caminho_xml_nota_fiscal || null,
        });
        if (chave && resultado.status === "autorizado") {
          await updateDoc(pedidoRef, { statusNFCe: "autorizado" });
        }
        if (dados.caminho_danfe) {
          const url = dados.caminho_danfe.startsWith("http")
            ? dados.caminho_danfe
            : `https://api.focusnfe.com.br${dados.caminho_danfe}`;
          window.open(url, "_blank");
        }
        setModalNfOpen(false);
        onPedidoAtualizado?.();
        return;
      }

      // NF-e
      const webhook = await garantirWebhook(nomeDaLoja);
      if (!webhook) console.warn("Webhook não configurado.");

      const dadosDestinatario = { ...formNf };
      const mapaItens = {};
      itensEditados.forEach((item) => (mapaItens[item.codigo_produto] = item));
      const itensParaPayload = pedidoNfAlvo.itens.map((itemOriginal) => {
        const editado = mapaItens[itemOriginal.id];
        return editado
          ? {
              ...itemOriginal,
              csosn: editado.csosn,
              cfop: editado.cfop,
              pisCst: editado.pisCst,
              cofinsCst: editado.cofinsCst,
            }
          : itemOriginal;
      });
      const pedidoModificado = { ...pedidoNfAlvo, itens: itensParaPayload };
      const payload = gerarPayloadNFe(
        pedidoModificado,
        configLoja,
        dadosDestinatario,
        configLoja?.mensagemComplementar,
      );
      const resultado = await focusNFeService.emitirNFe(nomeDaLoja, payload);
      const dados = resultado.dadosFocus || {};
      const chave = dados.chave_nfe || dados.chave || null;
      const ref = resultado.referencia || dados.ref || null;

      await updateDoc(pedidoRef, {
        nfeRef: ref,
        nfeChave: chave || null,
        nfeDanfe: dados.caminho_danfe || null,
        nfeXml: dados.caminho_xml_nota_fiscal || null,
        nfeEmitidaEm: new Date().toISOString(),
        nfeStatus: dados.status || "processando_autorizacao",
        nfEmitida: true,
        tipoDocumento: "NFe",
        caminhoPdf: dados.caminho_danfe || null,
      });
      if (resultado.status === "autorizado") {
        await updateDoc(pedidoRef, { nfeStatus: "autorizado" });
      }
      setModalNfOpen(false);
      onPedidoAtualizado?.();
    } catch (error) {
      console.error("❌ Erro na emissão:", error);
      alert("Erro na emissão: " + (error.message || "Tente novamente"));
    } finally {
      setEmitindoNf(false);
    }
  };

  return {
    modalNfOpen,
    setModalNfOpen,
    pedidoNfAlvo,
    formNf,
    setFormNf,
    emitindoNf,
    itensEditados,
    setItensEditados,
    abrirModalEmissao,
    confirmarEmissaoNf,
  };
};
