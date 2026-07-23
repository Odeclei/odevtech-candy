import { X, Send } from "lucide-react";

export default function ModalEmissaoFiscal({
  isOpen,
  onClose,
  pedido,
  formNf,
  setFormNf,
  itensEditados,
  setItensEditados,
  emitindo,
  onSubmit,
  configLoja,
}) {
  if (!isOpen || !pedido) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            Emissão Fiscal
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Seletor NFCe / NFe */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setFormNf({ ...formNf, tipoNota: "NFCe" })}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                formNf.tipoNota === "NFCe"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cupom (NFC-e)
            </button>
            <button
              type="button"
              onClick={() => setFormNf({ ...formNf, tipoNota: "NFe" })}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                formNf.tipoNota === "NFe"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Nota (NF-e)
            </button>
          </div>

          {/* Dados básicos */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1">
              CPF / CNPJ{" "}
              {formNf.tipoNota === "NFe" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              type="text"
              required={formNf.tipoNota === "NFe"}
              value={formNf.cpf}
              onChange={(e) => setFormNf({ ...formNf, cpf: e.target.value })}
              placeholder={
                formNf.tipoNota === "NFCe" ? "Opcional" : "Apenas números"
              }
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1">
              Nome do Cliente{" "}
              {formNf.tipoNota === "NFe" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              type="text"
              required={formNf.tipoNota === "NFe"}
              value={formNf.nome}
              onChange={(e) => setFormNf({ ...formNf, nome: e.target.value })}
              placeholder={
                formNf.tipoNota === "NFCe"
                  ? "Opcional"
                  : "Nome Completo ou Razão Social"
              }
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* Campos extras para NF-e */}
          {formNf.tipoNota === "NFe" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    value={formNf.ie}
                    onChange={(e) =>
                      setFormNf({ ...formNf, ie: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Indicador IE
                  </label>
                  <select
                    value={formNf.indicadorIE || 9}
                    onChange={(e) =>
                      setFormNf({
                        ...formNf,
                        indicadorIE: parseInt(e.target.value),
                      })
                    }
                    className="w-full border p-3 rounded-xl"
                  >
                    <option value={1}>Contribuinte ICMS</option>
                    <option value={2}>Isento</option>
                    <option value={9}>Não Contribuinte</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={formNf.logradouro}
                    onChange={(e) =>
                      setFormNf({ ...formNf, logradouro: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formNf.numero}
                    onChange={(e) =>
                      setFormNf({ ...formNf, numero: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formNf.bairro}
                    onChange={(e) =>
                      setFormNf({ ...formNf, bairro: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Município
                  </label>
                  <input
                    type="text"
                    value={formNf.municipio}
                    onChange={(e) =>
                      setFormNf({ ...formNf, municipio: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength="2"
                    value={formNf.uf}
                    onChange={(e) =>
                      setFormNf({ ...formNf, uf: e.target.value.toUpperCase() })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formNf.cep}
                    onChange={(e) =>
                      setFormNf({ ...formNf, cep: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formNf.telefone}
                    onChange={(e) =>
                      setFormNf({ ...formNf, telefone: e.target.value })
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
              </div>

              {/* Edição de tributação dos itens */}
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-700 mb-3">
                  Tributação dos Itens
                </h4>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                  {itensEditados.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800">
                          {item.descricao}
                        </span>
                        <span className="text-xs text-slate-500">
                          Qtd: {item.quantidade}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase">
                            CSOSN
                          </label>
                          <input
                            type="text"
                            value={item.csosn}
                            onChange={(e) => {
                              const novos = [...itensEditados];
                              novos[idx].csosn = e.target.value;
                              setItensEditados(novos);
                            }}
                            className="w-full border p-1.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase">
                            CFOP
                          </label>
                          <input
                            type="text"
                            value={item.cfop}
                            onChange={(e) => {
                              const novos = [...itensEditados];
                              novos[idx].cfop = e.target.value;
                              setItensEditados(novos);
                            }}
                            className="w-full border p-1.5 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase">
                            PIS CST
                          </label>
                          <input
                            type="text"
                            value={item.pisCst}
                            onChange={(e) => {
                              const novos = [...itensEditados];
                              novos[idx].pisCst = e.target.value;
                              setItensEditados(novos);
                            }}
                            className="w-full border p-1.5 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase">
                            COFINS CST
                          </label>
                          <input
                            type="text"
                            value={item.cofinsCst}
                            onChange={(e) => {
                              const novos = [...itensEditados];
                              novos[idx].cofinsCst = e.target.value;
                              setItensEditados(novos);
                            }}
                            className="w-full border p-1.5 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={emitindo}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={18} />{" "}
            {emitindo
              ? "Processando SEFAZ..."
              : `Transmitir ${formNf.tipoNota}`}
          </button>
        </form>
      </div>
    </div>
  );
}
