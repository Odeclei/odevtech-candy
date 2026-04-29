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
    Package,
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
    const [produtoImagemAtual, setProdutoImagemAtual] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novoCusto, setNovoCusto] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");
    const [novaCategoria, setNovaCategoria] = useState("");
    const [novoNcm, setNovoNcm] = useState("");
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [salvandoProduto, setSalvandoProduto] = useState(false);

    // -> NOVO CONTROLE DE INSUMOS
    const [tipoCadastro, setTipoCadastro] = useState("venda"); // 'venda' ou 'insumo'
    const [novoAtivo, setNovoAtivo] = useState(true);

    const [categoriasDaLoja, setCategoriasDaLoja] = useState([]);
    const [editandoCategoriaId, setEditandoCategoriaId] = useState(null);
    const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
    const [salvandoCategoria, setSalvandoCategoria] = useState(false);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const q = query(
            collection(db, "categorias"),
            where("loja", "==", nomeDaLoja),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const catArr = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => a.ordem - b.ordem);
            setCategoriasDaLoja(catArr);
        });
        return () => unsubscribe();
    }, [nomeDaLoja]);

    const iniciarEdicaoProduto = (produto) => {
        setEditandoProdutoId(produto.id);
        setNovoNome(produto.nome);
        setNovoPreco(produto.preco || "");
        setNovoCusto(produto.custo || "");
        setNovaDescricao(produto.descricao || "");
        setNovaCategoria(produto.categoria || "");
        setNovoNcm(produto.ncm || "");
        setProdutoImagemAtual(produto.imagem || "");
        setNovoAtivo(produto.ativo !== false);
        setTipoCadastro(produto.ativo === false ? "insumo" : "venda");
        setImagemArquivo(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelarEdicaoProduto = () => {
        setEditandoProdutoId(null);
        setNovoNome("");
        setNovoPreco("");
        setNovoCusto("");
        setNovaDescricao("");
        setNovaCategoria("");
        setNovoNcm("");
        setProdutoImagemAtual("");
        setImagemArquivo(null);
        setNovoAtivo(true);
        setTipoCadastro("venda");
    };

    const salvarProduto = async (e) => {
        e.preventDefault();
        if (!novoNome || (!novoPreco && tipoCadastro === "venda"))
            return alert("Preencha o nome e o preço de venda.");
        setSalvandoProduto(true);

        try {
            let urlFinalImagem = produtoImagemAtual;
            if (imagemArquivo) {
                const imgComprimida = await imageCompression(imagemArquivo, {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                });
                const formData = new FormData();
                formData.append("file", imgComprimida);
                formData.append("upload_preset", "doceapp_preset");
                const resposta = await fetch(
                    "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
                    { method: "POST", body: formData },
                );
                const dadosCloudinary = await resposta.json();
                urlFinalImagem = dadosCloudinary.secure_url;
            }

            const dadosProduto = {
                loja: nomeDaLoja,
                nome: novoNome,
                preco:
                    tipoCadastro === "insumo" ? 0 : parseFloat(novoPreco || 0),
                custo: parseFloat(novoCusto || 0),
                descricao: novaDescricao,
                categoria: novaCategoria,
                ncm: novoNcm,
                imagem: urlFinalImagem,
                ativo: tipoCadastro === "venda" ? novoAtivo : false, // Se for insumo, NUNCA fica ativo no PDV
                atualizadoEm: new Date().toISOString(),
            };

            if (editandoProdutoId) {
                await updateDoc(
                    doc(db, "produtos", editandoProdutoId),
                    dadosProduto,
                );
                alert("Produto atualizado com sucesso!");
            } else {
                dadosProduto.estoqueAtual = 0;
                await addDoc(collection(db, "produtos"), dadosProduto);
                alert("Novo produto adicionado ao sistema!");
            }
            cancelarEdicaoProduto();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar produto.");
        } finally {
            setSalvandoProduto(false);
        }
    };

    const apagarProduto = async (id) => {
        if (window.confirm("Apagar este produto permanentemente?"))
            await deleteDoc(doc(db, "produtos", id));
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* LADO ESQUERDO: Formulário de Produto/Insumo */}
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-6">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                        {editandoProdutoId ? (
                            <Edit className="text-blue-500" />
                        ) : (
                            <Plus className="text-emerald-500" />
                        )}
                        {editandoProdutoId ? "Editar Registo" : "Novo Registo"}
                    </h2>

                    <form onSubmit={salvarProduto} className="space-y-4">
                        {/* NOVO: TIPO DE CADASTRO */}
                        <div className="bg-slate-50 p-1.5 rounded-xl flex gap-1 mb-4 border border-slate-100">
                            <button
                                type="button"
                                onClick={() => setTipoCadastro("venda")}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoCadastro === "venda" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                Produto (Cardápio)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTipoCadastro("insumo")}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoCadastro === "insumo" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                Apenas Insumo
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                {tipoCadastro === "venda"
                                    ? "Nome do Produto"
                                    : "Nome do Insumo (Ex: Farinha)"}
                            </label>
                            <input
                                type="text"
                                required
                                value={novoNome}
                                onChange={(e) => setNovoNome(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                            />
                        </div>

                        {tipoCadastro === "venda" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Preço Final
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={novoPreco}
                                        onChange={(e) =>
                                            setNovoPreco(e.target.value)
                                        }
                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none font-black text-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Custo Base (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={novoCusto}
                                        onChange={(e) =>
                                            setNovoCusto(e.target.value)
                                        }
                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-red-400 outline-none font-medium text-red-600"
                                    />
                                </div>
                            </div>
                        )}

                        {tipoCadastro === "venda" && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Categoria
                                    </label>
                                    <select
                                        value={novaCategoria}
                                        onChange={(e) =>
                                            setNovaCategoria(e.target.value)
                                        }
                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="">Sem Categoria</option>
                                        {categoriasDaLoja.map((c) => (
                                            <option key={c.id} value={c.nome}>
                                                {c.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Descrição (Cardápio)
                                    </label>
                                    <textarea
                                        value={novaDescricao}
                                        onChange={(e) =>
                                            setNovaDescricao(e.target.value)
                                        }
                                        rows="3"
                                        className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                        Foto do Produto
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setImagemArquivo(e.target.files[0])
                                        }
                                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                </div>

                                <label
                                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${novoAtivo ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={novoAtivo}
                                        onChange={(e) =>
                                            setNovoAtivo(e.target.checked)
                                        }
                                        className="w-5 h-5 accent-emerald-600"
                                    />
                                    <span
                                        className={`font-bold text-sm ${novoAtivo ? "text-emerald-800" : "text-slate-600"}`}
                                    >
                                        Visível no Catálogo para Clientes
                                    </span>
                                </label>
                            </>
                        )}

                        <div className="pt-4 flex gap-2">
                            {editandoProdutoId && (
                                <button
                                    type="button"
                                    onClick={cancelarEdicaoProduto}
                                    className="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={salvandoProduto}
                                className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 text-white transition shadow-md active:scale-95 ${salvandoProduto ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"}`}
                            >
                                <Save size={20} />{" "}
                                {salvandoProduto
                                    ? "A guardar..."
                                    : "Salvar no Sistema"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* LADO DIREITO: Lista de Produtos e Insumos */}
            <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                        <ShoppingBag className="text-indigo-500" /> Banco de
                        Produtos & Insumos
                    </h2>

                    <div className="space-y-4">
                        {produtos.length === 0 ? (
                            <p className="text-center text-slate-400 italic py-10">
                                Nenhum registo efetuado.
                            </p>
                        ) : (
                            produtos.map((produto) => {
                                const isVenda = produto.ativo !== false;
                                const lucroBruto = isVenda
                                    ? (produto.preco || 0) -
                                      (produto.custo || 0)
                                    : 0;

                                return (
                                    <div
                                        key={produto.id}
                                        className={`flex flex-col md:flex-row gap-4 p-4 border rounded-2xl transition-all hover:shadow-md ${isVenda ? "bg-white border-slate-100" : "bg-slate-50 border-slate-200 border-dashed"}`}
                                    >
                                        {isVenda && produto.imagem ? (
                                            <img
                                                src={produto.imagem}
                                                alt={produto.nome}
                                                className="w-full md:w-24 h-40 md:h-24 object-cover rounded-xl shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-full md:w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                                                {isVenda ? (
                                                    <ImageIcon size={24} />
                                                ) : (
                                                    <Package size={24} />
                                                )}
                                            </div>
                                        )}

                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                                        {produto.nome}
                                                        {!isVenda && (
                                                            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-black">
                                                                Insumo
                                                            </span>
                                                        )}
                                                    </h3>
                                                    {isVenda && (
                                                        <p className="text-xs text-slate-400 font-medium">
                                                            {produto.categoria ||
                                                                "Sem Categoria"}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            iniciarEdicaoProduto(
                                                                produto,
                                                            )
                                                        }
                                                        className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            apagarProduto(
                                                                produto.id,
                                                            )
                                                        }
                                                        className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {isVenda ? (
                                                <div className="flex flex-wrap gap-4 mt-auto border-t border-slate-100 pt-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                                                            Preço de Venda
                                                        </p>
                                                        <p className="font-black text-emerald-600">
                                                            {formatarDinheiro(
                                                                produto.preco,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                                                            Custo (Produção)
                                                        </p>
                                                        <p className="font-black text-red-500">
                                                            {formatarDinheiro(
                                                                produto.custo,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                                                            Lucro Bruto
                                                        </p>
                                                        <p className="font-black text-blue-600">
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
                                            ) : (
                                                <div className="mt-auto border-t border-slate-200 pt-3">
                                                    <p className="text-xs font-medium text-slate-500">
                                                        Este item é de uso
                                                        interno. Seu custo atual
                                                        é de{" "}
                                                        <strong className="text-slate-800">
                                                            {formatarDinheiro(
                                                                produto.custo,
                                                            )}
                                                        </strong>{" "}
                                                        e ele não aparece para
                                                        clientes.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
