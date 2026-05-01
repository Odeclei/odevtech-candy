import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Save,
  DollarSign,
  Store,
  Users,
  Trash2,
  UserPlus,
  Image as ImageIcon,
  TrendingUp,
  Settings,
} from "lucide-react";
import imageCompression from "browser-image-compression";

export default function AbaConfig({ nomeDaLoja, membrosEquipe }) {
  const [abaAtual, setAbaAtual] = useState("geral");
  const [config, setConfig] = useState({
    logo: "",
    nomeExibicao: "",
    whatsapp: "",
    cidade: "",
    chavePix: "",
    nomePix: "",
    percCustosFixos: 20,
    percImpostos: 6,
    percLucroAlvo: 30,
  });

  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Estados para a gestão da Equipa
  const [novoMembro, setNovoMembro] = useState({
    nome: "",
    email: "",
    role: "garcom",
    senha: "",
  });
  const [salvandoMembro, setSalvandoMembro] = useState(false);

  useEffect(() => {
    if (!nomeDaLoja) return;
    const carregar = async () => {
      const docRef = doc(db, "lojas", nomeDaLoja);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConfig((prev) => ({ ...prev, ...docSnap.data() }));
      }
    };
    carregar();
  }, [nomeDaLoja]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const salvarConfiguracoes = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      let urlDaFoto = config.logo;

      // Upload da imagem para o Cloudinary (se o utilizador selecionou uma nova)
      if (imagemArquivo) {
        const imagemComprimida = await imageCompression(imagemArquivo, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 800,
        });
        const formData = new FormData();
        formData.append("file", imagemComprimida);
        formData.append("upload_preset", "doceapp_preset");
        const resposta = await fetch(
          "https://api.cloudinary.com/v1_1/drm8oe5aa/image/upload",
          { method: "POST", body: formData },
        );
        urlDaFoto = (await resposta.json()).secure_url;
      }

      const ref = doc(db, "lojas", nomeDaLoja);
      const payload = {
        ...config,
        logo: urlDaFoto,
        percCustosFixos: parseFloat(config.percCustosFixos) || 0,
        percImpostos: parseFloat(config.percImpostos) || 0,
        percLucroAlvo: parseFloat(config.percLucroAlvo) || 0,
      };
      await setDoc(ref, payload, { merge: true });
      setConfig((prev) => ({ ...prev, logo: urlDaFoto }));
      setImagemArquivo(null); // Limpa o ficheiro após sucesso
      alert("Configurações atualizadas com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  };

  // Funções da Equipa (Stakeholders)
  const adicionarMembro = async (e) => {
    e.preventDefault();
    if (!novoMembro.nome || !novoMembro.email)
      return alert("Preencha o nome e email.");
    setSalvandoMembro(true);
    try {
      await addDoc(collection(db, "equipe"), {
        loja: nomeDaLoja,
        nome: novoMembro.nome,
        email: novoMembro.email,
        role: novoMembro.role,
        senha: novoMembro.senha,
        criadoEm: new Date().toISOString(),
      });
      setNovoMembro({ nome: "", email: "", role: "garcom", senha: "" });
      alert("Membro adicionado à equipa!");
    } catch (erro) {
      alert("Erro ao adicionar membro.");
    } finally {
      setSalvandoMembro(false);
    }
  };

  const removerMembro = async (id) => {
    if (window.confirm("Tem a certeza que deseja remover este acesso?")) {
      try {
        await deleteDoc(doc(db, "equipe", id));
      } catch (e) {
        alert("Erro ao remover.");
      }
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in duration-300 pb-20">
      {/* NAVEGAÇÃO POR ABAS */}
      <div className="flex gap-2 border-b border-slate-200 mb-8 pb-px overflow-x-auto">
        <button
          onClick={() => setAbaAtual("geral")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "geral" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <Store size={18} className="inline mr-2" /> Dados Básicos
        </button>
        <button
          onClick={() => setAbaAtual("recebimento")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "recebimento" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <DollarSign size={18} className="inline mr-2" /> Recebimento
        </button>
        <button
          onClick={() => setAbaAtual("markup")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "markup" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <TrendingUp size={18} className="inline mr-2" /> Precificação
        </button>
        <button
          onClick={() => setAbaAtual("equipe")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${abaAtual === "equipe" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <Users size={18} className="inline mr-2" /> Equipa e Acessos
        </button>
      </div>

      {/* FORMULÁRIO PRINCIPAL (Apanha as 3 primeiras abas) */}
      {["geral", "recebimento", "markup"].includes(abaAtual) && (
        <form onSubmit={salvarConfiguracoes} className="space-y-8">
          {/* ABA GERAL */}
          {abaAtual === "geral" && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Store className="text-slate-400" /> Dados Básicos da Loja
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* UPLOAD DE LOGO */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <ImageIcon size={14} /> Logo da Empresa
                  </label>
                  <div className="flex items-center gap-4 border p-4 rounded-xl bg-slate-50">
                    {imagemArquivo || config.logo ? (
                      <img
                        src={
                          imagemArquivo
                            ? URL.createObjectURL(imagemArquivo)
                            : config.logo
                        }
                        alt="Logo"
                        className="w-16 h-16 rounded-full object-cover border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                        <ImageIcon size={24} />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImagemArquivo(e.target.files[0])}
                      className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    Nome de Exibição (Catálogo)
                  </label>
                  <input
                    type="text"
                    name="nomeExibicao"
                    value={config.nomeExibicao}
                    onChange={handleChange}
                    className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    WhatsApp de Atendimento
                  </label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={config.whatsapp}
                    onChange={handleChange}
                    placeholder="Ex: 5547999999999"
                    className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-slate-50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    Cidade / Região
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={config.cidade}
                    onChange={handleChange}
                    placeholder="Ex: São Bento do Sul"
                    className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-slate-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA RECEBIMENTO */}
          {abaAtual === "recebimento" && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <DollarSign className="text-slate-400" /> Dados de Recebimento
                (Pix)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    Chave Pix
                  </label>
                  <input
                    type="text"
                    name="chavePix"
                    value={config.chavePix}
                    onChange={handleChange}
                    placeholder="CPF, CNPJ, Email ou Celular"
                    className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    Nome do Titular do Pix
                  </label>
                  <input
                    type="text"
                    name="nomePix"
                    value={config.nomePix}
                    onChange={handleChange}
                    placeholder="Nome que aparece no banco"
                    className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-slate-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA MARKUP */}
          {abaAtual === "markup" && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in">
              <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" /> Precificação
                Inteligente (Markup)
              </h2>
              <p className="text-sm text-slate-500 mb-8 max-w-2xl">
                Insira os percentuais do seu negócio. O sistema utilizará estes
                dados para gerar um <strong>Preço Sugerido</strong> automático
                no Cardápio.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <label className="block text-xs uppercase font-black text-slate-500 mb-3 tracking-widest">
                    Custos Fixos
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      name="percCustosFixos"
                      value={config.percCustosFixos}
                      onChange={handleChange}
                      className="w-full border border-slate-300 p-4 rounded-xl outline-none font-black text-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-800"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <label className="block text-xs uppercase font-black text-slate-500 mb-3 tracking-widest">
                    Impostos & Taxas
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      name="percImpostos"
                      value={config.percImpostos}
                      onChange={handleChange}
                      className="w-full border border-slate-300 p-4 rounded-xl outline-none font-black text-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-800"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200">
                  <label className="block text-xs uppercase font-black text-blue-600 mb-3 tracking-widest">
                    Lucro Líquido Alvo
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      name="percLucroAlvo"
                      value={config.percLucroAlvo}
                      onChange={handleChange}
                      className="w-full border border-blue-300 p-4 rounded-xl outline-none font-black text-2xl text-blue-800 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-blue-400">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTÃO SALVAR GERAL */}
          <button
            type="submit"
            disabled={salvando}
            className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
          >
            <Save size={24} />{" "}
            {salvando ? "A processar..." : "Salvar Configurações da Aba"}
          </button>
        </form>
      )}

      {/* ABA DE EQUIPA (Isolada porque usa Lógica Diferente) */}
      {abaAtual === "equipe" && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Users className="text-blue-500" /> Equipa e Acessos
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie os acessos de Administradores, Garçons e Cozinha.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulário Novo Membro */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <UserPlus size={18} /> Novo Acesso
              </h3>
              <form onSubmit={adicionarMembro} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Nome do Membro"
                  value={novoMembro.nome}
                  onChange={(e) =>
                    setNovoMembro({ ...novoMembro, nome: e.target.value })
                  }
                  className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="email"
                  required
                  placeholder="Email de Login"
                  value={novoMembro.email}
                  onChange={(e) =>
                    setNovoMembro({ ...novoMembro, email: e.target.value })
                  }
                  className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="text"
                  placeholder="Senha de Acesso"
                  value={novoMembro.senha}
                  onChange={(e) =>
                    setNovoMembro({ ...novoMembro, senha: e.target.value })
                  }
                  className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                />
                <select
                  value={novoMembro.role}
                  onChange={(e) =>
                    setNovoMembro({ ...novoMembro, role: e.target.value })
                  }
                  className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                >
                  <option value="garcom">
                    Atendente / Garçom (App Mobile)
                  </option>
                  <option value="cozinha">Cozinheiro / Produção (KDS)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
                <button
                  type="submit"
                  disabled={salvandoMembro}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition"
                >
                  {salvandoMembro ? "A adicionar..." : "Adicionar Membro"}
                </button>
              </form>
            </div>

            {/* Lista de Membros */}
            <div className="lg:col-span-2 space-y-3">
              {!membrosEquipe || membrosEquipe.length === 0 ? (
                <div className="text-center p-10 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum membro cadastrado.</p>
                </div>
              ) : (
                membrosEquipe.map((membro) => (
                  <div
                    key={membro.id}
                    className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{membro.nome}</p>
                      <p className="text-xs text-slate-500">{membro.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${membro.role === "admin" ? "bg-purple-100 text-purple-700" : membro.role === "cozinha" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {membro.role}
                      </span>
                      <button
                        onClick={() => removerMembro(membro.id)}
                        className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg"
                      >
                        <Trash2 size={16} />
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
