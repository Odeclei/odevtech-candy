export async function geocodificarEndereco(logradouro, bairro, cidade, uf) {
  const query = encodeURIComponent(
    [logradouro, bairro, cidade, uf].filter(Boolean).join(", "),
  );
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR", "User-Agent": "OdevTechApp/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  };
}

export async function buscarCepBrasilAPI(cep) {
  const apenasDigitos = cep.replace(/\D/g, "");
  if (apenasDigitos.length !== 8) return null;
  const url = `https://brasilapi.com.br/api/cep/v1/${apenasDigitos}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const resultado = {
    cep: data.cep,
    logradouro: data.street || "",
    bairro: data.neighborhood || "",
    cidade: data.city || "",
    uf: data.state || "",
    latitude: data.location?.coordinates?.latitude ?? null,
    longitude: data.location?.coordinates?.longitude ?? null,
  };
  if (!resultado.latitude || !resultado.longitude) {
    const coords = await geocodificarEndereco(
      resultado.logradouro,
      resultado.bairro,
      resultado.cidade,
      resultado.uf,
    );
    if (coords) {
      resultado.latitude = coords.latitude;
      resultado.longitude = coords.longitude;
    }
  }
  return resultado;
}

export function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcularFrete(distanciaKm, faixasEntrega = []) {
  if (!faixasEntrega.length) return { valor: 0, foraRaio: false, mensagem: "" };
  const sorted = [...faixasEntrega].sort((a, b) => a.ateKm - b.ateKm);
  for (const faixa of sorted) {
    if (distanciaKm <= faixa.ateKm) {
      return { valor: faixa.valor, foraRaio: false, mensagem: "" };
    }
  }
  return {
    valor: 0,
    foraRaio: true,
    mensagem:
      "Para esta distância, o frete deve ser negociado diretamente com a loja.",
  };
}
