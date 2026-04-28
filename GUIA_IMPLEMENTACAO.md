# 🚀 Guia de Implementação de Correções

## Instruções Passo-a-Passo para Aplicar as Correções

---

## 1️⃣ CONFIGURAÇÃO INICIAL (5 minutos)

### Passo 1: Copiar e Atualizar Variáveis de Ambiente

```bash
# Copiar template
cp .env.example .env.local

# Editar .env.local e adicionar seus valores reais
# IMPORTANTE: Nunca compartilhar .env.local!
```

### Passo 2: Instalar Dependências de Segurança

```bash
npm install sanitize-html validator crypto-js
npm install --save-dev @types/sanitize-html
```

### Passo 3: Verificar que .env.local está no .gitignore

```bash
grep ".env.local" .gitignore
# Deve mostrar: .env.local (já está lá)
```

---

## 2️⃣ CORREÇÃO DE BUGS CRÍTICOS (30 minutos)

### Correção 1: Remover Email Super Admin do Código

**Arquivo:** `src/App.jsx`

Trocar esta linha:

```javascript
const SUPER_ADMIN_EMAIL = "odecleiftamanini@gmail.com"; // ❌ ERRADO
```

Por:

```javascript
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
```

E adicionar ao `.env.local`:

```env
VITE_SUPER_ADMIN_EMAIL=seu_email_aqui@gmail.com
```

---

### Correção 2: Adicionar Proteção de Timeout

**Arquivo:** `src/hooks/useRouteProtection.js` (JÁ CRIADO)

O hook já tem proteção de timeout. Agora use-o em `App.jsx`:

```javascript
// src/App.jsx
import { useRouteProtection } from "./hooks/useRouteProtection";

const RotaProtegida = ({ children }) => {
    const { carregando, autorizado, erro, nomeDaLoja } = useRouteProtection();
    const navigate = useNavigate();

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

    if (erro) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50">
                <div className="text-center">
                    <p className="text-red-600 font-bold mb-4">{erro}</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="bg-red-600 text-white px-4 py-2 rounded"
                    >
                        Voltar ao Login
                    </button>
                </div>
            </div>
        );
    }

    if (!autorizado) {
        return <Navigate to={`/login/${nomeDaLoja}`} />;
    }

    return children;
};
```

---

### Correção 3: Implementar Rate Limiting no Login

**Arquivo:** `src/pages/Login.jsx`

```javascript
import { useLoginRateLimit } from "../hooks/useLoginRateLimit";

export default function Login() {
    const { nomeDaLoja } = useParams();
    const navigate = useNavigate();
    const {
        verificarRateLimit,
        registrarTentativaFalhada,
        registrarSucesso,
        obterMensagem,
    } = useLoginRateLimit();

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);

    const fazerLoginEmail = async (e) => {
        e.preventDefault();

        // Verificar rate limit
        const { permitido, tempoRestante } = verificarRateLimit(email);
        if (!permitido) {
            setErro(obterMensagem(tempoRestante));
            return;
        }

        setCarregando(true);
        setErro("");

        try {
            await signInWithEmailAndPassword(auth, email, senha);
            registrarSucesso(email);
            navigate(`/admin/${nomeDaLoja}`);
        } catch (error) {
            registrarTentativaFalhada(email);
            console.error("Erro no login:", error);
            setErro("E-mail ou palavra-passe incorretos.");
        } finally {
            setCarregando(false);
        }
    };

    // ... resto do componente
}
```

---

## 3️⃣ CORREÇÃO DE SEGURANÇA (45 minutos)

### Correção 1: Implementar Firestore Rules

**Arquivo:** `firestore.rules` (JÁ CRIADO)

Revisar e deploy:

```bash
firebase deploy --only firestore:rules
```

---

### Correção 2: Adicionar Validadores

**Arquivo:** `src/utils/validators.js` (JÁ CRIADO)

Exemplos de uso:

```javascript
import { validarTelefone, validarCPF, validarEmail } from "../utils/validators";

// Em seu componente
if (!validarTelefone(telefone)) {
    setErro("Telefone inválido");
    return;
}

if (!validarEmail(email)) {
    setErro("Email inválido");
    return;
}
```

---

### Correção 3: Atualizar Catalogo.jsx com Validações

**Arquivo:** `src/pages/Catalogo.jsx`

Adicione validações ao criar pedido:

```javascript
import { validarPedido } from "../utils/validators";

const criarPedido = async () => {
    const pedido = {
        cliente: nomeCliente,
        telefone: telefoneCliente,
        itens: carrinho,
        dataEntrega: dataEntrega,
    };

    const validacao = validarPedido(pedido);

    if (!validacao.valido) {
        setErro(validacao.erros.join(", "));
        return;
    }

    // Proceder com criação do pedido...
};
```

---

## 4️⃣ OTIMIZAÇÕES DE PERFORMANCE (1 hora)

### Otimização 1: Usar useMemo para Funções

**Arquivo:** `src/pages/PainelAdmin.jsx`

```javascript
import { useMemo, useCallback } from "react";

export default function PainelAdmin() {
    // ... seu código

    // ✅ ANTES (re-criava toda vez)
    // const formatarDinheiro = (v) => new Intl.NumberFormat(...).format(v);

    // ✅ DEPOIS (criada uma vez)
    const formatarDinheiro = useCallback(
        (v) =>
            new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
            }).format(v || 0),
        [],
    );

    const formatarItensPedido = useCallback(
        (itens) =>
            !itens || itens.length === 0
                ? "Nenhum item"
                : itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "),
        [],
    );

    // ... resto do componente
}
```

---

### Otimização 2: Adicionar Lazy Loading de Imagens

**Arquivo:** `src/pages/Catalogo.jsx`

```javascript
<img
    src={produto.imagem}
    alt={produto.nome}
    loading="lazy" // ✅ Carrega apenas quando visível
    decoding="async" // ✅ Não bloqueia renderização
    className="w-full h-64 object-cover rounded-lg"
/>
```

---

### Otimização 3: Cache com Expiração

**Arquivo:** `src/config/lojas.js`

```javascript
const cacheLojas = new Map(); // { key: { data, timestamp } }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const getLojaConfig = async (nomeDaLoja) => {
    const nomeBusca = nomeDaLoja.toLowerCase();
    const cached = cacheLojas.get(nomeBusca);

    // ✅ Se tem no cache E não expirou, usar
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const lojaRef = doc(db, "lojas", nomeBusca);
        const snapshot = await getDoc(lojaRef);

        if (snapshot.exists()) {
            const data = { id: snapshot.id, ...snapshot.data() };
            // ✅ Armazenar com timestamp
            cacheLojas.set(nomeBusca, { data, timestamp: Date.now() });
            return data;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar config:", error);
        return null;
    }
};
```

---

## 5️⃣ TESTES (30 minutos)

### Teste 1: Verificar Rate Limiting

```javascript
// 1. Ir para página de login
// 2. Tentar login com email/senha errado 5+ vezes rapidamente
// 3. Deve mostrar: "Muitas tentativas. Tente novamente em X minutos"
// 4. Esperar 15 minutos (ou limpar localStorage)
```

### Teste 2: Verificar Validações

```javascript
// 1. Tentar criar pedido sem nome - deve mostrar erro
// 2. Tentar criar pedido com telefone inválido - deve mostrar erro
// 3. Tentar criar pedido no passado - deve mostrar erro
```

### Teste 3: Verificar Permissões

```javascript
// 1. Logout
// 2. Tentar acessar /admin/outraLoja com URL direta
// 3. Deve redirecionar para login
```

---

## 6️⃣ DEPLOY (15 minutos)

### Passo 1: Commit das Mudanças

```bash
git add .
git commit -m "🔒 Correções de segurança e performance - CRÍTICO"
```

### Passo 2: Deploy do Firebase

```bash
# Deploy apenas Firestore Rules
firebase deploy --only firestore:rules

# Deploy da aplicação
npm run build
firebase deploy --only hosting
```

### Passo 3: Verificar Logs

```bash
firebase functions:log
```

---

## 📋 Checklist de Implementação

- [ ] Email super admin movido para `.env.local`
- [ ] `.env.local` adicionado ao `.gitignore`
- [ ] Hook `useRouteProtection` criado
- [ ] Hook `useLoginRateLimit` criado
- [ ] Validadores centralizados em `validators.js`
- [ ] `firestore.rules` criado e deployado
- [ ] Rate limiting implementado no Login
- [ ] Lazy loading de imagens adicionado
- [ ] Cache com expiração implementado
- [ ] useMemo/useCallback adicionado
- [ ] Testes manuais executados
- [ ] Deploy realizado

---

## ⚠️ Problemas Conhecidos Durante Implementação

### Problema: "VITE_SUPER_ADMIN_EMAIL is undefined"

**Solução:** Verifique que `.env.local` está no mesmo diretório raiz do projeto

### Problema: "RateLimiter não encontrado"

**Solução:** O hook `useLoginRateLimit.js` já foi criado, apenas importe-o

### Problema: "Firestore rules deploy failed"

**Solução:** Verifique que as regras estão com sintaxe correta. Use:

```bash
firebase rules:test firestore.rules --project=seu_project_id
```

---

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs: `firebase functions:log`
2. Verificar console do navegador (F12)
3. Consultar relatório: `ANALISE_CODIGO.md`

---

**Última Atualização:** 28 de abril de 2026
**Status:** Pronto para implementação
