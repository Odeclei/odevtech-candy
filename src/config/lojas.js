// src/config/lojas.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Cache simples para não consultar o banco repetidamente na mesma sessão
const cacheLojas = new Map();

export const getLojaConfig = async (nomeDaLoja) => {
    if (!nomeDaLoja) return null;

    // Converte para minúsculas para evitar erros de digitação (ex: CrisDoces vs crisdoces)
    const nomeBusca = nomeDaLoja.toLowerCase();

    // Retorna do cache se já tiver pesquisado esta loja antes
    if (cacheLojas.has(nomeBusca)) {
        return cacheLojas.get(nomeBusca);
    }

    try {
        const lojaRef = doc(db, "lojas", nomeBusca);
        const snapshot = await getDoc(lojaRef);

        if (snapshot.exists()) {
            const dados = snapshot.data();
            const config = {
                nomeExibicao: dados.nomeExibicao || nomeBusca,
                corPrincipal: dados.corPrincipal || "pink",
                logo: dados.logo || null,
                whatsapp: dados.whatsapp || "",
                chavePix: dados.chavePix || "",
                nomePix: dados.nomePix || "",
                endereco: dados.endereco || "",
                cidade: dados.cidade || "",
                ativo: dados.ativo !== false,
            };

            cacheLojas.set(nomeBusca, config);
            return config;
        } else {
            // CORREÇÃO: Se não existe no Firestore, retornamos null.
            // Isso permite que o Catalogo.jsx exiba o ecrã de Erro 404.
            return null;
        }
    } catch (error) {
        console.error("Erro ao buscar config da loja:", error);
        return null;
    }
};

// Função para limpar cache (útil em desenvolvimento ou após logout)
export const limparCacheLojas = () => cacheLojas.clear();
