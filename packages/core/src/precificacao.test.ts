import { describe, expect, it } from 'vitest';
import { percentualSobreItens, precoPorGrama, subtotalItem, totalPedido } from './precificacao.js';

// Exemplos P1–P4 de docs/regras-negocio.md §1.2
describe('precoPorGrama', () => {
  it('P1: 3,500 g × R$ 46,04 = R$ 161,14', () => {
    expect(precoPorGrama(3500, 4604)).toBe(16114);
  });

  it('P2: 2,335 g × R$ 38,04 = R$ 88,82 (arredonda 8882,34 para baixo)', () => {
    expect(precoPorGrama(2335, 3804)).toBe(8882);
  });

  it('P3: 0,850 g × R$ 44,12 = R$ 37,50 (arredonda 3750,2 para baixo)', () => {
    expect(precoPorGrama(850, 4412)).toBe(3750);
  });

  it('P4: 10 g × R$ 46,04 = R$ 460,40', () => {
    expect(precoPorGrama(10000, 4604)).toBe(46040);
  });

  it('rejeita peso e valor do grama inválidos', () => {
    expect(() => precoPorGrama(0, 4604)).toThrow();
    expect(() => precoPorGrama(3500.5, 4604)).toThrow();
    expect(() => precoPorGrama(3500, 0)).toThrow();
  });
});

describe('subtotalItem e totalPedido (§1.3)', () => {
  it('quantidade inteira', () => {
    expect(subtotalItem(16114, 3)).toBe(48342);
  });

  it('quantidade fracionada (item por grama, meio-arredondamento half-up)', () => {
    expect(subtotalItem(4604, 2.335)).toBe(10750); // 10750,34
    expect(subtotalItem(101, 2.5)).toBe(253); // 252,5 → half-up
  });

  it('total = itens + frete + acréscimo − desconto', () => {
    expect(
      totalPedido({
        somaItensCentavos: 100000,
        freteCentavos: 2500,
        acrescimoCentavos: 1000,
        descontoCentavos: 500,
      }),
    ).toBe(103000);
  });

  it('total não pode ser negativo', () => {
    expect(() => totalPedido({ somaItensCentavos: 100, descontoCentavos: 200 })).toThrow();
  });

  it('acréscimo/desconto percentual sobre os itens', () => {
    expect(percentualSobreItens(100000, 10)).toBe(10000);
    expect(percentualSobreItens(33715, 10.5)).toBe(3540); // 3540,07
  });
});
