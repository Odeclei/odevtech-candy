import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    Home,
    KanbanSquare,
    ShoppingBag,
    Settings,
    Users,
    LogOut,
    Menu, // Ícone para abrir
    X, // Ícone para fechar
    DollarSign,
} from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { getLojaConfig } from "../config/lojas";

import AbaDashboard from "../components/admin/AbaDashboard";
import AbaCardapio from "../components/admin/AbaCardapio";
import AbaKanban from "../components/admin/AbaKanban";
import AbaClientes from "../components/admin/AbaClientes";
import AbaConfiguracoes from "../components/admin/AbaConfig";

export default function PainelAdmin() {
    const params = useParams();
    const nomeDaLoja = params.nomeDaLoja?.toLowerCase();
    const navigate = useNavigate();

    // ==========================================
    // ESTADOS
    // ==========================================
    const [abaAtiva, setAbaAtiva] = useState("dashboard");
    const [menuMobileAberto, setMenuMobileAberto] = useState(false); // NOVO: Controle do menu
    const [configLoja, setConfigLoja] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [membrosEquipe, setMembrosEquipe] = useState([]);

    // ==========================================
    // CARREGAMENTO DE DADOS
    // ==========================================
    useEffect(() => {
        getLojaConfig(nomeDaLoja).then((config) => {
            setConfigLoja(config);
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
    // UTILITÁRIOS
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

    // Função para trocar de aba e fechar o menu no mobile automaticamente
    const navegarPara = (aba) => {
        setAbaAtiva(aba);
        setMenuMobileAberto(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden">
            {/* OVERLAY: Escurece a tela quando o menu mobile está aberto */}
            {menuMobileAberto && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMenuMobileAberto(false)}
                />
            )}

            {/* SIDEBAR RESPONSIVA */}
            <aside
                className={`
                fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm
                transform transition-transform duration-300 ease-in-out
                ${menuMobileAberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
            >
                <div className="p-8 border-b text-center relative">
                    {/* Botão para fechar (apenas mobile) */}
                    <button
                        onClick={() => setMenuMobileAberto(false)}
                        className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-pink-600"
                    >
                        <X size={24} />
                    </button>

                    {configLoja?.logo ? (
                        <img
                            src={configLoja.logo}
                            alt="Logo"
                            className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-pink-50 mb-3 shadow-sm"
                        />
                    ) : (
                        <div className="w-20 h-20 mx-auto rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-3xl mb-3 shadow-sm">
                            {configLoja?.nomeExibicao?.charAt(0) || "D"}
                        </div>
                    )}
                    <p className="text-slate-800 font-bold text-lg leading-tight truncate px-2">
                        {configLoja?.nomeExibicao || nomeDaLoja}
                    </p>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mt-1">
                        Painel Gestor
                    </p>
                </div>

                <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
                    <button
                        onClick={() => navegarPara("dashboard")}
                        className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "dashboard" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <Home size={20} /> Dashboard
                    </button>
                    <button
                        onClick={() => navegarPara("kanban")}
                        className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "kanban" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <KanbanSquare size={20} /> Produção
                    </button>
                    <button
                        onClick={() => navegarPara("cardapio")}
                        className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "cardapio" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <ShoppingBag size={20} /> Cardápio
                    </button>
                    <button
                        onClick={() => navegarPara("clientes")}
                        className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "clientes" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <Users size={20} /> Clientes
                    </button>
                    {/* Botão de Financeiro adicionado conforme fluxos anteriores */}
                    <button
                        onClick={() => navegarPara("financeiro")}
                        className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "financeiro" ? "bg-pink-100 text-pink-700" : "hover:bg-slate-100 text-slate-700"}`}
                    >
                        <DollarSign size={20} /> Financeiro
                    </button>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <button
                            onClick={() => navegarPara("configuracoes")}
                            className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "configuracoes" ? "bg-slate-800 text-white shadow-md" : "hover:bg-slate-100 text-slate-700"}`}
                        >
                            <Settings size={20} /> Configurações
                        </button>
                    </div>
                </nav>

                <div className="p-6 border-t mt-auto space-y-4">
                    <Link
                        to={`/${nomeDaLoja}`}
                        target="_blank"
                        className="text-slate-500 hover:text-pink-600 flex items-center gap-2 text-xs font-medium"
                    >
                        ← Ver Catálogo Online
                    </Link>
                    <button
                        onClick={() => {
                            signOut(auth);
                            navigate(`/login/${nomeDaLoja}`);
                        }}
                        className="text-red-500 hover:text-red-600 flex items-center gap-2 text-xs font-bold w-full"
                    >
                        <LogOut size={16} /> Encerrar Sessão
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="flex-1 h-screen overflow-y-auto relative">
                {/* Header Mobile: Visível apenas em ecrãs pequenos */}
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMenuMobileAberto(true)}
                            className="p-2 bg-slate-100 rounded-xl text-slate-600"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-slate-800">
                            DoceApp
                        </span>
                    </div>
                    {configLoja?.logo && (
                        <img
                            src={configLoja.logo}
                            alt="Logo"
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    )}
                </header>

                <div className="p-6 lg:p-12 max-w-7xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
                            {abaAtiva === "dashboard" && "Visão Geral"}
                            {abaAtiva === "kanban" && "Quadro de Produção"}
                            {abaAtiva === "cardapio" && "Gestão de Cardápio"}
                            {abaAtiva === "clientes" &&
                                "Gestão de Clientes (CRM)"}
                            {abaAtiva === "configuracoes" &&
                                "Configurações da Loja"}
                            {abaAtiva === "financeiro" && "Fluxo de Caixa"}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {abaAtiva === "configuracoes"
                                ? "Dados empresariais e equipa."
                                : "Bem-vindo(a) ao seu painel."}
                        </p>
                    </div>

                    {abaAtiva === "dashboard" && (
                        <AbaDashboard
                            nomeDaLoja={nomeDaLoja}
                            pedidos={pedidos}
                            clientes={clientes}
                            formatarDinheiro={formatarDinheiro}
                            formatarDataEHora={formatarDataEHora}
                            formatarItensPedido={formatarItensPedido}
                            isHoje={isHoje}
                            getDiasDaSemana={getDiasDaSemana}
                        />
                    )}

                    {/* Restantes abas mantêm a lógica anterior */}
                    {abaAtiva === "kanban" && (
                        <AbaKanban
                            pedidos={pedidos}
                            formatarItensPedido={formatarItensPedido}
                            formatarDinheiro={formatarDinheiro}
                            isHoje={isHoje}
                        />
                    )}
                    {abaAtiva === "cardapio" && (
                        <AbaCardapio
                            nomeDaLoja={nomeDaLoja}
                            produtos={produtos}
                            formatarDinheiro={formatarDinheiro}
                        />
                    )}
                    {abaAtiva === "clientes" && (
                        <AbaClientes
                            nomeDaLoja={nomeDaLoja}
                            clientes={clientes}
                        />
                    )}
                    {abaAtiva === "configuracoes" && (
                        <AbaConfiguracoes
                            nomeDaLoja={nomeDaLoja}
                            configLoja={configLoja}
                            setConfigLoja={setConfigLoja}
                            membrosEquipe={membrosEquipe}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
