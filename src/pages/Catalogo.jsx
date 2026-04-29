import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
    ShoppingCart,
    Plus,
    Minus,
    X,
    Phone,
    ShoppingBag,
    Lock,
    Store,
    Utensils,
    CheckCircle,
} from "lucide-react";
import {
    collection,
    addDoc,
    getDoc,
    query,
    where,
    onSnapshot,
    doc,
    getDocs,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { gerarPixCopiaECola } from "../utils/pixUtils";
import { QRCodeCanvas } from "qrcode.react";

const CATALOGO_TEMAS = {
    pink: {
        bgFundo: "bg-pink-50",
        bgSecundario: "bg-pink-100",
        texto: "text-pink-600",
        bgDestaque: "bg-pink-600",
        hoverBgDestaque: "hover:bg-pink-700",
        hoverBotaoEscuro: "hover:bg-pink-600",
        borda: "border-pink-100",
        bordaForte: "border-pink-200",
        hoverBorda: "hover:border-pink-300",
        hoverTexto: "hover:text-pink-600",
        hoverBgSecundario: "hover:bg-pink-50",
        shadow: "shadow-pink-200",
        bgIconeCarrinho: "bg-pink-500",
        ring: "focus:ring-pink-400",
    },
    amber: {
        bgFundo: "bg-amber-50",
        bgSecundario: "bg-amber-100",
        texto: "text-amber-600",
        bgDestaque: "bg-amber-600",
        hoverBgDestaque: "hover:bg-amber-700",
        hoverBotaoEscuro: "hover:bg-amber-600",
        borda: "border-amber-100",
        bordaForte: "border-amber-200",
        hoverBorda: "hover:border-amber-300",
        hoverTexto: "hover:text-amber-600",
        hoverBgSecundario: "hover:bg-amber-50",
        shadow: "shadow-amber-200",
        bgIconeCarrinho: "bg-amber-500",
        ring: "focus:ring-amber-400",
    },
    blue: {
        bgFundo: "bg-blue-50",
        bgSecundario: "bg-blue-100",
        texto: "text-blue-600",
        bgDestaque: "bg-blue-600",
        hoverBgDestaque: "hover:bg-blue-700",
        hoverBotaoEscuro: "hover:bg-blue-600",
        borda: "border-blue-100",
        bordaForte: "border-blue-200",
        hoverBorda: "hover:border-blue-300",
        hoverTexto: "hover:text-blue-600",
        hoverBgSecundario: "hover:bg-blue-50",
        shadow: "shadow-blue-200",
        bgIconeCarrinho: "bg-blue-500",
        ring: "focus:ring-blue-400",
    },
    emerald: {
        bgFundo: "bg-emerald-50",
        bgSecundario: "bg-emerald-100",
        texto: "text-emerald-600",
        bgDestaque: "bg-emerald-600",
        hoverBgDestaque: "hover:bg-emerald-700",
        hoverBotaoEscuro: "hover:bg-emerald-600",
        borda: "border-emerald-100",
        bordaForte: "border-emerald-200",
        hoverBorda: "hover:border-emerald-300",
        hoverTexto: "hover:text-emerald-600",
        hoverBgSecundario: "hover:bg-emerald-50",
        shadow: "shadow-emerald-200",
        bgIconeCarrinho: "bg-emerald-500",
        ring: "focus:ring-emerald-400",
    },
    slate: {
        bgFundo: "bg-slate-100",
        bgSecundario: "bg-slate-200",
        texto: "text-slate-800",
        bgDestaque: "bg-slate-800",
        hoverBgDestaque: "hover:bg-slate-900",
        hoverBotaoEscuro: "hover:bg-slate-800",
        borda: "border-slate-200",
        bordaForte: "border-slate-300",
        hoverBorda: "hover:border-slate-400",
        hoverTexto: "hover:text-slate-800",
        hoverBgSecundario: "hover:bg-slate-100",
        shadow: "shadow-slate-300",
        bgIconeCarrinho: "bg-slate-700",
        ring: "focus:ring-slate-400",
    },
};

export default function Catalogo() {
    const { nomeDaLoja } = useParams();
    const [searchParams] = useSearchParams();
    const numeroDaMesa = searchParams.get("mesa");

    const [configLoja, setConfigLoja] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [carrinho, setCarrinho] = useState([]);

    const [nomeCliente, setNomeCliente] = useState("");
    const [telefoneCliente, setTelefoneCliente] = useState("");
    const [dataEntrega, setDataEntrega] = useState("");
    const [cpfCliente, setCpfCliente] = useState("");
    const [enderecoCliente, setEnderecoCliente] = useState("");

    const [mostrarModalPix, setMostrarModalPix] = useState(false);
    const [mostrarModalSucessoMesa, setMostrarModalSucessoMesa] =
        useState(false);
    const [pixPayload, setPixPayload] = useState("");
    const [produtosDaLoja, setProdutosDaLoja] = useState([]);
    const [processandoPedido, setProcessandoPedido] = useState(false);

    useEffect(() => {
        setLoadingConfig(true);
        const unsubscribe = onSnapshot(
            doc(db, "lojas", nomeDaLoja),
            (docSnap) => {
                if (docSnap.exists())
                    setConfigLoja({ id: docSnap.id, ...docSnap.data() });
                else setConfigLoja({});
                setLoadingConfig(false);
            },
        );
        return () => unsubscribe();
    }, [nomeDaLoja]);

    useEffect(() => {
        if (configLoja?.nomeExibicao)
            document.title = `${configLoja.nomeExibicao} - Catálogo Digital`;
    }, [configLoja]);

    useEffect(() => {
        const q = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
            where("ativo", "==", true),
        );
        return onSnapshot(q, (snap) =>
            setProdutosDaLoja(
                snap.docs.map((d) => ({ id: d.id, ...d.data() })),
            ),
        );
    }, [nomeDaLoja]);

    const adicionarAoCarrinho = (produto) => {
        const itemJaExiste = carrinho.find((item) => item.id === produto.id);
        if (itemJaExiste)
            setCarrinho(
                carrinho.map((item) =>
                    item.id === produto.id
                        ? { ...item, quantidade: item.quantidade + 1 }
                        : item,
                ),
            );
        else setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    };

    const alterarQuantidade = (produtoId, delta) =>
        setCarrinho(
            carrinho.map((item) =>
                item.id === produtoId
                    ? {
                          ...item,
                          quantidade: Math.max(1, item.quantidade + delta),
                      }
                    : item,
            ),
        );
    const removerDoCarrinho = (produtoId) =>
        setCarrinho(carrinho.filter((item) => item.id !== produtoId));
    const valorTotal = carrinho.reduce(
        (total, item) => total + item.preco * item.quantidade,
        0,
    );
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v);

    const finalizarPedido = async () => {
        setProcessandoPedido(true);

        // =========================================================
        // PASSO 1: IDENTIFICAR ITENS SEM STOCK (PARA ENCOMENDA)
        // =========================================================
        let itensSemStock = [];

        for (const item of carrinho) {
            const pInfo = produtosDaLoja.find((p) => p.id === item.id);
            if (pInfo) {
                if (pInfo.fichaTecnica && pInfo.fichaTecnica.length > 0) {
                    for (const ing of pInfo.fichaTecnica) {
                        const insSnap = await getDoc(
                            doc(db, "produtos", ing.id_insumo),
                        );
                        if (insSnap.exists()) {
                            if (
                                (insSnap.data().estoqueAtual || 0) <
                                ing.quantidade * item.quantidade
                            ) {
                                if (!itensSemStock.includes(pInfo.nome))
                                    itensSemStock.push(pInfo.nome);
                            }
                        }
                    }
                } else if (pInfo.controlarEstoque !== false) {
                    if ((pInfo.estoqueAtual || 0) < item.quantidade) {
                        if (!itensSemStock.includes(pInfo.nome))
                            itensSemStock.push(pInfo.nome);
                    }
                }
            }
        }

        let isEncomenda = false;
        if (itensSemStock.length > 0) {
            const prosseguir = window.confirm(
                `⚠️ Atenção! Os seguintes itens estão esgotados:\n\n- ${itensSemStock.join("\n- ")}\n\nDeseja realizar o pedido como ENCOMENDA? O tempo de preparo será maior.`,
            );
            if (!prosseguir) {
                setProcessandoPedido(false);
                return;
            }
            isEncomenda = true;
        }

        // =========================================================
        // PASSO 2: FLUXO MESA
        // =========================================================
        if (numeroDaMesa) {
            try {
                const identificadorMesa = `Mesa ${numeroDaMesa}`;
                const q = query(
                    collection(db, "comandas"),
                    where("loja", "==", nomeDaLoja),
                    where("identificador", "==", identificadorMesa),
                    where("status", "==", "aberta"),
                );
                const snapComandas = await getDocs(q);

                if (!snapComandas.empty) {
                    const comandaDoc = snapComandas.docs[0];
                    let itensAtuais = [...(comandaDoc.data().itens || [])];
                    carrinho.forEach((cartItem) => {
                        const idx = itensAtuais.findIndex(
                            (i) => i.id_produto === cartItem.id,
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
                    });
                    await updateDoc(doc(db, "comandas", comandaDoc.id), {
                        itens: itensAtuais,
                    });
                } else {
                    const itensFormatados = carrinho.map((i) => ({
                        id_produto: i.id,
                        nome: i.nome,
                        preco: i.preco,
                        qtd_total: i.quantidade,
                        qtd_paga: 0,
                    }));
                    await addDoc(collection(db, "comandas"), {
                        loja: nomeDaLoja,
                        identificador: identificadorMesa,
                        cliente: nomeCliente || "Cliente Autoatendimento",
                        tipo: "mesa",
                        status: "aberta",
                        itens: itensFormatados,
                        abertaEm: new Date().toISOString(),
                    });
                }

                await addDoc(collection(db, "pedidos"), {
                    loja: nomeDaLoja,
                    cliente: identificadorMesa,
                    origem: "mesa",
                    telefone: "QR Code",
                    itens: carrinho,
                    valorTotal: valorTotal,
                    status: "agendado",
                    criadoEm: new Date().toISOString(),
                    temEncomenda: isEncomenda, // <--- FLAG PARA A COZINHA!
                });

                // Baixa no Stock (Vai ficar negativo se for encomenda, o que é correto para a OP)
                for (const item of carrinho) {
                    const pRef = doc(db, "produtos", item.id);
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
                                        ing.quantidade * item.quantidade;
                                    await updateDoc(iRef, {
                                        estoqueAtual: novoE,
                                    });
                                    await addDoc(
                                        collection(db, "movimentacoes_estoque"),
                                        {
                                            loja: nomeDaLoja,
                                            produtoId: iSnap.id,
                                            produtoNome: iSnap.data().nome,
                                            tipo: "saida",
                                            quantidade:
                                                ing.quantidade *
                                                item.quantidade,
                                            motivo: `Autoatendimento (${identificadorMesa})`,
                                            data: new Date().toISOString(),
                                        },
                                    );
                                }
                            }
                        } else if (pDB.controlarEstoque !== false) {
                            const novoE =
                                (pDB.estoqueAtual || 0) - item.quantidade;
                            await updateDoc(pRef, { estoqueAtual: novoE });
                            await addDoc(
                                collection(db, "movimentacoes_estoque"),
                                {
                                    loja: nomeDaLoja,
                                    produtoId: pSnap.id,
                                    produtoNome: pDB.nome,
                                    tipo: "saida",
                                    quantidade: item.quantidade,
                                    motivo: `Autoatendimento (${identificadorMesa})`,
                                    data: new Date().toISOString(),
                                },
                            );
                        }
                    }
                }
                setCarrinho([]);
                setMostrarModalSucessoMesa(true);
            } catch (e) {
                alert("Erro ao enviar pedido.");
            } finally {
                setProcessandoPedido(false);
            }
            return;
        }

        // =========================================================
        // PASSO 3: FLUXO DELIVERY
        // =========================================================
        if (!nomeCliente || !telefoneCliente) {
            setProcessandoPedido(false);
            return alert("Preencha nome e telefone.");
        }
        const valorSinal = valorTotal * 0.5;
        const payload = gerarPixCopiaECola(
            configLoja?.chavePix || "000",
            configLoja?.nomePix || "Empresa",
            configLoja?.cidade || "CIDADE",
            valorSinal,
        );
        setPixPayload(payload);

        try {
            await addDoc(collection(db, "pedidos"), {
                loja: nomeDaLoja,
                cliente: nomeCliente,
                cpf: cpfCliente,
                telefone: telefoneCliente,
                endereco: enderecoCliente,
                dataEntrega: dataEntrega,
                itens: carrinho,
                valorTotal,
                valorSinal,
                status: "aguardando_pix",
                criadoEm: new Date().toISOString(),
                temEncomenda: isEncomenda, // <--- FLAG PARA A COZINHA!
            });

            // Mesma Baixa de Stock do Delivery...
            for (const item of carrinho) {
                const pRef = doc(db, "produtos", item.id);
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
                                    ing.quantidade * item.quantidade;
                                await updateDoc(iRef, { estoqueAtual: novoE });
                            }
                        }
                    } else if (pDB.controlarEstoque !== false) {
                        const novoE = (pDB.estoqueAtual || 0) - item.quantidade;
                        await updateDoc(pRef, { estoqueAtual: novoE });
                    }
                }
            }

            setMostrarModalPix(true);
        } catch (e) {
            alert("Erro no pedido.");
        } finally {
            setProcessandoPedido(false);
        }
    };

    const enviarWhatsAppReal = () => {
        let msg = `*Pedido: ${configLoja?.nomeExibicao}*\n*Cliente:* ${nomeCliente}\n\n*Itens:*`;
        carrinho.forEach((i) => (msg += `\n• ${i.quantidade}x ${i.nome}`));
        msg += `\n\n*Total:* ${formatarDinheiro(valorTotal)}\n✅ *Sinal pago!*`;
        window.open(
            `https://wa.me/${configLoja?.whatsapp}?text=${encodeURIComponent(msg)}`,
            "_blank",
        );
    };

    const tema = CATALOGO_TEMAS[configLoja?.tema] || CATALOGO_TEMAS.pink;
    if (loadingConfig)
        return (
            <div
                className={`min-h-screen flex items-center justify-center ${tema.bgFundo}`}
            >
                <p className="animate-pulse">A carregar cardápio...</p>
            </div>
        );
    if (!configLoja?.nomeExibicao)
        return (
            <div className="text-center p-20">
                <Store size={48} className="mx-auto mb-4" />
                <h2>Loja não encontrada</h2>
            </div>
        );

    const categorias = [
        ...new Set(produtosDaLoja.map((p) => p.categoria || "Outros")),
    ].sort();

    return (
        <div
            className={`min-h-screen ${tema.bgFundo} text-slate-800 pb-32 transition-colors duration-500`}
        >
            {numeroDaMesa && (
                <div
                    className={`${tema.bgDestaque} text-white p-2 text-center text-xs font-bold uppercase sticky top-0 z-50`}
                >
                    <Utensils size={14} className="inline mr-2" /> Mesa{" "}
                    {numeroDaMesa}
                </div>
            )}
            <div className="bg-white border-b sticky top-0 z-40 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {configLoja.logo && (
                        <img
                            src={configLoja.logo}
                            className="w-12 h-12 rounded-full object-cover border"
                        />
                    )}
                    <h1 className="font-bold text-lg">
                        {configLoja.nomeExibicao}
                    </h1>
                </div>
                {!numeroDaMesa && (
                    <Link
                        to={`/login/${nomeDaLoja}`}
                        className="text-slate-300 hover:text-slate-500"
                    >
                        <Lock size={18} />
                    </Link>
                )}
            </div>

            <div className="max-w-7xl mx-auto p-4 space-y-12">
                {categorias.map((cat) => (
                    <div key={cat} id={`cat-${cat.replace(/\\s+/g, "-")}`}>
                        <h2 className="text-xl font-black mb-6 border-b-2 inline-block border-slate-200">
                            {cat}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {produtosDaLoja
                                .filter(
                                    (p) => (p.categoria || "Outros") === cat,
                                )
                                .map((prod) => (
                                    <div
                                        key={prod.id}
                                        className="bg-white p-4 rounded-3xl shadow-sm border flex flex-col justify-between"
                                    >
                                        <img
                                            src={prod.imagem}
                                            className="w-full h-40 object-cover rounded-2xl mb-4 bg-slate-100"
                                        />
                                        <div>
                                            <h3 className="font-bold">
                                                {prod.nome}
                                            </h3>
                                            <p className="text-xs text-slate-500 mb-4">
                                                {prod.descricao}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center border-t pt-4">
                                            <span
                                                className={`font-black ${tema.texto}`}
                                            >
                                                {formatarDinheiro(prod.preco)}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    adicionarAoCarrinho(prod)
                                                }
                                                className={`bg-slate-900 text-white p-2 rounded-xl active:scale-95 ${tema.hoverBotaoEscuro}`}
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}

                {carrinho.length > 0 && (
                    <div
                        id="carrinho-secao"
                        className="max-w-xl mx-auto bg-white p-6 rounded-3xl shadow-xl border scroll-mt-32 mt-12"
                    >
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <ShoppingCart className={tema.texto} /> Seu Pedido
                        </h2>
                        <div className="space-y-3 mb-8">
                            {carrinho.map((i) => (
                                <div
                                    key={i.id}
                                    className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl"
                                >
                                    <div>
                                        <p className="font-bold text-sm">
                                            {i.nome}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatarDinheiro(i.preco)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border shadow-sm">
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(i.id, -1)
                                            }
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="font-bold text-sm w-4 text-center">
                                            {i.quantidade}
                                        </span>
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(i.id, 1)
                                            }
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => removerDoCarrinho(i.id)}
                                        className="text-red-400 p-2"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div
                            className={`p-4 rounded-2xl mb-8 flex justify-between font-black ${tema.bgSecundario} ${tema.texto}`}
                        >
                            <span>Total:</span>
                            <span>{formatarDinheiro(valorTotal)}</span>
                        </div>

                        {!numeroDaMesa ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Seu Nome *"
                                    value={nomeCliente}
                                    onChange={(e) =>
                                        setNomeCliente(e.target.value)
                                    }
                                    className={`w-full p-4 border rounded-2xl outline-none focus:ring-2 ${tema.ring}`}
                                />
                                <input
                                    type="tel"
                                    placeholder="WhatsApp *"
                                    value={telefoneCliente}
                                    onChange={(e) =>
                                        setTelefoneCliente(e.target.value)
                                    }
                                    className={`w-full p-4 border rounded-2xl outline-none focus:ring-2 ${tema.ring}`}
                                />
                                <input
                                    type="text"
                                    placeholder="Endereço (Opcional)"
                                    value={enderecoCliente}
                                    onChange={(e) =>
                                        setEnderecoCliente(e.target.value)
                                    }
                                    className={`w-full p-4 border rounded-2xl outline-none focus:ring-2 ${tema.ring}`}
                                />
                                <input
                                    type="datetime-local"
                                    value={dataEntrega}
                                    onChange={(e) =>
                                        setDataEntrega(e.target.value)
                                    }
                                    className={`w-full p-4 border rounded-2xl outline-none focus:ring-2 ${tema.ring}`}
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                placeholder="Seu Nome (Opcional)"
                                value={nomeCliente}
                                onChange={(e) => setNomeCliente(e.target.value)}
                                className={`w-full p-4 border rounded-2xl outline-none focus:ring-2 ${tema.ring}`}
                            />
                        )}

                        <button
                            onClick={finalizarPedido}
                            disabled={processandoPedido}
                            className={`w-full py-4 rounded-2xl mt-8 font-bold text-white shadow-lg ${tema.bgDestaque} disabled:opacity-50 active:scale-95`}
                        >
                            {processandoPedido
                                ? "Processando..."
                                : numeroDaMesa
                                  ? "Enviar para Cozinha"
                                  : "Avançar para Pagamento"}
                        </button>
                    </div>
                )}
            </div>

            {mostrarModalSucessoMesa && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full">
                        <CheckCircle
                            size={48}
                            className="text-emerald-500 mx-auto mb-4"
                        />
                        <h2 className="text-xl font-bold mb-2">
                            Pedido Enviado!
                        </h2>
                        <p className="text-slate-500 mb-6">
                            Seus itens já estão em produção para a Mesa{" "}
                            {numeroDaMesa}.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className={`w-full py-4 rounded-2xl font-bold text-white ${tema.bgDestaque}`}
                        >
                            Continuar no Cardápio
                        </button>
                    </div>
                </div>
            )}

            {mostrarModalPix && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">
                            Pagamento do Sinal (50%)
                        </h2>
                        <div className={`p-4 rounded-2xl mb-6 ${tema.bgFundo}`}>
                            <p
                                className={`text-xs uppercase font-bold ${tema.texto}`}
                            >
                                Valor
                            </p>
                            <p className="text-3xl font-black">
                                {formatarDinheiro(valorTotal * 0.5)}
                            </p>
                        </div>
                        <div className="flex justify-center mb-6 bg-white p-4 border rounded-2xl shadow-sm">
                            <QRCodeCanvas value={pixPayload} size={180} />
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(pixPayload);
                                alert("Copiado!");
                            }}
                            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold mb-3 active:scale-95"
                        >
                            Copiar Código Pix
                        </button>
                        <button
                            onClick={enviarWhatsAppReal}
                            className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold active:scale-95"
                        >
                            Já paguei! Enviar Comprovante
                        </button>
                    </div>
                </div>
            )}

            {carrinho.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                    <button
                        onClick={rolarParaCarrinho}
                        className={`w-full bg-slate-900 text-white p-5 rounded-3xl shadow-2xl flex justify-between items-center border border-white/10 active:scale-95 ${tema.hoverBgDestaque}`}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className={`${tema.bgIconeCarrinho} w-8 h-8 rounded-full flex items-center justify-center font-bold`}
                            >
                                {totalItens}
                            </span>
                            <span className="font-bold">Ver Carrinho</span>
                        </div>
                        <span className="font-black text-xl">
                            {formatarDinheiro(valorTotal)}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
