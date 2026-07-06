/* eslint-disable no-unused-vars */
//
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
    X,
    Hammer,
    Edit2,
    CheckCircle,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    getDoc,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaEstoque({ nomeDaLoja }) {
    const [abaAtual, setAbaAtual] = useState("inventario");
    const [produtos, setProdutos] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [busca, setBusca] = useState("");

    // Modais
    const [modalMoviOpen, setModalMoviOpen] = useState(false);
    const [modalProducaoOpen, setModalProducaoOpen] = useState(false);

    // Estados de Movimentação e Produção
    const [prodSelecionado, setProdSelecionado] = useState(null);
    const [formMovi, setFormMovi] = useState({
        tipo: "entrada",
        quantidade: "",
        custoTotal: "",
        motivo: "",
    });
    const [qtdProduzir, setQtdProduzir] = useState(1);
    const [salvandoProducao, setSalvandoProducao] = useState(false);
    const [salvandoMovi, setSalvandoMovi] = useState(false);

    // Estados da Ficha Técnica
    const [produtoFicha, setProdutoFicha] = useState(null);
    const [ingredientesFicha, setIngredientesFicha] = useState([]);
    const [novoIngredienteId, setNovoIngredienteId] = useState("");
    const [novaQtdIngrediente, setNovaQtdIngrediente] = useState("");
    const [salvandoFicha, setSalvandoFicha] = useState(false);

    // Estados de Novo Insumo (AGORA COM CUSTO PLANEJADO)
    const [modalNovoInsumoOpen, setModalNovoInsumoOpen] = useState(false);
    const [novoInsumoNome, setNovoInsumoNome] = useState("");
    const [novoInsumoCusto, setNovoInsumoCusto] = useState("");
    const [salvandoInsumo, setSalvandoInsumo] = useState(false);

    // Estados para Edição de Histórico
    const [modalEditMoviOpen, setModalEditMoviOpen] = useState(false);
    const [editMoviId, setEditMoviId] = useState(null);
    const [editMoviForm, setEditMoviForm] = useState({
        tipo: "entrada",
        quantidade: "",
        custoTotal: "",
        motivo: "",
        produtoId: "",
    });
    const [salvandoEdicaoMovi, setSalvandoEdicaoMovi] = useState(false);

    // Estado para Edição Rápida de Custo Base (Engenharia de Cardápio)
    const [editCustoId, setEditCustoId] = useState(null);
    const [editCustoValor, setEditCustoValor] = useState("");

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

    // ==========================================
    // CADASTRO DE INSUMO COM CUSTO TEÓRICO
    // ==========================================
    const cadastrarInsumoSimples = async (e) => {
        e.preventDefault();
        if (!novoInsumoNome) return;
        setSalvandoInsumo(true);
        try {
            await addDoc(collection(db, "produtos"), {
                loja: nomeDaLoja,
                nome: novoInsumoNome,
                ativo: false,
                controlarEstoque: true,
                estoqueAtual: 0,
                custoMedio: parseFloat(novoInsumoCusto) || 0, // Custo planejado entra aqui
                categoria: "Insumos e Matéria Prima",
                criadoEm: new Date().toISOString(),
            });
            setNovoInsumoNome("");
            setNovoInsumoCusto("");
            setModalNovoInsumoOpen(false);
        } catch (error) {
            alert("Erro ao cadastrar insumo.");
        } finally {
            setSalvandoInsumo(false);
        }
    };

    // ==========================================
    // ATUALIZAR CUSTO TEÓRICO MANUALMENTE (LÁPIS NA TABELA)
    // ==========================================
    const salvarCustoManual = async (id) => {
        try {
            await updateDoc(doc(db, "produtos", id), {
                custoMedio: parseFloat(editCustoValor) || 0,
            });
            setEditCustoId(null);
        } catch (e) {
            alert("Erro ao atualizar custo planejado.");
        }
    };

    const executarProducaoLote = async () => {
        if (!produtoFicha || qtdProduzir <= 0) return;
        setSalvandoProducao(true);

        try {
            for (const ing of ingredientesFicha) {
                const insumoRef = doc(db, "produtos", ing.id_insumo);
                const insumoSnap = await getDoc(insumoRef);
                if (insumoSnap.exists()) {
                    const stockAtual = insumoSnap.data().estoqueAtual || 0;
                    const necessario = ing.quantidade * qtdProduzir;
                    if (stockAtual < necessario) {
                        alert(
                            `❌ Falta stock de "${ing.nome_insumo}". Necessário: ${necessario}, disponível: ${stockAtual}`,
                        );
                        setSalvandoProducao(false);
                        return;
                    }
                }
            }

            for (const ing of ingredientesFicha) {
                const insumoRef = doc(db, "produtos", ing.id_insumo);
                const insumoSnap = await getDoc(insumoRef);
                const novoStockInsumo =
                    insumoSnap.data().estoqueAtual -
                    ing.quantidade * qtdProduzir;

                await updateDoc(insumoRef, { estoqueAtual: novoStockInsumo });
                await addDoc(collection(db, "movimentacoes_estoque"), {
                    loja: nomeDaLoja,
                    produtoId: ing.id_insumo,
                    produtoNome: ing.nome_insumo,
                    tipo: "saida",
                    quantidade: ing.quantidade * qtdProduzir,
                    motivo: `Produção de Lote: ${qtdProduzir}x ${produtoFicha.nome}`,
                    data: new Date().toISOString(),
                });
            }

            const prodRef = doc(db, "produtos", produtoFicha.id);
            const novoStockFinal =
                (produtoFicha.estoqueAtual || 0) + qtdProduzir;
            await updateDoc(prodRef, {
                estoqueAtual: novoStockFinal,
                controlarEstoque: true,
            });

            await addDoc(collection(db, "movimentacoes_estoque"), {
                loja: nomeDaLoja,
                produtoId: produtoFicha.id,
                produtoNome: produtoFicha.nome,
                tipo: "entrada",
                quantidade: qtdProduzir,
                motivo: "Entrada via Ordem de Produção",
                data: new Date().toISOString(),
            });

            alert(
                `✅ Sucesso! Foram produzidas ${qtdProduzir} unidades de "${produtoFicha.nome}" e os ingredientes foram baixados.`,
            );
            setModalProducaoOpen(false);
        } catch (error) {
            console.error(error);
            alert("Erro ao processar produção.");
        } finally {
            setSalvandoProducao(false);
        }
    };

    const registrarMovimentacao = async (e) => {
        e.preventDefault();
        setSalvandoMovi(true);
        try {
            const qtd = parseFloat(formMovi.quantidade);
            const estoqueAnterior = parseFloat(
                prodSelecionado.estoqueAtual || 0,
            );
            let novoEstoque = estoqueAnterior;
            let novoCustoMedio = parseFloat(prodSelecionado.custoMedio || 0);

            if (formMovi.tipo === "entrada") {
                const custoTotalEntrada = parseFloat(formMovi.custoTotal || 0);
                novoEstoque = estoqueAnterior + qtd;
                const valorEstoqueAnterior = estoqueAnterior * novoCustoMedio;
                novoCustoMedio =
                    (valorEstoqueAnterior + custoTotalEntrada) / novoEstoque;

                await addDoc(collection(db, "despesas"), {
                    loja: nomeDaLoja,
                    descricao: `Compra de Estoque: ${prodSelecionado.nome}`,
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
                custoMedio: novoCustoMedio,
                controlarEstoque: true,
            });

            await addDoc(collection(db, "movimentacoes_estoque"), {
                loja: nomeDaLoja,
                produtoId: prodSelecionado.id,
                produtoNome: prodSelecionado.nome,
                tipo: formMovi.tipo,
                quantidade: qtd,
                custoTotal:
                    formMovi.tipo === "entrada"
                        ? parseFloat(formMovi.custoTotal || 0)
                        : null,
                estoqueAnterior,
                estoqueNovo: novoEstoque,
                motivo: formMovi.motivo || "Ajuste Manual",
                data: new Date().toISOString(),
            });

            setModalMoviOpen(false);
            setFormMovi({
                tipo: "entrada",
                quantidade: "",
                custoTotal: "",
                motivo: "",
            });
        } catch (error) {
            console.error(error);
            alert("Erro ao movimentar.");
        } finally {
            setSalvandoMovi(false);
        }
    };

    const abrirEdicaoMovimentacao = (movi) => {
        setEditMoviId(movi.id);
        setEditMoviForm({
            tipo: movi.tipo || "entrada",
            quantidade: movi.quantidade || "",
            custoTotal: movi.custoTotal || "",
            motivo: movi.motivo || "",
            produtoId: movi.produtoId,
        });
        setModalEditMoviOpen(true);
    };

    const salvarEdicaoMovimentacao = async (e) => {
        e.preventDefault();
        setSalvandoEdicaoMovi(true);
        try {
            const moviAnterior = movimentacoes.find((m) => m.id === editMoviId);
            const produtoRef = doc(db, "produtos", moviAnterior.produtoId);
            const produtoSnap = await getDoc(produtoRef);

            if (produtoSnap.exists()) {
                let estoqueProduto = parseFloat(
                    produtoSnap.data().estoqueAtual || 0,
                );

                if (moviAnterior.tipo === "entrada") {
                    estoqueProduto -= parseFloat(moviAnterior.quantidade);
                } else {
                    estoqueProduto += parseFloat(moviAnterior.quantidade);
                }

                const novaQtd = parseFloat(editMoviForm.quantidade);
                if (editMoviForm.tipo === "entrada") {
                    estoqueProduto += novaQtd;
                } else {
                    estoqueProduto -= novaQtd;
                }

                await updateDoc(produtoRef, { estoqueAtual: estoqueProduto });
            }

            await updateDoc(doc(db, "movimentacoes_estoque", editMoviId), {
                tipo: editMoviForm.tipo,
                quantidade: parseFloat(editMoviForm.quantidade),
                motivo: editMoviForm.motivo,
                custoTotal:
                    editMoviForm.tipo === "entrada"
                        ? parseFloat(editMoviForm.custoTotal || 0)
                        : null,
                editadoEm: new Date().toISOString(),
            });

            setModalEditMoviOpen(false);
        } catch (err) {
            alert("Erro ao editar movimentação.");
        } finally {
            setSalvandoEdicaoMovi(false);
        }
    };

    const excluirMovimentacao = async (movi) => {
        if (
            !window.confirm(
                "Deseja realmente excluir este registo? O stock atual do produto será revertido.",
            )
        )
            return;
        try {
            const produtoRef = doc(db, "produtos", movi.produtoId);
            const produtoSnap = await getDoc(produtoRef);

            if (produtoSnap.exists()) {
                let estoqueProduto = parseFloat(
                    produtoSnap.data().estoqueAtual || 0,
                );
                if (movi.tipo === "entrada") {
                    estoqueProduto -= parseFloat(movi.quantidade);
                } else {
                    estoqueProduto += parseFloat(movi.quantidade);
                }
                await updateDoc(produtoRef, { estoqueAtual: estoqueProduto });
            }

            await deleteDoc(doc(db, "movimentacoes_estoque", movi.id));
        } catch (err) {
            alert("Erro ao excluir movimentação.");
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
        const novaLista = [
            ...ingredientesFicha,
            {
                id_insumo: insumo.id,
                nome_insumo: insumo.nome,
                quantidade: parseFloat(novaQtdIngrediente),
                custo_unitario_atual: insumo.custoMedio || 0,
            },
        ];
        setIngredientesFicha(novaLista);
        setNovoIngredienteId("");
        setNovaQtdIngrediente("");
    };

    const salvarFichaTecnica = async () => {
        setSalvandoFicha(true);
        const custoTotal = ingredientesFicha.reduce((acc, ing) => {
            const p = produtos.find((x) => x.id === ing.id_insumo);
            return acc + (p?.custoMedio || 0) * ing.quantidade;
        }, 0);
        try {
            await updateDoc(doc(db, "produtos", produtoFicha.id), {
                fichaTecnica: ingredientesFicha,
                custoMedio: custoTotal,
            });
            alert("Receita salva e custo atualizado!");
        } catch (e) {
            console.log(e);
            alert("Erro ao salvar.");
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
                    Técnicas
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
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setModalNovoInsumoOpen(true)}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition active:scale-95 w-full md:w-auto justify-center"
                        >
                            <Plus size={18} /> Novo Insumo Bruto
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs uppercase text-slate-500 font-bold bg-slate-50">
                                    <th className="p-4 rounded-tl-xl">
                                        Insumo / Produto
                                    </th>
                                    <th className="p-4 text-center">Tipo</th>
                                    <th className="p-4 text-center">
                                        Stock Atual
                                    </th>
                                    <th className="p-4 text-right">
                                        Custo Base / Médio
                                    </th>
                                    <th className="p-4 text-center rounded-tr-xl">
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
                                        const isRec =
                                            produto.fichaTecnica?.length > 0;
                                        return (
                                            <tr
                                                key={produto.id}
                                                className="hover:bg-slate-50/50"
                                            >
                                                <td className="p-4 font-bold">
                                                    {produto.nome}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isRec ? (
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-black">
                                                            RECEITA
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-black">
                                                            INSUMO
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center font-black text-lg">
                                                    {produto.estoqueAtual || 0}
                                                </td>

                                                {/* CÉLULA DO CUSTO COM EDIÇÃO INLINE */}
                                                <td className="p-4 text-right font-bold text-slate-600">
                                                    {editCustoId ===
                                                    produto.id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    editCustoValor
                                                                }
                                                                onChange={(e) =>
                                                                    setEditCustoValor(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-24 border p-1 rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-400"
                                                                placeholder="0.00"
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    salvarCustoManual(
                                                                        produto.id,
                                                                    )
                                                                }
                                                                className="text-emerald-600 hover:text-emerald-700"
                                                            >
                                                                <CheckCircle
                                                                    size={18}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setEditCustoId(
                                                                        null,
                                                                    )
                                                                }
                                                                className="text-slate-400 hover:text-red-500"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2 group">
                                                            <span>
                                                                {formatarDinheiro(
                                                                    produto.custoMedio,
                                                                )}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditCustoId(
                                                                        produto.id,
                                                                    );
                                                                    setEditCustoValor(
                                                                        produto.custoMedio ||
                                                                            "",
                                                                    );
                                                                }}
                                                                className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-600 transition-opacity"
                                                                title="Editar Custo Teórico Manualmente"
                                                            >
                                                                <Edit2
                                                                    size={14}
                                                                />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-4 text-center">
                                                    {!isRec && (
                                                        <button
                                                            onClick={() => {
                                                                setProdSelecionado(
                                                                    produto,
                                                                );
                                                                setModalMoviOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
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
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
                        <h3 className="font-black mb-4 flex items-center gap-2 text-slate-800">
                            <Beaker className="text-amber-500" /> Produto Final
                            / Base
                        </h3>
                        <select
                            onChange={(e) =>
                                selecionarProdutoParaFicha(e.target.value)
                            }
                            className="w-full bg-slate-50 border p-3 rounded-xl outline-none"
                            value={produtoFicha?.id || ""}
                        >
                            <option value="" disabled>
                                -- Selecionar Produto ou Base --
                            </option>
                            {produtos.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nome}{" "}
                                    {p.ativo === false
                                        ? " (Insumo/Base Invisível)"
                                        : ""}
                                </option>
                            ))}
                        </select>
                        {produtoFicha && (
                            <div className="mt-6 space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                    <p className="text-[10px] font-black text-emerald-800 uppercase">
                                        Custo de Produção (Teórico)
                                    </p>
                                    <p className="text-3xl font-black text-emerald-600">
                                        {formatarDinheiro(
                                            produtoFicha.custoMedio,
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setModalProducaoOpen(true)}
                                    className="w-full bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-amber-700 transition flex items-center justify-center gap-2"
                                >
                                    <Hammer size={20} /> Produzir Lote
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        {produtoFicha ? (
                            <div>
                                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                    <h2 className=" text-slate-800 text-2xl font-black">
                                        {produtoFicha.nome}
                                    </h2>
                                    <button
                                        onClick={salvarFichaTecnica}
                                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
                                    >
                                        <Save size={18} /> Salvar Receita
                                    </button>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border mb-6 flex gap-3">
                                    <select
                                        value={novoIngredienteId}
                                        onChange={(e) =>
                                            setNovoIngredienteId(e.target.value)
                                        }
                                        className="flex-1 border p-2.5 rounded-xl outline-none"
                                    >
                                        <option value="" disabled>
                                            Adicionar Insumo/Ingrediente...
                                        </option>
                                        {produtos
                                            .filter(
                                                (p) => p.id !== produtoFicha.id,
                                            )
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nome}
                                                </option>
                                            ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={novaQtdIngrediente}
                                        onChange={(e) =>
                                            setNovaQtdIngrediente(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Qtd"
                                        className="w-24 border p-2.5 rounded-xl outline-none"
                                    />
                                    <button
                                        onClick={adicionarIngredienteFicha}
                                        className="bg-slate-900 text-white p-3 rounded-xl"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {ingredientesFicha.map((ing, idx) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-center p-4 border rounded-xl bg-white"
                                        >
                                            <p className="font-bold">
                                                {ing.nome_insumo} (
                                                {ing.quantidade})
                                            </p>
                                            <button
                                                onClick={() =>
                                                    setIngredientesFicha(
                                                        ingredientesFicha.filter(
                                                            (_, i) => i !== idx,
                                                        ),
                                                    )
                                                }
                                                className="text-red-400 bg-red-50 p-2 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-slate-400">
                                <ChefHat
                                    size={48}
                                    className="mx-auto opacity-30 mb-2"
                                />
                                <p className="font-bold">
                                    Selecione um item no menu ao lado para
                                    montar a receita.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {abaAtual === "historico" && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-slate-800 font-black mb-6">
                        Histórico de Movimentações
                    </h3>
                    <div className="space-y-3">
                        {movimentacoes.slice(0, 50).map((m) => (
                            <div
                                key={m.id}
                                className="flex justify-between items-center p-4 border rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex gap-4 items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${m.tipo === "entrada" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                                    >
                                        {m.tipo === "entrada" ? (
                                            <TrendingUp size={20} />
                                        ) : (
                                            <TrendingDown size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            {m.produtoNome}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(m.data).toLocaleString()}{" "}
                                            • {m.motivo}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <p
                                        className={`font-black text-lg ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}
                                    >
                                        {m.tipo === "entrada" ? "+" : "-"}
                                        {m.quantidade}
                                    </p>
                                    <div className="flex gap-2 border-l pl-4 border-slate-200">
                                        <button
                                            onClick={() =>
                                                abrirEdicaoMovimentacao(m)
                                            }
                                            className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shadow-sm transition"
                                            title="Editar Valor/Quantidade"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                excluirMovimentacao(m)
                                            }
                                            className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg shadow-sm transition"
                                            title="Excluir Registo"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL DE ORDEM DE PRODUÇÃO */}
            {modalProducaoOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Hammer className="text-amber-500" /> Nova Ordem
                                de Produção
                            </h2>
                            <button
                                onClick={() => setModalProducaoOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl mb-6">
                            <p className="text-xs font-black text-slate-400 uppercase">
                                Item a Produzir
                            </p>
                            <p className="text-xl font-bold text-slate-800">
                                {produtoFicha.nome}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Quantidade de Lotes (Ex: 2 bolos)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={qtdProduzir}
                                    onChange={(e) =>
                                        setQtdProduzir(parseInt(e.target.value))
                                    }
                                    className="w-full border-2 border-slate-200 p-4 rounded-2xl outline-none focus:border-amber-500 text-2xl font-black"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Isto irá abater automaticamente os
                                    ingredientes do stock de insumos.
                                </p>
                            </div>
                            <button
                                onClick={executarProducaoLote}
                                disabled={salvandoProducao}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {salvandoProducao
                                    ? "A Processar Transformação..."
                                    : "Confirmar Produção e Baixar Insumos"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE MOVIMENTAÇÃO MANUAL */}
            {modalMoviOpen && prodSelecionado && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">
                                Ajustar Stock Manual
                            </h2>
                            <button
                                onClick={() => setModalMoviOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form
                            onSubmit={registrarMovimentacao}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormMovi({
                                            ...formMovi,
                                            tipo: "entrada",
                                        })
                                    }
                                    className={`p-4 border-2 rounded-xl font-bold ${formMovi.tipo === "entrada" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "text-slate-400"}`}
                                >
                                    ENTRADA
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormMovi({
                                            ...formMovi,
                                            tipo: "saida",
                                        })
                                    }
                                    className={`p-4 border-2 rounded-xl font-bold ${formMovi.tipo === "saida" ? "border-red-500 bg-red-50 text-red-700" : "text-slate-400"}`}
                                >
                                    SAÍDA
                                </button>
                            </div>
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
                                placeholder="Qtd"
                                className="w-full border p-3 rounded-xl outline-none"
                            />
                            {formMovi.tipo === "entrada" && (
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
                                    placeholder="Custo Total NF (R$)"
                                    className="w-full border p-3 rounded-xl outline-none"
                                />
                            )}
                            <input
                                type="text"
                                value={formMovi.motivo}
                                onChange={(e) =>
                                    setFormMovi({
                                        ...formMovi,
                                        motivo: e.target.value,
                                    })
                                }
                                placeholder="Motivo/NF"
                                className="w-full border p-3 rounded-xl outline-none"
                            />
                            <button
                                type="submit"
                                disabled={salvandoMovi}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl"
                            >
                                Confirmar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR MOVIMENTAÇÃO DO HISTÓRICO */}
            {modalEditMoviOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border-4 border-amber-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 text-amber-600">
                                    Editar Lançamento
                                </h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">
                                    O stock do produto será recalculado.
                                </p>
                            </div>
                            <button
                                onClick={() => setModalEditMoviOpen(false)}
                                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={salvarEdicaoMovimentacao}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditMoviForm({
                                            ...editMoviForm,
                                            tipo: "entrada",
                                        })
                                    }
                                    className={`p-4 border-2 rounded-xl font-bold ${editMoviForm.tipo === "entrada" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "text-slate-400"}`}
                                >
                                    ENTRADA
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditMoviForm({
                                            ...editMoviForm,
                                            tipo: "saida",
                                        })
                                    }
                                    className={`p-4 border-2 rounded-xl font-bold ${editMoviForm.tipo === "saida" ? "border-red-500 bg-red-50 text-red-700" : "text-slate-400"}`}
                                >
                                    SAÍDA
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                                    Quantidade Correta
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={editMoviForm.quantidade}
                                    onChange={(e) =>
                                        setEditMoviForm({
                                            ...editMoviForm,
                                            quantidade: e.target.value,
                                        })
                                    }
                                    className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>

                            {editMoviForm.tipo === "entrada" && (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                                        Custo Total NF Atualizado (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editMoviForm.custoTotal}
                                        onChange={(e) =>
                                            setEditMoviForm({
                                                ...editMoviForm,
                                                custoTotal: e.target.value,
                                            })
                                        }
                                        className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">
                                    Motivo / Observação
                                </label>
                                <input
                                    type="text"
                                    value={editMoviForm.motivo}
                                    onChange={(e) =>
                                        setEditMoviForm({
                                            ...editMoviForm,
                                            motivo: e.target.value,
                                        })
                                    }
                                    className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={salvandoEdicaoMovi}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl active:scale-95 transition mt-2"
                            >
                                {salvandoEdicaoMovi
                                    ? "Recalculando..."
                                    : "Salvar e Atualizar Stock"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CADASTRAR NOVO INSUMO INVISÍVEL (COM CUSTO PLANEJADO) */}
            {modalNovoInsumoOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">
                                Cadastrar Insumo Bruto
                            </h2>
                            <button
                                onClick={() => setModalNovoInsumoOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form
                            onSubmit={cadastrarInsumoSimples}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    Nome da Matéria-Prima
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Saco de Farinha de Trigo 5kg"
                                    value={novoInsumoNome}
                                    onChange={(e) =>
                                        setNovoInsumoNome(e.target.value)
                                    }
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    Custo Planejado (R$) - Opcional
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 25.50"
                                    value={novoInsumoCusto}
                                    onChange={(e) =>
                                        setNovoInsumoCusto(e.target.value)
                                    }
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Útil para Engenharia de Cardápio antes da
                                    primeira compra.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={salvandoInsumo}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition mt-4 disabled:opacity-50"
                            >
                                {salvandoInsumo
                                    ? "A salvar..."
                                    : "Gravar Insumo e Voltar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
