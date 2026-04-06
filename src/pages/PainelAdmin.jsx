import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
    KanbanSquare,
    Home,
    CheckCircle,
    ChevronRight,
    Package,
    Bike,
    Users,
    ShoppingBag,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import imageCompression from "browser-image-compression";

export default function PainelAdmin() {
    const { nomeDaLoja } = useParams();

    const [abaAtiva, setAbaAtiva] = useState("dashboard");
    const [pedidos, setPedidos] = useState([]);

    useEffect(() => {
        const regraDaBusca = query(
            collection(db, "pedidos"),
            where("loja", "==", nomeDaLoja),
        );

        const desligarAntena = onSnapshot(regraDaBusca, (snapshot) => {
            const pedidosDaNuvem = snapshot.docs.map((documento) => {
                return {
                    id: documento.id,
                    ...documento.data(),
                };
            });

            setPedidos(pedidosDaNuvem);
        });

        return () => desligarAntena();
    }, [nomeDaLoja]);

    const [clientes, setClientes] = useState([
        {
            id: "1",
            nome: "Maria Silva",
            telefone: "5547999991111",
            totalGasto: 75.0,
            pedidos: 1,
        },
        {
            id: "2",
            nome: "João Souza",
            telefone: "5547999545703",
            totalGasto: 160.0,
            pedidos: 2,
        },
    ]);

    const [produtos, setProdutos] = useState([]);

    useEffect(() => {
        const regraBuscaProdutos = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
        );

        const desligarAntenaProdutos = onSnapshot(
            regraBuscaProdutos,
            (snapshot) => {
                const produtosDaNuvem = snapshot.docs.map((documento) => {
                    return {
                        id: documento.id,
                        ...documento.data(),
                    };
                });

                setProdutos(produtosDaNuvem);
            },
        );
        return () => desligarAntenaProdutos();
    }, [nomeDaLoja]);

    const [novoNome, setNovoNome] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [salvandoProduto, setSalvandoProduto] = useState(false);
    const [novoAtivo, setNovoAtivo] = useState(true);

    // Estados de edição do Kanban
    const [editandoId, setEditandoId] = useState(null);
    const [editNome, setEditNome] = useState("");
    const [editTelefone, setEditTelefone] = useState("");

    // Converte os itens do carrinho em texto
    const formatarItensPedido = (itens) => {
        if (!itens || itens.length === 0) return "Nenhum item";
        return itens
            .map((item) => `${item.quantidade}x ${item.nome}`)
            .join(", ");
    };

    const iniciarEdicao = (pedido) => {
        setEditandoId(pedido.id);
        setEditNome(pedido.cliente);
        setEditTelefone(pedido.telefone || "");
    };

    const salvarEdicao = async (id) => {
        try {
            await updateDoc(doc(db, "pedidos", id), {
                cliente: editNome,
                telefone: editTelefone,
            });
            setEditandoId(null);
        } catch (erro) {
            console.error("Erro ao salvar edição:", erro);
        }
    };

    // --- NOVAS FERRAMENTAS PARA O FLUXO DE DATAS ---

    // 1. Descobre se a data do pedido é a mesma data de hoje no computador
    const isHoje = (dataIso) => {
        if (!dataIso) return false;
        const dataPedido = dataIso.split("T")[0]; // Pega só o YYYY-MM-DD do pedido
        const hojeLocal = new Date().toLocaleDateString("en-CA"); // Pega o YYYY-MM-DD de hoje (fuso do BR)
        return dataPedido === hojeLocal;
    };

    const getDiasDaSemana = () => {
        const hoje = new Date();
        // Volta os dias até chegar no domingo (0 = Domingo)
        const domingo = new Date(hoje);
        domingo.setDate(hoje.getDate() - hoje.getDay());

        const dias = [];
        const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        // Roda 7 vezes para preencher a semana
        for (let i = 0; i < 7; i++) {
            const dataAlvo = new Date(domingo);
            dataAlvo.setDate(domingo.getDate() + i);
            dias.push({
                nome: nomesDias[i],
                numero: dataAlvo.getDate(), // O dia do mês (ex: 14)
                dataBusca: dataAlvo.toLocaleDateString("en-CA"), // Formato YYYY-MM-DD para achar no Firebase
            });
        }
        return dias;
    };

    // 2. Transforma "2026-04-14T15:30" em "14/04/2026 às 15:30"
    const formatarDataEHora = (dataIso) => {
        if (!dataIso) return "Sem data agendada";
        const [data, hora] = dataIso.split("T");
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano} às ${hora}`;
    };

    // 3. A Função da Triagem: Aceita o pedido, salva os dados e MANDA O WHATSAPP
    const aceitarPedido = async (pedido) => {
        try {
            // Guardamos os dados finais (seja o editado agora ou o que já estava lá)
            const nomeFinal = editNome || pedido.cliente;
            const telefoneFinal = editTelefone || pedido.telefone;

            // 1. Salva no Banco de Dados
            await updateDoc(doc(db, "pedidos", pedido.id), {
                status: "agendado", // Move para a fila de produção
                cliente: nomeFinal,
                telefone: telefoneFinal,
            });

            // 2. Limpa o formulário da tela
            setEditandoId(null);
            setEditNome("");
            setEditTelefone("");

            // 3. --- MÁGICA DO WHATSAPP DE CONFIRMAÇÃO ---
            if (telefoneFinal) {
                const itensFormatados = formatarItensPedido(pedido.itens);
                const dataFormatada = formatarDataEHora(pedido.dataEntrega);

                // Monta a mensagem bonitinha
                const msg = `Olá, *${nomeFinal}*! \n\nPassando para avisar que o seu pedido foi recebido e *confirmado* na nossa agenda!\n\n *Resumo:* ${itensFormatados}\n *Agendado para:* ${dataFormatada}\n\nMuito obrigado pela preferência. Qualquer dúvida, estamos à disposição!`;

                // Abre a aba do WhatsApp
                window.open(
                    `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(msg)}`,
                    "_blank",
                );
            } else {
                alert(
                    "Pedido aceito e agendado com sucesso! (Não foi possível abrir o WhatsApp pois o cliente está sem telefone).",
                );
            }
        } catch (erro) {
            console.error("Erro ao aceitar pedido:", erro);
            alert("Erro ao confirmar o pedido. Verifique a internet.");
        }
    };

    const adicionarProduto = async (e) => {
        e.preventDefault();
        if (!novoNome || !novoPreco) return alert("Preencha o nome e preço");

        setSalvandoProduto(true);

        try {
            let urlDaFotoPublica = "https://placehold.co/400"; // Imagem padrão

            // 1. Envia a foto para o Cloudinary
            if (imagemArquivo) {
                const opcoesCompressao = {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                };

                const imagemComprimida = await imageCompression(
                    imagemArquivo,
                    opcoesCompressao,
                );

                const formData = new FormData();
                formData.append("file", imagemComprimida);
                formData.append("upload_preset", "doceapp_preset"); // Seu preset

                const respostaCloudinary = await fetch(
                    "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload", // Seu Cloud Name aqui!
                    {
                        method: "POST",
                        body: formData,
                    },
                );

                const dadosImagem = await respostaCloudinary.json();
                urlDaFotoPublica = dadosImagem.secure_url;
            }

            // 2. Salva no Firebase
            await addDoc(collection(db, "produtos"), {
                loja: nomeDaLoja,
                nome: novoNome,
                preco: parseFloat(novoPreco),
                descricao: novaDescricao,
                imagem: urlDaFotoPublica,
                ativo: novoAtivo,
            });

            // 3. Limpa o formulário
            setNovoNome("");
            setNovoPreco("");
            setNovaDescricao("");
            setImagemArquivo(null);
            setNovoAtivo(true);
            e.target.reset(); // Limpa o input de arquivo visualmente
        } catch (erro) {
            console.error("Erro ao adicionar produto:", erro);
            alert("Erro ao salvar o produto. Verifique a internet.");
        } finally {
            setSalvandoProduto(false);
        }
    };

    // const adicionarProduto = async (e) => {
    //     e.preventDefault();
    //     if (!novoNome || !novoPreco) return alert("Preencha o nome e preço");

    //     try {
    //         await addDoc(collection(db, "produtos"), {
    //             loja: nomeDaLoja,
    //             nome: novoNome,
    //             preco: parseFloat(novoPreco),
    //             descricao: novaDescricao,
    //             imagem: novaImagem || "https://placehold.co/400",
    //             ativo: novoAtivo,
    //         });
    //         setNovoNome("");
    //         setNovoPreco("");
    //         setNovaDescricao("");
    //         setNovaImagem("");
    //         setNovoAtivo(true);
    //     } catch (erro) {
    //         console.log("Erro ao adicionar Produto: ", erro);
    //     }
    // };

    const apagarProduto = async (id) => {
        // Confirmação de segurança antes de apagar
        if (
            window.confirm(
                "Tem certeza que deseja apagar este produto permanentemente?",
            )
        ) {
            try {
                await deleteDoc(doc(db, "produtos", id));
            } catch (erro) {
                console.error("Erro ao apagar:", erro);
            }
        }
    };

    const alternarStatus = async (id, statusAtual) => {
        try {
            await updateDoc(doc(db, "produtos", id), {
                ativo: !statusAtual,
            });
        } catch (erro) {
            console.error("Erro ao mudar status:", erro);
        }
    };

    // const adicionarProduto = (e) => {
    //     e.preventDefault();
    //     if (!novoNome || !novoPreco) return alert("Preencha o nome e preço");

    //     const produtoNovo = {
    //         id: Date.now().toString(),
    //         nome: novoNome,
    //         preco: parseFloat(novoPreco),
    //         descricao: novaDescricao,
    //         imagem: novaImagem || "https://placehold.co/400",
    //         ativo: novoAtivo,
    //     };
    //     setProdutos([...produtos, produtoNovo]);
    //     setNovoNome("");
    //     setNovoPreco("");
    //     setNovaDescricao("");
    //     setNovaImagem("");
    //     setNovoAtivo(true);
    // };

    // const apagarProduto = (id) =>
    //     setProdutos(produtos.filter((p) => p.id !== id));

    // const alternarStatus = (id) => {
    //     setProdutos(
    //         produtos.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p)),
    //     );
    // };

    const mudarStatus = async (idDoPedido, novoStatus) => {
        try {
            const pedidoReferencia = doc(db, "pedidos", idDoPedido);
            await updateDoc(pedidoReferencia, { status: novoStatus });
        } catch (erro) {
            console.error("Erro ao mudar o status: ", erro);
            alert(
                "Ops! Não foi possível atualizar o pedido. Verifique a internet.",
            );
        }
    };

    const avisarClientePronto = (pedido) => {
        mudarStatus(pedido.id, "pronto");

        if (!pedido.telefone) {
            alert(
                `O pedido de ${pedido.cliente} está pronto, mas ele não tem WhatsApp cadastrado!`,
            );
            return;
        }

        const msg = `Olá, *${pedido.cliente}*! \n\nPassando para avisar que o seu pedido (*${formatarItensPedido(pedido.itens)}*) já está pronto!`;
        window.open(
            `https://wa.me/${pedido.telefone}?text=${encodeURIComponent(msg)}`,
            "_blank",
        );
    };

    const formatarDinheiro = (valor) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor || 0);

    const pedidosPendentes = pedidos.filter((p) => p.status !== "entregue");

    // --- SEPARANDO AS FILAS PARA O DASHBOARD ---
    // Triagem: Só pedidos 'pendentes' que acabaram de chegar do site
    const pedidosNaTriagem = pedidos.filter((p) => p.status === "pendente");

    // Produção de Hoje: Pedidos aceitos ('agendado' ou 'em_producao') com a data igual a hoje
    const pedidosDeHoje = pedidos.filter(
        (p) =>
            (p.status === "agendado" || p.status === "em_producao") &&
            isHoje(p.dataEntrega),
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
            {/* Menu Lateral */}
            <aside className="bg-white w-full md:w-64 border-r border-slate-200 p-6 flex flex-col shadow-sm">
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">
                        Gestão
                    </h1>
                    <p className="text-sm text-pink-600 font-bold uppercase tracking-widest">
                        {nomeDaLoja}
                    </p>
                </div>
                <nav className="flex md:flex-col gap-2 overflow-x-auto">
                    <button
                        onClick={() => setAbaAtiva("dashboard")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${abaAtiva === "dashboard" ? "bg-pink-100 text-pink-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                        <Home size={20} /> Início
                    </button>
                    <button
                        onClick={() => setAbaAtiva("kanban")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${abaAtiva === "kanban" ? "bg-pink-100 text-pink-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                        <KanbanSquare size={20} /> Produção
                    </button>
                    <button
                        onClick={() => setAbaAtiva("clientes")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${abaAtiva === "clientes" ? "bg-pink-100 text-pink-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                        <Users size={20} /> Clientes
                    </button>
                    <button
                        onClick={() => setAbaAtiva("cardapio")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${abaAtiva === "cardapio" ? "bg-pink-100 text-pink-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                        <ShoppingBag size={20} /> Cardápio
                    </button>
                </nav>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                {/* === TELA 1: DASHBOARD (NOVO FLUXO COM TRIAGEM) === */}
                {abaAtiva === "dashboard" && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-3xl font-bold mb-6">
                            Visão Geral 👩‍🍳
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* QUADRO 1: TRIAGEM (Novos Pedidos do Site) */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800">
                                        Triagem de Pedidos
                                    </h3>
                                    {pedidosNaTriagem.length > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                            {pedidosNaTriagem.length} novos
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {pedidosNaTriagem.length === 0 ? (
                                        <p className="text-slate-400 italic text-sm">
                                            Nenhum pedido novo no momento.
                                        </p>
                                    ) : (
                                        pedidosNaTriagem.map((pedido) => (
                                            <div
                                                key={pedido.id}
                                                className="bg-slate-50 p-4 rounded-2xl border border-red-100"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">
                                                        Para:{" "}
                                                        {formatarDataEHora(
                                                            pedido.dataEntrega,
                                                        )}
                                                    </span>
                                                    <p className="font-black text-pink-600">
                                                        {formatarDinheiro(
                                                            pedido.valorTotal,
                                                        )}
                                                    </p>
                                                </div>

                                                <p className="text-sm font-bold text-slate-700 mb-3">
                                                    {formatarItensPedido(
                                                        pedido.itens,
                                                    )}
                                                </p>

                                                {/* ÁREA DE ACEITE E CADASTRO DO CLIENTE */}
                                                <div className="border-t border-slate-200 pt-3 mt-2">
                                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">
                                                        Confirmar Cliente
                                                    </p>

                                                    {editandoId ===
                                                    pedido.id ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={editNome}
                                                                onChange={(e) =>
                                                                    setEditNome(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full border p-2 text-sm rounded-lg bg-white"
                                                                placeholder="Nome completo"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={
                                                                    editTelefone
                                                                }
                                                                onChange={(e) =>
                                                                    setEditTelefone(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full border p-2 text-sm rounded-lg bg-white"
                                                                placeholder="WhatsApp (Ex: 554799999999)"
                                                            />
                                                            <button
                                                                onClick={() =>
                                                                    aceitarPedido(
                                                                        pedido,
                                                                    )
                                                                }
                                                                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm transition-colors flex justify-center items-center gap-2"
                                                            >
                                                                <CheckCircle
                                                                    size={16}
                                                                />{" "}
                                                                Aceitar e
                                                                Agendar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-slate-800">
                                                                    {
                                                                        pedido.cliente
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    Sem telefone
                                                                    cadastrado
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    iniciarEdicao(
                                                                        pedido,
                                                                    )
                                                                }
                                                                className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition"
                                                            >
                                                                Completar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* QUADRO 2: FILA DE HOJE (Apenas D+0) */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-xl font-bold mb-4 text-slate-800">
                                    Agendados para Hoje
                                </h3>

                                <div className="space-y-4">
                                    {pedidosDeHoje.length === 0 ? (
                                        <p className="text-slate-400 italic text-sm">
                                            Sua agenda de hoje está livre!
                                        </p>
                                    ) : (
                                        pedidosDeHoje.map((pedido) => (
                                            <div
                                                key={pedido.id}
                                                className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100"
                                            >
                                                <div>
                                                    <p className="font-bold text-lg text-slate-800">
                                                        {pedido.cliente}
                                                    </p>
                                                    <p className="text-slate-500 text-sm">
                                                        {formatarItensPedido(
                                                            pedido.itens,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                        {pedido.status ===
                                                        "agendado"
                                                            ? "Na Fila"
                                                            : "Em Preparo"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-1 mt-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                            <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                                Programação da Semana
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {getDiasDaSemana().map((dia) => {
                                    // Filtra os pedidos exatos deste dia.
                                    // Não conta os 'pendentes' (que estão na triagem) nem os 'entregues' (que já saíram)
                                    const pedidosDoDia = pedidos.filter(
                                        (p) =>
                                            p.dataEntrega &&
                                            p.dataEntrega.startsWith(
                                                dia.dataBusca,
                                            ) &&
                                            p.status !== "pendente" &&
                                            p.status !== "entregue",
                                    );

                                    const temPedido = pedidosDoDia.length > 0;

                                    // Confere se esse quadradinho que está sendo desenhado é o dia de Hoje
                                    const isDiaHoje = isHoje(
                                        dia.dataBusca + "T00:00",
                                    );

                                    return (
                                        <div
                                            key={dia.dataBusca}
                                            className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${isDiaHoje ? "bg-pink-50 border-pink-200 shadow-sm" : "bg-slate-50 border-slate-100"}`}
                                        >
                                            <span
                                                className={`text-xs font-black uppercase tracking-widest mb-1 ${isDiaHoje ? "text-pink-500" : "text-slate-400"}`}
                                            >
                                                {dia.nome}
                                            </span>
                                            <span
                                                className={`text-3xl font-black mb-3 ${isDiaHoje ? "text-pink-600" : "text-slate-700"}`}
                                            >
                                                {dia.numero}
                                            </span>

                                            {/* O selo de quantidade de pedidos */}
                                            {temPedido ? (
                                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-lg w-full text-center truncate">
                                                    {pedidosDoDia.length}{" "}
                                                    {pedidosDoDia.length === 1
                                                        ? "pedido"
                                                        : "pedidos"}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs font-medium px-3 py-1.5 w-full text-center border border-dashed border-slate-200 rounded-lg">
                                                    Livre
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* === TELA 2: KANBAN DE PRODUÇÃO === */}
                {abaAtiva === "kanban" && (
                    <div className="animate-in fade-in duration-300 h-full">
                        <h2 className="text-3xl font-bold mb-6">
                            Quadro Kanban
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Coluna 1: A Fazer (Agendados para Hoje ou Amanhã) */}
                            <div className="bg-slate-200/50 rounded-3xl p-4 min-h-[400px]">
                                <h3 className="font-bold text-slate-700 mb-4 px-2">
                                    A Fazer (Hoje / Amanhã)
                                </h3>
                                <div className="space-y-4">
                                    {pedidos
                                        .filter((p) => {
                                            // Filtra apenas os 'agendados'
                                            if (p.status !== "agendado")
                                                return false;

                                            // Lógica para saber se é Amanhã
                                            const hoje = new Date();
                                            const amanha = new Date(hoje);
                                            amanha.setDate(hoje.getDate() + 1);
                                            const dataAmanhaStr =
                                                amanha.toLocaleDateString(
                                                    "en-CA",
                                                );
                                            const isAmanha =
                                                p.dataEntrega &&
                                                p.dataEntrega.split("T")[0] ===
                                                    dataAmanhaStr;

                                            // Mostra se for hoje OU amanhã
                                            return (
                                                isHoje(p.dataEntrega) ||
                                                isAmanha
                                            );
                                        })
                                        .map((pedido) => (
                                            <div
                                                key={pedido.id}
                                                className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-amber-400"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-bold">
                                                        {pedido.cliente}
                                                    </p>
                                                    {/* Badge mostrando o horário e se é hoje ou amanhã */}
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-1 rounded ${isHoje(pedido.dataEntrega) ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-600"}`}
                                                    >
                                                        {isHoje(
                                                            pedido.dataEntrega,
                                                        )
                                                            ? "HOJE "
                                                            : "AMANHÃ "}
                                                        {pedido.dataEntrega
                                                            ? pedido.dataEntrega.split(
                                                                  "T",
                                                              )[1]
                                                            : ""}
                                                    </span>
                                                </div>

                                                <p className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1">
                                                    📞{" "}
                                                    {pedido.telefone ||
                                                        "Sem telefone"}
                                                </p>
                                                <p className="text-sm text-slate-500 mb-3">
                                                    {formatarItensPedido(
                                                        pedido.itens,
                                                    )}
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        mudarStatus(
                                                            pedido.id,
                                                            "em_producao",
                                                        )
                                                    }
                                                    className="w-full bg-amber-100 text-amber-700 py-2 rounded-xl font-bold text-sm flex justify-center items-center gap-1 hover:bg-amber-200"
                                                >
                                                    Preparar{" "}
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Coluna 2: Em Preparo */}
                            <div className="bg-amber-50 rounded-3xl p-4 min-h-[400px]">
                                <h3 className="font-bold text-amber-700 mb-4 px-2">
                                    Em Preparo
                                </h3>
                                <div className="space-y-4">
                                    {pedidos
                                        .filter(
                                            (p) => p.status === "em_producao",
                                        )
                                        .map((pedido) => (
                                            <div
                                                key={pedido.id}
                                                className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-400"
                                            >
                                                <p className="font-bold">
                                                    {pedido.cliente}
                                                </p>
                                                <p className="text-sm text-slate-500 mb-3">
                                                    {formatarItensPedido(
                                                        pedido.itens,
                                                    )}
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        avisarClientePronto(
                                                            pedido,
                                                        )
                                                    }
                                                    className="w-full bg-blue-100 text-blue-700 py-2 rounded-xl font-bold text-sm flex justify-center items-center gap-1 hover:bg-blue-200"
                                                >
                                                    <CheckCircle size={16} />{" "}
                                                    Marcar Pronto
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Coluna 3: Entregues (Sem alteração) */}
                            <div className="bg-green-50 rounded-3xl p-4 min-h-[400px]">
                                <h3 className="font-bold text-green-700 mb-4 px-2">
                                    Entregues
                                </h3>
                                <div className="space-y-4">
                                    {pedidos
                                        .filter(
                                            (p) =>
                                                p.status === "pronto" ||
                                                p.status === "entregue",
                                        )
                                        .map((pedido) => (
                                            <div
                                                key={pedido.id}
                                                className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-400 opacity-60"
                                            >
                                                <p className="font-bold line-through text-slate-500">
                                                    {pedido.cliente}
                                                </p>
                                                {/* CORREÇÃO AQUI TAMBÉM: itens em vez de produto */}
                                                <p className="text-sm text-slate-400">
                                                    {formatarItensPedido(
                                                        pedido.itens,
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TELA 3: CLIENTES E TELA 4: CARDÁPIO (Abaixo não mexemos, estão corretas no seu original) */}
                {/* ... omiti do texto para economizar espaço de leitura, mas estão no código copiado! ... */}

                {abaAtiva === "clientes" && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-3xl font-bold mb-6">
                            Meus Clientes
                        </h2>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {clientes
                                    .sort((a, b) => b.totalGasto - a.totalGasto)
                                    .map((cliente) => (
                                        <div
                                            key={cliente.id}
                                            className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold text-xl">
                                                    {cliente.nome.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg">
                                                        {cliente.nome}
                                                    </h3>
                                                    <a
                                                        href={`https://wa.me/${cliente.telefone}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm text-slate-500 hover:text-green-500 transition-colors"
                                                    >
                                                        Mandar Mensagem
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600 text-xl">
                                                    {formatarDinheiro(
                                                        cliente.totalGasto,
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-400 font-bold uppercase">
                                                    {cliente.pedidos} pedidos
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {abaAtiva === "cardapio" && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-3xl font-bold mb-6">
                            Gestão do Cardápio
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
                                <h3 className="font-bold text-lg text-slate-800">
                                    Novo Doce
                                </h3>

                                <form
                                    onSubmit={adicionarProduto}
                                    className="space-y-4"
                                >
                                    <input
                                        type="text"
                                        placeholder="Nome"
                                        value={novoNome}
                                        onChange={(e) =>
                                            setNovoNome(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Preço"
                                        value={novoPreco}
                                        onChange={(e) =>
                                            setNovoPreco(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                    />

                                    {/* --- AQUI ESTÁ A CORREÇÃO! TROCAMOS O TEXTO PELO FILE --- */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-500 mb-1">
                                            Foto do Doce
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                setImagemArquivo(
                                                    e.target.files[0],
                                                )
                                            }
                                            className="w-full border p-2 rounded-xl bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
                                        />
                                    </div>
                                    {/* -------------------------------------------------------- */}

                                    <textarea
                                        placeholder="Descrição"
                                        value={novaDescricao}
                                        onChange={(e) =>
                                            setNovaDescricao(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                        rows="2"
                                    ></textarea>
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={novoAtivo}
                                            onChange={(e) =>
                                                setNovoAtivo(e.target.checked)
                                            }
                                            className="w-5 h-5 accent-pink-600"
                                        />
                                        <span className="font-bold text-slate-600">
                                            Produto Ativo
                                        </span>
                                    </label>

                                    {/* --- AQUI ESTÁ O NOVO BOTÃO QUE MUDA DE TEXTO --- */}
                                    <button
                                        type="submit"
                                        disabled={salvandoProduto}
                                        className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all ${salvandoProduto ? "bg-pink-300 cursor-not-allowed" : "bg-pink-600 hover:bg-pink-700 shadow-pink-200"}`}
                                    >
                                        {salvandoProduto
                                            ? "Enviando Imagem..."
                                            : "Salvar no Cardápio"}
                                    </button>
                                    {/* ------------------------------------------------ */}
                                </form>

                                {/* <form
                                    onSubmit={adicionarProduto}
                                    className="space-y-4"
                                >
                                    <input
                                        type="text"
                                        placeholder="Nome"
                                        value={novoNome}
                                        onChange={(e) =>
                                            setNovoNome(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Preço"
                                        value={novoPreco}
                                        onChange={(e) =>
                                            setNovoPreco(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Link da Foto (URL)"
                                        value={novaImagem}
                                        onChange={(e) =>
                                            setNovaImagem(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                    />
                                    <textarea
                                        placeholder="Descrição"
                                        value={novaDescricao}
                                        onChange={(e) =>
                                            setNovaDescricao(e.target.value)
                                        }
                                        className="w-full border p-3 rounded-xl bg-slate-50"
                                        rows="2"
                                    ></textarea>
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={novoAtivo}
                                            onChange={(e) =>
                                                setNovoAtivo(e.target.checked)
                                            }
                                            className="w-5 h-5 accent-pink-600"
                                        />
                                        <span className="font-bold text-slate-600">
                                            Produto Ativo
                                        </span>
                                    </label>
                                    <button
                                        type="submit"
                                        className="w-full bg-pink-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-pink-200"
                                    >
                                        Salvar no Cardápio
                                    </button>
                                </form> */}
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                {produtos.map((p) => (
                                    <div
                                        key={p.id}
                                        className={`bg-white p-4 rounded-2xl border flex items-center gap-4 transition-opacity ${p.ativo ? "border-slate-100" : "border-red-100 opacity-60"}`}
                                    >
                                        <img
                                            src={p.imagem}
                                            alt={p.nome}
                                            className="w-20 h-20 rounded-xl object-cover bg-slate-100"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg">
                                                    {p.nome}
                                                </h4>
                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${p.ativo ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                                                >
                                                    {p.ativo
                                                        ? "Disponível"
                                                        : "Pausado"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-1">
                                                {p.descricao}
                                            </p>
                                            <p className="font-black text-pink-600">
                                                {formatarDinheiro(p.preco)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() =>
                                                    alternarStatus(
                                                        p.id,
                                                        p.ativo,
                                                    )
                                                }
                                                className="text-xs font-bold p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                                            >
                                                {p.ativo ? "Pausar" : "Ativar"}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    apagarProduto(p.id)
                                                }
                                                className="text-xs font-bold p-2 rounded-lg text-red-500 hover:bg-red-50"
                                            >
                                                Apagar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
