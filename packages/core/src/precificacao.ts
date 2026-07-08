import { arredondarCentavos, percentualDe } from './dinheiro.js';

/**
 * Preço de item por grama (docs/regras-negocio.md §1.2 — só Inove/Tendenze, ADR-005):
 * precoItem = round(pesoMg × valorGrama / 1000)
 */
export function precoPorGrama(pesoMg: number, valorGramaCentavos: number): number {
  if (!Number.isInteger(pesoMg) || pesoMg <= 0) throw new Error(`Peso inválido (mg): ${pesoMg}`);
  if (!Number.isInteger(valorGramaCentavos) || valorGramaCentavos <= 0) {
    throw new Error(`Valor do grama inválido (centavos): ${valorGramaCentavos}`);
  }
  return arredondarCentavos((pesoMg * valorGramaCentavos) / 1000);
}

/** Subtotal do item (§1.3). Qtde fracionada (até 3 casas) permitida para itens por grama. */
export function subtotalItem(precoUnitCentavos: number, qtde: number): number {
  if (qtde <= 0) throw new Error(`Quantidade inválida: ${qtde}`);
  return arredondarCentavos(precoUnitCentavos * qtde);
}

export interface ComposicaoTotal {
  somaItensCentavos: number;
  freteCentavos?: number;
  acrescimoCentavos?: number;
  descontoCentavos?: number;
}

/** Total do pedido (§1.3): Σ itens + frete + acréscimo − desconto. */
export function totalPedido(c: ComposicaoTotal): number {
  const total =
    c.somaItensCentavos +
    (c.freteCentavos ?? 0) +
    (c.acrescimoCentavos ?? 0) -
    (c.descontoCentavos ?? 0);
  if (total < 0) throw new Error('Total do pedido não pode ser negativo');
  return total;
}

/** Converte acréscimo/desconto percentual em centavos sobre a soma dos itens (§1.3). */
export function percentualSobreItens(somaItensCentavos: number, pct: number): number {
  return percentualDe(somaItensCentavos, pct);
}
