import React, { useState, useEffect } from "react";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Save,
  Trash2,
  ChefHat,
  Beaker,
  ListOrdered,
  X,
  Hammer, // Ícone para Produção
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaEstoque({ nomeDaLoja }) {
  const [abaAtual, setAbaAtual] = useState("inventario");
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [busca, setBusca] = useState("");

  // Modais
  const [modalMoviOpen, setModalMoviOpen] = useState(false);
  const [modalProducaoOpen, setModalProducaoOpen] = useState(false);

  const [prodSelecionado, setProdSelecionado] = useState(null);
  const [formMovi, setFormMovi] = useState({
    tipo: "entrada",
    quantidade: "",
    custoTotal: "",
    motivo: "",
  });
  const [qtdProduzir, setQtdProduzir] = useState(1);

  const [salvandoProducao, setSalvandoProducao] = useState(false);
  const [salvandoMovi, setSalvandoMovi] = useState(false);

  const [produtoFicha, setProdutoFicha] = useState(null);
  const [ingredientesFicha, setIngredientesFicha] = useState([]);
  const [novoIngredienteId, setNovoIngredienteId] = useState("");
  const [novaQtdIngrediente, setNovaQtdIngrediente] = useState("");
  const [salvandoFicha, setSalvandoFicha] = useState(false);

  const [modalNovoInsumoOpen, setModalNovoInsumoOpen] = useState(false);
  const [novoInsumoNome, setNovoInsumoNome] = useState("");
  const [salvandoInsumo, setSalvandoInsumo] = useState(false);

  const cadastrarInsumoSimples = async (e) => {
    e.preventDefault();
    if (!novoInsumoNome) return;
    setSalvandoInsumo(true);
    try {
      await addDoc(collection(db, "produtos"), {
        loja: nomeDaLoja,
        nome: novoInsumoNome,
        ativo: false, // <-- ISTO É O SEGREDO (Torna-o "Invisível" no Catálogo)
        controlarEstoque: true,
        estoqueAtual: 0,
        custoMedio: 0,
        categoria: "Insumos e Matéria Prima",
        criadoEm: new Date().toISOString(),
      });
      setNovoInsumoNome("");
      setModalNovoInsumoOpen(false);
      alert("Insumo cadastrado com sucesso!");
    } catch (error) {
      alert("Erro ao cadastrar insumo.");
    } finally {
      setSalvandoInsumo(false);
    }
  };

  useEffect(() => {
    if (!nomeDaLoja) return;
    const unProdutos = onSnapshot(
      query(collection(db, "produtos"), where("loja", "==", nomeDaLoja)),
      (snap) => {
        setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
    const unMovi = onSnapshot(
      query(
        collection(db, "movimentacoes_estoque"),
        where("loja", "==", nomeDaLoja),
      ),
      (snap) => {
        setMovimentacoes(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.data) - new Date(a.data)),
        );
      },
    );
    return () => {
      unProdutos();
      unMovi();
    };
  }, [nomeDaLoja]);

  const formatarDinheiro = (v) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v || 0);

  // ==========================================
  // LÓGICA DE ORDEM DE PRODUÇÃO (BATCH)
  // ==========================================
  const executarProducaoLote = async () => {
    if (!produtoFicha || qtdProduzir <= 0) return;
    setSalvandoProducao(true);

    try {
      // 1. Verificar se há stock de todos os insumos primeiro
      for (const ing of ingredientesFicha) {
        const insumoRef = doc(db, "produtos", ing.id_insumo);
        const insumoSnap = await getDoc(insumoRef);
        if (insumoSnap.exists()) {
          const stockAtual = insumoSnap.data().estoqueAtual || 0;
          const necessario = ing.quantidade * qtdProduzir;
          if (stockAtual < necessario) {
            alert(
              `❌ Falta stock de "${ing.nome_insumo}". Necessário: ${necessario}, disponível: ${stockAtual}`,
            );
            setSalvandoProducao(false);
            return;
          }
        }
      }

      // 2. Descontar Insumos e Logar
      for (const ing of ingredientesFicha) {
        const insumoRef = doc(db, "produtos", ing.id_insumo);
        const insumoSnap = await getDoc(insumoRef);
        const novoStockInsumo =
          insumoSnap.data().estoqueAtual - ing.quantidade * qtdProduzir;

        await updateDoc(insumoRef, { estoqueAtual: novoStockInsumo });
        await addDoc(collection(db, "movimentacoes_estoque"), {
          loja: nomeDaLoja,
          produtoId: ing.id_insumo,
          produtoNome: ing.nome_insumo,
          tipo: "saida",
          quantidade: ing.quantidade * qtdProduzir,
          motivo: `Produção de Lote: ${qtdProduzir}x ${produtoFicha.nome}`,
          data: new Date().toISOString(),
        });
      }

      // 3. Aumentar stock do Produto Final
      const prodRef = doc(db, "produtos", produtoFicha.id);
      const novoStockFinal = (produtoFicha.estoqueAtual || 0) + qtdProduzir;
      await updateDoc(prodRef, {
        estoqueAtual: novoStockFinal,
        controlarEstoque: true,
      });

      await addDoc(collection(db, "movimentacoes_estoque"), {
        loja: nomeDaLoja,
        produtoId: produtoFicha.id,
        produtoNome: produtoFicha.nome,
        tipo: "entrada",
        quantidade: qtdProduzir,
        motivo: "Entrada via Ordem de Produção",
        data: new Date().toISOString(),
      });

      alert(
        `✅ Sucesso! Foram produzidas ${qtdProduzir} unidades de "${produtoFicha.nome}" e os ingredientes foram baixados.`,
      );
      setModalProducaoOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar produção.");
    } finally {
      setSalvandoProducao(false);
    }
  };

  const registrarMovimentacao = async (e) => {
    e.preventDefault();
    setSalvandoMovi(true);
    try {
      const qtd = parseFloat(formMovi.quantidade);
      const estoqueAnterior = parseFloat(prodSelecionado.estoqueAtual || 0);
      let novoEstoque = estoqueAnterior;
      let novoCustoMedio = parseFloat(prodSelecionado.custoMedio || 0);

      if (formMovi.tipo === "entrada") {
        const custoTotalEntrada = parseFloat(formMovi.custoTotal);
        novoEstoque = estoqueAnterior + qtd;
        const valorEstoqueAnterior = estoqueAnterior * novoCustoMedio;
        novoCustoMedio =
          (valorEstoqueAnterior + custoTotalEntrada) / novoEstoque;

        await addDoc(collection(db, "despesas"), {
          loja: nomeDaLoja,
          descricao: `Compra de Estoque: ${prodSelecionado.nome}`,
          categoria: "Estoque e Insumos",
          valor: custoTotalEntrada,
          data: new Date().toISOString().split("T")[0],
          criadoEm: new Date().toISOString(),
        });
      } else {
        novoEstoque = estoqueAnterior - qtd;
      }

      await updateDoc(doc(db, "produtos", prodSelecionado.id), {
        estoqueAtual: novoEstoque,
        custoMedio: novoCustoMedio,
        controlarEstoque: true,
      });
      await addDoc(collection(db, "movimentacoes_estoque"), {
        loja: nomeDaLoja,
        produtoId: prodSelecionado.id,
        produtoNome: prodSelecionado.nome,
        tipo: formMovi.tipo,
        quantidade: qtd,
        estoqueAnterior,
        estoqueNovo: novoEstoque,
        motivo: formMovi.motivo || "Ajuste Manual",
        data: new Date().toISOString(),
      });

      setModalMoviOpen(false);
      setFormMovi({
        tipo: "entrada",
        quantidade: "",
        custoTotal: "",
        motivo: "",
      });
      alert("Estoque atualizado!");
    } catch (error) {
      alert("Erro ao movimentar.");
    } finally {
      setSalvandoMovi(false);
    }
  };

  const selecionarProdutoParaFicha = (prodId) => {
    const prod = produtos.find((p) => p.id === prodId);
    setProdutoFicha(prod);
    setIngredientesFicha(prod.fichaTecnica || []);
  };

  const adicionarIngredienteFicha = () => {
    if (!novoIngredienteId || !novaQtdIngrediente) return;
    const insumo = produtos.find((p) => p.id === novoIngredienteId);
    const novaLista = [
      ...ingredientesFicha,
      {
        id_insumo: insumo.id,
        nome_insumo: insumo.nome,
        quantidade: parseFloat(novaQtdIngrediente),
        custo_unitario_atual: insumo.custoMedio || 0,
      },
    ];
    setIngredientesFicha(novaLista);
    setNovoIngredienteId("");
    setNovaQtdIngrediente("");
  };

  const salvarFichaTecnica = async () => {
    setSalvandoFicha(true);
    const custoTotal = ingredientesFicha.reduce((acc, ing) => {
      const p = produtos.find((x) => x.id === ing.id_insumo);
      return acc + (p?.custoMedio || 0) * ing.quantidade;
    }, 0);
    try {
      await updateDoc(doc(db, "produtos", produtoFicha.id), {
        fichaTecnica: ingredientesFicha,
        custoMedio: custoTotal,
      });
      alert("Receita salva!");
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setSalvandoFicha(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex gap-2 border-b border-slate-200 mb-8 pb-px overflow-x-auto">
        <button
          onClick={() => setAbaAtual("inventario")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "inventario" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <Package size={18} className="inline mr-2" /> Inventário Atual
        </button>
        <button
          onClick={() => setAbaAtual("fichas")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "fichas" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <ChefHat size={18} className="inline mr-2" /> Fichas Técnicas
        </button>
        <button
          onClick={() => setAbaAtual("historico")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "historico" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <ListOrdered size={18} className="inline mr-2" /> Histórico
        </button>
      </div>

      {abaAtual === "inventario" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:w-96">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar insumo ou produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            {/* NOVO BOTÃO AQUI */}
            <button
              onClick={() => setModalNovoInsumoOpen(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition active:scale-95 w-full md:w-auto justify-center"
            >
              <Plus size={18} /> Novo Insumo Bruto
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase text-slate-500 font-bold bg-slate-50">
                  <th className="p-4 rounded-tl-xl">Insumo / Produto</th>
                  <th className="p-4 text-center">Tipo</th>
                  <th className="p-4 text-center">Stock Atual</th>
                  <th className="p-4 text-right">Custo Médio</th>
                  <th className="p-4 text-center rounded-tr-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos
                  .filter((p) =>
                    p.nome.toLowerCase().includes(busca.toLowerCase()),
                  )
                  .map((produto) => {
                    const isRec = produto.fichaTecnica?.length > 0;
                    return (
                      <tr key={produto.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold">{produto.nome}</td>
                        <td className="p-4 text-center">
                          {isRec ? (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-black">
                              RECEITA
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-black">
                              INSUMO
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-lg">
                          {produto.estoqueAtual || 0}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-600">
                          {formatarDinheiro(produto.custoMedio)}
                        </td>
                        <td className="p-4 text-center">
                          {!isRec && (
                            <button
                              onClick={() => {
                                setProdSelecionado(produto);
                                setModalMoviOpen(true);
                              }}
                              className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                            >
                              Movimentar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abaAtual === "fichas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
            <h3 className="font-black mb-4 flex items-center gap-2 text-slate-800">
              <Beaker className="text-amber-500" /> Produto Final
            </h3>
            <select
              onChange={(e) => selecionarProdutoParaFicha(e.target.value)}
              className="w-full bg-slate-50 border p-3 rounded-xl outline-none"
              value={produtoFicha?.id || ""}
            >
              <option value="" disabled>
                -- Selecionar --
              </option>
              {produtos
                .filter((p) => p.ativo !== false)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </select>
            {produtoFicha && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-black text-emerald-800 uppercase">
                    Custo de Produção
                  </p>
                  <p className="text-3xl font-black text-emerald-600">
                    {formatarDinheiro(produtoFicha.custoMedio)}
                  </p>
                </div>
                <button
                  onClick={() => setModalProducaoOpen(true)}
                  className="w-full bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-amber-700 transition flex items-center justify-center gap-2"
                >
                  <Hammer size={20} /> Produzir Lote
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            {produtoFicha ? (
              <div>
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                  <h2 className="text-2xl font-black">{produtoFicha.nome}</h2>
                  <button
                    onClick={salvarFichaTecnica}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
                  >
                    <Save size={18} /> Salvar Receita
                  </button>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border mb-6 flex gap-3">
                  <select
                    value={novoIngredienteId}
                    onChange={(e) => setNovoIngredienteId(e.target.value)}
                    className="flex-1 border p-2.5 rounded-xl outline-none"
                  >
                    <option value="" disabled>
                      Insumo...
                    </option>
                    {produtos
                      .filter((p) => p.id !== produtoFicha.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    value={novaQtdIngrediente}
                    onChange={(e) => setNovaQtdIngrediente(e.target.value)}
                    placeholder="Qtd"
                    className="w-24 border p-2.5 rounded-xl outline-none"
                  />
                  <button
                    onClick={adicionarIngredienteFicha}
                    className="bg-slate-900 text-white p-3 rounded-xl"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  {ingredientesFicha.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 border rounded-xl bg-white"
                    >
                      <p className="font-bold">
                        {ing.nome_insumo} ({ing.quantidade})
                      </p>
                      <button
                        onClick={() =>
                          setIngredientesFicha(
                            ingredientesFicha.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-red-400 bg-red-50 p-2 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <ChefHat size={48} className="mx-auto opacity-30 mb-2" />
                <p className="font-bold">
                  Selecione um item para ver a receita.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtual === "historico" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-black mb-6">Histórico de Movimentações</h3>
          <div className="space-y-3">
            {movimentacoes.slice(0, 50).map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center p-4 border rounded-2xl bg-slate-50"
              >
                <div className="flex gap-4 items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${m.tipo === "entrada" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                  >
                    {m.tipo === "entrada" ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold">{m.produtoNome}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(m.data).toLocaleString()} • {m.motivo}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-black text-lg ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}
                >
                  {m.tipo === "entrada" ? "+" : "-"}
                  {m.quantidade}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE ORDEM DE PRODUÇÃO (NOVO) */}
      {modalProducaoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Hammer className="text-amber-500" /> Nova Ordem de Produção
              </h2>
              <button
                onClick={() => setModalProducaoOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl mb-6">
              <p className="text-xs font-black text-slate-400 uppercase">
                Item a Produzir
              </p>
              <p className="text-xl font-bold text-slate-800">
                {produtoFicha.nome}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">
                  Quantidade de Lotes (Ex: 2 bolos)
                </label>
                <input
                  type="number"
                  min="1"
                  value={qtdProduzir}
                  onChange={(e) => setQtdProduzir(parseInt(e.target.value))}
                  className="w-full border-2 border-slate-200 p-4 rounded-2xl outline-none focus:border-amber-500 text-2xl font-black"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Isto irá abater automaticamente os ingredientes do stock de
                  insumos.
                </p>
              </div>
              <button
                onClick={executarProducaoLote}
                disabled={salvandoProducao}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition shadow-lg active:scale-95 disabled:opacity-50"
              >
                {salvandoProducao
                  ? "A Processar Transformação..."
                  : "Confirmar Produção e Baixar Insumos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MOVIMENTAÇÃO MANUAL */}
      {modalMoviOpen && prodSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800">
                Ajustar Stock Manual
              </h2>
              <button
                onClick={() => setModalMoviOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={registrarMovimentacao} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormMovi({
                      ...formMovi,
                      tipo: "entrada",
                    })
                  }
                  className={`p-4 border-2 rounded-xl font-bold ${formMovi.tipo === "entrada" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "text-slate-400"}`}
                >
                  ENTRADA
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormMovi({
                      ...formMovi,
                      tipo: "saida",
                    })
                  }
                  className={`p-4 border-2 rounded-xl font-bold ${formMovi.tipo === "saida" ? "border-red-500 bg-red-50 text-red-700" : "text-slate-400"}`}
                >
                  SAÍDA
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                required
                value={formMovi.quantidade}
                onChange={(e) =>
                  setFormMovi({
                    ...formMovi,
                    quantidade: e.target.value,
                  })
                }
                placeholder="Qtd"
                className="w-full border p-3 rounded-xl outline-none"
              />
              {formMovi.tipo === "entrada" && (
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formMovi.custoTotal}
                  onChange={(e) =>
                    setFormMovi({
                      ...formMovi,
                      custoTotal: e.target.value,
                    })
                  }
                  placeholder="Custo Total NF (R$)"
                  className="w-full border p-3 rounded-xl outline-none"
                />
              )}
              <input
                type="text"
                value={formMovi.motivo}
                onChange={(e) =>
                  setFormMovi({
                    ...formMovi,
                    motivo: e.target.value,
                  })
                }
                placeholder="Motivo/NF"
                className="w-full border p-3 rounded-xl outline-none"
              />
              <button
                type="submit"
                disabled={salvandoMovi}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl"
              >
                Confirmar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRAR NOVO INSUMO INVISÍVEL */}
      {modalNovoInsumoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800">
                Cadastrar Insumo Bruto
              </h2>
              <button
                onClick={() => setModalNovoInsumoOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Insumos não aparecem no catálogo público, servem apenas para a sua
              gestão de receitas e cálculo de custo.
            </p>
            <form onSubmit={cadastrarInsumoSimples} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">
                  Nome da Matéria-Prima
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Saco de Farinha de Trigo 5kg"
                  value={novoInsumoNome}
                  onChange={(e) => setNovoInsumoNome(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={salvandoInsumo}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition mt-4 disabled:opacity-50"
              >
                {salvandoInsumo ? "A salvar..." : "Gravar Insumo e Voltar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
