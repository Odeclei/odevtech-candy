// src/components/admin/AbaEventos.jsx
import React, { useState, useEffect } from "react";
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
    Plus,
    Edit,
    Trash2,
    Calendar,
    CheckCircle,
    XCircle,
    Eye,
    Save,
    X,
} from "lucide-react";

export default function AbaEventos({ nomeDaLoja }) {
    const [eventos, setEventos] = useState([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState({
        nome: "",
        dataInicio: "",
        dataFim: "",
        ativo: true,
        validadeDiaria: true,
        imprimirTickets: true, // ✅ NOVO
        tipoLeitura: "leitor_fixo", // ✅ NOVO
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!nomeDaLoja) return;
        const q = query(
            collection(db, "eventos"),
            where("loja", "==", nomeDaLoja),
            orderBy("dataInicio", "desc"),
        );
        return onSnapshot(q, (snap) => {
            setEventos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
    }, [nomeDaLoja]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nome || !form.dataInicio || !form.dataFim) {
            alert("Preencha todos os campos.");
            return;
        }
        setSalvando(true);
        try {
            const payload = {
                loja: nomeDaLoja,
                ...form,
                dataInicio: new Date(form.dataInicio).toISOString(),
                dataFim: new Date(form.dataFim).toISOString(),
                criadoEm: new Date().toISOString(),
                qtdTicketsVendidos: 0,
                valorTotalTickets: 0,
            };
            if (editandoId) {
                await updateDoc(doc(db, "eventos", editandoId), payload);
            } else {
                await addDoc(collection(db, "eventos"), payload);
            }
            setModalAberto(false);
            limparForm();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar evento.");
        } finally {
            setSalvando(false);
        }
    };

    const editarEvento = (evento) => {
        setEditandoId(evento.id);
        setForm({
            nome: evento.nome || "",
            dataInicio: evento.dataInicio ? evento.dataInicio.slice(0, 10) : "",
            dataFim: evento.dataFim ? evento.dataFim.slice(0, 10) : "",
            ativo: evento.ativo !== undefined ? evento.ativo : true,
            validadeDiaria:
                evento.validadeDiaria !== undefined
                    ? evento.validadeDiaria
                    : true,
            imprimirTickets:
                evento.imprimirTickets !== undefined
                    ? evento.imprimirTickets
                    : true,
            tipoLeitura: evento.tipoLeitura || "leitor_fixo",
        });
        setModalAberto(true);
    };

    const toggleAtivo = async (id, ativo) => {
        try {
            await updateDoc(doc(db, "eventos", id), { ativo: !ativo });
        } catch (error) {
            console.error(error);
            alert("Erro ao alterar status.");
        }
    };

    const limparForm = () => {
        setEditandoId(null);
        setForm({
            nome: "",
            dataInicio: "",
            dataFim: "",
            ativo: true,
            validadeDiaria: true,
            imprimirTickets: true,
            tipoLeitura: "leitor_fixo",
        });
    };

    const formatarData = (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleDateString("pt-BR");
    };

    // Mapeamento para exibição
    const leituraLabels = {
        leitor_fixo: "Leitor Fixo (USB)",
        outro_leitor: "Outro Leitor",
        celular: "Celular (QR Code)",
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                    Eventos Especiais
                </h2>
                <button
                    onClick={() => {
                        limparForm();
                        setModalAberto(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-2xl flex items-center gap-2 shadow-lg transition"
                >
                    <Plus size={20} /> Novo Evento
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventos.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-slate-400 border border-dashed rounded-3xl">
                        <Calendar
                            size={48}
                            className="mx-auto mb-4 opacity-30"
                        />
                        <p className="font-medium">
                            Nenhum evento cadastrado ainda.
                        </p>
                    </div>
                ) : (
                    eventos.map((ev) => (
                        <div
                            key={ev.id}
                            className={`bg-white rounded-3xl shadow-sm border p-6 transition-all ${
                                ev.ativo
                                    ? "border-emerald-200 shadow-emerald-50"
                                    : "border-slate-200 opacity-70"
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-800">
                                        {ev.nome}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                        <Calendar size={14} />
                                        {formatarData(ev.dataInicio)} -{" "}
                                        {formatarData(ev.dataFim)}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                            {ev.validadeDiaria
                                                ? "🗓️ Válido apenas no dia da venda"
                                                : "📅 Válido durante todo o evento"}
                                        </span>
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                            {ev.imprimirTickets
                                                ? "🖨️ Imprime tickets"
                                                : "📱 Sem impressão"}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                            {leituraLabels[ev.tipoLeitura] ||
                                                ev.tipoLeitura}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleAtivo(ev.id, ev.ativo)}
                                    className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                                        ev.ativo
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-200 text-slate-500"
                                    }`}
                                >
                                    {ev.ativo ? (
                                        <span className="flex items-center gap-1">
                                            <CheckCircle size={12} /> Ativo
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <XCircle size={12} /> Inativo
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-4 text-sm">
                                <div>
                                    <p className="text-slate-500">
                                        Tickets vendidos
                                    </p>
                                    <p className="font-bold text-slate-800">
                                        {ev.qtdTicketsVendidos || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">
                                        Faturamento
                                    </p>
                                    <p className="font-bold text-slate-800">
                                        {new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                        }).format(ev.valorTotalTickets || 0)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => editarEvento(ev)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition"
                                >
                                    <Edit size={16} /> Editar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL CRIAR/EDITAR */}
            {modalAberto && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">
                                {editandoId ? "Editar Evento" : "Novo Evento"}
                            </h3>
                            <button
                                onClick={() => {
                                    setModalAberto(false);
                                    limparForm();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">
                                    Nome do Evento
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={form.nome}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ex: Copa Arsiper 2026"
                                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">
                                        Data Início
                                    </label>
                                    <input
                                        type="date"
                                        name="dataInicio"
                                        value={form.dataInicio}
                                        onChange={handleChange}
                                        required
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">
                                        Data Fim
                                    </label>
                                    <input
                                        type="date"
                                        name="dataFim"
                                        value={form.dataFim}
                                        onChange={handleChange}
                                        required
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border">
                                <input
                                    type="checkbox"
                                    name="validadeDiaria"
                                    checked={form.validadeDiaria}
                                    onChange={handleChange}
                                    className="w-5 h-5 accent-indigo-600"
                                />
                                <span className="font-medium text-slate-700">
                                    Ticket válido apenas no dia da venda
                                </span>
                            </label>

                            {/* NOVOS CAMPOS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border">
                                    <input
                                        type="checkbox"
                                        name="imprimirTickets"
                                        checked={form.imprimirTickets}
                                        onChange={handleChange}
                                        className="w-5 h-5 accent-indigo-600"
                                    />
                                    <span className="font-medium text-slate-700">
                                        Imprimir tickets individuais
                                    </span>
                                </label>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">
                                        Tipo de Leitura
                                    </label>
                                    <select
                                        name="tipoLeitura"
                                        value={form.tipoLeitura}
                                        onChange={handleChange}
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                                    >
                                        <option value="leitor_fixo">
                                            Leitor Fixo (USB)
                                        </option>
                                        <option value="outro_leitor">
                                            Outro Leitor
                                        </option>
                                        <option value="celular">
                                            Celular (QR Code)
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border">
                                <input
                                    type="checkbox"
                                    name="ativo"
                                    checked={form.ativo}
                                    onChange={handleChange}
                                    className="w-5 h-5 accent-indigo-600"
                                />
                                <span className="font-medium text-slate-700">
                                    Evento Ativo
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={salvando}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Save size={20} />
                                {salvando
                                    ? "Salvando..."
                                    : editandoId
                                      ? "Atualizar"
                                      : "Criar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
