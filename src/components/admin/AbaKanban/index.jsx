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
