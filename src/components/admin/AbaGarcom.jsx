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
    getDoc,
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
                if (prods.length > 0 && !categoriaAtiva)
                    setCategoriaAtiva(prods[0].categoria || "Outros");
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

    const abrirMesa = (comanda) => {
        setComandaAtiva(comanda);
        setItensLancamento({});
        setTelaAtual("lancamento");
    };

    const alterarQuantidade = (produtoId, delta) => {
        setItensLancamento((prev) => {
            const atual = prev[produtoId] || 0;
            const nova = Math.max(0, atual + delta);
            return { ...prev, [produtoId]: nova };
        });
    };

    const totalItensLancando = Object.values(itensLancamento).reduce(
        (a, b) => a + b,
        0,
    );
    const categorias = [
        ...new Set(produtosMenu.map((p) => p.categoria || "Outros")),
    ];

    // ==========================================
    // MOTOR DE BAIXA DE ESTOQUE E RECEITAS
    // ==========================================
    const enviarPedido = async () => {
        const produtosParaLancar = Object.entries(itensLancamento).filter(
            ([_, qtd]) => qtd > 0,
        );
        if (produtosParaLancar.length === 0) {
            setTelaAtual("lista");
            return;
        }

        try {
            const itensAtuais = [...(comandaAtiva.itens || [])];
            const itensParaKDS = [];

            for (const [prodId, qtdParaAdicionar] of produtosParaLancar) {
                const produtoInfo = produtosMenu.find((p) => p.id === prodId);
                itensParaKDS.push({
                    id: produtoInfo.id,
                    nome: produtoInfo.nome,
                    preco: produtoInfo.preco,
                    quantidade: qtdParaAdicionar,
                });

                const indexExistente = itensAtuais.findIndex(
                    (i) => i.id_produto === prodId,
                );
                if (indexExistente >= 0)
                    itensAtuais[indexExistente].qtd_total += qtdParaAdicionar;
                else
                    itensAtuais.push({
                        id_produto: produtoInfo.id,
                        nome: produtoInfo.nome,
                        preco: produtoInfo.preco,
                        qtd_total: qtdParaAdicionar,
                        qtd_paga: 0,
                    });

                // LÓGICA DE BAIXA INTELIGENTE (RECEITA OU PRODUTO SIMPLES)
                const prodRef = doc(db, "produtos", prodId);
                const prodSnap = await getDoc(prodRef);

                if (prodSnap.exists()) {
                    const prodDB = prodSnap.data();

                    if (prodDB.fichaTecnica && prodDB.fichaTecnica.length > 0) {
                        // É UMA RECEITA: Descontar os ingredientes (Ex: ML de Gin)
                        for (const ing of prodDB.fichaTecnica) {
                            const insumoRef = doc(
                                db,
                                "produtos",
                                ing.id_insumo,
                            );
                            const insumoSnap = await getDoc(insumoRef);
                            if (insumoSnap.exists()) {
                                const insumoDB = insumoSnap.data();
                                const qtdDescontar =
                                    ing.quantidade * qtdParaAdicionar;
                                const novoEstoque =
                                    (insumoDB.estoqueAtual || 0) - qtdDescontar;

                                await updateDoc(insumoRef, {
                                    estoqueAtual: novoEstoque,
                                });
                                await addDoc(
                                    collection(db, "movimentacoes_estoque"),
                                    {
                                        loja: nomeDaLoja,
                                        produtoId: insumoSnap.id,
                                        produtoNome: insumoDB.nome,
                                        tipo: "saida",
                                        quantidade: qtdDescontar,
                                        estoqueAnterior:
                                            insumoDB.estoqueAtual || 0,
                                        estoqueNovo: novoEstoque,
                                        motivo: `Lançamento Garçom (${comandaAtiva.identificador}) - Utilizado em ${qtdParaAdicionar}x ${prodDB.nome}`,
                                        data: new Date().toISOString(),
                                    },
                                );
                            }
                        }
                    } else if (prodDB.controlarEstoque !== false) {
                        // É UM PRODUTO SIMPLES (Ex: Garrafa de Água)
                        const novoEstoque =
                            (prodDB.estoqueAtual || 0) - qtdParaAdicionar;
                        await updateDoc(prodRef, { estoqueAtual: novoEstoque });
                        await addDoc(collection(db, "movimentacoes_estoque"), {
                            loja: nomeDaLoja,
                            produtoId: prodSnap.id,
                            produtoNome: prodDB.nome,
                            tipo: "saida",
                            quantidade: qtdParaAdicionar,
                            estoqueAnterior: prodDB.estoqueAtual || 0,
                            estoqueNovo: novoEstoque,
                            motivo: `Lançamento Garçom (${comandaAtiva.identificador})`,
                            data: new Date().toISOString(),
                        });
                    }
                }
            }

            await updateDoc(doc(db, "comandas", comandaAtiva.id), {
                itens: itensAtuais,
            });

            await addDoc(collection(db, "pedidos"), {
                loja: nomeDaLoja,
                cliente: comandaAtiva.identificador,
                origem: "garcom",
                telefone: "Lançamento Interno",
                itens: itensParaKDS,
                status: "agendado",
                criadoEm: new Date().toISOString(),
            });

            alert("✅ Pedido enviado para a Cozinha/Bar e Estoque atualizado!");
            setItensLancamento({});
            setTelaAtual("lista");
            setComandaAtiva(null);
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar pedido.");
        }
    };

    if (telaAtual === "lista") {
        return (
            <div className="animate-in fade-in duration-300">
                <div className="relative mb-6">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={20}
                    />
                    <input
                        type="text"
                        placeholder="Buscar mesa..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-400 outline-none shadow-sm"
                    />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {comandas
                        .filter((c) =>
                            c.identificador
                                .toLowerCase()
                                .includes(busca.toLowerCase()),
                        )
                        .map((comanda) => (
                            <button
                                key={comanda.id}
                                onClick={() => abrirMesa(comanda)}
                                className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col items-center gap-3 hover:border-amber-400 hover:shadow-md transition active:scale-95"
                            >
                                <Users size={32} className="text-slate-400" />
                                <span className="font-black text-slate-800 text-lg">
                                    {comanda.identificador}
                                </span>
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                    Lançar Item
                                </span>
                            </button>
                        ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in slide-in-from-right duration-300 pb-24">
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="font-black text-xl text-slate-800">
                        {comandaAtiva.identificador}
                    </h2>
                    <p className="text-sm text-slate-500">
                        Toque no (+) para adicionar itens
                    </p>
                </div>
                <button
                    onClick={() => setTelaAtual("lista")}
                    className="text-slate-400 hover:text-slate-800 font-bold text-sm px-4 py-2 bg-slate-100 rounded-xl"
                >
                    Voltar
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                {categorias.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategoriaAtiva(cat)}
                        className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors ${categoriaAtiva === cat ? "bg-amber-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {produtosMenu
                    .filter((p) => (p.categoria || "Outros") === categoriaAtiva)
                    .map((produto) => {
                        const selecionados = itensLancamento[produto.id] || 0;
                        return (
                            <div
                                key={produto.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${selecionados > 0 ? "bg-white border-amber-400 shadow-sm" : "bg-white border-slate-100 shadow-sm"}`}
                            >
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">
                                        {produto.nome}
                                    </p>
                                    <p className="text-emerald-600 font-black text-sm">
                                        {formatarDinheiro(produto.preco)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                    {selecionados > 0 && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    alterarQuantidade(
                                                        produto.id,
                                                        -1,
                                                    )
                                                }
                                                className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <span className="font-black text-lg text-amber-600 w-4 text-center">
                                                {selecionados}
                                            </span>
                                        </>
                                    )}
                                    <button
                                        onClick={() =>
                                            alterarQuantidade(produto.id, 1)
                                        }
                                        className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center hover:bg-amber-200"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:left-72 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-7xl mx-auto flex gap-4">
                    <button
                        onClick={enviarPedido}
                        disabled={totalItensLancando === 0}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 transition active:scale-95"
                    >
                        <Send size={20} />
                        {totalItensLancando > 0
                            ? `Enviar ${totalItensLancando} Itens para Preparo`
                            : "Selecione produtos"}
                    </button>
                </div>
            </div>
        </div>
    );
}
