import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function Inicial() {
    // 1. Criamos um "Estado" no React para controlar se o tema escuro está ativo
    const [isDark, setIsDark] = useState(false);

    // 2. O useEffect roda uma vez quando a página carrega para ver a preferência salva do usuário
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

    // 3. Função que roda quando clicamos no botão de trocar o tema (onClick)
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

    return (
        // Note que todos os "class" foram trocados por "className"
        <div className="bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased transition-colors duration-300 min-h-screen">
            {/* <!-- Navegação --> */}
            <nav className="fixed w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-50 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* <!-- Logo --> */}
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

                        {/* <!-- Links Desktop --> */}
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

                            {/* <!-- Botão Alternar Tema Desktop --> */}
                            <button
                                onClick={toggleTheme}
                                type="button"
                                className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none rounded-lg text-lg p-2.5 transition-colors"
                            >
                                {/* Aqui usamos um IF simples do React (Ternário): Se for dark, mostra Sol, senão mostra Lua */}
                                {isDark ? (
                                    <i className="fas fa-sun"></i>
                                ) : (
                                    <i className="fas fa-moon"></i>
                                )}
                            </button>

                            <a
                                href="https://app.odevtech.com.br"
                                className="bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md"
                            >
                                Portal do Cliente
                            </a>
                        </div>

                        {/* <!-- Menu Mobile (Sanduíche e Tema) --> */}
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

            {/* <!-- Hero Section (Dobra Principal) --> */}
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

            {/* <!-- Soluções Section --> */}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* <!-- Card TransApp --> */}
                        <div className="group bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/30 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl mb-8 relative z-10 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
                                <i className="fas fa-truck-fast"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 relative z-10 transition-colors duration-300">
                                TransApp Frotas
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed relative z-10 transition-colors duration-300">
                                O controle definitivo para sua transportadora.
                                Gestão completa de viagens, controle rigoroso de
                                despesas (pedágio, combustível, manutenção),
                                adiantamentos e saldo de fretes.
                            </p>
                            <ul className="space-y-3 mb-8 relative z-10">
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                                    <i className="fas fa-check-circle text-blue-500"></i>{" "}
                                    DRE por Viagem
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                                    <i className="fas fa-check-circle text-blue-500"></i>{" "}
                                    Controle de Categorias de Gasto
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                                    <i className="fas fa-check-circle text-blue-500"></i>{" "}
                                    Histórico de Veículos
                                </li>
                            </ul>
                            <a
                                href="https://transapp.odevtech.com.br"
                                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 transition-colors relative z-10"
                            >
                                Acessar TransApp{" "}
                                <i className="fas fa-arrow-right text-sm"></i>
                            </a>
                        </div>

                        {/* <!-- Card ProdApp --> */}
                        <div className="group bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-900/5 dark:hover:shadow-orange-900/20 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 dark:bg-orange-900/20 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                            <div className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl mb-8 relative z-10 shadow-lg shadow-orange-200 dark:shadow-orange-900/40">
                                <i className="fas fa-industry"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 relative z-10 transition-colors duration-300">
                                ProdApp Indústria
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed relative z-10 transition-colors duration-300">
                                Visibilidade total do seu chão de fábrica.
                                Acompanhamento de ordens de produção, controle
                                de insumos, tempo de máquina e produtividade da
                                equipe em tempo real.
                            </p>
                            <ul className="space-y-3 mb-8 relative z-10">
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                                    <i className="fas fa-check-circle text-orange-500"></i>{" "}
                                    Apontamento de Produção
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                                    <i className="fas fa-check-circle text-orange-500"></i>{" "}
                                    Controle de Estoque de Insumos
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                                    <i className="fas fa-check-circle text-orange-500"></i>{" "}
                                    Dashboards de Eficiência (OEE)
                                </li>
                            </ul>
                            <button className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed relative z-10">
                                Lançamento em Breve{" "}
                                <i className="fas fa-clock text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* <!-- Footer --> */}
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
                            href="#"
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
