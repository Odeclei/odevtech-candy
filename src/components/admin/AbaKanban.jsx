import { useState } from "react";
import {
    ChevronRight,
    CheckCircle,
    FileText,
    ExternalLink,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaKanban({
    pedidos,
    formatarItensPedido,
    formatarDinheiro,
    isHoje,
}) {
    // ==========================================
    // ESTADOS LOCAIS DO KANBAN
    // ==========================================
    const [editandoEntregaId, setEditandoEntregaId] = useState(null);
    const [saldoRecebido, setSaldoRecebido] = useState(false);

    // ==========================================
    // FUNÇÕES DO KANBAN
    // ==========================================
    const mudarStatus = async (id, status) => {
        try {
            await updateDoc(doc(db, "pedidos", id), { status });
        } catch (erro) {
            alert("Erro ao mudar o status do pedido.");
        }
    };

    const avisarClientePronto = (pedido) => {
        mudarStatus(pedido.id, "pronto");
        if (pedido.telefone) {
            const msg = `Olá, *${pedido.cliente}*! \n\nPassando para avisar que o seu pedido já está pronto para retirada/entrega! 🧁`;
            window.open(
                `https://wa.me/${pedido.telefone}?text=${encodeURIComponent(msg)}`,
                "_blank",
            );
        }
    };

    const iniciarEntrega = (id) => {
        setEditandoEntregaId(id);
        setSaldoRecebido(false);
    };

    const confirmarEntrega = async (pedido) => {
        if (!saldoRecebido) {
            if (
                !window.confirm(
                    "O saldo ainda não foi marcado como recebido. Deseja entregar assim mesmo?",
                )
            )
                return;
        }
        try {
            await updateDoc(doc(db, "pedidos", pedido.id), {
                status: "entregue",
                saldoPago: saldoRecebido,
            });
            setEditandoEntregaId(null);
            setSaldoRecebido(false);
        } catch (erro) {
            console.error("Erro ao entregar:", erro);
            alert("Erro ao confirmar a entrega.");
        }
    };

    const emitirNF = (pedido) => {
        alert(
            `Integração de Nota Fiscal (NFC-e) em breve!\n\nSerá emitida uma nota para ${pedido.cliente} no valor de ${formatarDinheiro(pedido.valorTotal)}.`,
        );
    };

    return (
        <div className="animate-in fade-in duration-300">
            {/* Grid atualizado para 4 colunas em telas muito grandes, ou 2 em telas médias */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Coluna 1: A Fazer */}
                <div className="bg-slate-200/50 rounded-3xl p-5 min-h-[500px]">
                    <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>{" "}
                        A Fazer
                    </h3>
                    <div className="space-y-4">
                        {pedidos
                            .filter((p) => {
                                if (p.status !== "agendado") return false;
                                const a = new Date();
                                a.setDate(a.getDate() + 1);
                                return (
                                    isHoje(p.dataEntrega) ||
                                    (p.dataEntrega &&
                                        p.dataEntrega.split("T")[0] ===
                                            a.toLocaleDateString("en-CA"))
                                );
                            })
                            .map((pedido) => (
                                <div
                                    key={pedido.id}
                                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <p
                                            className="font-bold text-slate-800 line-clamp-1"
                                            title={pedido.cliente}
                                        >
                                            {pedido.cliente}
                                        </p>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap ${isHoje(pedido.dataEntrega) ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-600"}`}
                                        >
                                            {isHoje(pedido.dataEntrega)
                                                ? "HOJE"
                                                : "AMANHÃ"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl">
                                        {formatarItensPedido(pedido.itens)}
                                    </p>
                                    <button
                                        onClick={() =>
                                            mudarStatus(
                                                pedido.id,
                                                "em_producao",
                                            )
                                        }
                                        className="w-full bg-amber-100 text-amber-700 hover:bg-amber-200 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center transition"
                                    >
                                        Iniciar{" "}
                                        <ChevronRight
                                            size={16}
                                            className="ml-1"
                                        />
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Coluna 2: Em Preparo */}
                <div className="bg-amber-50/60 rounded-3xl p-5 min-h-[500px]">
                    <h3 className="font-bold text-amber-800 mb-4 px-2 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>{" "}
                        Em Produção
                    </h3>
                    <div className="space-y-4">
                        {pedidos
                            .filter((p) => p.status === "em_producao")
                            .map((pedido) => (
                                <div
                                    key={pedido.id}
                                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-400"
                                >
                                    <p className="font-bold text-slate-800 mb-2">
                                        {pedido.cliente}
                                    </p>
                                    <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl">
                                        {formatarItensPedido(pedido.itens)}
                                    </p>
                                    <button
                                        onClick={() =>
                                            avisarClientePronto(pedido)
                                        }
                                        className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center transition"
                                    >
                                        <CheckCircle
                                            size={16}
                                            className="mr-2"
                                        />{" "}
                                        Marcar Pronto
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Coluna 3: Pronto (NOVA COLUNA) */}
                <div className="bg-emerald-50/60 rounded-3xl p-5 min-h-[500px]">
                    <h3 className="font-bold text-emerald-800 mb-4 px-2 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>{" "}
                        Pronto
                    </h3>
                    <div className="space-y-4">
                        {pedidos
                            .filter((p) => p.status === "pronto")
                            .map((pedido) => {
                                // Inteligência: Calcula quanto falta receber. Se já pagou sinal, falta metade. Se não, falta tudo.
                                const valorFaltante = pedido.sinalPago
                                    ? pedido.valorTotal / 2
                                    : pedido.valorTotal;

                                return (
                                    <div
                                        key={pedido.id}
                                        className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 border-l-4 border-l-emerald-400"
                                    >
                                        {/* CABEÇALHO DO CARD COM BOTÃO NF-E */}
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-slate-800 pr-2">
                                                {pedido.cliente}
                                            </p>

                                            {/* Integração do Botão de Nota Fiscal */}
                                            <div className="flex gap-2 flex-shrink-0">
                                                {pedido.urlNotaFiscal ? (
                                                    <a
                                                        href={
                                                            pedido.urlNotaFiscal
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                                                        title="Ver Nota Fiscal"
                                                    >
                                                        <FileText size={16} />
                                                    </a>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            emitirNota(pedido)
                                                        }
                                                        className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-pink-100 hover:text-pink-600 transition"
                                                        title="Emitir Nota Fiscal"
                                                    >
                                                        <ExternalLink
                                                            size={16}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                                            {formatarItensPedido(pedido.itens)}
                                        </p>

                                        {/* LÓGICA DE ENTREGA E SALDO INTACTA */}
                                        {editandoEntregaId === pedido.id ? (
                                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 space-y-3">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={saldoRecebido}
                                                        onChange={(e) =>
                                                            setSaldoRecebido(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="w-5 h-5 accent-emerald-600"
                                                    />
                                                    <span className="text-sm font-bold text-emerald-800 leading-tight">
                                                        Recebi{" "}
                                                        {formatarDinheiro(
                                                            valorFaltante,
                                                        )}{" "}
                                                        <br />
                                                        <span className="text-xs font-normal text-emerald-600">
                                                            (
                                                            {pedido.sinalPago
                                                                ? "Saldo final"
                                                                : "Valor total"}
                                                            )
                                                        </span>
                                                    </span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            confirmarEntrega(
                                                                pedido,
                                                            )
                                                        }
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs transition"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setEditandoEntregaId(
                                                                null,
                                                            )
                                                        }
                                                        className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-bold text-xs transition"
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    iniciarEntrega(pedido.id)
                                                }
                                                className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center transition"
                                            >
                                                <CheckCircle
                                                    size={16}
                                                    className="mr-2"
                                                />{" "}
                                                Entregar
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Coluna 4: Entregues (COM BOTÃO DE NF) */}
                <div className="bg-slate-100/60 rounded-3xl p-5 min-h-[500px]">
                    <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>{" "}
                        Entregues
                    </h3>
                    <div className="space-y-4">
                        {pedidos
                            .filter((p) => p.status === "entregue")
                            .map((pedido) => (
                                <div
                                    key={pedido.id}
                                    className="bg-white p-4 rounded-2xl border border-slate-200 opacity-80"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <p
                                            className="font-bold text-slate-500 line-through truncate mr-2"
                                            title={pedido.cliente}
                                        >
                                            {pedido.cliente}
                                        </p>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                            CONCLUÍDO
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-1">
                                        {formatarItensPedido(pedido.itens)}
                                    </p>

                                    {/* Botão de Nota Fiscal (Preparado para Integração Futura) */}
                                    <button
                                        onClick={() => emitirNF(pedido)}
                                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-bold text-xs flex justify-center items-center transition shadow-sm"
                                    >
                                        <FileText
                                            size={14}
                                            className="mr-1.5"
                                        />{" "}
                                        Emitir NF
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
