// src/components/admin/AbaHistorico.jsx
import { useState } from "react";
import {
  Search,
  Filter,
  Edit,
  Printer,
  FileText,
  X,
  Save,
  Calendar,
  Trash2,
} from "lucide-react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { focusNFeService } from "../../services/focusNFeService";
import { gerarPayloadNFCe } from "../../utils/fiscalUtils";

export default function AbaHistorico({
  pedidos,
  formatarDinheiro,
  lojaId = "crisdoces",
  onPedidoAtualizado, // função opcional para recarregar a lista
}) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Estados para emissão de NFC-e
  const [emitindoNF, setEmitindoNF] = useState(null);
  const [cancelandoNF, setCancelandoNF] = useState(null);

  // ==========================================
  // FUNÇÃO DE IMPRESSÃO 58mm (Reimpressão)
  // ==========================================
  const imprimirComanda = (pedido) => {
    const itensHtml = pedido.itens
      .map(
        (item) => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>${item.quantidade}x ${item.nome}</span>
            </div>
        `,
      )
      .join("");

    const html = `
            <html>
            <head>
                <title>Comanda - ${pedido.cliente}</title>
                <style>
                    @page { margin: 0; }
                    body { font-family: 'Courier New', Courier, monospace; width: 58mm; margin: 0; padding: 2mm; font-size: 12px; color: #000; }
                    h2 { font-size: 14px; text-align: center; margin: 0 0 5px 0; }
                    .divisor { border-top: 1px dashed #000; margin: 5px 0; }
                    .info { margin-bottom: 5px; }
                    .bold { font-weight: bold; }
                    .footer { text-align: center; font-size: 10px; margin-top: 10px; }
                </style>
            </head>
            <body>
                <h2>REIMPRESSAO</h2>
                <div class="divisor"></div>
                <div class="info">
                    <span class="bold">Cliente:</span> ${pedido.cliente}<br>
                    <span class="bold">Pedido:</span> #${pedido.id.substring(0, 6).toUpperCase()}<br>
                    ${pedido.dataEntrega ? `<span class="bold">Entrega:</span> ${new Date(pedido.dataEntrega).toLocaleString("pt-BR")}<br>` : ""}
                </div>
                <div class="divisor"></div>
                <div class="bold" style="margin-bottom: 5px;">ITENS DO PEDIDO:</div>
                ${itensHtml}
                <div class="divisor"></div>
                <div class="footer">OdevTech DoceApp</div>
            </body>
            </html>
        `;

    const janelaPrint = window.open("", "", "width=300,height=600");
    janelaPrint.document.write(html);
    janelaPrint.document.close();
    janelaPrint.focus();
    setTimeout(() => {
      janelaPrint.print();
      janelaPrint.close();
    }, 250);
  };

  // ==========================================
  // SALVAR EDIÇÃO
  // ==========================================
  const salvarEdicao = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await updateDoc(doc(db, "pedidos", pedidoEditando.id), {
        status: pedidoEditando.status,
        dataEntrega: pedidoEditando.dataEntrega,
        valorSinal: parseFloat(pedidoEditando.valorSinal) || 0,
        saldoPago: pedidoEditando.saldoPago ?? false,
      });
      setPedidoEditando(null);
      alert("Pedido atualizado com sucesso!");
      if (onPedidoAtualizado) onPedidoAtualizado();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar o pedido.");
    } finally {
      setSalvando(false);
    }
  };

  // ==========================================
  // EMITIR NFC-e A PARTIR DO PEDIDO
  // ==========================================

  const emitirNFCeDoPedido = async (pedido) => {
    console.log("🚀 [1] Função iniciada para pedido:", pedido.id);
    setEmitindoNF(pedido.id);
    try {
      console.log("🚀 [2] Montando payload...");
      const cpf = pedido.cpf || "";
      const payload = gerarPayloadNFCe(pedido, null, cpf);
      console.log("🚀 [3] Payload montado:", payload);

      console.log("🚀 [4] Chamando focusNFeService.emitirNFCe...");
      const result = await focusNFeService.emitirNFCe(lojaId, payload);
      console.log("🚀 [5] Retorno da chamada (result):", result);
      console.log("🚀 [6] Tipo de result:", typeof result);
      console.log("🚀 [7] JSON do result:", JSON.stringify(result, null, 2));

      // Se não tiver sucesso
      if (!result || !result.sucesso) {
        console.warn("🚀 [8] Resultado sem sucesso:", result);
        alert("Erro na emissão: " + (result?.mensagem || "Sem detalhes"));
        return;
      }

      console.log("🚀 [9] Extraindo dadosFocus...");
      const dados = result.dadosFocus || {};
      console.log("🚀 [10] dadosFocus recebido:", dados);
      console.log("🚀 [11] Campos disponíveis:", Object.keys(dados));

      const chave =
        dados.chave_nfe || dados.chave || dados.chave_acesso || null;
      const xmlUrl = dados.caminho_xml_nota_fiscal || dados.xml_url || null;
      const danfeUrl = dados.caminho_danfe || dados.danfe_url || null;
      const status = dados.status || "desconhecido";

      console.log("🚀 [12] Chave extraída:", chave);
      console.log("🚀 [13] DANFE URL:", danfeUrl);
      console.log("🚀 [14] Status:", status);

      if (status !== "autorizado") {
        const mensagem = dados.mensagem_sefaz || "Nota não autorizada";
        alert(
          `NFC-e não autorizada.\nStatus: ${status}\nMensagem: ${mensagem}`,
        );
        return;
      }

      if (!chave) {
        console.warn("🚀 [15] Chave não veio!");
        alert("Nota autorizada, mas chave não retornada.");
        return;
      }

      console.log("🚀 [16] Montando updateData...");
      const updateData = {
        nfceChave: chave,
        nfceEmitidaEm: new Date().toISOString(),
        nfceCanceladaEm: null,
        nfceStatus: status,
      };
      if (xmlUrl) updateData.nfceXml = xmlUrl;
      if (danfeUrl) updateData.nfceDanfe = danfeUrl;
      console.log("🚀 [17] updateData:", updateData);

      console.log("🚀 [18] Verificando existência do documento...");
      const docRef = doc(db, "pedidos", pedido.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.error("🚀 [19] Documento não encontrado!");
        alert("Pedido não encontrado no banco de dados.");
        return;
      }
      console.log("🚀 [20] Documento existe, atualizando...");
      await updateDoc(docRef, updateData);
      console.log("🚀 [21] UpdateDoc concluído!");

      alert(`NFC-e emitida com sucesso!\nChave: ${chave}`);
      if (danfeUrl) window.open(danfeUrl, "_blank");
      if (onPedidoAtualizado) onPedidoAtualizado();
    } catch (error) {
      console.error("🚀 [ERRO] Capturado no catch:", error);
      alert("Erro na emissão: " + (error.message || "Erro desconhecido"));
    } finally {
      console.log("🚀 [22] Finalizando, emitindoNF = null");
      setEmitindoNF(null);
    }
  };

  // const emitirNFCeDoPedido = async (pedido) => {
  //     setEmitindoNF(pedido.id);
  //     try {
  //         const cpf = pedido.cpf || "";
  //         const payload = gerarPayloadNFCe(pedido, null, cpf);
  //         console.log("📦 Payload enviado:", payload);

  //         const result = await focusNFeService.emitirNFCe(lojaId, payload);
  //         console.log("📥 Resultado completo da Focus:", result);

  //         if (!result.sucesso) {
  //             throw new Error(result?.mensagem || "Erro na emissão");
  //         }

  //         const dados = result.dadosFocus || {};
  //         console.log("📄 dadosFocus recebido:", dados);
  //         console.log(
  //             "🔍 Campos disponíveis em dadosFocus:",
  //             Object.keys(dados),
  //         );

  //         // Extrai os campos
  //         const chave =
  //             dados.chave_nfe || dados.chave || dados.chave_acesso || null;
  //         const xmlUrl =
  //             dados.caminho_xml_nota_fiscal || dados.xml_url || null;
  //         const danfeUrl = dados.caminho_danfe || dados.danfe_url || null;
  //         const status = dados.status || "desconhecido";

  //         console.log("🔑 Chave extraída:", chave);
  //         console.log("📎 XML URL:", xmlUrl);
  //         console.log("🖨️ DANFE URL:", danfeUrl);
  //         console.log("📌 Status da nota:", status);

  //         if (status !== "autorizado") {
  //             const mensagem = dados.mensagem_sefaz || "Nota não autorizada";
  //             alert(
  //                 `NFC-e não autorizada.\nStatus: ${status}\nMensagem: ${mensagem}`,
  //             );
  //             return;
  //         }

  //         if (!chave) {
  //             console.warn(
  //                 "⚠️ Chave não veio mesmo com status autorizado. Verifique a resposta da Focus.",
  //             );
  //             alert(
  //                 "Nota autorizada, mas a chave não foi retornada. Contate o suporte.",
  //             );
  //             return;
  //         }

  //         // Monta updateData
  //         const updateData = {
  //             nfceChave: chave,
  //             nfceEmitidaEm: new Date().toISOString(),
  //             nfceCanceladaEm: null,
  //             nfceStatus: status,
  //         };

  //         if (xmlUrl) updateData.nfceXml = xmlUrl;
  //         if (danfeUrl) updateData.nfceDanfe = danfeUrl;

  //         console.log("📝 Dados a salvar no Firestore:", updateData);

  //         // Verifica se o documento existe antes de atualizar
  //         const docRef = doc(db, "pedidos", pedido.id);
  //         const docSnap = await getDoc(docRef);
  //         if (!docSnap.exists()) {
  //             console.error(
  //                 "❌ Documento do pedido não encontrado:",
  //                 pedido.id,
  //             );
  //             alert("Pedido não encontrado no banco de dados.");
  //             return;
  //         }

  //         // Atualiza
  //         await updateDoc(docRef, updateData);
  //         console.log("✅ Pedido atualizado com sucesso!");

  //         alert(`NFC-e emitida com sucesso!\nChave: ${chave}`);
  //         if (danfeUrl) window.open(danfeUrl, "_blank");
  //         if (onPedidoAtualizado) onPedidoAtualizado();
  //     } catch (error) {
  //         console.error("❌ Erro ao emitir NFC-e:", error);
  //         alert("Erro na emissão: " + (error.message || "Erro desconhecido"));
  //     } finally {
  //         setEmitindoNF(null);
  //     }
  // };

  // const emitirNFCeDoPedido = async (pedido) => {
  //     setEmitindoNF(pedido.id);
  //     try {
  //         const cpf = pedido.cpf || "";
  //         const payload = gerarPayloadNFCe(pedido, null, cpf);
  //         const result = await focusNFeService.emitirNFCe(lojaId, payload);

  //         if (result.sucesso) {
  //             const dados = result.dadosFocus || {};
  //             const chave = dados.chave_nfe;
  //             const xmlUrl = dados.caminho_xml_nota_fiscal;
  //             const danfeUrl = dados.caminho_danfe;

  //             const updateData = {};
  //             if (chave) updateData.nfceChave = chave;
  //             if (xmlUrl) updateData.nfceXml = xmlUrl;
  //             if (danfeUrl) updateData.nfceDanfe = danfeUrl;
  //             updateData.nfceEmitidaEm = new Date().toISOString();
  //             // Remove possível campo de cancelamento
  //             updateData.nfceCanceladaEm = null;

  //             await updateDoc(doc(db, "pedidos", pedido.id), updateData);

  //             alert(`NFC-e emitida com sucesso!\nChave: ${chave || "N/A"}`);
  //             if (danfeUrl) {
  //                 window.open(danfeUrl, "_blank");
  //             }
  //             if (onPedidoAtualizado) onPedidoAtualizado();
  //         } else {
  //             throw new Error("Resposta da emissão não indica sucesso.");
  //         }
  //     } catch (error) {
  //         console.error("Erro ao emitir NFC-e:", error);
  //         alert("Erro na emissão: " + (error.message || "Erro desconhecido"));
  //     } finally {
  //         setEmitindoNF(null);
  //     }
  // };

  const imprimirNFCe = (caminhoPdf) => {
    if (!caminhoPdf) {
      alert(
        "O PDF da nota ainda não está disponível ou está em processamento pela SEFAZ.",
      );
      return;
    }

    // Verifica se a URL já é completa. A FocusNFe costuma retornar um caminho relativo (ex: /notas_fiscais/...)
    const urlCompleta = caminhoPdf.startsWith("http")
      ? caminhoPdf
      : `https://api.focusnfe.com.br${caminhoPdf}`;

    window.open(urlCompleta, "_blank");
  };

  // ==========================================
  // REIMPRIMIR DANFE
  // ==========================================
  const reimprimirDANFE = (pedido) => {
    if (pedido.nfceDanfe) {
      window.open(pedido.nfceDanfe, "_blank");
    } else if (pedido.nfceChave) {
      alert(
        `Chave da nota: ${pedido.nfceChave}\nAcesse o portal da SEFAZ para consultar ou reimprimir.`,
      );
    } else {
      alert("Nota fiscal não encontrada para este pedido.");
    }
  };

  // ==========================================
  // CANCELAR NFC-e
  // ==========================================

  const confirmarCancelamento = (pedido) => {
    if (!pedido.nfceRef && !pedido.nfceChave) {
      alert("Este pedido não possui uma referência de NFC-e válida.");
      return;
    }
    if (
      window.confirm(
        `Deseja realmente cancelar a NFC-e do pedido ${pedido.id.substring(0, 6).toUpperCase()}?`,
      )
    ) {
      const justificativa = prompt(
        "Digite a justificativa para o cancelamento (15 a 255 caracteres):",
        "Cancelamento por solicitação do cliente",
      );
      if (justificativa === null) return; // cancelou o prompt
      if (justificativa.length < 15 || justificativa.length > 255) {
        alert("A justificativa deve ter entre 15 e 255 caracteres.");
        return;
      }
      cancelarNFCeDoPedido(pedido, justificativa);
    }
  };

  const cancelarNFCeDoPedido = async (pedido) => {
    setCancelandoNF(pedido.id);
    try {
      const ref = pedido.nfceRef || pedido.nfceChave;
      if (!ref) {
        alert("referencia da nf não encontrada.");
        return;
      }

      const result = await focusNFeService.cancelarNFCe(
        lojaId,
        ref,
        "Cancelamento via sistema OdevTech",
      );

      if (result.sucesso) {
        await updateDoc(doc(db, "pedidos", pedido.id), {
          nfceChave: null,
          nfceDanfe: null,
          nfceXml: null,
          nfceEmitidaEm: null,
          nfceCanceladaEm: new Date().toISOString(),
        });
        alert("NFC-e cancelada com sucesso!");
        if (onPedidoAtualizado) onPedidoAtualizado();
      } else {
        throw new Error(result.dadosFocus?.mensagem || "Erro no cancelamento");
      }
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      alert("Erro ao cancelar: " + (error.message || "Erro desconhecido"));
    } finally {
      setCancelandoNF(null);
    }
  };

  // ==========================================
  // FILTROS
  // ==========================================
  const pedidosFiltrados = pedidos
    .filter((p) => {
      const matchBusca =
        p.cliente?.toLowerCase().includes(busca.toLowerCase()) ||
        p.id?.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
      return matchBusca && matchStatus;
    })
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  const getStatusBadge = (status) => {
    const badges = {
      aguardando_pix: "bg-slate-100 text-slate-600",
      agendado: "bg-amber-100 text-amber-700",
      em_producao: "bg-blue-100 text-blue-700",
      pronto: "bg-emerald-100 text-emerald-700",
      entregue: "bg-slate-800 text-white",
      cancelado: "bg-red-100 text-red-700",
    };
    const nomes = {
      aguardando_pix: "Aguardando Pix",
      agendado: "Agendado",
      em_producao: "Em Produção",
      pronto: "Pronto",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };
    return (
      <span
        className={`px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap ${badges[status] || badges.agendado}`}
      >
        {nomes[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID do pedido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-slate-400" size={20} />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full md:w-auto bg-slate-50 border border-slate-200 py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700"
          >
            <option value="todos">Todos os Status</option>
            <option value="aguardando_pix">Aguardando Pix</option>
            <option value="agendado">Agendado (A Fazer)</option>
            <option value="em_producao">Em Produção</option>
            <option value="pronto">Pronto</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* TABELA DE PEDIDOS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-bold">Data Entrega</th>
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold">Total</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Ações</th>
                <th className="p-4 font-bold text-center">Notas Fiscais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const aReceber = pedido.valorTotal - (pedido.valorSinal || 0);
                  const nfEmitida = !!pedido.nfEmitida || pedido.nfeDanfe;

                  const temNota = !!pedido.nfceChave;
                  return (
                    <tr
                      key={pedido.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          <Calendar size={16} className="text-slate-400" />
                          {pedido.dataEntrega
                            ? new Date(pedido.dataEntrega).toLocaleDateString(
                                "pt-BR",
                              )
                            : "Sem data"}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">
                          {pedido.cliente}
                        </p>
                        <p className="text-xs text-slate-400">
                          #{pedido.id.substring(0, 6).toUpperCase()}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">
                          {formatarDinheiro(pedido.valorTotal)}
                        </p>
                        {pedido.saldoPago ? (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            100% PAGO
                          </span>
                        ) : (
                          <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded">
                            Falta {formatarDinheiro(aReceber)}
                          </span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(pedido.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              setPedidoEditando({
                                ...pedido,
                              })
                            }
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar Pedido"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => imprimirComanda(pedido)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                            title="Reimprimir Comanda"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {nfEmitida ? (
                            // Pedido com nota emitida
                            <>
                              <button
                                onClick={() =>
                                  imprimirNFCe(
                                    pedido.caminhoPdf || pedido.nfeDanfe,
                                  )
                                }
                                className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                title="Reimprimir DANFE"
                              >
                                <FileText size={18} />
                              </button>
                              <button
                                onClick={() => confirmarCancelamento(pedido)}
                                disabled={cancelandoNF === pedido.id}
                                className={`p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition ${
                                  cancelandoNF === pedido.id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                title="Cancelar NFC-e"
                              >
                                {cancelandoNF === pedido.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <X size={18} />
                                )}
                              </button>
                            </>
                          ) : (
                            // Pedido sem nota → emitir
                            <button
                              onClick={() => emitirNFCeDoPedido(pedido)}
                              disabled={emitindoNF === pedido.id}
                              className={`p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition ${
                                emitindoNF === pedido.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              title="Emitir NFC-e"
                            >
                              {emitindoNF === pedido.id ? (
                                <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileText size={18} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {pedidoEditando && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Editar Pedido
              </h2>
              <button
                onClick={() => setPedidoEditando(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={pedidoEditando.status}
                    onChange={(e) =>
                      setPedidoEditando({
                        ...pedidoEditando,
                        status: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none bg-slate-50"
                  >
                    <option value="aguardando_pix">Aguardando Pix</option>
                    <option value="agendado">Agendado (A Fazer)</option>
                    <option value="em_producao">Em Produção</option>
                    <option value="pronto">Pronto</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Data de Entrega
                  </label>
                  <input
                    type="datetime-local"
                    value={pedidoEditando.dataEntrega || ""}
                    onChange={(e) =>
                      setPedidoEditando({
                        ...pedidoEditando,
                        dataEntrega: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none bg-slate-50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Valor do Sinal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={pedidoEditando.valorSinal || 0}
                    onChange={(e) =>
                      setPedidoEditando({
                        ...pedidoEditando,
                        valorSinal: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none bg-slate-50"
                  />
                </div>
                <div className="flex flex-col justify-end pb-3">
                  <label className="flex items-center gap-3 cursor-pointer p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={pedidoEditando.saldoPago || false}
                      onChange={(e) =>
                        setPedidoEditando({
                          ...pedidoEditando,
                          saldoPago: e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-emerald-600"
                    />
                    <span className="font-bold text-emerald-800 text-sm">
                      Saldo 100% Pago
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition flex justify-center items-center gap-2 mt-4 shadow-lg"
              >
                <Save size={20} />{" "}
                {salvando ? "A salvar..." : "Salvar Alterações"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
