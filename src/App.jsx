// src/App.jsx
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useParams,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";

import Catalogo from "./pages/Catalogo";
import Inicial from "./pages/Inicial";
import PainelAdmin from "./pages/PainelAdmin";
import Login from "./pages/Login";
import SuperAdmin from "./pages/SuperAdmin";

// O SUPER SEGURANÇA!
const RotaProtegida = ({ children }) => {
    const params = useParams();
    const nomeDaLoja = params.nomeDaLoja?.toLowerCase();
    const [carregando, setCarregando] = useState(true);
    const [autorizado, setAutorizado] = useState(false);

    // E-mail do dono da OdevTech (Substitua pelo SEU e-mail real do Google/Firebase)
    const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;

    useEffect(() => {
        const verificarPermissoes = async (user) => {
            // 1. Se não estiver logado, rua!
            if (!user) {
                setAutorizado(false);
                setCarregando(false);
                return;
            }

            // 2. É o Super Admin (OdevTech)? Passe livre para qualquer loja!
            if (user.email === SUPER_ADMIN_EMAIL) {
                console.log("Acesso concedido: Super Admin");
                setAutorizado(true);
                setCarregando(false);
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
                    console.log("Acesso concedido: Dono da Loja");
                    setAutorizado(true);
                    setCarregando(false);
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
                    console.log("Acesso concedido: Membro da Equipa");
                    setAutorizado(true);
                    setCarregando(false);
                    return;
                }

                // 5. Se chegou aqui, é um intruso. Bloqueado!
                console.warn(
                    "Acesso Negado: Utilizador sem permissão nesta loja.",
                );
                setAutorizado(false);
            } catch (erro) {
                console.error("Erro ao verificar autorização:", erro);
                setAutorizado(false);
            } finally {
                setCarregando(false);
            }
        };

        // Escuta as mudanças de login do Firebase
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            verificarPermissoes(user);
        });

        return () => unsubscribe();
    }, [nomeDaLoja]);

    if (carregando) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-slate-500">
                    A verificar credenciais de segurança...
                </p>
            </div>
        );
    }

    // Se não tem autorização, manda de volta para o Login
    if (!autorizado) {
        return <Navigate to={`/login/${nomeDaLoja}`} />;
    }

    // Se passou em todos os testes, mostra o painel!
    return children;
};

export default function App() {
    return (
        <div style={{ colorScheme: "light" }}>
            <BrowserRouter>
                <Routes>
                    {/* 1. PORTA DE ENTRADA: Site Institucional da OdevTech */}
                    <Route path="/" element={<Inicial />} />

                    {/* 2. CATÁLOGO DO CLIENTE: odevtech.com.br/crisdoces */}
                    <Route path="/:nomeDaLoja" element={<Catalogo />} />

                    {/* 3. LOGIN: odevtech.com.br/login/crisdoces */}
                    <Route path="/login/:nomeDaLoja" element={<Login />} />

                    {/* Rota para um Login Geral (opcional para o Portal do Cliente) */}
                    <Route path="/login" element={<Login />} />

                    {/* 4. SUPER ADMIN DA ODEVTECH */}
                    <Route
                        path="/superadmin"
                        element={
                            <RotaProtegida>
                                <SuperAdmin />
                            </RotaProtegida>
                        }
                    />

                    {/* 5. PAINEL DO DONO DA LOJA */}
                    <Route
                        path="/admin/:nomeDaLoja"
                        element={
                            <RotaProtegida>
                                <PainelAdmin />
                            </RotaProtegida>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </div>
    );
}
