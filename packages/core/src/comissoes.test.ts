import { describe, expect, it } from 'vitest';
import {
  comissaoElegivelPorParcelas,
  comissaoEscritorio,
  comissaoVendedor,
  elegibilidadeParaFechamento,
  resolverRegraVendedor,
} from './comissoes.js';
import type { RegraVendedor } from './tipos.js';

// Exemplos C1–C3 de docs/regras-negocio.md §2.1/2.2
describe('comissão do escritório e do vendedor', () => {
  it('C1: total 10.000, sem frete, 10% escritório, 40% proporcional', () => {
    const esc = comissaoEscritorio(1000000, 0, 10);
    expect(esc).toBe(100000);
    expect(comissaoVendedor(esc, 40)).toBe(40000);
  });

  it('C2: base exclui frete (5.016,94 − 16,94 = 5.000,00), 12% e 40%', () => {
    const esc = comissaoEscritorio(501694, 1694, 12);
    expect(esc).toBe(60000);
    expect(comissaoVendedor(esc, 40)).toBe(24000);
  });

  it('C3: percentuais quebrados com half-up (337,15 × 10,5% = 35,40)', () => {
    const esc = comissaoEscritorio(33715, 0, 10.5);
    expect(esc).toBe(3540); // 3540,075
    expect(comissaoVendedor(esc, 35)).toBe(1239);
  });
});

describe('resolverRegraVendedor (matriz indústria × tabela — §2.2)', () => {
  const regras: RegraVendedor[] = [
    { industriaId: 'inove', tabelaId: 'vendas-900', comissaoProporcionalPct: 40, acrescimoTabelaPct: 0, podeAlterarPreco: false, limiteDescontoPct: 0 },
    { industriaId: 'inove', tabelaId: '*', comissaoProporcionalPct: 30, acrescimoTabelaPct: 0, podeAlterarPreco: false, limiteDescontoPct: 0 },
    { industriaId: 'spart', tabelaId: '*', comissaoProporcionalPct: 40, acrescimoTabelaPct: 0, podeAlterarPreco: true, limiteDescontoPct: 5 },
  ];

  it('linha específica da tabela vence a linha Todas', () => {
    expect(resolverRegraVendedor(regras, 'inove', 'vendas-900')?.comissaoProporcionalPct).toBe(40);
    expect(resolverRegraVendedor(regras, 'inove', 'heri-700')?.comissaoProporcionalPct).toBe(30);
  });

  it('sem linha para a indústria → sem permissão (undefined)', () => {
    expect(resolverRegraVendedor(regras, 'zarrara', 'zarrara')).toBeUndefined();
  });
});

// Exemplos E1–E5 de docs/regras-negocio.md §2.3
describe('elegibilidadeParaFechamento', () => {
  const julho = { ano: 2026, mes: 7 };

  it('E1: Regime A emitido 10/07 → elegível em julho, previsão 15/08', () => {
    const r = elegibilidadeParaFechamento(
      { regime: 'mensalFixo', dataEmissao: new Date(Date.UTC(2026, 6, 10)) },
      julho,
    );
    expect(r.elegivel).toBe(true);
    expect(r.previsaoRecebimento?.toISOString().slice(0, 10)).toBe('2026-08-15');
  });

  it('E2: Regime B quitado 20/07 → elegível em julho', () => {
    const r = elegibilidadeParaFechamento(
      {
        regime: 'posRecebimento',
        dataEmissao: new Date(Date.UTC(2026, 6, 10)),
        dataQuitacao: new Date(Date.UTC(2026, 6, 20)),
      },
      julho,
    );
    expect(r).toMatchObject({ elegivel: true, motivo: 'quitado' });
  });

  it('E3: Regime B com pagamento parcial → aguardando pagamento do cliente', () => {
    const r = elegibilidadeParaFechamento(
      { regime: 'posRecebimento', dataEmissao: new Date(Date.UTC(2026, 6, 10)) },
      julho,
    );
    expect(r).toMatchObject({ elegivel: false, motivo: 'aguardandoPagtoCliente' });
  });

  it('E4: Regime A emitido 28/06 não entra no fechamento de julho', () => {
    const r = elegibilidadeParaFechamento(
      { regime: 'mensalFixo', dataEmissao: new Date(Date.UTC(2026, 5, 28)) },
      julho,
    );
    expect(r).toMatchObject({ elegivel: false, motivo: 'foraDoPeriodo' });
  });

  it('E5: Regime B emitido em junho e quitado 02/07 → elegível em julho', () => {
    const r = elegibilidadeParaFechamento(
      {
        regime: 'posRecebimento',
        dataEmissao: new Date(Date.UTC(2026, 5, 5)),
        dataQuitacao: new Date(Date.UTC(2026, 6, 2)),
      },
      julho,
    );
    expect(r.elegivel).toBe(true);
  });

  it('cancelado nunca é elegível', () => {
    const r = elegibilidadeParaFechamento(
      { regime: 'mensalFixo', dataEmissao: new Date(Date.UTC(2026, 6, 10)), cancelado: true },
      julho,
    );
    expect(r).toMatchObject({ elegivel: false, motivo: 'cancelado' });
  });

  it('E6: porParcela — 1 de 3 parcelas iguais paga no período → 1/3 da comissão elegível', () => {
    const r = comissaoElegivelPorParcelas(
      30000,
      300000,
      [
        { valorCentavos: 100000, dataPagto: new Date(Date.UTC(2026, 6, 15)) },
        { valorCentavos: 100000 },
        { valorCentavos: 100000 },
      ],
      julho,
    );
    expect(r.valorPagoCentavos).toBe(100000);
    expect(r.valorElegivelCentavos).toBe(10000); // R$ 100,00; vendedor 40% → 4000 c
    expect(comissaoVendedor(r.valorElegivelCentavos, 40)).toBe(4000);
  });

  it('E7: porParcela — parcelas de valores diferentes somam proporcionalmente', () => {
    const r = comissaoElegivelPorParcelas(
      30000,
      300000,
      [
        { valorCentavos: 100000, dataPagto: new Date(Date.UTC(2026, 6, 10)) },
        { valorCentavos: 50000, dataPagto: new Date(Date.UTC(2026, 6, 25)) },
        { valorCentavos: 150000 },
      ],
      julho,
    );
    expect(r.valorElegivelCentavos).toBe(15000); // R$ 150,00
  });

  it('porParcela — parcela paga após o fim do período não conta', () => {
    const r = comissaoElegivelPorParcelas(
      30000,
      300000,
      [{ valorCentavos: 100000, dataPagto: new Date(Date.UTC(2026, 7, 1)) }],
      julho,
    );
    expect(r.valorElegivelCentavos).toBe(0);
  });

  it('Regime B quitado após o fim do período → fora do período', () => {
    const r = elegibilidadeParaFechamento(
      {
        regime: 'posRecebimento',
        dataEmissao: new Date(Date.UTC(2026, 6, 10)),
        dataQuitacao: new Date(Date.UTC(2026, 7, 1)),
      },
      julho,
    );
    expect(r).toMatchObject({ elegivel: false, motivo: 'foraDoPeriodo' });
  });
});
