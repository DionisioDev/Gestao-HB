/** Arredondamento monetário half-up para o centavo (docs/regras-negocio.md, convenções). */
export function arredondarCentavos(valor: number): number {
  if (!Number.isFinite(valor)) throw new Error(`Valor monetário inválido: ${valor}`);
  return Math.round(valor);
}

export function percentualDe(baseCentavos: number, pct: number): number {
  return arredondarCentavos((baseCentavos * pct) / 100);
}
