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
            setTelaAtual("lancamento");
        } catch (e) {
            alert("Erro ao abrir mesa.");
        }
    };

    const iniciarLancamento = (comanda) => {
        setComandaAtiva(comanda);
        setItensLancamento({});
        setTelaAtual("lancamento");
    };
    const alterarQuantidade = (pId, delta) => {
        setItensLancamento((prev) => ({
            ...prev,
            [pId]: Math.max(0, (prev[pId] || 0) + delta),
        }));
    };

    const enviarPedido = async () => {
        const itensParaEnviar = Object.entries(itensLancamento).filter(
            ([_, q]) => q > 0,
        );
        if (itensParaEnviar.length === 0) return setTelaAtual("lista");

        // VERIFICAÇÃO DE ENCOMENDAS
        let itensSemStock = [];

        for (const [pId, qtd] of itensParaEnviar) {
            const pInfo = produtosMenu.find((p) => p.id === pId);
            if (pInfo) {
                if (pInfo.fichaTecnica && pInfo.fichaTecnica.length > 0) {
                    for (const ing of pInfo.fichaTecnica) {
                        const insSnap = await getDoc(
                            doc(db, "produtos", ing.id_insumo),
                        );
                        if (
                            insSnap.exists() &&
                            (insSnap.data().estoqueAtual || 0) <
                                ing.quantidade * qtd
                        ) {
                            if (!itensSemStock.includes(pInfo.nome))
                                itensSemStock.push(pInfo.nome);
                        }
                    }
                } else if (
                    pInfo.controlarEstoque !== false &&
                    (pInfo.estoqueAtual || 0) < qtd
                ) {
                    if (!itensSemStock.includes(pInfo.nome))
                        itensSemStock.push(pInfo.nome);
                }
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
            for (const [pId, qtd] of itensParaEnviar) {
                const pInfo = produtosMenu.find((p) => p.id === pId);
                const idx = itensAtuais.findIndex((i) => i.id_produto === pId);
                if (idx >= 0) itensAtuais[idx].qtd_total += qtd;
                else
                    itensAtuais.push({
                        id_produto: pId,
                        nome: pInfo.nome,
                        preco: pInfo.preco,
                        qtd_total: qtd,
                        qtd_paga: 0,
                    });

                // BAIXA NO STOCK (Pode ficar negativo, servindo como base para nova OP)
                const pRef = doc(db, "produtos", pId);
                const pSnap = await getDoc(pRef);
                if (pSnap.exists()) {
                    const pDB = pSnap.data();
                    if (pDB.fichaTecnica && pDB.fichaTecnica.length > 0) {
                        for (const ing of pDB.fichaTecnica) {
                            const iRef = doc(db, "produtos", ing.id_insumo);
                            const iSnap = await getDoc(iRef);
                            if (iSnap.exists()) {
                                const novoE =
                                    (iSnap.data().estoqueAtual || 0) -
                                    ing.quantidade * qtd;
                                await updateDoc(iRef, { estoqueAtual: novoE });
                            }
                        }
                    } else if (pDB.controlarEstoque !== false) {
                        const novoE = (pDB.estoqueAtual || 0) - qtd;
                        await updateDoc(pRef, { estoqueAtual: novoE });
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
                telefone: "Atendimento Local",
                itens: itensParaEnviar.map(([id, q]) => ({
                    id,
                    quantidade: q,
                    nome: produtosMenu.find((x) => x.id === id).nome,
                })),
                status: "agendado",
                criadoEm: new Date().toISOString(),
                temEncomenda: isEncomenda, // <--- FLAG PARA A COZINHA!
            });

            alert("✅ Pedido enviado para a cozinha!");
            setItensLancamento({});
            setTelaAtual("lista");
        } catch (e) {
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
            <div className="flex gap-2 overflow-x-auto p-4 bg-white border-b no-scrollbar shadow-sm">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {produtosMenu
                    .filter((p) => (p.categoria || "Geral") === categoriaAtiva)
                    .map((prod) => (
                        <div
                            key={prod.id}
                            className={`bg-white p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${itensLancamento[prod.id] > 0 ? "border-amber-400 shadow-md" : "border-transparent shadow-sm"}`}
                        >
                            <div className="flex-1 pr-4">
                                <h3 className="font-bold text-sm text-slate-800 line-clamp-1">
                                    {prod.nome}
                                </h3>
                                <p className="text-xs text-amber-600 font-black">
                                    {formatarDinheiro(prod.preco)}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <button
                                    onClick={() =>
                                        alterarQuantidade(prod.id, -1)
                                    }
                                    disabled={!itensLancamento[prod.id]}
                                    className="text-slate-500 disabled:opacity-30"
                                >
                                    <Minus size={18} />
                                </button>
                                <span className="font-bold text-slate-800 w-4 text-center">
                                    {itensLancamento[prod.id] || 0}
                                </span>
                                <button
                                    onClick={() =>
                                        alterarQuantidade(prod.id, 1)
                                    }
                                    className="text-slate-500"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
            <div className="p-4 bg-white border-t shadow-lg">
                <button
                    onClick={enviarPedido}
                    disabled={
                        !Object.values(itensLancamento).some((v) => v > 0)
                    }
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-md hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                    <Send size={18} /> Enviar para Preparo
                </button>
            </div>
        </div>
    );
}
