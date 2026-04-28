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
                if (docSnap.exists()) {
                    setConfigLoja({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setConfigLoja({});
                }
                setLoadingConfig(false);
            },
            () => {
                setLoadingConfig(false);
            },
        );
        return () => unsubscribe();
    }, [nomeDaLoja]);

    useEffect(() => {
        if (configLoja?.nomeExibicao) {
            document.title = `${configLoja.nomeExibicao} - Catálogo Digital`;
        }
        if (configLoja?.logo) {
            const link =
                document.querySelector("link[rel*='icon']") ||
                document.createElement("link");
            link.type = "image/x-icon";
            link.rel = "shortcut icon";
            link.href = configLoja.logo;
            document.getElementsByTagName("head")[0].appendChild(link);
        }
    }, [configLoja]);

    useEffect(() => {
        const q = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
            where("ativo", "==", true),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProdutosDaLoja(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            );
        });
        return () => unsubscribe();
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
    const formatarDinheiro = (valor) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);

    const finalizarPedido = async () => {
        setProcessandoPedido(true);

        // =========================================================
        // A CATRACA DO STOCK (Verifica todos os itens antes de enviar)
        // =========================================================
        for (const item of carrinho) {
            const produtoInfo = produtosDaLoja.find((p) => p.id === item.id);
            if (produtoInfo?.controlarEstoque) {
                if ((produtoInfo.estoqueAtual || 0) < item.quantidade) {
                    setProcessandoPedido(false);
                    alert(
                        `❌ Desculpe! Temos apenas ${produtoInfo.estoqueAtual || 0} unidades de "${produtoInfo.nome}" disponíveis no momento.`,
                    );
                    return;
                }
            }
        }

        // Continua com o fluxo se o stock for válido...
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
                    const comandaAtivaDoc = snapComandas.docs[0];
                    const dadosComanda = comandaAtivaDoc.data();
                    let itensAtuais = [...(dadosComanda.itens || [])];

                    carrinho.forEach((itemCarrinho) => {
                        const indexExistente = itensAtuais.findIndex(
                            (i) => i.id_produto === itemCarrinho.id,
                        );
                        if (indexExistente >= 0) {
                            itensAtuais[indexExistente].qtd_total +=
                                itemCarrinho.quantidade;
                        } else {
                            itensAtuais.push({
                                id_produto: itemCarrinho.id,
                                nome: itemCarrinho.nome,
                                preco: itemCarrinho.preco,
                                qtd_total: itemCarrinho.quantidade,
                                qtd_paga: 0,
                            });
                        }
                    });

                    await updateDoc(doc(db, "comandas", comandaAtivaDoc.id), {
                        itens: itensAtuais,
                    });
                } else {
                    const itensFormatados = carrinho.map((item) => ({
                        id_produto: item.id,
                        nome: item.nome,
                        preco: item.preco,
                        qtd_total: item.quantidade,
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

                // DAR BAIXA NO STOCK AUTOMÁTICA
                for (const item of carrinho) {
                    const produtoInfo = produtosDaLoja.find(
                        (p) => p.id === item.id,
                    );
                    if (produtoInfo?.controlarEstoque) {
                        const novoEstoque =
                            (produtoInfo.estoqueAtual || 0) - item.quantidade;
                        await updateDoc(doc(db, "produtos", produtoInfo.id), {
                            estoqueAtual: novoEstoque,
                        });
                        await addDoc(collection(db, "movimentacoes_estoque"), {
                            loja: nomeDaLoja,
                            produtoId: produtoInfo.id,
                            produtoNome: produtoInfo.nome,
                            tipo: "saida",
                            quantidade: item.quantidade,
                            estoqueAnterior: produtoInfo.estoqueAtual || 0,
                            estoqueNovo: novoEstoque,
                            motivo: `Autoatendimento (Mesa ${numeroDaMesa})`,
                            data: new Date().toISOString(),
                        });
                    }
                }

                setCarrinho([]);
                setMostrarModalSucessoMesa(true);
            } catch (error) {
                console.error("ERRO NO FIREBASE:", error);
                alert("Erro ao enviar pedido para a cozinha. Chame o garçom.");
            } finally {
                setProcessandoPedido(false);
            }
            return;
        }

        // Fluxo Delivery Padrão (Sem Mesa)
        if (!nomeCliente || !telefoneCliente) {
            setProcessandoPedido(false);
            return alert(
                "Por favor, preencha o seu nome e telefone para continuar.",
            );
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
                valorTotal: valorTotal,
                valorSinal: valorSinal,
                status: "aguardando_pix",
                criadoEm: new Date().toISOString(),
            });

            // DAR BAIXA NO STOCK PARA DELIVERY
            for (const item of carrinho) {
                const produtoInfo = produtosDaLoja.find(
                    (p) => p.id === item.id,
                );
                if (produtoInfo?.controlarEstoque) {
                    const novoEstoque =
                        (produtoInfo.estoqueAtual || 0) - item.quantidade;
                    await updateDoc(doc(db, "produtos", produtoInfo.id), {
                        estoqueAtual: novoEstoque,
                    });
                    await addDoc(collection(db, "movimentacoes_estoque"), {
                        loja: nomeDaLoja,
                        produtoId: produtoInfo.id,
                        produtoNome: produtoInfo.nome,
                        tipo: "saida",
                        quantidade: item.quantidade,
                        estoqueAnterior: produtoInfo.estoqueAtual || 0,
                        estoqueNovo: novoEstoque,
                        motivo: `Delivery / Encomenda (${nomeCliente})`,
                        data: new Date().toISOString(),
                    });
                }
            }

            setMostrarModalPix(true);
        } catch (erro) {
            console.error(erro);
            alert("Erro ao gerar pedido. Verifique a sua ligação.");
        } finally {
            setProcessandoPedido(false);
        }
    };

    const enviarWhatsAppReal = () => {
        let msg = `*Novo Pedido - ${configLoja?.nomeExibicao || nomeDaLoja}*\n\n`;
        msg += `*Cliente:* ${nomeCliente}\n*Telefone:* ${telefoneCliente}\n`;
        if (cpfCliente) msg += `*CPF:* ${cpfCliente}\n`;
        if (enderecoCliente) msg += `*Endereço:* ${enderecoCliente}\n`;
        msg += `*Data Entrega:* ${dataEntrega ? new Date(dataEntrega).toLocaleString("pt-BR") : "Não informada"}\n\n*Itens:*\n`;
        carrinho.forEach((item) => {
            msg += `• ${item.quantidade}x ${item.nome} → ${formatarDinheiro(item.preco * item.quantidade)}\n`;
        });
        msg += `\n*Total: ${formatarDinheiro(valorTotal)}*\n*Sinal (50%): ${formatarDinheiro(valorTotal * 0.5)}*\n\n✅ *Sinal pago via Pix! (Comprovante anexo)*`;
        window.open(
            `https://wa.me/${configLoja?.whatsapp || "5547999545703"}?text=${encodeURIComponent(msg)}`,
            "_blank",
        );
    };

    const rolarParaCarrinho = () => {
        const elemento = document.getElementById("carrinho-secao");
        if (elemento) elemento.scrollIntoView({ behavior: "smooth" });
    };

    const tema = CATALOGO_TEMAS[configLoja?.tema] || CATALOGO_TEMAS.pink;

    if (loadingConfig)
        return (
            <div
                className={`min-h-screen flex items-center justify-center ${tema.bgFundo}`}
            >
                <p className="text-lg text-slate-600 font-medium animate-pulse">
                    A carregar cardápio...
                </p>
            </div>
        );

    if (
        !configLoja ||
        Object.keys(configLoja).length === 0 ||
        !configLoja.nomeExibicao
    ) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Store size={48} className="text-slate-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 mb-2">
                    Loja não encontrada
                </h2>
                <p className="text-slate-500 max-w-sm">
                    Verifique se digitou o link corretamente na barra de
                    endereço ou escaneou o QR Code correto.
                </p>
            </div>
        );
    }

    const categoriasPresentes = [
        ...new Set(produtosDaLoja.map((p) => p.categoria || "Outros")),
    ].sort();

    return (
        <div
            className={`min-h-screen ${tema.bgFundo} text-slate-800 pb-32 relative transition-colors duration-500`}
        >
            {numeroDaMesa && (
                <div
                    className={`${tema.bgDestaque} text-white p-2 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-md`}
                >
                    <Utensils size={14} /> Atendimento na Mesa {numeroDaMesa}
                </div>
            )}

            <div
                className={`bg-white border-b ${tema.borda} sticky top-0 z-40 shadow-sm`}
            >
                <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {configLoja.logo ? (
                            <img
                                src={configLoja.logo}
                                alt="Logo"
                                className={`w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 ${tema.bordaForte}`}
                            />
                        ) : (
                            <div
                                className={`w-14 h-14 md:w-16 md:h-16 rounded-full ${tema.bgSecundario} ${tema.texto} flex items-center justify-center font-black text-2xl flex-shrink-0`}
                            >
                                {configLoja.nomeExibicao.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-slate-900 line-clamp-1">
                                {configLoja.nomeExibicao}
                            </h1>
                            <p
                                className={`${tema.texto} font-medium text-xs md:text-sm`}
                            >
                                {numeroDaMesa
                                    ? `Faça seu pedido na Mesa ${numeroDaMesa}`
                                    : "Catálogo Digital"}
                            </p>
                        </div>
                    </div>
                    {!numeroDaMesa && (
                        <Link
                            to={`/login/${nomeDaLoja}`}
                            className={`text-xs font-bold text-slate-300 ${tema.hoverTexto} transition-colors flex flex-col items-center gap-1`}
                        >
                            <Lock size={18} />
                            <span className="hidden md:block text-[10px] uppercase tracking-widest">
                                Painel
                            </span>
                        </Link>
                    )}
                </div>
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex gap-3 overflow-x-auto snap-x no-scrollbar">
                    {categoriasPresentes.map((cat) => (
                        <a
                            href={`#cat-${cat.replace(/\s+/g, "-")}`}
                            key={cat}
                            className={`px-5 py-2 bg-slate-50 text-slate-600 rounded-full font-bold text-sm whitespace-nowrap border border-slate-200 ${tema.hoverBorda} ${tema.hoverTexto} ${tema.hoverBgSecundario} transition-colors snap-start`}
                        >
                            {cat}
                        </a>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
                {produtosDaLoja.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <ShoppingBag
                            size={48}
                            className="mx-auto mb-4 opacity-50"
                        />
                        <p className="font-bold text-lg">
                            Cardápio em atualização.
                        </p>
                    </div>
                ) : (
                    categoriasPresentes.map((categoria) => (
                        <div
                            key={categoria}
                            id={`cat-${categoria.replace(/\s+/g, "-")}`}
                            className="mb-14 scroll-mt-40"
                        >
                            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-4">
                                {categoria}{" "}
                                <span
                                    className={`flex-1 h-px ${tema.bordaForte}`}
                                ></span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {produtosDaLoja
                                    .filter(
                                        (p) =>
                                            (p.categoria || "Outros") ===
                                            categoria,
                                    )
                                    .map((produto) => (
                                        <div
                                            key={produto.id}
                                            className={`bg-white p-4 md:p-5 rounded-3xl shadow-sm border ${tema.borda} hover:shadow-md transition-all flex flex-col justify-between`}
                                        >
                                            <img
                                                src={produto.imagem}
                                                alt={produto.nome}
                                                className="w-full h-40 sm:h-48 md:h-56 rounded-2xl mb-4 object-cover bg-slate-100"
                                            />
                                            <div>
                                                <h3 className="font-bold text-lg md:text-xl text-slate-800 mb-1 line-clamp-1">
                                                    {produto.nome}
                                                </h3>
                                                <p className="text-slate-500 text-xs md:text-sm mb-4 line-clamp-2">
                                                    {produto.descricao}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                                                <span
                                                    className={`font-black ${tema.texto} text-xl md:text-2xl`}
                                                >
                                                    {formatarDinheiro(
                                                        produto.preco,
                                                    )}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        adicionarAoCarrinho(
                                                            produto,
                                                        )
                                                    }
                                                    className={`bg-slate-900 ${tema.hoverBotaoEscuro} text-white p-3 rounded-xl md:rounded-2xl font-medium transition-colors flex items-center justify-center shadow-md active:scale-95`}
                                                >
                                                    <Plus
                                                        size={20}
                                                        className="md:w-6 md:h-6"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}

                {carrinho.length > 0 && (
                    <div
                        id="carrinho-secao"
                        className="max-w-2xl mx-auto mt-24 bg-white p-5 md:p-8 rounded-3xl shadow-xl border border-slate-100 scroll-mt-32"
                    >
                        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-6 text-slate-800">
                            <ShoppingCart className={tema.texto} />
                            {numeroDaMesa
                                ? `Sua Conta - Mesa ${numeroDaMesa}`
                                : "O seu Pedido"}
                        </h2>

                        <div className="space-y-3 mb-8">
                            {carrinho.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100"
                                >
                                    <div className="flex-1 pr-2 md:pr-4">
                                        <p className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">
                                            {item.nome}
                                        </p>
                                        <p
                                            className={`${tema.texto} font-medium text-xs md:text-sm`}
                                        >
                                            {formatarDinheiro(item.preco)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-3 bg-white px-2 md:px-3 py-1.5 md:py-2 rounded-xl border border-slate-200 shadow-sm">
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(item.id, -1)
                                            }
                                            className={`text-slate-500 ${tema.hoverTexto} transition-colors p-1`}
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-bold w-4 text-center text-slate-800 text-sm md:text-base">
                                            {item.quantidade}
                                        </span>
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(item.id, 1)
                                            }
                                            className={`text-slate-500 ${tema.hoverTexto} transition-colors p-1`}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() =>
                                            removerDoCarrinho(item.id)
                                        }
                                        className="text-red-400 hover:text-red-600 p-2 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <div
                                className={`flex justify-between items-center mb-8 ${tema.bgFundo} p-4 rounded-2xl border ${tema.borda}`}
                            >
                                <span className="text-base md:text-lg font-bold text-slate-700">
                                    Subtotal:
                                </span>
                                <span
                                    className={`text-2xl md:text-3xl font-black ${tema.texto}`}
                                >
                                    {formatarDinheiro(valorTotal)}
                                </span>
                            </div>

                            {numeroDaMesa ? (
                                <div className="space-y-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4 border-b border-slate-100 pb-4">
                                        Fazer pedido direto da Mesa
                                    </p>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">
                                            O seu Nome (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={nomeCliente}
                                            onChange={(e) =>
                                                setNomeCliente(e.target.value)
                                            }
                                            className={`w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 ${tema.ring} focus:outline-none`}
                                            placeholder="Ex: Maria"
                                        />
                                        <p className="text-xs text-slate-500 mt-2 text-center">
                                            Os itens serão enviados para a
                                            cozinha e adicionados à conta da
                                            Mesa {numeroDaMesa}.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">
                                            O seu Nome *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={nomeCliente}
                                            onChange={(e) =>
                                                setNomeCliente(e.target.value)
                                            }
                                            className={`w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 ${tema.ring} focus:outline-none`}
                                            placeholder="Ex: Maria Silva"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                                            <Phone size={16} /> Telefone
                                            (WhatsApp) *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={telefoneCliente}
                                            onChange={(e) =>
                                                setTelefoneCliente(
                                                    e.target.value,
                                                )
                                            }
                                            className={`w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 ${tema.ring} focus:outline-none`}
                                            placeholder="Ex: 47999999999"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">
                                            CPF (Opcional - Para Nota Fiscal)
                                        </label>
                                        <input
                                            type="text"
                                            value={cpfCliente}
                                            onChange={(e) =>
                                                setCpfCliente(e.target.value)
                                            }
                                            className={`w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 ${tema.ring} focus:outline-none`}
                                            placeholder="Ex: 000.000.000-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">
                                            Endereço de Entrega (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={enderecoCliente}
                                            onChange={(e) =>
                                                setEnderecoCliente(
                                                    e.target.value,
                                                )
                                            }
                                            className={`w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 ${tema.ring} focus:outline-none`}
                                            placeholder="Rua, Número, Bairro"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">
                                            Data e Hora Desejada (Opcional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={dataEntrega}
                                            onChange={(e) =>
                                                setDataEntrega(e.target.value)
                                            }
                                            className={`w-full bg-white [color-scheme:light] text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 ${tema.ring} focus:outline-none`}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={finalizarPedido}
                                disabled={processandoPedido}
                                className={`w-full ${tema.bgDestaque} ${tema.hoverBgDestaque} text-white font-bold text-lg md:text-xl py-4 md:py-5 mt-8 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${tema.shadow} active:scale-95 disabled:opacity-50`}
                            >
                                {processandoPedido
                                    ? "A Processar..."
                                    : numeroDaMesa
                                      ? "Enviar para a Cozinha"
                                      : "Avançar para Pagamento"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {mostrarModalSucessoMesa && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle
                                size={40}
                                className="text-emerald-500"
                            />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">
                            Pedido na Cozinha! 🚀
                        </h2>
                        <p className="text-slate-500 mb-8">
                            Os seus itens foram adicionados à conta da{" "}
                            <b>Mesa {numeroDaMesa}</b> e já começaram a ser
                            preparados.
                        </p>

                        <button
                            onClick={() => {
                                setMostrarModalSucessoMesa(false);
                                window.location.reload();
                            }}
                            className={`w-full ${tema.bgDestaque} ${tema.hoverBgDestaque} text-white py-4 rounded-2xl font-bold transition-colors shadow-md active:scale-95`}
                        >
                            Continuar no Cardápio
                        </button>
                    </div>
                </div>
            )}

            {mostrarModalPix && !numeroDaMesa && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            Pedido Quase Lá! 🎉
                        </h2>
                        <p className="text-slate-500 mb-6 text-sm">
                            Para confirmar sua reserva, realize o pagamento do
                            sinal de 50%:
                        </p>

                        <div
                            className={`${tema.bgFundo} p-4 rounded-2xl mb-6 border ${tema.borda}`}
                        >
                            <p
                                className={`text-xs ${tema.texto} font-bold uppercase tracking-widest mb-1`}
                            >
                                Valor do Sinal
                            </p>
                            <p className="text-4xl font-black text-slate-800">
                                {formatarDinheiro(valorTotal * 0.5)}
                            </p>
                        </div>

                        {pixPayload && (
                            <div className="flex justify-center mb-6">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm inline-block">
                                    <QRCodeCanvas
                                        value={pixPayload}
                                        size={200}
                                        level="M"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(pixPayload);
                                alert("Código Copiado!");
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-bold mb-3 transition-colors shadow-md active:scale-95"
                        >
                            Copiar Código Pix
                        </button>
                        <button
                            onClick={enviarWhatsAppReal}
                            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-2xl font-bold transition-colors shadow-md active:scale-95"
                        >
                            Já paguei! Enviar Comprovante
                        </button>
                    </div>
                </div>
            )}

            {carrinho.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-40 animate-in slide-in-from-bottom duration-300 pointer-events-none">
                    <div className="max-w-4xl mx-auto pointer-events-auto">
                        <button
                            onClick={rolarParaCarrinho}
                            className={`w-full bg-slate-900 text-white p-4 md:p-5 rounded-3xl shadow-2xl flex items-center justify-between ${tema.hoverBgDestaque} transition-all active:scale-95 border border-white/10`}
                        >
                            <div className="flex items-center gap-3 md:gap-4">
                                <div
                                    className={`${tema.bgIconeCarrinho} text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-sm md:text-lg shadow-inner`}
                                >
                                    {totalItens}
                                </div>
                                <span className="font-bold text-sm md:text-lg tracking-tight">
                                    Ver meu pedido
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl">
                                <span className="text-xl md:text-2xl font-black">
                                    {formatarDinheiro(valorTotal)}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
