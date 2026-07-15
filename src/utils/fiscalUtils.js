// export const gerarPayloadNFCe = (pedido, configLoja, formNf) => {
//     // Mapeamento dos itens (Igual você já fez)
//     const itensParaFocus = pedido.itens.map((item, index) => {
//         return {
//             numero_item: (index + 1).toString(),
//             codigo_produto: item.id,
//             descricao: item.nome,
//             cfop: "5102",
//             unidade_comercial: "UN",
//             quantidade_comercial: item.quantidade || item.qtd_total || 1,
//             valor_unitario_comercial: item.preco,
//             valor_unitario_tributavel: item.preco,
//             unidade_tributavel: "UN",
//             codigo_ncm: item.ncm || "19059090",
//             quantidade_tributavel: item.quantidade || item.qtd_total || 1,
//             valor_desconto: 0,
//             icms_origem: "0",
//             icms_situacao_tributaria: "102",
//             pis_situacao_tributaria: "49",
//             cofins_situacao_tributaria: "49",
//         };
//     });

//     const pagamentosFocus = [
//         {
//             forma_pagamento: "01", // 01 = Dinheiro (Ajuste conforme a forma de pagamento do pedido se necessário)
//             valor_pagamento: pedido.valorTotal,
//         },
//     ];

//     // Payload BASE (Serve para ambos)
//     let payload = {
//         id_pedido: pedido.id, // OBRIGATÓRIO PARA O WEBHOOK FUNCIONAR (A function usa isso)
//         natureza_operacao: "VENDA",
//         data_emissao: new Date().toISOString(),
//         tipo_documento: "1",
//         local_destino: "1",
//         finalidade_emissao: "1",
//         consumidor_final: "1",
//         presenca_comprador: "1",
//         items: itensParaFocus,
//         pagamentos: pagamentosFocus,
//         informacoes_complementares: `Pedido ${pedido.id} - OdevTech`,
//     };

//     // REGRAS ESPECÍFICAS POR TIPO DE NOTA
//     if (formNf.tipoNota === "NFCe") {
//         // NFC-e aceita envio sem destinatário, ou só com CPF e Nome
//         if (formNf.cpf) {
//             payload.cpf_destinatario = formNf.cpf.replace(/\D/g, "");
//         }
//         if (formNf.nome) {
//             payload.nome_destinatario = formNf.nome;
//         }
//     } else if (formNf.tipoNota === "NFe") {
//         // NF-e EXIGE dados completos.
//         const documentoLimpo = formNf.cpf.replace(/\D/g, "");

//         if (documentoLimpo.length === 14) {
//             payload.cnpj_destinatario = documentoLimpo;
//         } else {
//             payload.cpf_destinatario = documentoLimpo;
//         }

//         payload.nome_destinatario = formNf.nome;
//         payload.modalidade_frete = "9"; // Sem frete (Obrigatório em NFe)

//         // ⚠️ ATENÇÃO: NFe exige endereço obrigatório do destinatário.
//         // Verifique se você salva o endereço do cliente no objeto "pedido".
//         // Se a Crisdoces for emitir NFe para um cliente CNPJ, você precisará capturar esses dados no form do Kanban!
//         payload.logradouro_destinatario =
//             pedido.endereco?.rua || "Rua Nao Informada";
//         payload.numero_destinatario = pedido.endereco?.numero || "S/N";
//         payload.bairro_destinatario = pedido.endereco?.bairro || "Centro";
//         payload.municipio_destinatario =
//             pedido.endereco?.cidade || "Sao Bento do Sul";
//         payload.uf_destinatario = pedido.endereco?.estado || "SC";
//         payload.cep_destinatario =
//             pedido.endereco?.cep?.replace(/\D/g, "") || "89280000";
//     }

//     console.log(`📦 Payload FINAL ${formNf.tipoNota}:`, payload);
//     return payload;
// };

/**
 * src/utils/fiscalUtils.js
 * Monta o Payload para a API da Focus NFe (NFC-e)
 */

export const gerarPayloadNFCe = (pedido, configLoja, cpfNaNota = "") => {
    console.log(pedido);
    const itensFormatados = pedido.itens.map((item, index) => {
        const ncm = (item.ncm || "19059090").replace(/\D/g, "");
        const cfop = item.cfop || "5102";
        const csosn = item.csosn || "102";

        return {
            numero_item: (index + 1).toString(),
            codigo_produto: item.id || `PROD-${index}`,
            descricao: item.nome.substring(0, 120),
            cfop: cfop,
            unidade_comercial: "UN",
            quantidade_comercial: parseFloat(
                item.quantidade || item.qtd_total || 1,
            ),
            valor_unitario_comercial: parseFloat(item.preco || 0),
            valor_unitario_tributavel: parseFloat(item.preco || 0),
            unidade_tributavel: "UN",
            codigo_ncm: ncm,
            quantidade_tributavel: parseFloat(
                item.quantidade || item.qtd_total || 1,
            ),
            valor_desconto: 0,

            icms_origem: "0", // 0 = Nacional
            icms_situacao_tributaria: csosn, // CSOSN 102: Tributada pelo Simples Nacional sem permissão de crédito (Ideal para CFOP 5102)
            pis_situacao_tributaria: "49", // 49 = Outras operações de saída (Padrão para Simples Nacional)
            cofins_situacao_tributaria: "49", // 49 = Outras operações de saída (Padrão para Simples Nacional)

            // // ✅ Estrutura CORRETA de imposto para Focus NFe (NFC-e)
            // imposto: {
            //     ICMS: {
            //         CSOSN: csosn,
            //         orig: "0", // 0 = Nacional
            //         vBC: "0.00",
            //         pICMS: "0.00",
            //         vICMS: "0.00",
            //     },
            // },
        };
    });

    const payload = {
        natureza_operacao: "VENDA AO CONSUMIDOR",
        data_emissao: new Date().toISOString(),
        tipo_documento: "1", // 1 = Saída
        local_destino: "1", // 1 = Interna
        finalidade_emissao: "1",
        consumidor_final: "1",
        presenca_comprador: "1", // 1 = Presencial / 4 = Delivery

        items: itensFormatados,

        pagamentos: [
            {
                forma_pagamento: "01", // 01 = Dinheiro (padrão), pode mudar depois
                valor_pagamento: parseFloat(pedido.valorTotal),
            },
        ],

        // Informações complementares (útil para homologação)
        informacoes_complementares: `Pedido ${pedido.id || ""} - OdevTech`,
    };

    const cpfLimpo = cpfNaNota.replace(/\D/g, "");
    if (cpfLimpo && cpfLimpo.length >= 11) {
        payload.cpf_destinatario = cpfLimpo;
        if (pedido.cliente && pedido.cliente !== "Consumo Local") {
            payload.nome_destinatario = pedido.cliente.substring(0, 60);
        }
    } else {
        payload.cpf_destinatario = "00000000000";
    }

    console.log(
        "📦 Payload FINAL (enviado):",
        JSON.stringify(payload, null, 2),
    );

    return payload;
};
