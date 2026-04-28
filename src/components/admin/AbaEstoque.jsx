import React, { useState, useEffect } from "react";
import {
    Package,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    History,
    X,
    DollarSign,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaEstoque({ nomeDaLoja }) {
    const [produtos, setProdutos] = useState([]);
    const [busca, setBusca] = useState("");

    // Modal de Movimentação
    const [produtoSelecionado, setProdutoSelecionado] = useState(null);
    const [tipoMovimento, setTipoMovimento] = useState("entrada"); // 'entrada' ou 'saida'
    const [quantidade, setQuantidade] = useState("");
    const [custoUnitario, setCustoUnitario] = useState(""); // NOVO: Para cálculo do Custo Médio
    const [motivo, setMotivo] = useState("");
    const [processando, setProcessando] = useState(false);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const q = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
            where("ativo", "==", true),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProdutos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [nomeDaLoja]);

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);

    const alternarControleEstoque = async (produto) => {
        try {
            await updateDoc(doc(db, "produtos", produto.id), {
                controlarEstoque: !produto.controlarEstoque,
                estoqueAtual: produto.estoqueAtual || 0,
                custoMedio: produto.custoMedio || 0, // Inicializa o custo médio a zero
            });
        } catch (error) {
            alert("Erro ao alterar configuração de estoque.");
        }
    };

    const registrarMovimentacao = async (e) => {
        e.preventDefault();
        if (!quantidade || parseInt(quantidade) <= 0)
            return alert("Insira uma quantidade válida.");

        if (
            tipoMovimento === "entrada" &&
            (!custoUnitario || parseFloat(custoUnitario) < 0)
        )
            return alert("Insira um custo unitário válido para a compra.");

        setProcessando(true);

        const qtdNumero = parseInt(quantidade);
        const estoqueAtual = produtoSelecionado.estoqueAtual || 0;
        const novoEstoque =
            tipoMovimento === "entrada"
                ? estoqueAtual + qtdNumero
                : estoqueAtual - qtdNumero;

        if (tipoMovimento === "saida" && novoEstoque < 0) {
            setProcessando(false);
            return alert(
                "Não pode dar saída em mais itens do que os que existem no estoque.",
            );
        }

        // ==========================================
        // MATEMÁTICA DO CUSTO MÉDIO PONDERADO
        // ==========================================
        let novoCustoMedio = produtoSelecionado.custoMedio || 0;

        if (tipoMovimento === "entrada") {
            const custoDaCompra = parseFloat(custoUnitario);
            // Fórmula: [(Estoque Atual * Custo Antigo) + (Nova Qtd * Novo Custo)] / Novo Estoque Total
            const valorEstoqueAntigo = estoqueAtual * novoCustoMedio;
            const valorNovaCompra = qtdNumero * custoDaCompra;

            novoCustoMedio =
                (valorEstoqueAntigo + valorNovaCompra) / novoEstoque;
        }

        try {
            // 1. Atualiza o saldo e o novo Custo Médio no produto
            await updateDoc(doc(db, "produtos", produtoSelecionado.id), {
                estoqueAtual: novoEstoque,
                custoMedio: novoCustoMedio,
            });

            // 2. Grava no log de auditoria
            await addDoc(collection(db, "movimentacoes_estoque"), {
                loja: nomeDaLoja,
                produtoId: produtoSelecionado.id,
                produtoNome: produtoSelecionado.nome,
                tipo: tipoMovimento,
                quantidade: qtdNumero,
                custoUnitarioLancado:
                    tipoMovimento === "entrada"
                        ? parseFloat(custoUnitario)
                        : null,
                estoqueAnterior: estoqueAtual,
                estoqueNovo: novoEstoque,
                custoMedioResultante: novoCustoMedio,
                motivo:
                    motivo ||
                    (tipoMovimento === "entrada"
                        ? "Compra/Reposição"
                        : "Quebra/Ajuste Manual"),
                data: new Date().toISOString(),
            });

            setProdutoSelecionado(null);
            setQuantidade("");
            setCustoUnitario("");
            setMotivo("");
            alert("Estoque e Custo Médio atualizados com sucesso!");
        } catch (error) {
            alert("Erro ao registar movimentação.");
        } finally {
            setProcessando(false);
        }
    };

    const produtosFiltrados = produtos.filter(
        (p) =>
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            (p.categoria || "").toLowerCase().includes(busca.toLowerCase()),
    );

    const produtosEmAlerta = produtos.filter(
        (p) => p.controlarEstoque && (p.estoqueAtual || 0) <= 5,
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* TOPO: ALERTAS E BUSCA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                    <div className="relative w-full">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={20}
                        />
                        <input
                            type="text"
                            placeholder="Buscar bebida ou produto para gerir estoque..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                    </div>
                </div>
                <div
                    className={`p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${produtosEmAlerta.length > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}
                >
                    <div
                        className={`p-3 rounded-full ${produtosEmAlerta.length > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
                    >
                        {produtosEmAlerta.length > 0 ? (
                            <AlertTriangle size={24} />
                        ) : (
                            <Package size={24} />
                        )}
                    </div>
                    <div>
                        <p
                            className={`text-sm font-bold ${produtosEmAlerta.length > 0 ? "text-red-800" : "text-emerald-800"}`}
                        >
                            {produtosEmAlerta.length > 0
                                ? "Atenção ao Estoque"
                                : "Estoque Saudável"}
                        </p>
                        <p
                            className={`text-xl font-black ${produtosEmAlerta.length > 0 ? "text-red-600" : "text-emerald-600"}`}
                        >
                            {produtosEmAlerta.length}{" "}
                            <span className="text-sm font-medium">
                                itens na reserva
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* LISTAGEM DE PRODUTOS */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider border-b border-slate-200">
                                <th className="p-5">Produto</th>
                                <th className="p-5 text-center">
                                    Controlar Estoque?
                                </th>
                                <th className="p-5 text-center">Qtd Atual</th>
                                <th className="p-5 text-right">Custo Médio</th>
                                <th className="p-5 text-right">
                                    Acertar Saldo
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {produtosFiltrados.map((produto) => (
                                <tr
                                    key={produto.id}
                                    className={`hover:bg-slate-50 transition-colors ${produto.controlarEstoque && produto.estoqueAtual <= 5 ? "bg-red-50/30" : ""}`}
                                >
                                    <td className="p-5">
                                        <p className="font-bold text-slate-800">
                                            {produto.nome}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {produto.categoria}
                                        </p>
                                    </td>
                                    <td className="p-5 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={
                                                    produto.controlarEstoque ||
                                                    false
                                                }
                                                onChange={() =>
                                                    alternarControleEstoque(
                                                        produto,
                                                    )
                                                }
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </td>
                                    <td className="p-5 text-center">
                                        {produto.controlarEstoque ? (
                                            <span
                                                className={`font-black text-lg px-4 py-1.5 rounded-xl ${produto.estoqueAtual <= 5 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-700"}`}
                                            >
                                                {produto.estoqueAtual || 0}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-300 font-medium">
                                                Livre
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-5 text-right">
                                        {produto.controlarEstoque ? (
                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                {formatarDinheiro(
                                                    produto.custoMedio || 0,
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-300 font-medium">
                                                --
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-5 text-right">
                                        {produto.controlarEstoque && (
                                            <button
                                                onClick={() =>
                                                    setProdutoSelecionado(
                                                        produto,
                                                    )
                                                }
                                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                                            >
                                                Movimentar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE MOVIMENTAÇÃO */}
            {produtoSelecionado && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <Package className="text-blue-600" />{" "}
                                    Movimentar Estoque
                                </h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">
                                    {produtoSelecionado.nome}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setProdutoSelecionado(null);
                                    setCustoUnitario("");
                                    setQuantidade("");
                                }}
                                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                                    Saldo
                                </span>
                                <span className="text-2xl font-black text-slate-800">
                                    {produtoSelecionado.estoqueAtual || 0}
                                </span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                                    Custo Médio
                                </span>
                                <span className="text-xl font-black text-emerald-800">
                                    {formatarDinheiro(
                                        produtoSelecionado.custoMedio || 0,
                                    )}
                                </span>
                            </div>
                        </div>

                        <form
                            onSubmit={registrarMovimentacao}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <label
                                    className={`border-2 rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${tipoMovimento === "entrada" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                                >
                                    <input
                                        type="radio"
                                        name="tipoMov"
                                        value="entrada"
                                        checked={tipoMovimento === "entrada"}
                                        onChange={() =>
                                            setTipoMovimento("entrada")
                                        }
                                        className="hidden"
                                    />
                                    <ArrowUpRight
                                        className={
                                            tipoMovimento === "entrada"
                                                ? "text-emerald-500"
                                                : "text-slate-400"
                                        }
                                    />
                                    <span
                                        className={`font-bold text-sm text-center leading-tight ${tipoMovimento === "entrada" ? "text-emerald-700" : "text-slate-500"}`}
                                    >
                                        Entrada (Compra)
                                    </span>
                                </label>
                                <label
                                    className={`border-2 rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${tipoMovimento === "saida" ? "border-red-500 bg-red-50" : "border-slate-200 hover:bg-slate-50"}`}
                                >
                                    <input
                                        type="radio"
                                        name="tipoMov"
                                        value="saida"
                                        checked={tipoMovimento === "saida"}
                                        onChange={() =>
                                            setTipoMovimento("saida")
                                        }
                                        className="hidden"
                                    />
                                    <ArrowDownRight
                                        className={
                                            tipoMovimento === "saida"
                                                ? "text-red-500"
                                                : "text-slate-400"
                                        }
                                    />
                                    <span
                                        className={`font-bold text-sm text-center leading-tight ${tipoMovimento === "saida" ? "text-red-700" : "text-slate-500"}`}
                                    >
                                        Saída (Quebra/Venda)
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className={
                                        tipoMovimento === "saida"
                                            ? "col-span-2"
                                            : "col-span-1"
                                    }
                                >
                                    <label className="block text-sm font-bold text-slate-600 mb-1">
                                        Quantidade
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={quantidade}
                                        onChange={(e) =>
                                            setQuantidade(e.target.value)
                                        }
                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none font-bold text-lg"
                                        placeholder="Ex: 24"
                                    />
                                </div>

                                {tipoMovimento === "entrada" && (
                                    <div className="col-span-1 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-bold text-slate-600 mb-1">
                                            Custo Unitário (R$)
                                        </label>
                                        <div className="relative">
                                            <DollarSign
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                required
                                                value={custoUnitario}
                                                onChange={(e) =>
                                                    setCustoUnitario(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full pl-9 pr-3 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-lg bg-emerald-50 text-emerald-900"
                                                placeholder="Ex: 5.50"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Motivo (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                                    placeholder={
                                        tipoMovimento === "entrada"
                                            ? "Ex: NF 12345 Fornecedor X"
                                            : "Ex: Garrafa partida"
                                    }
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processando}
                                className={`w-full font-bold py-4 rounded-xl transition flex justify-center items-center gap-2 mt-4 text-white ${tipoMovimento === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                            >
                                {processando
                                    ? "A registar..."
                                    : "Confirmar Movimentação"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
