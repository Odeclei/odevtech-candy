// src/components/admin/Abakanban/utils/kanbanHelpers.js

export const getStatusBadge = (status) => {
  const badges = {
    aguardando_pix: "bg-slate-100 text-slate-600",
    agendado: "bg-amber-100 text-amber-700",
    em_producao: "bg-blue-100 text-blue-700",
    pronto: "bg-emerald-100 text-emerald-700",
    entregue: "bg-slate-800 text-white",
    cancelado: "bg-red-100 text-red-700",
  };
  const nomes = {
    aguardando_pix: "Aguardando Pix",
    agendado: "Agendado",
    em_producao: "Em Produção",
    pronto: "Pronto",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };
  return {
    className: badges[status] || badges.agendado,
    label: nomes[status] || status,
  };
};

export const deveAparecerNaCozinhaHoje = (dataIsoString) => {
  if (!dataIsoString) return true;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataPedido = new Date(dataIsoString);
  dataPedido.setHours(0, 0, 0, 0);
  return dataPedido <= hoje;
};
