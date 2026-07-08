/** Formatação pt-BR — centavos → "R$ 1.234,56"; miligramas → "3,500 g". */
const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtGramas = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function formatarCentavos(centavos: number): string {
  return fmtMoeda.format(centavos / 100);
}

export function formatarPesoMg(pesoMg: number): string {
  return `${fmtGramas.format(pesoMg / 1000)} g`;
}
