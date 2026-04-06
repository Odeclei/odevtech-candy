import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Catalogo() {
    // 1. Pescando o nome da loja da URL!
    // Se você acessar localhost:5173/crisdoces, a variável nomeDaLoja valerá "crisdoces"
    const { nomeDaLoja } = useParams();

    // a memoria Usestate
    // carrinho: é a variável que guarda a lista atual;
    // setCarrinho: é a unica função autorizada a mudar o carrinho
    const [carrinho, setCarrinho] = useState([]);
    const [nomeCliente, setNomeCliente] = useState("");
    const [dataEntrega, setDataEntrega] = useState("");

    // Vamos simular um "Banco de Dados" mental por enquanto.
    // Mais pra frente, você vai usar o 'nomeDaLoja' para buscar no Firebase!
    const dadosDoBanco = {
        crisdoces: {
            nomeExibicao: "Doces da Cris",
            corPrincipal: "pink",
            produtos: ["Bolo de Morango", "Brigadeiro"],
        },
        maria: {
            nomeExibicao: "Delícias da Maria",
            corPrincipal: "blue",
            produtos: ["Torta de Limão", "Bolo de Cenoura"],
        },
    };
    // 2. Procuramos se a loja existe no nosso "banco"
    const dadosDaLoja = dadosDoBanco[nomeDaLoja];

    // 3. Se a loja não existir, mostramos uma mensagem de erro
    if (!dadosDaLoja) {
        return <h2>Ops! Loja "{nomeDaLoja}" não encontrada.</h2>;
    }

    // 3. SIMULANDO O BANCO DE DADOS (Mais pra frente virá do Firebase)
    const produtosDaLoja = [
        {
            id: "1",
            nome: "Bolo de Morango com Ninho",
            preco: 75.0,
            descricao: "Massa branca, recheio duplo",
            imagem: "https://placehold.jp/3d4070/ffffff/150x150.png", // Imagem padrão se vazio
            ativo: true,
        },
        {
            id: "2",
            nome: "Cento de Brigadeiro",
            preco: 80.0,
            descricao: "Cacau 50% e granulado belga",
            imagem: "https://placehold.jp/3d4070/ffffff/150x150.png", // Imagem padrão se vazio
            ativo: true,
        },
        {
            id: "3",
            nome: "Torta de Limão",
            preco: 95.0,
            descricao: "Massa amanteigada e merengue",
            imagem: "https://placehold.jp/3d4070/ffffff/150x150.png", // Imagem padrão se vazio
            ativo: true,
        },
    ];

    const adicionarAoCarrinho = (produto) => {
        //procura se o produto já esta no carrinho
        const itemjaExiste = carrinho.find((item) => item.id === produto.id);

        if (itemjaExiste) {
            //se já existe, aumenta a quantidade
            const novoCarrinho = carrinho.map((item) => {
                if (item.id === produto.id) {
                    return { ...item, quantidade: item.quantidade + 1 };
                }
                return item;
            });
            setCarrinho(novoCarrinho);
        } else {
            setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
        }
    };

    const alterarQuantidade = (produtoId, delta) => {
        const novoCarrinho = carrinho.map((item) => {
            if (item.id === produtoId) {
                return {
                    ...item,
                    quantidade: Math.max(1, item.quantidade + delta),
                };
            }
            return item;
        });
        setCarrinho(novoCarrinho);
    };

    const removerDoCarrinho = (produtoId) => {
        setCarrinho(carrinho.filter((item) => item.id !== produtoId));
    };

    const valorTotal = carrinho.reduce(
        (total, item) => total + item.preco * item.quantidade,
        0,
    );

    const formatarDataBr = (dataIso) => {
        if (!dataIso) return "Data não informada";

        const [data, hora] = dataIso.split("T");

        const [ano, mes, dia] = data.split("-");

        return `${dia}/${mes}/${ano} ${hora}`;
    };

    const enviarWhatsApp = async () => {
        if (!nomeCliente) {
            alert("Por favor, preencha o seu nome para entregar o peedido");
            return;
        }

        try {
            const pedidoParaBanco = {
                loja: nomeDaLoja,
                cliente: nomeCliente,
                telefone: "",
                dataEntrega: dataEntrega,
                itens: carrinho,
                valorTotal: valorTotal,
                status: "pendente",
                criadoEm: new Date().toISOString(),
            };

            const pedidosGaveta = collection(db, "pedidos");

            await addDoc(pedidosGaveta, pedidoParaBanco);

            console.log("Pedido enviado com sucesso!");
        } catch (erro) {
            console.log("erro ao salvar no banco", erro);
        }

        let msg = `*Novo Pedido - Loja ${nomeDaLoja}*\n\n`;
        msg += `*Cliente:* ${nomeCliente}\n`;
        msg += `*Data Entrega:* ${formatarDataBr(dataEntrega)}\n\n*Pedido:*\n`;

        carrinho.forEach((item) => {
            msg += `• ${item.quantidade}x ${item.nome} -> R$ ${item.preco * item.quantidade}\n`;
        });

        msg += `\n*Total: R$ ${valorTotal}*`;

        // Redireciona para o Whats!
        window.open(
            `https://wa.me/5547999545703?text=${encodeURIComponent(msg)}`,
            "_blank",
        );
    };

    const formatarDinheiro = (valor) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor);

    // Visual
    return (
        <div className="min-h-screen bg-pink-50 p-4 md:p-8 text-slate-800 font-sans pb-32">
            {/* Cabeçalho */}
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 mt-6 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">
                        Cardápio
                    </h1>
                    <p className="text-slate-500 uppercase tracking-widest text-sm">
                        Loja: {nomeDaLoja}
                    </p>
                </div>

                <Link
                    to={`/admin/${nomeDaLoja}`}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md flex items-center gap-2"
                >
                    Acessar Painel
                </Link>
            </div>

            {/* Lista de Produtos (Grid) */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Usamos o .map() para desenhar um "Card" para cada produto na lista */}
                {produtosDaLoja
                    .filter((p) => p.ativo)
                    .map((produto) => (
                        <div
                            key={produto.id}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 flex flex-col justify-between hover:shadow-md transition-shadow"
                        >
                            <div>
                                <img
                                    src={produto.imagem}
                                    alt={produto.nome}
                                    className="w-full rounded-2xl"
                                />
                            </div>
                            <div className="mb-4">
                                <h3 className="font-bold text-xl text-slate-800">
                                    {produto.nome}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    {produto.descricao}
                                </p>
                            </div>
                            <div className="flex justify-between items-end mt-4 border-t border-slate-50 pt-4">
                                <span className="font-black text-pink-600 text-xl">
                                    {formatarDinheiro(produto.preco)}
                                </span>
                                <button
                                    onClick={() => adicionarAoCarrinho(produto)}
                                    className="bg-pink-100 text-pink-700 hover:bg-pink-600 hover:text-white p-3 rounded-2xl font-bold transition-colors flex items-center gap-2"
                                >
                                    <Plus size={20} /> Adicionar
                                </button>
                            </div>
                        </div>
                    ))}
            </div>

            {/* IF DO REACT: Essa div inteira do Carrinho SÓ APARECE se tiver itens na "memória" (carrinho.length > 0)
             */}
            {carrinho.length > 0 && (
                <div className="max-w-2xl mx-auto mt-16 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-6 text-slate-800">
                        <ShoppingCart className="text-pink-600" /> Seu Pedido
                    </h2>

                    <div className="space-y-4 mb-8">
                        {carrinho.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl"
                            >
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 leading-tight">
                                        {item.nome}
                                    </p>
                                    <p className="text-pink-600 font-bold text-sm">
                                        {formatarDinheiro(item.preco)}
                                    </p>
                                </div>

                                {/* Controles de Quantidade */}
                                <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm mx-2">
                                    <button
                                        onClick={() =>
                                            alterarQuantidade(item.id, -1)
                                        }
                                        className="text-slate-400 hover:text-pink-600"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="font-bold w-4 text-center">
                                        {item.quantidade}
                                    </span>
                                    <button
                                        onClick={() =>
                                            alterarQuantidade(item.id, 1)
                                        }
                                        className="text-slate-400 hover:text-pink-600"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => removerDoCarrinho(item.id)}
                                    className="text-red-400 hover:text-red-600 p-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 pt-6 mb-6">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-slate-500 font-medium">
                                Total Estimado:
                            </span>
                            <span className="text-3xl font-black text-slate-900">
                                {formatarDinheiro(valorTotal)}
                            </span>
                        </div>

                        {/* O value={nomeCliente} "prende" o input na memória do React */}
                        <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
                            Qual o seu nome?
                        </label>
                        <input
                            type="text"
                            placeholder="Digite para prosseguir..."
                            className="w-full border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50 mb-4"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                        />
                        <input
                            type="datetime-local"
                            className="w-full border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50 mb-4"
                            value={dataEntrega}
                            onChange={(e) => setDataEntrega(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={enviarWhatsApp}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg py-4 rounded-2xl transition-transform active:scale-95 shadow-md flex justify-center items-center gap-2"
                    >
                        Pedir no WhatsApp
                    </button>
                </div>
            )}
        </div>
    );
}
