// src/components/admin/AbaKanban/components/ModalEdicaoPedido.jsx

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Search } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";

export default function ModalEdicaoPedido({
  pedido,
  produtosMenu,
  onClose,
  onAtualizado,
}) {
  const [itens, setItens] = useState([]);
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (pedido) {
      setItens(
        pedido.itens.map((item) => ({
          ...item,
          id: item.id || `temp-${Math.random()}`,
        })),
      );
      setTaxaEntrega(pedido.taxaEntrega || 0);
      setDesconto(pedido.desconto || 0);
    }
  }, [pedido]);

  useEffect(() => {
    if (buscaProduto.length >= 2) {
      const filtrados = produtosMenu.filter((p) =>
        p.nome.toLowerCase().includes(buscaProduto.toLowerCase()),
      );
      setProdutosFiltrados(filtrados);
    } else {
      setProdutosFiltrados([]);
    }
  }, [buscaProduto, produtosMenu]);

  const adicionarProduto = (produto) => {
    const existente = itens.find((i) => i.id === produto.id);
    if (existente) {
      setItens(
        itens.map((i) =>
          i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        ),
      );
    } else {
      setItens([
        ...itens,
        {
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          qtd_total: 1,
          ncm: produto.ncm,
          cfop: produto.cfop,
          csosn: produto.csosn,
        },
      ]);
    }
    setBuscaProduto("");
    setProdutosFiltrados([]);
  };

  const removerItem = (id) => {
    setItens(itens.filter((i) => i.id !== id));
  };

  const atualizarItem = (id, campo, valor) => {
    setItens(
      itens.map((i) =>
        i.id === id ? { ...i, [campo]: parseFloat(valor) || 0 } : i,
      ),
    );
  };

  const calcularTotal = () => {
    const subtotal = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    return subtotal + taxaEntrega - desconto;
  };

  const salvarAlteracoes = async () => {
    if (!pedido) return;
    setSalvando(true);
    try {
      const total = calcularTotal();
      await updateDoc(doc(db, "pedidos", pedido.id), {
        itens: itens.map(({ id, ...rest }) => rest), // remove id temporário
        taxaEntrega,
        desconto,
        valorTotal: total,
        atualizadoEm: new Date().toISOString(),
      });
      alert("Pedido atualizado com sucesso!");
      onAtualizado?.();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      alert("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            Editar Pedido #{pedido?.id?.substring(0, 6)?.toUpperCase()}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Busca de produtos */}
        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar produto para adicionar..."
            value={buscaProduto}
            onChange={(e) => setBuscaProduto(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
          {produtosFiltrados.length > 0 && (
            <div className="absolute z-10 bg-white border rounded-xl mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
              {produtosFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => adicionarProduto(p)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between"
                >
                  <span>{p.nome}</span>
                  <span className="font-bold text-slate-600">
                    R$ {p.preco.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de itens */}
        <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
          {itens.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-slate-800">{item.nome}</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) =>
                      atualizarItem(item.id, "quantidade", e.target.value)
                    }
                    className="w-16 border p-1 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.preco}
                    onChange={(e) =>
                      atualizarItem(item.id, "preco", e.target.value)
                    }
                    className="w-24 border p-1 rounded-lg text-sm"
                  />
                  <span className="text-sm font-bold text-slate-600 self-center">
                    R$ {(item.preco * item.quantidade).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removerItem(item.id)}
                className="text-red-500 hover:bg-red-50 p-1 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Extras: taxa e desconto */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase">
              Taxa de Entrega
            </label>
            <input
              type="number"
              step="0.01"
              value={taxaEntrega}
              onChange={(e) => setTaxaEntrega(parseFloat(e.target.value) || 0)}
              className="w-full border p-2 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase">
              Desconto (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={desconto}
              onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
              className="w-full border p-2 rounded-xl"
            />
          </div>
        </div>

        {/* Total */}
        <div className="text-right text-xl font-black text-slate-800 border-t pt-4 mb-4">
          Total: R$ {calcularTotal().toFixed(2)}
        </div>

        <button
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <Save size={20} /> {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}
