import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Search,
    Plus,
    Minus,
    Send,
    Layers,
    X,
    CheckCircle,
    Truck,
    MapPin,
    Loader,
    Banknote,
    ShoppingBag,
    Receipt,
    User,
    FileText,
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    getDoc,
    updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
    buscarCepBrasilAPI,
    calcularDistanciaHaversine,
    calcularFrete,
} from "../../utils/freteUtils";

// =============================================
// 1. HOOK: DADOS DA LOJA + PRODUTOS
// =============================================
function useDadosLancamento(nomeDaLoja) {
    const [configLoja, setConfigLoja] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const unConfig = onSnapshot(doc(db, "lojas", nomeDaLoja), (snap) => {
            if (snap.exists()) setConfigLoja(snap.data());
            setCarregando(false);
        });
        const q = query(
            collection(db, "produtos"),
            where("loja", "==", nomeDaLoja),
            where("ativo", "==", true),
        );
        const unProdutos = onSnapshot(q, (snap) =>
            setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        );
        return () => {
            unConfig();
            unProdutos();
        };
    }, [nomeDaLoja]);

    return { configLoja, produtos, carregando };
}

// =============================================
// 2. HOOK: CARRINHO DE LANÇAMENTO
// =============================================
function useCarrinhoLancamento() {
    const [carrinho, setCarrinho] = useState([]);

    const adicionarProduto = useCallback((produto) => {
        const qtdMin = produto.quantidadeMinima || 0;
        const qtd = qtdMin > 0 ? qtdMin : 1;
        setCarrinho((prev) => {
            const existente = prev.find(
                (i) => i.id === produto.id && !i.isKit,
            );
            if (existente) {
                return prev.map((i) =>
                    i.id === produto.id && !i.isKit
                        ? { ...i, quantidade: i.quantidade + qtd }
                        : i,
                );
            }
            return [
                ...prev,
                {
                    id: produto.id,
                    cartId: Date.now() + Math.random(),
                    nome: produto.nome,
                    preco: produto.precoBase || produto.preco,
                    imagem: produto.imagens?.[0] || produto.imagem,
                    quantidade: qtd,
                    quantidadeMinima: qtdMin,
                    isKit: false,
                    ncm: produto.ncm,
                    cfop: produto.cfop,
                },
            ];
        });
    }, []);

    const adicionarKit = useCallback((kit, subitens, precoFinal) => {
        setCarrinho((prev) => [
            ...prev,
            {
                id: kit.id,
                cartId: Date.now() + Math.random(),
                nome: kit.nome,
                preco: precoFinal,
                imagem: kit.imagens?.[0] || kit.imagem,
                quantidade: 1,
                quantidadeMinima: 0,
                isKit: true,
                subitensSelecionados: subitens,
            },
        ]);
    }, []);

    const alterarQuantidade = useCallback((cartId, delta) => {
        setCarrinho((prev) =>
            prev
                .map((item) => {
                    if (item.cartId === cartId) {
                        const min = item.quantidadeMinima || 0;
                        return {
                            ...item,
                            quantidade: Math.max(
                                min,
                                item.quantidade + delta,
                            ),
                        };
                    }
                    return item;
                })
                .filter((i) => i.quantidade > 0),
        );
    }, []);

    const removerItem = useCallback((cartId) => {
        setCarrinho((prev) => prev.filter((i) => i.cartId !== cartId));
    }, []);

    const limparCarrinho = useCallback(() => setCarrinho([]), []);

    const valorSubtotal = useMemo(
        () =>
            carrinho.reduce(
                (acc, i) => acc + i.preco * i.quantidade,
                0,
            ),
        [carrinho],
    );

    const totalItens = useMemo(
        () => carrinho.reduce((acc, i) => acc + i.quantidade, 0),
        [carrinho],
    );

    return {
        carrinho,
        adicionarProduto,
        adicionarKit,
        alterarQuantidade,
        removerItem,
        limparCarrinho,
        valorSubtotal,
        totalItens,
    };
}

// =============================================
// 3. HOOK: MODAL DE KIT / COMBO
// =============================================
function useModalKit(adicionarKit) {
    const [modalKitAberto, setModalKitAberto] = useState(false);
    const [kitAtivo, setKitAtivo] = useState(null);
    const [selecoesKit, setSelecoesKit] = useState({});

    const abrirModalKit = (produto) => {
        setKitAtivo(produto);
        const inicial = {};
        (produto.kitGroups || []).forEach((g) => {
            inicial[g.id] = {};
        });
        setSelecoesKit(inicial);
        setModalKitAberto(true);
    };

    const alterarQtdSubitem = (grupoId, produtoId, delta, maxGrupo) => {
        setSelecoesKit((prev) => {
            const grupo = prev[grupoId] || {};
            const qtdAtual = grupo[produtoId] || 0;
            const nova = Math.max(0, qtdAtual + delta);
            const total = Object.values(grupo).reduce((a, b) => a + b, 0);
            if (delta > 0 && total >= maxGrupo) return prev;
            return { ...prev, [grupoId]: { ...grupo, [produtoId]: nova } };
        });
    };

    const gruposValidos = kitAtivo?.kitGroups?.every((g) => {
        const total = Object.values(selecoesKit[g.id] || {}).reduce(
            (a, b) => a + b,
            0,
        );
        return total >= g.min && total <= g.max;
    });

    let totalAdicional = 0;
    kitAtivo?.kitGroups?.forEach((g) => {
        g.opcoes?.forEach((op) => {
            const qtd = selecoesKit[g.id]?.[op.produtoId] || 0;
            totalAdicional += (op.adicional || 0) * qtd;
        });
    });
    const precoKit =
        (kitAtivo?.precoBase || kitAtivo?.preco || 0) + totalAdicional;

    const salvarKit = () => {
        if (!gruposValidos) return;
        const subitens = [];
        kitAtivo.kitGroups.forEach((g) => {
            g.opcoes.forEach((op) => {
                const qtd = selecoesKit[g.id]?.[op.produtoId] || 0;
                if (qtd > 0)
                    subitens.push({
                        produtoId: op.produtoId,
                        nome: op.nome,
                        quantidade: qtd,
                        adicional: op.adicional || 0,
                    });
            });
        });
        adicionarKit(kitAtivo, subitens, precoKit);
        setModalKitAberto(false);
    };

    return {
        modalKitAberto,
        setModalKitAberto,
        kitAtivo,
        selecoesKit,
        alterarQtdSubitem,
        gruposValidos,
        precoKit,
        salvarKit,
        abrirModalKit,
    };
}

// =============================================
// 4. COMPONENTE PRINCIPAL
// =============================================
export default function AbaLancamentoDelivery({ nomeDaLoja, clientes = [] }) {
    const { configLoja, produtos, carregando } = useDadosLancamento(nomeDaLoja);
    const {
        carrinho,
        adicionarProduto,
        adicionarKit,
        alterarQuantidade,
        removerItem,
        limparCarrinho,
        valorSubtotal,
        totalItens,
    } = useCarrinhoLancamento();
    const {
        modalKitAberto,
        setModalKitAberto,
        kitAtivo,
        selecoesKit,
        alterarQtdSubitem,
        gruposValidos,
        precoKit,
        salvarKit,
        abrirModalKit,
    } = useModalKit(adicionarKit);

    const [busca, setBusca] = useState("");
    const [categoriaAtiva, setCategoriaAtiva] = useState("");

    // Dados do cliente
    const [nomeCliente, setNomeCliente] = useState("");
    const [telefoneCliente, setTelefoneCliente] = useState("");
    const [cpfCliente, setCpfCliente] = useState("");
    const [cnpjCliente, setCnpjCliente] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState("PF");
    const [buscaCliente, setBuscaCliente] = useState("");
    const [clienteSelecionado, setClienteSelecionado] = useState(null);
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const [dataEntrega, setDataEntrega] = useState("");
    const [tipoEntrega, setTipoEntrega] = useState("entrega");

    // Endereço de entrega
    const [cepCliente, setCepCliente] = useState("");
    const [logradouroCliente, setLogradouroCliente] = useState("");
    const [numeroCliente, setNumeroCliente] = useState("");
    const [complementoCliente, setComplementoCliente] = useState("");
    const [bairroCliente, setBairroCliente] = useState("");
    const [cidadeCliente, setCidadeCliente] = useState("");
    const [ufCliente, setUfCliente] = useState("");
    const [carregandoCep, setCarregandoCep] = useState(false);
    const [cepInvalido, setCepInvalido] = useState(false);
    const [taxaEntrega, setTaxaEntrega] = useState(0);
    const [distanciaKm, setDistanciaKm] = useState(0);
    const [foraRaioEntrega, setForaRaioEntrega] = useState(false);
    const [coordsLoja, setCoordsLoja] = useState(null);

    // Pagamento
    const [formaPagamento, setFormaPagamento] = useState("na_entrega");
    const [trocoPara, setTrocoPara] = useState("");

    const [processando, setProcessando] = useState(false);
    const [pedidoCriado, setPedidoCriado] = useState(null);

    const formatarDinheiro = (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0);

    // Ordenação das categorias (respeita ordemCategorias configurada)
    const categorias = useMemo(() => {
        const lista = [...new Set(produtos.map((p) => p.categoria || "Geral"))];
        const ordem = configLoja?.ordemCategorias || [];
        if (ordem.length === 0) return lista.sort((a, b) => a.localeCompare(b));
        return lista.sort((a, b) => {
            const ia = ordem.indexOf(a);
            const ib = ordem.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
    }, [produtos, configLoja?.ordemCategorias]);

    useEffect(() => {
        if (categorias.length > 0 && !categoriaAtiva)
            setCategoriaAtiva(categorias[0]);
    }, [categorias, categoriaAtiva]);

    // Carregar coordenadas da loja para cálculo de frete
    const carregarCoordsLoja = useCallback(async () => {
        if (!configLoja?.cep) return null;
        const dados = await buscarCepBrasilAPI(configLoja.cep);
        if (dados?.latitude && dados?.longitude) {
            const coords = { lat: dados.latitude, lng: dados.longitude };
            setCoordsLoja(coords);
            return coords;
        }
        return null;
    }, [configLoja?.cep]);

    useEffect(() => {
        carregarCoordsLoja();
    }, [carregarCoordsLoja]);

    useEffect(() => {
        if (tipoEntrega === "retirada") {
            setTaxaEntrega(0);
            setDistanciaKm(0);
            setForaRaioEntrega(false);
        }
    }, [tipoEntrega]);

    const handleCepChange = useCallback((value) => {
        const digitos = value.replace(/\D/g, "");
        const formatado = digitos.replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
        setCepCliente(formatado);
        if (digitos.length === 8) setCepInvalido(false);
    }, []);

    const handleCepBlur = useCallback(
        async (cepValue) => {
            const digitos = (cepValue || "").replace(/\D/g, "");
            if (digitos.length !== 8) return;
            setCarregandoCep(true);
            setCepInvalido(false);
            const dados = await buscarCepBrasilAPI(cepValue);
            if (!dados) {
                setCepInvalido(true);
                setCarregandoCep(false);
                return;
            }
            setLogradouroCliente(dados.logradouro);
            setBairroCliente(dados.bairro);
            setCidadeCliente(dados.cidade);
            setUfCliente(dados.uf);
            setCepInvalido(false);

            let coords = coordsLoja;
            if (!coords) coords = await carregarCoordsLoja();
            if (coords && dados.latitude && dados.longitude) {
                const dist = calcularDistanciaHaversine(
                    coords.lat,
                    coords.lng,
                    dados.latitude,
                    dados.longitude,
                );
                setDistanciaKm(dist);
                const faixas = configLoja?.faixasEntrega || [];
                const { valor, foraRaio } = calcularFrete(dist, faixas);
                setTaxaEntrega(valor);
                setForaRaioEntrega(foraRaio);
            } else {
                setTaxaEntrega(0);
                setDistanciaKm(0);
                setForaRaioEntrega(false);
            }
            setCarregandoCep(false);
        },
        [coordsLoja, configLoja?.faixasEntrega, carregarCoordsLoja],
    );

    // =============================================
    // AUTOCOMPLETE DE CLIENTE CADASTRADO
    // =============================================
    const clientesFiltrados = useMemo(() => {
        if (!buscaCliente || buscaCliente.length < 2) return [];
        const termo = buscaCliente.toLowerCase();
        return (clientes || []).filter(
            (c) =>
                c.nome?.toLowerCase().includes(termo) ||
                c.telefone?.includes(termo) ||
                c.documento?.includes(termo) ||
                c.cpf?.includes(termo),
        );
    }, [buscaCliente, clientes]);

    const selecionarCliente = (cliente) => {
        setClienteSelecionado(cliente);
        setBuscaCliente(cliente.nome || "");
        setMostrarDropdown(false);
        const isPJ = cliente.tipo === "PJ";
        setTipoDocumento(isPJ ? "PJ" : "PF");

        let endereco = cliente.endereco;
        if (typeof endereco === "string") {
            endereco = {
                logradouro: endereco,
                numero: "",
                bairro: "",
                cidade: "",
                estado: "",
                cep: "",
            };
        }
        endereco = endereco || {};

        setNomeCliente(cliente.nome || "");
        setTelefoneCliente(cliente.telefone || "");
        setCpfCliente(cliente.documento && !isPJ ? cliente.documento : "");
        setCnpjCliente(cliente.documento && isPJ ? cliente.documento : "");
        setCepCliente(endereco.cep || "");
        setLogradouroCliente(endereco.logradouro || "");
        setNumeroCliente(endereco.numero || "");
        setComplementoCliente(endereco.complemento || "");
        setBairroCliente(endereco.bairro || "");
        setCidadeCliente(endereco.cidade || "");
        setUfCliente(endereco.estado || endereco.uf || "");

        const digitos = (endereco.cep || "").replace(/\D/g, "");
        if (digitos.length === 8) {
            setTimeout(() => handleCepBlur(endereco.cep), 50);
        }
    };

    const limparCliente = () => {
        setClienteSelecionado(null);
        setBuscaCliente("");
        setMostrarDropdown(false);
        setTipoDocumento("PF");
        setCnpjCliente("");
    };

    const enderecoEntrega =
        tipoEntrega === "entrega"
            ? {
                  cep: cepCliente,
                  logradouro: logradouroCliente,
                  numero: numeroCliente,
                  bairro: bairroCliente,
                  cidade: cidadeCliente,
                  uf: ufCliente,
                  complemento: complementoCliente,
              }
            : null;

    const percSinal = useMemo(() => {
        if (formaPagamento !== "pix") return 0;
        return configLoja?.percSinal !== undefined
            ? Number(configLoja.percSinal)
            : 0;
    }, [formaPagamento, configLoja?.percSinal]);

    const valorTotalComFrete =
        valorSubtotal + (tipoEntrega === "entrega" ? taxaEntrega : 0);
    const valorSinal = (valorTotalComFrete * percSinal) / 100;

    // =============================================
    // VERIFICAÇÃO E BAIXA DE ESTOQUE
    // =============================================
    const baixarEstoque = async (item) => {
        const processarBaixa = async (produtoId, qtdDescontar) => {
            const pRef = doc(db, "produtos", produtoId);
            const pSnap = await getDoc(pRef);
            if (!pSnap.exists()) return;
            const pDB = pSnap.data();
            if (pDB.fichaTecnica && pDB.fichaTecnica.length > 0) {
                for (const ing of pDB.fichaTecnica) {
                    const iRef = doc(db, "produtos", ing.id_insumo);
                    const iSnap = await getDoc(iRef);
                    if (iSnap.exists()) {
                        const novoE =
                            (iSnap.data().estoqueAtual || 0) -
                            ing.quantidade * qtdDescontar;
                        await updateDoc(iRef, { estoqueAtual: novoE });
                    }
                }
            } else if (pDB.controlarEstoque !== false) {
                const novoE = (pDB.estoqueAtual || 0) - qtdDescontar;
                await updateDoc(pRef, { estoqueAtual: novoE });
            }
        };

        if (item.isKit) {
            for (const sub of item.subitensSelecionados || []) {
                await processarBaixa(
                    sub.produtoId,
                    sub.quantidade * item.quantidade,
                );
            }
        } else {
            await processarBaixa(item.id, item.quantidade);
        }
    };

    // =============================================
    // ENVIAR PEDIDO
    // =============================================
    const enviarPedido = async () => {
        if (carrinho.length === 0)
            return alert("Adicione pelo menos um item ao pedido.");
        if (!nomeCliente.trim() || !telefoneCliente.trim())
            return alert("Preencha o nome e o WhatsApp do cliente.");
        if (tipoDocumento === "PJ" && !cnpjCliente.trim())
            return alert("Preencha o CNPJ do cliente.");
        if (
            tipoEntrega === "entrega" &&
            (!cepCliente ||
                !logradouroCliente ||
                !numeroCliente ||
                !bairroCliente ||
                !cidadeCliente ||
                !ufCliente)
        )
            return alert(
                "Preencha o endereço completo de entrega (CEP, logradouro, número, bairro, cidade e UF).",
            );
        if (tipoEntrega === "entrega" && foraRaioEntrega)
            return alert(
                "O CEP informado está fora do raio de entrega. Negocie o frete com o cliente.",
            );

        setProcessando(true);
        let itensSemStock = [];

        // Verificação de estoque
        for (const item of carrinho) {
            const verificar = async (produto, qtdMult) => {
                if (produto.fichaTecnica?.length) {
                    for (const ing of produto.fichaTecnica) {
                        const insSnap = await getDoc(
                            doc(db, "produtos", ing.id_insumo),
                        );
                        if (
                            insSnap.exists() &&
                            (insSnap.data().estoqueAtual || 0) <
                                ing.quantidade * qtdMult
                        ) {
                            if (!itensSemStock.includes(produto.nome))
                                itensSemStock.push(produto.nome);
                        }
                    }
                } else if (produto.controlarEstoque !== false) {
                    if ((produto.estoqueAtual || 0) < qtdMult) {
                        if (!itensSemStock.includes(produto.nome))
                            itensSemStock.push(produto.nome);
                    }
                }
            };

            if (item.isKit) {
                for (const sub of item.subitensSelecionados || []) {
                    const pInfo = produtos.find(
                        (p) => p.id === sub.produtoId,
                    );
                    if (pInfo)
                        await verificar(
                            pInfo,
                            sub.quantidade * item.quantidade,
                        );
                }
            } else {
                const pInfo = produtos.find((p) => p.id === item.id);
                if (pInfo) await verificar(pInfo, item.quantidade);
            }
        }

        let isEncomenda = false;
        if (itensSemStock.length > 0) {
            const prosseguir = window.confirm(
                `⚠️ Atenção!\n\nStock insuficiente para:\n- ${itensSemStock.join("\n- ")}\n\nDeseja lançar o pedido como ENCOMENDA mesmo assim?`,
            );
            if (!prosseguir) {
                setProcessando(false);
                return;
            }
            isEncomenda = true;
        }

        try {
            const status =
                valorSinal > 0 ? "aguardando_pix" : "agendado";

            const novoPedido = {
                loja: nomeDaLoja,
                cliente: nomeCliente.trim(),
                telefone: telefoneCliente.trim(),
                cpf: tipoDocumento === "PF" ? cpfCliente.trim() : "",
                cnpj: tipoDocumento === "PJ" ? cnpjCliente.trim() : "",
                tipoDocumento,
                origem: "operador",
                itens: carrinho.map((i) => {
                    const base = {
                        id: i.id,
                        nome: i.nome,
                        preco: i.preco,
                        quantidade: i.quantidade,
                        qtd_total: i.quantidade,
                        isKit: i.isKit || false,
                        imagem: i.imagem || "",
                    };
                    if (i.isKit) base.subitensSelecionados = i.subitensSelecionados;
                    if (!i.isKit) {
                        base.ncm = i.ncm;
                        base.cfop = i.cfop;
                    }
                    return base;
                }),
                valorTotal: valorTotalComFrete,
                valorSubtotal,
                valorSinal,
                tipoEntrega,
                enderecoEntrega,
                taxaEntrega: tipoEntrega === "entrega" ? taxaEntrega : 0,
                distanciaKm:
                    tipoEntrega === "entrega" ? distanciaKm : 0,
                dataEntrega,
                formaPagamento,
                trocoPara:
                    formaPagamento === "dinheiro" ? trocoPara.trim() : "",
                status,
                temEncomenda: isEncomenda,
                criadoEm: new Date().toISOString(),
            };

            const ref = await addDoc(collection(db, "pedidos"), novoPedido);

            // Baixa de estoque
            for (const item of carrinho) await baixarEstoque(item);

            setPedidoCriado({
                id: ref.id,
                ...novoPedido,
            });
            limparCarrinho();
            setNomeCliente("");
            setTelefoneCliente("");
            setCpfCliente("");
            setCnpjCliente("");
            setTipoDocumento("PF");
            setBuscaCliente("");
            setClienteSelecionado(null);
            setMostrarDropdown(false);
            setDataEntrega("");
            setCepCliente("");
            setLogradouroCliente("");
            setNumeroCliente("");
            setComplementoCliente("");
            setBairroCliente("");
            setCidadeCliente("");
            setUfCliente("");
            setTaxaEntrega(0);
            setDistanciaKm(0);
            setForaRaioEntrega(false);
            setFormaPagamento("na_entrega");
            setTrocoPara("");
        } catch (e) {
            console.error(e);
            alert("Erro ao lançar o pedido.");
        } finally {
            setProcessando(false);
        }
    };

    if (carregando || !configLoja) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader className="animate-spin mb-4" size={32} />
                <p>A carregar cardápio...</p>
            </div>
        );
    }

    const produtosFiltrados = busca
        ? produtos.filter(
              (p) =>
                  p.nome.toLowerCase().includes(busca.toLowerCase()) ||
                  (p.descricao || "")
                      .toLowerCase()
                      .includes(busca.toLowerCase()),
          )
        : produtos.filter(
              (p) => (p.categoria || "Geral") === categoriaAtiva,
          );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 items-start">
            {/* ============================= */}
            {/* COLUNA 1-2: SELEÇÃO DE PRODUTOS */}
            {/* ============================= */}
            <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={20}
                    />
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-400 outline-none font-medium"
                    />
                </div>

                {!busca && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {categorias.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategoriaAtiva(cat)}
                                className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${categoriaAtiva === cat ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
                    {produtosFiltrados.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <ShoppingBag
                                size={40}
                                className="mx-auto mb-3 opacity-50"
                            />
                            <p className="font-bold">
                                Nenhum produto encontrado.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[62vh] overflow-y-auto pr-1">
                            {produtosFiltrados
                                .sort((a, b) =>
                                    a.nome?.localeCompare(b.nome, "pt-BR", {
                                        sensitivity: "base",
                                    }),
                                )
                                .map((prod) => {
                                    const noCarrinho = carrinho
                                        .filter(
                                            (i) => i.id === prod.id && !i.isKit,
                                        )
                                        .reduce(
                                            (acc, i) =>
                                                acc + i.quantidade,
                                            0,
                                        );
                                    return (
                                        <div
                                            key={prod.id}
                                            className={`border-2 rounded-2xl p-3 flex flex-col justify-between transition-all ${
                                                noCarrinho > 0
                                                    ? "border-emerald-400 bg-emerald-50/40"
                                                    : "border-slate-100 bg-white hover:border-emerald-200"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="font-bold text-sm text-slate-800 line-clamp-2">
                                                    {prod.nome}
                                                </p>
                                                {prod.isKit && (
                                                    <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-1 shrink-0">
                                                        <Layers size={10} />
                                                        KIT
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-emerald-600 font-black text-sm mb-3">
                                                {formatarDinheiro(
                                                    prod.precoBase ||
                                                        prod.preco,
                                                )}
                                            </p>
                                            {prod.isKit ? (
                                                <button
                                                    onClick={() =>
                                                        abrirModalKit(prod)
                                                    }
                                                    className="bg-slate-900 text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition hover:bg-slate-800"
                                                >
                                                    Montar Combo
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const item =
                                                                carrinho.find(
                                                                    (i) =>
                                                                        i.id ===
                                                                            prod.id &&
                                                                        !i.isKit,
                                                                );
                                                            if (item)
                                                                alterarQuantidade(
                                                                    item.cartId,
                                                                    -1,
                                                                );
                                                        }}
                                                        disabled={
                                                            noCarrinho === 0
                                                        }
                                                        className="flex-1 py-2 rounded-xl border-2 border-slate-200 text-slate-500 font-black disabled:opacity-30 hover:bg-slate-100 active:scale-95"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="font-black text-slate-800 w-6 text-center text-sm">
                                                        {noCarrinho}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            adicionarProduto(
                                                                prod,
                                                            )
                                                        }
                                                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 active:scale-95"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>

            {/* ============================= */}
            {/* COLUNA 3: RESUMO + CLIENTE */}
            {/* ============================= */}
            <div className="space-y-4 lg:sticky lg:top-6">
                {/* Resumo do pedido */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <Receipt className="text-emerald-600" size={18} />
                            Pedido ({totalItens} itens)
                        </h3>
                        {carrinho.length > 0 && (
                            <button
                                onClick={() => limparCarrinho()}
                                className="text-xs font-bold text-red-400 hover:text-red-600"
                            >
                                Limpar
                            </button>
                        )}
                    </div>

                    {carrinho.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">
                            Nenhum item adicionado.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
                            {carrinho.map((i) => (
                                <div
                                    key={i.cartId}
                                    className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800 truncate">
                                            {i.quantidade}x {i.nome}
                                        </p>
                                        {i.isKit && (
                                            <p className="text-[10px] text-slate-400">
                                                Combo com opções
                                            </p>
                                        )}
                                        <p className="text-xs text-emerald-600 font-bold">
                                            {formatarDinheiro(
                                                i.preco * i.quantidade,
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(
                                                    i.cartId,
                                                    -1,
                                                )
                                            }
                                            className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                alterarQuantidade(
                                                    i.cartId,
                                                    1,
                                                )
                                            }
                                            className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                removerItem(i.cartId)
                                            }
                                            className="p-1 text-red-400 hover:bg-red-50 rounded ml-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {carrinho.length > 0 && (
                        <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-bold text-slate-700">
                                    {formatarDinheiro(valorSubtotal)}
                                </span>
                            </div>
                            {tipoEntrega === "entrega" && (
                                <div className="flex justify-between text-slate-500">
                                    <span>Frete</span>
                                    <span className="font-bold text-emerald-600">
                                        {formatarDinheiro(taxaEntrega)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between font-black text-base text-slate-800 pt-1">
                                <span>Total</span>
                                <span>
                                    {formatarDinheiro(valorTotalComFrete)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Dados do cliente + entrega */}
                {carrinho.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <User className="text-emerald-600" size={18} />
                            Cliente e Entrega
                        </h3>

                        {/* BUSCA DE CLIENTE CADASTRADO */}
                        <div className="relative">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                placeholder="Buscar cliente por nome, WhatsApp ou CPF..."
                                value={buscaCliente}
                                onChange={(e) => {
                                    setBuscaCliente(e.target.value);
                                    setMostrarDropdown(true);
                                    if (!e.target.value) limparCliente();
                                }}
                                onFocus={() => setMostrarDropdown(true)}
                                className="w-full pl-9 pr-9 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                            />
                            {buscaCliente && (
                                <button
                                    onClick={limparCliente}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}

                            {mostrarDropdown && clientesFiltrados.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                    {clientesFiltrados
                                        .slice(0, 10)
                                        .map((cliente) => (
                                            <button
                                                key={cliente.id}
                                                onClick={() =>
                                                    selecionarCliente(cliente)
                                                }
                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition border-b border-slate-100 last:border-0"
                                            >
                                                <p className="font-bold text-sm text-slate-800">
                                                    {cliente.nome}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {cliente.telefone}{" "}
                                                    {cliente.documento &&
                                                        `- ${cliente.documento}`}
                                                </p>
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>

                        {clienteSelecionado && (
                            <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={12} /> Cliente cadastrado
                                selecionado
                            </p>
                        )}

                        <input
                            type="text"
                            placeholder="Nome do cliente *"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                        />
                        <input
                            type="tel"
                            placeholder="WhatsApp *"
                            value={telefoneCliente}
                            onChange={(e) =>
                                setTelefoneCliente(e.target.value)
                            }
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                        />

                        {/* TOGGLE PF/PJ */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                <FileText size={12} /> Tipo de Cliente
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTipoDocumento("PF")}
                                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                        tipoDocumento === "PF"
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    Pessoa Física
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipoDocumento("PJ")}
                                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                        tipoDocumento === "PJ"
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    Pessoa Jurídica
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder={
                                tipoDocumento === "PJ"
                                    ? "CNPJ *"
                                    : "CPF (opcional)"
                            }
                            value={
                                tipoDocumento === "PJ"
                                    ? cnpjCliente
                                    : cpfCliente
                            }
                            onChange={(e) =>
                                tipoDocumento === "PJ"
                                    ? setCnpjCliente(e.target.value)
                                    : setCpfCliente(e.target.value)
                            }
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                        />

                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                Tipo de Entrega
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setTipoEntrega("retirada")
                                    }
                                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                        tipoEntrega === "retirada"
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    🛍️ Retirada
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setTipoEntrega("entrega")
                                    }
                                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                        tipoEntrega === "entrega"
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    🚚 Entrega
                                </button>
                            </div>
                        </div>

                        {tipoEntrega === "entrega" && (
                            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                                    Endereço de Entrega
                                </p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="CEP *"
                                        value={cepCliente}
                                        onChange={(e) =>
                                            handleCepChange(e.target.value)
                                        }
                                        onBlur={(e) =>
                                            handleCepBlur(e.target.value)
                                        }
                                        maxLength={9}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium pr-10"
                                    />
                                    {carregandoCep && (
                                        <Loader
                                            size={16}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                                        />
                                    )}
                                </div>
                                {cepInvalido && (
                                    <p className="text-red-500 text-xs font-bold">
                                        CEP inválido. Verifique e tente
                                        novamente.
                                    </p>
                                )}
                                <input
                                    type="text"
                                    placeholder="Logradouro *"
                                    value={logradouroCliente}
                                    onChange={(e) =>
                                        setLogradouroCliente(e.target.value)
                                    }
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Número *"
                                        value={numeroCliente}
                                        onChange={(e) =>
                                            setNumeroCliente(e.target.value)
                                        }
                                        className="col-span-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Complemento"
                                        value={complementoCliente}
                                        onChange={(e) =>
                                            setComplementoCliente(
                                                e.target.value,
                                            )
                                        }
                                        className="col-span-2 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Bairro *"
                                    value={bairroCliente}
                                    onChange={(e) =>
                                        setBairroCliente(e.target.value)
                                    }
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                                />
                                <div className="grid grid-cols-4 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Cidade *"
                                        value={cidadeCliente}
                                        onChange={(e) =>
                                            setCidadeCliente(e.target.value)
                                        }
                                        className="col-span-3 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                                    />
                                    <input
                                        type="text"
                                        placeholder="UF *"
                                        value={ufCliente}
                                        onChange={(e) =>
                                            setUfCliente(e.target.value)
                                        }
                                        maxLength={2}
                                        className="col-span-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium uppercase text-center"
                                    />
                                </div>
                                {carregandoCep ? (
                                    <div className="p-3 rounded-xl border bg-white border-slate-200 text-slate-500 text-sm font-bold">
                                        <div className="flex items-center gap-2">
                                            <Loader
                                                size={16}
                                                className="animate-spin"
                                            />
                                            <span>Calculando frete...</span>
                                        </div>
                                    </div>
                                ) : foraRaioEntrega ? (
                                    <div className="p-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-700 text-sm font-bold">
                                        <div className="flex items-start gap-2">
                                            <MapPin
                                                size={16}
                                                className="shrink-0 mt-0.5"
                                            />
                                            <span>
                                                Distância:{" "}
                                                {distanciaKm.toFixed(1)} km —
                                                fora do raio de entrega.
                                                Negocie o frete com o cliente.
                                            </span>
                                        </div>
                                    </div>
                                ) : distanciaKm > 0 ? (
                                    <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm font-bold">
                                        <div className="flex items-center gap-2">
                                            <Truck
                                                size={16}
                                                className="shrink-0"
                                            />
                                            <span>
                                                {distanciaKm.toFixed(1)} km —
                                                Frete:{" "}
                                                {formatarDinheiro(taxaEntrega)}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <input
                            type="datetime-local"
                            value={dataEntrega}
                            onChange={(e) => setDataEntrega(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium text-slate-500"
                        />

                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                                Forma de Pagamento
                            </p>
                            <select
                                value={formaPagamento}
                                onChange={(e) =>
                                    setFormaPagamento(e.target.value)
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                            >
                                <option value="na_entrega">
                                    Na entrega / retirada
                                </option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="pix">Pix</option>
                                <option value="credito">
                                    Cartão de Crédito
                                </option>
                                <option value="debito">
                                    Cartão de Débito
                                </option>
                            </select>
                        </div>

                        {formaPagamento === "dinheiro" && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Troco para (R$)
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ex: 100"
                                    value={trocoPara}
                                    onChange={(e) =>
                                        setTrocoPara(e.target.value)
                                    }
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 text-sm font-medium"
                                />
                            </div>
                        )}

                        {formaPagamento === "pix" && percSinal > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-700 text-sm font-bold">
                                Sinal via Pix:{" "}
                                {formatarDinheiro(valorSinal)}
                            </div>
                        )}
                    </div>
                )}

                {/* Botão de envio */}
                <button
                    onClick={enviarPedido}
                    disabled={
                        carrinho.length === 0 ||
                        processando ||
                        (tipoEntrega === "entrega" && foraRaioEntrega)
                    }
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                    {processando ? (
                        <>
                            <Loader className="animate-spin" size={18} />
                            Processando...
                        </>
                    ) : (
                        <>
                            <Send size={18} /> Lançar Pedido de{" "}
                            {formatarDinheiro(valorTotalComFrete)}
                        </>
                    )}
                </button>
            </div>

            {/* ============================= */}
            {/* MODAL DE KIT / COMBO */}
            {/* ============================= */}
            {modalKitAberto && kitAtivo && (
                <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-end sm:items-center z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Layers className="text-emerald-500" />{" "}
                                {kitAtivo.nome}
                            </h2>
                            <button
                                onClick={() => setModalKitAberto(false)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
                            {kitAtivo.kitGroups?.map((grupo) => {
                                const totalSelecionado = Object.values(
                                    selecoesKit[grupo.id] || {},
                                ).reduce((a, b) => a + b, 0);
                                const concluido =
                                    totalSelecionado >= grupo.min &&
                                    totalSelecionado <= grupo.max;
                                return (
                                    <div
                                        key={grupo.id}
                                        className="mb-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                                    >
                                        <div className="bg-slate-100/50 p-4 border-b border-slate-100 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    {concluido && (
                                                        <CheckCircle
                                                            size={16}
                                                            className="text-emerald-500"
                                                        />
                                                    )}{" "}
                                                    {grupo.titulo}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 mt-0.5 uppercase font-bold tracking-wide">
                                                    Escolha de {grupo.min} até{" "}
                                                    {grupo.max} opções
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs font-black px-2.5 py-1 rounded-lg ${concluido ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                                            >
                                                {totalSelecionado}/{grupo.max}
                                            </span>
                                        </div>
                                        <div className="p-2">
                                            {grupo.opcoes?.map((op) => {
                                                const qtdOpcao =
                                                    selecoesKit[grupo.id]?.[
                                                        op.produtoId
                                                    ] || 0;
                                                return (
                                                    <div
                                                        key={op.produtoId}
                                                        className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="flex-1 pr-4">
                                                            <p className="font-semibold text-slate-700 text-sm">
                                                                {op.nome}
                                                            </p>
                                                            {op.adicional >
                                                                0 && (
                                                                <p className="text-xs text-emerald-600 font-black mt-0.5">
                                                                    +{" "}
                                                                    {formatarDinheiro(
                                                                        op.adicional,
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() =>
                                                                    alterarQtdSubitem(
                                                                        grupo.id,
                                                                        op.produtoId,
                                                                        -1,
                                                                        grupo.max,
                                                                    )
                                                                }
                                                                disabled={
                                                                    qtdOpcao ===
                                                                    0
                                                                }
                                                                className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-95"
                                                            >
                                                                <Minus
                                                                    size={14}
                                                                />
                                                            </button>
                                                            <span className="w-4 text-center font-bold text-slate-800">
                                                                {qtdOpcao}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    alterarQtdSubitem(
                                                                        grupo.id,
                                                                        op.produtoId,
                                                                        1,
                                                                        grupo.max,
                                                                    )
                                                                }
                                                                disabled={
                                                                    totalSelecionado >=
                                                                    grupo.max
                                                                }
                                                                className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white disabled:opacity-30 disabled:grayscale active:scale-95"
                                                            >
                                                                <Plus
                                                                    size={14}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-5 bg-white border-t border-slate-100 shrink-0">
                            <button
                                onClick={salvarKit}
                                disabled={!gruposValidos}
                                className="w-full py-4 rounded-2xl font-black text-white flex justify-center items-center px-6 transition-all shadow-lg disabled:opacity-50 disabled:grayscale active:scale-95 bg-emerald-600"
                            >
                                {gruposValidos
                                    ? `Adicionar Combo (${formatarDinheiro(precoKit)})`
                                    : "Preencha as Opções"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================= */}
            {/* MODAL DE SUCESSO */}
            {/* ============================= */}
            {pedidoCriado && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl">
                        <CheckCircle
                            size={56}
                            className="text-emerald-500 mx-auto mb-4"
                        />
                        <h2 className="text-2xl text-slate-800 font-black mb-2">
                            Pedido Lançado!
                        </h2>
                        <p className="text-slate-500 mb-2 font-medium">
                            Cliente: <b>{pedidoCriado.cliente}</b>
                        </p>
                        <p className="text-slate-500 mb-6 font-medium">
                            Total:{" "}
                            <b>{formatarDinheiro(pedidoCriado.valorTotal)}</b>
                        </p>
                        {pedidoCriado.valorSinal > 0 && (
                            <p className="text-blue-600 text-sm font-bold mb-6 bg-blue-50 border border-blue-100 rounded-xl p-3">
                                Sinal Pix de{" "}
                                {formatarDinheiro(pedidoCriado.valorSinal)}{" "}
                                pendente — o pedido está{" "}
                                <b>Aguardando Pix</b>.
                            </p>
                        )}
                        <button
                            onClick={() => setPedidoCriado(null)}
                            className="w-full py-4 rounded-2xl font-black text-white active:scale-95 transition-transform shadow-lg bg-emerald-600 hover:bg-emerald-700"
                        >
                            Continuar Lançando
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
