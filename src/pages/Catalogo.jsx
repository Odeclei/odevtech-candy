import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ShoppingCart,
    Plus,
    Minus,
    X,
    Phone,
    ShoppingBag,
    Lock,
    Store,
} from "lucide-react";
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { getLojaConfig } from "../config/lojas";
import { gerarPixCopiaECola } from "../utils/pixUtils";
import { QRCodeCanvas } from "qrcode.react";

export default function Catalogo() {
    const { nomeDaLoja } = useParams();

    const [configLoja, setConfigLoja] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [carrinho, setCarrinho] = useState([]);
    const [nomeCliente, setNomeCliente] = useState("");
    const [telefoneCliente, setTelefoneCliente] = useState("");
    const [dataEntrega, setDataEntrega] = useState("");
    const [cpfCliente, setCpfCliente] = useState("");
    const [enderecoCliente, setEnderecoCliente] = useState("");
    const [mostrarModalPix, setMostrarModalPix] = useState(false);
    const [pixPayload, setPixPayload] = useState("");
    const [produtosDaLoja, setProdutosDaLoja] = useState([]);

    useEffect(() => {
        const carregarConfig = async () => {
            setLoadingConfig(true);
            const config = await getLojaConfig(nomeDaLoja);
            setConfigLoja(config);
            setLoadingConfig(false);
        };
        carregarConfig();
    }, [nomeDaLoja]);

    useEffect(() => {
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
        if (!nomeCliente || !telefoneCliente)
            return alert(
                "Por favor, preencha o seu nome e telefone para continuar.",
            );
        const valorSinal = valorTotal * 0.5;
        const payload = gerarPixCopiaECola(
            configLoja?.chavePix || "000",
            configLoja?.nomePix || "Confeitaria",
            configLoja?.cidade || "SAO BENTO DO SUL",
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
            setMostrarModalPix(true);
        } catch (erro) {
            alert("Erro ao gerar pedido. Verifique a sua ligação.");
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

    if (loadingConfig)
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50">
                <p className="text-lg text-slate-600 font-medium animate-pulse">
                    A carregar catálogo...
                </p>
            </div>
        );
    if (
        !configLoja ||
        Object.keys(configLoja).length === 0 ||
        !configLoja.nomeExibicao
    ) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Store size={48} className="text-slate-400" />
                </div>
                <h1 className="text-6xl font-black text-slate-300 mb-2 tracking-tighter">
                    404
                </h1>
                <h2 className="text-2xl font-bold text-slate-700 mb-4">
                    Loja não encontrada
                </h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                    O endereço que tentou aceder não existe ou a loja está
                    indisponível no momento.
                    <br />
                    <br />
                    Verifique se digitou o link corretamente na barra de
                    endereço.
                </p>
            </div>
        );
    }

    const categoriasPresentes = [
        ...new Set(produtosDaLoja.map((p) => p.categoria || "Outros")),
    ].sort();

    return (
        // O pb-32 garante que o rodapé fixo não tape o último produto!
        <div className="min-h-screen bg-pink-50 text-slate-800 pb-32 relative">
            {/* Cabeçalho e Capa */}
            <div className="bg-white border-b border-pink-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-row justify-between items-center gap-4">
                    {/* Lado Esquerdo: Logo e Nome */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {configLoja.logo ? (
                            <img
                                src={configLoja.logo}
                                alt="Logo"
                                className="w-16 h-16 rounded-full object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-2xl flex-shrink-0">
                                {configLoja.nomeExibicao.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 line-clamp-1">
                                {configLoja.nomeExibicao}
                            </h1>
                            <p className="text-pink-600 font-medium text-sm">
                                Catálogo Digital
                            </p>
                        </div>
                    </div>

                    {/* Lado Direito: Botão Discreto de Login para a Cris */}
                    <Link
                        to={`/login/${nomeDaLoja}`}
                        className="text-xs font-bold text-slate-300 hover:text-pink-600 transition-colors flex flex-col items-center gap-1"
                        title="Acesso Restrito ao Painel"
                    >
                        <Lock size={18} />
                        <span className="hidden md:block text-[10px] uppercase tracking-widest">
                            Painel
                        </span>
                    </Link>
                </div>
                {/* Menu Deslizante de Categorias */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex gap-3 overflow-x-auto snap-x no-scrollbar">
                    {categoriasPresentes.map((cat) => (
                        <a
                            href={`#cat-${cat.replace(/\s+/g, "-")}`}
                            key={cat}
                            className="px-5 py-2 bg-slate-50 text-slate-600 rounded-full font-bold text-sm whitespace-nowrap border border-slate-200 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition-colors snap-start"
                        >
                            {cat}
                        </a>
                    ))}
                </div>
            </div>

            {/* Lista de Produtos */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
                {produtosDaLoja.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <ShoppingBag
                            size={48}
                            className="mx-auto mb-4 opacity-50"
                        />
                        <p className="font-bold text-lg">
                            A loja ainda não tem produtos ativos.
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
                                <span className="flex-1 h-px bg-pink-200"></span>
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
                                            className="bg-white p-5 rounded-3xl shadow-sm border border-pink-100 hover:shadow-md transition-all flex flex-col justify-between"
                                        >
                                            <img
                                                src={produto.imagem}
                                                alt={produto.nome}
                                                className="w-full h-48 sm:h-56 rounded-2xl mb-4 object-cover bg-slate-100"
                                            />
                                            <div>
                                                <h3
                                                    className="font-bold text-xl text-slate-800 mb-1 line-clamp-1"
                                                    title={produto.nome}
                                                >
                                                    {produto.nome}
                                                </h3>
                                                <p
                                                    className="text-slate-500 text-sm mb-4 line-clamp-2"
                                                    title={produto.descricao}
                                                >
                                                    {produto.descricao}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                                                <span className="font-black text-pink-600 text-2xl">
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
                                                    className="bg-slate-900 hover:bg-pink-600 text-white p-3 rounded-2xl font-medium transition flex items-center justify-center shadow-md"
                                                >
                                                    <Plus size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}

                {/* CARRINHO DE COMPRAS E FORMULÁRIO */}
                {carrinho.length > 0 && (
                    <div
                        id="carrinho-secao"
                        className="max-w-2xl mx-auto mt-24 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 scroll-mt-32"
                    >
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6 text-slate-800">
                            <ShoppingCart className="text-pink-600" /> O seu
                            Pedido
                        </h2>

                        <div className="space-y-4 mb-8">
                            {carrinho.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100"
                                >
                                    <div className="flex-1 pr-4">
                                        <p className="font-bold text-slate-800 line-clamp-1">
                                            {item.nome}
                                        </p>
                                        <p className="text-pink-600 font-medium">
                                            {formatarDinheiro(item.preco)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(item.id, -1)
                                            }
                                            className="text-slate-500 hover:text-pink-600 transition-colors"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <span className="font-bold w-4 text-center text-slate-800">
                                            {item.quantidade}
                                        </span>
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(item.id, 1)
                                            }
                                            className="text-slate-500 hover:text-pink-600 transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() =>
                                            removerDoCarrinho(item.id)
                                        }
                                        className="text-red-400 hover:text-red-600 p-2 ml-2 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex justify-between items-center mb-8 bg-pink-50 p-4 rounded-2xl border border-pink-100">
                                <span className="text-lg font-bold text-slate-700">
                                    Total a Pagar:
                                </span>
                                <span className="text-3xl font-black text-pink-600">
                                    {formatarDinheiro(valorTotal)}
                                </span>
                            </div>

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
                                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        placeholder="Ex: Maria Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                                        <Phone size={16} /> Telefone (WhatsApp)
                                        *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={telefoneCliente}
                                        onChange={(e) =>
                                            setTelefoneCliente(e.target.value)
                                        }
                                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-pink-400 focus:outline-none"
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
                                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-pink-400 focus:outline-none"
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
                                            setEnderecoCliente(e.target.value)
                                        }
                                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-pink-400 focus:outline-none"
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
                                        className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={finalizarPedido}
                                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xl py-5 mt-8 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-200 active:scale-95"
                            >
                                Avançar para Pagamento
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DO PIX COM QR CODE */}
            {mostrarModalPix && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            Pedido Quase Lá! 🎂
                        </h2>
                        <p className="text-slate-500 mb-6 text-sm">
                            Para confirmar sua reserva, realize o pagamento do
                            sinal de 50%:
                        </p>

                        <div className="bg-pink-50 p-4 rounded-2xl mb-6 border border-pink-100">
                            <p className="text-xs text-pink-600 font-bold uppercase tracking-widest mb-1">
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
                                alert(
                                    "Código Copiado! Abra a sua App bancária e escolha a opção 'Pix Copia e Cola'.",
                                );
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

            {/* BARRA INFERIOR FIXA (STICKY CHECKOUT) */}
            {carrinho.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-40 animate-in slide-in-from-bottom duration-300 pointer-events-none">
                    <div className="max-w-4xl mx-auto pointer-events-auto">
                        <button
                            onClick={rolarParaCarrinho}
                            className="w-full bg-slate-900 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between hover:bg-pink-600 transition-all active:scale-95 border border-white/10"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner">
                                    {totalItens}
                                </div>
                                <span className="font-bold text-lg tracking-tight hidden sm:block">
                                    Ver meu pedido
                                </span>
                                <span className="font-bold text-lg tracking-tight sm:hidden">
                                    Carrinho
                                </span>
                            </div>

                            <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl">
                                <span className="text-slate-300 text-sm font-medium hidden sm:block">
                                    Total:
                                </span>
                                <span className="text-xl font-black">
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
