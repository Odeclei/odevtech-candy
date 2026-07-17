export const gerarPayloadNFCe = (pedido, configLoja, cpfNaNota = "") => {
  console.log(pedido);
  const itensFormatados = pedido.itens.map((item, index) => {
    const ncm = (item.ncm || "19059090").replace(/\D/g, "");
    const cfop = item.cfop || "5102";
    const csosn = item.csosn || "102";

    return {
      numero_item: (index + 1).toString(),
      codigo_ncm: ncm,
      codigo_produto: item.id || `PROD-${index}`,
      descricao: item.nome.substring(0, 120),
      quantidade_comercial: parseFloat(item.quantidade || item.qtd_total || 1),
      quantidade_tributavel: parseFloat(item.quantidade || item.qtd_total || 1),
      cfop: cfop,
      valor_unitario_comercial: parseFloat(item.preco || 0),
      valor_unitario_tributavel: parseFloat(item.preco || 0),
      valor_bruto: parseFloat(item.preco || 0),
      valor_desconto: 0,
      unidade_comercial: "UN",
      unidade_tributavel: "UN",

      icms_origem: "0", // 0 = Nacional
      icms_situacao_tributaria: csosn, // CSOSN 102: Tributada pelo Simples Nacional sem permissão de crédito (Ideal para CFOP 5102)

      // pis_situacao_tributaria: "49", // 49 = Outras operações de saída (Padrão para Simples Nacional)
      // cofins_situacao_tributaria: "49", // 49 = Outras operações de saída (Padrão para Simples Nacional)
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

  return payload;
};

// ==========================================
// GERAR PAYLOAD PARA NF-e (MODELO 55)
// ==========================================
export const gerarPayloadNFe = (pedido, configLoja, dadosDestinatario) => {
  const itensFormatados = pedido.itens.map((item, index) => {
    const ncm = (item.ncm || "19059090").replace(/\D/g, "");
    const cfop = item.cfop || "5102";
    const csosn = item.csosn || "102";
    const codigoTributario = csosn.replace(/^0+/, "") || "102";

    return {
      numero_item: index + 1,
      codigo_produto: item.id || `PROD-${index}`,
      descricao: item.nome.substring(0, 120),
      cfop: cfop,
      unidade_comercial: "UN",
      quantidade_comercial: parseFloat(item.quantidade || item.qtd_total || 1),
      quantidade_tributavel: parseFloat(item.quantidade || item.qtd_total || 1),
      valor_unitario_comercial: parseFloat(item.preco || 0),
      valor_unitario_tributavel: parseFloat(item.preco || 0),
      unidade_tributavel: "UN",
      valor_bruto:
        parseFloat(item.preco || 0) * parseFloat(item.quantidade || 1),
      codigo_ncm: ncm,
      inclui_no_total: 1,
      icms_origem: 0,
      icms_situacao_tributaria: codigoTributario,
      pis_situacao_tributaria: "49",
      cofins_situacao_tributaria: "49",
    };
  });

  const valorTotal = pedido.valorTotal || 0;

  const payload = {
    natureza_operacao: "VENDA",
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    consumidor_final: 0,
    presenca_comprador: 1,
    items: itensFormatados,
    modalidade_frete: 9,
    valor_total: valorTotal,
    valor_produtos: valorTotal,
    valor_frete: 0,
    valor_seguro: 0,
    valor_desconto: 0,
    valor_outras_despesas: 0,
    informacoes_complementares: `Pedido ${pedido.id || ""} - OdevTech`,
  };

  // Definir local_destino
  const ufEmitente = configLoja?.estado || "SC";
  const ufDestinatario = dadosDestinatario?.uf || "SC";
  payload.local_destino = ufEmitente === ufDestinatario ? 1 : 2;

  // Dados do destinatário
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
    if (docLimpo.length === 14) {
      payload.cnpj_destinatario = docLimpo;
    } else if (docLimpo.length === 11) {
      payload.cpf_destinatario = docLimpo;
    }
    if (nome) payload.nome_destinatario = nome;
    if (ie) payload.inscricao_estadual_destinatario = ie;
    if (indicadorIE)
      payload.indicador_inscricao_estadual_destinatario = parseInt(indicadorIE);
    if (logradouro) payload.logradouro_destinatario = logradouro;
    if (numero) payload.numero_destinatario = numero;
    if (bairro) payload.bairro_destinatario = bairro;
    if (municipio) payload.municipio_destinatario = municipio;
    if (uf) payload.uf_destinatario = uf;
    if (cep) payload.cep_destinatario = cep.replace(/\D/g, "");
    if (telefone) payload.telefone_destinatario = telefone.replace(/\D/g, "");
  }

  // console.log("📦 Payload NFe final:", JSON.stringify(payload, null, 2));
  return payload;
};
