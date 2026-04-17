import { useState } from "react";
import { UserPlus, FileText, Edit, Trash2, Users } from "lucide-react";
import {
    doc,
    updateDoc,
    addDoc,
    collection,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function AbaClientes({ nomeDaLoja, clientes }) {
    // ==========================================
    // ESTADOS: CRUD de Clientes (CRM atualizado PF/PJ)
    // ==========================================
    const [editandoClienteId, setEditandoClienteId] = useState(null);
    const [crmTipo, setCrmTipo] = useState("PF"); // "PF" ou "PJ"
    const [crmNome, setCrmNome] = useState("");
    const [crmEmail, setCrmEmail] = useState("");
    const [crmTelefone, setCrmTelefone] = useState("");
    const [crmDocumento, setCrmDocumento] = useState(""); // Serve para CPF ou CNPJ
    const [crmInscricaoEstadual, setCrmInscricaoEstadual] = useState("");
    const [crmCep, setCrmCep] = useState("");
    const [crmLogradouro, setCrmLogradouro] = useState("");
    const [crmNumero, setCrmNumero] = useState("");
    const [crmBairro, setCrmBairro] = useState("");
    const [crmCidade, setCrmCidade] = useState("");
    const [crmEstado, setCrmEstado] = useState("");
    const [salvandoCliente, setSalvandoCliente] = useState(false);

    // ==========================================
    // FUNÇÕES: CRM
    // ==========================================
    const salvarCliente = async (e) => {
        e.preventDefault();
        setSalvandoCliente(true);

        try {
            const dadosCliente = {
                loja: nomeDaLoja,
                tipo: crmTipo,
                nome: crmNome,
                email: crmEmail,
                telefone: crmTelefone,
                documento: crmDocumento,
                inscricaoEstadual: crmTipo === "PJ" ? crmInscricaoEstadual : "",
                endereco: {
                    cep: crmCep,
                    logradouro: crmLogradouro,
                    numero: crmNumero,
                    bairro: crmBairro,
                    cidade: crmCidade,
                    estado: crmEstado,
                },
                atualizadoEm: new Date().toISOString(),
            };

            if (editandoClienteId) {
                await updateDoc(
                    doc(db, "clientes", editandoClienteId),
                    dadosCliente,
                );
            } else {
                dadosCliente.totalGasto = 0;
                dadosCliente.pedidos = 0;
                await addDoc(collection(db, "clientes"), dadosCliente);
            }
            limparFormularioCliente();
            alert("Ficha do cliente salva com sucesso!");
        } catch (erro) {
            alert("Erro ao salvar o cadastro.");
        } finally {
            setSalvandoCliente(false);
        }
    };

    const prepararEdicaoCliente = (cliente) => {
        setEditandoClienteId(cliente.id);
        setCrmTipo(cliente.tipo || "PF");
        setCrmNome(cliente.nome || "");
        setCrmEmail(cliente.email || "");
        setCrmTelefone(cliente.telefone || "");
        setCrmDocumento(cliente.documento || cliente.cpf || "");
        setCrmInscricaoEstadual(cliente.inscricaoEstadual || "");

        const end = cliente.endereco || {};
        if (typeof end === "string") {
            setCrmLogradouro(end);
        } else {
            setCrmCep(end.cep || "");
            setCrmLogradouro(end.logradouro || "");
            setCrmNumero(end.numero || "");
            setCrmBairro(end.bairro || "");
            setCrmCidade(end.cidade || "");
            setCrmEstado(end.estado || "");
        }
    };

    const limparFormularioCliente = () => {
        setEditandoClienteId(null);
        setCrmTipo("PF");
        setCrmNome("");
        setCrmEmail("");
        setCrmTelefone("");
        setCrmDocumento("");
        setCrmInscricaoEstadual("");
        setCrmCep("");
        setCrmLogradouro("");
        setCrmNumero("");
        setCrmBairro("");
        setCrmCidade("");
        setCrmEstado("");
    };

    const apagarCliente = async (id) => {
        if (
            window.confirm(
                "Atenção: Tem certeza que deseja apagar o registo deste cliente?",
            )
        )
            await deleteDoc(doc(db, "clientes", id));
    };

    return (
        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulário CRM Inteligente */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                    <UserPlus className="text-pink-600" />
                    {editandoClienteId ? "Editar Ficha" : "Novo Cadastro"}
                </h3>

                {/* Seletor PF/PJ */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setCrmTipo("PF")}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${crmTipo === "PF" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Pessoa Física
                    </button>
                    <button
                        onClick={() => setCrmTipo("PJ")}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${crmTipo === "PJ" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Pessoa Jurídica
                    </button>
                </div>

                <form onSubmit={salvarCliente} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            {crmTipo === "PF"
                                ? "Nome Completo"
                                : "Razão Social"}
                        </label>
                        <input
                            type="text"
                            required
                            value={crmNome}
                            onChange={(e) => setCrmNome(e.target.value)}
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                                <FileText size={14} />{" "}
                                {crmTipo === "PF" ? "CPF" : "CNPJ"}
                            </label>
                            <input
                                type="text"
                                required
                                value={crmDocumento}
                                onChange={(e) =>
                                    setCrmDocumento(e.target.value)
                                }
                                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                        </div>
                        {crmTipo === "PJ" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Insc. Estadual
                                </label>
                                <input
                                    type="text"
                                    value={crmInscricaoEstadual}
                                    onChange={(e) =>
                                        setCrmInscricaoEstadual(e.target.value)
                                    }
                                    placeholder="Isento"
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                WhatsApp
                            </label>
                            <input
                                type="text"
                                value={crmTelefone}
                                onChange={(e) => setCrmTelefone(e.target.value)}
                                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={crmEmail}
                                onChange={(e) => setCrmEmail(e.target.value)}
                                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                            Endereço de Faturamento
                        </p>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="CEP"
                                value={crmCep}
                                onChange={(e) => setCrmCep(e.target.value)}
                                className="col-span-1 border border-slate-200 p-2 text-sm rounded-lg focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Cidade"
                                value={crmCidade}
                                onChange={(e) => setCrmCidade(e.target.value)}
                                className="col-span-2 border border-slate-200 p-2 text-sm rounded-lg focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Rua / Logradouro"
                            value={crmLogradouro}
                            onChange={(e) => setCrmLogradouro(e.target.value)}
                            className="w-full border border-slate-200 p-2 text-sm rounded-lg mb-2 focus:ring-2 focus:ring-pink-400 outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Nº"
                                value={crmNumero}
                                onChange={(e) => setCrmNumero(e.target.value)}
                                className="col-span-1 border border-slate-200 p-2 text-sm rounded-lg focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Bairro"
                                value={crmBairro}
                                onChange={(e) => setCrmBairro(e.target.value)}
                                className="col-span-2 border border-slate-200 p-2 text-sm rounded-lg focus:ring-2 focus:ring-pink-400 outline-none"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Estado (UF) Ex: SC"
                            value={crmEstado}
                            onChange={(e) => setCrmEstado(e.target.value)}
                            className="w-full border border-slate-200 p-2 text-sm rounded-lg mt-2 focus:ring-2 focus:ring-pink-400 outline-none"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            disabled={salvandoCliente}
                            className={`flex-1 text-white font-bold py-4 rounded-xl transition-all ${salvandoCliente ? "bg-slate-400" : "bg-slate-900 hover:bg-pink-600"}`}
                        >
                            {salvandoCliente
                                ? "Processando..."
                                : editandoClienteId
                                  ? "Atualizar Ficha"
                                  : "Cadastrar Cliente"}
                        </button>
                        {editandoClienteId && (
                            <button
                                type="button"
                                onClick={limparFormularioCliente}
                                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Lista de Clientes Cadastrados (Atualizada para nova estrutura) */}
            <div className="lg:col-span-2 space-y-4">
                {clientes.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                        <Users
                            size={48}
                            className="mx-auto text-slate-300 mb-4"
                        />
                        <h3 className="text-xl font-bold text-slate-600">
                            Base de Clientes Vazia
                        </h3>
                        <p className="text-slate-400 mt-2">
                            Comece a cadastrar os seus clientes para facilitar a
                            emissão de Notas Fiscais no futuro.
                        </p>
                    </div>
                ) : (
                    clientes.map((cliente) => (
                        <div
                            key={cliente.id}
                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-pink-200"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-black text-xl flex-shrink-0">
                                    {cliente.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 text-lg">
                                            {cliente.nome}
                                        </h3>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                            {cliente.tipo || "PF"}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1 flex flex-col sm:flex-row sm:gap-4">
                                        <span>
                                            <span className="font-medium">
                                                Wpp:
                                            </span>{" "}
                                            {cliente.telefone || "N/A"}
                                        </span>
                                        <span>
                                            <span className="font-medium">
                                                Doc:
                                            </span>{" "}
                                            {cliente.documento ||
                                                cliente.cpf ||
                                                "N/A"}
                                        </span>
                                    </div>
                                    {/* Tratamento para exibir endereço caso seja string antiga ou objeto novo */}
                                    {cliente.endereco &&
                                        typeof cliente.endereco ===
                                            "string" && (
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                {cliente.endereco}
                                            </p>
                                        )}
                                    {cliente.endereco &&
                                        typeof cliente.endereco ===
                                            "object" && (
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                {cliente.endereco.logradouro},{" "}
                                                {cliente.endereco.numero} -{" "}
                                                {cliente.endereco.cidade}
                                            </p>
                                        )}
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <button
                                    onClick={() =>
                                        prepararEdicaoCliente(cliente)
                                    }
                                    className="flex-1 md:flex-none text-sm font-bold px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex justify-center items-center gap-2"
                                >
                                    <Edit size={16} /> Editar
                                </button>
                                <button
                                    onClick={() => apagarCliente(cliente.id)}
                                    className="text-sm font-bold p-2 rounded-xl text-red-500 hover:bg-red-50 flex justify-center items-center transition"
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
