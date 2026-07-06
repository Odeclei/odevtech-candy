import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  BarChart3,
  Award,
  Coffee,
  Users,
  Package,
  X,
  Save,
  Phone,
  MapPin,
  FileText,
  Search,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaDashboard({
  nomeDaLoja,
  pedidos,
  clientes,
  formatarDinheiro,
  formatarDataEHora,
  formatarItensPedido,
  isHoje,
  getDiasDaSemana,
}) {
  const [comandas, setComandas] = useState([]);
  const [configLoja, setConfigLoja] = useState(null);

  // Estados para edição rápida na triagem
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editDocumento, setEditDocumento] = useState("");
  const [editEndereco, setEditEndereco] = useState("");
  const [editValorPago, setEditValorPago] = useState(""); // <-- NOVO ESTADO
  const [sinalPago, setSinalPago] = useState(false);

  useEffect(() => {
    if (!nomeDaLoja) return;
    const unsubscribe = onSnapshot(doc(db, "lojas", nomeDaLoja), (docSnap) => {
      if (docSnap.exists()) setConfigLoja(docSnap.data());
    });

    const qComandas = query(
      collection(db, "comandas"),
      where("loja", "==", nomeDaLoja),
      where("status", "==", "aberta"),
    );
    const unComandas = onSnapshot(qComandas, (snap) => {
      setComandas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribe();
      unComandas();
    };
  }, [nomeDaLoja]);

  // ==========================================
  // BUSCA INTELIGENTE NO CRM
  // ==========================================
  const buscarDadosClienteNoCadastro = () => {
    if (!editTelefone) return alert("Digite um telefone para buscar.");
    const telBusca = editTelefone.replace(/\D/g, "");

    const encontrado = clientes.find((c) => {
      const telC = (c.telefone || "").replace(/\D/g, "");
      return telC === telBusca;
    });

    if (encontrado) {
      setEditNome(encontrado.nome || "");
      setEditDocumento(encontrado.documento || encontrado.cpf || "");

      const end = encontrado.endereco;
      if (typeof end === "string") {
        setEditEndereco(end);
      } else if (end && typeof end === "object") {
        const formatado = `${end.logradouro || ""}, ${end.numero || ""} - ${end.bairro || ""} (${end.cidade || ""})`;
        setEditEndereco(formatado.replace(/^, /, "").trim());
      }
      alert(`Dados de "${encontrado.nome}" carregados com sucesso!`);
    } else {
      alert("Nenhum cliente encontrado com este telefone no cadastro.");
    }
  };

  // ==========================================
  // LÓGICA DE NEGÓCIO E MÉTRICAS
  // ==========================================
  const isDelivery =
    configLoja?.nicho === "delivery" || configLoja?.nicho === "confeitaria";

  const pedidosHoje = pedidos.filter((p) => isHoje(p.criadoEm));
  const faturamentoHoje = pedidosHoje
    .filter((p) => p.status !== "cancelado")
    .reduce((acc, p) => acc + (p.valorTotal || 0), 0);

  const ticketMedio =
    pedidosHoje.length > 0 ? faturamentoHoje / pedidosHoje.length : 0;

  const pedidosNaTriagem = pedidos.filter(
    (p) => p.status === "pendente" || p.status === "aguardando_pix",
  );

  const mesasAtivas = comandas.length;

  const mesAtual = new Date().getMonth();
  const faturamentoMesGlobal = pedidos
    .filter(
      (p) =>
        p.status !== "cancelado" &&
        new Date(p.criadoEm).getMonth() === mesAtual,
    )
    .reduce((acc, p) => acc + (p.valorTotal || 0), 0);

  // ==========================================
  // FUNÇÕES DE AÇÃO (ATUALIZADAS)
  // ==========================================
  const aprovarPedido = async (pedido) => {
    // Sugere o valor original do sinal, mas permite que o operador digite o que realmente caiu no extrato
    const valorSugerido = pedido.valorSinal || 0;
    const valorInformado = window.prompt(
      `Confirme o valor recebido no Pix para aprovar o pedido de ${pedido.cliente}:`,
      valorSugerido,
    );

    if (valorInformado === null) return; // Operador cancelou

    const valorFinal = parseFloat(valorInformado.replace(",", ".")) || 0;

    try {
      await updateDoc(doc(db, "pedidos", pedido.id), {
        status: "agendado",
        valorSinal: valorFinal, // Regista a verdade fiscal
      });
    } catch (e) {
      alert("Erro ao aprovar.");
    }
  };

  const cancelarPedido = async (id) => {
    if (window.confirm("Deseja realmente cancelar este pedido?")) {
      await updateDoc(doc(db, "pedidos", id), { status: "cancelado" });
    }
  };

  const abrirEdicao = (p) => {
    setEditandoId(p.id);
    setEditNome(p.cliente || "");
    setEditTelefone(p.telefone || "");
    setEditDocumento(p.cpf || "");
    setEditEndereco(p.endereco || "");
    setEditValorPago(p.valorSinal || 0); // Puxa o valor do sinal cobrado
    setSinalPago(p.status === "agendado" || p.valorSinal === 0);
  };

  const salvarAlteracoes = async () => {
    try {
      await updateDoc(doc(db, "pedidos", editandoId), {
        cliente: editNome,
        telefone: editTelefone,
        cpf: editDocumento,
        endereco: editEndereco,
        status: sinalPago ? "agendado" : "aguardando_pix",
        valorSinal: parseFloat(editValorPago) || 0, // Atualiza o valor realmente pago
      });
      setEditandoId(null);
    } catch (e) {
      alert("Erro ao salvar.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500 mb-1">Vendas Hoje</p>
            <p className="text-3xl font-black text-emerald-600">
              {formatarDinheiro(faturamentoHoje)}
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
            <TrendingUp size={28} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500 mb-1">Ticket Médio</p>
            <p className="text-3xl font-black text-blue-600">
              {formatarDinheiro(ticketMedio)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-500">
            <DollarSign size={28} />
          </div>
        </div>

        <div
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-orange-300 transition-all"
          onClick={() =>
            document
              .getElementById("sessao-triagem")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <div>
            <p className="text-sm text-slate-500 mb-1">Na Triagem</p>
            <p
              className={`text-3xl font-black ${pedidosNaTriagem.length > 0 ? "text-orange-600" : "text-slate-700"}`}
            >
              {pedidosNaTriagem.length}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-2xl text-orange-500">
            <AlertCircle size={28} />
          </div>
        </div>

        {!isDelivery ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500 mb-1">Mesas Ativas</p>
              <p className="text-3xl font-black text-amber-600">
                {mesasAtivas}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl text-amber-500">
              <Coffee size={28} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500 mb-1">Vendas (Mês)</p>
              <p className="text-2xl font-black text-pink-600">
                {formatarDinheiro(faturamentoMesGlobal)}
              </p>
            </div>
            <div className="bg-pink-50 p-4 rounded-2xl text-pink-500">
              <ShoppingBag size={28} />
            </div>
          </div>
        )}
      </div>

      {/* 2. SEÇÃO DE TRIAGEM UNIVERSAL */}
      <div id="sessao-triagem" className="scroll-mt-24">
        {pedidosNaTriagem.length > 0 && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-orange-100 mb-8">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              Triagem de Novos Pedidos (Delivery)
              <span className="bg-orange-100 text-orange-600 text-[10px] uppercase font-black px-3 py-1 rounded-full animate-pulse tracking-widest">
                Aguardando Aprovação
              </span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pedidosNaTriagem.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        Cliente
                      </span>
                      <p className="font-bold text-slate-800 text-lg leading-tight">
                        {pedido.cliente}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Phone size={12} /> {pedido.telefone}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black bg-white px-2 py-1 rounded-lg border shadow-sm">
                        {formatarDinheiro(pedido.valorTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                      Itens do Pedido
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      {formatarItensPedido(pedido.itens)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => aprovarPedido(pedido)}
                      className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Aceitar Pedido
                    </button>
                    <button
                      onClick={() => abrirEdicao(pedido)}
                      className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition"
                      title="Editar dados ou buscar cadastro"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => cancelarPedido(pedido.id)}
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. COLUNAS DE CONTEÚDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {!isDelivery && !configLoja?.modulos?.includes("kds") && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-amber-100">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Package className="text-amber-500" /> Fila de Produção (Salão)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pedidos.filter(
                  (p) =>
                    (p.origem === "mesa" || p.origem === "garcom") &&
                    p.status === "agendado",
                ).length === 0 ? (
                  <div className="md:col-span-2 py-10 text-center text-slate-400">
                    <CheckCircle
                      size={40}
                      className="mx-auto mb-2 opacity-20"
                    />
                    <p className="italic">
                      Tudo pronto! Nenhuma ordem pendente.
                    </p>
                  </div>
                ) : (
                  pedidos
                    .filter(
                      (p) =>
                        (p.origem === "mesa" || p.origem === "garcom") &&
                        p.status === "agendado",
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-black text-slate-800">
                            {p.cliente}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {formatarItensPedido(p.itens)}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateDoc(doc(db, "pedidos", p.id), {
                              status: "pronto",
                            })
                          }
                          className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-emerald-600 transition shadow-sm"
                        >
                          Pronto
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
              <BarChart3 className="text-blue-500" /> Movimentação da Semana
            </h3>
            <div className="grid grid-cols-7 gap-4 items-end h-64">
              {getDiasDaSemana().map((dia) => {
                const pedidosDoDia = pedidos.filter(
                  (p) =>
                    p.criadoEm.startsWith(dia.dataBusca) &&
                    p.status !== "cancelado",
                );
                const totalDia = pedidosDoDia.reduce(
                  (acc, p) => acc + (p.valorTotal || 0),
                  0,
                );
                const maxFaturamento = 1000;
                const altura = Math.min((totalDia / maxFaturamento) * 100, 100);
                const isDiaHoje = isHoje(dia.dataBusca + "T00:00");

                return (
                  <div
                    key={dia.dataBusca}
                    className="flex flex-col items-center gap-3 group relative"
                  >
                    <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatarDinheiro(totalDia)}
                    </div>
                    <div
                      className={`w-full rounded-xl transition-all duration-500 ${isDiaHoje ? "bg-pink-500 shadow-lg shadow-pink-200" : "bg-slate-200 group-hover:bg-slate-300"}`}
                      style={{ height: `${Math.max(altura, 5)}%` }}
                    />
                    <span
                      className={`text-[10px] font-black uppercase ${isDiaHoje ? "text-pink-600" : "text-slate-400"}`}
                    >
                      {dia.nome.substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <Award className="text-amber-500" /> Mais Vendidos
            </h3>
            <p className="text-xs text-slate-400 italic text-center py-4">
              Módulo de inteligência de vendas ativo.
            </p>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white">
            <h3 className="font-black mb-6 flex items-center gap-2">
              <Clock className="text-pink-400" /> Agendados para Hoje
            </h3>
            <div className="space-y-3">
              {pedidos.filter(
                (p) =>
                  p.status === "agendado" &&
                  p.dataEntrega &&
                  isHoje(p.dataEntrega),
              ).length === 0 ? (
                <p className="text-slate-500 text-sm italic">
                  Nenhuma entrega agendada para hoje.
                </p>
              ) : (
                pedidos
                  .filter(
                    (p) =>
                      p.status === "agendado" &&
                      p.dataEntrega &&
                      isHoje(p.dataEntrega),
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-sm">{p.cliente}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(p.dataEntrega).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="text-pink-400 font-black text-xs">
                        {formatarDinheiro(p.valorTotal)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO RÁPIDA COM BUSCA NO CRM */}
      {editandoId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileText className="text-blue-500" /> Editar Pedido
              </h2>
              <button
                onClick={() => setEditandoId(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="flex-1 border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                  />
                  <button
                    onClick={buscarDadosClienteNoCadastro}
                    className="bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-100 transition"
                    title="Buscar no Cadastro de Clientes"
                  >
                    <Search size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome Completo"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Endereço de Entrega
                </label>
                <textarea
                  value={editEndereco}
                  onChange={(e) => setEditEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro..."
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                  rows="2"
                />
              </div>

              {/* NOVO CAMPO: VALOR PAGO VIA PIX */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Valor Pago (Pix Recebido)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editValorPago}
                  onChange={(e) => setEditValorPago(e.target.value)}
                  placeholder="0.00"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-black text-emerald-600"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <input
                  type="checkbox"
                  checked={sinalPago}
                  onChange={(e) => setSinalPago(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600"
                />
                <div>
                  <span className="font-bold text-emerald-800 text-sm block">
                    Confirmar Pagamento
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    Aprova o pedido e envia para produção.
                  </span>
                </div>
              </label>

              <button
                onClick={salvarAlteracoes}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg active:scale-95 mt-4"
              >
                <Save size={20} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
