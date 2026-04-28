import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import {
    Clock,
    ChefHat,
    Truck,
    CheckCircle,
    AlertCircle,
    Play,
    Check,
    MapPin,
} from "lucide-react";

export default function AbaKanban({ pedidos, isHoje }) {
    // Atualiza o status do pedido no Firebase em tempo real
    const atualizarStatus = async (pedidoId, novoStatus) => {
        try {
            await updateDoc(doc(db, "pedidos", pedidoId), {
                status: novoStatus,
            });
        } catch (erro) {
            console.error(erro);
            alert("Erro ao atualizar o status na cozinha.");
        }
    };

    // Formata a data e hora para exibição amigável
    const formatarData = (dataIso) => {
        if (!dataIso) return "Imediato";
        const data = new Date(dataIso);
        return data.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Filtra os pedidos relevantes para o painel da cozinha
    const pedidosAtivos = pedidos.filter((p) => {
        // Esconde cancelados, pendentes (ainda na triagem) e aguardando_pix
        if (["cancelado", "pendente", "aguardando_pix"].includes(p.status))
            return false;

        // Se já foi entregue, só mostra se a entrega foi feita hoje (para manter o quadro limpo)
        if (p.status === "entregue") {
            const dataRef = p.dataEntrega ? p.dataEntrega : p.criadoEm;
            return isHoje(dataRef);
        }
        return true;
    });

    // Definição das Colunas do Kanban
    const colunas = [
        {
            id: "agendado",
            titulo: "Na Fila (A Fazer)",
            cor: "border-amber-200 bg-amber-50/50",
            cabecalho: "bg-amber-100",
            texto: "text-amber-800",
            icone: <Clock size={20} className="text-amber-600" />,
        },
        {
            id: "preparando",
            titulo: "Em Produção",
            cor: "border-blue-200 bg-blue-50/50",
            cabecalho: "bg-blue-100",
            texto: "text-blue-800",
            icone: <ChefHat size={20} className="text-blue-600" />,
        },
        {
            id: "pronto",
            titulo: "Pronto / Aguarda Rota",
            cor: "border-indigo-200 bg-indigo-50/50",
            cabecalho: "bg-indigo-100",
            texto: "text-indigo-800",
            icone: <Truck size={20} className="text-indigo-600" />,
        },
        {
            id: "entregue",
            titulo: "Concluídos Hoje",
            cor: "border-emerald-200 bg-emerald-50/50",
            cabecalho: "bg-emerald-100",
            texto: "text-emerald-800",
            icone: <CheckCircle size={20} className="text-emerald-600" />,
        },
    ];

    return (
        <div className="animate-in fade-in duration-500">
            {/* Dica de UX para a cozinha */}
            <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
                <ChefHat size={20} />
                <p className="text-sm font-medium">
                    <b>Painel de Produção (KDS):</b> Clique nos botões ao final
                    de cada cartão para avançar os pedidos na linha de produção.
                </p>
            </div>

            {/* Layout do Kanban (Scrol Horizontal se necessário) */}
            <div className="flex h-[calc(100vh-220px)] min-h-[600px] gap-6 overflow-x-auto pb-4 snap-x">
                {colunas.map((coluna) => {
                    const pedidosDaColuna = pedidosAtivos.filter(
                        (p) => p.status === coluna.id,
                    );

                    // Ordenação: Os que têm de ser entregues mais cedo aparecem primeiro
                    pedidosDaColuna.sort(
                        (a, b) =>
                            new Date(a.dataEntrega || a.criadoEm) -
                            new Date(b.dataEntrega || b.criadoEm),
                    );

                    return (
                        <div
                            key={coluna.id}
                            className={`flex-shrink-0 w-80 lg:w-96 flex flex-col rounded-3xl border-2 snap-start ${coluna.cor}`}
                        >
                            {/* Cabeçalho da Coluna */}
                            <div
                                className={`p-4 border-b border-black/5 flex justify-between items-center rounded-t-3xl ${coluna.cabecalho}`}
                            >
                                <h3
                                    className={`font-black flex items-center gap-2 ${coluna.texto}`}
                                >
                                    {coluna.icone} {coluna.titulo}
                                </h3>
                                <span className="bg-white/80 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                                    {pedidosDaColuna.length}
                                </span>
                            </div>

                            {/* Área de Cartões (Scroll Vertical Interno) */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                                {pedidosDaColuna.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
                                        <AlertCircle
                                            size={32}
                                            className={`mb-2 ${coluna.texto}`}
                                        />
                                        <p
                                            className={`text-sm font-bold ${coluna.texto}`}
                                        >
                                            Nenhum pedido aqui
                                        </p>
                                    </div>
                                ) : (
                                    pedidosDaColuna.map((pedido) => (
                                        <div
                                            key={pedido.id}
                                            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
                                        >
                                            {/* Topo do Cartão: Cliente e Hora */}
                                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                                                <div>
                                                    <p className="font-black text-slate-800 text-lg leading-tight">
                                                        {pedido.cliente}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                                                        <Clock size={12} />{" "}
                                                        Para:{" "}
                                                        <span className="font-bold text-slate-700">
                                                            {formatarData(
                                                                pedido.dataEntrega,
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Meio do Cartão: Lista de Itens Destacada */}
                                            <div className="p-4 flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                                    Itens a Preparar:
                                                </p>
                                                <ul className="space-y-2">
                                                    {(pedido.itens || []).map(
                                                        (item, i) => (
                                                            <li
                                                                key={i}
                                                                className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center"
                                                            >
                                                                <span className="font-bold text-slate-700 text-sm line-clamp-2">
                                                                    {item.nome}
                                                                </span>
                                                                <span className="bg-pink-100 text-pink-700 font-black px-2.5 py-1 rounded-lg text-sm flex-shrink-0 shadow-sm border border-pink-200">
                                                                    x
                                                                    {
                                                                        item.quantidade
                                                                    }
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>

                                                {pedido.endereco && (
                                                    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2">
                                                        <MapPin
                                                            size={16}
                                                            className="text-indigo-500 flex-shrink-0 mt-0.5"
                                                        />
                                                        <p className="text-xs text-indigo-800 font-medium">
                                                            {pedido.endereco}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fundo do Cartão: Botões de Ação (Apenas para não-entregues) */}
                                            {pedido.status !== "entregue" && (
                                                <div className="p-3 bg-slate-50 border-t border-slate-100">
                                                    {pedido.status ===
                                                        "agendado" && (
                                                        <button
                                                            onClick={() =>
                                                                atualizarStatus(
                                                                    pedido.id,
                                                                    "preparando",
                                                                )
                                                            }
                                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-md active:scale-95"
                                                        >
                                                            <Play size={18} />{" "}
                                                            Iniciar Preparo
                                                        </button>
                                                    )}
                                                    {pedido.status ===
                                                        "preparando" && (
                                                        <button
                                                            onClick={() =>
                                                                atualizarStatus(
                                                                    pedido.id,
                                                                    "pronto",
                                                                )
                                                            }
                                                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-md active:scale-95"
                                                        >
                                                            <Check size={18} />{" "}
                                                            Marcar como Pronto
                                                        </button>
                                                    )}
                                                    {pedido.status ===
                                                        "pronto" && (
                                                        <button
                                                            onClick={() =>
                                                                atualizarStatus(
                                                                    pedido.id,
                                                                    "entregue",
                                                                )
                                                            }
                                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-md active:scale-95"
                                                        >
                                                            <Truck size={18} />{" "}
                                                            Despachar (Entregue)
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
