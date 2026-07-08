import { describe, expect, it } from 'vitest';
import { gerarParcelasIguais } from './parcelas.js';

// Exemplos de docs/regras-negocio.md §3
describe('gerarParcelasIguais', () => {
  it('R$ 100,00 em 3× → 33,33 + 33,33 + 33,34 (resto na última)', () => {
    const p = gerarParcelasIguais(10000, 3, '2026-08-10', 30);
    expect(p.map((x) => x.valorCentavos)).toEqual([3333, 3333, 3334]);
    expect(p.map((x) => x.vencimento)).toEqual(['2026-08-10', '2026-09-09', '2026-10-09']);
  });

  it('R$ 90,00 em 3× → três parcelas de 30,00', () => {
    expect(gerarParcelasIguais(9000, 3, '2026-08-01', 30).map((x) => x.valorCentavos)).toEqual([3000, 3000, 3000]);
  });

  it('parcela única leva o total', () => {
    expect(gerarParcelasIguais(16114, 1, '2026-08-01', 30)[0]?.valorCentavos).toBe(16114);
  });

  it('soma das parcelas sempre bate com o total', () => {
    const p = gerarParcelasIguais(123457, 7, '2026-08-01', 28);
    expect(p.reduce((s, x) => s + x.valorCentavos, 0)).toBe(123457);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => gerarParcelasIguais(0, 3, '2026-08-01', 30)).toThrow();
    expect(() => gerarParcelasIguais(1000, 0, '2026-08-01', 30)).toThrow();
    expect(() => gerarParcelasIguais(1000, 2, '01/08/2026', 30)).toThrow();
  });
});
