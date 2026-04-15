// src/pages/Login.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { Lock, Mail } from "lucide-react";

export default function Login() {
    const { nomeDaLoja } = useParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);

    // FUNÇÃO 1: Login Tradicional (E-mail e Senha)
    const fazerLoginEmail = async (e) => {
        e.preventDefault();
        setCarregando(true);
        setErro("");

        try {
            await signInWithEmailAndPassword(auth, email, senha);
            navigate(`/admin/${nomeDaLoja}`);
        } catch (error) {
            console.error("Erro no login:", error);
            setErro("E-mail ou palavra-passe incorretos.");
        } finally {
            setCarregando(false);
        }
    };

    // FUNÇÃO 2: Login com Google
    const fazerLoginGoogle = async () => {
        setCarregando(true);
        setErro("");
        const provider = new GoogleAuthProvider();

        try {
            await signInWithPopup(auth, provider);
            navigate(`/admin/${nomeDaLoja}`);
        } catch (error) {
            console.error("Erro no login com Google:", error);
            setErro("Acesso com Google cancelado ou falhou.");
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} />
                </div>

                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                    Acesso Restrito
                </h1>
                <p className="text-slate-500 mb-8">
                    Painel de Gestão:{" "}
                    <span className="font-bold text-pink-600 capitalize">
                        {nomeDaLoja}
                    </span>
                </p>

                {erro && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">
                        {erro}
                    </div>
                )}

                <form onSubmit={fazerLoginEmail} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            E-mail de Acesso
                        </label>
                        <div className="relative">
                            <Mail
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                size={20}
                            />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div className="text-left pb-4">
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Palavra-passe
                        </label>
                        <div className="relative">
                            <Lock
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                size={20}
                            />
                            <input
                                type="password"
                                required
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={carregando}
                        className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-lg ${carregando ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-pink-600 shadow-slate-200"}`}
                    >
                        {carregando
                            ? "A validar acesso..."
                            : "Entrar no Painel"}
                    </button>
                </form>

                {/* Divisória elegante */}
                <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="px-4 text-sm text-slate-400 font-medium">
                        OU
                    </span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Botão do Google */}
                <button
                    type="button"
                    onClick={fazerLoginGoogle}
                    disabled={carregando}
                    className="w-full py-4 rounded-2xl font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Entrar com o Google
                </button>
            </div>
        </div>
    );
}
