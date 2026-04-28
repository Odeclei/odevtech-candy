import { useState, useEffect } from "react";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    Trash2,
    Calendar,
    FileText,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaFinanceiro({
    nomeDaLoja,
    pedidos,
    formatarDinheiro,
}) {
    const [despesas, setDespesas] = useState([]);
    const [comandas, setComandas] = useState([]); // NOVO ESTADO: Comandas do Bar

    const [novaDescricao, setNovaDescricao] = useState("");
    const [novoValor, setNovoValor] = useState("");
    const [novaData, setNovaData] = useState(
        new Date().toISOString().split("T")[0],
    );
    const [novaCategoria, setNovaCategoria] = useState("Ingredientes");
    const [salvando, setSalvando] = useState(false);

    // Filtros de Data
    const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
    const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

    // 1. Buscar Despesas no Firebase
    useEffect(() => {
        const q = query(
            collection(db, "despesas"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) => {
            setDespesas(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            );
        });
    }, [nomeDaLoja]);

    // 2. Buscar Comandas (Bar/Mesas) no Firebase
    useEffect(() => {
        const q = query(
            collection(db, "comandas"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) => {
            setComandas(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            );
        });
    }, [nomeDaLoja]);

    const adicionarDespesa = async (e) => {
        e.preventDefault();
        if (!novaDescricao || !novoValor) return;
        setSalvando(true);
        try {
            await addDoc(collection(db, "despesas"), {
                loja: nomeDaLoja,
                descricao: novaDescricao,
                valor: parseFloat(novoValor),
                data: novaData,
                categoria: novaCategoria,
                criadoEm: new Date().toISOString(),
            });
            setNovaDescricao("");
            setNovoValor("");
            alert("Despesa adicionada!");
        } catch (erro) {
            alert("Erro ao adicionar despesa.");
        } finally {
            setSalvando(false);
        }
    };

    const apagarDespesa = async (id) => {
        if (window.confirm("Tem a certeza que deseja apagar esta despesa?")) {
            await deleteDoc(doc(db, "despesas", id));
        }
    };

    // ==========================================
    // CÁLCULOS DO FLUXO DE CAIXA UNIFICADO
    // ==========================================

    // Processar o dinheiro recebido nas Mesas/Comandas
    const receitasComandas = comandas
        .map((c) => {
            let pago = 0;
            (c.itens || []).forEach((item) => {
                pago += (item.qtd_paga || 0) * item.preco;
            });
            const taxaPaga = pago * 0.1;
            const totalPago = pago + taxaPaga;

            return {
                id: c.id,
                tipo: "receita",
                descricao: `${c.identificador} (${c.cliente})`,
                categoria: "Bar / Salão",
                valor: totalPago,
                data: c.abertaEm
                    ? c.abertaEm.split("T")[0]
                    : new Date().toISOString().split("T")[0],
            };
        })
        .filter((t) => t.valor > 0); // Só entra no caixa se a mesa já pagou alguma coisa

    // Unificar Pedidos (Delivery), Comandas (Bar) e Despesas
    const transacoesDoMes = [
        ...pedidos
            .filter((p) => p.status === "entregue" || p.status === "pronto")
            .map((p) => {
                const dataRef = p.dataEntrega
                    ? p.dataEntrega.split("T")[0]
                    : p.criadoEm.split("T")[0];
                return {
                    id: p.id,
                    tipo: "receita",
                    descricao: `Pedido: ${p.cliente}`,
                    categoria: "Delivery / Encomenda",
                    valor: p.valorTotal || 0,
                    data: dataRef,
                };
            }),
        ...receitasComandas,
        ...despesas.map((d) => ({
            id: d.id,
            tipo: "despesa",
            descricao: d.descricao,
            categoria: d.categoria,
            valor: d.valor,
            data: d.data,
        })),
    ]
        .filter((t) => {
            // Filtrar pelo Mês e Ano selecionados
            const d = new Date(t.data + "T12:00:00"); // Força o fuso horário correto
            return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro;
        })
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    const totalReceitas = transacoesDoMes
        .filter((t) => t.tipo === "receita")
        .reduce((acc, t) => acc + t.valor, 0);
    const totalDespesas = transacoesDoMes
        .filter((t) => t.tipo === "despesa")
        .reduce((acc, t) => acc + t.valor, 0);
    const saldoLiquido = totalReceitas - totalDespesas;
    const margemLucro =
        totalReceitas > 0
            ? ((saldoLiquido / totalReceitas) * 100).toFixed(1)
            : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header com Filtro de Mês */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Calendar size={20} className="text-blue-600" />
                    Competência:
                </div>
                <div className="flex gap-2">
                    <select
                        value={mesFiltro}
                        onChange={(e) => setMesFiltro(Number(e.target.value))}
                        className="border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-medium text-slate-700"
                    >
                        {[
                            "Janeiro",
                            "Fevereiro",
                            "Março",
                            "Abril",
                            "Maio",
                            "Junho",
                            "Julho",
                            "Agosto",
                            "Setembro",
                            "Outubro",
                            "Novembro",
                            "Dezembro",
                        ].map((m, i) => (
                            <option key={i} value={i}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <select
                        value={anoFiltro}
                        onChange={(e) => setAnoFiltro(Number(e.target.value))}
                        className="border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-medium text-slate-700"
                    >
                        {[2024, 2025, 2026].map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100">
                    <p className="text-sm font-bold text-slate-500 mb-1">
                        Receitas (Vendas)
                    </p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-emerald-600">
                            {formatarDinheiro(totalReceitas)}
                        </p>
                        <TrendingUp size={24} className="text-emerald-300" />
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100">
                    <p className="text-sm font-bold text-slate-500 mb-1">
                        Despesas (Custos)
                    </p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-red-500">
                            {formatarDinheiro(totalDespesas)}
                        </p>
                        <TrendingDown size={24} className="text-red-300" />
                    </div>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <p className="text-sm font-bold text-slate-500 mb-1">
                        Saldo Líquido
                    </p>
                    <div className="flex justify-between items-end">
                        <p
                            className={`text-3xl font-black ${saldoLiquido >= 0 ? "text-slate-800" : "text-red-600"}`}
                        >
                            {formatarDinheiro(saldoLiquido)}
                        </p>
                        <DollarSign size={24} className="text-slate-300" />
                    </div>
                </div>
                <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 text-white">
                    <p className="text-sm font-bold text-slate-400 mb-1">
                        Margem de Lucro
                    </p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-blue-400">
                            {margemLucro}%
                        </p>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded-lg text-slate-300 font-medium">
                            Sobre Vendas
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lançamento de Despesas */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingDown className="text-red-500" /> Lançar Despesa
                    </h3>
                    <form onSubmit={adicionarDespesa} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Descrição
                            </label>
                            <input
                                type="text"
                                required
                                value={novaDescricao}
                                onChange={(e) =>
                                    setNovaDescricao(e.target.value)
                                }
                                placeholder="Ex: Fornecedor de Bebidas"
                                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Valor (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={novoValor}
                                    onChange={(e) =>
                                        setNovoValor(e.target.value)
                                    }
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Data
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={novaData}
                                    onChange={(e) =>
                                        setNovaData(e.target.value)
                                    }
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Categoria
                            </label>
                            <select
                                value={novaCategoria}
                                onChange={(e) =>
                                    setNovaCategoria(e.target.value)
                                }
                                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                            >
                                <option value="Ingredientes">
                                    Ingredientes / Bebidas
                                </option>
                                <option value="Embalagens">Embalagens</option>
                                <option value="Custos Fixos">
                                    Custos Fixos (Luz, Água, Aluguel)
                                </option>
                                <option value="Marketing">
                                    Marketing / Tráfego
                                </option>
                                <option value="Equipa">
                                    Pagamento Equipa / Garçons
                                </option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={salvando}
                            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 mt-2"
                        >
                            <Plus size={18} />{" "}
                            {salvando ? "A registar..." : "Registar Saída"}
                        </button>
                    </form>
                </div>

                {/* Extrato Mensal Unificado */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FileText className="text-slate-400" /> Extrato do Mês
                    </h3>

                    <div className="space-y-3">
                        {transacoesDoMes.length === 0 ? (
                            <p className="text-slate-400 italic text-center py-8 bg-slate-50 rounded-2xl">
                                Nenhuma movimentação neste mês.
                            </p>
                        ) : (
                            transacoesDoMes.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition bg-slate-50/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipo === "receita" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}
                                        >
                                            {t.tipo === "receita" ? (
                                                <TrendingUp size={18} />
                                            ) : (
                                                <TrendingDown size={18} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 line-clamp-1">
                                                {t.descricao}
                                            </p>
                                            <div className="flex items-center flex-wrap gap-2 mt-1">
                                                <span className="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md font-medium">
                                                    {t.data
                                                        .split("-")
                                                        .reverse()
                                                        .join("/")}
                                                </span>
                                                {/* BADGE DINÂMICO PARA IDENTIFICAR A ORIGEM DO DINHEIRO */}
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                        t.categoria ===
                                                        "Bar / Salão"
                                                            ? "bg-amber-100 text-amber-700"
                                                            : t.categoria ===
                                                                "Delivery / Encomenda"
                                                              ? "bg-pink-100 text-pink-700"
                                                              : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {t.categoria}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p
                                            className={`font-black text-lg ${t.tipo === "receita" ? "text-emerald-600" : "text-red-500"}`}
                                        >
                                            {t.tipo === "receita" ? "+" : "-"}
                                            {formatarDinheiro(t.valor)}
                                        </p>
                                        {t.tipo === "despesa" && (
                                            <button
                                                onClick={() =>
                                                    apagarDespesa(t.id)
                                                }
                                                className="text-red-300 hover:text-red-600 transition p-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
