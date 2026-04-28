// src/hooks/useRouteProtection.js
/**
 * Hook personalizado para proteção de rotas
 * Reutilizável em múltiplos componentes
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const SUPER_ADMIN_EMAIL =
    import.meta.env.VITE_SUPER_ADMIN_EMAIL || "admin@example.com";
const TIMEOUT_VERIFICACAO = 10000; // 10 segundos

export const useRouteProtection = () => {
    const params = useParams();
    const nomeDaLoja = params.nomeDaLoja?.toLowerCase();
    const navigate = useNavigate();

    const [carregando, setCarregando] = useState(true);
    const [autorizado, setAutorizado] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        // Validar nomeDaLoja no início
        if (!nomeDaLoja) {
            setErro("Loja não especificada na URL");
            setCarregando(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            if (carregando) {
                setErro("Tempo limite excedido na verificação de credenciais");
                setCarregando(false);
                setAutorizado(false);
            }
        }, TIMEOUT_VERIFICACAO);

        const verificarPermissoes = async (user) => {
            try {
                // 1. Se não estiver logado, rua!
                if (!user) {
                    setAutorizado(false);
                    setCarregando(false);
                    return;
                }

                // 2. É o Super Admin? Passe livre para qualquer loja!
                if (user.email === SUPER_ADMIN_EMAIL) {
                    console.log("✅ Acesso concedido: Super Admin");
                    setAutorizado(true);
                    setCarregando(false);
                    clearTimeout(timeoutId);
                    return;
                }

                try {
                    // 3. É o Dono (Owner) da Loja?
                    const lojaRef = doc(db, "lojas", nomeDaLoja);
                    const lojaSnap = await getDoc(lojaRef);

                    if (
                        lojaSnap.exists() &&
                        lojaSnap.data().ownerEmail === user.email
                    ) {
                        console.log("✅ Acesso concedido: Dono da Loja");
                        setAutorizado(true);
                        setCarregando(false);
                        clearTimeout(timeoutId);
                        return;
                    }

                    // 4. É um Funcionário Convidado? (Verifica na coleção equipe)
                    const qEquipe = query(
                        collection(db, "equipe"),
                        where("loja", "==", nomeDaLoja),
                        where("email", "==", user.email),
                    );
                    const equipeSnap = await getDocs(qEquipe);

                    if (!equipeSnap.empty) {
                        console.log("✅ Acesso concedido: Membro da Equipa");
                        setAutorizado(true);
                        setCarregando(false);
                        clearTimeout(timeoutId);
                        return;
                    }

                    // 5. Se chegou aqui, é um intruso. Bloqueado!
                    console.warn(
                        "🚫 Acesso Negado: Utilizador sem permissão nesta loja",
                    );
                    setAutorizado(false);
                    setCarregando(false);
                    setErro("Você não tem permissão para acessar esta loja");
                } catch (erro) {
                    console.error("❌ Erro ao verificar autorização:", erro);
                    setAutorizado(false);
                    setErro("Erro ao verificar autorização. Tente novamente.");
                } finally {
                    clearTimeout(timeoutId);
                }
            } catch (erro) {
                console.error("❌ Erro em verificarPermissoes:", erro);
                setErro("Erro ao processar autenticação");
                setCarregando(false);
                clearTimeout(timeoutId);
            }
        };

        // Escuta as mudanças de login do Firebase
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            verificarPermissoes(user);
        });

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [nomeDaLoja, navigate]);

    return { carregando, autorizado, erro, nomeDaLoja };
};
