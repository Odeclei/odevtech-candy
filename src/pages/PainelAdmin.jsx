import { useState, useEffect, useRef } from "react";
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
  BellRing,
  Printer,
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

// ==========================================
// FUNÇÕES GLOBAIS DE DATA (BLINDADAS)
// ==========================================
const getDateStr = (dateObj) => {
  const ano = dateObj.getFullYear();
  const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dia = String(dateObj.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
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

  const [notificacoes, setNotificacoes] = useState([]);
  const historicoItensMesa = useRef({});

  // FUNÇÃO DE IMPRESSÃO DO TOAST
  const imprimirTicketRapido = (dados) => {
    const janelaImpressao = window.open("", "", "width=300,height=600");
    let htmlCupom = `
            <html><head><title>Ticket</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 5mm; color: #000; font-size: 14px; }
                .center { text-align: center; } .bold { font-weight: bold; } hr { border-top: 1px dashed #000; border-bottom: none; margin: 8px 0; }
            </style>
            </head><body>
            <div class="center bold" style="font-size: 18px; margin-bottom: 5px;">NOVO PEDIDO</div>
            <div class="center">${configLoja?.nomeExibicao || nomeDaLoja}</div><hr/>
            <div style="font-size: 16px; margin-bottom: 10px;"><b>Cliente:</b> ${dados.cliente}</div>
        `;

    if (dados.endereco)
      htmlCupom += `<div style="margin-bottom: 10px;"><b>Endereço:</b> ${dados.endereco}</div>`;
    if (dados.telefone)
      htmlCupom += `<div style="margin-bottom: 10px;"><b>WhatsApp:</b> ${dados.telefone}</div>`;

    htmlCupom += `<hr/><div class="bold">ITENS DO PEDIDO:</div><div style="margin-top: 5px;">`;
    (dados.itens || []).forEach((item) => {
      htmlCupom += `<div style="margin-bottom: 4px;">${item.quantidade || item.qtd_total}x ${item.nome}</div>`;
    });
    htmlCupom += `</div><hr/><div class="center" style="margin-top: 15px;">Emitido em: ${new Date().toLocaleString("pt-BR")}</div></body></html>`;

    janelaImpressao.document.write(htmlCupom);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    setTimeout(() => {
      janelaImpressao.print();
      janelaImpressao.close();
    }, 500);
  };

  const dispararAlerta = (titulo, texto, dadosAlvo = null) => {
    const id = Date.now();
    setNotificacoes((prev) => [...prev, { id, titulo, texto, dadosAlvo }]);
    try {
      // LINK CORRIGIDO PARA O TOQUE DA CAMPAINHA
      const audio = new Audio(
        "https://cdn.pixabay.com/audio/2022/03/15/audio_24e057ba3b.mp3",
      );
      audio
        .play()
        .catch(() =>
          console.log("Áudio bloqueado. Interaja com a página primeiro."),
        );
    } catch (e) {}
    setTimeout(
      () => setNotificacoes((prev) => prev.filter((n) => n.id !== id)),
      10000,
    );
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "lojas", nomeDaLoja), (docSnap) => {
      if (docSnap.exists()) {
        const config = { id: docSnap.id, ...docSnap.data() };
        setConfigLoja(config);
        document.title = `${config.nomeExibicao || nomeDaLoja} - Painel Gestor`;
        const modulosAtivos = config.modulos || [];
        if (abaAtiva === "estoque" && !modulosAtivos.includes("ficha_tecnica"))
          setAbaAtiva("dashboard");
        if (
          abaAtiva === "kanban" &&
          config.nicho === "bar_restaurante" &&
          !modulosAtivos.includes("kds")
        )
          setAbaAtiva("dashboard");
      }
    });
    return () => unsubscribe();
  }, [nomeDaLoja, abaAtiva]);

  useEffect(() => {
    let isInitialPedidos = true;
    const unPedidos = onSnapshot(
      query(collection(db, "pedidos"), where("loja", "==", nomeDaLoja)),
      (snap) => {
        setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        if (!isInitialPedidos) {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              const valorFormatado = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(data.valorTotal || 0);
              if (data.origem === "mesa" || data.origem === "garcom") {
                dispararAlerta(
                  "🛎️ Pedido para a Cozinha!",
                  `${data.cliente} adicionou itens via Autoatendimento ou Garçom.`,
                  data,
                );
              } else {
                dispararAlerta(
                  "🛵 Novo Pedido Delivery!",
                  `O cliente ${data.cliente} enviou um pedido de ${valorFormatado}.`,
                  data,
                );
              }
            }
          });
        }
        isInitialPedidos = false;
      },
    );

    const unProdutos = onSnapshot(
      query(collection(db, "produtos"), where("loja", "==", nomeDaLoja)),
      (snap) => setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unClientes = onSnapshot(
      query(collection(db, "clientes"), where("loja", "==", nomeDaLoja)),
      (snap) => setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
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
        const usuarioLogado = equipe.find((m) => m.email === emailLogado);
        if (usuarioLogado) {
          setCargoUsuario(usuarioLogado.role);
          if (usuarioLogado.role === "garcom") setAbaAtiva("garcom");
        } else setCargoUsuario("admin");
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

  const getDiasDaSemana = () => {
    const hoje = new Date();
    const domingo = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate() - hoje.getDay(),
    );
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(domingo);
      d.setDate(domingo.getDate() + i);
      return {
        nome: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][i],
        numero: d.getDate(),
        dataBusca: getDateStr(d),
      };
    });
  };

  const isHoje = (dataIso) => {
    if (!dataIso) return false;
    return getDateStr(new Date(dataIso)) === getDateStr(new Date());
  };

  const formatarDataEHora = (dataIso) => {
    if (!dataIso) return "Sem data";
    const d = new Date(dataIso);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const navegarPara = (aba) => {
    setAbaAtiva(aba);
    setMenuMobileAberto(false);
  };
  const temaAtual = paletaTemasAdmin[configLoja?.tema] || paletaTemasAdmin.pink;

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

    if (cargoUsuario === "admin")
      itensComuns.push({
        id: "dashboard",
        icon: <Home size={20} />,
        label: "Visão Geral",
      });
    if (configLoja?.nicho === "bar_restaurante") {
      itensComuns.push({
        id: "caixa",
        icon: <MonitorSmartphone size={20} />,
        label: "Caixa e Comandas",
      });
      if (cargoUsuario === "admin")
        itensComuns.push({
          id: "garcom",
          icon: <MonitorSmartphone size={20} />,
          label: "Lançar Pedidos (App)",
        });
    }
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
      if (modulosAtivos.includes("ficha_tecnica"))
        itensComuns.push({
          id: "estoque",
          icon: <Package size={20} />,
          label: "Controle de Estoque",
        });
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
      {/* NOTIFICAÇÕES GLOBAIS COM BOTÃO DE IMPRIMIR */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {notificacoes.map((n) => (
          <div
            key={n.id}
            className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl w-80 sm:w-96 animate-in slide-in-from-right pointer-events-auto border-l-4 border-amber-500"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-amber-400 flex items-center gap-2">
                <BellRing size={16} /> {n.titulo}
              </h4>
              <button
                onClick={() =>
                  setNotificacoes((prev) => prev.filter((x) => x.id !== n.id))
                }
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-300 font-medium leading-relaxed mb-4">
              {n.texto}
            </p>
            {n.dadosAlvo && (
              <button
                onClick={() => imprimirTicketRapido(n.dadosAlvo)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <Printer size={14} /> Imprimir Comanda / Ticket
              </button>
            )}
          </div>
        ))}
      </div>

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
            {cargoUsuario === "garcom" ? "App Garçom" : "Painel Gestor"}
          </p>
        </div>
        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
          {renderizarMenu()}
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
                  <Lock size={14} className="text-amber-500" /> Desbloquear
                  Recursos
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                  Melhore a gestão da sua loja com novos módulos premium.
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
              OdevTech {cargoUsuario === "garcom" ? "Atendimento" : "Gestão"}
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
                {abaAtiva === "caixa" && "Controle de Caixa e Comandas"}
                {abaAtiva === "kanban" && "Gestão Operacional (KDS)"}
                {abaAtiva === "cardapio" && "Gestão de Cardápio"}
                {abaAtiva === "estoque" && "Controle de Estoque e Compras"}
                {abaAtiva === "clientes" && "Gestão de Clientes (CRM)"}
                {abaAtiva === "historico" && "Histórico de Pedidos"}
                {abaAtiva === "configuracoes" && "Configurações da Loja"}
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
          {abaAtiva === "kanban" && <AbaKanban nomeDaLoja={nomeDaLoja} />}
          {abaAtiva === "caixa" && <AbaCaixaBar nomeDaLoja={nomeDaLoja} />}
          {abaAtiva === "garcom" && <AbaGarcom nomeDaLoja={nomeDaLoja} />}
          {abaAtiva === "cardapio" && (
            <AbaCardapio
              nomeDaLoja={nomeDaLoja}
              produtos={produtos}
              formatarDinheiro={formatarDinheiro}
            />
          )}
          {abaAtiva === "estoque" && <AbaEstoque nomeDaLoja={nomeDaLoja} />}
          {abaAtiva === "clientes" && (
            <AbaClientes nomeDaLoja={nomeDaLoja} clientes={clientes} />
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
