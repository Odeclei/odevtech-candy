import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../../firebase";
import { deveAparecerNaCozinhaHoje } from "../utils/kanbanHelpers";

export const usePedidos = (nomeDaLoja) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nomeDaLoja) return;
    const qPedidos = query(
      collection(db, "pedidos"),
      where("loja", "==", nomeDaLoja),
    );
    const unsubscribe = onSnapshot(qPedidos, (snapshot) => {
      const peds = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPedidos(
        peds.filter((p) =>
          ["agendado", "em_producao", "pronto", "entregue"].includes(p.status),
        ),
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, [nomeDaLoja]);

  const filtrarPorData = (pedidos, mostrarTudo) => {
    if (mostrarTudo) return pedidos;
    return pedidos.filter((p) =>
      deveAparecerNaCozinhaHoje(p.dataEntrega || p.criadoEm),
    );
  };

  return { pedidos, loading, filtrarPorData };
};
