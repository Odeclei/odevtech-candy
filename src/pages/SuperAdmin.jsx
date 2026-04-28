import { useState, useEffect } from "react";
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import {
    LayoutDashboard,
    Plus,
    Store,
    Trash2,
    ExternalLink,
    Search,
    Edit,
    MessageCircle,
    CheckCircle,
    XCircle,
    DollarSign,
    X,
    Save,
    Blocks,
    CheckSquare,
} from "lucide-react";

// ==========================================
// TABELA DE PREÇOS (SAAS MODULAR)
// ==========================================
const PRECO_BASE = 99.9; // Inclui PDV + Catálogo + Clientes

const MODULOS_DISPONIVEIS = [
    {
        id: "ficha_tecnica",
        label: "Ficha Técnica e Custo",
        preco: 49.9,
        cor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
        id: "qr_code",
        label: "Autoatendimento QR Code",
        preco: 89.9,
        cor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
        id: "kds",
        label: "Painel Cozinha (KDS)",
        preco: 59.9,
        cor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    {
        id: "fidelidade",
        label: "Fidelidade e Cashback",
        preco: 69.9,
        cor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    },
    {
        id: "fiscal",
        label: "Emissão Fiscal (NFC-e)",
        preco: 120.0,
        cor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    },
];

export default function SuperAdmin() {
    const [lojas, setLojas] = useState([]);
    const [novaLojaId, setNovaLojaId] = useState("");
    const [donoEmail, setDonoEmail] = useState("");
    const [novoNicho, setNovoNicho] = useState("confeitaria");
    const [salvando, setSalvando] = useState(false);

    // Filtros da Tabela
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [filtroPagamento, setFiltroPagamento] = useState("todos");

    // Modal de Edição de Cliente
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lojaEditando, setLojaEditando] = useState(null);
    const [formData, setFormData] = useState({
        nomeExibicao: "",
        whatsapp: "",
        mensalidade: "",
        pagamentoEmDia: true,
        ativo: true,
        modulos: [], // NOVO: Módulos Premium
    });
    const [salvandoEdicao, setSalvandoEdicao] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "lojas"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLojas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return unsubscribe;
    }, []);

    const criarLoja = async (e) => {
        e.preventDefault();
        if (!novaLojaId || !donoEmail) return;
        setSalvando(true);

        try {
            const slug = novaLojaId.toLowerCase().replace(/\s+/g, "-");
            await setDoc(doc(db, "lojas", slug), {
                nomeExibicao: novaLojaId,
                ownerEmail: donoEmail.toLowerCase().trim(),
                nicho: novoNicho,
                tema: novoNicho === "bar_restaurante" ? "amber" : "pink",
                ativo: true,
                pagamentoEmDia: true,
                mensalidade: PRECO_BASE, // Nasce com o plano base
                modulos: [], // Nasce sem módulos extra
                whatsapp: "",
                criadoEm: new Date().toISOString(),
            });

            setNovaLojaId("");
            setDonoEmail("");
            setNovoNicho("confeitaria");
            alert(`Loja ${slug} provisionada com sucesso no Plano Base!`);
        } catch (error) {
            console.error(error);
            alert("Erro ao criar loja.");
        } finally {
            setSalvando(false);
        }
    };

    const deletarLoja = async (id) => {
        if (
            window.confirm(
                `TEM A CERTEZA? Isso apagará todos os dados da loja ${id} permanentemente.`,
            )
        ) {
            await deleteDoc(doc(db, "lojas", id));
        }
    };

    // ==========================================
    // FUNÇÕES DO MODAL DE EDIÇÃO E MÓDULOS
    // ==========================================
    const abrirModal = (loja) => {
        setLojaEditando(loja);
        setFormData({
            nomeExibicao: loja.nomeExibicao || loja.id,
            whatsapp: loja.whatsapp || "",
            mensalidade: loja.mensalidade || PRECO_BASE,
            pagamentoEmDia: loja.pagamentoEmDia !== false,
            ativo: loja.ativo !== false,
            modulos: loja.modulos || [],
        });
        setIsModalOpen(true);
    };

    // Ativa/Desativa Módulos e Calcula o Novo Preço Sugerido
    const toggleModulo = (modId) => {
        setFormData((prev) => {
            const modulosAtualizados = prev.modulos.includes(modId)
                ? prev.modulos.filter((m) => m !== modId) // Remove
                : [...prev.modulos, modId]; // Adiciona

            // Calcula o MRR baseando-se nos módulos ativos
            const novoPreco =
                PRECO_BASE +
                modulosAtualizados.reduce((acc, mId) => {
                    const mod = MODULOS_DISPONIVEIS.find((x) => x.id === mId);
                    return acc + (mod ? mod.preco : 0);
                }, 0);

            return {
                ...prev,
                modulos: modulosAtualizados,
                mensalidade: novoPreco.toFixed(2), // Atualiza o input de preço automaticamente
            };
        });
    };

    const salvarEdicao = async (e) => {
        e.preventDefault();
        if (!lojaEditando) return;
        setSalvandoEdicao(true);

        try {
            await updateDoc(doc(db, "lojas", lojaEditando.id), {
                nomeExibicao: formData.nomeExibicao,
                whatsapp: formData.whatsapp.replace(/\D/g, ""),
                mensalidade: parseFloat(formData.mensalidade) || 0,
                pagamentoEmDia: formData.pagamentoEmDia,
                ativo: formData.ativo,
                modulos: formData.modulos,
                atualizadoEm: new Date().toISOString(),
            });
            setIsModalOpen(false);
            setLojaEditando(null);
            alert("Dados do cliente e módulos atualizados!");
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            alert("Erro ao guardar as alterações.");
        } finally {
            setSalvandoEdicao(false);
        }
    };

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);
    const formatarData = (iso) =>
        iso ? new Date(iso).toLocaleDateString("pt-BR") : "--";

    const enviarWhatsApp = (phone) => {
        if (!phone) return alert("Cliente sem número de WhatsApp registado.");
        const cleanPhone = phone.replace(/\D/g, "");
        window.open(`https://wa.me/55${cleanPhone}`, "_blank");
    };

    const lojasFiltradas = lojas.filter((loja) => {
        const matchBusca =
            loja.id.includes(busca.toLowerCase()) ||
            loja.nomeExibicao?.toLowerCase().includes(busca.toLowerCase()) ||
            loja.ownerEmail.toLowerCase().includes(busca.toLowerCase());
        const matchStatus =
            filtroStatus === "todos"
                ? true
                : filtroStatus === "ativos"
                  ? loja.ativo !== false
                  : loja.ativo === false;
        const matchPagamento =
            filtroPagamento === "todos"
                ? true
                : filtroPagamento === "pago"
                  ? loja.pagamentoEmDia !== false
                  : loja.pagamentoEmDia === false;
        return matchBusca && matchStatus && matchPagamento;
    });

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3">
                            <LayoutDashboard
                                className="text-blue-500"
                                size={36}
                            />
                            OdevTech{" "}
                            <span className="text-blue-500 text-base uppercase tracking-widest font-bold mt-1">
                                Control
                            </span>
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">
                            Painel de Gestão Multi-Tenant (CRM SaaS)
                        </p>
                    </div>
                    <div className="text-left md:text-right bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                        <p className="text-xs font-bold text-slate-500">
                            Logado como:
                        </p>
                        <p className="text-blue-400 font-medium text-sm">
                            {auth.currentUser?.email}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* COLUNA ESQUERDA: Formulário e Resumo */}
                    <div className="xl:col-span-1 space-y-6">
                        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                                <Plus className="text-blue-500" size={20} />{" "}
                                Provisionar Cliente
                            </h2>
                            <form onSubmit={criarLoja} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                        Modelo de Negócio
                                    </label>
                                    <select
                                        value={novoNicho}
                                        onChange={(e) =>
                                            setNovoNicho(e.target.value)
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                                    >
                                        <option value="confeitaria">
                                            Confeitaria / Delivery
                                        </option>
                                        <option value="bar_restaurante">
                                            Bar / Restaurante (Mesas)
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                        Nome da Loja
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={novaLojaId}
                                        onChange={(e) =>
                                            setNovaLojaId(e.target.value)
                                        }
                                        placeholder="Ex: Cris Doces"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                        E-mail do Dono
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={donoEmail}
                                        onChange={(e) =>
                                            setDonoEmail(e.target.value)
                                        }
                                        placeholder="exemplo@gmail.com"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <button
                                    disabled={salvando}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 mt-2 shadow-lg shadow-blue-900/20 active:scale-95"
                                >
                                    {salvando
                                        ? "A Processar..."
                                        : "Criar Conta SaaS"}
                                </button>
                            </form>
                        </div>

                        {/* Resumo Financeiro Simples */}
                        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                Resumo da Carteira
                            </h3>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-slate-300">
                                    Total de Clientes:
                                </span>
                                <span className="font-bold text-white">
                                    {lojas.length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">
                                    Receita Recorrente (MRR):
                                </span>
                                <span className="font-black text-emerald-400">
                                    {formatarDinheiro(
                                        lojas
                                            .filter((l) => l.ativo !== false)
                                            .reduce(
                                                (acc, l) =>
                                                    acc +
                                                    (parseFloat(
                                                        l.mensalidade,
                                                    ) || 0),
                                                0,
                                            ),
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: Tabela de Clientes SaaS */}
                    <div className="xl:col-span-3 space-y-4">
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-center shadow-lg">
                            <div className="relative w-full lg:w-1/3">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={18}
                                />
                                <input
                                    type="text"
                                    placeholder="Buscar loja, nome ou email..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <select
                                    value={filtroStatus}
                                    onChange={(e) =>
                                        setFiltroStatus(e.target.value)
                                    }
                                    className="bg-slate-900 border border-slate-700 py-2.5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-300"
                                >
                                    <option value="todos">
                                        Todos os Status
                                    </option>
                                    <option value="ativos">
                                        Apenas Ativos
                                    </option>
                                    <option value="inativos">Bloqueados</option>
                                </select>
                                <select
                                    value={filtroPagamento}
                                    onChange={(e) =>
                                        setFiltroPagamento(e.target.value)
                                    }
                                    className="bg-slate-900 border border-slate-700 py-2.5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-300"
                                >
                                    <option value="todos">
                                        Todos os Pagamentos
                                    </option>
                                    <option value="pago">
                                        Mensalidade em Dia
                                    </option>
                                    <option value="pendente">
                                        Inadimplentes
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-900/50 text-xs uppercase text-slate-400 font-bold tracking-wider">
                                            <th className="p-5 border-b border-slate-700">
                                                Cliente / Loja
                                            </th>
                                            <th className="p-5 border-b border-slate-700">
                                                Módulos Ativos
                                            </th>
                                            <th className="p-5 border-b border-slate-700">
                                                Plano (MRR)
                                            </th>
                                            <th className="p-5 border-b border-slate-700 text-center">
                                                Status
                                            </th>
                                            <th className="p-5 border-b border-slate-700 text-right">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {lojasFiltradas.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="5"
                                                    className="p-12 text-center text-slate-500"
                                                >
                                                    Nenhum cliente atende aos
                                                    filtros aplicados.
                                                </td>
                                            </tr>
                                        ) : (
                                            lojasFiltradas.map((loja) => (
                                                <tr
                                                    key={loja.id}
                                                    className="hover:bg-slate-700/30 transition-colors"
                                                >
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 flex-shrink-0">
                                                                {loja.nomeExibicao
                                                                    ?.charAt(0)
                                                                    .toUpperCase() ||
                                                                    loja.id
                                                                        .charAt(
                                                                            0,
                                                                        )
                                                                        .toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white flex items-center gap-2">
                                                                    {loja.nomeExibicao ||
                                                                        loja.id}
                                                                    <span
                                                                        className={`text-[9px] px-2 py-0.5 rounded uppercase ${loja.nicho === "bar_restaurante" ? "bg-amber-500/20 text-amber-400" : "bg-pink-500/20 text-pink-400"}`}
                                                                    >
                                                                        {loja.nicho ===
                                                                        "bar_restaurante"
                                                                            ? "Bar"
                                                                            : "Delivery"}
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    {
                                                                        loja.ownerEmail
                                                                    }
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <button
                                                                        onClick={() =>
                                                                            enviarWhatsApp(
                                                                                loja.whatsapp,
                                                                            )
                                                                        }
                                                                        className="text-[10px] text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                                                                        title="Chamar WhatsApp"
                                                                    >
                                                                        <MessageCircle
                                                                            size={
                                                                                12
                                                                            }
                                                                        />{" "}
                                                                        {loja.whatsapp ||
                                                                            "Sem Wpp"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="p-5">
                                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                                            <span
                                                                className="bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                                                title="Catálogo e PDV"
                                                            >
                                                                BASE
                                                            </span>
                                                            {(
                                                                loja.modulos ||
                                                                []
                                                            ).map((mId) => {
                                                                const mod =
                                                                    MODULOS_DISPONIVEIS.find(
                                                                        (x) =>
                                                                            x.id ===
                                                                            mId,
                                                                    );
                                                                if (!mod)
                                                                    return null;
                                                                return (
                                                                    <span
                                                                        key={
                                                                            mId
                                                                        }
                                                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${mod.cor}`}
                                                                        title={
                                                                            mod.label
                                                                        }
                                                                    >
                                                                        {mod.id.replace(
                                                                            "_",
                                                                            " ",
                                                                        )}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>

                                                    <td className="p-5">
                                                        <p className="font-bold text-emerald-400">
                                                            {formatarDinheiro(
                                                                loja.mensalidade,
                                                            )}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                                                            Por Mês
                                                        </p>
                                                    </td>

                                                    <td className="p-5 text-center">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            {loja.ativo !==
                                                            false ? (
                                                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase w-24 text-center">
                                                                    Ativo
                                                                </span>
                                                            ) : (
                                                                <span className="bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase w-24 text-center">
                                                                    Bloqueado
                                                                </span>
                                                            )}
                                                            {loja.pagamentoEmDia !==
                                                            false ? (
                                                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase flex items-center justify-center gap-1 w-24">
                                                                    <CheckCircle
                                                                        size={
                                                                            10
                                                                        }
                                                                    />{" "}
                                                                    Em Dia
                                                                </span>
                                                            ) : (
                                                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase flex items-center justify-center gap-1 w-24">
                                                                    <XCircle
                                                                        size={
                                                                            10
                                                                        }
                                                                    />{" "}
                                                                    Pendente
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="p-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    abrirModal(
                                                                        loja,
                                                                    )
                                                                }
                                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                                                                title="Editar Cliente / Upsell"
                                                            >
                                                                <Edit
                                                                    size={16}
                                                                />
                                                            </button>
                                                            <a
                                                                href={`/admin/${loja.id}`}
                                                                target="_blank"
                                                                className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition"
                                                                title="Acessar Painel"
                                                            >
                                                                <LayoutDashboard
                                                                    size={16}
                                                                />
                                                            </a>
                                                            <a
                                                                href={`/${loja.id}`}
                                                                target="_blank"
                                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                                                                title="Ver Catálogo"
                                                            >
                                                                <ExternalLink
                                                                    size={16}
                                                                />
                                                            </a>
                                                            <button
                                                                onClick={() =>
                                                                    deletarLoja(
                                                                        loja.id,
                                                                    )
                                                                }
                                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                                                title="Excluir"
                                                            >
                                                                <Trash2
                                                                    size={16}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================================================================== */}
            {/* MODAL DE EDIÇÃO DO CLIENTE E UPSELL DE MÓDULOS */}
            {/* ==================================================================== */}
            {isModalOpen && lojaEditando && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-2">
                                    <Store className="text-blue-500" /> Gestão
                                    da Conta & Upsell
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    ID: {lojaEditando.id}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-700 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={salvarEdicao}
                            className="flex-1 overflow-y-auto"
                        >
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* LADO ESQUERDO: Dados Base */}
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2">
                                        Informações Base
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                            Nome da Empresa
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nomeExibicao}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    nomeExibicao:
                                                        e.target.value,
                                                })
                                            }
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                            WhatsApp (Dono)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.whatsapp}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    whatsapp:
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            "",
                                                        ),
                                                })
                                            }
                                            placeholder="Ex: 554799999999"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                                        />
                                    </div>

                                    <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2 pt-4">
                                        Status da Conta
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label
                                            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${formData.pagamentoEmDia ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800 border-slate-600 hover:border-slate-500"}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    formData.pagamentoEmDia
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        pagamentoEmDia:
                                                            e.target.checked,
                                                    })
                                                }
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                            <div>
                                                <p className="font-bold text-white text-xs">
                                                    Em Dia
                                                </p>
                                            </div>
                                        </label>
                                        <label
                                            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${formData.ativo ? "bg-blue-500/10 border-blue-500/30" : "bg-red-500/10 border-red-500/30"}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.ativo}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        ativo: e.target.checked,
                                                    })
                                                }
                                                className="w-5 h-5 accent-blue-500"
                                            />
                                            <div>
                                                <p className="font-bold text-white text-xs">
                                                    Acesso Web
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* LADO DIREITO: Upsell e Financeiro */}
                                <div className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                                    <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2 flex items-center gap-2">
                                        <Blocks
                                            size={16}
                                            className="text-blue-500"
                                        />{" "}
                                        Módulos Contratados (Upsell)
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Plano Base Inalterável */}
                                        <div className="flex justify-between items-center p-3 bg-slate-800 border border-slate-600 rounded-xl opacity-70">
                                            <div className="flex items-center gap-3">
                                                <CheckSquare
                                                    size={18}
                                                    className="text-slate-500"
                                                />
                                                <span className="text-sm font-bold text-slate-300">
                                                    Plano Base (Catálogo + PDV)
                                                </span>
                                            </div>
                                            <span className="text-sm font-black text-slate-400">
                                                {formatarDinheiro(PRECO_BASE)}
                                            </span>
                                        </div>

                                        {/* Módulos Premium Dinâmicos */}
                                        {MODULOS_DISPONIVEIS.map((mod) => {
                                            const ativo =
                                                formData.modulos.includes(
                                                    mod.id,
                                                );
                                            return (
                                                <label
                                                    key={mod.id}
                                                    className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${ativo ? "bg-blue-500/10 border-blue-500/50" : "bg-slate-800 border-slate-700 hover:border-slate-500"}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={ativo}
                                                            onChange={() =>
                                                                toggleModulo(
                                                                    mod.id,
                                                                )
                                                            }
                                                            className="w-5 h-5 accent-blue-500"
                                                        />
                                                        <span
                                                            className={`text-sm font-bold ${ativo ? "text-blue-400" : "text-slate-400"}`}
                                                        >
                                                            {mod.label}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-sm font-black ${ativo ? "text-blue-400" : "text-slate-500"}`}
                                                    >
                                                        +
                                                        {formatarDinheiro(
                                                            mod.preco,
                                                        )}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-4 border-t border-slate-700">
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                            Novo MRR Sugerido (Mensalidade)
                                        </label>
                                        <div className="relative">
                                            <DollarSign
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"
                                                size={20}
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.mensalidade}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        mensalidade:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full bg-slate-950 border-2 border-emerald-500/50 rounded-xl pl-10 p-4 focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-400 text-2xl font-black"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                                            Você pode alterar este valor
                                            manualmente se desejar dar
                                            descontos.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvandoEdicao}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2"
                                >
                                    <Save size={18} />{" "}
                                    {salvandoEdicao
                                        ? "Salvando..."
                                        : "Salvar Alterações e Mensalidade"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
