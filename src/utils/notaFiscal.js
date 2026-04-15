export const prepararDadosParaNota = (pedido) => {
    return {
        cliente: {
            nome: pedido.cliente,
            cpfCnpj: "", // vamos pedir no formulário futuramente
            telefone: pedido.telefone || "",
        },
        itens: pedido.itens.map((item) => ({
            descricao: item.nome,
            quantidade: item.quantidade,
            valorUnitario: item.preco,
        })),
        valorTotal: pedido.valorTotal,
        dataEmissao: new Date().toISOString(),
        loja: pedido.loja,
        pedidoId: pedido.id,
    };
};

// Função placeholder - será conectada depois
export const emitirNotaFiscal = async (dados) => {
    console.log("🔴 Nota fiscal seria emitida aqui:", dados);
    // Futuro: integração com NFe.io / Focus / OPNF
    alert(
        "Nota fiscal será emitida automaticamente quando ativarmos o plano pago.",
    );
    return { success: true, numero: "000000" };
};
