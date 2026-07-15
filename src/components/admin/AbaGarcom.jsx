import React, { useState, useEffect } from "react";
import {
    Search,
    Plus,
    Minus,
    Send,
    Users,
    Layers,
    X,
    CheckCircle,
} from "lucide-react";
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
    const [categoriaAtiva, setCategoriaAtiva] = useState("");

    // O carrinho do garçom agora é um Array robusto para suportar combos repetidos com opções diferentes
    const [carrinhoGarcom, setCarrinhoGarcom] = useState([]);

    // --- ESTADOS DO MODAL DE KIT/COMBO ---
    const [modalKitAberto, setModalKitAberto] = useState(false);
    const [kitAtivo, setKitAtivo] = useState(null);
    const [selecoesKit, setSelecoesKit] = useState({});

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
        const iden = window.prompt("Número da Mesa ou Nome do Cliente:");
        if (!iden) return;
        try {
            const nova = await addDoc(collection(db, "comandas"), {
                loja: nomeDaLoja,
                identificador: iden,
                cliente: "Consumo Local",
                tipo: "mesa",
                status: "aberta",
                itens: [],
                abertaEm: new Date().toISOString(),
            });
            setComandaAtiva({ id: nova.id, identificador: iden, itens: [] });
            setCarrinhoGarcom([]);
            setTelaAtual("lancamento");
        } catch (e) {
            alert("Erro ao abrir mesa.");
        }
    };

    const iniciarLancamento = (comanda) => {
        setComandaAtiva(comanda);
        setCarrinhoGarcom([]);
        setTelaAtual("lancamento");
    };

    // ==========================================
    // LÓGICA DE MONTAGEM DE KITS NO GARÇOM
    // ==========================================
    const abrirModalKit = (produto) => {
        setKitAtivo(produto);
        const selecoesIniciais = {};
        (produto.kitGroups || []).forEach((g) => {
            selecoesIniciais[g.id] = {};
        });
        setSelecoesKit(selecoesIniciais);
        setModalKitAberto(true);
    };

    const alterarQtdSubitemKit = (grupoId, produtoId, delta, maxGrupo) => {
        setSelecoesKit((prev) => {
            const grupo = prev[grupoId] || {};
            const qtdAtual = grupo[produtoId] || 0;
            const novaQtd = Math.max(0, qtdAtual + delta);
            const totalNoGrupo = Object.values(grupo).reduce(
                (a, b) => a + b,
                0,
            );
            if (delta > 0 && totalNoGrupo >= maxGrupo) return prev;
            return { ...prev, [grupoId]: { ...grupo, [produtoId]: novaQtd } };
        });
    };

    const todosGruposValidos = kitAtivo?.kitGroups?.every((g) => {
        const total = Object.values(selecoesKit[g.id] || {}).reduce(
            (a, b) => a + b,
            0,
        );
        return total >= g.min && total <= g.max;
    });

    const salvarKitNoCarrinho = () => {
        if (!todosGruposValidos) return;

        let totalAdicionalKit = 0;
        const subitensArray = [];

        kitAtivo.kitGroups.forEach((g) => {
            g.opcoes.forEach((op) => {
                const qtd = selecoesKit[g.id]?.[op.produtoId] || 0;
                if (qtd > 0) {
                    subitensArray.push({
                        produtoId: op.produtoId,
                        nome: op.nome,
                        quantidade: qtd,
                        adicional: op.adicional || 0,
                    });
                    totalAdicionalKit += (op.adicional || 0) * qtd;
                }
            });
        });

        const novoItem = {
            cartId: Date.now() + Math.random(),
            id: kitAtivo.id,
            nome: kitAtivo.nome,
            isKit: true,
            quantidade: 1,
            preco:
                (kitAtivo.precoBase || kitAtivo.preco || 0) + totalAdicionalKit,
            subitensSelecionados: subitensArray,
        };

        setCarrinhoGarcom([...carrinhoGarcom, novoItem]);
        setModalKitAberto(false);
    };

    // ==========================================
    // LÓGICA DO CARRINHO GERAL
    // ==========================================
    const adicionarAoCarrinho = (produto) => {
        if (produto.isKit) return abrirModalKit(produto);

        const itemJaExiste = carrinhoGarcom.find(
            (item) => item.id === produto.id && !item.isKit,
        );
        if (itemJaExiste) {
            setCarrinhoGarcom(
                carrinhoGarcom.map((item) =>
                    item.id === produto.id && !item.isKit
                        ? { ...item, quantidade: item.quantidade + 1 }
                        : item,
                ),
            );
        } else {
            setCarrinhoGarcom([
                ...carrinhoGarcom,
                {
                    ...produto,
                    cartId: Date.now() + Math.random(),
                    quantidade: 1,
                },
            ]);
        }
    };

    const alterarQuantidadeProdutoComum = (cartId, delta) => {
        setCarrinhoGarcom(
            carrinhoGarcom
                .map((item) =>
                    item.cartId === cartId
                        ? {
                              ...item,
                              quantidade: Math.max(0, item.quantidade + delta),
                          }
                        : item,
                )
                .filter((i) => i.quantidade > 0),
        );
    };

    const getQuantidadeNoCarrinho = (produtoId) => {
        return carrinhoGarcom
            .filter((item) => item.id === produtoId && !item.isKit)
            .reduce((acc, item) => acc + item.quantidade, 0);
    };

    // ==========================================
    // FECHAMENTO E ENVIO PARA COZINHA
    // ==========================================
    const enviarPedido = async () => {
        if (carrinhoGarcom.length === 0) return setTelaAtual("lista");

        let itensSemStock = [];

        // PASSO 1: Verificação profunda (inclui Combos)
        for (const item of carrinhoGarcom) {
            const verificarFichaProduto = async (
                produtoAchecar,
                qtdMultiplicador,
            ) => {
                if (
                    produtoAchecar.fichaTecnica &&
                    produtoAchecar.fichaTecnica.length > 0
                ) {
                    for (const ing of produtoAchecar.fichaTecnica) {
                        const insSnap = await getDoc(
                            doc(db, "produtos", ing.id_insumo),
                        );
                        if (
                            insSnap.exists() &&
                            (insSnap.data().estoqueAtual || 0) <
                                ing.quantidade * qtdMultiplicador
                        ) {
                            if (!itensSemStock.includes(produtoAchecar.nome))
                                itensSemStock.push(produtoAchecar.nome);
                        }
                    }
                } else if (produtoAchecar.controlarEstoque !== false) {
                    if ((produtoAchecar.estoqueAtual || 0) < qtdMultiplicador) {
                        if (!itensSemStock.includes(produtoAchecar.nome))
                            itensSemStock.push(produtoAchecar.nome);
                    }
                }
            };

            if (item.isKit) {
                for (const sub of item.subitensSelecionados) {
                    const pInfo = produtosMenu.find(
                        (p) => p.id === sub.produtoId,
                    );
                    if (pInfo)
                        await verificarFichaProduto(
                            pInfo,
                            sub.quantidade * item.quantidade,
                        );
                }
            } else {
                const pInfo = produtosMenu.find((p) => p.id === item.id);
                if (pInfo) await verificarFichaProduto(pInfo, item.quantidade);
            }
        }

        let isEncomenda = false;
        if (itensSemStock.length > 0) {
            const prosseguir = window.confirm(
                `⚠️ Atenção!\n\nStock insuficiente para:\n- ${itensSemStock.join("\n- ")}\n\nDeseja forçar o lançamento como ENCOMENDA na cozinha?`,
            );
            if (!prosseguir) return;
            isEncomenda = true;
        }

        try {
            const itensAtuais = [...(comandaAtiva.itens || [])];

            carrinhoGarcom.forEach((cartItem) => {
                if (cartItem.isKit) {
                    itensAtuais.push({
                        id_produto: cartItem.id,
                        nome: cartItem.nome,
                        preco: cartItem.preco,
                        qtd_total: cartItem.quantidade,
                        qtd_paga: 0,
                        isKit: true,
                        subitensSelecionados: cartItem.subitensSelecionados,
                    });
                } else {
                    const idx = itensAtuais.findIndex(
                        (i) => i.id_produto === cartItem.id && !i.isKit,
                    );
                    if (idx >= 0)
                        itensAtuais[idx].qtd_total += cartItem.quantidade;
                    else
                        itensAtuais.push({
                            id_produto: cartItem.id,
                            nome: cartItem.nome,
                            preco: cartItem.preco,
                            qtd_total: cartItem.quantidade,
                            qtd_paga: 0,
                        });
                }
            });

            // PASSO 2: Baixa Real no Estoque
            const baixarEstoqueCompleto = async (identificadorOperacao) => {
                for (const item of carrinhoGarcom) {
                    const processarBaixa = async (produtoId, qtdDescontar) => {
                        const pRef = doc(db, "produtos", produtoId);
                        const pSnap = await getDoc(pRef);
                        if (pSnap.exists()) {
                            const pDB = pSnap.data();
                            if (
                                pDB.fichaTecnica &&
                                pDB.fichaTecnica.length > 0
                            ) {
                                for (const ing of pDB.fichaTecnica) {
                                    const iRef = doc(
                                        db,
                                        "produtos",
                                        ing.id_insumo,
                                    );
                                    const iSnap = await getDoc(iRef);
                                    if (iSnap.exists()) {
                                        const novoE =
                                            (iSnap.data().estoqueAtual || 0) -
                                            ing.quantidade * qtdDescontar;
                                        await updateDoc(iRef, {
                                            estoqueAtual: novoE,
                                        });
                                    }
                                }
                            } else if (pDB.controlarEstoque !== false) {
                                const novoE =
                                    (pDB.estoqueAtual || 0) - qtdDescontar;
                                await updateDoc(pRef, { estoqueAtual: novoE });
                            }
                        }
                    };

                    if (item.isKit) {
                        for (const sub of item.subitensSelecionados)
                            await processarBaixa(
                                sub.produtoId,
                                sub.quantidade * item.quantidade,
                            );
                    } else {
                        await processarBaixa(item.id, item.quantidade);
                    }
                }
            };

            await baixarEstoqueCompleto(
                `Garçom (${comandaAtiva.identificador})`,
            );

            await updateDoc(doc(db, "comandas", comandaAtiva.id), {
                itens: itensAtuais,
            });

            const valorTotalLote = carrinhoGarcom.reduce(
                (acc, i) => acc + i.preco * i.quantidade,
                0,
            );
            await addDoc(collection(db, "pedidos"), {
                loja: nomeDaLoja,
                cliente: comandaAtiva.identificador,
                origem: "garcom",
                telefone: "Atendimento Local",
                itens: carrinhoGarcom,
                valorTotal: valorTotalLote,
                status: "agendado",
                criadoEm: new Date().toISOString(),
                temEncomenda: isEncomenda,
            });

            alert("✅ Pedido enviado para a cozinha!");
            setCarrinhoGarcom([]);
            setTelaAtual("lista");
        } catch (e) {
            console.error(e);
            alert("Erro ao processar.");
        }
    };

    if (telaAtual === "lista") {
        return (
            <div className="max-w-md mx-auto p-4 space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-black text-slate-800">
                        Mesas / Comandas
                    </h2>
                    <button
                        onClick={abrirMesa}
                        className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-slate-800 active:scale-95"
                    >
                        <Plus />
                    </button>
                </div>
                <div className="relative">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={20}
                    />
                    <input
                        type="text"
                        placeholder="Buscar mesa..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-400 outline-none font-medium"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {comandas
                        .filter((c) =>
                            c.identificador
                                .toLowerCase()
                                .includes(busca.toLowerCase()),
                        )
                        .map((c) => (
                            <button
                                key={c.id}
                                onClick={() => iniciarLancamento(c)}
                                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center hover:border-amber-400 transition-all active:scale-95"
                            >
                                <Users
                                    size={32}
                                    className="text-amber-500 mb-2"
                                />
                                <span className="font-bold text-slate-800 text-lg">
                                    {c.identificador}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                                    {c.itens?.length || 0} itens lançados
                                </span>
                            </button>
                        ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto flex flex-col h-[85vh] animate-in slide-in-from-right">
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                <h2 className="font-black text-slate-800">
                    Lançar em:{" "}
                    <span className="text-amber-600">
                        {comandaAtiva.identificador}
                    </span>
                </h2>
                <button
                    onClick={() => setTelaAtual("lista")}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg"
                >
                    Voltar
                </button>
            </div>
            <div className="flex gap-2 overflow-x-auto p-4 bg-white border-b shadow-sm shrink-0">
                {[
                    ...new Set(produtosMenu.map((p) => p.categoria || "Geral")),
                ].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategoriaAtiva(cat)}
                        className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${categoriaAtiva === cat ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* LISTA DE PRODUTOS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {produtosMenu
                    .filter((p) => (p.categoria || "Geral") === categoriaAtiva)
                    .map((prod) => {
                        const isKit = prod.isKit;
                        const qtdNoCarrinho = getQuantidadeNoCarrinho(prod.id);

                        return (
                            <div
                                key={prod.id}
                                className={`bg-white p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${qtdNoCarrinho > 0 ? "border-amber-400 shadow-md" : "border-transparent shadow-sm"}`}
                            >
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-slate-800 line-clamp-1">
                                            {prod.nome}
                                        </h3>
                                        {isKit && (
                                            <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                                                <Layers size={10} /> KIT
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-amber-600 font-black mt-1">
                                        {formatarDinheiro(
                                            prod.precoBase || prod.preco,
                                        )}
                                    </p>
                                </div>

                                {isKit ? (
                                    <button
                                        onClick={() => abrirModalKit(prod)}
                                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-xl font-bold text-xs active:scale-95"
                                    >
                                        Montar
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                        <button
                                            onClick={() => {
                                                const itemCart =
                                                    carrinhoGarcom.find(
                                                        (i) =>
                                                            i.id === prod.id &&
                                                            !i.isKit,
                                                    );
                                                if (itemCart)
                                                    alterarQuantidadeProdutoComum(
                                                        itemCart.cartId,
                                                        -1,
                                                    );
                                            }}
                                            disabled={qtdNoCarrinho === 0}
                                            className="text-slate-500 disabled:opacity-30"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <span className="font-bold text-slate-800 w-4 text-center">
                                            {qtdNoCarrinho}
                                        </span>
                                        <button
                                            onClick={() =>
                                                adicionarAoCarrinho(prod)
                                            }
                                            className="text-amber-600"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* CARRINHO DE LANÇAMENTOS DO GARÇOM (RESUMO ANTES DO ENVIO) */}
            {carrinhoGarcom.length > 0 && (
                <div className="bg-slate-50 p-4 border-t border-slate-200 shrink-0 max-h-40 overflow-y-auto">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Itens Prontos para Envio:
                    </p>
                    {carrinhoGarcom.map((item) => (
                        <div
                            key={item.cartId}
                            className="flex justify-between items-center text-sm mb-2 bg-white p-2 rounded-lg border border-slate-100"
                        >
                            <div>
                                <span className="font-black text-slate-800">
                                    {item.quantidade}x
                                </span>{" "}
                                <span className="text-slate-600">
                                    {item.nome}
                                </span>
                                {item.isKit && (
                                    <p className="text-[10px] text-slate-400 ml-5">
                                        Opções configuradas
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-600 text-xs">
                                    {formatarDinheiro(
                                        item.preco * item.quantidade,
                                    )}
                                </span>
                                <button
                                    onClick={() =>
                                        setCarrinhoGarcom(
                                            carrinhoGarcom.filter(
                                                (i) => i.cartId !== item.cartId,
                                            ),
                                        )
                                    }
                                    className="text-red-400 hover:text-red-600 p-1"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="p-4 bg-white border-t shadow-lg shrink-0">
                <button
                    onClick={enviarPedido}
                    disabled={carrinhoGarcom.length === 0}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-md hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                    <Send size={18} /> Enviar{" "}
                    {carrinhoGarcom.reduce((a, b) => a + b.quantidade, 0)} Itens
                    para Cozinha
                </button>
            </div>

            {/* MODAL DE MONTAR KIT / COMBO (Versão Garçom) */}
            {modalKitAberto && kitAtivo && (
                <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-end sm:items-center z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Layers className="text-amber-500" />{" "}
                                {kitAtivo.nome}
                            </h2>
                            <button
                                onClick={() => setModalKitAberto(false)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
                            {kitAtivo.kitGroups?.map((grupo, idx) => {
                                const totalSelecionado = Object.values(
                                    selecoesKit[grupo.id] || {},
                                ).reduce((a, b) => a + b, 0);
                                const concluido =
                                    totalSelecionado >= grupo.min &&
                                    totalSelecionado <= grupo.max;

                                return (
                                    <div
                                        key={grupo.id}
                                        className="mb-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                                    >
                                        <div className="bg-slate-100/50 p-4 border-b border-slate-100 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    {concluido && (
                                                        <CheckCircle
                                                            size={16}
                                                            className="text-emerald-500"
                                                        />
                                                    )}{" "}
                                                    {grupo.titulo}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 mt-0.5 uppercase font-bold tracking-wide">
                                                    Escolha de {grupo.min} até{" "}
                                                    {grupo.max} opções
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs font-black px-2.5 py-1 rounded-lg ${concluido ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                                            >
                                                {totalSelecionado}/{grupo.max}
                                            </span>
                                        </div>
                                        <div className="p-2">
                                            {grupo.opcoes?.map((op) => {
                                                const qtdOpcao =
                                                    selecoesKit[grupo.id]?.[
                                                        op.produtoId
                                                    ] || 0;
                                                return (
                                                    <div
                                                        key={op.produtoId}
                                                        className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="flex-1 pr-4">
                                                            <p className="font-semibold text-slate-700 text-sm">
                                                                {op.nome}
                                                            </p>
                                                            {op.adicional >
                                                                0 && (
                                                                <p className="text-xs text-amber-600 font-black mt-0.5">
                                                                    +{" "}
                                                                    {formatarDinheiro(
                                                                        op.adicional,
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() =>
                                                                    alterarQtdSubitemKit(
                                                                        grupo.id,
                                                                        op.produtoId,
                                                                        -1,
                                                                        grupo.max,
                                                                    )
                                                                }
                                                                disabled={
                                                                    qtdOpcao ===
                                                                    0
                                                                }
                                                                className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-95"
                                                            >
                                                                <Minus
                                                                    size={14}
                                                                />
                                                            </button>
                                                            <span className="w-4 text-center font-bold text-slate-800">
                                                                {qtdOpcao}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    alterarQtdSubitemKit(
                                                                        grupo.id,
                                                                        op.produtoId,
                                                                        1,
                                                                        grupo.max,
                                                                    )
                                                                }
                                                                disabled={
                                                                    totalSelecionado >=
                                                                    grupo.max
                                                                }
                                                                className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white disabled:opacity-30 disabled:grayscale active:scale-95"
                                                            >
                                                                <Plus
                                                                    size={14}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-5 bg-white border-t border-slate-100 shrink-0">
                            <button
                                onClick={salvarKitNoCarrinho}
                                disabled={!todosGruposValidos}
                                className="w-full py-4 rounded-2xl font-black text-white flex justify-center items-center px-6 transition-all shadow-lg disabled:opacity-50 disabled:grayscale active:scale-95 bg-amber-500"
                            >
                                {todosGruposValidos
                                    ? "Adicionar Combo à Comanda"
                                    : "Preencha as Opções"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
