import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { escapeHtml } from "../../../utils/sanitize";
import { Clock, ChefHat, CheckCircle, Package } from "lucide-react";
import { usePedidos } from "./hooks/usePedidos";
import { useEmissaoFiscal } from "./hooks/useEmissaoFiscal";
import { useReceitas } from "./hooks/useReceitas";
import ColunaKanban from "./components/ColunaKanban";
import ModalReceita from "./components/ModalReceita";
import ModalEmissaoFiscal from "./components/ModalEmissaoFiscal";
import ModalEdicaoPedido from "./components/ModalEdicaoPedido";

export default function AbaKanban({ nomeDaLoja, clientesCadastrados = [] }) {
  const [configLoja, setConfigLoja] = useState(null);
  const [mostrarTudo, setMostrarTudo] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);

  // Buscar config da loja
  useEffect(() => {
    if (!nomeDaLoja) return;
    const unsub = onSnapshot(doc(db, "lojas", nomeDaLoja), (docSnap) => {
      if (docSnap.exists()) setConfigLoja(docSnap.data());
    });
    return () => unsub();
  }, [nomeDaLoja]);

  const { pedidos, loading, filtrarPorData } = usePedidos(nomeDaLoja);
  // ProdutosMenu – você pode precisar buscar também, mas vou usar o mesmo padrão
  const [produtosMenu, setProdutosMenu] = useState([]);
  useEffect(() => {
    if (!nomeDaLoja) return;
    const unsub = onSnapshot(
      query(collection(db, "produtos"), where("loja", "==", nomeDaLoja)),
      (snap) =>
        setProdutosMenu(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => unsub();
  }, [nomeDaLoja]);

  const {
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
  } = useEmissaoFiscal(nomeDaLoja, configLoja, () => {});

  const {
    modalReceitaOpen,
    setModalReceitaOpen,
    produtoReceitaAtiva,
    abrirReceita,
  } = useReceitas(produtosMenu);

  const pedidosVisiveis = filtrarPorData(pedidos, mostrarTudo);

  const colunas = [
    {
      titulo: "A Fazer",
      status: "agendado",
      icone: <Clock size={24} />,
      cor: "text-slate-800",
      hover: "hover:bg-slate-800",
    },
    {
      titulo: "Em Preparo",
      status: "em_producao",
      icone: <ChefHat size={24} />,
      cor: "text-amber-600",
      hover: "",
    },
    {
      titulo: "Pronto",
      status: "pronto",
      icone: <CheckCircle size={24} />,
      cor: "text-emerald-600",
      hover: "",
    },
    {
      titulo: "Entregue",
      status: "entregue",
      icone: <Package size={24} />,
      cor: "text-slate-400",
      hover: "",
    },
  ];

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, "pedidos", id), { status: novoStatus });
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status.");
    }
  };

  const handleImprimir = (caminho) => {
    if (!caminho) return alert("PDF indisponível.");
    const url = caminho.startsWith("http")
      ? caminho
      : `https://api.focusnfe.com.br${caminho}`;
    window.open(url, "_blank");
  };

  const handleImprimirPedido = (pedido) => {
    const W = 30;

    const fmt = (val) =>
      `R$${Number(val || 0).toFixed(2).replace(".", ",")}`;

    const padDot = (left, right) => {
      const dots = Math.max(1, W - left.length - right.length);
      return left + ".".repeat(dots) + right;
    };

    const SEP = "─".repeat(W);
    const SEP2 = "=".repeat(W);

    const formaPgto = pedido.formaPagamento
      ? pedido.formaPagamento === "dinheiro"
        ? `Dinheiro${pedido.trocoPara ? ` (troco p/ ${fmt(pedido.trocoPara)})` : ""}`
        : pedido.formaPagamento === "credito"
          ? "Cartão Credito"
          : pedido.formaPagamento === "debito"
            ? "Cartão Debito"
            : pedido.formaPagamento
      : pedido.valorSinal > 0
        ? "PIX (sinal)"
        : "Pendente";

    const dataPedido = pedido.criadoEm
      ? new Date(pedido.criadoEm).toLocaleString("pt-BR")
      : "";
    const dataEntrega = pedido.dataEntrega
      ? new Date(pedido.dataEntrega).toLocaleString("pt-BR")
      : "";

    const subtotal = pedido.itens.reduce(
      (a, i) => a + (i.preco || 0) * (i.quantidade || i.qtd_total || 1),
      0,
    );

    const eh = escapeHtml;

    const itensText = pedido.itens
      .map((item) => {
        const q = item.quantidade || item.qtd_total || 1;
        const total = (item.preco || 0) * q;
        const line = padDot(`${q}x ${eh(item.nome)}`, fmt(total));

        const subs =
          item.isKit && item.subitensSelecionados?.length > 0
            ? item.subitensSelecionados
                .map((sub) => `  ${sub.quantidade * q}x ${eh(sub.nome)}`)
                .join("\n")
            : "";
        return subs ? `${line}\n${subs}` : line;
      })
      .join("\n");

    const endTexto = (v) => eh(v || "");
    const enderecoText =
      pedido.tipoEntrega === "entrega" && pedido.enderecoEntrega
        ? `${endTexto(pedido.enderecoEntrega.logradouro)}, ${endTexto(pedido.enderecoEntrega.numero)}${pedido.enderecoEntrega.complemento ? " - " + endTexto(pedido.enderecoEntrega.complemento) : ""}\n${endTexto(pedido.enderecoEntrega.bairro)}, ${endTexto(pedido.enderecoEntrega.cidade)} - ${endTexto(pedido.enderecoEntrega.uf)}\nCEP: ${endTexto(pedido.enderecoEntrega.cep)}`
        : "Retirada no local";

    const tipoEntregaLabel = pedido.tipoEntrega === "entrega" ? "DELIVERY" : "RETIRADA";

    const distStr =
      pedido.distanciaKm != null
        ? `${Number(pedido.distanciaKm).toFixed(1).replace(".", ",")}km`
        : "";
    const freteLabel = distStr ? `Frete ${distStr}` : "Frete";
    const freteText =
      pedido.tipoEntrega === "entrega" && (pedido.taxaEntrega || pedido.taxaEntrega === 0)
        ? padDot(freteLabel, fmt(pedido.taxaEntrega))
        : "";

    const sinalText =
      pedido.valorSinal > 0
        ? `\n${padDot("Sinal pago", fmt(pedido.valorSinal))}`
        : "";

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Pedido #${pedido.id?.slice(0, 8) || ""}</title>
<style>
  @page { margin:0; size:58mm auto; }
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Courier New',Courier,monospace; }
  body { width:58mm; margin:0 auto; padding:4mm 2mm; line-height:1.3; color:#000; background:#fff; }
  .c { text-align:center; }
  .nome-loja { font-weight:bold; text-transform:uppercase; }
  .info { margin:2px 0; }
  .sep { white-space:pre; margin:3px 0; }
  .pre { white-space:pre; }
  .footer { text-align:center; margin-top:6px; }
</style></head><body>
<div class="c nome-loja">${eh(configLoja?.nomeExibicao || nomeDaLoja || "Loja")}</div>
<div class="c info">Pedido #${eh((pedido.id || "").slice(0, 8))}</div>
<div class="c info">${eh(dataPedido)}</div>
${dataEntrega ? `<div class="c info">Entrega: ${eh(dataEntrega)}</div>` : ""}
<div class="c info" style="font-weight:bold">${eh(tipoEntregaLabel)}</div>
<div class="sep">${SEP}</div>
<div class="pre">${itensText}</div>
<div class="sep">${SEP}</div>
<div class="pre">${padDot("Subtotal", fmt(subtotal))}</div>
${freteText ? `<div class="pre">${freteText}</div>` : ""}
<div class="pre" style="font-weight:bold">${padDot("TOTAL", fmt(pedido.valorTotal))}</div>
${sinalText}
<div class="sep">${SEP2}</div>
<div class="info"><b>Cliente:</b> ${eh(pedido.cliente || "—")}</div>
${pedido.telefone ? `<div class="info"><b>Tel:</b> ${eh(pedido.telefone)}</div>` : ""}
${pedido.cpf ? `<div class="info"><b>CPF:</b> ${eh(pedido.cpf)}</div>` : ""}
<div class="info"><b>Pagamento:</b> ${eh(formaPgto)}</div>
<div class="info"><b>Endereco:</b></div>
<div class="info" style="padding-left:4px">${eh(enderecoText)}</div>
<div class="sep">${SEP2}</div>
<div class="footer">Obrigado pela preferencia!</div>
<script>window.onload=function(){window.print();window.close()};</script>
</body></html>`);
    printWindow.document.close();
  };

  // A função abrirModalEmissao precisa receber clientesCadastrados
  const handleAbrirEmissao = (pedido) => {
    abrirModalEmissao(pedido, clientesCadastrados);
  };

  // Quando o pedido for editado, você pode atualizar a lista (chamar onPedidoAtualizado se necessário)

  return (
    <div className="animate-in fade-in flex flex-col h-full relative">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="font-black text-slate-800 text-lg">Fila de Produção</h2>
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
        {colunas.map((col) => (
          <ColunaKanban
            key={col.status}
            titulo={col.titulo}
            statusLista={col.status}
            icone={col.icone}
            corTexto={col.cor}
            corHover={col.hover}
            pedidos={pedidosVisiveis.filter((p) => p.status === col.status)}
            onStatusChange={handleStatusChange}
            onAbrirReceita={abrirReceita}
            onAbrirEmissao={handleAbrirEmissao}
            onImprimir={handleImprimir}
            onImprimirPedido={handleImprimirPedido}
            onEditarPedido={setPedidoEditando}
            configLoja={configLoja}
          />
        ))}
      </div>

      {/* Modais */}
      <ModalReceita
        isOpen={modalReceitaOpen}
        onClose={() => setModalReceitaOpen(false)}
        produto={produtoReceitaAtiva}
      />
      <ModalEmissaoFiscal
        isOpen={modalNfOpen}
        onClose={() => setModalNfOpen(false)}
        pedido={pedidoNfAlvo}
        formNf={formNf}
        setFormNf={setFormNf}
        itensEditados={itensEditados}
        setItensEditados={setItensEditados}
        emitindo={emitindoNf}
        onSubmit={confirmarEmissaoNf}
        configLoja={configLoja}
      />
      {pedidoEditando && (
        <ModalEdicaoPedido
          pedido={pedidoEditando}
          produtosMenu={produtosMenu}
          onClose={() => setPedidoEditando(null)}
          onAtualizado={() => {}}
        />
      )}
    </div>
  );
}
