import React, { useState, useEffect } from "react";
import {
    Package,
    TrendingUp,
    TrendingDown,
    Search,
    Plus,
    Save,
    Trash2,
    ChefHat,
    Beaker,
    ListOrdered,
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
    const [abaAtual, setAbaAtual] = useState("inventario");
    const [produtos, setProdutos] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [busca, setBusca] = useState("");

    const [modalMoviOpen, setModalMoviOpen] = useState(false);
    const [prodSelecionado, setProdSelecionado] = useState(null);
    const [formMovi, setFormMovi] = useState({
        tipo: "entrada",
        quantidade: "",
        custoTotal: "",
        motivo: "",
    });
    const [salvandoMovi, setSalvandoMovi] = useState(false);

    const [produtoFicha, setProdutoFicha] = useState(null);
    const [ingredientesFicha, setIngredientesFicha] = useState([]);
    const [novoIngredienteId, setNovoIngredienteId] = useState("");
    const [novaQtdIngrediente, setNovaQtdIngrediente] = useState("");
    const [salvandoFicha, setSalvandoFicha] = useState(false);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const unProdutos = onSnapshot(
            query(collection(db, "produtos"), where("loja", "==", nomeDaLoja)),
            (snap) => {
                setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
        );
        const unMovi = onSnapshot(
            query(
                collection(db, "movimentacoes_estoque"),
                where("loja", "==", nomeDaLoja),
            ),
            (snap) => {
                setMovimentacoes(
                    snap.docs
                        .map((d) => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => new Date(b.data) - new Date(a.data)),
                );
            },
        );
        return () => {
            unProdutos();
            unMovi();
        };
    }, [nomeDaLoja]);

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);
    const formatarData = (iso) =>
        iso ? new Date(iso).toLocaleString("pt-BR") : "--";

    // ==========================================
    // LÓGICA DE MOVIMENTAÇÃO + INTEGRAÇÃO FINANCEIRA
    // ==========================================
    const registrarMovimentacao = async (e) => {
        e.preventDefault();
        setSalvandoMovi(true);

        try {
            const qtd = parseFloat(formMovi.quantidade);
            const estoqueAnterior = parseFloat(
                prodSelecionado.estoqueAtual || 0,
            );
            let novoEstoque = estoqueAnterior;
            let novoCustoMedio = parseFloat(prodSelecionado.custo || 0);

            if (formMovi.tipo === "entrada") {
                const custoTotalEntrada = parseFloat(formMovi.custoTotal);
                novoEstoque = estoqueAnterior + qtd;
                const valorEstoqueAnterior = estoqueAnterior * novoCustoMedio;
                novoCustoMedio =
                    (valorEstoqueAnterior + custoTotalEntrada) / novoEstoque;

                // -> NOVA MÁGICA: LANÇAMENTO AUTOMÁTICO NO FINANCEIRO
                await addDoc(collection(db, "despesas"), {
                    loja: nomeDaLoja,
                    descricao: `Compra de Estoque: ${prodSelecionado.nome} (Qtd: ${qtd})`,
                    categoria: "Estoque e Insumos",
                    valor: custoTotalEntrada,
                    data: new Date().toISOString().split("T")[0],
                    criadoEm: new Date().toISOString(),
                });
            } else {
                novoEstoque = estoqueAnterior - qtd;
            }

            await updateDoc(doc(db, "produtos", prodSelecionado.id), {
                estoqueAtual: novoEstoque,
                custo: novoCustoMedio,
                controlarEstoque: true,
            });

            await addDoc(collection(db, "movimentacoes_estoque"), {
                loja: nomeDaLoja,
                produtoId: prodSelecionado.id,
                produtoNome: prodSelecionado.nome,
                tipo: formMovi.tipo,
                quantidade: qtd,
                custoUnitarioNestaAcao:
                    formMovi.tipo === "entrada"
                        ? parseFloat(formMovi.custoTotal) / qtd
                        : novoCustoMedio,
                estoqueAnterior,
                estoqueNovo: novoEstoque,
                motivo:
                    formMovi.motivo ||
                    (formMovi.tipo === "entrada"
                        ? "Compra/Reposição"
                        : "Baixa/Perda"),
                data: new Date().toISOString(),
            });

            setModalMoviOpen(false);
            setFormMovi({
                tipo: "entrada",
                quantidade: "",
                custoTotal: "",
                motivo: "",
            });

            if (formMovi.tipo === "entrada") {
                alert(
                    "✅ Estoque atualizado e Despesa lançada automaticamente no Financeiro!",
                );
            } else {
                alert("✅ Baixa de estoque registrada com sucesso!");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao registrar movimentação.");
        } finally {
            setSalvandoMovi(false);
        }
    };

    const selecionarProdutoParaFicha = (prodId) => {
        const prod = produtos.find((p) => p.id === prodId);
        setProdutoFicha(prod);
        setIngredientesFicha(prod.fichaTecnica || []);
    };

    const adicionarIngredienteFicha = () => {
        if (!novoIngredienteId || !novaQtdIngrediente) return;
        const insumo = produtos.find((p) => p.id === novoIngredienteId);
        const novoIngrediente = {
            id_insumo: insumo.id,
            nome_insumo: insumo.nome,
            quantidade: parseFloat(novaQtdIngrediente),
            custo_unitario_atual: insumo.custo || 0,
        };
        const existeIndex = ingredientesFicha.findIndex(
            (i) => i.id_insumo === novoIngredienteId,
        );
        let novaLista = [...ingredientesFicha];
        if (existeIndex >= 0)
            novaLista[existeIndex].quantidade += novoIngrediente.quantidade;
        else novaLista.push(novoIngrediente);
        setIngredientesFicha(novaLista);
        setNovoIngredienteId("");
        setNovaQtdIngrediente("");
    };

    const removerIngredienteFicha = (id_insumo) =>
        setIngredientesFicha(
            ingredientesFicha.filter((i) => i.id_insumo !== id_insumo),
        );

    const custoTotalDaFicha = ingredientesFicha.reduce((acc, ing) => {
        const prodInsumo = produtos.find((p) => p.id === ing.id_insumo);
        const custoReal = prodInsumo
            ? prodInsumo.custo
            : ing.custo_unitario_atual;
        return acc + custoReal * ing.quantidade;
    }, 0);

    const salvarFichaTecnica = async () => {
        setSalvandoFicha(true);
        try {
            await updateDoc(doc(db, "produtos", produtoFicha.id), {
                fichaTecnica: ingredientesFicha,
                custo: custoTotalDaFicha,
            });
            alert("Ficha Técnica (Receita) salva com sucesso!");
        } catch (error) {
            alert("Erro ao salvar Ficha Técnica.");
        } finally {
            setSalvandoFicha(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex gap-2 border-b border-slate-200 mb-8 pb-px overflow-x-auto">
                <button
                    onClick={() => setAbaAtual("inventario")}
                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "inventario" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                    <Package size={18} className="inline mr-2" /> Inventário
                    Atual
                </button>
                <button
                    onClick={() => setAbaAtual("fichas")}
                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "fichas" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                    <ChefHat size={18} className="inline mr-2" /> Fichas
                    Técnicas (Receitas)
                </button>
                <button
                    onClick={() => setAbaAtual("historico")}
                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "historico" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                    <ListOrdered size={18} className="inline mr-2" /> Histórico
                </button>
            </div>

            {abaAtual === "inventario" && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="relative w-full md:w-96">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                size={20}
                            />
                            <input
                                type="text"
                                placeholder="Buscar insumo ou produto..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                    <th className="p-4 border-b border-slate-100">
                                        Insumo / Produto
                                    </th>
                                    <th className="p-4 border-b border-slate-100 text-center">
                                        Tipo
                                    </th>
                                    <th className="p-4 border-b border-slate-100 text-center">
                                        Estoque Atual
                                    </th>
                                    <th className="p-4 border-b border-slate-100 text-right">
                                        Custo Médio
                                    </th>
                                    <th className="p-4 border-b border-slate-100 text-center">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {produtos
                                    .filter((p) =>
                                        p.nome
                                            .toLowerCase()
                                            .includes(busca.toLowerCase()),
                                    )
                                    .map((produto) => {
                                        const isComposto =
                                            produto.fichaTecnica &&
                                            produto.fichaTecnica.length > 0;
                                        const isInsumo =
                                            produto.ativo === false &&
                                            !isComposto; // Lógica simples para identificar insumos
                                        return (
                                            <tr
                                                key={produto.id}
                                                className="hover:bg-slate-50/50 transition-colors"
                                            >
                                                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                                    {produto.nome}
                                                    {isInsumo && (
                                                        <span className="bg-slate-200 text-slate-600 text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest">
                                                            Apenas Insumo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isComposto ? (
                                                        <span className="bg-purple-100 text-purple-700 text-[10px] uppercase font-black px-2 py-1 rounded-md">
                                                            Receita
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-50 text-blue-600 text-[10px] uppercase font-black px-2 py-1 rounded-md">
                                                            Bruto
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isComposto ? (
                                                        <span className="text-slate-400 text-xs italic">
                                                            Soma dos Insumos
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`font-black text-lg ${produto.estoqueAtual <= 5 ? "text-red-500" : "text-emerald-600"}`}
                                                        >
                                                            {produto.estoqueAtual ||
                                                                0}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-bold text-slate-600">
                                                    {formatarDinheiro(
                                                        produto.custo || 0,
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {!isComposto && (
                                                        <button
                                                            onClick={() => {
                                                                setProdSelecionado(
                                                                    produto,
                                                                );
                                                                setModalMoviOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
                                                        >
                                                            Movimentar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {abaAtual === "fichas" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                            <Beaker size={20} className="text-amber-500" />{" "}
                            Escolha o Produto Final
                        </h3>
                        <select
                            onChange={(e) =>
                                selecionarProdutoParaFicha(e.target.value)
                            }
                            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                            value={produtoFicha?.id || ""}
                        >
                            <option value="" disabled>
                                -- Selecione para editar --
                            </option>
                            {produtos
                                .filter((p) => p.ativo !== false)
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome}
                                    </option>
                                ))}
                        </select>
                        {produtoFicha && (
                            <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">
                                    Custo Real do Prato/Drink
                                </p>
                                <p className="text-3xl font-black text-emerald-600">
                                    {formatarDinheiro(custoTotalDaFicha)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        {!produtoFicha ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <ChefHat
                                    size={48}
                                    className="mb-4 opacity-50"
                                />
                                <p className="font-bold">
                                    Selecione um produto ao lado.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">
                                            {produtoFicha.nome}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={salvarFichaTecnica}
                                        disabled={salvandoFicha}
                                        className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2"
                                    >
                                        <Save size={18} /> Salvar Receita
                                    </button>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 flex gap-3">
                                    <div className="flex-1">
                                        <select
                                            value={novoIngredienteId}
                                            onChange={(e) =>
                                                setNovoIngredienteId(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full border border-slate-200 p-2.5 rounded-xl outline-none"
                                        >
                                            <option value="" disabled>
                                                Selecione Insumo...
                                            </option>
                                            {produtos
                                                .filter(
                                                    (p) =>
                                                        p.id !==
                                                        produtoFicha.id,
                                                )
                                                .map((p) => (
                                                    <option
                                                        key={p.id}
                                                        value={p.id}
                                                    >
                                                        {p.nome}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={novaQtdIngrediente}
                                            onChange={(e) =>
                                                setNovaQtdIngrediente(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Qtd"
                                            className="w-full border border-slate-200 p-2.5 rounded-xl outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={adicionarIngredienteFicha}
                                        className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {ingredientesFicha.map((ing, idx) => {
                                        const prodAt = produtos.find(
                                            (p) => p.id === ing.id_insumo,
                                        );
                                        return (
                                            <div
                                                key={idx}
                                                className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-white"
                                            >
                                                <p className="font-bold text-slate-800">
                                                    {ing.nome_insumo} (
                                                    {ing.quantidade})
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        removerIngredienteFicha(
                                                            ing.id_insumo,
                                                        )
                                                    }
                                                    className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {abaAtual === "historico" && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <ListOrdered size={20} className="text-slate-400" />{" "}
                        Histórico
                    </h3>
                    <div className="space-y-3">
                        {movimentacoes.slice(0, 50).map((mov) => (
                            <div
                                key={mov.id}
                                className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-slate-50"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${mov.tipo === "entrada" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                                    >
                                        {mov.tipo === "entrada" ? (
                                            <TrendingUp size={20} />
                                        ) : (
                                            <TrendingDown size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            {mov.produtoNome} (
                                            {mov.tipo.toUpperCase()})
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatarData(mov.data)} • Motivo:{" "}
                                            {mov.motivo}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p
                                        className={`font-black text-lg ${mov.tipo === "entrada" ? "text-emerald-600" : "text-red-500"}`}
                                    >
                                        {mov.tipo === "entrada" ? "+" : "-"}
                                        {mov.quantidade}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {modalMoviOpen && prodSelecionado && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">
                                Movimentar Estoque
                            </h2>
                            <button
                                onClick={() => setModalMoviOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-4">
                            {prodSelecionado.nome}
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormMovi({
                                        ...formMovi,
                                        tipo: "entrada",
                                    })
                                }
                                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 font-bold transition ${formMovi.tipo === "entrada" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`}
                            >
                                <TrendingUp size={24} /> Entrada (Compra)
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormMovi({ ...formMovi, tipo: "saida" })
                                }
                                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 font-bold transition ${formMovi.tipo === "saida" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-400"}`}
                            >
                                <TrendingDown size={24} /> Saída (Perda)
                            </button>
                        </div>
                        <form
                            onSubmit={registrarMovimentacao}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Quantidade
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formMovi.quantidade}
                                    onChange={(e) =>
                                        setFormMovi({
                                            ...formMovi,
                                            quantidade: e.target.value,
                                        })
                                    }
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>
                            {formMovi.tipo === "entrada" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                        Custo Total Pago (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formMovi.custoTotal}
                                        onChange={(e) =>
                                            setFormMovi({
                                                ...formMovi,
                                                custoTotal: e.target.value,
                                            })
                                        }
                                        placeholder="Valor da nota fiscal"
                                        className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Motivo (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={formMovi.motivo}
                                    onChange={(e) =>
                                        setFormMovi({
                                            ...formMovi,
                                            motivo: e.target.value,
                                        })
                                    }
                                    placeholder="Ex: NF 12345"
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={salvandoMovi}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition mt-2"
                            >
                                {salvandoMovi
                                    ? "Processando..."
                                    : "Confirmar Movimentação"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
