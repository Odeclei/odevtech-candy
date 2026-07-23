// ==========================================
// GERAR PAYLOAD PARA NFC-e (MODELO 65)
// ==========================================
export const gerarPayloadNFCe = (
    pedido,
    configLoja,
    cpfNaNota = "",
    mensagemComplementar = "",
) => {
    const itensFormatados = pedido.itens.map((item, index) => {
        const ncm = (item.ncm || "19059090").replace(/\D/g, "");
        const cfop = item.cfop || "5102";
        const csosn = item.csosn || "102";

        return {
            numero_item: (index + 1).toString(),
            codigo_ncm: ncm,
            codigo_produto: item.id || `PROD-${index}`,
            descricao: item.nome.substring(0, 120),
            quantidade_comercial: parseFloat(
                item.quantidade || item.qtd_total || 1,
            ),
            quantidade_tributavel: parseFloat(
                item.quantidade || item.qtd_total || 1,
            ),
            cfop: cfop,
            valor_unitario_comercial: parseFloat(item.preco || 0),
            valor_unitario_tributavel: parseFloat(item.preco || 0),
            valor_bruto:
                parseFloat(item.preco || 0) * parseFloat(item.quantidade || 1),
            valor_desconto: 0,
            unidade_comercial: "UN",
            unidade_tributavel: "UN",
            icms_origem: "0",
            icms_situacao_tributaria: csosn,
        };
    });

    let informacoes = `Pedido ${pedido.id || ""} - OdevTech`;
    if (mensagemComplementar) {
        informacoes += `\n${mensagemComplementar}`;
    }
    // let data_emissao = new Date()
    //     .toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    //     .replace(
    //         /(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/,
    //         "$3-$2-$1T$4:$5:$6-03:00",
    //     );

    const payload = {
        natureza_operacao: "VENDA AO CONSUMIDOR",
        // data_emissao: data_emissao,
        tipo_documento: "1",
        local_destino: "1",
        finalidade_emissao: "1",
        consumidor_final: "1",
        presenca_comprador: "1",
        items: itensFormatados,
        pagamentos: [
            {
                forma_pagamento: "01",
                valor_pagamento: parseFloat(pedido.valorTotal),
            },
        ],
        informacoes_adicionais_contribuinte: informacoes,
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

    return payload;
};

// ==========================================
// GERAR PAYLOAD PARA NF-e (MODELO 55)
// ==========================================
export const gerarPayloadNFe = (
    pedido,
    configLoja,
    dadosDestinatario,
    mensagemComplementar = "",
) => {
    // 1. Montar os itens
    const itensBase = pedido.itens.map((item, index) => {
        const ncm = (item.ncm || "19059090").replace(/\D/g, "");
        const cfop = item.cfop || "5102";
        const csosn = item.csosn || "102";
        const codigoTributario = csosn.replace(/^0+/, "") || "102";
        const pisCst = item.pisCst || "49";
        const cofinsCst = item.cofinsCst || "49";

        const quantidade = parseFloat(item.quantidade || item.qtd_total || 1);
        const valorUnitario = parseFloat(item.preco || 0);
        const valorBruto = quantidade * valorUnitario;

        return {
            numero_item: index + 1,
            codigo_produto: item.id || `PROD-${index}`,
            descricao: item.nome.substring(0, 120),
            cfop: cfop,
            unidade_comercial: "UN",
            quantidade_comercial: quantidade,
            quantidade_tributavel: quantidade,
            valor_unitario_comercial: valorUnitario,
            valor_unitario_tributavel: valorUnitario,
            unidade_tributavel: "UN",
            valor_bruto: valorBruto,
            codigo_ncm: ncm,
            inclui_no_total: 1,
            icms_origem: 0,
            icms_situacao_tributaria: codigoTributario,
            pis_situacao_tributaria: pisCst,
            cofins_situacao_tributaria: cofinsCst,
        };
    });

    // 2. Verificar frete
    const valorFrete = parseFloat(pedido.taxaEntrega) || 0;
    let itensFormatados = [...itensBase];

    // Se houver frete, adicionar como um item extra
    if (valorFrete > 0) {
        itensFormatados.push({
            numero_item: itensFormatados.length + 1,
            codigo_produto: "FRETE",
            descricao: "Frete",
            cfop: "5102", // Ajuste conforme sua operação (ex: 5352 para serviço de transporte)
            unidade_comercial: "UN",
            quantidade_comercial: 1,
            quantidade_tributavel: 1,
            valor_unitario_comercial: valorFrete,
            valor_unitario_tributavel: valorFrete,
            unidade_tributavel: "UN",
            valor_bruto: valorFrete,
            codigo_ncm: "00000000", // Para serviços, NCM não se aplica, mas a Focus pode aceitar vazio? Use um padrão.
            inclui_no_total: 1,
            icms_origem: 0,
            icms_situacao_tributaria: "102",
            pis_situacao_tributaria: "49",
            cofins_situacao_tributaria: "49",
        });
    }

    const valorProdutos = itensFormatados.reduce(
        (acc, item) => acc + item.valor_bruto,
        0,
    );
    const valorDesconto = parseFloat(pedido.desconto) || 0;
    const valorTotal = valorProdutos - valorDesconto;

    // 3. Modalidade de frete: sempre 9 (sem frete)
    const modalidadeFrete = "9";

    let informacoes = `Pedido ${pedido.id || ""} - OdevTech`;
    if (mensagemComplementar) {
        informacoes += `\n${mensagemComplementar}`;
    }
    // let data_emissao = new Date()
    //     .toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    //     .replace(
    //         /(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/,
    //         "$3-$2-$1T$4:$5:$6-03:00",
    //     );

    const payload = {
        natureza_operacao: "VENDA",
        // data_emissao: data_emissao,
        tipo_documento: 1,
        finalidade_emissao: 1,
        consumidor_final: 0,
        presenca_comprador: 1,
        items: itensFormatados,
        modalidade_frete: modalidadeFrete,
        valor_total: valorTotal,
        valor_produtos: valorProdutos,
        valor_frete: 0, // Sempre zero
        valor_seguro: 0,
        valor_desconto: valorDesconto,
        valor_outras_despesas: 0,
        informacoes_adicionais_contribuinte: informacoes,
    };

    // 4. local_destino
    const ufEmitente = configLoja?.estado || "SC";
    const ufDestinatario = dadosDestinatario?.uf || "SC";
    payload.local_destino = ufEmitente === ufDestinatario ? 1 : 2;

    // 5. Dados do destinatário (mesmo código)
    if (dadosDestinatario) {
        const {
            cnpj,
            cpf,
            nome,
            ie,
            indicadorIE,
            logradouro,
            numero,
            bairro,
            municipio,
            uf,
            cep,
            telefone,
        } = dadosDestinatario;
        const docLimpo = (cnpj || cpf || "").replace(/\D/g, "");
        if (docLimpo.length === 14) payload.cnpj_destinatario = docLimpo;
        else if (docLimpo.length === 11) payload.cpf_destinatario = docLimpo;
        if (nome) payload.nome_destinatario = nome;
        if (ie) payload.inscricao_estadual_destinatario = ie;
        if (indicadorIE)
            payload.indicador_inscricao_estadual_destinatario =
                parseInt(indicadorIE);
        if (logradouro) payload.logradouro_destinatario = logradouro;
        if (numero) payload.numero_destinatario = numero;
        if (bairro) payload.bairro_destinatario = bairro;
        if (municipio) payload.municipio_destinatario = municipio;
        if (uf) payload.uf_destinatario = uf;
        if (cep) payload.cep_destinatario = cep.replace(/\D/g, "");
        if (telefone)
            payload.telefone_destinatario = telefone.replace(/\D/g, "");
    }

    return payload;
};
