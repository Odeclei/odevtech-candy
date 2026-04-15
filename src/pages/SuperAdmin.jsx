// src/pages/SuperAdmin.jsx
import { useState, useEffect } from "react";
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import {
    LayoutDashboard,
    Plus,
    Store,
    User,
    Trash2,
    ExternalLink,
    TrendingUp,
    DollarSign,
    Package,
} from "lucide-react";

export default function SuperAdmin() {
    const [lojas, setLojas] = useState([]);
    const [novaLojaId, setNovaLojaId] = useState("");
    const [donoEmail, setDonoEmail] = useState("");
    const [salvando, setSalvando] = useState(false);

    // Carregar todas as lojas do sistema
    useEffect(() => {
        const q = query(collection(db, "lojas"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLojas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return unsubscribe;
    }, []);

    const criarLoja = async (e) => {
        e.preventDefault();
        if (!novaLojaId || !donoEmail) return;
        setSalvando(true);

        try {
            // Cria o documento da loja vinculando ao dono
            const slug = novaLojaId.toLowerCase().replace(/\s+/g, "-");
            await setDoc(doc(db, "lojas", slug), {
                nomeExibicao: novaLojaId,
                ownerEmail: donoEmail.toLowerCase().trim(),
                ativo: true,
                criadoEm: new Date().toISOString(),
            });

            setNovaLojaId("");
            setDonoEmail("");
            alert(`Loja ${slug} criada com sucesso!`);
        } catch (error) {
            console.error(error);
            alert("Erro ao criar loja.");
        } finally {
            setSalvando(false);
        }
    };

    const deletarLoja = async (id) => {
        if (
            window.confirm(
                `TEM CERTEZA? Isso apagará o registro da loja ${id}.`,
            )
        ) {
            await deleteDoc(doc(db, "lojas", id));
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black flex items-center gap-3">
                            <LayoutDashboard
                                className="text-blue-500"
                                size={40}
                            />
                            OdevTech{" "}
                            <span className="text-blue-500 text-lg uppercase tracking-widest font-bold">
                                Control
                            </span>
                        </h1>
                        <p className="text-slate-400 mt-2">
                            Painel de Gestão Multi-Tenant (Super Admin)
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-500">
                            Logado como:
                        </p>
                        <p className="text-blue-400 font-medium">
                            {auth.currentUser?.email}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna 1: Criar Nova Loja */}
                    <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 h-fit">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Plus className="text-blue-500" /> Nova Confeitaria
                        </h2>
                        <form onSubmit={criarLoja} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">
                                    Nome da Loja
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={novaLojaId}
                                    onChange={(e) =>
                                        setNovaLojaId(e.target.value)
                                    }
                                    placeholder="Ex: Cris Doces"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">
                                    E-mail do Dono (Owner)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={donoEmail}
                                    onChange={(e) =>
                                        setDonoEmail(e.target.value)
                                    }
                                    placeholder="exemplo@gmail.com"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button
                                disabled={salvando}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all flex justify-center items-center gap-2"
                            >
                                {salvando
                                    ? "Processando..."
                                    : "Provisionar Loja"}
                            </button>
                        </form>
                    </div>

                    {/* Coluna 2 e 3: Lista de Clientes SaaS */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Store className="text-blue-500" /> Ecossistema
                            Ativo
                        </h2>

                        {lojas.length === 0 ? (
                            <div className="bg-slate-800/50 border border-slate-700 border-dashed p-12 rounded-3xl text-center">
                                <p className="text-slate-500">
                                    Nenhuma loja provisionada ainda.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {lojas.map((loja) => (
                                    <div
                                        key={loja.id}
                                        className="bg-slate-800 p-6 rounded-3xl border border-slate-700 hover:border-blue-500/50 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white capitalize">
                                                    {loja.id}
                                                </h3>
                                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                                    <User size={14} />{" "}
                                                    {loja.ownerEmail}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    deletarLoja(loja.id)
                                                }
                                                className="text-slate-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <a
                                                href={`/${loja.id}`}
                                                target="_blank"
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-bold p-2 rounded-xl text-center flex items-center justify-center gap-1"
                                            >
                                                Catálogo{" "}
                                                <ExternalLink size={12} />
                                            </a>
                                            <a
                                                href={`/admin/${loja.id}`}
                                                className="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold p-2 rounded-xl text-center"
                                            >
                                                Painel Gestor
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
