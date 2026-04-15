import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    Home,
    KanbanSquare,
    ShoppingBag,
    AlertCircle,
    Clock,
    CheckCircle,
    Settings,
    Save,
    Users,
    ChevronRight,
    Plus,
    Image as ImageIcon,
    Trash2,
    UserPlus,
    Edit,
    FileText,
    Building2,
    CreditCard,
    ShieldAlert,
    Upload,
    LogOut,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { getLojaConfig } from "../config/lojas";
import imageCompression from "browser-image-compression";

export default function PainelAdmin() {
    const { nomeDaLoja } = useParams();
    const navigate = useNavigate();

    // ==========================================
    // ESTADOS DA TELA E BANCO DE DADOS
    // ==========================================
    const [abaAtiva, setAbaAtiva] = useState("dashboard");
    const [abaConfig, setAbaConfig] = useState("empresa");
    const [configLoja, setConfigLoja] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [membrosEquipe, setMembrosEquipe] = useState([]);

    // Estados: Configurações da Loja
    const [editNomeExibicao, setEditNomeExibicao] = useState("");
    const [editWhatsapp, setEditWhatsapp] = useState("");
    const [editRazaoSocial, setEditRazaoSocial] = useState("");
    const [editCnpj, setEditCnpj] = useState("");
    const [editCep, setEditCep] = useState("");
    const [editLogradouro, setEditLogradouro] = useState("");
    const [editNumero, setEditNumero] = useState("");
    const [editBairro, setEditBairro] = useState("");
    const [editCidade, setEditCidade] = useState("");
    const [editEstado, setEditEstado] = useState("");
    const [logoArquivo, setLogoArquivo] = useState(null);
    const [logoAtual, setLogoAtual] = useState("");
    const [salvandoConfig, setSalvandoConfig] = useState(false);

    //ESTADOS: Configurações de Pagamento
    const [editChavePix, setEditChavePix] = useState("");
    const [editNomePix, setEditNomePix] = useState("");

    //Estados: Configurações de Equipe
    const [novoMembroNome, setNovoMembroNome] = useState("");
    const [novoMembroEmail, setNovoMembroEmail] = useState("");
    const [novoMembroSenha, setNovoMembroSenha] = useState("");
    const [novoMembroRole, setNovoMembroRole] = useState("Colaborador");
    const [salvandoMembro, setSavandoMembro] = useState(false);

    // Estados: Triagem de Pedidos
    const [editandoId, setEditandoId] = useState(null);
    const [editNome, setEditNome] = useState("");
    const [editTelefone, setEditTelefone] = useState("");
    const [sinalPago, setSinalPago] = useState(false);

    // Estados: CRUD de Produtos (NOVO: Categorias e Edição)
    const [editandoProdutoId, setEditandoProdutoId] = useState(null);
    const [produtoImagemAtual, setProdutoImagemAtual] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");
    const [novaCategoria, setNovaCategoria] = useState("Doces Tradicionais");
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [salvandoProduto, setSalvandoProduto] = useState(false);
    const [novoAtivo, setNovoAtivo] = useState(true);

    // Estados: CRUD de Clientes (CRM)
    const [editandoClienteId, setEditandoClienteId] = useState(null);
    const [crmNome, setCrmNome] = useState("");
    const [crmTelefone, setCrmTelefone] = useState("");
    const [crmCpf, setCrmCpf] = useState("");
    const [crmEndereco, setCrmEndereco] = useState("");
    const [salvandoCliente, setSalvandoCliente] = useState(false);

    // Estados: Entrega e Pagamento Final (Kanban)
    const [editandoEntregaId, setEditandoEntregaId] = useState(null);
    const [saldoRecebido, setSaldoRecebido] = useState(false);

    // Extrair Categorias Únicas para sugestão
    const categoriasExistentes = [
        ...new Set(produtos.map((p) => p.categoria || "Geral")),
    ];

    // ==========================================
    // CARREGAMENTO DE DADOS (USE EFFECTS)
    // ==========================================
    useEffect(() => {
        getLojaConfig(nomeDaLoja).then((config) => {
            setConfigLoja(config);
            if (config) {
                setEditNomeExibicao(config.nomeExibicao || "");
                setEditWhatsapp(config.whatsapp || "");
                setEditRazaoSocial(config.razaoSocial || "");
                setEditCnpj(config.cnpj || "");
                setEditCep(config.cep || "");
                setEditLogradouro(config.logradouro || "");
                setEditNumero(config.numero || "");
                setEditBairro(config.bairro || "");
                setEditCidade(config.cidade || "");
                setEditEstado(config.estado || "");
                setEditChavePix(config.chavePix || "");
                setEditNomePix(config.nomePix || "");
                setLogoAtual(config.logo || "");
            }
        });
    }, [nomeDaLoja]);

    useEffect(() => {
        const q = query(
            collection(db, "pedidos"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) =>
            setPedidos(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            ),
        );
    }, [nomeDaLoja]);

    useEffect(() => {
        const q = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) =>
            setProdutos(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            ),
        );
    }, [nomeDaLoja]);

    useEffect(() => {
        const q = query(
            collection(db, "clientes"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) =>
            setClientes(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            ),
        );
    }, [nomeDaLoja]);

    useEffect(() => {
        const q = query(
            collection(db, "equipe"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) =>
            setMembrosEquipe(
                snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            ),
        );
    }, [nomeDaLoja]);

    // ==========================================
    // FUNÇÕES UTILITÁRIAS (DATAS E DINHEIRO)
    // ==========================================
    const formatarDinheiro = (valor) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valor || 0);
    const formatarItensPedido = (itens) =>
        !itens || itens.length === 0
            ? "Nenhum item"
            : itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ");

    const isHoje = (dataIso) => {
        if (!dataIso) return false;
        return dataIso.split("T")[0] === new Date().toLocaleDateString("en-CA");
    };

    const formatarDataEHora = (dataIso) => {
        if (!dataIso) return "Sem data";
        const [data, hora] = dataIso.split("T");
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano} às ${hora}`;
    };

    const getDiasDaSemana = () => {
        const hoje = new Date();
        const domingo = new Date(hoje);
        domingo.setDate(hoje.getDate() - hoje.getDay());
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(domingo);
            d.setDate(domingo.getDate() + i);
            return {
                nome: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i],
                numero: d.getDate(),
                dataBusca: d.toLocaleDateString("en-CA"),
            };
        });
    };

    // ==========================================
    // AÇÕES: TRIAGEM E KANBAN
    // ==========================================
    const iniciarEdicao = (pedido) => {
        setEditandoId(pedido.id);
        setEditNome(pedido.cliente);
        setEditTelefone(pedido.telefone || "");
        setSinalPago(pedido.sinalPago || false);
    };

    const aceitarPedido = async (pedido) => {
        try {
            const nomeFinal = editNome || pedido.cliente;
            const telefoneFinal = editTelefone || pedido.telefone;

            await updateDoc(doc(db, "pedidos", pedido.id), {
                status: "agendado",
                cliente: nomeFinal,
                telefone: telefoneFinal,
                sinalPago: sinalPago,
            });

            setEditandoId(null);
            setEditNome("");
            setEditTelefone("");
            setSinalPago(false);

            if (telefoneFinal) {
                const statusPag = sinalPago
                    ? "✅ *Sinal de 50% confirmado!*"
                    : "⏳ *Aguardando pagamento do sinal.*";
                const msg = `Olá, *${nomeFinal}*! \n\nSeu pedido foi recebido e agendado na nossa produção!\n\n${statusPag}\n\n📋 *Resumo:* ${formatarItensPedido(pedido.itens)}\n📅 *Para:* ${formatarDataEHora(pedido.dataEntrega)}\n\nObrigado pela preferência!`;
                window.open(
                    `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(msg)}`,
                    "_blank",
                );
            }
        } catch (erro) {
            console.error(erro);
            alert("Erro ao confirmar pedido.");
        }
    };

    const mudarStatus = async (id, status) =>
        updateDoc(doc(db, "pedidos", id), { status });

    const avisarClientePronto = (pedido) => {
        mudarStatus(pedido.id, "pronto");
        if (pedido.telefone) {
            const msg = `Olá, *${pedido.cliente}*! \n\nPassando para avisar que o seu pedido já está pronto para retirada/entrega! 🧁`;
            window.open(
                `https://wa.me/${pedido.telefone}?text=${encodeURIComponent(msg)}`,
                "_blank",
            );
        }
    };

    // NOVO: Fluxo de Entrega e Cobrança
    const iniciarEntrega = (id) => {
        setEditandoEntregaId(id);
        setSaldoRecebido(false); // Reseta o checkbox
    };

    const confirmarEntrega = async (pedido) => {
        if (!saldoRecebido) {
            if (
                !window.confirm(
                    "O saldo ainda não foi marcado como recebido. Deseja entregar assim mesmo?",
                )
            )
                return;
        }
        try {
            await updateDoc(doc(db, "pedidos", pedido.id), {
                status: "entregue",
                saldoPago: saldoRecebido,
            });
            setEditandoEntregaId(null);
            setSaldoRecebido(false);
        } catch (erro) {
            console.error("Erro ao entregar:", erro);
            alert("Erro ao confirmar a entrega.");
        }
    };

    // NOVO: Botão de Nota Fiscal (Preparado para integração)
    const emitirNF = (pedido) => {
        // Isso aqui no futuro chamará a API do NFe.io ou Focus NFe
        alert(
            `Integração de Nota Fiscal (NFC-e) em breve!\n\nSerá emitida uma nota para ${pedido.cliente} no valor de ${formatarDinheiro(pedido.valorTotal)}.`,
        );
    };

    // ==========================================
    // AÇÕES: CARDÁPIO (CLOUDINARY) E CRM
    // ==========================================
    // const adicionarProduto = async (e) => {
    //     e.preventDefault();
    //     if (!novoNome || !novoPreco) return alert("Preencha nome e preço");
    //     setSalvandoProduto(true);

    //     try {
    //         let urlDaFoto = "https://placehold.co/400";
    //         if (imagemArquivo) {
    //             const imagemComprimida = await imageCompression(imagemArquivo, {
    //                 maxSizeMB: 0.3,
    //                 maxWidthOrHeight: 800,
    //             });
    //             const formData = new FormData();
    //             formData.append("file", imagemComprimida);
    //             formData.append("upload_preset", "doceapp_preset");

    //             const resposta = await fetch(
    //                 "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
    //                 { method: "POST", body: formData },
    //             );
    //             const dados = await resposta.json();
    //             urlDaFoto = dados.secure_url;
    //         }

    //         await addDoc(collection(db, "produtos"), {
    //             loja: nomeDaLoja,
    //             nome: novoNome,
    //             preco: parseFloat(novoPreco),
    //             descricao: novaDescricao,
    //             imagem: urlDaFoto,
    //             ativo: novoAtivo,
    //         });

    //         setNovoNome("");
    //         setNovoPreco("");
    //         setNovaDescricao("");
    //         setImagemArquivo(null);
    //         setNovoAtivo(true);
    //         e.target.reset();
    //     } catch (erro) {
    //         console.error(erro);
    //         alert("Erro ao salvar produto.");
    //     } finally {
    //         setSalvandoProduto(false);
    //     }
    // };
    const salvarProduto = async (e) => {
        e.preventDefault();
        if (!novoNome || !novoPreco) return alert("Preencha nome e preço");
        setSalvandoProduto(true);

        try {
            // Se está a editar e não escolheu nova foto, mantém a atual. Se for novo e não tiver foto, usa placeholder.
            let urlDaFoto = editandoProdutoId
                ? produtoImagemAtual
                : "https://placehold.co/400?text=Sem+Foto";

            if (imagemArquivo) {
                const imagemComprimida = await imageCompression(imagemArquivo, {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                });
                const formData = new FormData();
                formData.append("file", imagemComprimida);
                formData.append("upload_preset", "doceapp_preset");
                const resposta = await fetch(
                    "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
                    { method: "POST", body: formData },
                );
                urlDaFoto = (await resposta.json()).secure_url;
            }

            const dadosProduto = {
                loja: nomeDaLoja,
                nome: novoNome,
                preco: parseFloat(novoPreco),
                descricao: novaDescricao,
                categoria: novaCategoria || "Outros",
                imagem: urlDaFoto,
                ativo: novoAtivo,
                atualizadoEm: new Date().toISOString(),
            };

            if (editandoProdutoId) {
                await updateDoc(
                    doc(db, "produtos", editandoProdutoId),
                    dadosProduto,
                );
                alert("Produto atualizado!");
            } else {
                await addDoc(collection(db, "produtos"), dadosProduto);
                alert("Produto criado!");
            }

            cancelarEdicaoProduto();
        } catch (erro) {
            console.error(erro);
            alert("Erro ao salvar produto.");
        } finally {
            setSalvandoProduto(false);
        }
    };

    const prepararEdicaoProduto = (produto) => {
        setEditandoProdutoId(produto.id);
        setNovoNome(produto.nome);
        setNovoPreco(produto.preco);
        setNovaDescricao(produto.descricao);
        setNovaCategoria(produto.categoria || "Doces Tradicionais");
        setNovoAtivo(produto.ativo);
        setProdutoImagemAtual(produto.imagem);
        setImagemArquivo(null);
    };

    const cancelarEdicaoProduto = () => {
        setEditandoProdutoId(null);
        setNovoNome("");
        setNovoPreco("");
        setNovaDescricao("");
        setNovaCategoria("Doces Tradicionais");
        setNovoAtivo(true);
        setImagemArquivo(null);
        setProdutoImagemAtual("");
    };

    const apagarProduto = async (id) => {
        if (window.confirm("Deseja mesmo apagar este doce?"))
            await deleteDoc(doc(db, "produtos", id));
    };

    const alternarStatus = async (id, statusAtual) =>
        updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });

    // Funções do CRM
    const salvarCliente = async (e) => {
        e.preventDefault();
        setSalvandoCliente(true);

        try {
            const dadosCliente = {
                loja: nomeDaLoja,
                nome: crmNome,
                telefone: crmTelefone,
                cpf: crmCpf,
                endereco: crmEndereco,
                atualizadoEm: new Date().toISOString(),
            };
            if (editandoClienteId) {
                await updateDoc(
                    doc(db, "clientes", editandoClienteId),
                    dadosCliente,
                );
            } else {
                dadosCliente.totalGasto = 0;
                dadosCliente.pedidos = 0;
                await addDoc(collection(db, "clientes"), dadosCliente);
            }
            limparFormularioCliente();
            alert("Cliente salvo com sucesso!");
        } catch (erro) {
            alert("Erro ao salvar o cadastro.");
        } finally {
            setSalvandoCliente(false);
        }
    };

    const prepararEdicaoCliente = (cliente) => {
        setEditandoClienteId(cliente.id);
        setCrmNome(cliente.nome || "");
        setCrmTelefone(cliente.telefone || "");
        setCrmCpf(cliente.cpf || "");
        setCrmEndereco(cliente.endereco || "");
    };

    const limparFormularioCliente = () => {
        setEditandoClienteId(null);
        setCrmNome("");
        setCrmTelefone("");
        setCrmCpf("");
        setCrmEndereco("");
    };

    const apagarCliente = async (id) => {
        if (
            window.confirm(
                "Atenção: Tem certeza que deseja apagar o registo deste cliente?",
            )
        )
            await deleteDoc(doc(db, "clientes", id));
    };

    // ==========================================
    // AÇÕES: CONFIGURAÇÕES
    // ==========================================
    const salvarConfiguracoesEmpresa = async (e) => {
        e.preventDefault();
        setSalvandoConfig(true);
        try {
            let urlFinalLogo = logoAtual;
            if (logoArquivo) {
                const imgComprimida = await imageCompression(logoArquivo, {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                });
                const formData = new FormData();
                formData.append("file", imgComprimida);
                formData.append("upload_preset", "doceapp_preset");
                const resposta = await fetch(
                    "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
                    { method: "POST", body: formData },
                );
                urlFinalLogo = (await resposta.json()).secure_url;
            }

            const dadosSalvar = {
                nomeExibicao: editNomeExibicao,
                whatsapp: editWhatsapp,
                logo: urlFinalLogo,
                razaoSocial: editRazaoSocial,
                cnpj: editCnpj,
                cep: editCep,
                logradouro: editLogradouro,
                numero: editNumero,
                bairro: editBairro,
                cidade: editCidade,
                estado: editEstado,
                chavePix: editChavePix,
                nomePix: editNomePix,
                ativo: true,
                atualizadoEm: new Date().toISOString(),
            };

            await setDoc(doc(db, "lojas", nomeDaLoja), dadosSalvar, {
                merge: true,
            });
            setConfigLoja((prev) => ({ ...prev, ...dadosSalvar }));
            setLogoAtual(urlFinalLogo);
            alert("Configurações salvas!");
        } catch (erro) {
            alert("Erro ao salvar as configurações.");
        } finally {
            setSalvandoConfig(false);
        }
    };

    const adicionarMembroEquipe = async (e) => {
        e.preventDefault();
        setSavandoMembro(true);
        try {
            await addDoc(collection(db, "equipe"), {
                loja: nomeDaLoja,
                nome: novoMembroNome,
                email: novoMembroEmail,
                role: novoMembroRole,
                criadoEm: new Date().toISOString(),
            });
            setNovoMembroNome("");
            setNovoMembroEmail("");
            setNovoMembroRole("Colaborador");
            alert("Membro adicionado à equipa!");
        } catch (erro) {
            alert("Erro ao adicionar membro.");
        } finally {
            setSavandoMembro(false);
        }
    };

    const removerMembro = async (id) => {
        if (window.confirm("Remover o acesso deste membro?"))
            await deleteDoc(doc(db, "equipe", id));
    };

    // ==========================================
    // FILTROS DE VISUALIZAÇÃO
    // ==========================================
    const pedidosNaTriagem = pedidos.filter(
        (p) => p.status === "pendente" || p.status === "aguardando_pix",
    );
    const pedidosDeHoje = pedidos.filter(
        (p) =>
            ["agendado", "em_producao"].includes(p.status) &&
            isHoje(p.dataEntrega),
    );
    const faturamentoTotal = pedidos
        .filter((p) => p.status === "pronto" || p.status === "entregue")
        .reduce((acc, p) => acc + (p.valorTotal || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* SIDEBAR MODERNA */}
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                <div className="p-8 border-b text-center">
                    {logoAtual ? (
                        <img
                            src={logoAtual}
                            alt="Logo da Loja"
                            className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-pink-50 mb-3 shadow-sm"
                        />
                    ) : (
                        <div className="w-24 h-24 mx-auto rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-3xl mb-3 shadow-sm">
                            {configLoja?.nomeExibicao?.charAt(0) || "D"}
                        </div>
                    )}
                    <p className="text-slate-800 font-bold text-lg leading-tight">
                        {configLoja?.nomeExibicao || nomeDaLoja}
                    </p>
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mt-1">
                        Painel Gestor
                    </p>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    <button
                        onClick={() => setAbaAtiva("dashboard")}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "dashboard" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <Home size={20} /> Dashboard
                    </button>
                    <button
                        onClick={() => setAbaAtiva("kanban")}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "kanban" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <KanbanSquare size={20} /> Produção
                    </button>
                    <button
                        onClick={() => setAbaAtiva("cardapio")}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "cardapio" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <ShoppingBag size={20} /> Cardápio
                    </button>
                    <button
                        onClick={() => setAbaAtiva("clientes")}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "clientes" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <Users size={20} /> Clientes
                    </button>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <button
                            onClick={() => setAbaAtiva("configuracoes")}
                            className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "configuracoes" ? "bg-slate-800 text-white shadow-md" : "hover:bg-slate-100 text-slate-700"}`}
                        >
                            <Settings size={20} /> Configurações
                        </button>
                    </div>
                </nav>

                <div className="p-6 border-t mt-auto">
                    <Link
                        to={`/${nomeDaLoja}`}
                        target="_blank"
                        className="text-slate-500 hover:text-pink-600 flex items-center gap-2 text-sm font-medium"
                    >
                        ← Ver Catálogo Online
                    </Link>
                    <button
                        onClick={() => {
                            signOut(auth);
                            navigate(`/login/${nomeDaLoja}`);
                        }}
                        className="text-red-500 hover:text-red-600 flex items-center gap-2 text-sm font-bold w-full"
                    >
                        <LogOut size={16} /> Encerrar Sessão
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="flex-1 p-8 lg:p-12 h-screen overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-slate-800">
                            {abaAtiva === "dashboard" && "Visão Geral"}
                            {abaAtiva === "kanban" && "Quadro de Produção"}
                            {abaAtiva === "cardapio" && "Gestão de Cardápio"}
                            {abaAtiva === "clientes" &&
                                "Gestão de Clientes (CRM)"}
                            {abaAtiva === "configuracoes" &&
                                "Configurações da Loja"}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {abaAtiva === "configuracoes"
                                ? "Faça a gestão dos dados empresariais e da equipa."
                                : "Bem-vindo(a) ao seu painel de controlo."}
                        </p>
                    </div>

                    {/* ================================== */}
                    {/* TELA 1: DASHBOARD                  */}
                    {/* ================================== */}
                    {abaAtiva === "dashboard" && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Cards de Resumo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">
                                            Novos Pedidos
                                        </p>
                                        <p className="text-4xl font-bold text-orange-600">
                                            {pedidosNaTriagem.length}
                                        </p>
                                    </div>
                                    <div className="bg-orange-100 p-4 rounded-2xl">
                                        <AlertCircle
                                            size={32}
                                            className="text-orange-600"
                                        />
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">
                                            Para Hoje
                                        </p>
                                        <p className="text-4xl font-bold text-blue-600">
                                            {pedidosDeHoje.length}
                                        </p>
                                    </div>
                                    <div className="bg-blue-100 p-4 rounded-2xl">
                                        <Clock
                                            size={32}
                                            className="text-blue-600"
                                        />
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">
                                            Caixa (Entregues)
                                        </p>
                                        <p className="text-3xl font-bold text-emerald-600">
                                            {formatarDinheiro(faturamentoTotal)}
                                        </p>
                                    </div>
                                    <div className="bg-emerald-100 p-4 rounded-2xl">
                                        <CheckCircle
                                            size={32}
                                            className="text-emerald-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Triagem */}
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        Triagem{" "}
                                        <span className="bg-orange-100 text-orange-600 text-xs py-1 px-3 rounded-full">
                                            {pedidosNaTriagem.length} novos
                                        </span>
                                    </h3>
                                    <div className="space-y-4">
                                        {pedidosNaTriagem.length === 0 ? (
                                            <p className="text-slate-400 italic">
                                                Nenhum pedido novo.
                                            </p>
                                        ) : (
                                            pedidosNaTriagem.map((pedido) => (
                                                <div
                                                    key={pedido.id}
                                                    className="bg-slate-50 p-5 rounded-2xl border border-slate-200"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg">
                                                            Entrega:{" "}
                                                            {formatarDataEHora(
                                                                pedido.dataEntrega,
                                                            )}
                                                        </span>
                                                        <p className="font-black text-pink-600 text-lg">
                                                            {formatarDinheiro(
                                                                pedido.valorTotal,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700 mb-4">
                                                        {formatarItensPedido(
                                                            pedido.itens,
                                                        )}
                                                    </p>

                                                    <div className="border-t border-slate-200 pt-4 mt-2">
                                                        {editandoId ===
                                                        pedido.id ? (
                                                            <div className="space-y-3 bg-white p-4 rounded-xl border">
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editNome
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setEditNome(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-full border border-slate-200 p-3 text-sm rounded-lg"
                                                                    placeholder="Nome do Cliente"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editTelefone
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setEditTelefone(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-full border border-slate-200 p-3 text-sm rounded-lg"
                                                                    placeholder="WhatsApp"
                                                                />
                                                                <label className="flex items-center gap-3 py-2 cursor-pointer bg-emerald-50 border border-emerald-100 rounded-lg px-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            sinalPago
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setSinalPago(
                                                                                e
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                        className="w-5 h-5 accent-emerald-600"
                                                                    />
                                                                    <span className="text-sm font-bold text-emerald-800">
                                                                        Sinal de
                                                                        50%
                                                                        Recebido
                                                                        via Pix
                                                                    </span>
                                                                </label>
                                                                <button
                                                                    onClick={() =>
                                                                        aceitarPedido(
                                                                            pedido,
                                                                        )
                                                                    }
                                                                    className="w-full bg-slate-900 hover:bg-pink-600 text-white py-3 rounded-lg font-bold text-sm transition-colors"
                                                                >
                                                                    Confirmar e
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
                                                                        {pedido.telefone ||
                                                                            "Sem telefone"}{" "}
                                                                        •{" "}
                                                                        {pedido.status ===
                                                                        "aguardando_pix"
                                                                            ? "Aguardando Pix"
                                                                            : "Pendente"}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        iniciarEdicao(
                                                                            pedido,
                                                                        )
                                                                    }
                                                                    className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-bold transition"
                                                                >
                                                                    Avaliar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Hoje */}
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6">
                                        Agendados para Hoje
                                    </h3>
                                    <div className="space-y-4">
                                        {pedidosDeHoje.length === 0 ? (
                                            <p className="text-slate-400 italic">
                                                Agenda livre para hoje!
                                            </p>
                                        ) : (
                                            pedidosDeHoje.map((pedido) => (
                                                <div
                                                    key={pedido.id}
                                                    className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"
                                                >
                                                    <div>
                                                        <p className="font-bold text-lg text-slate-800">
                                                            {pedido.cliente}
                                                        </p>
                                                        <p className="text-slate-500 text-sm mt-1">
                                                            {formatarItensPedido(
                                                                pedido.itens,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg ${pedido.status === "agendado" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                                                    >
                                                        {pedido.status ===
                                                        "agendado"
                                                            ? "Na Fila"
                                                            : "Em Preparo"}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Calendário da Semana */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-xl font-bold text-slate-800 mb-6">
                                    Grade da Semana
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    {getDiasDaSemana().map((dia) => {
                                        const pedidosDoDia = pedidos.filter(
                                            (p) =>
                                                p.dataEntrega &&
                                                p.dataEntrega.startsWith(
                                                    dia.dataBusca,
                                                ) &&
                                                ![
                                                    "pendente",
                                                    "aguardando_pix",
                                                    "entregue",
                                                ].includes(p.status),
                                        );
                                        const isDiaHoje = isHoje(
                                            dia.dataBusca + "T00:00",
                                        );
                                        return (
                                            <div
                                                key={dia.dataBusca}
                                                className={`flex flex-col items-center p-5 rounded-2xl border ${isDiaHoje ? "bg-pink-50 border-pink-200" : "bg-slate-50 border-slate-100"}`}
                                            >
                                                <span
                                                    className={`text-xs font-black uppercase mb-1 ${isDiaHoje ? "text-pink-600" : "text-slate-400"}`}
                                                >
                                                    {dia.nome}
                                                </span>
                                                <span
                                                    className={`text-3xl font-black mb-3 ${isDiaHoje ? "text-pink-700" : "text-slate-700"}`}
                                                >
                                                    {dia.numero}
                                                </span>
                                                {pedidosDoDia.length > 0 ? (
                                                    <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg w-full text-center">
                                                        {pedidosDoDia.length}{" "}
                                                        pedidos
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs font-medium px-3 py-1.5 w-full text-center border border-dashed rounded-lg">
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

                    {/* ================================== */}
                    {/* TELA 2: KANBAN DE PRODUÇÃO (4 COL) */}
                    {/* ================================== */}
                    {abaAtiva === "kanban" && (
                        <div className="animate-in fade-in duration-300">
                            {/* Grid atualizado para 4 colunas em telas muito grandes, ou 2 em telas médias */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                {/* Coluna 1: A Fazer */}
                                <div className="bg-slate-200/50 rounded-3xl p-5 min-h-[500px]">
                                    <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>{" "}
                                        A Fazer
                                    </h3>
                                    <div className="space-y-4">
                                        {pedidos
                                            .filter((p) => {
                                                if (p.status !== "agendado")
                                                    return false;
                                                const a = new Date();
                                                a.setDate(a.getDate() + 1);
                                                return (
                                                    isHoje(p.dataEntrega) ||
                                                    (p.dataEntrega &&
                                                        p.dataEntrega.split(
                                                            "T",
                                                        )[0] ===
                                                            a.toLocaleDateString(
                                                                "en-CA",
                                                            ))
                                                );
                                            })
                                            .map((pedido) => (
                                                <div
                                                    key={pedido.id}
                                                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <p
                                                            className="font-bold text-slate-800 line-clamp-1"
                                                            title={
                                                                pedido.cliente
                                                            }
                                                        >
                                                            {pedido.cliente}
                                                        </p>
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap ${isHoje(pedido.dataEntrega) ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-600"}`}
                                                        >
                                                            {isHoje(
                                                                pedido.dataEntrega,
                                                            )
                                                                ? "HOJE"
                                                                : "AMANHÃ"}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl">
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
                                                        className="w-full bg-amber-100 text-amber-700 hover:bg-amber-200 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center transition"
                                                    >
                                                        Iniciar{" "}
                                                        <ChevronRight
                                                            size={16}
                                                            className="ml-1"
                                                        />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Coluna 2: Em Preparo */}
                                <div className="bg-amber-50/60 rounded-3xl p-5 min-h-[500px]">
                                    <h3 className="font-bold text-amber-800 mb-4 px-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>{" "}
                                        Em Produção
                                    </h3>
                                    <div className="space-y-4">
                                        {pedidos
                                            .filter(
                                                (p) =>
                                                    p.status === "em_producao",
                                            )
                                            .map((pedido) => (
                                                <div
                                                    key={pedido.id}
                                                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-400"
                                                >
                                                    <p className="font-bold text-slate-800 mb-2">
                                                        {pedido.cliente}
                                                    </p>
                                                    <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl">
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
                                                        className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center transition"
                                                    >
                                                        <CheckCircle
                                                            size={16}
                                                            className="mr-2"
                                                        />{" "}
                                                        Marcar Pronto
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Coluna 3: Pronto (NOVA COLUNA) */}
                                <div className="bg-emerald-50/60 rounded-3xl p-5 min-h-[500px]">
                                    <h3 className="font-bold text-emerald-800 mb-4 px-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>{" "}
                                        Pronto
                                    </h3>
                                    <div className="space-y-4">
                                        {pedidos
                                            .filter(
                                                (p) => p.status === "pronto",
                                            )
                                            .map((pedido) => {
                                                // Inteligência: Calcula quanto falta receber. Se já pagou sinal, falta metade. Se não, falta tudo.
                                                const valorFaltante =
                                                    pedido.sinalPago
                                                        ? pedido.valorTotal / 2
                                                        : pedido.valorTotal;

                                                return (
                                                    <div
                                                        key={pedido.id}
                                                        className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 border-l-4 border-l-emerald-400"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <p className="font-bold text-slate-800">
                                                                {pedido.cliente}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                                                            {formatarItensPedido(
                                                                pedido.itens,
                                                            )}
                                                        </p>

                                                        {editandoEntregaId ===
                                                        pedido.id ? (
                                                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 space-y-3">
                                                                <label className="flex items-center gap-3 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            saldoRecebido
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setSaldoRecebido(
                                                                                e
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                        className="w-5 h-5 accent-emerald-600"
                                                                    />
                                                                    <span className="text-sm font-bold text-emerald-800 leading-tight">
                                                                        Recebi{" "}
                                                                        {formatarDinheiro(
                                                                            valorFaltante,
                                                                        )}{" "}
                                                                        <br />
                                                                        <span className="text-xs font-normal text-emerald-600">
                                                                            (
                                                                            {pedido.sinalPago
                                                                                ? "Saldo final"
                                                                                : "Valor total"}
                                                                            )
                                                                        </span>
                                                                    </span>
                                                                </label>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            confirmarEntrega(
                                                                                pedido,
                                                                            )
                                                                        }
                                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs transition"
                                                                    >
                                                                        Confirmar
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditandoEntregaId(
                                                                                null,
                                                                            )
                                                                        }
                                                                        className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-bold text-xs transition"
                                                                    >
                                                                        X
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    iniciarEntrega(
                                                                        pedido.id,
                                                                    )
                                                                }
                                                                className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center transition"
                                                            >
                                                                <CheckCircle
                                                                    size={16}
                                                                    className="mr-2"
                                                                />{" "}
                                                                Entregar
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Coluna 4: Entregues (COM BOTÃO DE NF) */}
                                <div className="bg-slate-100/60 rounded-3xl p-5 min-h-[500px]">
                                    <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>{" "}
                                        Entregues
                                    </h3>
                                    <div className="space-y-4">
                                        {pedidos
                                            .filter(
                                                (p) => p.status === "entregue",
                                            )
                                            .map((pedido) => (
                                                <div
                                                    key={pedido.id}
                                                    className="bg-white p-4 rounded-2xl border border-slate-200 opacity-80"
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p
                                                            className="font-bold text-slate-500 line-through truncate mr-2"
                                                            title={
                                                                pedido.cliente
                                                            }
                                                        >
                                                            {pedido.cliente}
                                                        </p>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                            CONCLUÍDO
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mb-4 line-clamp-1">
                                                        {formatarItensPedido(
                                                            pedido.itens,
                                                        )}
                                                    </p>

                                                    {/* Botão de Nota Fiscal (Preparado para Integração Futura) */}
                                                    <button
                                                        onClick={() =>
                                                            emitirNF(pedido)
                                                        }
                                                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-bold text-xs flex justify-center items-center transition shadow-sm"
                                                    >
                                                        <FileText
                                                            size={14}
                                                            className="mr-1.5"
                                                        />{" "}
                                                        Emitir NF
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================================== */}
                    {/* TELA 3: CARDÁPIO (PRODUTOS)        */}
                    {/* ================================== */}
                    {abaAtiva === "cardapio" && (
                        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Formulário Novo/Editar Doce */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                                    {editandoProdutoId ? (
                                        <Edit className="text-pink-600" />
                                    ) : (
                                        <Plus className="text-pink-600" />
                                    )}
                                    {editandoProdutoId
                                        ? "Editar Produto"
                                        : "Novo Produto"}
                                </h3>
                                <form
                                    onSubmit={salvarProduto}
                                    className="space-y-5"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Categoria
                                        </label>
                                        <select
                                            value={novaCategoria}
                                            onChange={(e) =>
                                                setNovaCategoria(e.target.value)
                                            }
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none bg-white"
                                        >
                                            <option value="Bolos">Bolos</option>
                                            <option value="Doces Tradicionais">
                                                Doces Tradicionais
                                            </option>
                                            <option value="Doces Finos">
                                                Doces Finos
                                            </option>
                                            <option value="Gelados">
                                                Gelados
                                            </option>
                                            <option value="Salgados">
                                                Salgados
                                            </option>
                                            <option value="Salgadinhos">
                                                Salgadinhos
                                            </option>
                                            <option value="Kits Festa">
                                                Kits Festa
                                            </option>
                                            <option value="Bebidas">
                                                Bebidas
                                            </option>
                                            <option value="Outros">
                                                Outros
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Nome do Produto
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={novoNome}
                                            onChange={(e) =>
                                                setNovoNome(e.target.value)
                                            }
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Preço (R$)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={novoPreco}
                                            onChange={(e) =>
                                                setNovoPreco(e.target.value)
                                            }
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1 flex justify-between">
                                            <span>Foto Principal</span>
                                            {editandoProdutoId &&
                                                produtoImagemAtual && (
                                                    <span className="text-xs text-pink-600 font-bold">
                                                        Imagem já salva
                                                    </span>
                                                )}
                                        </label>
                                        <div className="border border-slate-200 p-2 rounded-xl bg-slate-50 flex items-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                    setImagemArquivo(
                                                        e.target.files[0],
                                                    )
                                                }
                                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Descrição
                                        </label>
                                        <textarea
                                            value={novaDescricao}
                                            onChange={(e) =>
                                                setNovaDescricao(e.target.value)
                                            }
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                            rows="3"
                                        ></textarea>
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={novoAtivo}
                                            onChange={(e) =>
                                                setNovoAtivo(e.target.checked)
                                            }
                                            className="w-5 h-5 accent-pink-600"
                                        />
                                        <span className="font-medium text-slate-700">
                                            Visível no Catálogo Público
                                        </span>
                                    </label>

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={salvandoProduto}
                                            className={`flex-1 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 ${salvandoProduto ? "bg-slate-400" : "bg-slate-900 hover:bg-pink-600"}`}
                                        >
                                            <Save size={20} />{" "}
                                            {salvandoProduto
                                                ? "Salvando..."
                                                : editandoProdutoId
                                                  ? "Atualizar Produto"
                                                  : "Criar Produto"}
                                        </button>
                                        {editandoProdutoId && (
                                            <button
                                                type="button"
                                                onClick={cancelarEdicaoProduto}
                                                className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Lista de Produtos (Agrupada por Categoria visualmente ou apenas listada) */}
                            <div className="lg:col-span-2 space-y-4">
                                {produtos.length === 0 ? (
                                    <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                                        <ShoppingBag
                                            size={48}
                                            className="mx-auto text-slate-300 mb-4"
                                        />
                                        <h3 className="text-xl font-bold text-slate-600">
                                            Nenhum produto cadastrado
                                        </h3>
                                        <p className="text-slate-400 mt-2">
                                            Comece a adicionar os doces da loja.
                                        </p>
                                    </div>
                                ) : (
                                    // Ordena por categoria para ficar mais bonito na lista
                                    produtos
                                        .sort((a, b) =>
                                            (a.categoria || "").localeCompare(
                                                b.categoria || "",
                                            ),
                                        )
                                        .map((p) => (
                                            <div
                                                key={p.id}
                                                className={`bg-white p-5 rounded-2xl border flex items-center gap-5 transition-all ${p.ativo ? "border-slate-100 shadow-sm" : "border-red-100 opacity-60 grayscale-[30%]"}`}
                                            >
                                                <img
                                                    src={p.imagem}
                                                    alt={p.nome}
                                                    className="w-24 h-24 rounded-2xl object-cover bg-slate-100"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase bg-slate-100 text-slate-600">
                                                            {p.categoria ||
                                                                "Geral"}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase ${p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                                        >
                                                            {p.ativo
                                                                ? "Ativo"
                                                                : "Pausado"}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-xl text-slate-800">
                                                        {p.nome}
                                                    </h4>
                                                    <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                                                        {p.descricao}
                                                    </p>
                                                    <p className="font-black text-pink-600 text-lg">
                                                        {formatarDinheiro(
                                                            p.preco,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col md:flex-row gap-2">
                                                    <button
                                                        onClick={() =>
                                                            prepararEdicaoProduto(
                                                                p,
                                                            )
                                                        }
                                                        className="text-sm font-bold px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition flex items-center gap-2"
                                                    >
                                                        <Edit size={16} />{" "}
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            alternarStatus(
                                                                p.id,
                                                                p.ativo,
                                                            )
                                                        }
                                                        className="text-sm font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                                    >
                                                        {p.ativo
                                                            ? "Pausar"
                                                            : "Ativar"}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            apagarProduto(p.id)
                                                        }
                                                        className="text-sm font-bold p-2 rounded-xl text-red-500 hover:bg-red-50 flex justify-center transition"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}
                    {/* ================================== */}
                    {/* TELA 4: CRM E FATURAÇÃO            */}
                    {/* ================================== */}
                    {abaAtiva === "clientes" && (
                        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Formulário CRM */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                                    <UserPlus className="text-pink-600" />
                                    {editandoClienteId
                                        ? "Editar Cliente"
                                        : "Novo Cliente"}
                                </h3>
                                <form
                                    onSubmit={salvarCliente}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={crmNome}
                                            onChange={(e) =>
                                                setCrmNome(e.target.value)
                                            }
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={crmTelefone}
                                            onChange={(e) =>
                                                setCrmTelefone(e.target.value)
                                            }
                                            placeholder="55479..."
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                                            <FileText size={14} /> CPF / CNPJ
                                            (Para NF)
                                        </label>
                                        <input
                                            type="text"
                                            value={crmCpf}
                                            onChange={(e) =>
                                                setCrmCpf(e.target.value)
                                            }
                                            placeholder="000.000.000-00"
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Endereço de Entrega
                                        </label>
                                        <textarea
                                            value={crmEndereco}
                                            onChange={(e) =>
                                                setCrmEndereco(e.target.value)
                                            }
                                            placeholder="Rua, Número, Bairro, CEP"
                                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                            rows="2"
                                        ></textarea>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={salvandoCliente}
                                            className={`flex-1 text-white font-bold py-3 rounded-xl transition-all ${salvandoCliente ? "bg-slate-400" : "bg-slate-900 hover:bg-pink-600"}`}
                                        >
                                            {salvandoCliente
                                                ? "Salvando..."
                                                : "Salvar Ficha"}
                                        </button>
                                        {editandoClienteId && (
                                            <button
                                                type="button"
                                                onClick={
                                                    limparFormularioCliente
                                                }
                                                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Lista de Clientes Cadastrados */}
                            <div className="lg:col-span-2 space-y-4">
                                {clientes.length === 0 ? (
                                    <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                                        <Users
                                            size={48}
                                            className="mx-auto text-slate-300 mb-4"
                                        />
                                        <h3 className="text-xl font-bold text-slate-600">
                                            Base de Clientes Vazia
                                        </h3>
                                        <p className="text-slate-400 mt-2">
                                            Comece a cadastrar os seus clientes
                                            recorrentes para facilitar a emissão
                                            de Notas Fiscais no futuro.
                                        </p>
                                    </div>
                                ) : (
                                    clientes.map((cliente) => (
                                        <div
                                            key={cliente.id}
                                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-pink-200"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-black text-xl flex-shrink-0">
                                                    {cliente.nome
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg">
                                                        {cliente.nome}
                                                    </h3>
                                                    <div className="text-sm text-slate-500 mt-1 flex flex-col sm:flex-row sm:gap-4">
                                                        <span>
                                                            <span className="font-medium">
                                                                Wpp:
                                                            </span>{" "}
                                                            {cliente.telefone ||
                                                                "N/A"}
                                                        </span>
                                                        <span>
                                                            <span className="font-medium">
                                                                Doc:
                                                            </span>{" "}
                                                            {cliente.cpf ||
                                                                "N/A"}
                                                        </span>
                                                    </div>
                                                    {cliente.endereco && (
                                                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                            {cliente.endereco}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                <button
                                                    onClick={() =>
                                                        prepararEdicaoCliente(
                                                            cliente,
                                                        )
                                                    }
                                                    className="flex-1 md:flex-none text-sm font-bold px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex justify-center items-center gap-2"
                                                >
                                                    <Edit size={16} /> Editar
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        apagarCliente(
                                                            cliente.id,
                                                        )
                                                    }
                                                    className="text-sm font-bold p-2 rounded-xl text-red-500 hover:bg-red-50 flex justify-center items-center transition"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* ================================== */}
                    {/* TELA 5: CONFIGURAÇÕES (Nova e Completa) */}
                    {/* ================================== */}
                    {abaAtiva === "configuracoes" && (
                        <div className="animate-in fade-in duration-300">
                            {/* Navegação Interna das Configurações */}
                            <div className="flex gap-2 border-b border-slate-200 mb-8 pb-px">
                                <button
                                    onClick={() => setAbaConfig("empresa")}
                                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${abaConfig === "empresa" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                                >
                                    <Building2
                                        size={18}
                                        className="inline mr-2"
                                    />{" "}
                                    Dados da Empresa
                                </button>
                                <button
                                    onClick={() => setAbaConfig("pagamento")}
                                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${abaConfig === "pagamento" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                                >
                                    <CreditCard
                                        size={18}
                                        className="inline mr-2"
                                    />{" "}
                                    Recebimentos
                                </button>
                                <button
                                    onClick={() => setAbaConfig("equipe")}
                                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${abaConfig === "equipe" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                                >
                                    <ShieldAlert
                                        size={18}
                                        className="inline mr-2"
                                    />{" "}
                                    Utilizadores e Permissões
                                </button>
                            </div>

                            {/* Sub-Aba: DADOS DA EMPRESA E NF */}
                            {abaConfig === "empresa" && (
                                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-4xl">
                                    <form
                                        onSubmit={salvarConfiguracoesEmpresa}
                                        className="space-y-8"
                                    >
                                        {/* Upload de Logo */}
                                        <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                            {logoAtual ? (
                                                <img
                                                    src={logoAtual}
                                                    alt="Logo"
                                                    className="w-24 h-24 rounded-full object-cover border border-slate-200"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 border-dashed flex items-center justify-center text-slate-400">
                                                    <ImageIcon size={32} />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800 mb-1">
                                                    Logotipo da Empresa
                                                </h3>
                                                <p className="text-sm text-slate-500 mb-3">
                                                    Recomendado: Imagem quadrada
                                                    (JPG ou PNG).
                                                </p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        setLogoArquivo(
                                                            e.target.files[0],
                                                        )
                                                    }
                                                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                                    Nome de Exibição no Catálogo
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editNomeExibicao}
                                                    onChange={(e) =>
                                                        setEditNomeExibicao(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                                    WhatsApp de Atendimento
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editWhatsapp}
                                                    onChange={(e) =>
                                                        setEditWhatsapp(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="554799999999"
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
                                                Dados Legais (Para Emissão de
                                                Nota Fiscal)
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        Razão Social
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editRazaoSocial}
                                                        onChange={(e) =>
                                                            setEditRazaoSocial(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Nome Oficial LTDA"
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        CNPJ / NIF
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editCnpj}
                                                        onChange={(e) =>
                                                            setEditCnpj(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="00.000.000/0001-00"
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div className="md:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        CEP
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editCep}
                                                        onChange={(e) =>
                                                            setEditCep(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="00000-000"
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        Morada / Logradouro
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editLogradouro}
                                                        onChange={(e) =>
                                                            setEditLogradouro(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Rua das Flores"
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="col-span-1">
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        Número
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editNumero}
                                                        onChange={(e) =>
                                                            setEditNumero(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        Bairro
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editBairro}
                                                        onChange={(e) =>
                                                            setEditBairro(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        Cidade
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editCidade}
                                                        onChange={(e) =>
                                                            setEditCidade(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-600 mb-2">
                                                        Estado (UF)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editEstado}
                                                        onChange={(e) =>
                                                            setEditEstado(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="SC"
                                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={salvandoConfig}
                                            className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-white transition-all ${salvandoConfig ? "bg-slate-400" : "bg-slate-900 hover:bg-pink-600"}`}
                                        >
                                            <Save size={20} />{" "}
                                            {salvandoConfig
                                                ? "Salvando..."
                                                : "Atualizar Cadastro da Empresa"}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Sub-Aba: PAGAMENTO PIX */}
                            {abaConfig === "pagamento" && (
                                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-3xl">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                                        Recebimento via Pix
                                    </h3>
                                    <p className="text-slate-500 mb-6">
                                        Estes dados serão usados para gerar o QR
                                        Code de 50% de sinal para o cliente
                                        pagar no catálogo.
                                    </p>

                                    <form
                                        onSubmit={salvarConfiguracoesEmpresa}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                                    Chave Pix
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editChavePix}
                                                    onChange={(e) =>
                                                        setEditChavePix(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex: crisdoces@email.com"
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                                    Nome do Titular (Conta
                                                    Bancária)
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editNomePix}
                                                    onChange={(e) =>
                                                        setEditNomePix(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex: Cristiane Silva"
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                                    Cidade do Banco
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editCidade}
                                                    onChange={(e) =>
                                                        setEditCidade(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex: SAO BENTO DO SUL"
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Deve ser exatamente como
                                                    está registado no banco, sem
                                                    acentos.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={salvandoConfig}
                                            className="w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-white bg-slate-900 hover:bg-pink-600 transition-all"
                                        >
                                            <Save size={20} /> Salvar Dados de
                                            Pagamento
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Sub-Aba: EQUIPE (RBAC) */}
                            {abaConfig === "equipe" && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm h-fit">
                                        <h3 className="font-bold text-lg text-slate-800 mb-4">
                                            Novo Utilizador
                                        </h3>
                                        <form
                                            onSubmit={adicionarMembroEquipe}
                                            className="space-y-4"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                                    Nome
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={novoMembroNome}
                                                    onChange={(e) =>
                                                        setNovoMembroNome(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                                    E-mail (Login)
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={novoMembroEmail}
                                                    onChange={(e) =>
                                                        setNovoMembroEmail(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                                    Nível de Acesso
                                                </label>
                                                <select
                                                    value={novoMembroRole}
                                                    onChange={(e) =>
                                                        setNovoMembroRole(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none bg-white"
                                                >
                                                    <option value="funcionario">
                                                        Funcionário (Ver Pedidos
                                                        e Kanban)
                                                    </option>
                                                    <option value="admin">
                                                        Administrador (Acesso
                                                        Total e Financeiro)
                                                    </option>
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={salvandoMembro}
                                                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold transition"
                                            >
                                                Adicionar Utilizador
                                            </button>
                                        </form>
                                    </div>

                                    <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                        <h3 className="font-bold text-lg text-slate-800 mb-6">
                                            Equipa Atual
                                        </h3>
                                        <div className="space-y-3">
                                            {membrosEquipe.length === 0 ? (
                                                <p className="text-slate-500 italic">
                                                    Não tem membros adicionados
                                                    além de si.
                                                </p>
                                            ) : (
                                                membrosEquipe.map((membro) => (
                                                    <div
                                                        key={membro.id}
                                                        className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-slate-50"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                                                {membro.nome.charAt(
                                                                    0,
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800">
                                                                    {
                                                                        membro.nome
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {
                                                                        membro.email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span
                                                                className={`text-xs font-bold px-3 py-1 rounded-full ${membro.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"}`}
                                                            >
                                                                {membro.role ===
                                                                "admin"
                                                                    ? "Admin"
                                                                    : "Funcionário"}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    removerMembro(
                                                                        membro.id,
                                                                    )
                                                                }
                                                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                                            >
                                                                <Trash2
                                                                    size={18}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
