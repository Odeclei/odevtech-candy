// src/components/admin/AbaLeitorTickets.jsx
import React, { useState, useEffect, useRef } from "react";
import { ticketService } from "../../services/ticketService";
import { Search, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function AbaLeitorTickets({ nomeDaLoja }) {
    const [codigoBusca, setCodigoBusca] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [mensagem, setMensagem] = useState("");
    const [feedbackColor, setFeedbackColor] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const piscarTela = (cor) => {
        const overlay = document.getElementById("feedback-overlay");
        if (overlay) {
            overlay.className = `fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 ${
                cor === "green" ? "bg-emerald-500" : "bg-red-500"
            }`;
            overlay.style.opacity = "0.6";
            setTimeout(() => (overlay.style.opacity = "0"), 800);
            setTimeout(() => {
                overlay.style.opacity = "0";
                overlay.className =
                    "fixed inset-0 z-50 pointer-events-none opacity-0 transition-opacity duration-300";
            }, 1100);
        }
    };

    const lerTicket = async () => {
        const codigo = codigoBusca.trim();
        if (!codigo) return;

        setCarregando(true);
        setMensagem("");
        setFeedbackColor("");
        setResultado(null);

        try {
            console.log("🔍 Buscando ticket:", codigo);
            const encontrado =
                await ticketService.buscarTicketPorCodigo(codigo);
            console.log("📦 Ticket encontrado:", encontrado);

            if (!encontrado) {
                setMensagem("❌ Ticket não encontrado");
                setFeedbackColor("red");
                piscarTela("red");
                return;
            }

            // =============================================
            // VERIFICAR SE É UM TICKET INDIVIDUAL VÁLIDO
            // =============================================
            if (!encontrado.isIndividual || !encontrado.produtoId) {
                setMensagem("❌ Este ticket não é válido para consumo no bar");
                setFeedbackColor("red");
                piscarTela("red");
                return;
            }

            // Validar data e status
            const agora = new Date();
            const dataValidade =
                encontrado.dataValidade?.toDate?.() ||
                new Date(encontrado.dataValidade);
            const dataVenda =
                encontrado.dataVenda?.toDate?.() ||
                new Date(encontrado.dataVenda);
            const hojeStr = agora.toISOString().split("T")[0];
            const validadeStr = dataValidade.toISOString().split("T")[0];
            const vendaStr = dataVenda.toISOString().split("T")[0];

            let valido = true;
            let motivo = "";

            if (encontrado.status !== "ativo") {
                valido = false;
                motivo = "Ticket já utilizado";
            } else if (validadeStr < hojeStr) {
                valido = false;
                motivo = "Fora de validade";
            } else if (encontrado.validadeDiaria && vendaStr !== hojeStr) {
                valido = false;
                motivo = "Válido apenas hoje";
            } else if (encontrado.saldo <= 0) {
                valido = false;
                motivo = "Saldo zerado";
            }

            if (!valido) {
                setResultado({
                    valido: false,
                    motivo,
                    ticket: encontrado,
                    produto: encontrado.itemNome || "Produto",
                    valor: encontrado.itemPreco || 0,
                    saldo: encontrado.saldo || 0,
                });
                setMensagem(`❌ ${motivo}`);
                setFeedbackColor("red");
                piscarTela("red");
                return;
            }

            // ==========================================
            // ✅ TICKET VÁLIDO → CONSUMIR (BAIXA ESTOQUE)
            // ==========================================
            const produtoId = encontrado.produtoId;
            const quantidade = 1;
            const valorUnitario = encontrado.itemPreco || 0;
            const nomeProduto = encontrado.itemNome || "Produto";

            console.log(
                `🔄 Consumindo: ${quantidade}x ${nomeProduto} (ID: ${produtoId})`,
            );

            const novoSaldo = await ticketService.consumirItem(
                encontrado.id,
                produtoId,
                quantidade,
                valorUnitario,
                nomeProduto,
                nomeDaLoja,
            );

            console.log(`✅ Saldo atualizado: R$ ${novoSaldo.toFixed(2)}`);

            const ticketAtualizado = {
                ...encontrado,
                saldo: novoSaldo,
                status: novoSaldo === 0 ? "consumido" : "ativo",
            };

            setResultado({
                valido: true,
                motivo: "Liberado",
                ticket: ticketAtualizado,
                produto: nomeProduto,
                valor: valorUnitario,
                saldo: novoSaldo,
            });

            setMensagem(`✅ Liberado! ${nomeProduto}`);
            setFeedbackColor("green");
            piscarTela("green");
        } catch (error) {
            console.error("❌ Erro ao processar ticket:", error);
            setMensagem(`❌ Erro: ${error.message || "Falha ao processar"}`);
            setFeedbackColor("red");
            piscarTela("red");
        } finally {
            setCarregando(false);
            setCodigoBusca("");
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            lerTicket();
        }
    };

    const formatarDataSimples = (timestamp) => {
        if (!timestamp) return "Data inválida";
        try {
            const date = timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);
            if (isNaN(date.getTime())) return "Data inválida";
            return date.toLocaleDateString("pt-BR");
        } catch {
            return "Data inválida";
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-start">
            <div
                id="feedback-overlay"
                className="fixed inset-0 z-50 pointer-events-none opacity-0 transition-opacity duration-300"
            />

            <div className="w-full max-w-3xl">
                <h2 className="text-3xl font-black text-slate-800 mb-6 text-center flex items-center justify-center gap-3">
                    <Search size={36} className="text-indigo-600" />
                    Leitor de Tickets (Bar)
                </h2>

                <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-slate-200 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Leia ou digite o código do ticket..."
                            value={codigoBusca}
                            onChange={(e) =>
                                setCodigoBusca(e.target.value.toUpperCase())
                            }
                            onKeyDown={handleKeyDown}
                            className="flex-1 border-4 border-slate-300 p-6 rounded-2xl text-3xl font-mono uppercase tracking-widest text-center focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 outline-none transition"
                            autoFocus
                        />
                        <button
                            onClick={lerTicket}
                            disabled={carregando}
                            className="bg-indigo-600 text-white px-10 py-6 rounded-2xl text-2xl font-black hover:bg-indigo-700 transition active:scale-95 shadow-lg flex items-center justify-center gap-4 min-w-[180px]"
                        >
                            <Search size={32} />
                            {carregando ? "Lendo..." : "Ler Ticket"}
                        </button>
                    </div>
                </div>

                {mensagem && (
                    <div
                        className={`p-6 rounded-3xl mb-6 text-4xl font-bold text-center shadow-lg border-4 transition-all ${
                            feedbackColor === "green"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-red-100 text-red-800 border-red-300"
                        }`}
                    >
                        {mensagem}
                    </div>
                )}

                {resultado && (
                    <div className="bg-white rounded-3xl shadow-2xl border-4 p-6 space-y-4">
                        <div className="flex justify-center">
                            <div
                                className={`px-8 py-4 rounded-2xl text-4xl font-black border-4 ${
                                    resultado.valido
                                        ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                                        : "bg-red-100 border-red-400 text-red-700"
                                }`}
                            >
                                {resultado.valido ? (
                                    <span className="flex items-center gap-3">
                                        <CheckCircle size={40} /> LIBERADO
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-3">
                                        <XCircle size={40} /> BLOQUEADO
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400">
                                    Código
                                </p>
                                <p className="font-mono text-xl font-black text-slate-800">
                                    {resultado.ticket?.codigo || "N/A"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase font-bold text-slate-400">
                                    Produto
                                </p>
                                <p className="text-2xl font-black text-slate-800">
                                    {resultado.produto || "N/A"}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400">
                                    Saldo
                                </p>
                                <p
                                    className={`text-2xl font-black ${resultado.saldo > 0 ? "text-emerald-600" : "text-red-600"}`}
                                >
                                    R$ {resultado.saldo?.toFixed(2) || "0,00"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400">
                                    Validade
                                </p>
                                <p className="text-lg font-bold text-slate-700">
                                    {formatarDataSimples(
                                        resultado.ticket?.dataValidade,
                                    )}
                                </p>
                                {resultado.ticket?.validadeDiaria && (
                                    <span className="text-xs font-bold text-blue-600">
                                        (Somente hoje)
                                    </span>
                                )}
                            </div>
                        </div>

                        {resultado.ticket?.itensConsumidos?.length > 0 && (
                            <div className="border-t-2 border-slate-200 pt-4">
                                <p className="text-sm font-bold text-slate-600 mb-2">
                                    Últimos consumos:
                                </p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {resultado.ticket.itensConsumidos.map(
                                        (item, idx) => {
                                            const qtd = item.quantidade || 0;
                                            const valor =
                                                item.valorUnitario || 0;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between text-sm border-b border-slate-100 py-1"
                                                >
                                                    <span>
                                                        {qtd}x{" "}
                                                        {item.nome || "Item"}
                                                    </span>
                                                    <span className="font-bold">
                                                        R${" "}
                                                        {(qtd * valor).toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!resultado && !carregando && !mensagem && (
                    <div className="bg-slate-200 p-16 rounded-3xl border-4 border-dashed border-slate-400 text-center text-slate-500">
                        <AlertTriangle
                            size={80}
                            className="mx-auto mb-4 opacity-50"
                        />
                        <p className="text-3xl font-bold">Aguardando leitura</p>
                        <p className="text-xl">Leia o código do ticket</p>
                    </div>
                )}
            </div>
        </div>
    );
}
