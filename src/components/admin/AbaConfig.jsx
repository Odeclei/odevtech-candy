import { useState, useEffect } from "react";
import {
    Save,
    Building2,
    CreditCard,
    ShieldAlert,
    Image as ImageIcon,
    Trash2,
} from "lucide-react";
import { doc, setDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import imageCompression from "browser-image-compression";

export default function AbaConfiguracoes({
    nomeDaLoja,
    configLoja,
    setConfigLoja,
    membrosEquipe,
}) {
    const [abaConfig, setAbaConfig] = useState("empresa");

    // Estados Locais
    const [editNomeExibicao, setEditNomeExibicao] = useState(
        configLoja?.nomeExibicao || "",
    );
    const [editWhatsapp, setEditWhatsapp] = useState(
        configLoja?.whatsapp || "",
    );
    const [editRazaoSocial, setEditRazaoSocial] = useState(
        configLoja?.razaoSocial || "",
    );
    const [editCnpj, setEditCnpj] = useState(configLoja?.cnpj || "");
    const [editCep, setEditCep] = useState(configLoja?.cep || "");
    const [editLogradouro, setEditLogradouro] = useState(
        configLoja?.logradouro || "",
    );
    const [editNumero, setEditNumero] = useState(configLoja?.numero || "");
    const [editBairro, setEditBairro] = useState(configLoja?.bairro || "");
    const [editCidade, setEditCidade] = useState(configLoja?.cidade || "");
    const [editEstado, setEditEstado] = useState(configLoja?.estado || "");
    const [editChavePix, setEditChavePix] = useState(
        configLoja?.chavePix || "",
    );
    const [editNomePix, setEditNomePix] = useState(configLoja?.nomePix || "");
    const [logoArquivo, setLogoArquivo] = useState(null);
    const [logoAtual, setLogoAtual] = useState(configLoja?.logo || "");
    const [salvandoConfig, setSalvandoConfig] = useState(false);

    // Estados de Equipe
    const [novoMembroNome, setNovoMembroNome] = useState("");
    const [novoMembroEmail, setNovoMembroEmail] = useState("");
    const [novoMembroRole, setNovoMembroRole] = useState("garcom");
    const [salvandoMembro, setSalvandoMembro] = useState(false);

    useEffect(() => {
        if (configLoja) {
            setEditNomeExibicao(configLoja.nomeExibicao || "");
            setEditWhatsapp(configLoja.whatsapp || "");
            setEditRazaoSocial(configLoja.razaoSocial || "");
            setEditCnpj(configLoja.cnpj || "");
            setEditCep(configLoja.cep || "");
            setEditLogradouro(configLoja.logradouro || "");
            setEditNumero(configLoja.numero || "");
            setEditBairro(configLoja.bairro || "");
            setEditCidade(configLoja.cidade || "");
            setEditEstado(configLoja.estado || "");
            setEditChavePix(configLoja.chavePix || "");
            setEditNomePix(configLoja.nomePix || "");
            setLogoAtual(configLoja.logo || "");
        }
    }, [configLoja]);

    const salvarConfiguracoesEmpresa = async (e) => {
        e.preventDefault();
        setSalvandoConfig(true);
        try {
            let urlFinalLogo = logoAtual;
            if (logoArquivo) {
                const imgComprimida = await imageCompression(logoArquivo, {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                });
                const formData = new FormData();
                formData.append("file", imgComprimida);
                formData.append("upload_preset", "doceapp_preset");
                const resposta = await fetch(
                    "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
                    { method: "POST", body: formData },
                );
                urlFinalLogo = (await resposta.json()).secure_url;
            }

            const dadosSalvar = {
                nomeExibicao: editNomeExibicao,
                whatsapp: editWhatsapp,
                logo: urlFinalLogo,
                razaoSocial: editRazaoSocial,
                cnpj: editCnpj,
                cep: editCep,
                logradouro: editLogradouro,
                numero: editNumero,
                bairro: editBairro,
                cidade: editCidade,
                estado: editEstado,
                chavePix: editChavePix,
                nomePix: editNomePix,
                ativo: true,
                atualizadoEm: new Date().toISOString(),
            };

            await setDoc(doc(db, "lojas", nomeDaLoja), dadosSalvar, {
                merge: true,
            });
            setConfigLoja((prev) => ({ ...prev, ...dadosSalvar }));
            setLogoAtual(urlFinalLogo);
            alert("Configurações salvas!");
        } catch (erro) {
            alert("Erro ao salvar as configurações.");
        } finally {
            setSalvandoConfig(false);
        }
    };

    const adicionarMembroEquipe = async (e) => {
        e.preventDefault();
        setSalvandoMembro(true);
        try {
            await addDoc(collection(db, "equipe"), {
                loja: nomeDaLoja,
                nome: novoMembroNome,
                email: novoMembroEmail.toLowerCase(),
                role: novoMembroRole,
                criadoEm: new Date().toISOString(),
            });
            setNovoMembroNome("");
            setNovoMembroEmail("");
            setNovoMembroRole("garcom");
            alert("Membro adicionado à equipa!");
        } catch (erro) {
            alert("Erro ao adicionar membro.");
        } finally {
            setSalvandoMembro(false);
        }
    };

    const removerMembro = async (id) => {
        if (window.confirm("Remover o acesso deste membro?"))
            await deleteDoc(doc(db, "equipe", id));
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex gap-2 border-b border-slate-200 mb-8 pb-px overflow-x-auto">
                <button
                    onClick={() => setAbaConfig("empresa")}
                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaConfig === "empresa" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                    <Building2 size={18} className="inline mr-2" /> Dados da
                    Empresa
                </button>
                <button
                    onClick={() => setAbaConfig("pagamento")}
                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaConfig === "pagamento" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                    <CreditCard size={18} className="inline mr-2" />{" "}
                    Recebimentos
                </button>
                <button
                    onClick={() => setAbaConfig("equipe")}
                    className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaConfig === "equipe" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                    <ShieldAlert size={18} className="inline mr-2" />{" "}
                    Utilizadores e Permissões
                </button>
            </div>

            {abaConfig === "empresa" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-4xl">
                    <form
                        onSubmit={salvarConfiguracoesEmpresa}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                            {logoAtual ? (
                                <img
                                    src={logoAtual}
                                    alt="Logo"
                                    className="w-24 h-24 rounded-full object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 border-dashed flex items-center justify-center text-slate-400">
                                    <ImageIcon size={32} />
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800 mb-1">
                                    Logotipo da Empresa
                                </h3>
                                <p className="text-sm text-slate-500 mb-3">
                                    Recomendado: Imagem quadrada (JPG ou PNG).
                                </p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setLogoArquivo(e.target.files[0])
                                    }
                                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Nome de Exibição no Catálogo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editNomeExibicao}
                                    onChange={(e) =>
                                        setEditNomeExibicao(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    WhatsApp de Atendimento
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editWhatsapp}
                                    onChange={(e) =>
                                        setEditWhatsapp(e.target.value)
                                    }
                                    placeholder="554799999999"
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={salvandoConfig}
                            className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-white transition-all ${salvandoConfig ? "bg-slate-400" : "bg-slate-900 hover:bg-amber-600"}`}
                        >
                            <Save size={20} />{" "}
                            {salvandoConfig
                                ? "Salvando..."
                                : "Atualizar Cadastro da Empresa"}
                        </button>
                    </form>
                </div>
            )}

            {abaConfig === "pagamento" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-3xl">
                    <form
                        onSubmit={salvarConfiguracoesEmpresa}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Chave Pix
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editChavePix}
                                    onChange={(e) =>
                                        setEditChavePix(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Nome do Titular
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editNomePix}
                                    onChange={(e) =>
                                        setEditNomePix(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Cidade do Banco
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editCidade}
                                    onChange={(e) =>
                                        setEditCidade(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={salvandoConfig}
                            className="w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-white bg-slate-900 hover:bg-amber-600 transition-all"
                        >
                            <Save size={20} /> Salvar Dados de Pagamento
                        </button>
                    </form>
                </div>
            )}

            {abaConfig === "equipe" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm h-fit">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">
                            Novo Utilizador
                        </h3>
                        <form
                            onSubmit={adicionarMembroEquipe}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={novoMembroNome}
                                    onChange={(e) =>
                                        setNovoMembroNome(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    E-mail (Login)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={novoMembroEmail}
                                    onChange={(e) =>
                                        setNovoMembroEmail(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Nível de Acesso
                                </label>
                                <select
                                    value={novoMembroRole}
                                    onChange={(e) =>
                                        setNovoMembroRole(e.target.value)
                                    }
                                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                                >
                                    <option value="garcom">
                                        Garçom (Apenas Lançar em Mesas)
                                    </option>
                                    <option value="funcionario">
                                        Cozinha / Produção (Ver Pedidos e
                                        Kanban)
                                    </option>
                                    <option value="admin">
                                        Administrador (Acesso Total)
                                    </option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={salvandoMembro}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition"
                            >
                                Adicionar Utilizador
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 mb-6">
                            Equipa Atual
                        </h3>
                        <div className="space-y-3">
                            {membrosEquipe.length === 0 ? (
                                <p className="text-slate-500 italic">
                                    Não tem membros adicionados além de si.
                                </p>
                            ) : (
                                membrosEquipe.map((membro) => (
                                    <div
                                        key={membro.id}
                                        className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-slate-50"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                                {membro.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    {membro.nome}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {membro.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-lg border ${
                                                    membro.role === "admin"
                                                        ? "bg-red-50 text-red-600 border-red-200"
                                                        : membro.role ===
                                                            "garcom"
                                                          ? "bg-amber-50 text-amber-600 border-amber-200"
                                                          : "bg-slate-200 text-slate-600 border-slate-300"
                                                }`}
                                            >
                                                {membro.role === "admin"
                                                    ? "Admin"
                                                    : membro.role === "garcom"
                                                      ? "Garçom"
                                                      : "Cozinha"}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    removerMembro(membro.id)
                                                }
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
