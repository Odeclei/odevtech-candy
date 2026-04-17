import { useState } from "react";
import {
    AlertCircle,
    Clock,
    CheckCircle,
    ShoppingBag,
    TrendingUp,
    DollarSign,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaDashboard({
    // nomeDaLoja,
    pedidos,
    clientes,
    formatarDinheiro,
    formatarDataEHora,
    formatarItensPedido,
    isHoje,
    getDiasDaSemana, // <-- CORREÇÃO 1: Faltava receber o calendário aqui!
}) {
    // Estados para a Triagem
    const [editandoId, setEditandoId] = useState(null);
    const [editNome, setEditNome] = useState("");
    const [editTelefone, setEditTelefone] = useState("");
    const [editDocumento, setEditDocumento] = useState("");
    const [editEndereco, setEditEndereco] = useState("");
    const [sinalPago, setSinalPago] = useState(false);

    // ==========================================
    // CÁLCULOS ANALÍTICOS
    // ==========================================
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    const pedidosNaTriagem = pedidos.filter(
        (p) => p.status === "pendente" || p.status === "aguardando_pix",
    );
    const pedidosDeHoje = pedidos.filter(
        (p) =>
            ["agendado", "em_producao"].includes(p.status) &&
            isHoje(p.dataEntrega),
    );

    // CORREÇÃO 2: A variável agora é faturamentoMes (muito mais útil para a gestão)
    const faturamentoMes = pedidos
        .filter((p) => {
            const data = new Date(p.criadoEm);
            return (
                (p.status === "pronto" || p.status === "entregue") &&
                data.getMonth() === mesAtual &&
                data.getFullYear() === anoAtual
            );
        })
        .reduce((acc, p) => acc + (p.valorTotal || 0), 0);

    const ticketMedio =
        faturamentoMes > 0
            ? faturamentoMes /
              pedidos.filter((p) => p.status === "entregue").length
            : 0;

    // ==========================================
    // FUNÇÕES DE TRIAGEM
    // ==========================================
    const iniciarEdicao = (pedido) => {
        setEditandoId(pedido.id);
        setEditNome(pedido.cliente);
        setEditTelefone(pedido.telefone || "");
        setEditDocumento(pedido.documento || pedido.cpf || "");
        setEditEndereco(pedido.endereco || "");
        setSinalPago(pedido.sinalPago || false);
    };

    const buscarClienteNoCRM = () => {
        if (!editDocumento) return alert("Digite um CPF ou CNPJ para buscar.");

        const clienteEncontrado = clientes.find(
            (c) => c.documento === editDocumento || c.cpf === editDocumento,
        );

        if (clienteEncontrado) {
            setEditNome(clienteEncontrado.nome || editNome);
            setEditTelefone(clienteEncontrado.telefone || editTelefone);

            let enderecoFormatado = "";
            if (
                clienteEncontrado.endereco &&
                typeof clienteEncontrado.endereco === "object"
            ) {
                const e = clienteEncontrado.endereco;
                const partes = [
                    e.logradouro ? `${e.logradouro}` : "",
                    e.numero ? `, ${e.numero}` : "",
                    e.bairro ? ` - ${e.bairro}` : "",
                    e.cidade ? `, ${e.cidade}` : "",
                    e.estado ? `/${e.estado}` : "",
                ];
                enderecoFormatado = partes.join("").replace(/^[\s,]+/, "");
            } else {
                enderecoFormatado = clienteEncontrado.endereco || editEndereco;
            }

            setEditEndereco(enderecoFormatado);

            const ehPJ = editDocumento.replace(/\D/g, "").length > 11;
            alert(
                `Cliente ${ehPJ ? "PJ" : "PF"} encontrado no CRM! Dados preenchidos.`,
            );
        } else {
            alert(
                "Cliente não encontrado no CRM com este documento. Verifique se o número está correto.",
            );
        }
    };

    const aceitarPedido = async (pedido) => {
        try {
            const nomeFinal = editNome || pedido.cliente;
            const telefoneFinal = editTelefone || pedido.telefone;

            await updateDoc(doc(db, "pedidos", pedido.id), {
                status: "agendado",
                cliente: nomeFinal,
                telefone: telefoneFinal,
                documento: editDocumento,
                endereco: editEndereco,
                sinalPago: sinalPago,
            });

            setEditandoId(null);
            setEditNome("");
            setEditTelefone("");
            setEditDocumento("");
            setEditEndereco("");
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

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">
                            Novos Pedidos
                        </p>
                        <p className="text-3xl font-bold text-orange-600">
                            {pedidosNaTriagem.length}
                        </p>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-2xl">
                        <AlertCircle size={28} className="text-orange-600" />
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Para Hoje</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {pedidosDeHoje.length}
                        </p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-2xl">
                        <Clock size={28} className="text-blue-600" />
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">
                            Vendas (Mês)
                        </p>
                        <p className="text-2xl font-bold text-emerald-600">
                            {formatarDinheiro(faturamentoMes)}{" "}
                            {/* <-- AQUI ESTAVA O ERRO */}
                        </p>
                    </div>
                    <div className="bg-emerald-100 p-4 rounded-2xl">
                        <TrendingUp size={28} className="text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">
                            Ticket Médio
                        </p>
                        <p className="text-2xl font-bold text-pink-600">
                            {formatarDinheiro(ticketMedio)}
                        </p>
                    </div>
                    <div className="bg-pink-100 p-4 rounded-2xl">
                        <DollarSign size={28} className="text-pink-600" />
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
                                        {formatarItensPedido(pedido.itens)}
                                    </p>

                                    <div className="border-t border-slate-200 pt-4 mt-2">
                                        {editandoId === pedido.id ? (
                                            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    Revisão e Dados Fiscais
                                                </p>

                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                                        CPF ou CNPJ
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={
                                                                editDocumento
                                                            }
                                                            onChange={(e) =>
                                                                setEditDocumento(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="000.000.000-00"
                                                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-pink-400 outline-none"
                                                        />
                                                        <button
                                                            onClick={
                                                                buscarClienteNoCRM
                                                            }
                                                            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
                                                            title="Buscar no CRM"
                                                        >
                                                            Buscar
                                                        </button>
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    value={editNome}
                                                    onChange={(e) =>
                                                        setEditNome(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-pink-400 outline-none"
                                                    placeholder="Nome do Cliente"
                                                />

                                                <input
                                                    type="text"
                                                    value={editTelefone}
                                                    onChange={(e) =>
                                                        setEditTelefone(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-pink-400 outline-none"
                                                    placeholder="WhatsApp"
                                                />

                                                <input
                                                    type="text"
                                                    value={editEndereco}
                                                    onChange={(e) =>
                                                        setEditEndereco(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Endereço de Entrega/Faturamento"
                                                    className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-pink-400 outline-none"
                                                />

                                                <label className="flex items-center gap-3 py-3 cursor-pointer bg-emerald-50 border border-emerald-100 rounded-lg px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={sinalPago}
                                                        onChange={(e) =>
                                                            setSinalPago(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="w-5 h-5 accent-emerald-600"
                                                    />
                                                    <span className="text-sm font-bold text-emerald-800">
                                                        Sinal de 50% Recebido
                                                        via Pix
                                                    </span>
                                                </label>

                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={() =>
                                                            aceitarPedido(
                                                                pedido,
                                                            )
                                                        }
                                                        className="flex-1 bg-slate-900 hover:bg-pink-600 text-white py-3 rounded-lg font-bold text-sm transition-colors"
                                                    >
                                                        Confirmar e Agendar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setEditandoId(null)
                                                        }
                                                        className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg font-bold text-sm transition"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-slate-800">
                                                        {pedido.cliente}
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
                                                        iniciarEdicao(pedido)
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
                                            {formatarItensPedido(pedido.itens)}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg ${pedido.status === "agendado" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                                    >
                                        {pedido.status === "agendado"
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
                    {getDiasDaSemana &&
                        getDiasDaSemana().map((dia) => {
                            const pedidosDoDia = pedidos.filter(
                                (p) =>
                                    p.dataEntrega &&
                                    p.dataEntrega.startsWith(dia.dataBusca) &&
                                    ![
                                        "pendente",
                                        "aguardando_pix",
                                        "entregue",
                                    ].includes(p.status),
                            );
                            const isDiaHoje = isHoje(dia.dataBusca + "T00:00");
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
                                            {pedidosDoDia.length} pedidos
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
    );
}
