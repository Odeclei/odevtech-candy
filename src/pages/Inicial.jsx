import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// ==========================================
// DADOS DO CARROSSEL DE SOLUÇÕES
// ==========================================
const SOLUCOES = [
    {
        id: "transapp",
        titulo: "TransApp Frotas",
        icone: "fas fa-truck-fast",
        descricao:
            "O controle definitivo para sua transportadora. Gestão completa de viagens, controle rigoroso de despesas (pedágio, combustível, manutenção), adiantamentos e saldo de fretes.",
        features: [
            "DRE por Viagem",
            "Controle de Categorias de Gasto",
            "Histórico de Veículos",
        ],
        link: "https://transapp.odevtech.com.br",
        textoLink: "Acessar TransApp",
        cores: {
            bgGeral:
                "hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20",
            bgEfeito: "bg-blue-100 dark:bg-blue-900/30",
            bgIcone:
                "bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900/40",
            textCheck: "text-blue-500",
            textLink:
                "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300",
        },
    },
    {
        id: "confeitaria",
        titulo: "OdevTech Confeitaria",
        icone: "fas fa-cake-candles",
        descricao:
            "O sistema ideal para confeiteiras e docerias artesanais. Acabe com a confusão no WhatsApp com um catálogo digital inteligente, quadro de produção visual e fluxo de caixa.",
        features: [
            "Catálogo Direto no WhatsApp",
            "Quadro Kanban de Produção",
            "Controle de Sinais (50% Pago)",
        ],
        link: "/crisdoces",
        textoLink: "Ver Demonstração",
        cores: {
            bgGeral:
                "hover:border-pink-300 dark:hover:border-pink-500 hover:shadow-pink-900/5 dark:hover:shadow-pink-900/20",
            bgEfeito: "bg-pink-100 dark:bg-pink-900/20",
            bgIcone:
                "bg-pink-600 text-white shadow-pink-200 dark:shadow-pink-900/40",
            textCheck: "text-pink-500",
            textLink:
                "text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-300",
        },
    },
    {
        id: "bares",
        titulo: "OdevTech Bares & Restaurantes",
        icone: "fas fa-beer-mug-empty",
        descricao:
            "Operação rápida e sem atritos. O cliente pede pelo celular, a cozinha recebe direto na tela, e o caixa fatura com precisão. Controle de estoque integrado.",
        features: [
            "Autoatendimento (QR Code na Mesa)",
            "Painel de Cozinha (KDS)",
            "Ficha Técnica e Custo Real",
        ],
        link: "/barteste",
        textoLink: "Ver Demonstração",
        cores: {
            bgGeral:
                "hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-amber-900/5 dark:hover:shadow-amber-900/20",
            bgEfeito: "bg-amber-100 dark:bg-amber-900/20",
            bgIcone:
                "bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900/40",
            textCheck: "text-amber-500",
            textLink:
                "text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300",
        },
    },
];

export default function Inicial() {
    const [isDark, setIsDark] = useState(false);

    // Estados do Carrossel
    const [slideAtual, setSlideAtual] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (
            localStorage.getItem("color-theme") === "dark" ||
            (!("color-theme" in localStorage) &&
                window.matchMedia("(prefers-color-scheme: dark)").matches)
        ) {
            document.documentElement.classList.add("dark");
            setIsDark(true);
        } else {
            document.documentElement.classList.remove("dark");
            setIsDark(false);
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("color-theme", "light");
            setIsDark(false);
        } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("color-theme", "dark");
            setIsDark(true);
        }
    };

    // Auto-Play do Carrossel
    useEffect(() => {
        if (isHovered) return; // Pausa se o rato estiver em cima
        const timer = setInterval(() => {
            setSlideAtual((prev) => (prev + 1) % SOLUCOES.length);
        }, 4000); // Roda a cada 4 segundos
        return () => clearInterval(timer);
    }, [isHovered]);

    return (
        <div className="bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased transition-colors duration-300 min-h-screen">
            {/* */}
            <nav className="fixed w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-50 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* */}
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                                <i className="fas fa-layer-group text-white text-xl"></i>
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white transition-colors duration-300">
                                Odev
                                <span className="text-blue-600 dark:text-blue-500">
                                    Tech
                                </span>
                            </span>
                        </div>

                        {/* */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a
                                href="#solucoes"
                                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors"
                            >
                                Nossas Soluções
                            </a>
                            <a
                                href="#sobre"
                                className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium transition-colors"
                            >
                                Como Funciona
                            </a>

                            <button
                                onClick={toggleTheme}
                                type="button"
                                className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none rounded-lg text-lg p-2.5 transition-colors"
                            >
                                {isDark ? (
                                    <i className="fas fa-sun"></i>
                                ) : (
                                    <i className="fas fa-moon"></i>
                                )}
                            </button>

                            <Link
                                to="/crisdoces"
                                className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold hover:text-pink-800 dark:hover:text-pink-300 transition-colors relative z-10"
                            >
                                Ver Demonstração{" "}
                                <i className="fas fa-arrow-right text-sm"></i>
                            </Link>
                        </div>

                        {/* */}
                        <div className="md:hidden flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                type="button"
                                className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none rounded-lg text-lg p-2.5 transition-colors"
                            >
                                {isDark ? (
                                    <i className="fas fa-sun"></i>
                                ) : (
                                    <i className="fas fa-moon"></i>
                                )}
                            </button>
                            <button className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none transition-colors">
                                <i className="fas fa-bars text-2xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* */}
            <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-3xl -z-10 transition-colors duration-300"></div>

                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 text-blue-700 dark:text-blue-400 font-medium text-sm mb-8 transition-colors duration-300">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 dark:bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 dark:bg-blue-400"></span>
                        </span>
                        Sistemas modulares para a sua empresa
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6 transition-colors duration-300">
                        Gestão inteligente para{" "}
                        <br className="hidden md:block" />
                        <span className="text-blue-600 dark:text-blue-500">
                            operações que não param.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
                        Abandone planilhas confusas e cadernos. A OdevTech
                        constrói o ecossistema tecnológico personalizado para
                        sua empresa <b>Evoluir</b>.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="#solucoes"
                            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            Conhecer Soluções{" "}
                            <i className="fas fa-arrow-right"></i>
                        </a>
                        <a
                            href="https://wa.me/5547999545703"
                            className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fab fa-whatsapp text-green-500 text-xl"></i>
                            Falar com Consultor
                        </a>
                    </div>
                </div>
            </section>

            {/* */}
            <section
                id="solucoes"
                className="py-20 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900 transition-colors duration-300"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">
                            Escolha seu Módulo
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto transition-colors duration-300">
                            Nossos sistemas funcionam de forma independente.
                            Você assina apenas o que precisa hoje e expande
                            quando quiser.
                        </p>
                    </div>

                    {/* Janela de Exibição do Carrossel */}
                    <div
                        className="overflow-hidden relative w-full max-w-4xl mx-auto pb-10"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <div
                            className="flex transition-transform duration-700 ease-in-out"
                            style={{
                                transform: `translateX(-${slideAtual * 100}%)`,
                            }}
                        >
                            {SOLUCOES.map((solucao) => (
                                <div
                                    className="w-full flex-shrink-0 px-2 sm:px-4"
                                    key={solucao.id}
                                >
                                    <div
                                        className={`group bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-2xl ${solucao.cores.bgGeral}`}
                                    >
                                        <div
                                            className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 ${solucao.cores.bgEfeito}`}
                                        ></div>

                                        <div
                                            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-8 relative z-10 shadow-lg ${solucao.cores.bgIcone}`}
                                        >
                                            <i className={solucao.icone}></i>
                                        </div>

                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 relative z-10 transition-colors duration-300">
                                            {solucao.titulo}
                                        </h3>

                                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed relative z-10 transition-colors duration-300">
                                            {solucao.descricao}
                                        </p>

                                        <ul className="space-y-4 mb-10 relative z-10">
                                            {solucao.features.map(
                                                (feature, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold transition-colors duration-300"
                                                    >
                                                        <i
                                                            className={`fas fa-check-circle text-xl ${solucao.cores.textCheck}`}
                                                        ></i>{" "}
                                                        {feature}
                                                    </li>
                                                ),
                                            )}
                                        </ul>

                                        {solucao.link.startsWith("http") ? (
                                            <a
                                                href={solucao.link}
                                                className={`inline-flex items-center gap-2 font-bold transition-colors relative z-10 text-lg ${solucao.cores.textLink}`}
                                            >
                                                {solucao.textoLink}{" "}
                                                <i className="fas fa-arrow-right text-sm"></i>
                                            </a>
                                        ) : (
                                            <Link
                                                to={solucao.link}
                                                className={`inline-flex items-center gap-2 font-bold transition-colors relative z-10 text-lg ${solucao.cores.textLink}`}
                                            >
                                                {solucao.textoLink}{" "}
                                                <i className="fas fa-arrow-right text-sm"></i>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controles de Navegação (Bolinhas) */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3">
                            {SOLUCOES.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSlideAtual(index)}
                                    className={`h-2.5 rounded-full transition-all duration-300 ${slideAtual === index ? "w-8 bg-blue-600 dark:bg-blue-500" : "w-2.5 bg-slate-300 dark:bg-slate-700"}`}
                                    aria-label={`Ir para slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* */}
            <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-layer-group text-blue-500 text-xl"></i>
                        <span className="text-xl font-bold text-white">
                            OdevTech
                        </span>
                    </div>
                    <p className="text-sm text-slate-400">
                        © 2026 OdevTech Sistemas. Todos os direitos reservados.
                    </p>
                    <div className="flex gap-4">
                        <a
                            href="#"
                            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                        >
                            <i className="fab fa-linkedin-in"></i>
                        </a>
                        <a
                            href="https://wa.me/5547999545703"
                            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
                        >
                            <i className="fab fa-whatsapp"></i>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
