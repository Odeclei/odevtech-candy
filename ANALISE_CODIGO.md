# 🔍 Análise Completa do Código - Odevtech Doces

**Data:** 28 de abril de 2026  
**Versão:** 1.0  
**Status:** ⚠️ Problemas Críticos Encontrados

---

## 📋 Sumário Executivo

| Categoria                  | Severidade | Quantidade | Status               |
| -------------------------- | ---------- | ---------- | -------------------- |
| 🔴 **Bugs Críticos**       | Crítica    | 4          | Requer Ação Imediata |
| 🟠 **Falhas de Segurança** | Alta       | 8          | Requer Ação Imediata |
| 🟡 **Bugs Menores**        | Média      | 6          | Requer Ação          |
| 🔵 **Performance**         | Baixa      | 7          | Recomendado          |

---

## 🔴 BUGS CRÍTICOS

### 1. **Memory Leak em Listeners Firestore** (CRÍTICO)

**Arquivo:** `src/pages/PainelAdmin.jsx` (linhas 78-130)  
**Severidade:** Crítica

**Problema:**

```javascript
// ❌ PROBLEMA: Listeners podem não ser limpos corretamente
useEffect(() => {
    const unPedidos = onSnapshot(...);
    const unProdutos = onSnapshot(...);
    const unClientes = onSnapshot(...);
    const unEquipe = onSnapshot(...);

    return () => {
        unPedidos();
        unProdutos();
        unClientes();
        unEquipe();
    };
}, [nomeDaLoja]); // Sem dependências suficientes
```

**Impacto:** O componente pode criar múltiplos listeners quando `nomeDaLoja` muda, causando vazamento de memória e custos crescentes no Firestore.

**Solução:**

```javascript
useEffect(() => {
    const unsubscribers = [];

    unsubscribers.push(
        onSnapshot(
            query(collection(db, "pedidos"), where("loja", "==", nomeDaLoja)),
            (snap) =>
                setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        ),
    );

    return () => unsubscribers.forEach((unsub) => unsub());
}, [nomeDaLoja]);
```

---

### 2. **Spinner de Carregamento Infinito**

**Arquivo:** `src/App.jsx` (linhas 99-110)  
**Severidade:** Crítica

**Problema:**

```javascript
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
```

**Impacto:** Se `verificarPermissoes` falhar silenciosamente, o usuário fica preso na tela de carregamento indefinidamente.

**Solução:** Adicionar timeout

```javascript
useEffect(() => {
    const timeout = setTimeout(() => {
        if (carregando) {
            setErro("Timeout na verificação. Tente novamente.");
            setCarregando(false);
        }
    }, 10000); // 10 segundos

    return () => clearTimeout(timeout);
}, [carregando]);
```

---

### 3. **Erro de Parsing de Data com Timezones**

**Arquivo:** `src/pages/PainelAdmin.jsx` (linha 163)  
**Severidade:** Crítica

**Problema:**

```javascript
const getDataLocal = (dataIso) => {
    if (!dataIso) return "";
    return new Date(dataIso).toLocaleDateString("en-CA"); // ❌ Pode falhar com timezones
};
```

**Impacto:** Em navegadores com timezones diferentes, a data pode ficar desalinhada. Exemplo: Uma data à noite pode aparecer como dia anterior.

**Solução:**

```javascript
const getDataLocal = (dataIso) => {
    if (!dataIso) return "";
    const date = new Date(dataIso);
    return date.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
    });
};
```

---

### 4. **Route Params Undefined Não é Tratado**

**Arquivo:** `src/App.jsx` (linha 35)  
**Severidade:** Crítica

**Problema:**

```javascript
const params = useParams();
const nomeDaLoja = params.nomeDaLoja?.toLowerCase(); // ❌ Pode ser undefined

if (!user) {
    setAutorizado(false);
    setCarregando(false);
    return;
}

// ... código usa nomeDaLoja sem validar
const lojaRef = doc(db, "lojas", nomeDaLoja); // ❌ nomeDaLoja pode ser undefined!
```

**Impacto:** Erro silencioso no Firestore se a rota não tiver o parâmetro esperado.

**Solução:**

```javascript
useEffect(() => {
    // Validar nomeDaLoja no início
    if (!nomeDaLoja) {
        setAutorizado(false);
        setCarregando(false);
        return;
    }

    // ... resto do código
}, [nomeDaLoja]);
```

---

## 🟠 FALHAS DE SEGURANÇA (CRÍTICAS)

### 1. **Email Super Admin Hardcoded no Código** 🚨 CRÍTICO

**Arquivo:** `src/App.jsx` (linha 28)  
**Severidade:** CRÍTICA

**Problema:**

```javascript
const SUPER_ADMIN_EMAIL = "odecleiftamanini@gmail.com"; // ❌ EXPOSTO NO CÓDIGO!
```

**Impacto:**

- Email pessoal visível no repositório Git
- Se o código vazar, o account fica comprometido
- Qualquer pessoa com Git access conhece quem é o admin

**Solução Imediata:**

1. **Mover para variável de ambiente:**

```javascript
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
```

2. **Criar `.env.local`:**

```env
VITE_SUPER_ADMIN_EMAIL=odecleiftamanini@gmail.com
```

3. **Adicionar `.env.local` ao `.gitignore`**

---

### 2. **Sem Validação de Regras Firestore**

**Severidade:** Crítica

**Problema:** Não há menção a `firestore.rules` no projeto.

**Impacto:** Qualquer usuário autenticado pode:

- Ler/escrever dados de outras lojas
- Deletar registros
- Modificar configurações

**Solução:** Criar `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lojas: Apenas owner pode ler
    match /lojas/{lojaId} {
      allow read: if request.auth != null &&
        (request.auth.email == resource.data.ownerEmail ||
         request.auth.email == 'odecleiftamanini@gmail.com' ||
         exists(/databases/$(database)/documents/equipe/$(request.auth.uid)));
      allow write: if request.auth.email == 'odecleiftamanini@gmail.com';
    }

    // Pedidos: Apenas equipe da loja
    match /pedidos/{pedidoId} {
      allow read, write: if request.auth != null &&
        request.auth.email in get(/databases/$(database)/documents/lojas/$(resource.data.loja)).data.equipeEmails;
    }

    // Similar para produtos, clientes, etc
  }
}
```

---

### 3. **Sem Rate Limiting no Login**

**Arquivo:** `src/pages/Login.jsx` (linhas 23-37)  
**Severidade:** Alta

**Problema:**

```javascript
const fazerLoginEmail = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
        await signInWithEmailAndPassword(auth, email, senha); // ❌ Sem proteção
        navigate(`/admin/${nomeDaLoja}`);
    } catch (error) {
        setErro("E-mail ou palavra-passe incorretos.");
    } finally {
        setCarregando(false);
    }
};
```

**Impacto:** Atacante pode fazer brute force contra as contas.

**Solução:** Implementar rate limiting no client + Firebase Security Rules

```javascript
import { RateLimiter } from "some-library"; // ou implementar manualmente

const loginLimiter = new Map(); // { email: { count, timestamp } }

const fazerLoginEmail = async (e) => {
    e.preventDefault();

    // Verificar rate limit
    const now = Date.now();
    const userAttempt = loginLimiter.get(email) || { count: 0, timestamp: now };

    if (userAttempt.count > 5 && now - userAttempt.timestamp < 900000) {
        // 15 min
        setErro("Muitas tentativas. Tente novamente em 15 minutos.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        loginLimiter.delete(email);
        navigate(`/admin/${nomeDaLoja}`);
    } catch (error) {
        loginLimiter.set(email, {
            count: userAttempt.count + 1,
            timestamp: now,
        });
        setErro("E-mail ou palavra-passe incorretos.");
    }
};
```

---

### 4. **URLs Previsíveis e Sem Validação Adequada**

**Arquivo:** `src/App.jsx` (linha 134)  
**Severidade:** Alta

**Problema:**

```javascript
<Route
    path="/admin/:nomeDaLoja"
    element={
        <RotaProtegida>
            <PainelAdmin />
        </RotaProtegida>
    }
/>
```

**Impacto:**

- URLs como `/admin/crisdoces` são facilmente adivinháveis
- Se alguém descobrir o nome da loja, pode tentar acessar
- Embora haja proteção, a estrutura é exposta

**Solução:** Usar UUIDs ou slugs aleatórios

```javascript
// Em firestore.rules, validar que apenas donos podem acessar
// No front, não expor o nomeDaLoja na URL públicamente
```

---

### 5. **Dados de Pagamento (Chave PIX) Armazenados em Firestore Sem Encriptação**

**Arquivo:** `src/pages/SuperAdmin.jsx` (linha 143)  
**Severidade:** Alta

**Problema:**

```javascript
await updateDoc(doc(db, "lojas", lojaEditando.id), {
    nomeExibicao: formData.nomeExibicao,
    whatsapp: formData.whatsapp.replace(/\D/g, ""),
    mensalidade: parseFloat(formData.mensalidade) || 0,
    pagamentoEmDia: formData.pagamentoEmDia,
    ativo: formData.ativo,
    modulos: formData.modulos,
    atualizadoEm: new Date().toISOString(),
});
```

**Impacto:** Chaves PIX estão armazenadas em texto plano no Firestore, visíveis para qualquer pessoa com acesso.

**Solução:** Usar Cloud Encryption ou Secrets Manager

```javascript
// Opção 1: Firebase Extensions - Secret Manager
// Opção 2: Criptografar dados sensíveis antes de enviar
import crypto from "crypto-js";

const chavePix_encrypted = CryptoJS.AES.encrypt(
    formData.chavePix,
    import.meta.env.VITE_ENCRYPTION_KEY,
).toString();
```

---

### 6. **Sem Validação de Entrada (XSS Potencial)**

**Arquivo:** `src/pages/Catalogo.jsx` (linhas 212-215)  
**Severidade:** Média-Alta

**Problema:**

```javascript
const formatarItensPedido = (itens) =>
    !itens || itens.length === 0
        ? "Nenhum item"
        : itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "); // ❌ Sem sanitização
```

Se um `i.nome` contém `<script>alert('xss')</script>`, isso pode executar no DOM.

**Solução:**

```javascript
const formatarItensPedido = (itens) => {
    if (!itens || itens.length === 0) return "Nenhum item";
    return itens
        .map((i) => {
            const nomeSanitizado = sanitizeHtml(i.nome); // usar biblioteca sanitize-html
            return `${i.quantidade}x ${nomeSanitizado}`;
        })
        .join(", ");
};
```

---

### 7. **Sem CORS Configurado Adequadamente**

**Severidade:** Média

**Problema:** Não há informação sobre configuração de CORS no projeto.

**Impacto:** Requisições do frontend para APIs externas podem ser bloqueadas.

**Solução:** Configurar CORS nas Cloud Functions (se usadas)

```javascript
// Cloud Function
const cors = require("cors")({ origin: true });

exports.myFunction = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        // função segura aqui
    });
});
```

---

### 8. **Sem HTTPS Obrigatório**

**Severidade:** Alta

**Problema:** Não há redirecionamento para HTTPS configurado.

**Solução:** Configurar no `firebase.json`

```json
{
    "hosting": {
        "redirects": [
            {
                "source": "/",
                "destination": "https://seusite.com",
                "type": 301
            }
        ]
    }
}
```

---

## 🟡 BUGS MENORES

### 1. **Falta de Tratamento de Erro em Recuperação de Senha**

**Arquivo:** `src/pages/Login.jsx` (linhas 56-72)  
**Severidade:** Média

**Problema:**

```javascript
const recuperarSenha = async () => {
    if (!email) {
        setErro("Por favor, digite o seu e-mail...");
        setSucesso("");
        return;
    }

    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
        await sendPasswordResetEmail(auth, email); // ❌ Pode falhar silenciosamente
        setSucesso("E-mail de recuperação enviado!...");
    } catch (error) {
        console.error("Erro ao recuperar senha:", error); // ❌ Mensagem genérica
        setErro("Erro ao enviar e-mail...");
    } finally {
        setCarregando(false);
    }
};
```

**Solução:** Tratar erros específicos

```javascript
catch (error) {
    if (error.code === 'auth/user-not-found') {
        setErro("Este e-mail não está registado.");
    } else if (error.code === 'auth/invalid-email') {
        setErro("E-mail inválido.");
    } else {
        setErro("Erro ao enviar e-mail. Tente novamente mais tarde.");
    }
}
```

---

### 2. **Inconsistência no Formato de Telefone**

**Arquivo:** Múltiplos arquivos  
**Severidade:** Média

**Problema:**

```javascript
// Em SuperAdmin.jsx
whatsapp: formData.whatsapp.replace(/\D/g, ""), // Remove tudo que não é número

// Em Catalogo.jsx
const enviarWhatsApp = (phone) => {
    if (!phone) return alert("Cliente sem número de WhatsApp registado.");
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
};
```

**Solução:** Centralizar formatação

```javascript
// utils/formatters.js
export const formatarTelefone = (phone, incluirCodigo = false) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");

    if (incluirCodigo && !clean.startsWith("55")) {
        return `55${clean}`;
    }
    return clean;
};

export const sanitizarTelefone = (phone) => {
    const clean = formatarTelefone(phone);
    return clean.length === 11 ? clean : clean; // validar
};
```

---

### 3. **Sem Validação de CPF/CNPJ**

**Arquivo:** `src/utils/pixUtils.js`  
**Severidade:** Média

**Problema:**

```javascript
// Aceita qualquer valor como CPF sem validar
const chave = chave.replace(/[^\d+]/g, "");
```

**Solução:**

```javascript
export const validarCPF = (cpf) => {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) return false;

    let soma = 0,
        resto;
    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.substring(10, 11));
};
```

---

### 4. **Modal PIX Gerado Sem Validação**

**Arquivo:** `src/pages/Catalogo.jsx`  
**Severidade:** Média

**Problema:** O QR Code PIX é gerado sem validar se a chave é válida.

**Solução:** Adicionar validação

```javascript
const gerarQRCodePix = async () => {
    if (!configLoja?.chavePix) {
        setErro("Chave PIX não configurada.");
        return;
    }

    // Validar chave PIX
    if (!validarChavePix(configLoja.chavePix)) {
        setErro("Chave PIX inválida.");
        return;
    }

    const payload = gerarPixCopiaECola(
        configLoja.chavePix,
        configLoja.nomeExibicao,
        configLoja.cidade,
        valorTotal,
    );
    setPixPayload(payload);
    setMostrarModalPix(true);
};
```

---

### 5. **Sem Tratamento de Upload de Imagem**

**Arquivo:** `src/pages/PainelAdmin.jsx` (temp.jsx)  
**Severidade:** Média

**Problema:**

```javascript
const [logoArquivo, setLogoArquivo] = useState(null);
// ... sem tratamento de tamanho, tipo, etc
```

**Impacto:** Podem fazer upload de arquivos maliciosos ou muito grandes.

**Solução:**

```javascript
const handleUploadImagem = (file) => {
    // Validar tipo
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setErro("Apenas JPEG, PNG e WebP são permitidos.");
        return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        setErro("Arquivo deve ter no máximo 5MB.");
        return;
    }

    setLogoArquivo(file);
};
```

---

### 6. **Sem Validação de Dados ao Criar Pedido**

**Arquivo:** `src/pages/Catalogo.jsx`  
**Severidade:** Média

**Problema:**

```javascript
const criarPedido = async () => {
    if (!nomeCliente || !telefoneCliente || carrinho.length === 0) {
        setErro("Preencha todos os campos obrigatórios.");
        return;
    }
    // ... cria o pedido
};
```

**Melhorias:**

```javascript
const validarPedido = () => {
    const erros = [];

    if (!nomeCliente?.trim()) erros.push("Nome do cliente é obrigatório");
    if (nomeCliente?.length > 100) erros.push("Nome muito longo");

    if (!telefoneCliente?.trim()) erros.push("Telefone é obrigatório");
    if (!validarTelefone(telefoneCliente)) erros.push("Telefone inválido");

    if (carrinho.length === 0) erros.push("Carrinho vazio");

    if (dataEntrega) {
        const data = new Date(dataEntrega);
        if (data < new Date()) erros.push("Data deve ser no futuro");
    }

    return erros;
};
```

---

## 🔵 OPORTUNIDADES DE PERFORMANCE

### 1. **N+1 Queries no Firestore**

**Arquivo:** `src/pages/PainelAdmin.jsx` (linhas 78-130)  
**Severidade:** Performance

**Problema:**

```javascript
useEffect(() => {
    // 4 listeners separados! ❌
    const unPedidos = onSnapshot(query(collection(db, "pedidos"), ...), ...);
    const unProdutos = onSnapshot(query(collection(db, "produtos"), ...), ...);
    const unClientes = onSnapshot(query(collection(db, "clientes"), ...), ...);
    const unEquipe = onSnapshot(query(collection(db, "equipe"), ...), ...);
    // ...
}, [nomeDaLoja]);
```

**Custo:** 4 leitura/segundo/usuário = custos crescentes!

**Solução:** Usar agregação ou cache local

```javascript
// Cloud Function para agregar dados
exports.getDashboardData = functions.https.onCall(async (data, context) => {
    const nomeLoja = data.nomeLoja;
    const db = admin.firestore();

    const [pedidos, produtos, clientes, equipe] = await Promise.all([
        db.collection("pedidos").where("loja", "==", nomeLoja).get(),
        db.collection("produtos").where("loja", "==", nomeLoja).get(),
        db.collection("clientes").where("loja", "==", nomeLoja).get(),
        db.collection("equipe").where("loja", "==", nomeLoja).get(),
    ]);

    return {
        pedidos: pedidos.docs.map((d) => ({ id: d.id, ...d.data() })),
        produtos: produtos.docs.map((d) => ({ id: d.id, ...d.data() })),
        clientes: clientes.docs.map((d) => ({ id: d.id, ...d.data() })),
        equipe: equipe.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
});
```

---

### 2. **Sem useMemo ou useCallback**

**Arquivo:** Múltiplos arquivos  
**Severidade:** Performance

**Problema:**

```javascript
const formatarDinheiro = (
    v, // ❌ Re-criada a cada render
) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(v || 0);
```

**Solução:**

```javascript
const formatarDinheiro = useCallback(
    (v) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(v || 0),
    [], // nunca muda
);
```

---

### 3. **Sem Lazy Loading de Imagens**

**Arquivo:** `src/pages/Catalogo.jsx`  
**Severidade:** Performance

**Problema:**

```javascript
<img src={produto.imagem} alt={produto.nome} /> // ❌ Carrega tudo de uma vez
```

**Solução:**

```javascript
<img
    src={produto.imagem}
    alt={produto.nome}
    loading="lazy" // Nativo do navegador
    decoding="async"
/>
```

---

### 4. **Cache sem Expiração**

**Arquivo:** `src/config/lojas.js`  
**Severidade:** Performance

**Problema:**

```javascript
const cacheLojas = new Map(); // ❌ Nunca expira

if (cacheLojas.has(nomeBusca)) {
    return cacheLojas.get(nomeBusca); // Dados antigos!
}
```

**Solução:**

```javascript
const cacheLojas = new Map(); // { key: { data, timestamp } }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const getLojaConfig = async (nomeDaLoja) => {
    const nomeBusca = nomeDaLoja.toLowerCase();
    const cached = cacheLojas.get(nomeBusca);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    // ... fetch data
    cacheLojas.set(nomeBusca, { data, timestamp: Date.now() });
    return data;
};
```

---

### 5. **Sem Paginação em Listas**

**Arquivo:** `src/pages/SuperAdmin.jsx`  
**Severidade:** Performance

**Problema:**

```javascript
const q = query(collection(db, "lojas")); // ❌ Carrega TODAS as lojas
const unsubscribe = onSnapshot(q, (snapshot) => {
    setLojas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
});
```

**Solução:** Implementar paginação com `limit`

```javascript
const [pagina, setPagina] = useState(1);
const ITEMS_POR_PAGINA = 20;

const q = query(
    collection(db, "lojas"),
    limit(ITEMS_POR_PAGINA),
    // Adicionar orderBy + startAfter para next page
);
```

---

### 6. **Bundle Size - Imports Desnecessários**

**Arquivo:** `src/pages/PainelAdmin.jsx`  
**Severidade:** Performance

**Problema:**

```javascript
import {
    Home,
    KanbanSquare,
    ShoppingBag,
    Settings,
    Users,
    LogOut,
    Menu,
    X,
    DollarSign,
    ListOrdered,
    MonitorSmartphone,
    Package,
    Lock, // 13 imports de lucide-react
} from "lucide-react";
```

**Solução:** Usar dynamic imports

```javascript
import { lazy, Suspense } from "react";

const Home = lazy(() =>
    import("lucide-react").then((m) => ({ default: m.Home })),
);
// Ou usar apenas o que precisa
```

---

### 7. **Sem Compressão de Imagem**

**Arquivo:** `src/pages/Catalogo.jsx` (e temp.jsx)  
**Severidade:** Performance

**Problema:**

```javascript
const [imagemArquivo, setImagemArquivo] = useState(null);
// Enviado sem comprimir
```

**Solução:** Usar `browser-image-compression` (que você já tem instalado!)

```javascript
import imageCompression from "browser-image-compression";

const handleImageChange = async (e) => {
    const file = e.target.files[0];

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        setImagemArquivo(compressedFile);
    } catch (error) {
        console.error("Erro ao comprimir:", error);
    }
};
```

---

## 📊 Resumo de Recomendações por Prioridade

### 🔴 **AÇÃO IMEDIATA (Próximos 2-3 dias)**

1. ✅ Mover `SUPER_ADMIN_EMAIL` para `.env`
2. ✅ Criar `firestore.rules` com validações apropriadas
3. ✅ Implementar rate limiting no login
4. ✅ Corrigir memory leak dos listeners
5. ✅ Adicionar timeout no carregamento

### 🟠 **ALTA PRIORIDADE (Próxima semana)**

6. ✅ Implementar paginação no Firestore
7. ✅ Adicionar validação de entrada (XSS)
8. ✅ Encriptar dados sensíveis (Chave PIX)
9. ✅ Validar CPF/CNPJ/Telefone
10. ✅ Centralizar formatação de dados

### 🟡 **MÉDIA PRIORIDADE (Próximas 2 semanas)**

11. ✅ Implementar `useMemo`/`useCallback`
12. ✅ Lazy loading de imagens
13. ✅ Cache com expiração
14. ✅ Tratamento de erro específico
15. ✅ Otimizar bundle size

### 🔵 **NICE-TO-HAVE (Quando tiver tempo)**

16. ✅ Compressão de imagem
17. ✅ PWA (Progressive Web App)
18. ✅ Service Workers
19. ✅ Analytics e monitoring
20. ✅ Testes unitários

---

## 🛠️ Próximos Passos Recomendados

```bash
# 1. Criar arquivo de variáveis de ambiente
cp .env.example .env.local

# 2. Instalar dependências de segurança
npm install sanitize-html validator

# 3. Adicionar husky para validação de commits
npm install husky --save-dev
npx husky install

# 4. Executar linter
npm run lint

# 5. Deploy com regras de segurança
firebase deploy --only firestore:rules
```

---

**Última Atualização:** 28 de abril de 2026  
**Status:** Em Progresso  
**Próxima Revisão:** 1 semana
