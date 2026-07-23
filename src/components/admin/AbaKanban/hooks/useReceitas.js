import { useState } from "react";

export const useReceitas = (produtosMenu) => {
  const [modalReceitaOpen, setModalReceitaOpen] = useState(false);
  const [produtoReceitaAtiva, setProdutoReceitaAtiva] = useState(null);

  const abrirReceita = (nomeProduto) => {
    const produto = produtosMenu.find((p) => p.nome === nomeProduto);
    if (produto?.fichaTecnica?.length) {
      setProdutoReceitaAtiva(produto);
      setModalReceitaOpen(true);
    } else {
      alert(`Nenhuma receita cadastrada para "${nomeProduto}".`);
    }
  };

  return {
    modalReceitaOpen,
    setModalReceitaOpen,
    produtoReceitaAtiva,
    abrirReceita,
  };
};
