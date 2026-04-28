// src/hooks/useLoginRateLimit.js
/**
 * Hook para rate limiting de login
 * Protege contra brute force
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

interface LoginAttempt {
    count: number;
    firstAttempt: number;
    lastAttempt: number;
}

export const useLoginRateLimit = () => {
    const [estaAguardando, setEstaAguardando] = useState(false);
    const [tempoRestante, setTempoRestante] = useState(0);

    const getAttempts = useCallback((email) => {
        try {
            const data = localStorage.getItem(`${STORAGE_KEY}_${email}`);
            if (!data) return null;
            return JSON.parse(data);
        } catch {
            return null;
        }
    }, []);

    const verificarRateLimit = useCallback((email) => {
        const attempts = getAttempts(email);
        
        if (!attempts) {
            return { permitido: true, tempoRestante: 0 };
        }

        const agora = Date.now();
        const timeSinceFirstAttempt = agora - attempts.firstAttempt;

        // Se passou o tempo de lockout, resetar
        if (timeSinceFirstAttempt > LOCKOUT_DURATION) {
            localStorage.removeItem(`${STORAGE_KEY}_${email}`);
            return { permitido: true, tempoRestante: 0 };
        }

        // Se atingiu o máximo, bloquear
        if (attempts.count >= MAX_ATTEMPTS) {
            const tempoRestante = LOCKOUT_DURATION - timeSinceFirstAttempt;
            setEstaAguardando(true);
            setTempoRestante(Math.ceil(tempoRestante / 1000));
            return { permitido: false, tempoRestante: Math.ceil(tempoRestante / 1000) };
        }

        return { permitido: true, tempoRestante: 0 };
    }, [getAttempts]);

    const registrarTentativaFalhada = useCallback((email) => {
        const agora = Date.now();
        const attempts = getAttempts(email);

        if (attempts) {
            attempts.count += 1;
            attempts.lastAttempt = agora;
        } else {
            // Primeira tentativa
            const newAttempt = {
                count: 1,
                firstAttempt: agora,
                lastAttempt: agora,
            };
            localStorage.setItem(`${STORAGE_KEY}_${email}`, JSON.stringify(newAttempt));
            return;
        }

        localStorage.setItem(`${STORAGE_KEY}_${email}`, JSON.stringify(attempts));
    }, [getAttempts]);

    const registrarSucesso = useCallback((email) => {
        localStorage.removeItem(`${STORAGE_KEY}_${email}`);
        setEstaAguardando(false);
        setTempoRestante(0);
    }, []);

    const obterMensagem = useCallback((tempoRestante) => {
        const minutos = Math.ceil(tempoRestante / 60);
        return `Muitas tentativas de login. Tente novamente em ${minutos} minuto${minutos > 1 ? 's' : ''}.`;
    }, []);

    return {
        verificarRateLimit,
        registrarTentativaFalhada,
        registrarSucesso,
        obterMensagem,
        estaAguardando,
        tempoRestante,
        MAX_ATTEMPTS,
    };
};
