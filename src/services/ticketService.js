// src/services/ticketService.js
import { db } from "../firebase";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    getDocs,
    query,
    where,
    getDoc,
    Timestamp,
    runTransaction,
} from "firebase/firestore";

export const ticketService = {
    // Criar ticket
    async criarTicket(ticket) {
        const ref = await addDoc(collection(db, "tickets"), {
            ...ticket,
            criadoEm: Timestamp.now(),
            status: "ativo",
            dataVenda: Timestamp.now(),
            dataValidade: ticket.dataValidade
                ? Timestamp.fromDate(new Date(ticket.dataValidade))
                : null,
        });
        return ref;
    },

    // Listar eventos
    async listarEventos(loja) {
        const q = query(collection(db, "eventos"), where("loja", "==", loja));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // Buscar ticket por código
    async buscarTicketPorCodigo(codigo) {
        const q = query(
            collection(db, "tickets"),
            where("codigo", "==", codigo),
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
    },

    // ==========================================
    // CONSUMIR ITEM (BAIXA DE ESTOQUE + MARCA TICKET)
    // ==========================================
    async consumirItem(
        ticketId,
        produtoId,
        quantidade,
        valorUnitario,
        nomeProduto,
        loja,
    ) {
        return runTransaction(db, async (transaction) => {
            const ticketRef = doc(db, "tickets", ticketId);
            const ticketSnap = await transaction.get(ticketRef);
            if (!ticketSnap.exists()) throw new Error("Ticket não encontrado");

            const ticket = ticketSnap.data();

            // 1. Validações
            if (ticket.status !== "ativo")
                throw new Error("Ticket já utilizado");
            if (ticket.saldo < valorUnitario * quantidade) {
                throw new Error(
                    `Saldo insuficiente (saldo: R$ ${ticket.saldo.toFixed(2)})`,
                );
            }

            // 2. Validar data (comparando apenas dia/mês/ano)
            const agora = new Date();
            const dataValidade =
                ticket.dataValidade?.toDate?.() ||
                new Date(ticket.dataValidade);
            const dataVenda =
                ticket.dataVenda?.toDate?.() || new Date(ticket.dataVenda);
            const hojeStr = agora.toISOString().split("T")[0];
            const validadeStr = dataValidade.toISOString().split("T")[0];
            const vendaStr = dataVenda.toISOString().split("T")[0];

            if (validadeStr < hojeStr) throw new Error("Ticket expirado");
            if (ticket.validadeDiaria && vendaStr !== hojeStr) {
                throw new Error("Ticket válido apenas hoje");
            }

            // 3. Baixar estoque do produto
            const prodRef = doc(db, "produtos", produtoId);
            const prodSnap = await transaction.get(prodRef);
            if (!prodSnap.exists()) throw new Error("Produto não encontrado");
            const prod = prodSnap.data();
            if ((prod.estoqueAtual || 0) < quantidade) {
                throw new Error(
                    `Estoque insuficiente (disponível: ${prod.estoqueAtual || 0})`,
                );
            }

            // 4. Atualizar ticket (saldo e histórico)
            const novoSaldo = ticket.saldo - valorUnitario * quantidade;
            const novosItens = [
                ...(ticket.itensConsumidos || []),
                {
                    produtoId,
                    nome: nomeProduto || prod.nome,
                    quantidade,
                    valorUnitario,
                    dataHora: Timestamp.now(),
                },
            ];

            transaction.update(ticketRef, {
                saldo: novoSaldo,
                itensConsumidos: novosItens,
                // Se saldo zerar, marca como consumido
                ...(novoSaldo === 0 && { status: "consumido" }),
                ultimoConsumoEm: Timestamp.now(),
            });

            // 5. Baixar estoque
            transaction.update(prodRef, {
                estoqueAtual: (prod.estoqueAtual || 0) - quantidade,
            });

            return novoSaldo;
        });
    },
};
