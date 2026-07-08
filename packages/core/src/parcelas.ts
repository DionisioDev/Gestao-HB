/** Divisão de parcelas (regras-negocio §3): N iguais, resto de centavos na última. */
export interface ParcelaGerada {
  numero: number;
  valorCentavos: number;
  /** ISO date yyyy-mm-dd */
  vencimento: string;
}

export function gerarParcelasIguais(
  totalCentavos: number,
  quantidade: number,
  primeiraData: string,
  intervaloDias: number,
): ParcelaGerada[] {
  if (!Number.isInteger(totalCentavos) || totalCentavos <= 0) throw new Error('Total inválido');
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 36) throw new Error('Quantidade de parcelas inválida');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeiraData)) throw new Error('Data da primeira parcela inválida');

  const base = Math.floor(totalCentavos / quantidade);
  const parcelas: ParcelaGerada[] = [];
  for (let i = 0; i < quantidade; i++) {
    const dataBase = new Date(`${primeiraData}T00:00:00Z`);
    dataBase.setUTCDate(dataBase.getUTCDate() + i * intervaloDias);
    parcelas.push({
      numero: i + 1,
      valorCentavos: i === quantidade - 1 ? totalCentavos - base * (quantidade - 1) : base,
      vencimento: dataBase.toISOString().slice(0, 10),
    });
  }
  return parcelas;
}
