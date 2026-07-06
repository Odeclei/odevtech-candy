// import { useState, useEffect } from "react";
// import {
//   DollarSign,
//   TrendingUp,
//   TrendingDown,
//   Plus,
//   Trash2,
//   Calendar,
//   FileText,
//   PieChart,
//   Activity,
// } from "lucide-react";
// import {
//   collection,
//   query,
//   where,
//   onSnapshot,
//   addDoc,
//   deleteDoc,
//   doc,
// } from "firebase/firestore";
// import { db } from "../../firebase";

// export default function AbaFinanceiro({
//   nomeDaLoja,
//   pedidos,
//   formatarDinheiro,
// }) {
//   const [despesas, setDespesas] = useState([]);
//   const [comandas, setComandas] = useState([]);

//   const [novaDescricao, setNovaDescricao] = useState("");
//   const [novoValor, setNovoValor] = useState("");
//   const [novaData, setNovaData] = useState(
//     new Date().toISOString().split("T")[0],
//   );
//   const [novaCategoria, setNovaCategoria] = useState("Ingredientes");
//   const [salvando, setSalvando] = useState(false);

//   // Filtros de Data
//   const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
//   const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

//   // 1. Buscar Dados Dinâmicos no Firebase
//   useEffect(() => {
//     if (!nomeDaLoja) return;
//     const qDespesas = query(
//       collection(db, "despesas"),
//       where("loja", "==", nomeDaLoja),
//     );
//     const unDespesas = onSnapshot(qDespesas, (snapshot) => {
//       setDespesas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
//     });

//     const qComandas = query(
//       collection(db, "comandas"),
//       where("loja", "==", nomeDaLoja),
//     );
//     const unComandas = onSnapshot(qComandas, (snapshot) => {
//       setComandas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
//     });

//     return () => {
//       unDespesas();
//       unComandas();
//     };
//   }, [nomeDaLoja]);

//   const cadastrarDespesa = async (e) => {
//     e.preventDefault();
//     if (!novaDescricao || !novoValor || !novaData) return;
//     setSalvando(true);
//     try {
//       await addDoc(collection(db, "despesas"), {
//         loja: nomeDaLoja,
//         descricao: novaDescricao,
//         valor: parseFloat(novoValor),
//         data: novaData,
//         categoria: novaCategoria,
//         tipo: "despesa",
//         criadoEm: new Date().toISOString(),
//       });
//       setNovaDescricao("");
//       setNovoValor("");
//     } catch (err) {
//       alert("Erro ao cadastrar despesa.");
//     } finally {
//       setSalvando(false);
//     }
//   };

//   const apagarDespesa = async (id) => {
//     if (window.confirm("Deseja realmente excluir esta despesa?")) {
//       try {
//         await deleteDoc(doc(db, "despesas", id));
//       } catch (err) {
//         alert("Erro ao excluir.");
//       }
//     }
//   };

//   // ==========================================
//   // FILTROS E CONSOLIDADO DE TRANSAÇÕES
//   // ==========================================
//   const receitasPedidos = pedidos
//     .filter((p) => p.status !== "cancelado" && p.criadoEm)
//     .filter((p) => {
//       const d = new Date(p.criadoEm);
//       return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro;
//     })
//     .map((p) => ({
//       id: p.id,
//       descricao: `Pedido - ${p.cliente}`,
//       valor: p.valorTotal || 0,
//       data: p.criadoEm.split("T")[0],
//       categoria: "Delivery / Encomenda",
//       tipo: "receita",
//     }));

//   const receitasComandas = comandas
//     .filter((c) => c.status === "fechada" || c.fechadaEm)
//     .filter((c) => {
//       const dataStr = c.fechadaEm || c.abertaEm || new Date().toISOString();
//       const d = new Date(dataStr);
//       return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro;
//     })
//     .map((c) => {
//       const total = (c.itens || []).reduce(
//         (acc, item) =>
//           acc + (item.qtd_paga || item.qtd_total || 0) * item.preco,
//         0,
//       );
//       return {
//         id: c.id,
//         descricao: `Comanda - ${c.identificador}`,
//         valor: total,
//         data: (c.fechadaEm || c.abertaEm || new Date().toISOString()).split(
//           "T",
//         )[0],
//         categoria: "Bar / Salão",
//         tipo: "receita",
//       };
//     });

//   const despesasFiltradas = despesas
//     .filter((d) => {
//       const dt = new Date(d.data + "T12:00:00");
//       return dt.getMonth() === mesFiltro && dt.getFullYear() === anoFiltro;
//     })
//     .map((d) => ({
//       id: d.id,
//       descricao: d.descricao,
//       valor: parseFloat(d.valor) || 0,
//       data: d.data,
//       categoria: d.categoria || "Outros",
//       tipo: "despesa",
//     }));

//   const transacoes = [
//     ...receitasPedidos,
//     ...receitasComandas,
//     ...despesasFiltradas,
//   ].sort((a, b) => new Date(b.data) - new Date(a.data));

//   const totalReceitas =
//     receitasPedidos.reduce((acc, t) => acc + t.valor, 0) +
//     receitasComandas.reduce((acc, t) => acc + t.valor, 0);
//   const totalDespesas = despesasFiltradas.reduce((acc, d) => acc + d.valor, 0);
//   const saldoPeriodo = totalReceitas - totalDespesas;

//   // ==========================================
//   // INTELIGÊNCIA FINANCEIRA: METAS E PROJEÇÃO
//   // ==========================================
//   const totalDespesasMes = despesasFiltradas.reduce(
//     (acc, d) => acc + d.valor,
//     0,
//   );

//   const gastosPorCategoria = despesasFiltradas.reduce((acc, d) => {
//     const cat = d.categoria || "Outros";
//     acc[cat] = (acc[cat] || 0) + d.valor;
//     return acc;
//   }, {});

//   const rankingGastos = Object.entries(gastosPorCategoria)
//     .map(([nome, valor]) => ({
//       nome,
//       valor,
//       percentual: totalDespesasMes > 0 ? (valor / totalDespesasMes) * 100 : 0,
//     }))
//     .sort((a, b) => b.valor - a.valor);

//   // Projeção Térmica baseada nos últimos 30 dias reais de atividade
//   const data30DiasAtras = new Date();
//   data30DiasAtras.setDate(data30DiasAtras.getDate() - 30);
//   const str30DiasAtras = data30DiasAtras.toISOString();

//   const receitasUltimos30 =
//     pedidos
//       .filter((p) => p.status !== "cancelado" && p.criadoEm >= str30DiasAtras)
//       .reduce((acc, p) => acc + (p.valorTotal || 0), 0) +
//     comandas
//       .filter(
//         (c) =>
//           (c.status === "fechada" || c.fechadaEm) &&
//           (c.fechadaEm || c.abertaEm) >= str30DiasAtras,
//       )
//       .reduce(
//         (acc, c) =>
//           acc +
//           (c.itens || []).reduce(
//             (sum, item) =>
//               sum + (item.qtd_paga || item.qtd_total || 0) * item.preco,
//             0,
//           ),
//         0,
//       );

//   const despesasUltimos30 = despesas
//     .filter((d) => d.data >= str30DiasAtras.split("T")[0])
//     .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

//   const mediaReceitaDiaria = receitasUltimos30 / 30;
//   const mediaDespesaDiaria = despesasUltimos30 / 30;
//   const lucroProjetado30Dias = (mediaReceitaDiaria - mediaDespesaDiaria) * 30;

//   const mesesDoAno = [
//     "Janeiro",
//     "Fevereiro",
//     "Março",
//     "Abril",
//     "Maio",
//     "Junho",
//     "Julho",
//     "Agosto",
//     "Setembro",
//     "Outubro",
//     "Novembro",
//     "Dezembro",
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-300">
//       {/* SELETOR DE DATA SUPERIOR */}
//       <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
//         <div className="flex items-center gap-2">
//           <Calendar className="text-slate-400" size={20} />
//           <span className="font-bold text-slate-700">
//             Competência de Análise:
//           </span>
//         </div>
//         <div className="flex gap-2 w-full sm:w-auto">
//           <select
//             value={mesFiltro}
//             onChange={(e) => setMesFiltro(parseInt(e.target.value))}
//             className="flex-1 sm:flex-none border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700 bg-slate-50"
//           >
//             {mesesDoAno.map((m, idx) => (
//               <option key={idx} value={idx}>
//                 {m}
//               </option>
//             ))}
//           </select>
//           <select
//             value={anoFiltro}
//             onChange={(e) => setAnoFiltro(parseInt(e.target.value))}
//             className="flex-1 sm:flex-none border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700 bg-slate-50"
//           >
//             {[2025, 2026, 2027].map((a) => (
//               <option key={a} value={a}>
//                 {a}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* METRICAS PRINCIPAIS */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
//           <div>
//             <p className="text-sm text-slate-500 mb-1">Entradas Consolidadas</p>
//             <p className="text-2xl font-black text-emerald-600">
//               {formatarDinheiro(totalReceitas)}
//             </p>
//           </div>
//           <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
//             <TrendingUp size={24} />
//           </div>
//         </div>

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
//           <div>
//             <p className="text-sm text-slate-500 mb-1">Saídas Homologadas</p>
//             <p className="text-2xl font-black text-red-500">
//               {formatarDinheiro(totalDespesas)}
//             </p>
//           </div>
//           <div className="bg-red-50 p-4 rounded-2xl text-red-500">
//             <TrendingDown size={24} />
//           </div>
//         </div>

//         <div
//           className={`rounded-3xl p-6 shadow-sm border flex justify-between items-center ${saldoPeriodo >= 0 ? "bg-white border-slate-100" : "bg-red-50/50 border-red-100"}`}
//         >
//           <div>
//             <p className="text-sm text-slate-500 mb-1">Resultado Líquido</p>
//             <p
//               className={`text-2xl font-black ${saldoPeriodo >= 0 ? "text-slate-800" : "text-red-600"}`}
//             >
//               {formatarDinheiro(saldoPeriodo)}
//             </p>
//           </div>
//           <div
//             className={`p-4 rounded-2xl ${saldoPeriodo >= 0 ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-500"}`}
//           >
//             <DollarSign size={24} />
//           </div>
//         </div>
//       </div>

//       {/* PAINÉIS DE RASTREAMENTO E PREVISÃO DE CAIXA */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* RAIO-X DAS DESPESAS */}
//         <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
//           <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
//             <PieChart className="text-pink-500" /> Distribuição Estrutural de
//             Custos
//           </h3>

//           {rankingGastos.length === 0 ? (
//             <div className="py-12 text-center text-slate-400">
//               <FileText size={40} className="mx-auto mb-2 opacity-20" />
//               <p className="italic">
//                 Nenhum custo fixo ou variável registrado.
//               </p>
//             </div>
//           ) : (
//             <div className="space-y-5">
//               {rankingGastos.map((item, index) => (
//                 <div key={item.nome} className="group">
//                   <div className="flex justify-between text-sm mb-1.5">
//                     <span className="font-bold text-slate-700 flex items-center gap-2">
//                       <span className="w-2 h-2 rounded-full bg-slate-800"></span>
//                       {item.nome}
//                     </span>
//                     <div className="text-right">
//                       <span className="font-black text-slate-800">
//                         {formatarDinheiro(item.valor)}
//                       </span>
//                       <span className="text-[10px] text-slate-400 ml-2 font-bold w-12 inline-block">
//                         {item.percentual.toFixed(1)}%
//                       </span>
//                     </div>
//                   </div>
//                   <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
//                     <div
//                       className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
//                         index === 0
//                           ? "bg-red-500"
//                           : index === 1
//                             ? "bg-orange-400"
//                             : index === 2
//                               ? "bg-amber-400"
//                               : "bg-slate-300"
//                       }`}
//                       style={{ width: `${item.percentual}%` }}
//                     ></div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* PREVISÃO FUTURA (RUNWAY) */}
//         <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-between min-h-[320px]">
//           <div className="absolute -right-10 -top-10 text-slate-800 opacity-30 pointer-events-none">
//             <TrendingUp size={180} />
//           </div>

//           <div>
//             <h3 className="text-lg font-black mb-4 flex items-center gap-2 relative z-10">
//               <Activity className="text-blue-400" /> Projeção Preditiva (+30
//               Dias)
//             </h3>
//             <p className="text-slate-400 text-xs leading-relaxed mb-6 relative z-10">
//               Média ponderada baseada nas entradas globais e custos debitados
//               nas últimas 4 semanas de operação:
//             </p>

//             <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
//               <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
//                 <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-wider">
//                   Custo Médio / Dia
//                 </p>
//                 <p className="text-xl font-black text-red-400">
//                   {formatarDinheiro(mediaDespesaDiaria)}
//                 </p>
//               </div>
//               <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
//                 <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-wider">
//                   Entrada Média / Dia
//                 </p>
//                 <p className="text-xl font-black text-emerald-400">
//                   {formatarDinheiro(mediaReceitaDiaria)}
//                 </p>
//               </div>
//             </div>
//           </div>

//           <div
//             className={`p-5 rounded-2xl border relative z-10 ${lucroProjetado30Dias >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
//           >
//             <p className="text-[10px] uppercase font-black mb-1 tracking-widest opacity-60">
//               Resultado Comercial Projetado
//             </p>
//             <div className="flex items-center justify-between">
//               <span
//                 className={`text-3xl font-black ${lucroProjetado30Dias >= 0 ? "text-emerald-400" : "text-red-400"}`}
//               >
//                 {lucroProjetado30Dias >= 0 ? "+" : ""}
//                 {formatarDinheiro(lucroProjetado30Dias)}
//               </span>
//               <span
//                 className={`text-[10px] uppercase font-black px-2 py-1 rounded ${lucroProjetado30Dias >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}
//               >
//                 {lucroProjetado30Dias >= 0 ? "Superávit" : "Déficit"}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* LANÇAMENTOS E EXTRATO CONSOLIDADO */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
//         {/* FORMULÁRIO DE ADIÇÃO DE DESPESA */}
//         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:sticky lg:top-24">
//           <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2">
//             <Plus className="text-slate-500" size={18} /> Registrar Saída Caixa
//           </h3>
//           <form onSubmit={cadastrarDespesa} className="space-y-4">
//             <div>
//               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
//                 Descrição do Item
//               </label>
//               <input
//                 type="text"
//                 required
//                 value={novaDescricao}
//                 onChange={(e) => setNovaDescricao(e.target.value)}
//                 placeholder="Ex: Compra de Matéria-Prima"
//                 className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-medium text-sm"
//               />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
//                   Valor Unitário
//                 </label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   required
//                   value={novoValor}
//                   onChange={(e) => setNovoValor(e.target.value)}
//                   placeholder="0.00"
//                   className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-bold text-sm"
//                 />
//               </div>
//               <div>
//                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
//                   Plano de Contas
//                 </label>
//                 <select
//                   value={novaCategoria}
//                   onChange={(e) => setNovaCategoria(e.target.value)}
//                   className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-bold text-sm text-slate-700 bg-white"
//                 >
//                   <option value="Ingredientes">Ingredientes</option>
//                   <option value="Folha de Pagamento">
//                     Funcionários / Pró-labore
//                   </option>
//                   <option value="Aluguel e Estrutura">Aluguel / Fixos</option>
//                   <option value="Impostos / Tributos">
//                     Impostos / Simples
//                   </option>
//                   <option value="Marketing / Anúncios">
//                     Marketing / Tráfego
//                   </option>
//                   <option value="Manutenção e Utensílios">
//                     Infra / Ferramentas
//                   </option>
//                   <option value="Outros">Outros</option>
//                 </select>
//               </div>
//             </div>

//             <div>
//               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
//                 Data Competência
//               </label>
//               <input
//                 type="date"
//                 required
//                 value={novaData}
//                 onChange={(e) => setNovaData(e.target.value)}
//                 className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-bold text-sm text-slate-700"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={salvando}
//               className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 text-sm mt-2"
//             >
//               {salvando ? "Processando..." : "Confirmar Lançamento"}
//             </button>
//           </form>
//         </div>

//         {/* HISTÓRICO COMPLETO */}
//         <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
//           <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
//             <FileText className="text-slate-400" size={20} /> Extrato Detalhado
//             de Operações
//           </h3>

//           <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
//             {transacoes.length === 0 ? (
//               <p className="text-slate-400 italic text-center py-12 text-sm">
//                 Nenhuma movimentação no período selecionado.
//               </p>
//             ) : (
//               transacoes.map((t) => (
//                 <div
//                   key={t.id}
//                   className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/60 hover:bg-slate-100/50 transition duration-200"
//                 >
//                   <div className="flex items-center gap-4">
//                     <div
//                       className={`p-3 rounded-xl ${t.tipo === "receita" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
//                     >
//                       {t.tipo === "receita" ? (
//                         <TrendingUp size={18} />
//                       ) : (
//                         <TrendingDown size={18} />
//                       )}
//                     </div>
//                     <div>
//                       <p className="font-bold text-slate-800 text-sm leading-tight">
//                         {t.descricao}
//                       </p>
//                       <div className="flex items-center gap-2 mt-1">
//                         <span className="text-[10px] font-bold text-slate-400">
//                           {t.data.split("-").reverse().join("/")}
//                         </span>
//                         <span
//                           className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
//                             t.categoria === "Bar / Salão"
//                               ? "bg-amber-100 text-amber-700"
//                               : t.categoria === "Delivery / Encomenda"
//                                 ? "bg-pink-100 text-pink-700"
//                                 : "bg-slate-100 text-slate-500"
//                           }`}
//                         >
//                           {t.categoria}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4">
//                     <p
//                       className={`font-black text-sm md:text-base ${t.tipo === "receita" ? "text-emerald-600" : "text-red-500"}`}
//                     >
//                       {t.tipo === "receita" ? "+" : "-"}{" "}
//                       {formatarDinheiro(t.valor)}
//                     </p>
//                     {t.tipo === "despesa" && (
//                       <button
//                         onClick={() => apagarDespesa(t.id)}
//                         className="text-slate-300 hover:text-red-600 transition p-2 bg-white border border-slate-200 rounded-lg shadow-sm"
//                         title="Remover Despesa"
//                       >
//                         <Trash2 size={14} />
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  FileText,
  PieChart,
  Activity,
  Printer,
  SlidersHorizontal,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaFinanceiro({
  nomeDaLoja,
  pedidos,
  formatarDinheiro,
}) {
  const [despesas, setDespesas] = useState([]);
  const [comandas, setComandas] = useState([]);

  // Controle de Sub-Abas Internas
  const [subAbaAtiva, setSubAbaAtiva] = useState("geral"); // "geral" ou "categorias"
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("Ingredientes");

  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novaData, setNovaData] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [novaCategoria, setNovaCategoria] = useState("Ingredientes");
  const [salvando, setSalvando] = useState(false);

  // Filtros de Data Globais
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!nomeDaLoja) return;
    const qDespesas = query(
      collection(db, "despesas"),
      where("loja", "==", nomeDaLoja),
    );
    const unDespesas = onSnapshot(qDespesas, (snapshot) => {
      setDespesas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qComandas = query(
      collection(db, "comandas"),
      where("loja", "==", nomeDaLoja),
    );
    const unComandas = onSnapshot(qComandas, (snapshot) => {
      setComandas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unDespesas();
      unComandas();
    };
  }, [nomeDaLoja]);

  const cadastrarDespesa = async (e) => {
    e.preventDefault();
    if (!novaDescricao || !novoValor || !novaData) return;
    setSalvando(true);
    try {
      await addDoc(collection(db, "despesas"), {
        loja: nomeDaLoja,
        descricao: novaDescricao,
        valor: parseFloat(novoValor),
        data: novaData,
        categoria: novaCategoria,
        tipo: "despesa",
        criadoEm: new Date().toISOString(),
      });
      setNovaDescricao("");
      setNovoValor("");
    } catch (err) {
      alert("Erro ao cadastrar despesa.");
    } finally {
      setSalvando(false);
    }
  };

  const apagarDespesa = async (id) => {
    if (window.confirm("Deseja realmente excluir esta despesa?")) {
      try {
        await deleteDoc(doc(db, "despesas", id));
      } catch (err) {
        alert("Erro ao excluir.");
      }
    }
  };

  // ==========================================
  // PROCESSAMENTO DAS TRANSAÇÕES (MÊS CORRENTE)
  // ==========================================
  const receitasPedidos = pedidos
    .filter((p) => p.status !== "cancelado" && p.criadoEm)
    .filter((p) => {
      const d = new Date(p.criadoEm);
      return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro;
    })
    .map((p) => ({
      id: p.id,
      descricao: `Pedido - ${p.cliente}`,
      valor: p.valorTotal || 0,
      data: p.criadoEm.split("T")[0],
      categoria: "Delivery / Encomenda",
      tipo: "receita",
    }));

  const receitasComandas = comandas
    .filter((c) => c.status === "fechada" || c.fechadaEm)
    .filter((c) => {
      const dataStr = c.fechadaEm || c.abertaEm || new Date().toISOString();
      const d = new Date(dataStr);
      return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro;
    })
    .map((c) => {
      const total = (c.itens || []).reduce(
        (acc, item) =>
          acc + (item.qtd_paga || item.qtd_total || 0) * item.preco,
        0,
      );
      return {
        id: c.id,
        descricao: `Comanda - ${c.identificador}`,
        valor: total,
        data: (c.fechadaEm || c.abertaEm || new Date().toISOString()).split(
          "T",
        )[0],
        categoria: "Bar / Salão",
        tipo: "receita",
      };
    });

  const despesasFiltradas = despesas
    .filter((d) => {
      const dt = new Date(d.data + "T12:00:00");
      return dt.getMonth() === mesFiltro && dt.getFullYear() === anoFiltro;
    })
    .map((d) => ({
      id: d.id,
      descricao: d.descricao,
      valor: parseFloat(d.valor) || 0,
      data: d.data,
      categoria: d.categoria || "Outros",
      tipo: "despesa",
    }));

  const transacoesDoMes = [
    ...receitasPedidos,
    ...receitasComandas,
    ...despesasFiltradas,
  ].sort((a, b) => new Date(b.data) - new Date(a.data));

  const totalReceitas =
    receitasPedidos.reduce((acc, t) => acc + t.valor, 0) +
    receitasComandas.reduce((acc, t) => acc + t.valor, 0);
  const totalDespesas = despesasFiltradas.reduce((acc, d) => acc + d.valor, 0);
  const saldoPeriodo = totalReceitas - totalDespesas;

  // ==========================================
  // DISTRIBUIÇÃO E PROJEÇÃO FUTURA
  // ==========================================
  const gastosPorCategoria = despesasFiltradas.reduce((acc, d) => {
    const cat = d.categoria || "Outros";
    acc[cat] = (acc[cat] || 0) + d.valor;
    return acc;
  }, {});

  const rankingGastos = Object.entries(gastosPorCategoria)
    .map(([nome, valor]) => ({
      nome,
      valor,
      percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  const data30DiasAtras = new Date();
  data30DiasAtras.setDate(data30DiasAtras.getDate() - 30);
  const str30DiasAtras = data30DiasAtras.toISOString();

  const receitasUltimos30 =
    pedidos
      .filter((p) => p.status !== "cancelado" && p.criadoEm >= str30DiasAtras)
      .reduce((acc, p) => acc + (p.valorTotal || 0), 0) +
    comandas
      .filter(
        (c) =>
          (c.status === "fechada" || c.fechadaEm) &&
          (c.fechadaEm || c.abertaEm) >= str30DiasAtras,
      )
      .reduce(
        (acc, c) =>
          acc +
          (c.itens || []).reduce(
            (sum, item) =>
              sum + (item.qtd_paga || item.qtd_total || 0) * item.preco,
            0,
          ),
        0,
      );

  const despesasUltimos30 = despesas
    .filter((d) => d.data >= str30DiasAtras.split("T")[0])
    .reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

  const mediaReceitaDiaria = receitasUltimos30 / 30;
  const mediaDespesaDiaria = despesasUltimos30 / 30;
  const lucroProjetado30Dias = (mediaReceitaDiaria - mediaDespesaDiaria) * 30;

  const mesesDoAno = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // ==========================================
  // FILTRO POR CATEGORIA ESPECÍFICA (NOVA FUNÇÃO)
  // ==========================================
  const transacoesDaCategoria = transacoesDoMes.filter(
    (t) => t.categoria === categoriaSelecionada,
  );

  const totalDaCategoria = transacoesDaCategoria.reduce(
    (acc, t) => acc + t.valor,
    0,
  );

  // ==========================================
  // EXPORTAÇÃO CORPORATIVA EM PDF (NOVA FUNÇÃO)
  // ==========================================
  const exportarRelatorioPDF = () => {
    const janelaImpressao = window.open("", "", "width=850,height=900");

    let linhasTabela = transacoesDaCategoria
      .map(
        (t) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${t.data.split("-").reverse().join("/")}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${t.descricao}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px;">
          <span style="padding: 4px 8px; rounded: 4px; font-weight: bold; background-color: ${t.tipo === "receita" ? "#ecfdf5" : "#fef2f2"}; color: ${t.tipo === "receita" ? "#065f46" : "#991b1b"};">
            ${t.tipo}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${t.tipo === "receita" ? "#059669" : "#dc2626"}">
          ${t.tipo === "receita" ? "+" : "-"} ${formatarDinheiro(t.valor)}
        </td>
      </tr>
    `,
      )
      .join("");

    if (transacoesDaCategoria.length === 0) {
      linhasTabela = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: #94a3b8; italic">Nenhum lançamento nesta categoria para o período selecionado.</td></tr>`;
    }

    let htmlRelatorio = `
      <html>
      <head>
        <title>Relatório Financeiro - ${categoriaSelecionada}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20mm; color: #1e293b; bg-color: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
          .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; }
          .meta-item { font-size: 13px; color: #64748b; } .meta-item strong { color: #0f172a; font-size: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #0f172a; color: #fff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; font-weight: bold; }
          .totalizer { text-align: right; background-color: #f1f5f9; padding: 20px; border-radius: 16px; font-size: 18px; font-weight: 900; }
          .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Extrato de Movimentação</div>
            <div style="font-size: 14px; color: #64748b; font-weight: bold; margin-top: 4px;">Filtro Especial por Plano de Contas</div>
          </div>
          <div style="text-align: right; font-weight: bold; font-size: 14px;">OdevTech Financeiro</div>
        </div>

        <div class="meta-box">
          <div class="meta-item">Categoria Analisada:< br/><strong>${categoriaSelecionada}</strong></div>
          <div class="meta-item">Competência:< br/><strong>${mesesDoAno[mesFiltro]} / ${anoFiltro}</strong></div>
          <div class="meta-item">Registros Localizados:< br/><strong>${transacoesDaCategoria.length} itens</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="border-top-left-radius: 8px;">Data</th>
              <th>Descrição do Lançamento</th>
              <th>Natureza</th>
              <th style="text-align: right; border-top-right-radius: 8px;">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>

        <div class="totalizer">
          Volume Financeiro Consolidado: <span style="color: #0f172a; margin-left: 10px;">${formatarDinheiro(totalDaCategoria)}</span>
        </div>

        <div class="footer">
          Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} | Gestão Interna Blindada.
        </div>
      </body>
      </html>
    `;

    janelaImpressao.document.write(htmlRelatorio);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    setTimeout(() => {
      janelaImpressao.print();
      janelaImpressao.close();
    }, 600);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SELETOR DE DATA SUPERIOR CRUCIAL */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-slate-400" size={20} />
          <span className="font-bold text-slate-700">
            Competência de Análise:
          </span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(parseInt(e.target.value))}
            className="flex-1 sm:flex-none border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700 bg-slate-50"
          >
            {mesesDoAno.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(parseInt(e.target.value))}
            className="flex-1 sm:flex-none border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-700 bg-slate-50"
          >
            {[2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SUB-NAVEGAÇÃO INTERNA DO FINANCEIRO */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit gap-1">
        <button
          onClick={() => setSubAbaAtiva("geral")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${subAbaAtiva === "geral" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Activity size={16} /> Visão Consolidada
        </button>
        <button
          onClick={() => setSubAbaAtiva("categorias")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${subAbaAtiva === "categorias" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          <SlidersHorizontal size={16} /> Relatórios por Categoria
        </button>
      </div>

      {/* RENDERIZAÇÃO DA SUB-ABA 1: VISÃO GERAL */}
      {subAbaAtiva === "geral" && (
        <>
          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">
                  Entradas Consolidadas
                </p>
                <p className="text-2xl font-black text-emerald-600">
                  {formatarDinheiro(totalReceitas)}
                </p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">
                  Saídas Homologadas
                </p>
                <p className="text-2xl font-black text-red-500">
                  {formatarDinheiro(totalDespesas)}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-red-500">
                <TrendingDown size={24} />
              </div>
            </div>

            <div
              className={`rounded-3xl p-6 shadow-sm border flex justify-between items-center ${saldoPeriodo >= 0 ? "bg-white border-slate-100" : "bg-red-50/50 border-red-100"}`}
            >
              <div>
                <p className="text-sm text-slate-500 mb-1">Resultado Líquido</p>
                <p
                  className={`text-2xl font-black ${saldoPeriodo >= 0 ? "text-slate-800" : "text-red-600"}`}
                >
                  {formatarDinheiro(saldoPeriodo)}
                </p>
              </div>
              <div
                className={`p-4 rounded-2xl ${saldoPeriodo >= 0 ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-500"}`}
              >
                <DollarSign size={24} />
              </div>
            </div>
          </div>

          {/* DIAGNÓSTICOS VISUAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <PieChart className="text-pink-500" /> Distribuição Estrutural
                de Custos
              </h3>
              {rankingGastos.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText size={40} className="mx-auto mb-2 opacity-20" />
                  <p className="italic">Nenhum custo registrado neste mês.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {rankingGastos.map((item, index) => (
                    <div key={item.nome}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-bold text-slate-700 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                          {item.nome}
                        </span>
                        <div className="text-right">
                          <span className="font-black text-slate-800">
                            {formatarDinheiro(item.valor)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2 font-bold w-12 inline-block">
                            {item.percentual.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-1000 ${index === 0 ? "bg-red-500" : index === 1 ? "bg-orange-400" : index === 2 ? "bg-amber-400" : "bg-slate-300"}`}
                          style={{ width: `${item.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-between min-h-[320px]">
              <div className="absolute -right-10 -top-10 text-slate-800 opacity-30 pointer-events-none">
                <TrendingUp size={180} />
              </div>
              <div>
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <Activity className="text-blue-400" /> Projeção Preditiva (+30
                  Dias)
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  Média ponderada baseada no ritmo operacional das últimas 4
                  semanas:
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] uppercase font-black text-slate-400 mb-1">
                      Custo Médio / Dia
                    </p>
                    <p className="text-xl font-black text-red-400">
                      {formatarDinheiro(mediaDespesaDiaria)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] uppercase font-black text-slate-400 mb-1">
                      Entrada Média / Dia
                    </p>
                    <p className="text-xl font-black text-emerald-400">
                      {formatarDinheiro(mediaReceitaDiaria)}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`p-5 rounded-2xl border ${lucroProjetado30Dias >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
              >
                <p className="text-[10px] uppercase font-black mb-1 opacity-60">
                  Resultado Comercial Projetado
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-3xl font-black ${lucroProjetado30Dias >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {lucroProjetado30Dias >= 0 ? "+" : ""}
                    {formatarDinheiro(lucroProjetado30Dias)}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-black px-2 py-1 rounded ${lucroProjetado30Dias >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}
                  >
                    {lucroProjetado30Dias >= 0 ? "Superávit" : "Déficit"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LANÇAMENTOS E FORMULÁRIO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:sticky lg:top-24">
              <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={18} /> Registrar Saída Caixa
              </h3>
              <form onSubmit={cadastrarDespesa} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Descrição do Item
                  </label>
                  <input
                    type="text"
                    required
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    placeholder="Ex: Matéria-Prima"
                    className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Valor
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Plano de Contas
                    </label>
                    <select
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-bold text-sm bg-white"
                    >
                      <option value="Ingredientes">Ingredientes</option>
                      <option value="Folha de Pagamento">
                        Funcionários / Pró-labore
                      </option>
                      <option value="Aluguel e Estrutura">
                        Aluguel / Fixos
                      </option>
                      <option value="Impostos / Tributos">
                        Impostos / Simples
                      </option>
                      <option value="Marketing / Anúncios">
                        Marketing / Tráfego
                      </option>
                      <option value="Manutenção e Utensílios">
                        Infra / Ferramentas
                      </option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Data Competência
                  </label>
                  <input
                    type="date"
                    required
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-xl font-bold text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 text-sm mt-2"
                >
                  {salvando ? "Processando..." : "Confirmar Lançamento"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
                <FileText size={20} /> Extrato Detalhado de Operações
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {transacoesDoMes.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-12 text-sm">
                    Nenhuma movimentação identificada.
                  </p>
                ) : (
                  transacoesDoMes.map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/60 hover:bg-slate-100/50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl ${t.tipo === "receita" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
                        >
                          {t.tipo === "receita" ? (
                            <TrendingUp size={18} />
                          ) : (
                            <TrendingDown size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">
                            {t.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              {t.data.split("-").reverse().join("/")}
                            </span>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${t.categoria.includes("Delivery") ? "bg-pink-100 text-pink-700" : t.categoria.includes("Bar") ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {t.categoria}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p
                          className={`font-black text-base ${t.tipo === "receita" ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {t.tipo === "receita" ? "+" : "-"}{" "}
                          {formatarDinheiro(t.valor)}
                        </p>
                        {t.tipo === "despesa" && (
                          <button
                            onClick={() => apagarDespesa(t.id)}
                            className="text-slate-300 hover:text-red-600 border border-slate-200 bg-white p-2 rounded-lg shadow-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* RENDERIZAÇÃO DA SUB-ABA 2: RELATÓRIOS DETALHADOS POR CATEGORIA */}
      {subAbaAtiva === "categorias" && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6 mb-6">
            <div>
              <h3 className="font-black text-xl text-slate-800">
                Filtragem Cirúrgica do Plano de Contas
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Selecione uma categoria para isolar os lançamentos e auditar a
                sociedade comercial.
              </p>
            </div>

            <button
              onClick={exportarRelatorioPDF}
              className="w-full md:w-auto bg-slate-900 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-95 shadow-md shadow-slate-900/10"
            >
              <Printer size={16} /> Exportar Relatório em PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* SELETOR DE CATEGORIA */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">
                Categoria Temática Alvo
              </label>
              <select
                value={categoriaSelecionada}
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                className="w-full border border-slate-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-slate-400 font-black text-slate-700 bg-slate-50 text-base"
              >
                <optgroup label="Canais de Entrada / Faturamento">
                  <option value="Delivery / Encomenda">
                    Delivery / Encomenda (Catálogo)
                  </option>
                  <option value="Bar / Salão">
                    Bar / Salão (Mesas/Comandas)
                  </option>
                </optgroup>
                <optgroup label="Plano de Saídas / Despesas">
                  <option value="Ingredientes">Ingredientes</option>
                  <option value="Folha de Pagamento">
                    Funcionários / Pró-labore
                  </option>
                  <option value="Aluguel e Estrutura">Aluguel / Fixos</option>
                  <option value="Impostos / Tributos">
                    Impostos / Simples
                  </option>
                  <option value="Marketing / Anúncios">
                    Marketing / Tráfego
                  </option>
                  <option value="Manutenção e Utensílios">
                    Infra / Ferramentas
                  </option>
                  <option value="Outros">Outros</option>
                </optgroup>
              </select>
            </div>

            {/* VOLUMETRIA ACUMULADA NA CATEGORIA */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex flex-col justify-center">
              <p className="text-[10px] uppercase font-black text-slate-400 mb-1">
                Volume Financeiro Acumulado
              </p>
              <p
                className={`text-2xl font-black ${categoriaSelecionada.includes("Delivery") || categoriaSelecionada.includes("Bar") ? "text-emerald-600" : "text-red-500"}`}
              >
                {formatarDinheiro(totalDaCategoria)}
              </p>
            </div>
          </div>

          {/* TABELA DE EXTRATO FILTRADO */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Data Competência</th>
                  <th className="p-4">Histórico / Descrição</th>
                  <th className="p-4">Natureza</th>
                  <th className="p-4 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-sm text-slate-700">
                {transacoesDaCategoria.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-12 text-slate-400 italic bg-slate-50/50"
                    >
                      Nenhum lançamento catalogado nesta categoria para{" "}
                      {mesesDoAno[mesFiltro]} de {anoFiltro}.
                    </td>
                  </tr>
                ) : (
                  transacoesDaCategoria.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-bold text-slate-500">
                        {t.data.split("-").reverse().join("/")}
                      </td>
                      <td className="p-4 font-black text-slate-800">
                        {t.descricao}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${t.tipo === "receita" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                        >
                          {t.tipo}
                        </span>
                      </td>
                      <td
                        className={`p-4 text-right font-black text-base ${t.tipo === "receita" ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {t.tipo === "receita" ? "+" : "-"}{" "}
                        {formatarDinheiro(t.valor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
