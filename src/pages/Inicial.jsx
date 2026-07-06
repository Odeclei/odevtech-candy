import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// ==========================================
// 1. COMPONENTE: CANVAS DE PARTÍCULAS (DOTS)
// ==========================================
const ParticleCanvas = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        let particles = [];
        let width, height;

        const initCanvas = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            particles = [];
            const particleCount = Math.floor((width * height) / 15000);

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 1.5 + 0.5,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle =
                    index % 4 === 0
                        ? "rgba(59, 130, 246, 0.4)"
                        : "rgba(255, 255, 255, 0.2)";
                ctx.fill();

                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle =
                            index % 4 === 0
                                ? `rgba(59, 130, 246, ${0.15 - dist / 1000})`
                                : `rgba(255, 255, 255, ${0.08 - dist / 1000})`;
                        ctx.stroke();
                    }
                }

                if (mouseRef.current.x != null) {
                    const dxMouse = p.x - mouseRef.current.x;
                    const dyMouse = p.y - mouseRef.current.y;
                    const distMouse = Math.sqrt(
                        dxMouse * dxMouse + dyMouse * dyMouse,
                    );
                    if (distMouse < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 - distMouse / 1500})`;
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        initCanvas();
        animate();

        window.addEventListener("resize", initCanvas);

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseLeave = () => {
            mouseRef.current = { x: null, y: null };
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            window.removeEventListener("resize", initCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full z-0 opacity-60 pointer-events-none"
        />
    );
};

// ==========================================
// 2. COMPONENTE: EFEITO REVEAL (APPLE STYLE)
// ==========================================
const Reveal = ({ children, delay = 0, className = "" }) => {
    const domRef = useRef();
    const [isVisible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisible(true);
                    observer.unobserve(domRef.current);
                }
            },
            { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
        );

        if (domRef.current) observer.observe(domRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// ==========================================
// 3. COMPONENTE: LOGOTIPO VETORIZADO
// ==========================================
const Logo = () => (
    <a href="#" className="flex items-center cursor-pointer group">
        <svg
            width="28"
            height="28"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-3 transform group-hover:scale-105 transition-transform"
        >
            <path
                d="M 25 25 L 45 25 L 45 75 L 25 75 Z"
                stroke="white"
                strokeWidth="12"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M 60 25 L 95 25 M 77.5 25 L 77.5 75"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx="25"
                cy="50"
                r="8"
                fill="white"
                stroke="#2563eb"
                strokeWidth="6"
            />
            <circle
                cx="45"
                cy="25"
                r="8"
                fill="white"
                stroke="#2563eb"
                strokeWidth="6"
            />
            <circle
                cx="45"
                cy="75"
                r="8"
                fill="white"
                stroke="#2563eb"
                strokeWidth="6"
            />
            <circle
                cx="77.5"
                cy="25"
                r="8"
                fill="white"
                stroke="#2563eb"
                strokeWidth="6"
            />
            <circle
                cx="95"
                cy="25"
                r="8"
                fill="white"
                stroke="#2563eb"
                strokeWidth="6"
            />
            <circle
                cx="77.5"
                cy="75"
                r="8"
                fill="white"
                stroke="#2563eb"
                strokeWidth="6"
            />
        </svg>
        <span className="text-xl font-bold tracking-tight text-white">
            Odev<span className="font-light text-gray-400">Tech</span>
        </span>
    </a>
);

// ==========================================
// 4. PÁGINA PRINCIPAL
// ==========================================
export default function Inicial() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Ecossistema", href: "#produtos" },
        { name: "Tecnologia", href: "#tecnologia" },
        { name: "Portal do Cliente", href: "/login" },
    ];

    // CARDS OFICIAIS DO ECOSSISTEMA ODEVTECH COM URLS CORRIGIDAS (Absolutas)
    const produtos = [
        {
            id: "OdevBar",
            icon: "fa-beer-mug-empty",
            title: "OdevBar",
            desc: "Frente de caixa (PDV) ágil, controle de mesas e comandas, fluxo de cozinha (KDS) e emissão fiscal (NFC-e/NF-e) automatizada.",
            img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
            color: "text-amber-500",
            hoverBg: "group-hover:bg-amber-600",
            hoverBorder: "hover:border-amber-500/30",
            url: "https://wa.me/5547999545703",
        },
        {
            id: "OdevConf",
            icon: "fa-cake-candles",
            title: "OdevConf",
            desc: "Catálogo digital, gestão de estoque, fichas técnicas avançadas (Engenharia de Cardápio) e Kanban interativo de produção.",
            img: "https://images.unsplash.com/photo-1557308536-ee471ef2c390?auto=format&fit=crop&q=80&w=800",
            color: "text-pink-500",
            hoverBg: "group-hover:bg-pink-600",
            hoverBorder: "hover:border-pink-500/30",
            url: "https://wa.me/5547999545703",
        },
        {
            id: "OdevLog",
            icon: "fa-truck-fast",
            title: "OdevLog",
            desc: "Gestão ponta a ponta para frotas e transportadoras. Controle de viagens, manutenções, despesas correntes, acertos e DRE.",
            img: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=800",
            color: "text-blue-500",
            hoverBg: "group-hover:bg-blue-600",
            hoverBorder: "hover:border-blue-500/30",
            url: "https://log.odevtech.com.br",
        },
        {
            id: "OdevDesk",
            icon: "fa-robot",
            title: "OdevDesk",
            desc: "CRM com IA embarcada. Chatbot integrado ao WhatsApp para triagem de leads, automação de atendimento e gestão do funil de vendas.",
            img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
            color: "text-emerald-500",
            hoverBg: "group-hover:bg-emerald-600",
            hoverBorder: "hover:border-emerald-500/30",
            url: "https://wa.me/5547999545703",
        },
    ];

    return (
        <div className="bg-black text-white min-h-screen font-sans selection:bg-blue-600 selection:text-white">
            <style>{`
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #000; }
                ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #555; }
                .text-gradient {
                    background: linear-gradient(180deg, #ffffff 0%, #737373 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>

            <nav
                className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                    isScrolled
                        ? "bg-black/60 backdrop-blur-xl border-b border-white/5 py-3"
                        : "bg-transparent py-5"
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-16">
                    <Logo />
                    <div className="hidden md:flex items-center space-x-8 text-xs font-medium text-gray-400 tracking-wide">
                        {navLinks.map((link) =>
                            link.href.startsWith("/") ? (
                                <Link
                                    key={link.name}
                                    to={link.href}
                                    className="hover:text-white transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ) : (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className="hover:text-white transition-colors"
                                >
                                    {link.name}
                                </a>
                            ),
                        )}
                        <a
                            href="https://wa.me/5547999545703"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors"
                        >
                            Falar com Consultor
                        </a>
                    </div>
                    <button
                        className="md:hidden text-2xl text-white focus:outline-none"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <i
                            className={`fa-solid ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}
                        ></i>
                    </button>
                </div>
                {isMobileMenuOpen && (
                    <div className="absolute top-full left-0 w-full bg-[#0a0a0a] border-b border-white/10 shadow-xl py-4 flex flex-col space-y-4 px-6 md:hidden">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-sm font-medium text-gray-300 hover:text-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                    </div>
                )}
            </nav>

            <main>
                {/* HERO */}
                <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 pt-20 overflow-hidden bg-black">
                    <ParticleCanvas />
                    <Reveal className="relative z-10 max-w-4xl mx-auto space-y-8">
                        <span className="inline-block py-1 px-3 rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-4 backdrop-blur-sm">
                            OdevTech SaaS Ecosystem
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
                            Tecnologia que move <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-200">
                                seu negócio adiante.
                            </span>
                        </h1>
                        <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed tracking-tight">
                            Soluções escaláveis e sistemas modulares
                            desenvolvidos para quem não tem tempo a perder com
                            planilhas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                            <a
                                href="#produtos"
                                className="bg-blue-600 text-white px-8 py-3.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                            >
                                Conhecer Soluções
                            </a>
                        </div>
                    </Reveal>
                    <div className="absolute bottom-10 animate-bounce">
                        <i className="fa-solid fa-chevron-down text-gray-600 text-xl"></i>
                    </div>
                </section>

                {/* SUÍTE DE PRODUTOS (CARDS PRINCIPAIS) */}
                <section id="produtos" className="py-24 px-6 bg-[#050505]">
                    <div className="max-w-7xl mx-auto">
                        <Reveal className="mb-20 text-center md:text-left">
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                                O Sistema Certo.
                            </h2>
                            <p className="text-lg text-gray-400 font-light">
                                Escolha o módulo nativo para o seu segmento e
                                assuma o controle.
                            </p>
                        </Reveal>

                        {/* GRID 2x2 PARA OS 4 PRODUTOS - CARDS GRANDES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {produtos.map((prod, index) => (
                                <Reveal
                                    key={index}
                                    delay={index * 100}
                                    className={`group bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 hover:bg-[#111] transition-all duration-500 flex flex-col relative overflow-hidden ${prod.hoverBorder}`}
                                >
                                    <div className="relative z-10 flex flex-col h-full min-h-[220px]">
                                        <div className="flex justify-between items-start mb-6">
                                            <div
                                                className={`w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-2xl ${prod.color} transition-all duration-500 ${prod.hoverBg} group-hover:text-white group-hover:scale-110 group-hover:border-transparent shadow-lg`}
                                            >
                                                <i
                                                    className={`fa-solid ${prod.icon}`}
                                                ></i>
                                            </div>
                                            <span className="text-xs font-bold tracking-widest uppercase text-gray-600 group-hover:text-white transition-colors border border-white/10 px-3 py-1 rounded-full">
                                                {prod.id}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                                            {prod.title}
                                        </h3>
                                        <p className="text-gray-400 text-base font-light leading-relaxed mb-8 flex-grow">
                                            {prod.desc}
                                        </p>

                                        <div className="mt-auto flex items-center text-sm font-semibold text-white/50 group-hover:text-white transition-colors z-20">
                                            <a
                                                href={prod.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 hover:text-white transition-colors"
                                            >
                                                <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                                                Solicitar Demonstração
                                            </a>
                                        </div>
                                    </div>

                                    {/* Fundo de Imagem Dark/Grayscale */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent z-0 pointer-events-none"></div>
                                    <img
                                        src={prod.img}
                                        alt={prod.title}
                                        className="absolute right-0 top-0 w-3/4 h-full object-cover filter grayscale opacity-10 group-hover:opacity-30 group-hover:grayscale-0 transform group-hover:scale-105 transition-all duration-700 mask-image-gradient pointer-events-none"
                                        style={{
                                            WebkitMaskImage:
                                                "linear-gradient(to right, transparent, black)",
                                        }}
                                    />
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SHOWCASE DE TECNOLOGIA */}
                <section
                    id="tecnologia"
                    className="py-24 px-6 bg-black relative"
                >
                    <div className="max-w-7xl mx-auto">
                        <Reveal className="mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
                                Tecnologia de Base.
                            </h2>
                            <p className="text-lg text-gray-400 max-w-2xl font-light">
                                Não reinventamos a roda, construímos a estrada.
                                Nossos sistemas rodam em infraestrutura
                                Cloud-Native, garantindo 99.9% de uptime para a
                                sua operação.
                            </p>
                        </Reveal>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Reveal className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-10 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <i className="fa-solid fa-server text-3xl text-blue-500 mb-6"></i>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        Cloud Real-Time
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        Atualização de KDS e Painéis de forma
                                        instantânea através do Google Firebase e
                                        React.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal
                                delay={150}
                                className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-10 relative overflow-hidden group"
                            >
                                <div className="relative z-10">
                                    <i className="fa-solid fa-file-invoice text-3xl text-emerald-500 mb-6"></i>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        Motor Fiscal Nativo
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        Módulo de faturamento próprio. Emissão
                                        de NFC-e e NF-e comunicando direto com a
                                        SEFAZ.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal
                                delay={300}
                                className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-10 relative overflow-hidden group"
                            >
                                <div className="relative z-10">
                                    <i className="fa-solid fa-brain text-3xl text-purple-500 mb-6"></i>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        API First & IA
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        Integrações prontas para APIs de
                                        pagamento, WhatsApp e motores de LLM
                                        para análise de dados.
                                    </p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section
                    id="contact"
                    className="py-32 px-6 text-center relative overflow-hidden bg-black"
                >
                    <Reveal className="max-w-3xl mx-auto relative z-10">
                        <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight text-white">
                            Pronto para subir de nível?
                        </h2>
                        <p className="text-lg text-gray-400 mb-10 font-light max-w-xl mx-auto">
                            Chega de processos manuais. Agende uma consultoria
                            gratuita e descubra qual módulo OdevTech encaixa no
                            seu negócio.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href="https://wa.me/5547999545703"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 text-white px-8 py-3.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            >
                                Falar com Especialista
                            </a>
                        </div>
                    </Reveal>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="bg-[#050505] pt-16 pb-8 px-6 text-sm border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    <div className="col-span-2 lg:col-span-2 pr-8">
                        <div className="mb-4">
                            <Logo />
                        </div>
                        <p className="text-gray-500 mb-6 max-w-xs text-xs leading-relaxed">
                            Ecossistema de Gestão SaaS. Desenvolvido para
                            operações de alta performance, sem floreios.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="https://www.linkedin.com/in/odeclei-francisco-tamanini-98b514aa/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all"
                            >
                                <i className="fa-brands fa-linkedin-in"></i>
                            </a>
                            <a
                                href="https://www.instagram.com/odevtech/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all"
                            >
                                <i className="fa-brands fa-instagram"></i>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-4">
                            Módulos
                        </h4>
                        <ul className="space-y-3 text-gray-500 text-xs">
                            <li>
                                <a
                                    href="#produtos"
                                    className="hover:text-white transition-colors"
                                >
                                    OdevBar
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#produtos"
                                    className="hover:text-white transition-colors"
                                >
                                    OdevConf
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#produtos"
                                    className="hover:text-white transition-colors"
                                >
                                    OdevLog
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#produtos"
                                    className="hover:text-white transition-colors"
                                >
                                    OdevDesk
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-4">
                            Empresa
                        </h4>
                        <ul className="space-y-3 text-gray-500 text-xs">
                            <li>
                                <a
                                    href="#"
                                    className="hover:text-white transition-colors"
                                >
                                    Sobre Nós
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/login"
                                    className="hover:text-white transition-colors"
                                >
                                    Portal do Cliente
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-4">
                            Contato
                        </h4>
                        <ul className="space-y-3 text-gray-500 text-xs">
                            <li>
                                <a
                                    href="https://wa.me/5547999545703"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    (+55) 47 9 9995-45703
                                </a>
                            </li>
                            <li>Santa Catarina, Brasil</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-600 text-xs">
                    <p>
                        &copy; {new Date().getFullYear()} OdevTech. Todos os
                        direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}
