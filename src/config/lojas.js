// src/config/lojas.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Cache simples para não ficar consultando toda hora
const cacheLojas = new Map();

export const getLojaConfig = async (nomeDaLoja) => {
    if (!nomeDaLoja) return null;

    // Retorna do cache se já tiver
    if (cacheLojas.has(nomeDaLoja)) {
        return cacheLojas.get(nomeDaLoja);
    }

    try {
        const lojaRef = doc(db, "lojas", nomeDaLoja);
        const snapshot = await getDoc(lojaRef);

        if (snapshot.exists()) {
            const dados = snapshot.data();
            const config = {
                nomeExibicao: dados.nomeExibicao || nomeDaLoja,
                corPrincipal: dados.corPrincipal || "pink",
                logo: dados.logo || null,
                whatsapp: dados.whatsapp || "",
                chavePix: dados.chavePix || "",
                nomePix: dados.nomePix || "",
                endereco: dados.endereco || "",
                cidade: dados.cidade || "",
                ativo: dados.ativo !== false,
            };

            cacheLojas.set(nomeDaLoja, config);
            return config;
        } else {
            // Fallback para lojas antigas ou teste
            const fallback = {
                nomeExibicao:
                    nomeDaLoja.charAt(0).toUpperCase() + nomeDaLoja.slice(1),
                corPrincipal: "pink",
                logo: null,
                whatsapp: "5547999545703",
            };
            cacheLojas.set(nomeDaLoja, fallback);
            return fallback;
        }
    } catch (error) {
        console.error("Erro ao buscar config da loja:", error);
        return null;
    }
};

// Função para limpar cache (útil em dev)
export const limparCacheLojas = () => cacheLojas.clear();
