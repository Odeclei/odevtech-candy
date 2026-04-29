import React, { useState, useEffect } from "react";
import {
    Search,
    Receipt,
    Printer,
    CreditCard,
    Banknote,
    Plus,
    Minus,
    Users,
    Clock,
    UserCircle,
    Coffee,
    X, // <--- GARANTA QUE ESTE 'X' ESTÁ AQUI
    ShoppingBag,
    ArrowRightLeft,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaCaixaBar({ nomeDaLoja }) {
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [comandas, setComandas] = useState([]);
    const [produtosMenu, setProdutosMenu] = useState([]);

    const [comandaSendoPaga, setComandaSendoPaga] = useState(null);
    const [itensSendoPagos, setItensSendoPagos] = useState({});

    const [isNovaComandaOpen, setIsNovaComandaOpen] = useState(false);
    const [formNovaComanda, setFormNovaComanda] = useState({
        identificador: "",
        cliente: "",
        tipo: "mesa",
    });

    const [comandaParaAdicionar, setComandaParaAdicionar] = useState(null);
    const [formNovoItem, setFormNovoItem] = useState({
        produtoId: "",
        quantidade: 1,
    });

    useEffect(() => {
        if (!nomeDaLoja) return;

        const qComandas = query(
            collection(db, "comandas"),
            where("loja", "==", nomeDaLoja),
        );
        const unComandas = onSnapshot(qComandas, (snapshot) => {
            setComandas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        const qProdutos = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
            where("ativo", "==", true),
        );
        const unProdutos = onSnapshot(qProdutos, (snapshot) => {
            setProdutosMenu(
                snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
            );
        });

        return () => {
            unComandas();
            unProdutos();
        };
    }, [nomeDaLoja]);

    const criarNovaComanda = async (e) => {
        e.preventDefault();
        if (!formNovaComanda.identificador)
            return alert("Preencha o identificador (Ex: Mesa 12)");

        try {
            await addDoc(collection(db, "comandas"), {
                loja: nomeDaLoja,
                identificador: formNovaComanda.identificador,
                cliente: formNovaComanda.cliente || "Cliente Não Identificado",
                tipo: formNovaComanda.tipo,
                status: "aberta",
                itens: [],
                abertaEm: new Date().toISOString(),
            });
            setIsNovaComandaOpen(false);
            setFormNovaComanda({
                identificador: "",
                cliente: "",
                tipo: "mesa",
            });
        } catch (error) {
            alert("Erro ao abrir comanda.");
        }
    };

    const transferirMesa = async (comanda) => {
        const novoIdentificador = window.prompt(
            `Transferir [${comanda.identificador}] para qual mesa/nome?`,
            comanda.identificador,
        );

        if (!novoIdentificador || novoIdentificador === comanda.identificador)
            return;

        try {
            await updateDoc(doc(db, "comandas", comanda.id), {
                identificador: novoIdentificador,
            });
            alert(`Transferido com sucesso para ${novoIdentificador}!`);
        } catch (error) {
            alert("Erro ao transferir mesa.");
        }
    };

    const adicionarItemNaComanda = async (e) => {
        e.preventDefault();
        if (!formNovoItem.produtoId || formNovoItem.quantidade < 1) return;

        try {
            const produtoSelecionado = produtosMenu.find(
                (p) => p.id === formNovoItem.produtoId,
            );
            const itensAtuais = comandaParaAdicionar.itens || [];
            const indexExistente = itensAtuais.findIndex(
                (i) => i.id_produto === produtoSelecionado.id,
            );
            let novosItens = [...itensAtuais];

            if (indexExistente >= 0) {
                novosItens[indexExistente].qtd_total += parseInt(
                    formNovoItem.quantidade,
                );
            } else {
                novosItens.push({
                    id_produto: produtoSelecionado.id,
                    nome: produtoSelecionado.nome,
                    preco: produtoSelecionado.preco,
                    qtd_total: parseInt(formNovoItem.quantidade),
                    qtd_paga: 0,
                });
            }

            await updateDoc(doc(db, "comandas", comandaParaAdicionar.id), {
                itens: novosItens,
                status: "aberta",
            });

            setComandaParaAdicionar(null);
            setFormNovoItem({ produtoId: "", quantidade: 1 });
        } catch (error) {
            alert("Erro ao lançar produto na comanda.");
        }
    };

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);

    const calcularTotaisComanda = (comanda) => {
        let bruto = 0;
        let pago = 0;
        (comanda.itens || []).forEach((item) => {
            bruto += item.qtd_total * item.preco;
            pago += item.qtd_paga * item.preco;
        });
        const taxa = bruto * 0.1;
        const taxaPaga = pago * 0.1;
        return {
            bruto,
            taxa,
            totalGeral: bruto + taxa,
            jaPago: pago + taxaPaga,
            saldoDevedor: bruto + taxa - (pago + taxaPaga),
        };
    };

    // ==========================================
    // NOVO: GERADOR DE CUPOM TÉRMICO (80mm)
    // ==========================================
    const imprimirComanda = (comanda) => {
        const totais = calcularTotaisComanda(comanda);
        const janelaImpressao = window.open("", "", "width=300,height=600");

        let htmlCupom = `
            <html>
            <head>
                <title>Cupom - ${comanda.identificador}</title>
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: 80mm; 
                        margin: 0; 
                        padding: 5mm; 
                        color: #000; 
                        font-size: 12px;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .flex-between { display: flex; justify-content: space-between; }
                    hr { border-top: 1px dashed #000; border-bottom: none; margin: 8px 0; }
                    h2 { font-size: 18px; margin: 0 0 4px 0; }
                    h3 { font-size: 20px; margin: 0; }
                    @media print {
                        @page { margin: 0; }
                        body { width: 80mm; padding: 2mm; }
                    }
                </style>
            </head>
            <body>
                <div class="center">
                    <h2>${nomeDaLoja.toUpperCase()}</h2>
                    <small>Documento de Conferência de Mesa</small>
                </div>
                <hr/>
                <h3 class="center">${comanda.identificador.toUpperCase()}</h3>
                <div style="margin-bottom: 10px; margin-top: 5px;">
                    Cliente: ${comanda.cliente || "Consumidor Salão"} <br/>
                    Abertura: ${comanda.abertaEm ? new Date(comanda.abertaEm).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}
                </div>
                <hr/>
                <div class="flex-between bold">
                    <span>QTD x ITEM</span>
                    <span>TOTAL</span>
                </div>
                <hr/>
                <div style="margin-bottom: 10px;">
        `;

        (comanda.itens || []).forEach((item) => {
            htmlCupom += `
                <div class="flex-between" style="margin-bottom: 4px;">
                    <span>${item.qtd_total}x ${item.nome}</span>
                    <span>${formatarDinheiro(item.preco * item.qtd_total)}</span>
                </div>
            `;
        });

        htmlCupom += `
                </div>
                <hr/>
                <div class="flex-between" style="font-size: 14px;">
                    <span>Subtotal:</span>
                    <span>${formatarDinheiro(totais.bruto)}</span>
                </div>
                <div class="flex-between" style="font-size: 14px;">
                    <span>Taxa Serv (10%):</span>
                    <span>${formatarDinheiro(totais.taxa)}</span>
                </div>
                <hr/>
                <div class="flex-between bold" style="font-size: 18px;">
                    <span>TOTAL:</span>
                    <span>${formatarDinheiro(totais.totalGeral)}</span>
                </div>
                <br/>
                <div class="center bold" style="margin-top: 15px;">
                    Obrigado pela preferência!
                </div>
                <div class="center" style="margin-top: 5px; font-size: 10px;">
                    Tecnologia OdevTech
                </div>
            </body>
            </html>
        `;

        janelaImpressao.document.write(htmlCupom);
        janelaImpressao.document.close();
        janelaImpressao.focus();

        // Aguarda meio segundo para renderizar o DOM e chama o print nativo
        setTimeout(() => {
            janelaImpressao.print();
            janelaImpressao.close();
        }, 500);
    };

    const abrirModalPagamento = (comanda) => {
        setComandaSendoPaga(comanda);
        setItensSendoPagos({});
    };

    const alterarItemPagamento = (item, delta) => {
        const qtdJaSelecionada = itensSendoPagos[item.id_produto] || 0;
        const novaQtd = qtdJaSelecionada + delta;
        if (novaQtd >= 0 && novaQtd <= item.qtd_total - item.qtd_paga) {
            setItensSendoPagos({
                ...itensSendoPagos,
                [item.id_produto]: novaQtd,
            });
        }
    };

    const subtotalSelecionado = (comandaSendoPaga?.itens || []).reduce(
        (acc, item) =>
            acc + (itensSendoPagos[item.id_produto] || 0) * item.preco,
        0,
    );
    const totalAPagarAgora = subtotalSelecionado + subtotalSelecionado * 0.1;

    const confirmarPagamento = async (metodo) => {
        if (totalAPagarAgora === 0) return;

        try {
            const itensAtualizados = comandaSendoPaga.itens.map((item) => {
                const qtdPagaAgora = itensSendoPagos[item.id_produto] || 0;
                return { ...item, qtd_paga: item.qtd_paga + qtdPagaAgora };
            });

            const tudoPago =
                itensAtualizados.length > 0 &&
                itensAtualizados.every((i) => i.qtd_paga === i.qtd_total);

            await updateDoc(doc(db, "comandas", comandaSendoPaga.id), {
                itens: itensAtualizados,
                status: tudoPago ? "fechada" : comandaSendoPaga.status,
            });

            alert(
                `Pagamento de ${formatarDinheiro(totalAPagarAgora)} via ${metodo} registado no Firebase!`,
            );
            setComandaSendoPaga(null);
        } catch (error) {
            alert("Erro ao processar o pagamento.");
        }
    };

    const comandasFiltradas = comandas.filter((c) => {
        if (c.status === "fechada") return false;
        if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
        if (
            busca &&
            !c.identificador.toLowerCase().includes(busca.toLowerCase()) &&
            !c.cliente.toLowerCase().includes(busca.toLowerCase())
        )
            return false;
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={20}
                    />
                    <input
                        type="text"
                        placeholder="Buscar por Mesa ou Comanda..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="w-full md:w-auto bg-slate-50 border border-slate-200 py-2.5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium text-slate-700"
                    >
                        <option value="todos">Todas as Ativas</option>
                        <option value="aberta">Consumindo</option>
                        <option value="aguardando_pagamento">
                            Pediu a Conta
                        </option>
                    </select>
                    <button
                        onClick={() => setIsNovaComandaOpen(true)}
                        className="bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-amber-700 transition whitespace-nowrap flex items-center gap-2"
                    >
                        <Plus size={18} /> Nova
                    </button>
                </div>
            </div>

            {comandasFiltradas.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Coffee size={48} className="mb-4 opacity-50" />
                    <p className="font-bold text-lg text-slate-500">
                        Nenhuma comanda ativa.
                    </p>
                    <p className="text-sm">
                        Clique em "Nova" para abrir uma mesa ou comanda.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {comandasFiltradas.map((comanda) => {
                        const totais = calcularTotaisComanda(comanda);
                        return (
                            <div
                                key={comanda.id}
                                className={`bg-white rounded-3xl p-5 border-2 shadow-sm transition-all hover:shadow-md ${comanda.status === "aguardando_pagamento" ? "border-red-400" : "border-slate-100"}`}
                            >
                                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                            {comanda.tipo === "mesa" ? (
                                                <Users
                                                    size={18}
                                                    className="text-slate-400"
                                                />
                                            ) : (
                                                <Receipt
                                                    size={18}
                                                    className="text-slate-400"
                                                />
                                            )}
                                            {comanda.identificador}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium line-clamp-1">
                                            {comanda.cliente}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => transferirMesa(comanda)}
                                        className="text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 p-2 rounded-lg transition"
                                        title="Transferir / Mudar de Mesa"
                                    >
                                        <ArrowRightLeft size={18} />
                                    </button>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">
                                            Consumo:
                                        </span>
                                        <span className="font-bold text-slate-700">
                                            {formatarDinheiro(totais.bruto)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">
                                            Taxa (10%):
                                        </span>
                                        <span className="font-bold text-slate-700">
                                            {formatarDinheiro(totais.taxa)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end pt-2 border-t border-slate-100 mt-2">
                                        <span className="font-bold text-slate-800">
                                            Falta Pagar:
                                        </span>
                                        <span className="font-black text-2xl text-amber-600">
                                            {formatarDinheiro(
                                                totais.saldoDevedor,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() =>
                                                setComandaParaAdicionar(comanda)
                                            }
                                            className="bg-blue-50 text-blue-600 font-bold py-2 rounded-xl hover:bg-blue-100 transition flex justify-center items-center gap-1 text-xs"
                                        >
                                            <Plus size={14} /> Produto
                                        </button>
                                        <button
                                            onClick={() =>
                                                imprimirComanda(comanda)
                                            }
                                            className="bg-slate-100 text-slate-600 font-bold py-2 rounded-xl hover:bg-slate-200 transition flex justify-center items-center gap-1 text-xs"
                                        >
                                            <Printer size={14} /> Imprimir
                                        </button>
                                    </div>
                                    <button
                                        onClick={() =>
                                            abrirModalPagamento(comanda)
                                        }
                                        disabled={totais.saldoDevedor === 0}
                                        className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl hover:bg-amber-700 transition flex justify-center items-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        <Banknote size={16} /> Receber Conta
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isNovaComandaOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">
                                Abrir Nova Venda
                            </h2>
                            <button
                                onClick={() => setIsNovaComandaOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={criarNovaComanda} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={formNovaComanda.tipo}
                                    onChange={(e) =>
                                        setFormNovaComanda({
                                            ...formNovaComanda,
                                            tipo: e.target.value,
                                        })
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 outline-none"
                                >
                                    <option value="mesa">Mesa (Salão)</option>
                                    <option value="comanda">
                                        Comanda Individual (Balcão)
                                    </option>
                                    <option value="vip">
                                        Cliente VIP (Conta Corrente)
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Identificador *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Mesa 05 ou Comanda 102"
                                    value={formNovaComanda.identificador}
                                    onChange={(e) =>
                                        setFormNovaComanda({
                                            ...formNovaComanda,
                                            identificador: e.target.value,
                                        })
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Nome do Cliente (Opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Para facilitar a identificação"
                                    value={formNovaComanda.cliente}
                                    onChange={(e) =>
                                        setFormNovaComanda({
                                            ...formNovaComanda,
                                            cliente: e.target.value,
                                        })
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-amber-600 text-white font-bold py-4 rounded-xl hover:bg-amber-700 transition mt-2"
                            >
                                Confirmar Abertura
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {comandaParaAdicionar && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl overflow-visible">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <ShoppingBag className="text-blue-500" /> Lançar
                                Produto
                            </h2>
                            <button
                                onClick={() => setComandaParaAdicionar(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Lançando na{" "}
                            <b>{comandaParaAdicionar.identificador}</b>
                        </p>
                        <form
                            onSubmit={adicionarItemNaComanda}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Selecione o Produto do Menu
                                </label>
                                <select
                                    required
                                    value={formNovoItem.produtoId}
                                    onChange={(e) =>
                                        setFormNovoItem({
                                            ...formNovoItem,
                                            produtoId: e.target.value,
                                        })
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                                >
                                    <option value="" disabled>
                                        -- Escolha um produto --
                                    </option>
                                    {produtosMenu.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nome} -{" "}
                                            {formatarDinheiro(p.preco)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Quantidade
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={formNovoItem.quantidade}
                                    onChange={(e) =>
                                        setFormNovoItem({
                                            ...formNovoItem,
                                            quantidade: e.target.value,
                                        })
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!formNovoItem.produtoId}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition mt-2 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                <Plus size={20} /> Adicionar à Conta
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {comandaSendoPaga && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl h-[85vh] md:h-auto">
                        <div className="w-full md:w-3/5 bg-slate-50 flex flex-col border-r border-slate-200">
                            <div className="p-6 border-b border-slate-200 bg-white">
                                <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                    <Receipt className="text-amber-600" />{" "}
                                    Dividir Conta:{" "}
                                    {comandaSendoPaga.identificador}
                                </h2>
                            </div>
                            <div className="p-6 space-y-3 overflow-y-auto flex-1">
                                {comandaSendoPaga.itens.length === 0 && (
                                    <p className="text-slate-400 text-center p-4">
                                        Comanda vazia.
                                    </p>
                                )}
                                {(comandaSendoPaga.itens || []).map((item) => {
                                    const qtdRestante =
                                        item.qtd_total - item.qtd_paga;
                                    const qtdSelecionada =
                                        itensSendoPagos[item.id_produto] || 0;
                                    if (qtdRestante === 0) return null;
                                    return (
                                        <div
                                            key={item.id_produto}
                                            className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${qtdSelecionada > 0 ? "bg-white border-amber-400 shadow-sm" : "border-slate-200"}`}
                                        >
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    {item.nome}
                                                </p>
                                                <p className="text-sm text-slate-500 font-medium">
                                                    {formatarDinheiro(
                                                        item.preco,
                                                    )}
                                                    /cada •{" "}
                                                    <span className="text-amber-600">
                                                        Faltam: {qtdRestante}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-xl">
                                                <button
                                                    onClick={() =>
                                                        alterarItemPagamento(
                                                            item,
                                                            -1,
                                                        )
                                                    }
                                                    className="w-8 h-8 rounded-lg bg-white text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50"
                                                    disabled={
                                                        qtdSelecionada === 0
                                                    }
                                                >
                                                    -
                                                </button>
                                                <span className="font-black text-amber-600 w-4 text-center">
                                                    {qtdSelecionada}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        alterarItemPagamento(
                                                            item,
                                                            1,
                                                        )
                                                    }
                                                    className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 disabled:opacity-50"
                                                    disabled={
                                                        qtdSelecionada ===
                                                        qtdRestante
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="w-full md:w-2/5 bg-white flex flex-col relative p-8">
                            <button
                                onClick={() => setComandaSendoPaga(null)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-6">
                                Resumo Deste Pagamento
                            </h3>
                            <div className="flex justify-between items-end pt-4 mb-8">
                                <span className="font-black text-slate-800 text-xl">
                                    Total:
                                </span>
                                <span className="font-black text-4xl text-emerald-600">
                                    {formatarDinheiro(totalAPagarAgora)}
                                </span>
                            </div>
                            <button
                                disabled={totalAPagarAgora === 0}
                                onClick={() => confirmarPagamento("Cartão")}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 mb-3 disabled:opacity-50"
                            >
                                <CreditCard size={20} className="inline mr-2" />{" "}
                                Cartão
                            </button>
                            <button
                                disabled={totalAPagarAgora === 0}
                                onClick={() => confirmarPagamento("Pix")}
                                className="w-full bg-emerald-100 text-emerald-800 font-bold py-4 rounded-xl hover:bg-emerald-200 disabled:opacity-50"
                            >
                                <Banknote size={20} className="inline mr-2" />{" "}
                                Pix / Dinheiro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
