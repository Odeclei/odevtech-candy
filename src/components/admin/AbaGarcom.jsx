import React, { useState, useEffect } from "react";
import { Search, Plus, Minus, Send, Users } from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaGarcom({ nomeDaLoja }) {
    const [comandas, setComandas] = useState([]);
    const [produtosMenu, setProdutosMenu] = useState([]);
    const [busca, setBusca] = useState("");

    const [telaAtual, setTelaAtual] = useState("lista");
    const [comandaAtiva, setComandaAtiva] = useState(null);

    const [itensLancamento, setItensLancamento] = useState({});
    const [categoriaAtiva, setCategoriaAtiva] = useState("");

    useEffect(() => {
        if (!nomeDaLoja) return;
        const unComandas = onSnapshot(
            query(
                collection(db, "comandas"),
                where("loja", "==", nomeDaLoja),
                where("status", "==", "aberta"),
            ),
            (snap) => {
                setComandas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
        );
        const unProdutos = onSnapshot(
            query(
                collection(db, "produtos"),
                where("loja", "==", nomeDaLoja),
                where("ativo", "==", true),
            ),
            (snap) => {
                const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setProdutosMenu(prods);
                if (prods.length > 0)
                    setCategoriaAtiva(prods[0].categoria || "Geral");
            },
        );
        return () => {
            unComandas();
            unProdutos();
        };
    }, [nomeDaLoja]);

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);

    const abrirMesa = async () => {
        const identificador = window.prompt(
            "Digite o Número da Mesa ou Nome do Cliente:",
        );
        if (!identificador) return;

        try {
            const novaComanda = await addDoc(collection(db, "comandas"), {
                loja: nomeDaLoja,
                identificador: identificador,
                cliente: "Cliente Salão",
                tipo: "mesa",
                status: "aberta",
                itens: [],
                abertaEm: new Date().toISOString(),
            });
            setComandaAtiva({ id: novaComanda.id, identificador, itens: [] });
            setTelaAtual("lancamento");
        } catch (error) {
            alert("Erro ao abrir mesa.");
        }
    };

    const iniciarLancamento = (comanda) => {
        setComandaAtiva(comanda);
        setItensLancamento({});
        setTelaAtual("lancamento");
    };

    const alterarQuantidade = (produtoId, delta) => {
        const qtdAtual = itensLancamento[produtoId] || 0;
        const novaQtd = Math.max(0, qtdAtual + delta);
        setItensLancamento({ ...itensLancamento, [produtoId]: novaQtd });
    };

    const enviarPedido = async () => {
        const produtosParaLancar = Object.entries(itensLancamento).filter(
            ([_, qtd]) => qtd > 0,
        );
        if (produtosParaLancar.length === 0) {
            setTelaAtual("lista");
            return;
        }

        // =========================================================
        // PASSO 1: A CATRACA DO STOCK (Verificação)
        // =========================================================
        for (const [prodId, qtdParaAdicionar] of produtosParaLancar) {
            const produtoInfo = produtosMenu.find((p) => p.id === prodId);
            if (produtoInfo?.controlarEstoque) {
                if ((produtoInfo.estoqueAtual || 0) < qtdParaAdicionar) {
                    alert(
                        `❌ Erro: O produto "${produtoInfo.nome}" tem apenas ${produtoInfo.estoqueAtual || 0} unidades em stock.`,
                    );
                    return; // Interrompe o envio se faltar stock
                }
            }
        }

        // =========================================================
        // PASSO 2: ENVIAR PEDIDO E DAR BAIXA
        // =========================================================
        try {
            const itensAtuais = [...(comandaAtiva.itens || [])];

            for (const [prodId, qtdParaAdicionar] of produtosParaLancar) {
                const produtoInfo = produtosMenu.find((p) => p.id === prodId);

                // Adicionar na comanda
                const indexExistente = itensAtuais.findIndex(
                    (i) => i.id_produto === prodId,
                );
                if (indexExistente >= 0) {
                    itensAtuais[indexExistente].qtd_total += qtdParaAdicionar;
                } else {
                    itensAtuais.push({
                        id_produto: produtoInfo.id,
                        nome: produtoInfo.nome,
                        preco: produtoInfo.preco,
                        qtd_total: qtdParaAdicionar,
                        qtd_paga: 0,
                    });
                }

                // Dar Baixa no Stock Automática
                if (produtoInfo?.controlarEstoque) {
                    const novoEstoque =
                        (produtoInfo.estoqueAtual || 0) - qtdParaAdicionar;

                    await updateDoc(doc(db, "produtos", produtoInfo.id), {
                        estoqueAtual: novoEstoque,
                    });

                    await addDoc(collection(db, "movimentacoes_estoque"), {
                        loja: nomeDaLoja,
                        produtoId: produtoInfo.id,
                        produtoNome: produtoInfo.nome,
                        tipo: "saida",
                        quantidade: qtdParaAdicionar,
                        estoqueAnterior: produtoInfo.estoqueAtual || 0,
                        estoqueNovo: novoEstoque,
                        motivo: `Lançamento via Garçom (${comandaAtiva.identificador})`,
                        data: new Date().toISOString(),
                    });
                }
            }

            await updateDoc(doc(db, "comandas", comandaAtiva.id), {
                itens: itensAtuais,
            });

            alert("✅ Pedido enviado para produção e stock atualizado!");
            setItensLancamento({});
            setTelaAtual("lista");
            setComandaAtiva(null);
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar pedido.");
        }
    };

    const categoriasPresentes = [
        ...new Set(produtosMenu.map((p) => p.categoria || "Geral")),
    ].sort();
    const comandasFiltradas = comandas.filter((c) =>
        c.identificador.toLowerCase().includes(busca.toLowerCase()),
    );
    const totalItensLancando = Object.values(itensLancamento).reduce(
        (a, b) => a + b,
        0,
    );

    if (telaAtual === "lista") {
        return (
            <div className="max-w-md mx-auto space-y-4 pb-24 animate-in fade-in">
                <div className="bg-amber-600 text-white p-6 rounded-b-3xl shadow-md -mx-6 lg:mx-0 mt-0 lg:mt-6 mb-6">
                    <h2 className="text-2xl font-black mb-4">Salão & Mesas</h2>
                    <div className="relative">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-200"
                            size={20}
                        />
                        <input
                            type="text"
                            placeholder="Buscar mesa..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full bg-amber-700/50 text-white placeholder-amber-200 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-white outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {comandasFiltradas.map((comanda) => (
                        <button
                            key={comanda.id}
                            onClick={() => iniciarLancamento(comanda)}
                            className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition active:scale-95 min-h-[120px]"
                        >
                            <Users size={32} className="text-amber-500 mb-2" />
                            <span className="font-black text-slate-800 text-xl">
                                {comanda.identificador}
                            </span>
                            <span className="text-xs text-slate-400 font-bold mt-1">
                                {comanda.itens?.length || 0} Itens Lançados
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={abrirMesa}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition active:scale-90 z-50"
                >
                    <Plus size={32} />
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto flex flex-col h-[calc(100vh-100px)] -mx-6 lg:mx-0 -mt-6 lg:mt-0 bg-slate-50 animate-in slide-in-from-right">
            <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">
                        Lançando na
                    </p>
                    <h2 className="text-xl font-black text-slate-800">
                        {comandaAtiva.identificador}
                    </h2>
                </div>
                <button
                    onClick={() => setTelaAtual("lista")}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm"
                >
                    Voltar
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto p-4 bg-white border-b border-slate-100 snap-x no-scrollbar">
                {categoriasPresentes.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategoriaAtiva(cat)}
                        className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap snap-start transition ${categoriaAtiva === cat ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
                {produtosMenu
                    .filter((p) => (p.categoria || "Geral") === categoriaAtiva)
                    .map((produto) => {
                        const selecionados = itensLancamento[produto.id] || 0;

                        // NOVO: Feedback visual rápido se o stock estiver no fim
                        const stockAviso = produto.controlarEstoque
                            ? ` (${produto.estoqueAtual} unid.)`
                            : "";

                        return (
                            <div
                                key={produto.id}
                                className={`bg-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between border-2 transition gap-4 ${selecionados > 0 ? "border-amber-400 shadow-sm" : "border-slate-100"}`}
                            >
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800">
                                        {produto.nome}
                                        <span className="text-xs text-slate-400 font-medium ml-1">
                                            {stockAviso}
                                        </span>
                                    </h3>
                                    <p className="text-sm font-bold text-amber-600">
                                        {formatarDinheiro(produto.preco)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-end sm:self-auto">
                                    <button
                                        onClick={() =>
                                            alterarQuantidade(produto.id, -1)
                                        }
                                        className="w-10 h-10 rounded-lg bg-white text-slate-600 font-bold shadow-sm flex items-center justify-center disabled:opacity-50"
                                        disabled={selecionados === 0}
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <span
                                        className={`font-black w-6 text-center text-lg ${selecionados > 0 ? "text-amber-600" : "text-slate-400"}`}
                                    >
                                        {selecionados}
                                    </span>
                                    <button
                                        onClick={() =>
                                            alterarQuantidade(produto.id, 1)
                                        }
                                        className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 font-bold shadow-sm flex items-center justify-center"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="bg-white p-4 border-t border-slate-200 fixed bottom-0 left-0 right-0 md:static z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <button
                    onClick={enviarPedido}
                    disabled={totalItensLancando === 0}
                    className="w-full max-w-md mx-auto bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 transition active:scale-95"
                >
                    <Send size={20} />
                    {totalItensLancando > 0
                        ? `Enviar ${totalItensLancando} Itens para Preparo`
                        : "Selecione produtos para enviar"}
                </button>
            </div>
        </div>
    );
}
