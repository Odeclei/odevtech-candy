import { initializeApp } from "firebase/app";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 1. Inicializa o aplicativo Firebase
// const app = initializeApp(firebaseConfig);
export const app = initializeApp(firebaseConfig);

// 2. Inicializa o Banco de Dados já com o CACHE ATIVADO (Padrão v10+)
// O "persistentMultipleTabManager" garante que não dê erro se você abrir o painel em 2 abas.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
});

// 3. Inicializa a Autenticação
export const auth = getAuth(app);
