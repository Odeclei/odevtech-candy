import { X, ChefHat } from "lucide-react";

export default function ModalReceita({ isOpen, onClose, produto }) {
  if (!isOpen || !produto) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ChefHat className="text-amber-500" /> Receita
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <h3 className="text-2xl font-black text-slate-800 mb-4 pb-4 border-b border-slate-100">
          {produto.nome}
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {produto.fichaTecnica && produto.fichaTecnica.length > 0 ? (
            produto.fichaTecnica.map((ing, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100"
              >
                <span className="font-bold text-slate-700">
                  {ing.nome_insumo}
                </span>
                <span className="font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-lg text-sm">
                  {ing.quantidade}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">
              Nenhum ingrediente cadastrado nesta receita.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition mt-6"
        >
          Fechar Receita
        </button>
      </div>
    </div>
  );
}
