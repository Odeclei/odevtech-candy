import { useState, useEffect } from "react";
import {
    Plus,
    Edit,
    Save,
    Trash2,
    ShoppingBag,
    TrendingUp,
    Lock,
    Search,
    PackagePlus,
    X,
    Layers,
    Receipt,
    Minus,
} from "lucide-react";
import {
    doc,
    updateDoc,
    addDoc,
    collection,
    deleteDoc,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import imageCompression from "browser-image-compression";

export default function AbaCardapio({
    nomeDaLoja,
    produtos,
    formatarDinheiro,
}) {
    const [editandoProdutoId, setEditandoProdutoId] = useState(null);
    const [produtoImagensAtuais, setProdutoImagensAtuais] = useState([]);
    const [novoNome, setNovoNome] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novoCusto, setNovoCusto] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");
    const [novaCategoria, setNovaCategoria] = useState("");
    const [imagensArquivos, setImagensArquivos] = useState([]);
    const [salvandoProduto, setSalvandoProduto] = useState(false);
    const [novoAtivo, setNovoAtivo] = useState(true);

    // --- NOVO ESTADO: QUANTIDADE MÍNIMA ---
    const [novaQuantidadeMinima, setNovaQuantidadeMinima] = useState(0);

    // --- ESTADOS FISCAIS ---
    const [novoNcm, setNovoNcm] = useState("");
    const [novoCfop, setNovoCfop] = useState("5102");
    const [novoCst, setNovoCst] = useState("0102");

    // --- NOVOS ESTADOS PARA KITS / COMBOS ---
    const [isKit, setIsKit] = useState(false);
    const [kitGroups, setKitGroups] = useState([]);

    const [categoriasDaLoja, setCategoriasDaLoja] = useState([]);
    const [busca, setBusca] = useState("");
    const [configLoja, setConfigLoja] = useState(null);

    const produtoSendoEditado = produtos.find(
        (p) => p.id === editandoProdutoId,
    );
    const custoBloqueadoPeloEstoque =
        produtoSendoEditado?.controlarEstoque || isKit;

    useEffect(() => {
        const q = query(
            collection(db, "categorias"),
            where("loja", "==", nomeDaLoja),
        );
        return onSnapshot(q, (snapshot) => {
            const cats = snapshot.docs.map((doc) => doc.data().nome);
            const listaFinal = cats.length > 0 ? cats : ["Geral"];
            listaFinal.sort((a, b) => a.localeCompare(b));
            setCategoriasDaLoja(listaFinal);
            if (!novaCategoria) setNovaCategoria(listaFinal[0]);
        });
    }, [nomeDaLoja, novaCategoria]);

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

    let precoSugerido = 0;
    if (novoCusto && configLoja && !isKit) {
        const custoNum = parseFloat(novoCusto);
        const somaPercentuais =
            (configLoja.percCustosFixos || 0) +
            (configLoja.percImpostos || 0) +
            (configLoja.percLucroAlvo || 0);
        const divisor = 1 - somaPercentuais / 100;
        if (divisor > 0 && custoNum > 0) {
            precoSugerido = custoNum / divisor;
        }
    }

    const handleCategoriaChange = async (e) => {
        const valorSelecionado = e.target.value;
        if (valorSelecionado === "NOVA_CATEGORIA") {
            const novaCat = window.prompt("Digite o nome da nova categoria:");
            if (novaCat && novaCat.trim() !== "") {
                const nomeFormatado = novaCat.trim();
                try {
                    await addDoc(collection(db, "categorias"), {
                        loja: nomeDaLoja,
                        nome: nomeFormatado,
                    });
                    setNovaCategoria(nomeFormatado);
                } catch (error) {
                    console.error("Erro ao salvar a nova categoria:", error);
                    alert("Erro ao salvar a nova categoria.");
                }
            } else {
                setNovaCategoria(categoriasDaLoja[0]);
            }
        } else {
            setNovaCategoria(valorSelecionado);
        }
    };

    // --- FUNÇÕES DE MONTAGEM DE KITS ---
    const adicionarGrupoKit = () => {
        setKitGroups([
            ...kitGroups,
            { id: Date.now(), titulo: "", min: 1, max: 1, opcoes: [] },
        ]);
    };

    const atualizarGrupoKit = (id, campo, valor) => {
        setKitGroups(
            kitGroups.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)),
        );
    };

    const removerGrupoKit = (id) => {
        setKitGroups(kitGroups.filter((g) => g.id !== id));
    };

    const adicionarOpcaoNoGrupo = (grupoId, produtoSelecionadoId) => {
        if (!produtoSelecionadoId) return;
        const produtoBase = produtos.find((p) => p.id === produtoSelecionadoId);
        if (!produtoBase) return;

        setKitGroups(
            kitGroups.map((g) => {
                if (g.id === grupoId) {
                    if (
                        g.opcoes.some(
                            (op) => op.produtoId === produtoSelecionadoId,
                        )
                    )
                        return g;
                    return {
                        ...g,
                        opcoes: [
                            ...g.opcoes,
                            {
                                produtoId: produtoBase.id,
                                nome: produtoBase.nome,
                                adicional: 0,
                            },
                        ],
                    };
                }
                return g;
            }),
        );
    };

    const removerOpcaoDoGrupo = (grupoId, produtoId) => {
        setKitGroups(
            kitGroups.map((g) => {
                if (g.id === grupoId) {
                    return {
                        ...g,
                        opcoes: g.opcoes.filter(
                            (op) => op.produtoId !== produtoId,
                        ),
                    };
                }
                return g;
            }),
        );
    };

    const atualizarAdicionalOpcao = (grupoId, produtoId, valor) => {
        setKitGroups(
            kitGroups.map((g) => {
                if (g.id === grupoId) {
                    return {
                        ...g,
                        opcoes: g.opcoes.map((op) =>
                            op.produtoId === produtoId
                                ? { ...op, adicional: parseFloat(valor) || 0 }
                                : op,
                        ),
                    };
                }
                return g;
            }),
        );
    };

    // --- FUNÇÃO DE SALVAR PRINCIPAL ---
    const salvarProduto = async (e) => {
        e.preventDefault();
        if (!novoNome || !novoPreco) return alert("Preencha nome e preço");

        if (isKit) {
            if (kitGroups.length === 0)
                return alert(
                    "Um Kit precisa ter pelo menos um grupo de escolha.",
                );
            const gruposInvalidos = kitGroups.filter(
                (g) => !g.titulo || g.opcoes.length === 0,
            );
            if (gruposInvalidos.length > 0)
                return alert(
                    "Preencha o título de todos os grupos e adicione pelo menos uma opção neles.",
                );
        }

        setSalvandoProduto(true);

        try {
            let urlsDasFotos = [...produtoImagensAtuais];

            if (imagensArquivos.length > 0) {
                const uploadPromises = Array.from(imagensArquivos).map(
                    async (arquivo) => {
                        const imagemComprimida = await imageCompression(
                            arquivo,
                            {
                                maxSizeMB: 0.3,
                                maxWidthOrHeight: 800,
                            },
                        );
                        const formData = new FormData();
                        formData.append("file", imagemComprimida);
                        formData.append("upload_preset", "doceapp_preset");
                        const resposta = await fetch(
                            "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
                            { method: "POST", body: formData },
                        );
                        const data = await resposta.json();
                        return data.secure_url;
                    },
                );
                const novasUrls = await Promise.all(uploadPromises);
                urlsDasFotos = urlsDasFotos.concat(novasUrls);
            }

            if (urlsDasFotos.length === 0)
                urlsDasFotos = ["https://placehold.co/400?text=Sem+Foto"];

            const dadosProduto = {
                loja: nomeDaLoja,
                nome: novoNome,
                preco: parseFloat(novoPreco),
                descricao: novaDescricao,
                categoria: novaCategoria || categoriasDaLoja[0],
                // DADOS FISCAIS
                ncm: novoNcm,
                cfop: novoCfop,
                cst: novoCst,
                // ---
                imagem: urlsDasFotos[0],
                imagens: urlsDasFotos,
                ativo: novoAtivo,
                atualizadoEm: new Date().toISOString(),
                isKit: isKit,
                // ✅ NOVO CAMPO: Quantidade mínima por pedido
                quantidadeMinima: parseFloat(novaQuantidadeMinima) || 0,
            };

            if (isKit) {
                dadosProduto.kitGroups = kitGroups;
                dadosProduto.custoMedio = 0;
            } else if (!custoBloqueadoPeloEstoque) {
                dadosProduto.custoMedio = parseFloat(novoCusto) || 0;
                dadosProduto.kitGroups = [];
            }

            if (editandoProdutoId) {
                await updateDoc(
                    doc(db, "produtos", editandoProdutoId),
                    dadosProduto,
                );
                alert("Produto atualizado!");
            } else {
                dadosProduto.controlarEstoque = false;
                dadosProduto.estoqueAtual = 0;
                await addDoc(collection(db, "produtos"), dadosProduto);
                alert("Produto criado!");
            }
            cancelarEdicaoProduto();
        } catch (erro) {
            console.error(erro);
            alert("Erro ao salvar produto.");
        } finally {
            setSalvandoProduto(false);
        }
    };

    const prepararEdicaoProduto = (produto) => {
        setEditandoProdutoId(produto.id);
        setNovoNome(produto.nome);
        setNovoPreco(produto.preco);
        setNovoCusto(produto.custoMedio || produto.custo || "");
        setNovaDescricao(produto.descricao);
        setNovaCategoria(
            categoriasDaLoja.includes(produto.categoria)
                ? produto.categoria
                : categoriasDaLoja[0],
        );
        // ✅ Carregar quantidade mínima
        setNovaQuantidadeMinima(produto.quantidadeMinima || 0);

        // Fiscais
        setNovoNcm(produto.ncm || "");
        setNovoCfop(produto.cfop || "5102");
        setNovoCst(produto.cst || "0102");

        setNovoAtivo(produto.ativo !== false);
        setProdutoImagensAtuais(
            produto.imagens || (produto.imagem ? [produto.imagem] : []),
        );
        setImagensArquivos([]);
        setIsKit(produto.isKit || false);
        setKitGroups(produto.kitGroups || []);
    };

    const cancelarEdicaoProduto = () => {
        setEditandoProdutoId(null);
        setNovoNome("");
        setNovoPreco("");
        setNovoCusto("");
        setNovaDescricao("");
        setNovaCategoria(categoriasDaLoja[0] || "");
        setNovoNcm("");
        setNovoCfop("5102");
        setNovoCst("0102");
        setNovoAtivo(true);
        setImagensArquivos([]);
        setProdutoImagensAtuais([]);
        setIsKit(false);
        setKitGroups([]);
        // ✅ Resetar quantidade mínima
        setNovaQuantidadeMinima(0);
    };

    const apagarProduto = async (id) => {
        if (window.confirm("Deseja mesmo apagar este produto?"))
            await deleteDoc(doc(db, "produtos", id));
    };

    const alternarStatus = async (id, statusAtual) =>
        updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });

    const produtosFiltrados = produtos.filter(
        (p) =>
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            (p.categoria &&
                p.categoria.toLowerCase().includes(busca.toLowerCase())),
    );

    return (
        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 lg:sticky lg:top-6 lg:max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                    {editandoProdutoId ? (
                        <Edit className="text-slate-900" />
                    ) : (
                        <Plus className="text-slate-900" />
                    )}
                    {editandoProdutoId ? "Editar Produto" : "Novo Produto"}
                </h3>

                <form onSubmit={salvarProduto} className="space-y-5">
                    {/* SWITCH KIT/COMBO */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={`p-2 rounded-xl ${isKit ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"}`}
                            >
                                <Layers size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">
                                    Vender como Kit/Combo?
                                </p>
                                <p className="text-xs text-slate-500">
                                    O cliente poderá escolher subitens (Ex:
                                    Sabores)
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isKit}
                                onChange={(e) => setIsKit(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Categoria
                        </label>
                        <select
                            value={novaCategoria}
                            onChange={handleCategoriaChange}
                            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
                        >
                            {categoriasDaLoja.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                            <option disabled>──────────</option>
                            <option
                                value="NOVA_CATEGORIA"
                                className="font-bold text-slate-900"
                            >
                                ➕ Adicionar nova categoria...
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Nome do {isKit ? "Kit/Combo" : "Produto"}
                        </label>
                        <input
                            type="text"
                            required
                            value={novoNome}
                            onChange={(e) => setNovoNome(e.target.value)}
                            placeholder={
                                isKit
                                    ? "Ex: Kit Festa 20 Pessoas"
                                    : "Ex: Bolo de Chocolate"
                            }
                            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                                Custo (R$)
                                {custoBloqueadoPeloEstoque && (
                                    <Lock
                                        size={12}
                                        className="text-amber-500"
                                        title={
                                            isKit
                                                ? "Kits calculam custo pela ficha dos subitens"
                                                : "Calculado via Estoque"
                                        }
                                    />
                                )}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                disabled={custoBloqueadoPeloEstoque}
                                value={isKit ? "0" : novoCusto}
                                onChange={(e) => setNovoCusto(e.target.value)}
                                placeholder="0.00"
                                className={`w-full border p-3 rounded-xl outline-none font-bold ${custoBloqueadoPeloEstoque ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "focus:ring-2 focus:ring-slate-400"}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Preço Base (R$)
                            </label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                value={novoPreco}
                                onChange={(e) => setNovoPreco(e.target.value)}
                                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none font-bold"
                            />
                            {precoSugerido > 0 && !isKit && (
                                <div className="mt-1.5">
                                    <span className="inline-block text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded shadow-sm">
                                        Sugerido:{" "}
                                        {formatarDinheiro(precoSugerido)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ✅ CAMPO QUANTIDADE MÍNIMA */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Quantidade Mínima por Pedido
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={novaQuantidadeMinima}
                                    onChange={(e) =>
                                        setNovaQuantidadeMinima(
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
                                />
                                {parseInt(novaQuantidadeMinima) > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                        Mínimo: {novaQuantidadeMinima} un.
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setNovaQuantidadeMinima(0)}
                                className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition"
                                title="Remover quantidade mínima"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {parseInt(novaQuantidadeMinima) === 0
                                ? "0 = sem quantidade mínima (cliente pode pedir 1 unidade)"
                                : `O cliente deverá pedir no mínimo ${novaQuantidadeMinima} unidades`}
                        </p>
                    </div>

                    {/* SESSÃO DO CONSTRUTOR DE KITS */}
                    {isKit && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                                    <PackagePlus size={18} /> Grupos de Escolha
                                </h4>
                            </div>

                            {kitGroups.map((grupo, index) => (
                                <div
                                    key={grupo.id}
                                    className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removerGrupoKit(grupo.id)
                                        }
                                        className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                        Grupo {index + 1}
                                    </p>

                                    <input
                                        type="text"
                                        placeholder="Título (Ex: Escolha 4 Salgados)"
                                        value={grupo.titulo}
                                        onChange={(e) =>
                                            atualizarGrupoKit(
                                                grupo.id,
                                                "titulo",
                                                e.target.value,
                                            )
                                        }
                                        className="w-full border-b-2 border-slate-100 pb-2 mb-3 outline-none focus:border-indigo-400 text-sm font-bold text-slate-700"
                                    />

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-500">
                                                Mínimo de Escolhas
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={grupo.min}
                                                onChange={(e) =>
                                                    atualizarGrupoKit(
                                                        grupo.id,
                                                        "min",
                                                        parseInt(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-500">
                                                Máximo de Escolhas
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={grupo.max}
                                                onChange={(e) =>
                                                    atualizarGrupoKit(
                                                        grupo.id,
                                                        "max",
                                                        parseInt(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Lista de Opções do Grupo */}
                                    <div className="space-y-2 mb-3">
                                        {grupo.opcoes.map((opcao) => (
                                            <div
                                                key={opcao.produtoId}
                                                className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 text-sm"
                                            >
                                                <span className="font-medium text-slate-700 truncate w-1/2">
                                                    {opcao.nome}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">
                                                        + R$
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={opcao.adicional}
                                                        onChange={(e) =>
                                                            atualizarAdicionalOpcao(
                                                                grupo.id,
                                                                opcao.produtoId,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-16 border rounded p-1 text-xs text-right outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removerOpcaoDoGrupo(
                                                                grupo.id,
                                                                opcao.produtoId,
                                                            )
                                                        }
                                                        className="text-red-400 p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Adicionar Opção */}
                                    <select
                                        onChange={(e) => {
                                            adicionarOpcaoNoGrupo(
                                                grupo.id,
                                                e.target.value,
                                            );
                                            e.target.value = "";
                                        }}
                                        className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold p-2 rounded-lg outline-none cursor-pointer"
                                    >
                                        <option value="">
                                            + Adicionar opção ao grupo...
                                        </option>
                                        {produtos
                                            .filter((p) => !p.isKit)
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nome}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={adicionarGrupoKit}
                                className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors text-sm"
                            >
                                + Adicionar Nova Etapa de Escolha
                            </button>
                        </div>
                    )}

                    {/* SESSÃO FISCAL */}
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Receipt size={18} className="text-slate-600" />
                            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                                Dados Fiscais (NFC-e)
                            </h4>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                                NCM (Nomenclatura Comum)
                            </label>
                            <input
                                type="text"
                                maxLength="8"
                                value={novoNcm}
                                onChange={(e) =>
                                    setNovoNcm(
                                        e.target.value.replace(/\D/g, ""),
                                    )
                                }
                                placeholder="Ex: 19059090 (Pães/Bolos)"
                                className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none bg-white text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Natureza (CFOP)
                                </label>
                                <select
                                    value={novoCfop}
                                    onChange={(e) =>
                                        setNovoCfop(e.target.value)
                                    }
                                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none bg-white text-sm text-slate-700"
                                >
                                    <option value="5101">
                                        5101 - Produção Própria (Fabricação)
                                    </option>
                                    <option value="5102">
                                        5102 - Revenda de Mercadoria (Comum)
                                    </option>
                                    <option value="5405">
                                        5405 - Revenda de Mercadoria
                                        (Substituição Tributária)
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Tributação (CSOSN)
                                </label>
                                <select
                                    value={novoCst}
                                    onChange={(e) => setNovoCst(e.target.value)}
                                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none bg-white text-sm text-slate-700"
                                >
                                    <option value="0102">
                                        102 - Tributada (Simples Nacional)
                                    </option>
                                    <option value="0400">
                                        400 - Não Tributada / Isenta
                                    </option>
                                    <option value="0500">
                                        500 - ICMS Cobrado Anteriormente (ST)
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* UPLOAD MULTIPLAS IMAGENS */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1 flex justify-between">
                            <span>Fotos (Até 4 imagens)</span>
                        </label>
                        <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-3">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) =>
                                    setImagensArquivos(
                                        Array.from(e.target.files).slice(0, 4),
                                    )
                                }
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                            />
                            {editandoProdutoId &&
                                produtoImagensAtuais.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto">
                                        {produtoImagensAtuais.map(
                                            (imgUrl, i) => (
                                                <div
                                                    key={i}
                                                    className="relative w-12 h-12 shrink-0"
                                                >
                                                    <img
                                                        src={imgUrl}
                                                        className="w-full h-full object-cover rounded-lg border border-slate-300"
                                                    />
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Descrição
                        </label>
                        <textarea
                            value={novaDescricao}
                            onChange={(e) => setNovaDescricao(e.target.value)}
                            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
                            rows="2"
                        ></textarea>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border">
                        <input
                            type="checkbox"
                            checked={novoAtivo}
                            onChange={(e) => setNovoAtivo(e.target.checked)}
                            className="w-5 h-5 accent-slate-900"
                        />
                        <span className="font-medium text-slate-700">
                            Visível no Catálogo Público
                        </span>
                    </label>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={salvandoProduto}
                            className={`flex-1 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 ${salvandoProduto ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800"}`}
                        >
                            <Save size={20} />{" "}
                            {salvandoProduto
                                ? "Salvando..."
                                : editandoProdutoId
                                  ? "Atualizar"
                                  : "Criar"}
                        </button>
                        {editandoProdutoId && (
                            <button
                                type="button"
                                onClick={cancelarEdicaoProduto}
                                className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* --- COLUNA DA DIREITA: LISTAGEM --- */}
            <div className="lg:col-span-2 space-y-4">
                <div className="relative mb-6">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={20}
                    />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou categoria..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-400 outline-none text-slate-700 font-medium"
                    />
                </div>

                {produtosFiltrados.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                        <ShoppingBag
                            size={48}
                            className="mx-auto text-slate-300 mb-4"
                        />
                        <h3 className="text-xl font-bold text-slate-600">
                            Nenhum produto encontrado
                        </h3>
                    </div>
                ) : (
                    produtosFiltrados
                        .sort((a, b) =>
                            (a.categoria || "").localeCompare(
                                b.categoria || "",
                            ),
                        )
                        .map((p) => {
                            const custo = p.custoMedio || p.custo || 0;
                            const lucroBruto = p.preco - custo;
                            const margem =
                                p.preco > 0
                                    ? ((lucroBruto / p.preco) * 100).toFixed(1)
                                    : 0;
                            const imagemDisplay =
                                p.imagens?.[0] ||
                                p.imagem ||
                                "https://placehold.co/400?text=Sem+Foto";
                            const qtdMinima = p.quantidadeMinima || 0;

                            return (
                                <div
                                    key={p.id}
                                    className={`bg-white p-5 rounded-2xl border transition-all ${p.ativo !== false ? "border-slate-100 shadow-sm" : "border-red-100 opacity-60 grayscale-[30%]"}`}
                                >
                                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                                        <div className="relative w-24 h-24 shrink-0">
                                            <img
                                                src={imagemDisplay}
                                                alt={p.nome}
                                                className="w-full h-full rounded-2xl object-cover bg-slate-100"
                                            />
                                            {p.isKit && (
                                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-lg border-2 border-white flex items-center shadow-sm">
                                                    <Layers
                                                        size={10}
                                                        className="mr-1"
                                                    />{" "}
                                                    Combo
                                                </div>
                                            )}
                                            {qtdMinima > 0 && (
                                                <div className="absolute -top-2 -left-2 bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                                                    <Minus size={10} /> Mínimo{" "}
                                                    {qtdMinima}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 w-full">
                                            <div className="flex justify-between mb-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase bg-slate-100 text-slate-600">
                                                        {p.categoria || "Geral"}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase ${p.ativo !== false ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                                    >
                                                        {p.ativo !== false
                                                            ? "Ativo"
                                                            : "Pausado"}
                                                    </span>
                                                    {qtdMinima > 0 && (
                                                        <span className="text-[10px] px-2.5 py-1 rounded-md font-bold uppercase bg-amber-100 text-amber-700">
                                                            Min: {qtdMinima}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            prepararEdicaoProduto(
                                                                p,
                                                            )
                                                        }
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            alternarStatus(
                                                                p.id,
                                                                p.ativo !==
                                                                    false,
                                                            )
                                                        }
                                                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                                    >
                                                        <Lock size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            apagarProduto(p.id)
                                                        }
                                                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-xl text-slate-800 line-clamp-1">
                                                {p.nome}
                                            </h4>

                                            {/* Etiqueta Fiscal (apenas visualização) */}
                                            {p.cfop && (
                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                                                    CFOP: {p.cfop} • CSOSN:{" "}
                                                    {p.cst}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50 rounded-xl border border-slate-200 divide-x">
                                                <div className="p-2 text-center">
                                                    <p className="text-[9px] uppercase font-black text-slate-400 mb-1">
                                                        {p.isKit
                                                            ? "Custo Dinâmico"
                                                            : "Custo Médio"}
                                                    </p>
                                                    <p className="font-bold text-sm">
                                                        {p.isKit
                                                            ? "---"
                                                            : formatarDinheiro(
                                                                  custo,
                                                              )}
                                                    </p>
                                                </div>
                                                <div className="p-2 text-center bg-white">
                                                    <p className="text-[9px] uppercase font-black text-slate-400 mb-1">
                                                        {p.isKit
                                                            ? "Preço Base"
                                                            : "Preço Venda"}
                                                    </p>
                                                    <p className="font-black text-sm">
                                                        {formatarDinheiro(
                                                            p.preco,
                                                        )}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`p-2 text-center ${p.isKit ? "bg-slate-100 text-slate-500" : margem > 40 ? "bg-emerald-50 text-emerald-700" : margem > 20 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}
                                                >
                                                    <p className="text-[9px] uppercase font-black mb-1 opacity-70">
                                                        Lucro{" "}
                                                        {p.isKit
                                                            ? "Variável"
                                                            : `(${margem}%)`}
                                                    </p>
                                                    <p className="font-black text-sm">
                                                        <TrendingUp
                                                            size={12}
                                                            className="inline mr-1"
                                                        />
                                                        {p.isKit
                                                            ? "Variável"
                                                            : formatarDinheiro(
                                                                  lucroBruto,
                                                              )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}
