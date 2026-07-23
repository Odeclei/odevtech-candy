// src/components/admin/AbaKanban/components/CardPedido.jsx

import {
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Package,
  Printer,
  Receipt,
  Edit,
} from "lucide-react";
import { getStatusBadge } from "../utils/kanbanHelpers.js";

export default function CardPedido({
  pedido,
  onStatusChange,
  onAbrirReceita,
  onAbrirEmissao,
  onImprimir,
  onEditarPedido,
  configLoja,
  isFuturo,
}) {
  const { label, className } = getStatusBadge(pedido.status);

  return (
    <div
      className={`p-5 rounded-2xl shadow-sm border-2 transition-all ${
        pedido.temEncomenda
          ? "border-red-400 bg-red-50"
          : "border-slate-100 bg-white"
      }`}
    >
      {pedido.temEncomenda && (
        <div className="flex items-center gap-1 text-red-700 mb-4 bg-red-200 px-3 py-1.5 rounded-lg w-fit animate-pulse border border-red-300 shadow-sm">
          <AlertTriangle size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Requer Produção (OP)
          </span>
        </div>
      )}

      <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
        <div>
          <span className="font-black text-slate-800 text-lg block">
            {pedido.cliente}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {pedido.origem}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
            {new Date(pedido.criadoEm).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {pedido.dataEntrega && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isFuturo
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              P/ {new Date(pedido.dataEntrega).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {pedido.itens.map((item, idx) => {
          const qtd = item.quantidade || item.qtd_total || 1;
          return (
            <div key={idx} className="flex flex-col group">
              <div className="text-sm text-slate-700 flex justify-between items-start">
                <div className="flex gap-2">
                  <span className="font-black text-slate-900 bg-slate-100 px-2 rounded h-fit">
                    {qtd}x
                  </span>
                  <span className="font-medium leading-tight mt-0.5">
                    {item.nome}
                  </span>
                </div>
                <button
                  onClick={() => onAbrirReceita(item.nome)}
                  className="text-amber-600 bg-amber-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Ver Receita"
                >
                  <ChefHat size={16} />
                </button>
              </div>
              {item.isKit && item.subitensSelecionados?.length > 0 && (
                <div className="ml-8 mt-1.5 border-l-2 border-slate-200 pl-3 space-y-1">
                  {item.subitensSelecionados.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="text-xs text-slate-500 font-medium flex items-center justify-between group/sub"
                    >
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <strong className="text-slate-700">
                          {sub.quantidade * qtd}x
                        </strong>{" "}
                        {sub.nome}
                      </span>
                      <button
                        onClick={() => onAbrirReceita(sub.nome)}
                        className="text-amber-600 bg-amber-50 p-1 rounded-md opacity-0 group-hover/sub:opacity-100 transition-opacity"
                        title={`Ver Receita: ${sub.nome}`}
                      >
                        <ChefHat size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {pedido.status === "agendado" && (
          <button
            onClick={() => onStatusChange(pedido.id, "em_producao")}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black shadow-md hover:bg-slate-800 transition active:scale-95"
          >
            Iniciar Preparo
          </button>
        )}
        {pedido.status === "em_producao" && (
          <button
            onClick={() => onStatusChange(pedido.id, "pronto")}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-md flex justify-center items-center gap-2"
          >
            <CheckCircle size={18} /> Marcar como Pronto
          </button>
        )}
        {pedido.status === "pronto" && (
          <>
            <button
              onClick={() => onStatusChange(pedido.id, "entregue")}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md flex justify-center items-center gap-2"
            >
              <Package size={18} /> Finalizar Entrega
            </button>
            <div className="flex flex-col gap-2 mt-1">
              {/* Botão Editar */}
              {!pedido.nfEmitida && (
                <button
                  onClick={() => onEditarPedido(pedido)}
                  className="w-full py-2.5 border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Editar Pedido
                </button>
              )}
              {/* Ações fiscais */}
              {configLoja?.modulos?.includes("fiscal") && (
                <div className="flex gap-2">
                  {!pedido.nfEmitida && (
                    <button
                      onClick={() => onAbrirEmissao(pedido)}
                      className="flex-1 py-2.5 border-2 border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Receipt size={16} /> Emitir NFC-e
                    </button>
                  )}
                  {(pedido.caminhoPdf ||
                    pedido.nfeDanfe ||
                    pedido.nfceDanfe) && (
                    <button
                      onClick={() =>
                        onImprimir(
                          pedido.caminhoPdf ||
                            pedido.nfeDanfe ||
                            pedido.nfceDanfe,
                        )
                      }
                      className="flex-1 py-2.5 border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Printer size={16} /> Imprimir Cupom
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
