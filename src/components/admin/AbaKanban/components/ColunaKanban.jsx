// src/components/admin/AbaKanban/components/ColunaKanban.jsx

import CardPedido from "./CardPedido";
import { deveAparecerNaCozinhaHoje } from "../utils/kanbanHelpers.js";

export default function ColunaKanban({
  titulo,
  statusLista,
  icone,
  corTexto,
  corHover,
  pedidos,
  onStatusChange,
  onAbrirReceita,
  onAbrirEmissao,
  onImprimir,
  onImprimirPedido,
  onEditarPedido,
  configLoja,
}) {
  return (
    <div className="bg-slate-50 p-5 rounded-3xl min-h-[70vh] border border-slate-200 flex-1 min-w-[320px]">
      <h3
        className={`font-black text-xl mb-6 flex items-center gap-2 ${corTexto}`}
      >
        {icone} {titulo}{" "}
        <span className="bg-white px-2 py-0.5 rounded-lg text-sm border shadow-sm">
          {pedidos.length}
        </span>
      </h3>
      <div className="space-y-4">
        {pedidos.map((pedido) => (
          <CardPedido
            key={pedido.id}
            pedido={pedido}
            onStatusChange={onStatusChange}
            onAbrirReceita={onAbrirReceita}
            onAbrirEmissao={onAbrirEmissao}
            onImprimir={onImprimir}
            onImprimirPedido={onImprimirPedido}
            onEditarPedido={onEditarPedido}
            configLoja={configLoja}
            isFuturo={!deveAparecerNaCozinhaHoje(pedido.dataEntrega)}
          />
        ))}
      </div>
    </div>
  );
}
