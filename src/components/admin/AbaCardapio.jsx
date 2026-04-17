import { useState } from "react";
import {
    Plus,
    Edit,
    Save,
    Trash2,
    ShoppingBag,
    Image as ImageIcon,
} from "lucide-react";
import {
    doc,
    updateDoc,
    addDoc,
    collection,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import imageCompression from "browser-image-compression";

export default function AbaCardapio({
    nomeDaLoja,
    produtos,
    formatarDinheiro,
}) {
    // Estados locais para o formulário (Movidos do PainelAdmin)
    const [editandoProdutoId, setEditandoProdutoId] = useState(null);
    const [produtoImagemAtual, setProdutoImagemAtual] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");
    const [novaCategoria, setNovaCategoria] = useState("Doces Tradicionais");
    const [novoNcm, setNovoNcm] = useState(""); // Campo fiscal
    const [imagemArquivo, setImagemArquivo] = useState(null);
    const [salvandoProduto, setSalvandoProduto] = useState(false);
    const [novoAtivo, setNovoAtivo] = useState(true);

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
                categoria: novaCategoria || "Outros",
                ncm: novoNcm,
                imagem: urlDaFoto,
                ativo: novoAtivo,
                atualizadoEm: new Date().toISOString(),
            };

            if (editandoProdutoId) {
                await updateDoc(
                    doc(db, "produtos", editandoProdutoId),
                    dadosProduto,
                );
                alert("Produto atualizado!");
            } else {
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
        setNovaDescricao(produto.descricao);
        setNovaCategoria(produto.categoria || "Doces Tradicionais");
        setNovoNcm(produto.ncm || "");
        setNovoAtivo(produto.ativo);
        setProdutoImagemAtual(produto.imagem);
        setImagemArquivo(null);
    };

    const cancelarEdicaoProduto = () => {
        setEditandoProdutoId(null);
        setNovoNome("");
        setNovoPreco("");
        setNovaDescricao("");
        setNovaCategoria("Doces Tradicionais");
        setNovoNcm("");
        setNovoAtivo(true);
        setImagemArquivo(null);
        setProdutoImagemAtual("");
    };

    const apagarProduto = async (id) => {
        if (window.confirm("Deseja mesmo apagar este doce?"))
            await deleteDoc(doc(db, "produtos", id));
    };

    const alternarStatus = async (id, statusAtual) =>
        updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });

    return (
        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulário Novo/Editar Doce */}
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
                            onChange={(e) => setNovaCategoria(e.target.value)}
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none bg-white"
                        >
                            <option value="Bolos">Bolos</option>
                            <option value="Doces Tradicionais">
                                Doces Tradicionais
                            </option>
                            <option value="Doces Finos">Doces Finos</option>
                            <option value="Gelados">Gelados</option>
                            <option value="Salgados">Salgados</option>
                            <option value="Salgadinhos">Salgadinhos</option>
                            <option value="Kits Festa">Kits Festa</option>
                            <option value="Bebidas">Bebidas</option>
                            <option value="Outros">Outros</option>
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
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Preço (R$)
                        </label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={novoPreco}
                            onChange={(e) => setNovoPreco(e.target.value)}
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
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
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
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
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
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

            {/* Lista de Produtos (Agrupada por Categoria visualmente ou apenas listada) */}
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
                            Comece a adicionar os doces da loja.
                        </p>
                    </div>
                ) : (
                    // Ordena por categoria para ficar mais bonito na lista
                    produtos
                        .sort((a, b) =>
                            (a.categoria || "").localeCompare(
                                b.categoria || "",
                            ),
                        )
                        .map((p) => (
                            <div
                                key={p.id}
                                className={`bg-white p-5 rounded-2xl border flex items-center gap-5 transition-all ${p.ativo ? "border-slate-100 shadow-sm" : "border-red-100 opacity-60 grayscale-[30%]"}`}
                            >
                                <img
                                    src={p.imagem}
                                    alt={p.nome}
                                    className="w-24 h-24 rounded-2xl object-cover bg-slate-100"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase bg-slate-100 text-slate-600">
                                            {p.categoria || "Geral"}
                                        </span>
                                        <span
                                            className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase ${p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                        >
                                            {p.ativo ? "Ativo" : "Pausado"}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-xl text-slate-800">
                                        {p.nome}
                                    </h4>
                                    <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                                        {p.descricao}
                                    </p>
                                    <p className="font-black text-pink-600 text-lg">
                                        {formatarDinheiro(p.preco)}
                                    </p>
                                </div>
                                <div className="flex flex-col md:flex-row gap-2">
                                    <button
                                        onClick={() => prepararEdicaoProduto(p)}
                                        className="text-sm font-bold px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition flex items-center gap-2"
                                    >
                                        <Edit size={16} /> Editar
                                    </button>
                                    <button
                                        onClick={() =>
                                            alternarStatus(p.id, p.ativo)
                                        }
                                        className="text-sm font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                    >
                                        {p.ativo ? "Pausar" : "Ativar"}
                                    </button>
                                    <button
                                        onClick={() => apagarProduto(p.id)}
                                        className="text-sm font-bold p-2 rounded-xl text-red-500 hover:bg-red-50 flex justify-center transition"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
