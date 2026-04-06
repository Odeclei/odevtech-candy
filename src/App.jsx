import { BrowserRouter, Routes, Route } from "react-router-dom";

import Catalogo from "./pages/Catalogo";
import Inicial from "./pages/Inicial";
import PainelAdmin from "./pages/PainelAdmin";

export default function App() {
    return (
        // O BrowserRouter é o "envelopador" que ativa o sistema de rotas no navegador
        <BrowserRouter>
            <Routes>
                {/* Rota 1: A página inicial do SEU site (odevtech.com.br) */}
                <Route
                    path="/"
                    element={<Inicial />}
                    // element={<h1>Bem-vindo à OdevTecsh! Crie seu catálogo.</h1>}
                />

                {/* Rota 2: A Mágica do SaaS! 
            O ":nomeDaLoja" com os dois pontos significa que isso é uma VARIÁVEL.
            Pode ser /crisdoces, /joaobolos, etc. O React vai guardar isso pra gente.
        */}
                <Route path="/:nomeDaLoja" element={<Catalogo />} />

                <Route path="/admin/:nomeDaLoja" element={<PainelAdmin />} />
            </Routes>
        </BrowserRouter>
    );
}
