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

    const [editandoId, setEditandoId] = useState(null);
    const [editNome, setEditNome] = useState("");
    const [editTelefone, setEditTelefone] = useState("");
    const [editDocumento, setEditDocumento] = useState("");
    const [editEndereco, setEditEndereco] = useState("");
    const [sinalPago, setSinalPago] = useState(false);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const unsubscribe = onSnapshot(
            doc(db, "lojas", nomeDaLoja),
            (docSnap) => {
                if (docSnap.exists()) setConfigLoja(docSnap.data());
            },
        );
        return () => unsubscribe();
    }, [nomeDaLoja]);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const q = query(
            collection(db, "comandas"),
            where("loja", "==", nomeDaLoja),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComandas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [nomeDaLoja]);

    const isDelivery = configLoja?.nicho !== "bar_restaurante";

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
            alert(`Cliente encontrado no CRM! Dados preenchidos.`);
        } else {
            alert("Cliente não encontrado no CRM.");
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
            alert("Erro ao confirmar pedido.");
        }
    };

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

    let faturamentoMesGlobal = 0;
    pedidos.forEach((p) => {
        const data = new Date(p.criadoEm);
        if (
            (p.status === "pronto" || p.status === "entregue") &&
            data.getMonth() === mesAtual &&
            data.getFullYear() === anoAtual
        ) {
            faturamentoMesGlobal += p.valorTotal || 0;
        }
    });
    comandas.forEach((c) => {
        if (c.abertaEm) {
            const data = new Date(c.abertaEm);
            if (
                data.getMonth() === mesAtual &&
                data.getFullYear() === anoAtual
            ) {
                let sub = 0;
                (c.itens || []).forEach((i) => (sub += i.preco * i.qtd_total));
                faturamentoMesGlobal += sub + sub * 0.1;
            }
        }
    });

    let faturamentoHoje = 0;
    let totalVendasHoje = 0;

    pedidos.forEach((p) => {
        const dataCriacao = p.dataEntrega ? p.dataEntrega : p.criadoEm;
        if (isHoje(dataCriacao) && p.status !== "cancelado") {
            faturamentoHoje += p.valorTotal || 0;
            totalVendasHoje += 1;
        }
    });

    const mesasAtivas = comandas.filter((c) => c.status !== "fechada").length;
    comandas.forEach((c) => {
        if (isHoje(c.abertaEm)) {
            let totalComanda = 0;
            (c.itens || []).forEach(
                (item) => (totalComanda += item.preco * item.qtd_total),
            );
            faturamentoHoje += totalComanda + totalComanda * 0.1;
            totalVendasHoje += 1;
        }
    });

    const ticketMedio =
        totalVendasHoje > 0 ? faturamentoHoje / totalVendasHoje : 0;

    const contagemProdutos = {};
    pedidos.forEach((p) => {
        if (p.status !== "cancelado") {
            (p.itens || []).forEach((item) => {
                if (!contagemProdutos[item.id])
                    contagemProdutos[item.id] = {
                        nome: item.nome,
                        qtd: 0,
                        receita: 0,
                    };
                contagemProdutos[item.id].qtd += item.quantidade;
                contagemProdutos[item.id].receita +=
                    item.preco * item.quantidade;
            });
        }
    });
    comandas.forEach((c) => {
        (c.itens || []).forEach((item) => {
            if (!contagemProdutos[item.id_produto])
                contagemProdutos[item.id_produto] = {
                    nome: item.nome,
                    qtd: 0,
                    receita: 0,
                };
            contagemProdutos[item.id_produto].qtd += item.qtd_total;
            contagemProdutos[item.id_produto].receita +=
                item.preco * item.qtd_total;
        });
    });
    const topProdutos = Object.values(contagemProdutos)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5);

    // =========================================================
    // GRÁFICO IMUNE AO FUSO HORÁRIO
    // =========================================================
    const diasSemana = getDiasDaSemana ? getDiasDaSemana() : [];

    const dadosGrafico = diasSemana.map((dia) => {
        let totalDia = 0;

        pedidos.forEach((p) => {
            const dataRef = p.dataEntrega ? p.dataEntrega : p.criadoEm;
            if (
                dataRef &&
                new Date(dataRef).toLocaleDateString("en-CA") ===
                    dia.dataBusca &&
                p.status !== "cancelado"
            ) {
                totalDia += p.valorTotal || 0;
            }
        });

        comandas.forEach((c) => {
            if (
                c.abertaEm &&
                new Date(c.abertaEm).toLocaleDateString("en-CA") ===
                    dia.dataBusca
            ) {
                let sub = 0;
                (c.itens || []).forEach((i) => (sub += i.preco * i.qtd_total));
                totalDia += sub + sub * 0.1;
            }
        });

        return { nome: dia.nome, valor: totalDia };
    });

    const maiorValorGrafico = Math.max(...dadosGrafico.map((d) => d.valor), 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">
                            Vendas Hoje
                        </p>
                        <p className="text-3xl font-bold text-emerald-600">
                            {formatarDinheiro(faturamentoHoje)}
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
                        <p className="text-3xl font-bold text-blue-600">
                            {formatarDinheiro(ticketMedio)}
                        </p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-2xl">
                        <DollarSign size={28} className="text-blue-600" />
                    </div>
                </div>

                {isDelivery ? (
                    <>
                        <div
                            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-orange-300 transition-colors"
                            onClick={() =>
                                document
                                    .getElementById("sessao-triagem")
                                    ?.scrollIntoView({ behavior: "smooth" })
                            }
                        >
                            <div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Na Triagem
                                </p>
                                <p
                                    className={`text-3xl font-bold ${pedidosNaTriagem.length > 0 ? "text-orange-600" : "text-slate-700"}`}
                                >
                                    {pedidosNaTriagem.length}
                                </p>
                            </div>
                            <div className="bg-orange-100 p-4 rounded-2xl">
                                <AlertCircle
                                    size={28}
                                    className="text-orange-600"
                                />
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Faturamento (Mês)
                                </p>
                                <p className="text-2xl font-bold text-pink-600">
                                    {formatarDinheiro(faturamentoMesGlobal)}
                                </p>
                            </div>
                            <div className="bg-pink-100 p-4 rounded-2xl">
                                <ShoppingBag
                                    size={28}
                                    className="text-pink-600"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Mesas Ativas
                                </p>
                                <p className="text-3xl font-bold text-amber-600">
                                    {mesasAtivas}
                                </p>
                            </div>
                            <div className="bg-amber-100 p-4 rounded-2xl">
                                <Coffee size={28} className="text-amber-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Faturamento (Mês)
                                </p>
                                <p className="text-2xl font-bold text-indigo-600">
                                    {formatarDinheiro(faturamentoMesGlobal)}
                                </p>
                            </div>
                            <div className="bg-indigo-100 p-4 rounded-2xl">
                                <BarChart3
                                    size={28}
                                    className="text-indigo-600"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="text-blue-500" /> Receita da
                            Semana
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                            Últimos 7 dias
                        </span>
                    </div>
                    <div className="h-64 flex items-end gap-2 sm:gap-6 pt-6">
                        {dadosGrafico.map((dia, index) => {
                            const alturaPercentual =
                                (dia.valor / maiorValorGrafico) * 100;
                            return (
                                <div
                                    key={index}
                                    className="flex-1 flex flex-col items-center gap-3 group"
                                >
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md mb-2">
                                        {formatarDinheiro(dia.valor)}
                                    </div>
                                    <div className="w-full relative bg-slate-50 rounded-t-xl overflow-hidden h-full flex items-end">
                                        <div
                                            className="w-full bg-blue-500 hover:bg-blue-400 transition-all duration-1000 ease-out rounded-t-xl"
                                            style={{
                                                height: `${alturaPercentual}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">
                                        {dia.nome}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Award className="text-amber-500" /> Top Produtos
                    </h3>
                    <div className="space-y-5">
                        {topProdutos.length === 0 ? (
                            <p className="text-slate-400 italic text-center py-10">
                                Aguardando vendas...
                            </p>
                        ) : (
                            topProdutos.map((produto, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4"
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                                            index === 0
                                                ? "bg-amber-100 text-amber-600"
                                                : index === 1
                                                  ? "bg-slate-200 text-slate-600"
                                                  : index === 2
                                                    ? "bg-orange-100 text-orange-600"
                                                    : "bg-slate-50 text-slate-400 border border-slate-100"
                                        }`}
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 line-clamp-1 text-sm">
                                            {produto.nome}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {produto.qtd} unid.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-600">
                                            {formatarDinheiro(produto.receita)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isDelivery && (
                <>
                    <div
                        id="sessao-triagem"
                        className="grid grid-cols-1 xl:grid-cols-2 gap-8 scroll-mt-24"
                    >
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
                                                {editandoId === pedido.id ? (
                                                    <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                            Revisão e Dados
                                                            Fiscais
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setEditDocumento(
                                                                            e
                                                                                .target
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
                                                                    e.target
                                                                        .value,
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
                                                                    e.target
                                                                        .value,
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
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Endereço de Entrega/Faturamento"
                                                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-pink-400 outline-none"
                                                        />

                                                        <label className="flex items-center gap-3 py-3 cursor-pointer bg-emerald-50 border border-emerald-100 rounded-lg px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    sinalPago
                                                                }
                                                                onChange={(e) =>
                                                                    setSinalPago(
                                                                        e.target
                                                                            .checked,
                                                                    )
                                                                }
                                                                className="w-5 h-5 accent-emerald-600"
                                                            />
                                                            <span className="text-sm font-bold text-emerald-800">
                                                                Sinal de 50%
                                                                Recebido via Pix
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
                                                                Confirmar e
                                                                Agendar
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setEditandoId(
                                                                        null,
                                                                    )
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

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Clock className="text-blue-500" /> Agendados
                                para Hoje
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
                                            className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm"
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

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">
                            Grade da Semana
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {diasSemana.map((dia) => {
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
                                            "cancelado",
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
                </>
            )}
        </div>
    );
}
