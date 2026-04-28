import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    Home,
    KanbanSquare,
    ShoppingBag,
    Settings,
    Users,
    LogOut,
    Menu,
    X,
    DollarSign,
    ListOrdered,
    MonitorSmartphone,
    Package,
    Lock,
} from "lucide-react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";

import AbaDashboard from "../components/admin/AbaDashboard";
import AbaCardapio from "../components/admin/AbaCardapio";
import AbaKanban from "../components/admin/AbaKanban";
import AbaCaixaBar from "../components/admin/AbaCaixaBar";
import AbaGarcom from "../components/admin/AbaGarcom";
import AbaClientes from "../components/admin/AbaClientes";
import AbaConfiguracoes from "../components/admin/AbaConfig";
import AbaHistorico from "../components/admin/AbaHistorico";
import AbaFinanceiro from "../components/admin/AbaFinanceiro";
import AbaEstoque from "../components/admin/AbaEstoque";

const paletaTemasAdmin = {
    pink: { bgAtivo: "bg-pink-100", textoAtivo: "text-pink-700" },
    amber: { bgAtivo: "bg-amber-100", textoAtivo: "text-amber-700" },
    blue: { bgAtivo: "bg-blue-100", textoAtivo: "text-blue-700" },
    emerald: { bgAtivo: "bg-emerald-100", textoAtivo: "text-emerald-700" },
    slate: { bgAtivo: "bg-slate-800", textoAtivo: "text-white" },
};

export default function PainelAdmin() {
    const params = useParams();
    const nomeDaLoja = params.nomeDaLoja?.toLowerCase();
    const navigate = useNavigate();

    const [abaAtiva, setAbaAtiva] = useState("dashboard");
    const [menuMobileAberto, setMenuMobileAberto] = useState(false);
    const [configLoja, setConfigLoja] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [membrosEquipe, setMembrosEquipe] = useState([]);
    const [cargoUsuario, setCargoUsuario] = useState("admin");

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, "lojas", nomeDaLoja),
            (docSnap) => {
                if (docSnap.exists()) {
                    const config = { id: docSnap.id, ...docSnap.data() };
                    setConfigLoja(config);
                    document.title = `${config.nomeExibicao || nomeDaLoja} - Painel Gestor`;

                    // ==========================================
                    // PROTEÇÃO ANTI-HACKER (URL Direta)
                    // ==========================================
                    const modulosAtivos = config.modulos || [];
                    if (
                        abaAtiva === "estoque" &&
                        !modulosAtivos.includes("ficha_tecnica")
                    ) {
                        setAbaAtiva("dashboard");
                    }
                    if (
                        abaAtiva === "kanban" &&
                        config.nicho === "bar_restaurante" &&
                        !modulosAtivos.includes("kds")
                    ) {
                        setAbaAtiva("dashboard");
                    }
                }
            },
        );
        return () => unsubscribe();
    }, [nomeDaLoja, abaAtiva]);

    useEffect(() => {
        const unPedidos = onSnapshot(
            query(collection(db, "pedidos"), where("loja", "==", nomeDaLoja)),
            (snap) =>
                setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        );
        const unProdutos = onSnapshot(
            query(collection(db, "produtos"), where("loja", "==", nomeDaLoja)),
            (snap) =>
                setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        );
        const unClientes = onSnapshot(
            query(collection(db, "clientes"), where("loja", "==", nomeDaLoja)),
            (snap) =>
                setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        );

        const unEquipe = onSnapshot(
            query(collection(db, "equipe"), where("loja", "==", nomeDaLoja)),
            (snap) => {
                const equipe = snap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));
                setMembrosEquipe(equipe);

                const emailLogado = auth.currentUser?.email;
                const usuarioLogado = equipe.find(
                    (m) => m.email === emailLogado,
                );

                if (usuarioLogado) {
                    setCargoUsuario(usuarioLogado.role);
                    if (usuarioLogado.role === "garcom") setAbaAtiva("garcom");
                } else {
                    setCargoUsuario("admin");
                }
            },
        );

        return () => {
            unPedidos();
            unProdutos();
            unClientes();
            unEquipe();
        };
    }, [nomeDaLoja]);

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);
    const formatarItensPedido = (itens) =>
        !itens || itens.length === 0
            ? "Nenhum item"
            : itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ");

    const getDataLocal = (dataIso) => {
        if (!dataIso) return "";
        return new Date(dataIso).toLocaleDateString("en-CA");
    };

    const isHoje = (dataIso) => {
        if (!dataIso) return false;
        return getDataLocal(dataIso) === new Date().toLocaleDateString("en-CA");
    };

    const formatarDataEHora = (dataIso) => {
        if (!dataIso) return "Sem data";
        const d = new Date(dataIso);
        return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    };

    const getDiasDaSemana = () => {
        const hoje = new Date();
        const domingo = new Date(hoje);
        domingo.setDate(hoje.getDate() - hoje.getDay());
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(domingo);
            d.setDate(domingo.getDate() + i);
            return {
                nome: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][i],
                numero: d.getDate(),
                dataBusca: d.toLocaleDateString("en-CA"),
            };
        });
    };

    const navegarPara = (aba) => {
        setAbaAtiva(aba);
        setMenuMobileAberto(false);
    };

    const temaAtual =
        paletaTemasAdmin[configLoja?.tema] || paletaTemasAdmin.pink;

    // ==========================================
    // ACL: GESTÃO DE ACESSO AOS MÓDULOS PREMIUM
    // ==========================================
    const renderizarMenu = () => {
        if (cargoUsuario === "garcom") {
            return (
                <button
                    onClick={() => navegarPara("garcom")}
                    className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "garcom" ? `${temaAtual.bgAtivo} ${temaAtual.textoAtivo} shadow-sm` : "hover:bg-slate-100 text-slate-700"}`}
                >
                    <MonitorSmartphone size={20} /> App do Garçom
                </button>
            );
        }

        const itensComuns = [];
        const modulosAtivos = configLoja?.modulos || [];

        if (cargoUsuario === "admin") {
            itensComuns.push({
                id: "dashboard",
                icon: <Home size={20} />,
                label: "Visão Geral",
            });
        }

        // Lógica para Bar vs Confeitaria
        if (configLoja?.nicho === "bar_restaurante") {
            itensComuns.push({
                id: "caixa",
                icon: <MonitorSmartphone size={20} />,
                label: "Caixa e Comandas",
            });
            if (cargoUsuario === "admin") {
                itensComuns.push({
                    id: "garcom",
                    icon: <MonitorSmartphone size={20} />,
                    label: "Lançar Pedidos (App)",
                });
            }
        }

        // MÓDULO: KDS (Painel Cozinha) -> Padrão para Delivery, Exige Módulo para Bares
        if (
            configLoja?.nicho !== "bar_restaurante" ||
            modulosAtivos.includes("kds")
        ) {
            itensComuns.push({
                id: "kanban",
                icon: <KanbanSquare size={20} />,
                label: "Produção (KDS)",
            });
        }

        if (cargoUsuario === "admin") {
            itensComuns.push({
                id: "cardapio",
                icon: <ShoppingBag size={20} />,
                label: "Cardápio / Menu",
            });

            // MÓDULO: Ficha Técnica (Estoque)
            if (modulosAtivos.includes("ficha_tecnica")) {
                itensComuns.push({
                    id: "estoque",
                    icon: <Package size={20} />,
                    label: "Controle de Estoque",
                });
            }

            itensComuns.push(
                {
                    id: "clientes",
                    icon: <Users size={20} />,
                    label: "Clientes",
                },
                {
                    id: "historico",
                    icon: <ListOrdered size={20} />,
                    label: "Histórico de Pedidos",
                },
                {
                    id: "financeiro",
                    icon: <DollarSign size={20} />,
                    label: "Financeiro",
                },
            );
        }

        return itensComuns.map((item) => (
            <button
                key={item.id}
                onClick={() => navegarPara(item.id)}
                className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === item.id ? `${temaAtual.bgAtivo} ${temaAtual.textoAtivo} shadow-sm` : "hover:bg-slate-100 text-slate-700"}`}
            >
                {item.icon} {item.label}
            </button>
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden">
            {menuMobileAberto && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMenuMobileAberto(false)}
                />
            )}

            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out ${menuMobileAberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${cargoUsuario === "garcom" ? "hidden lg:flex" : "flex"}`}
            >
                <div className="p-8 border-b text-center relative">
                    <button
                        onClick={() => setMenuMobileAberto(false)}
                        className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-slate-800"
                    >
                        <X size={24} />
                    </button>
                    {configLoja?.logo ? (
                        <img
                            src={configLoja.logo}
                            alt="Logo"
                            className={`w-20 h-20 mx-auto rounded-full object-cover border-4 mb-3 shadow-sm ${temaAtual.bgAtivo.replace("bg-", "border-")}`}
                        />
                    ) : (
                        <div
                            className={`w-20 h-20 mx-auto rounded-full ${temaAtual.bgAtivo} ${temaAtual.textoAtivo} flex items-center justify-center font-black text-3xl mb-3 shadow-sm`}
                        >
                            {configLoja?.nomeExibicao?.charAt(0) || "D"}
                        </div>
                    )}
                    <p className="text-slate-800 font-bold text-lg leading-tight truncate px-2">
                        {configLoja?.nomeExibicao || nomeDaLoja}
                    </p>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mt-1">
                        {cargoUsuario === "garcom"
                            ? "App Garçom"
                            : "Painel Gestor"}
                    </p>
                </div>

                <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
                    {renderizarMenu()}

                    {/* Propaganda Visual para o lojista comprar mais módulos */}
                    {cargoUsuario === "admin" &&
                        configLoja &&
                        (configLoja.modulos || []).length < 4 && (
                            <div
                                className="mt-6 mb-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() =>
                                    alert(
                                        "Entre em contato com o suporte (SuperAdmin) para adquirir novos módulos!",
                                    )
                                }
                            >
                                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Lock
                                        size={14}
                                        className="text-amber-500"
                                    />{" "}
                                    Desbloquear Recursos
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                                    Melhore a gestão da sua loja com novos
                                    módulos premium.
                                </p>
                            </div>
                        )}

                    {cargoUsuario === "admin" && (
                        <div className="pt-4 mt-2 border-t border-slate-100">
                            <button
                                onClick={() => navegarPara("configuracoes")}
                                className={`w-full text-left px-5 py-3 rounded-2xl flex items-center gap-3 font-medium transition-all ${abaAtiva === "configuracoes" ? `${temaAtual.bgAtivo} ${temaAtual.textoAtivo} shadow-sm` : "hover:bg-slate-100 text-slate-700"}`}
                            >
                                <Settings size={20} /> Configurações
                            </button>
                        </div>
                    )}
                </nav>

                <div className="p-6 border-t mt-auto space-y-4">
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

            <main className="flex-1 h-screen overflow-y-auto relative">
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {cargoUsuario !== "garcom" && (
                            <button
                                onClick={() => setMenuMobileAberto(true)}
                                className="p-2 bg-slate-100 rounded-xl text-slate-600"
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        <span className="font-bold text-slate-800">
                            OdevTech{" "}
                            {cargoUsuario === "garcom"
                                ? "Atendimento"
                                : "Gestão"}
                        </span>
                    </div>
                    {cargoUsuario === "garcom" && (
                        <button
                            onClick={() => {
                                signOut(auth);
                                navigate(`/login/${nomeDaLoja}`);
                            }}
                            className="text-red-500 font-bold text-xs"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </header>

                <div
                    className={`p-6 max-w-7xl mx-auto ${cargoUsuario === "garcom" ? "lg:p-6" : "lg:p-12"}`}
                >
                    {abaAtiva !== "garcom" && (
                        <div className="mb-10">
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
                                {abaAtiva === "dashboard" && "Visão Geral"}
                                {abaAtiva === "caixa" &&
                                    "Controle de Caixa e Comandas"}
                                {abaAtiva === "kanban" &&
                                    "Gestão Operacional (KDS)"}
                                {abaAtiva === "cardapio" &&
                                    "Gestão de Cardápio"}
                                {abaAtiva === "estoque" &&
                                    "Controle de Estoque e Compras"}
                                {abaAtiva === "clientes" &&
                                    "Gestão de Clientes (CRM)"}
                                {abaAtiva === "historico" &&
                                    "Histórico de Pedidos"}
                                {abaAtiva === "configuracoes" &&
                                    "Configurações da Loja"}
                                {abaAtiva === "financeiro" && "Fluxo de Caixa"}
                            </h1>
                        </div>
                    )}
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
                    {abaAtiva === "kanban" && (
                        <AbaKanban
                            pedidos={pedidos}
                            formatarItensPedido={formatarItensPedido}
                            formatarDinheiro={formatarDinheiro}
                            isHoje={isHoje}
                        />
                    )}
                    {abaAtiva === "caixa" && (
                        <AbaCaixaBar nomeDaLoja={nomeDaLoja} />
                    )}
                    {abaAtiva === "garcom" && (
                        <AbaGarcom nomeDaLoja={nomeDaLoja} />
                    )}
                    {abaAtiva === "cardapio" && (
                        <AbaCardapio
                            nomeDaLoja={nomeDaLoja}
                            produtos={produtos}
                            formatarDinheiro={formatarDinheiro}
                        />
                    )}
                    {abaAtiva === "estoque" && (
                        <AbaEstoque nomeDaLoja={nomeDaLoja} />
                    )}
                    {abaAtiva === "clientes" && (
                        <AbaClientes
                            nomeDaLoja={nomeDaLoja}
                            clientes={clientes}
                        />
                    )}
                    {abaAtiva === "historico" && (
                        <AbaHistorico
                            pedidos={pedidos}
                            formatarDinheiro={formatarDinheiro}
                        />
                    )}
                    {abaAtiva === "financeiro" && (
                        <AbaFinanceiro
                            nomeDaLoja={nomeDaLoja}
                            pedidos={pedidos}
                            formatarDinheiro={formatarDinheiro}
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
