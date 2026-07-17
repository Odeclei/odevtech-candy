import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Clock,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Package,
  X,
  Receipt,
  Send,
  Printer,
} from "lucide-react";
import { focusNFeService } from "../../services/focusNFeService";
import { gerarPayloadNFCe, gerarPayloadNFe } from "../../utils/fiscalUtils";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function AbaKanban({ nomeDaLoja }) {
  const [configLoja, setConfigLoja] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [mostrarTudo, setMostrarTudo] = useState(false);
  const [produtosMenu, setProdutosMenu] = useState([]);
  const [clientesCadastrados, setClientesCadastrados] = useState([]);

  const [modalReceitaOpen, setModalReceitaOpen] = useState(false);
  const [produtoReceitaAtiva, setProdutoReceitaAtiva] = useState(null);

  // ==========================================
  // ESTADOS: EMISSÃO FISCAL
  // ==========================================
  const [modalNfOpen, setModalNfOpen] = useState(false);
  const [pedidoNfAlvo, setPedidoNfAlvo] = useState(null);
  const [formNf, setFormNf] = useState({
    tipoNota: "NFCe",
    cpf: "",
    nome: "",
    email: "",
    // Campos para NF-e
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

  // ==========================================
  // FUNÇÃO: GARANTIR WEBHOOK
  // ==========================================
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
      console.log("✅ Webhook configurado:", result.data);
      return result.data.webhook;
    } catch (error) {
      if (error.message && error.message.includes("Já existe um gatilho")) {
        console.log("ℹ️ Webhook já existe, continuando...");
        return true;
      }
      console.error("❌ Erro ao criar webhook:", error);
      return null;
    }
  };

  // ==========================================
  // EFFECTS
  // ==========================================
  useEffect(() => {
    if (!nomeDaLoja) return;

    const unsubscribeConfig = onSnapshot(
      doc(db, "lojas", nomeDaLoja),
      (docSnap) => {
        if (docSnap.exists()) setConfigLoja(docSnap.data());
      },
    );

    const qPedidos = query(
      collection(db, "pedidos"),
      where("loja", "==", nomeDaLoja),
    );
    const unsubscribePedidos = onSnapshot(qPedidos, (snapshot) => {
      const peds = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPedidos(
        peds.filter((p) =>
          ["agendado", "em_producao", "pronto", "entregue"].includes(p.status),
        ),
      );
    });

    const qProd = query(
      collection(db, "produtos"),
      where("loja", "==", nomeDaLoja),
    );
    const unsubscribeProdutos = onSnapshot(qProd, (snapshot) => {
      setProdutosMenu(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });

    const qClientes = query(
      collection(db, "clientes"),
      where("loja", "==", nomeDaLoja),
    );
    const unsubscribeClientes = onSnapshot(qClientes, (snapshot) => {
      setClientesCadastrados(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });

    return () => {
      unsubscribeConfig();
      unsubscribePedidos();
      unsubscribeProdutos();
      unsubscribeClientes();
    };
  }, [nomeDaLoja]);

  // ==========================================
  // FUNÇÕES AUXILIARES
  // ==========================================
  const abrirReceita = (nomeProdutoPedido) => {
    const produtoCompleto = produtosMenu.find(
      (p) => p.nome === nomeProdutoPedido,
    );
    if (
      produtoCompleto &&
      produtoCompleto.fichaTecnica &&
      produtoCompleto.fichaTecnica.length > 0
    ) {
      setProdutoReceitaAtiva(produtoCompleto);
      setModalReceitaOpen(true);
    } else {
      alert(
        `Nenhuma receita registada para "${nomeProdutoPedido}". Vá a Estoque > Fichas Técnicas.`,
      );
    }
  };

  const atualizarStatus = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, "pedidos", id), { status: novoStatus });
    } catch (error) {
      console.log(error);
      alert("Erro ao atualizar o pedido.");
    }
  };

  // ==========================================
  // MODAL DE EMISSÃO
  // ==========================================
  const abrirModalEmissao = (pedido) => {
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
    setModalNfOpen(true);
  };

  // ==========================================
  // EMISSÃO (NFC-e e NFe) – CORRIGIDA
  // ==========================================
  const confirmarEmissaoNf = async (e) => {
    e.preventDefault();
    if (!pedidoNfAlvo) return;

    setEmitindoNf(true);

    try {
      const pedidoRef = doc(db, "pedidos", pedidoNfAlvo.id);

      // --- NFC-e (MODELO 65) ---
      if (formNf.tipoNota === "NFCe") {
        const payload = gerarPayloadNFCe(pedidoNfAlvo, configLoja, formNf.cpf);
        const resultado = await focusNFeService.emitirNFCe(nomeDaLoja, payload);
        const dados = resultado.dadosFocus || {};
        const chave = dados.chave_nfe || dados.chave || null;
        const ref = resultado.referencia || dados.ref || null;

        console.log("🔑 Chave NFC-e:", chave);
        console.log("🏷️ Ref NFC-e:", ref);

        // Atualiza o pedido com os dados da NFC-e
        const updateData = {
          nfEmitida: true,
          statusNFCe: dados.status || "processando",
          numeroNota: dados.numero || null,
          nfceRef: ref, // salva a referência
          nfceChave: chave || null,
          nfceDanfe: dados.caminho_danfe || null,
          nfceXml: dados.caminho_xml_nota_fiscal || null,
          nfceEmitidaEm: new Date().toISOString(),
          nfceCanceladaEm: null,
          caminhoPdf: dados.caminho_danfe || null,
          caminhoXml: dados.caminho_xml_nota_fiscal || null,
        };
        await updateDoc(pedidoRef, updateData);

        if (!chave) {
          alert("📤 NFC-e enviada para processamento. Aguarde a notificação.");
        } else if (resultado.status === "autorizado") {
          alert("✅ NFC-e autorizada com sucesso!");
          await updateDoc(pedidoRef, { statusNFCe: "autorizado" });
        } else {
          alert("📤 NFC-e enviada para processamento.");
        }

        if (dados.caminho_danfe) {
          const url = dados.caminho_danfe.startsWith("http")
            ? dados.caminho_danfe
            : `https://api.focusnfe.com.br${dados.caminho_danfe}`;
          window.open(url, "_blank");
        }
        setModalNfOpen(false);
        return;
      }

      // --- NF-e (MODELO 55) ---
      // 1. Garantir webhook antes de emitir
      const webhook = await garantirWebhook(nomeDaLoja);
      if (!webhook) {
        console.info(
          "Webhook não configurado. A emissão continuará, mas a notificação pode não chegar.",
        );
      }

      // 2. Montar payload e emitir
      const dadosDestinatario = {
        cnpj: formNf.cpf,
        cpf: formNf.cpf,
        nome: formNf.nome,
        ie: formNf.ie,
        indicadorIE: formNf.indicadorIE || 9,
        logradouro: formNf.logradouro,
        numero: formNf.numero,
        bairro: formNf.bairro,
        municipio: formNf.municipio,
        uf: formNf.uf,
        cep: formNf.cep,
        telefone: formNf.telefone,
      };
      const payload = gerarPayloadNFe(
        pedidoNfAlvo,
        configLoja,
        dadosDestinatario,
      );
      const resultado = await focusNFeService.emitirNFe(nomeDaLoja, payload);
      const dados = resultado.dadosFocus || {};
      const chave = dados.chave_nfe || dados.chave || null;
      const ref = resultado.referencia || dados.ref || null;

      console.log("🔑 Chave NFe:", chave);
      console.log("🏷️ Ref NFe:", ref);

      // 3. Preparar dados para salvar (sempre salvar a referência)
      const updateData = {
        nfeRef: ref, // 👈 ESSENCIAL para o webhook encontrar o pedido
        nfeChave: chave || null,
        nfeDanfe: dados.caminho_danfe || null,
        nfeXml: dados.caminho_xml_nota_fiscal || null,
        nfeEmitidaEm: new Date().toISOString(),
        nfeStatus: dados.status || "processando_autorizacao",
        nfEmitida: true,
        tipoDocumento: "NFe",
        // Para compatibilidade com o botão de impressão
        caminhoPdf: dados.caminho_danfe || null,
      };
      console.log("📝 Atualizando pedido com:", updateData);
      await updateDoc(pedidoRef, updateData);

      // 4. Verificar status (síncrono ou assíncrono)
      if (resultado.status === "autorizado") {
        alert("✅ NFe autorizada com sucesso!");
        await updateDoc(pedidoRef, { nfeStatus: "autorizado" });
      } else {
        alert(
          "📤 NFe enviada para processamento. Você receberá uma notificação quando for autorizada.",
        );
      }

      setModalNfOpen(false);
    } catch (error) {
      console.error("❌ Erro na emissão:", error);
      alert("Erro na emissão: " + (error.message || "Tente novamente"));
    } finally {
      setEmitindoNf(false);
    }
  };

  // ==========================================
  // IMPRIMIR DANFE / NFC-e
  // ==========================================
  const imprimirNFCe = (caminhoPdf) => {
    if (!caminhoPdf) {
      alert(
        "O PDF da nota ainda não está disponível ou está em processamento pela SEFAZ.",
      );
      return;
    }
    const urlCompleta = caminhoPdf.startsWith("http")
      ? caminhoPdf
      : `https://api.focusnfe.com.br${caminhoPdf}`;
    window.open(urlCompleta, "_blank");
  };

  // ==========================================
  // FILTRO DE DATA (COZINHA)
  // ==========================================
  const deveAparecerNaCozinhaHoje = (dataIsoString) => {
    if (!dataIsoString) return true;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataPedido = new Date(dataIsoString);
    dataPedido.setHours(0, 0, 0, 0);
    return dataPedido <= hoje;
  };

  const pedidosVisiveis = mostrarTudo
    ? pedidos
    : pedidos.filter((p) =>
        deveAparecerNaCozinhaHoje(p.dataEntrega || p.criadoEm),
      );

  // ==========================================
  // RENDERIZAÇÃO DAS COLUNAS
  // ==========================================
  const renderColuna = (titulo, statusLista, icone, corTexto, corHover) => (
    <div className="bg-slate-50 p-5 rounded-3xl min-h-[70vh] border border-slate-200 flex-1 min-w-[320px]">
      <h3
        className={`font-black text-xl mb-6 flex items-center gap-2 ${corTexto}`}
      >
        {icone} {titulo}{" "}
        <span className="bg-white px-2 py-0.5 rounded-lg text-sm border shadow-sm">
          {pedidosVisiveis.filter((p) => p.status === statusLista).length}
        </span>
      </h3>

      <div className="space-y-4">
        {pedidosVisiveis
          .filter((p) => p.status === statusLista)
          .map((pedido) => {
            const isFuturo = !deveAparecerNaCozinhaHoje(pedido.dataEntrega);

            return (
              <div
                key={pedido.id}
                className={`p-5 rounded-2xl shadow-sm border-2 transition-all ${
                  pedido.temEncomenda
                    ? "border-red-400 bg-red-50"
                    : "border-slate-100 bg-white"
                }`}
              >
                {pedido.temEncomenda && (
                  <div className="flex items-center gap-1 text-red-700 mb-4 bg-red-200 px-3 py-1.5 rounded-lg w-fit animate-pulse border border-red-300 shadow-sm">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Requer Produção (OP)
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-black text-slate-800 text-lg block">
                      {pedido.cliente}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {pedido.origem}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                      {new Date(pedido.criadoEm).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {pedido.dataEntrega && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isFuturo
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        P/{" "}
                        {new Date(pedido.dataEntrega).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {pedido.itens.map((item, idx) => {
                    const qtd = item.quantidade || item.qtd_total || 1;
                    return (
                      <div key={idx} className="flex flex-col group">
                        <div className="text-sm text-slate-700 flex justify-between items-start">
                          <div className="flex gap-2">
                            <span className="font-black text-slate-900 bg-slate-100 px-2 rounded h-fit">
                              {qtd}x
                            </span>
                            <span className="font-medium leading-tight mt-0.5">
                              {item.nome}
                            </span>
                          </div>
                          <button
                            onClick={() => abrirReceita(item.nome)}
                            className="text-amber-600 bg-amber-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            title="Ver Receita"
                          >
                            <ChefHat size={16} />
                          </button>
                        </div>

                        {item.isKit &&
                          item.subitensSelecionados?.length > 0 && (
                            <div className="ml-8 mt-1.5 border-l-2 border-slate-200 pl-3 space-y-1">
                              {item.subitensSelecionados.map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="text-xs text-slate-500 font-medium flex items-center justify-between group/sub"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <strong className="text-slate-700">
                                      {sub.quantidade * qtd}x
                                    </strong>{" "}
                                    {sub.nome}
                                  </span>
                                  <button
                                    onClick={() => abrirReceita(sub.nome)}
                                    className="text-amber-600 bg-amber-50 p-1 rounded-md opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                    title={`Ver Receita: ${sub.nome}`}
                                  >
                                    <ChefHat size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>

                {statusLista === "agendado" && (
                  <button
                    onClick={() => atualizarStatus(pedido.id, "em_producao")}
                    className={`w-full py-3.5 bg-slate-900 text-white rounded-xl font-black shadow-md transition-all active:scale-95 ${corHover}`}
                  >
                    Iniciar Preparo
                  </button>
                )}
                {statusLista === "em_producao" && (
                  <button
                    onClick={() => atualizarStatus(pedido.id, "pronto")}
                    className={`w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-md transition-all active:scale-95 flex justify-center items-center gap-2`}
                  >
                    <CheckCircle size={18} /> Marcar como Pronto
                  </button>
                )}
                {statusLista === "pronto" && (
                  <>
                    <button
                      onClick={() => atualizarStatus(pedido.id, "entregue")}
                      className={`w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md transition-all active:scale-95 flex justify-center items-center gap-2`}
                    >
                      <Package size={18} /> Finalizar Entrega
                    </button>

                    {/* AÇÕES FISCAIS: EMITIR OU IMPRIMIR */}
                    {configLoja?.modulos?.includes("fiscal") && (
                      <div className="flex gap-2 mt-2">
                        {!pedido.nfEmitida && (
                          <button
                            onClick={() => abrirModalEmissao(pedido)}
                            className="w-full py-2.5 border-2 border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2"
                          >
                            <Receipt size={16} /> Emitir NFC-e
                          </button>
                        )}

                        {/* Botão de imprimir: verifica se existe caminho em qualquer formato */}
                        {(pedido.caminhoPdf ||
                          pedido.nfeDanfe ||
                          pedido.nfceDanfe) && (
                          <button
                            onClick={() =>
                              imprimirNFCe(
                                pedido.caminhoPdf ||
                                  pedido.nfeDanfe ||
                                  pedido.nfceDanfe,
                              )
                            }
                            className="w-full py-2.5 border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 active:scale-95 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2"
                          >
                            <Printer size={16} /> Imprimir Cupom
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in flex flex-col h-full relative">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
          Fila de Produção
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setMostrarTudo(false)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              !mostrarTudo
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Para Hoje
          </button>
          <button
            onClick={() => setMostrarTudo(true)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              mostrarTudo
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Ver Tudo
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 items-start">
        {renderColuna(
          "A Fazer",
          "agendado",
          <Clock size={24} />,
          "text-slate-800",
          "hover:bg-slate-800",
        )}
        {renderColuna(
          "Em Preparo",
          "em_producao",
          <ChefHat size={24} />,
          "text-amber-600",
          "",
        )}
        {renderColuna(
          "Pronto",
          "pronto",
          <CheckCircle size={24} />,
          "text-emerald-600",
          "",
        )}
        {renderColuna(
          "Entregue",
          "entregue",
          <Package size={24} />,
          "text-slate-400",
          "",
        )}
      </div>

      {/* MODAL DE RECEITA */}
      {modalReceitaOpen && produtoReceitaAtiva && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <ChefHat className="text-amber-500" /> Receita
              </h2>
              <button
                onClick={() => setModalReceitaOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4 pb-4 border-b border-slate-100">
              {produtoReceitaAtiva.nome}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {produtoReceitaAtiva.fichaTecnica.map((ing, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <span className="font-bold text-slate-700">
                    {ing.nome_insumo}
                  </span>
                  <span className="font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-lg text-sm">
                    {ing.quantidade}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setModalReceitaOpen(false)}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition mt-6"
            >
              Fechar Receita
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE EMISSÃO FISCAL */}
      {modalNfOpen && pedidoNfAlvo && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Receipt className="text-blue-500" /> Emissão Fiscal
              </h2>
              <button
                onClick={() => setModalNfOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={confirmarEmissaoNf} className="space-y-4">
              {/* SELETOR NFCe / NFe */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormNf({
                      ...formNf,
                      tipoNota: "NFCe",
                    })
                  }
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                    formNf.tipoNota === "NFCe"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Cupom (NFC-e)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormNf({
                      ...formNf,
                      tipoNota: "NFe",
                    })
                  }
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                    formNf.tipoNota === "NFe"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Nota (NF-e)
                </button>
              </div>

              {/* DADOS BÁSICOS */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                  CPF / CNPJ{" "}
                  {formNf.tipoNota === "NFe" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  required={formNf.tipoNota === "NFe"}
                  value={formNf.cpf}
                  onChange={(e) =>
                    setFormNf({
                      ...formNf,
                      cpf: e.target.value,
                    })
                  }
                  placeholder={
                    formNf.tipoNota === "NFCe" ? "Opcional" : "Apenas números"
                  }
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                  Nome do Cliente{" "}
                  {formNf.tipoNota === "NFe" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  required={formNf.tipoNota === "NFe"}
                  value={formNf.nome}
                  onChange={(e) =>
                    setFormNf({
                      ...formNf,
                      nome: e.target.value,
                    })
                  }
                  placeholder={
                    formNf.tipoNota === "NFCe"
                      ? "Opcional"
                      : "Nome Completo ou Razão Social"
                  }
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formNf.email}
                  onChange={(e) =>
                    setFormNf({
                      ...formNf,
                      email: e.target.value,
                    })
                  }
                  placeholder="Opcional"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* CAMPOS EXTRAS PARA NF-e */}
              {formNf.tipoNota === "NFe" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Inscrição Estadual
                      </label>
                      <input
                        type="text"
                        value={formNf.ie}
                        onChange={(e) =>
                          setFormNf({ ...formNf, ie: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Indicador IE
                      </label>
                      <select
                        value={formNf.indicadorIE || 9}
                        onChange={(e) =>
                          setFormNf({
                            ...formNf,
                            indicadorIE: parseInt(e.target.value),
                          })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      >
                        <option value={1}>Contribuinte ICMS</option>
                        <option value={2}>Isento</option>
                        <option value={9}>Não Contribuinte</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Logradouro
                      </label>
                      <input
                        type="text"
                        value={formNf.logradouro}
                        onChange={(e) =>
                          setFormNf({ ...formNf, logradouro: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Número
                      </label>
                      <input
                        type="text"
                        value={formNf.numero}
                        onChange={(e) =>
                          setFormNf({ ...formNf, numero: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={formNf.bairro}
                        onChange={(e) =>
                          setFormNf({ ...formNf, bairro: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Município
                      </label>
                      <input
                        type="text"
                        value={formNf.municipio}
                        onChange={(e) =>
                          setFormNf({ ...formNf, municipio: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        UF
                      </label>
                      <input
                        type="text"
                        maxLength="2"
                        value={formNf.uf}
                        onChange={(e) =>
                          setFormNf({
                            ...formNf,
                            uf: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={formNf.cep}
                        onChange={(e) =>
                          setFormNf({ ...formNf, cep: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formNf.telefone}
                        onChange={(e) =>
                          setFormNf({ ...formNf, telefone: e.target.value })
                        }
                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={emitindoNf}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2 mt-4 active:scale-95 disabled:opacity-50"
              >
                <Send size={18} />{" "}
                {emitindoNf
                  ? "Processando SEFAZ..."
                  : `Transmitir ${formNf.tipoNota}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
