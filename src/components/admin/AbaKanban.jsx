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
  X, // Ícone adicionado aqui!
} from "lucide-react";

export default function AbaKanban({ nomeDaLoja }) {
  const [pedidos, setPedidos] = useState([]);
  const [mostrarTudo, setMostrarTudo] = useState(false); // Filtro de tempo
  const [produtosMenu, setProdutosMenu] = useState([]);
  const [modalReceitaOpen, setModalReceitaOpen] = useState(false);
  const [produtoReceitaAtiva, setProdutoReceitaAtiva] = useState(null);

  useEffect(() => {
    if (!nomeDaLoja) return;
    const q = query(collection(db, "pedidos"), where("loja", "==", nomeDaLoja));
    const unsubscribePedidos = onSnapshot(q, (snapshot) => {
      const peds = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPedidos(
        peds.filter((p) =>
          ["agendado", "em_producao", "pronto", "entregue"].includes(p.status),
        ),
      );
    });

    // PUXAR PRODUTOS PARA VER A RECEITA
    const qProd = query(
      collection(db, "produtos"),
      where("loja", "==", nomeDaLoja),
    );
    const unsubscribeProdutos = onSnapshot(qProd, (snapshot) => {
      setProdutosMenu(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });

    return () => {
      unsubscribePedidos();
      unsubscribeProdutos();
    };
  }, [nomeDaLoja]);

  // FUNÇÃO PARA ABRIR A RECEITA
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
        `Nenhuma receita registada para "${nomeProdutoPedido}". Vá a Estoque > Fichas Técnicas para criar uma.`,
      );
    }
  };

  const atualizarStatus = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, "pedidos", id), { status: novoStatus });
    } catch (error) {
      alert("Erro ao atualizar o pedido.");
    }
  };

  // Função para verificar se a data é hoje (ou antes de hoje, para pedidos atrasados)
  const deveAparecerNaCozinhaHoje = (dataIsoString) => {
    if (!dataIsoString) return true; // Se não tem data, mostra sempre
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataPedido = new Date(dataIsoString);
    dataPedido.setHours(0, 0, 0, 0);

    return dataPedido <= hoje;
  };

  // Aplica o filtro aos pedidos
  const pedidosVisiveis = mostrarTudo
    ? pedidos
    : pedidos.filter((p) =>
        deveAparecerNaCozinhaHoje(p.dataEntrega || p.criadoEm),
      );

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
            // Verifica se a entrega é num dia futuro para mostrar uma tag amarela
            const isFuturo = !deveAparecerNaCozinhaHoje(pedido.dataEntrega);

            return (
              <div
                key={pedido.id}
                className={`p-5 rounded-2xl shadow-sm border-2 transition-all ${pedido.temEncomenda ? "border-red-400 bg-red-50" : "border-slate-100 bg-white"}`}
              >
                {/* ALERTA DE ENCOMENDA */}
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
                    {/* Se o pedido foi agendado para outro dia, mostra aqui na cor amarela */}
                    {pedido.dataEntrega && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isFuturo ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
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
                    // Verifica se o item tem quantidade formatada pelo garçom (qtd_total) ou delivery (quantidade)
                    const qtd = item.quantidade || item.qtd_total || 1;
                    return (
                      <div
                        key={idx}
                        className="text-sm text-slate-700 flex justify-between items-start group"
                      >
                        <div className="flex gap-2">
                          <span className="font-black text-slate-900 bg-slate-100 px-2 rounded h-fit">
                            {qtd}x
                          </span>
                          <span className="font-medium leading-tight">
                            {item.nome}
                          </span>
                        </div>

                        {/* BOTÃO DA RECEITA QUE APARECE NO HOVER */}
                        <button
                          onClick={() => abrirReceita(item.nome)}
                          className="text-amber-600 bg-amber-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Ver Receita"
                        >
                          <ChefHat size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* BOTÕES DE AÇÃO BASEADOS NO STATUS ATUAL */}
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
                  <button
                    onClick={() => atualizarStatus(pedido.id, "entregue")}
                    className={`w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md transition-all active:scale-95 flex justify-center items-center gap-2`}
                  >
                    <Package size={18} /> Finalizar Entrega
                  </button>
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
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!mostrarTudo ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
          >
            Para Hoje
          </button>
          <button
            onClick={() => setMostrarTudo(true)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mostrarTudo ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
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

      {/* MODAL DE VISUALIZAÇÃO DE RECEITA MOVIDO PARA FORA DO LOOP DAS COLUNAS */}
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
    </div>
  );
}
