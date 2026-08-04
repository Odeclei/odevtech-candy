// src/components/admin/AbaPDVTickets.jsx
import React, { useState, useEffect, useRef } from "react";
import { ticketService } from "../../services/ticketService";
import {
    Receipt,
    Printer,
    QrCode,
    Plus,
    Minus,
    Trash2,
    Loader2,
} from "lucide-react";
import {
    collection,
    addDoc, // ✅ ADICIONADO
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { escapeHtml } from "../../utils/sanitize";

export default function AbaPDVTickets({ nomeDaLoja }) {
    const [eventos, setEventos] = useState([]);
    const [eventoSelecionado, setEventoSelecionado] = useState("");
    const [eventoAtual, setEventoAtual] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [carrinho, setCarrinho] = useState([]);
    const [clienteNome, setClienteNome] = useState("");
    const [clienteTelefone, setClienteTelefone] = useState("");
    const [ultimoTicket, setUltimoTicket] = useState(null);
    const [processando, setProcessando] = useState(false);
    const [totalTicketsImpressos, setTotalTicketsImpressos] = useState(0);
    const barcodeCanvasRef = useRef(null);

    useEffect(() => {
        if (!nomeDaLoja) return;

        const unsubEventos = onSnapshot(
            query(collection(db, "eventos"), where("loja", "==", nomeDaLoja)),
            (snap) => {
                const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setEventos(lista.filter((e) => e.ativo));
            },
        );

        const unsubProdutos = onSnapshot(
            query(
                collection(db, "produtos"),
                where("loja", "==", nomeDaLoja),
                where("ativo", "==", true),
            ),
            (snap) => {
                setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
        );

        return () => {
            unsubEventos();
            unsubProdutos();
        };
    }, [nomeDaLoja]);

    useEffect(() => {
        if (eventoSelecionado) {
            const ev = eventos.find((e) => e.id === eventoSelecionado);
            setEventoAtual(ev || null);
        } else {
            setEventoAtual(null);
        }
    }, [eventoSelecionado, eventos]);

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);

    const gerarCodigoTicket = () => {
        return `TICKET-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    };

    // ==========================================
    // GERAR CÓDIGO DE BARRAS (Code128) em Canvas
    // ==========================================
    const gerarBarcodeDataUrl = (codigo) => {
        const canvas = document.createElement("canvas");
        canvas.width = 350;
        canvas.height = 80;
        try {
            JsBarcode(canvas, codigo, {
                format: "CODE128",
                width: 1.5,
                height: 50,
                displayValue: true,
                fontSize: 16,
                font: "monospace",
                textAlign: "center",
                textPosition: "bottom",
                textMargin: 2,
                margin: 5,
                background: "#ffffff",
                lineColor: "#000000",
            });
            return canvas.toDataURL("image/png");
        } catch (error) {
            console.error("Erro ao gerar código de barras:", error);
            return null;
        }
    };

    // ==========================================
    // IMPRESSÃO ÚNICA COM MÚLTIPLOS TICKETS
    // ==========================================
    const imprimirMultiplosTickets = async (listaTickets, tipoLeitura) => {
        if (listaTickets.length === 0) return;
        const eh = escapeHtml;

        try {
            const ticketsPreparados = await Promise.all(
                listaTickets.map(async (ticket) => {
                    let codigoVisual = null;
                    let tipoCodigo = "texto";

                    if (tipoLeitura === "celular") {
                        const qrDataUrl = await QRCode.toDataURL(
                            ticket.codigo,
                            {
                                width: 120,
                                margin: 1,
                                errorCorrectionLevel: "H",
                            },
                        );
                        codigoVisual = qrDataUrl;
                        tipoCodigo = "qr";
                    } else if (
                        tipoLeitura === "leitor_fixo" ||
                        tipoLeitura === "outro_leitor"
                    ) {
                        const barcodeDataUrl = gerarBarcodeDataUrl(
                            ticket.codigo,
                        );
                        if (barcodeDataUrl) {
                            codigoVisual = barcodeDataUrl;
                            tipoCodigo = "barcode";
                        } else {
                            codigoVisual = ticket.codigo;
                            tipoCodigo = "texto";
                        }
                    } else {
                        codigoVisual = ticket.codigo;
                        tipoCodigo = "texto";
                    }

                    return { ...ticket, codigoVisual, tipoCodigo };
                }),
            );

            let htmlConteudo = "";
            ticketsPreparados.forEach((ticket, index) => {
                const {
                    titulo,
                    itens,
                    total,
                    codigo,
                    data,
                    evento,
                    cliente,
                    codigoVisual,
                    tipoCodigo,
                } = ticket;

                const itensHtml = itens
                    .map(
                        (item) => `
                            <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0;">
                                <span>${item.quantidade}x ${eh(item.nome)}</span>
                            </div>
                        `,
                    )
                    .join("");

                let codigoHtml = "";
                if (tipoCodigo === "qr") {
                    codigoHtml = `
                        <div style="text-align: center; margin: 4px 0;">
                            <img src="${codigoVisual}" style="width: 32mm; height: 32mm;" />
                            <div style="font-size: 10px; font-weight: bold; letter-spacing: 1px; margin-top: 2px;">${codigo}</div>
                        </div>
                    `;
                } else if (tipoCodigo === "barcode") {
                    codigoHtml = `
                        <div style="text-align: center; margin: 3px 0;">
                            <img src="${codigoVisual}" style="width: 100%; max-width: 54mm; height: auto;" />
                        </div>
                    `;
                } else {
                    codigoHtml = `
                        <div style="text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 1px; margin: 4px 0; background: #f5f5f5; padding: 2px 4px; border: 1px dashed #999;">
                            ${codigo}
                        </div>
                    `;
                }

                htmlConteudo += `
                    <div style="page-break-after: always; padding: 2mm 3mm; font-family: 'Courier New', monospace; width: 58mm; margin: 0 auto; font-size: 11px;">
                        <div style="text-align: center; font-weight: bold; font-size: 14px;">${eh(titulo)}</div>
                        <div style="text-align: center; font-size: 10px;">${eh(evento)}</div>
                        ${cliente ? `<div style="text-align: center; font-size: 10px;">${eh(cliente)}</div>` : ""}
                        <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
                        <div style="font-size: 10px;"><span style="font-weight: bold;">Data:</span> ${eh(data)}</div>
                        <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
                        <div style="text-align: center; font-weight: bold; font-size: 14px;">${itensHtml}</div>
                        ${codigoHtml}
                        <div style="text-align: center; font-size: 9px; margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 4px;">
                            Obrigado! ${eh(nomeDaLoja)}
                        </div>
                        <div style="text-align: center; font-size: 7px; margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 4px;">
                            Desenvolvido por OdevTech.
                        </div>
                    </div>
                `;
            });

            const htmlCompleto = `
                <html>
                <head>
                    <title>Impressão de Tickets</title>
                    <style>
                        @page { margin: 0; size: 58mm auto; }
                        body { margin: 0; padding: 0; background: #fff; }
                        * { box-sizing: border-box; }
                    </style>
                </head>
                <body>
                    ${htmlConteudo}
                </body>
                </html>
            `;

            const janela = window.open("", "", "width=320,height=600");
            if (!janela) {
                alert(
                    "⚠️ Pop-up bloqueado! Permita pop-ups para esta página e tente novamente.",
                );
                return;
            }

            janela.document.write(htmlCompleto);
            janela.document.close();
            janela.focus();

            setTimeout(() => {
                janela.print();
                janela.close();
            }, 600);

            setTotalTicketsImpressos(listaTickets.length);
        } catch (error) {
            console.error("Erro na impressão:", error);
            alert("Erro ao gerar tickets: " + error.message);
        }
    };

    // ==========================================
    // TESTE DE IMPRESSÃO
    // ==========================================
    const imprimirTeste = async () => {
        const hoje = new Date();
        const ticketExemplo = {
            titulo: "🧪 TESTE",
            itens: [
                { nome: "Produto Teste", quantidade: 1, preco: 10.0 },
                { nome: "Outro Item", quantidade: 2, preco: 5.5 },
            ],
            total: 21.0,
            codigo: "TESTE-001",
            data: hoje.toLocaleString("pt-BR"),
            evento: "Evento de Teste",
            cliente: "Cliente Teste",
        };
        await imprimirMultiplosTickets([ticketExemplo], "leitor_fixo");
    };

    // ==========================================
    // FUNÇÕES DO CARRINHO
    // ==========================================
    const adicionarProduto = (produto) => {
        setCarrinho((prev) => {
            const existente = prev.find((item) => item.id === produto.id);
            if (existente) {
                return prev.map((item) =>
                    item.id === produto.id
                        ? { ...item, quantidade: item.quantidade + 1 }
                        : item,
                );
            } else {
                return [
                    ...prev,
                    {
                        id: produto.id,
                        nome: produto.nome,
                        preco: produto.preco,
                        quantidade: 1,
                    },
                ];
            }
        });
    };

    const removerProduto = (id) => {
        setCarrinho((prev) => prev.filter((item) => item.id !== id));
    };

    const alterarQuantidade = (id, delta) => {
        setCarrinho((prev) =>
            prev
                .map((item) =>
                    item.id === id
                        ? {
                              ...item,
                              quantidade: Math.max(1, item.quantidade + delta),
                          }
                        : item,
                )
                .filter((item) => item.quantidade > 0),
        );
    };

    const totalCarrinho = carrinho.reduce(
        (acc, item) => acc + item.preco * item.quantidade,
        0,
    );

    const totalUnidades = carrinho.reduce(
        (acc, item) => acc + item.quantidade,
        0,
    );

    // ==========================================
    // FINALIZAR VENDA – COM CRIAÇÃO DE PEDIDO
    // ==========================================
    const finalizarVenda = async () => {
        if (!eventoAtual) return alert("Selecione um evento.");
        if (carrinho.length === 0)
            return alert("Adicione pelo menos um produto.");
        if (totalCarrinho <= 0) return alert("Valor total inválido.");

        setProcessando(true);

        try {
            const hoje = new Date();
            let dataValidade = new Date(hoje);
            if (!eventoAtual.validadeDiaria) {
                dataValidade = new Date(eventoAtual.dataFim);
            }

            // 1. Ticket mãe
            const codigoMae = gerarCodigoTicket();
            const ticketMae = {
                codigo: codigoMae,
                eventoId: eventoAtual.id,
                eventoNome: eventoAtual.nome,
                loja: nomeDaLoja,
                valorPago: totalCarrinho,
                saldo: totalCarrinho,
                itensConsumidos: [],
                clienteNome: clienteNome || "",
                clienteTelefone: clienteTelefone || "",
                dataVenda: hoje.toISOString(),
                dataValidade: dataValidade.toISOString(),
                validadeDiaria: eventoAtual.validadeDiaria,
                itensVendidos: carrinho.map((item) => ({
                    id: item.id,
                    nome: item.nome,
                    preco: item.preco,
                    quantidade: item.quantidade,
                })),
            };

            const refMae = await ticketService.criarTicket(ticketMae);
            const ticketMaeId = refMae.id;
            setUltimoTicket({ id: ticketMaeId, ...ticketMae });

            // ==========================================
            // ✅ 2. CRIAR PEDIDO PARA O DASHBOARD
            // ==========================================
            await addDoc(collection(db, "pedidos"), {
                loja: nomeDaLoja,
                cliente: clienteNome || `Ticket ${codigoMae}`,
                origem: "ticket", // Identifica a origem no dashboard
                telefone: clienteTelefone || "",
                itens: carrinho.map((item) => ({
                    id: item.id,
                    nome: item.nome,
                    preco: item.preco,
                    quantidade: item.quantidade,
                    qtd_total: item.quantidade,
                })),
                valorTotal: totalCarrinho,
                status: "entregue", // Já foi pago e consumido
                criadoEm: hoje.toISOString(),
                dataEntrega: hoje.toISOString(),
                temEncomenda: false,
                ticketMaeId: ticketMaeId,
            });

            // 3. Preparar lista de tickets para impressão
            const ticketsParaImprimir = [];

            if (eventoAtual.imprimirTickets) {
                for (const item of carrinho) {
                    for (let i = 0; i < item.quantidade; i++) {
                        const codigo = gerarCodigoTicket();
                        const ticketInd = {
                            codigo,
                            eventoId: eventoAtual.id,
                            loja: nomeDaLoja,
                            valorPago: item.preco,
                            saldo: item.preco,
                            itensConsumidos: [],
                            clienteNome: clienteNome || "",
                            clienteTelefone: clienteTelefone || "",
                            dataVenda: hoje.toISOString(),
                            dataValidade: dataValidade.toISOString(),
                            validadeDiaria: eventoAtual.validadeDiaria,
                            ticketMaeId: ticketMaeId,
                            itemNome: item.nome,
                            itemPreco: item.preco,
                            produtoId: item.id,
                            isIndividual: true,
                        };
                        await ticketService.criarTicket(ticketInd);

                        ticketsParaImprimir.push({
                            titulo: `TICKET ${i + 1}/${item.quantidade}`,
                            itens: [
                                {
                                    nome: item.nome,
                                    quantidade: 1,
                                    preco: item.preco,
                                },
                            ],
                            total: item.preco,
                            codigo: codigo,
                            data: hoje.toLocaleString("pt-BR"),
                            evento: eventoAtual.nome,
                            cliente: clienteNome,
                        });
                    }
                }
                // Resumo do pedido
                ticketsParaImprimir.push({
                    titulo: "RESUMO",
                    itens: carrinho,
                    total: totalCarrinho,
                    codigo: codigoMae,
                    data: hoje.toLocaleString("pt-BR"),
                    evento: eventoAtual.nome,
                    cliente: clienteNome,
                });
            } else {
                ticketsParaImprimir.push({
                    titulo: "TICKET",
                    itens: carrinho,
                    total: totalCarrinho,
                    codigo: codigoMae,
                    data: hoje.toLocaleString("pt-BR"),
                    evento: eventoAtual.nome,
                    cliente: clienteNome,
                });
            }

            // 4. Imprimir com o tipo de leitura do evento
            await imprimirMultiplosTickets(
                ticketsParaImprimir,
                eventoAtual.tipoLeitura,
            );

            // 5. Atualizar estatísticas do evento
            await updateDoc(doc(db, "eventos", eventoAtual.id), {
                qtdTicketsVendidos: (eventoAtual.qtdTicketsVendidos || 0) + 1,
                valorTotalTickets:
                    (eventoAtual.valorTotalTickets || 0) + totalCarrinho,
            });

            // 6. Limpar carrinho
            setCarrinho([]);
            setClienteNome("");
            setClienteTelefone("");

            alert(
                `✅ Venda finalizada!\nTicket mãe: ${codigoMae}\nTotal de tickets: ${ticketsParaImprimir.length}`,
            );
        } catch (error) {
            console.error("Erro ao finalizar venda:", error);
            alert("Erro ao finalizar: " + error.message);
        } finally {
            setProcessando(false);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Receipt size={24} /> PDV - Venda de Tickets
                </h2>
                <button
                    onClick={imprimirTeste}
                    disabled={processando}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                >
                    <Printer size={18} /> Testar Impressora
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* COLUNA 1 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600">
                            Evento
                        </label>
                        <select
                            value={eventoSelecionado}
                            onChange={(e) =>
                                setEventoSelecionado(e.target.value)
                            }
                            className="w-full border p-2.5 rounded-xl text-sm"
                            required
                        >
                            <option value="">Selecione...</option>
                            {eventos.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600">
                            Cliente
                        </label>
                        <input
                            type="text"
                            value={clienteNome}
                            onChange={(e) => setClienteNome(e.target.value)}
                            className="w-full border p-2.5 rounded-xl text-sm"
                            placeholder="Opcional"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            value={clienteTelefone}
                            onChange={(e) => setClienteTelefone(e.target.value)}
                            className="w-full border p-2.5 rounded-xl text-sm"
                            placeholder="Opcional"
                        />
                    </div>

                    {eventoAtual && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                            <p className="font-bold">Configurações:</p>
                            <p>
                                <span className="font-medium">Validade:</span>{" "}
                                {eventoAtual.validadeDiaria
                                    ? "Diária"
                                    : "Evento inteiro"}
                            </p>
                            <p>
                                <span className="font-medium">Impressão:</span>{" "}
                                {eventoAtual.imprimirTickets
                                    ? "✅ Individual"
                                    : "Resumo"}
                            </p>
                            <p>
                                <span className="font-medium">Leitura:</span>{" "}
                                {eventoAtual.tipoLeitura === "leitor_fixo" &&
                                    "Leitor Fixo"}
                                {eventoAtual.tipoLeitura === "outro_leitor" &&
                                    "Outro Leitor"}
                                {eventoAtual.tipoLeitura === "celular" &&
                                    "Celular (QR Code)"}
                            </p>
                        </div>
                    )}

                    {eventoAtual?.imprimirTickets && carrinho.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-center">
                            <p className="text-sm font-bold text-indigo-700">
                                {totalUnidades} tickets individuais
                            </p>
                            <p className="text-xs text-indigo-500">
                                + 1 resumo
                            </p>
                        </div>
                    )}
                </div>

                {/* COLUNA 2 e 3: Produtos */}
                <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-3">Produtos</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                        {produtos
                            .sort((a, b) =>
                                a.nome?.localeCompare(b.nome, "pt-BR", {
                                    sensitivity: "base",
                                }),
                            )
                            .map((prod) => (
                            <button
                                key={prod.id}
                                onClick={() => adicionarProduto(prod)}
                                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-left"
                            >
                                <div>
                                    <p className="font-bold text-sm">
                                        {prod.nome}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatarDinheiro(prod.preco)}
                                    </p>
                                </div>
                                <Plus size={18} className="text-indigo-600" />
                            </button>
                        ))}
                        {produtos.length === 0 && (
                            <p className="col-span-2 text-slate-400 text-center py-8">
                                Nenhum produto ativo.
                            </p>
                        )}
                    </div>
                </div>

                {/* COLUNA 4: Carrinho */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center justify-between">
                        <span>Carrinho</span>
                        <span className="text-sm font-normal text-slate-500">
                            {totalUnidades} unid.
                        </span>
                    </h3>

                    <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto">
                        {carrinho.length === 0 ? (
                            <p className="text-slate-400 text-center py-8 text-sm">
                                Carrinho vazio.
                            </p>
                        ) : (
                            carrinho.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">
                                            {item.nome}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatarDinheiro(item.preco)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(item.id, -1)
                                            }
                                            className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 disabled:opacity-30"
                                            disabled={item.quantidade <= 1}
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="font-bold w-5 text-center text-sm">
                                            {item.quantidade}
                                        </span>
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(item.id, 1)
                                            }
                                            className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center hover:bg-indigo-200"
                                        >
                                            <Plus size={12} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                removerProduto(item.id)
                                            }
                                            className="text-red-500 hover:bg-red-50 p-1 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-lg">Total:</span>
                            <span className="font-black text-2xl text-emerald-600">
                                {formatarDinheiro(totalCarrinho)}
                            </span>
                        </div>
                        <button
                            onClick={finalizarVenda}
                            disabled={
                                processando ||
                                carrinho.length === 0 ||
                                !eventoAtual
                            }
                            className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                            {processando ? (
                                <>
                                    <Loader2
                                        size={20}
                                        className="animate-spin"
                                    />{" "}
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <QrCode size={20} /> Finalizar Venda
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Último ticket gerado */}
            {ultimoTicket && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                        <p className="font-black text-slate-800">
                            Último ticket mãe:
                        </p>
                        <p className="font-mono text-lg bg-white px-4 py-2 rounded-lg border">
                            {ultimoTicket.codigo}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Válido até:{" "}
                            {new Date(
                                ultimoTicket.dataValidade,
                            ).toLocaleDateString("pt-BR")}
                            {ultimoTicket.validadeDiaria && " (somente hoje)"}
                        </p>
                        {totalTicketsImpressos > 0 && (
                            <p className="text-xs text-emerald-600 font-bold mt-1">
                                ✅ {totalTicketsImpressos} tickets impressos
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            if (ultimoTicket.itensVendidos) {
                                const hoje = new Date();
                                const ticketResumo = {
                                    titulo: "REIMPRESSÃO",
                                    itens: ultimoTicket.itensVendidos,
                                    total: ultimoTicket.valorPago,
                                    codigo: ultimoTicket.codigo,
                                    data: hoje.toLocaleString("pt-BR"),
                                    evento: eventoAtual?.nome || "Evento",
                                    cliente: ultimoTicket.clienteNome,
                                };
                                imprimirMultiplosTickets(
                                    [ticketResumo],
                                    eventoAtual?.tipoLeitura || "leitor_fixo",
                                );
                            }
                        }}
                        className="bg-slate-800 text-white p-3 rounded-xl hover:bg-slate-700"
                    >
                        <Printer size={24} />
                    </button>
                </div>
            )}
        </div>
    );
}
