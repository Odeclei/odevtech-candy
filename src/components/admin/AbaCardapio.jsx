import { useState, useEffect } from "react";
import {
    Plus,
    Edit,
    Save,
    Trash2,
    ShoppingBag,
    Image as ImageIcon,
    TrendingUp,
    Lock,
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
    // ==========================================
    // ESTADOS
    // ==========================================
    const [editandoProdutoId, setEditandoProdutoId] = useState(null);
    const [produtoImagemAtual, setProdutoImagemAtual] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novoCusto, setNovoCusto] = useState(""); // NOVO ESTADO: Custo
    const [novaDescricao, setNovaDescricao] = useState("");
    const [novaCategoria, setNovaCategoria] = useState("");
    const [novoNcm, setNovoNcm] = useState("");
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [salvandoProduto, setSalvandoProduto] = useState(false);
    const [novoAtivo, setNovoAtivo] = useState(true);

    const [categoriasDaLoja, setCategoriasDaLoja] = useState([]);

    // Verifica se o produto a ser editado tem o custo bloqueado pelo Estoque Automático
    const produtoSendoEditado = produtos.find(
        (p) => p.id === editandoProdutoId,
    );
    const custoBloqueadoPeloEstoque = produtoSendoEditado?.controlarEstoque;

    // ==========================================
    // BUSCAR CATEGORIAS DINÂMICAS
    // ==========================================
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

            if (!novaCategoria) {
                setNovaCategoria(listaFinal[0]);
            }
        });
    }, [nomeDaLoja, novaCategoria]);

    // ==========================================
    // CRIAR NOVA CATEGORIA PELO SELECT
    // ==========================================
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
                    console.error("Erro:", error);
                    alert("Erro ao salvar a nova categoria.");
                }
            } else {
                setNovaCategoria(categoriasDaLoja[0]);
            }
        } else {
            setNovaCategoria(valorSelecionado);
        }
    };

    // ==========================================
    // FUNÇÕES DO PRODUTO
    // ==========================================
    const salvarProduto = async (e) => {
        e.preventDefault();
        if (!novoNome || !novoPreco) return alert("Preencha nome e preço");
        setSalvandoProduto(true);

        try {
            let urlDaFoto = editandoProdutoId
                ? produtoImagemAtual
                : "https://placehold.co/400?text=Sem+Foto";

            if (imagemArquivo) {
                const imagemComprimida = await imageCompression(imagemArquivo, {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                });
                const formData = new FormData();
                formData.append("file", imagemComprimida);
                formData.append("upload_preset", "doceapp_preset");
                const resposta = await fetch(
                    "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
                    { method: "POST", body: formData },
                );
                urlDaFoto = (await resposta.json()).secure_url;
            }

            const dadosProduto = {
                loja: nomeDaLoja,
                nome: novoNome,
                preco: parseFloat(novoPreco),
                descricao: novaDescricao,
                categoria: novaCategoria || categoriasDaLoja[0],
                ncm: novoNcm,
                imagem: urlDaFoto,
                ativo: novoAtivo,
                atualizadoEm: new Date().toISOString(),
            };

            // Se NÃO estiver bloqueado pelo estoque automático, atualiza o custo médio manual
            if (!custoBloqueadoPeloEstoque) {
                dadosProduto.custoMedio = parseFloat(novoCusto) || 0;
            }

            if (editandoProdutoId) {
                await updateDoc(
                    doc(db, "produtos", editandoProdutoId),
                    dadosProduto,
                );
                alert("Produto atualizado!");
            } else {
                // Produto novo nasce com esses campos extras
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
        setNovoCusto(produto.custoMedio || ""); // Carrega o custo atual
        setNovaDescricao(produto.descricao);

        setNovaCategoria(
            categoriasDaLoja.includes(produto.categoria)
                ? produto.categoria
                : categoriasDaLoja[0],
        );

        setNovoNcm(produto.ncm || "");
        setNovoAtivo(produto.ativo);
        setProdutoImagemAtual(produto.imagem);
        setImagemArquivo(null);
    };

    const cancelarEdicaoProduto = () => {
        setEditandoProdutoId(null);
        setNovoNome("");
        setNovoPreco("");
        setNovoCusto("");
        setNovaDescricao("");
        setNovaCategoria(categoriasDaLoja[0] || "");
        setNovoNcm("");
        setNovoAtivo(true);
        setImagemArquivo(null);
        setProdutoImagemAtual("");
    };

    const apagarProduto = async (id) => {
        if (window.confirm("Deseja mesmo apagar este produto?"))
            await deleteDoc(doc(db, "produtos", id));
    };

    const alternarStatus = async (id, statusAtual) =>
        updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });

    return (
        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulário Novo/Editar Produto */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                    {editandoProdutoId ? (
                        <Edit className="text-pink-600" />
                    ) : (
                        <Plus className="text-pink-600" />
                    )}
                    {editandoProdutoId ? "Editar Produto" : "Novo Produto"}
                </h3>
                <form onSubmit={salvarProduto} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Categoria
                        </label>
                        <select
                            value={novaCategoria}
                            onChange={handleCategoriaChange}
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none bg-white text-slate-900"
                        >
                            {categoriasDaLoja.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                            <option disabled>──────────</option>
                            <option
                                value="NOVA_CATEGORIA"
                                className="font-bold text-pink-600"
                            >
                                ➕ Adicionar nova categoria...
                            </option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Nome do Produto
                        </label>
                        <input
                            type="text"
                            required
                            value={novoNome}
                            onChange={(e) => setNovoNome(e.target.value)}
                            className="w-full bg-white text-slate-900 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Preço Final (R$)
                            </label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                value={novoPreco}
                                onChange={(e) => setNovoPreco(e.target.value)}
                                className="w-full bg-white text-slate-900 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none font-bold text-slate-800"
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center justify-between">
                                Custo (R$)
                                {custoBloqueadoPeloEstoque && (
                                    <Lock
                                        size={12}
                                        className="text-amber-500"
                                        title="Calculado via Estoque Automático"
                                    />
                                )}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                disabled={custoBloqueadoPeloEstoque}
                                value={novoCusto}
                                onChange={(e) => setNovoCusto(e.target.value)}
                                placeholder="0.00"
                                className={`w-full border p-3 rounded-xl outline-none font-bold transition-colors ${custoBloqueadoPeloEstoque ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border-slate-200 focus:ring-2 focus:ring-pink-400 text-slate-900"}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            className="block text-sm font-medium text-slate-600 mb-1"
                            title="Nomenclatura Comum do Mercosul"
                        >
                            NCM (Fiscal)
                        </label>
                        <input
                            type="text"
                            maxLength="8"
                            value={novoNcm}
                            onChange={(e) =>
                                setNovoNcm(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="Ex: 19059090"
                            className="w-full bg-white text-slate-900 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1 flex justify-between">
                            <span>Foto Principal</span>
                            {editandoProdutoId && produtoImagemAtual && (
                                <span className="text-xs text-pink-600 font-bold">
                                    Imagem já salva
                                </span>
                            )}
                        </label>
                        <div className="border border-slate-200 p-2 rounded-xl bg-slate-50 flex items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setImagemArquivo(e.target.files[0])
                                }
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer text-slate-700"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Descrição
                        </label>
                        <textarea
                            value={novaDescricao}
                            onChange={(e) => setNovaDescricao(e.target.value)}
                            className="w-full bg-white text-slate-900 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                            rows="3"
                        ></textarea>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <input
                            type="checkbox"
                            checked={novoAtivo}
                            onChange={(e) => setNovoAtivo(e.target.checked)}
                            className="w-5 h-5 accent-pink-600"
                        />
                        <span className="font-medium text-slate-700">
                            Visível no Catálogo Público
                        </span>
                    </label>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={salvandoProduto}
                            className={`flex-1 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 ${salvandoProduto ? "bg-slate-400" : "bg-slate-900 hover:bg-pink-600"}`}
                        >
                            <Save size={20} />{" "}
                            {salvandoProduto
                                ? "Salvando..."
                                : editandoProdutoId
                                  ? "Atualizar Produto"
                                  : "Criar Produto"}
                        </button>
                        {editandoProdutoId && (
                            <button
                                type="button"
                                onClick={cancelarEdicaoProduto}
                                className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Lista de Produtos */}
            <div className="lg:col-span-2 space-y-4">
                {produtos.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                        <ShoppingBag
                            size={48}
                            className="mx-auto text-slate-300 mb-4"
                        />
                        <h3 className="text-xl font-bold text-slate-600">
                            Nenhum produto cadastrado
                        </h3>
                        <p className="text-slate-400 mt-2">
                            Comece a adicionar os produtos da loja.
                        </p>
                    </div>
                ) : (
                    produtos
                        .sort((a, b) =>
                            (a.categoria || "").localeCompare(
                                b.categoria || "",
                            ),
                        )
                        .map((p) => {
                            // CÁLCULO FINANCEIRO DO PRODUTO
                            const custo = p.custoMedio || 0;
                            const lucroBruto = p.preco - custo;
                            const margem =
                                p.preco > 0
                                    ? ((lucroBruto / p.preco) * 100).toFixed(1)
                                    : 0;

                            return (
                                <div
                                    key={p.id}
                                    className={`bg-white p-5 rounded-2xl border transition-all ${p.ativo ? "border-slate-100 shadow-sm hover:border-pink-200" : "border-red-100 opacity-60 grayscale-[30%]"}`}
                                >
                                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                                        <img
                                            src={p.imagem}
                                            alt={p.nome}
                                            className="w-24 h-24 rounded-2xl object-cover bg-slate-100"
                                        />
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase bg-slate-100 text-slate-600">
                                                        {p.categoria || "Geral"}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase ${p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                                    >
                                                        {p.ativo
                                                            ? "Ativo"
                                                            : "Pausado"}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            prepararEdicaoProduto(
                                                                p,
                                                            )
                                                        }
                                                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            alternarStatus(
                                                                p.id,
                                                                p.ativo,
                                                            )
                                                        }
                                                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                                        title={
                                                            p.ativo
                                                                ? "Pausar"
                                                                : "Ativar"
                                                        }
                                                    >
                                                        <Lock size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            apagarProduto(p.id)
                                                        }
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-xl text-slate-800 line-clamp-1">
                                                {p.nome}
                                            </h4>

                                            {/* MINI-DASHBOARD FINANCEIRO DO PRODUTO */}
                                            <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50 rounded-xl border border-slate-200 divide-x divide-slate-200">
                                                <div className="p-2 text-center">
                                                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider mb-1">
                                                        Custo Médio
                                                    </p>
                                                    <p className="font-bold text-sm text-slate-700">
                                                        {formatarDinheiro(
                                                            custo,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="p-2 text-center bg-white">
                                                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider mb-1">
                                                        Preço Venda
                                                    </p>
                                                    <p className="font-black text-sm text-slate-900">
                                                        {formatarDinheiro(
                                                            p.preco,
                                                        )}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`p-2 text-center ${margem > 40 ? "bg-emerald-50" : margem > 20 ? "bg-blue-50" : "bg-red-50"}`}
                                                >
                                                    <p
                                                        className={`text-[9px] uppercase font-black tracking-wider mb-1 ${margem > 40 ? "text-emerald-600" : margem > 20 ? "text-blue-600" : "text-red-600"}`}
                                                    >
                                                        Lucro ({margem}%)
                                                    </p>
                                                    <p
                                                        className={`font-black text-sm ${margem > 40 ? "text-emerald-700" : margem > 20 ? "text-blue-700" : "text-red-700"}`}
                                                    >
                                                        <TrendingUp
                                                            size={12}
                                                            className="inline mr-1"
                                                        />
                                                        {formatarDinheiro(
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
