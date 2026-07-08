import { percentualDe } from './dinheiro.js';
import type { RegimeComissao, RegraVendedor } from './tipos.js';

/**
 * Comissão do escritório (docs/regras-negocio.md §2.1):
 * base = total − frete; comissão = round(base × pct/100)
 */
export function comissaoEscritorio(
  totalPedidoCentavos: number,
  freteCentavos: number,
  pctEscritorio: number,
): number {
  const base = totalPedidoCentavos - freteCentavos;
  if (base < 0) throw new Error('Base de comissão negativa');
  return percentualDe(base, pctEscritorio);
}

/** Comissão proporcional do vendedor sobre a comissão do escritório (§2.2). */
export function comissaoVendedor(comissaoEscritorioCentavos: number, pctProporcional: number): number {
  return percentualDe(comissaoEscritorioCentavos, pctProporcional);
}

/**
 * Resolve a linha da matriz do vendedor para (indústria, tabela).
 * Linha específica da tabela vence a linha 'Todas' ('*'). Sem linha → sem permissão de emitir (§2.2).
 */
export function resolverRegraVendedor(
  regras: readonly RegraVendedor[],
  industriaId: string,
  tabelaId: string,
): RegraVendedor | undefined {
  const daIndustria = regras.filter((r) => r.industriaId === industriaId);
  return daIndustria.find((r) => r.tabelaId === tabelaId) ?? daIndustria.find((r) => r.tabelaId === '*');
}

export interface ParametrosElegibilidade {
  regime: RegimeComissao;
  dataEmissao: Date;
  /** data em que a última parcela foi baixada (pedido quitado) — Regime B */
  dataQuitacao?: Date;
  cancelado?: boolean;
}

export interface PeriodoFechamento {
  ano: number;
  /** 1..12 */
  mes: number;
}

export interface ResultadoElegibilidade {
  elegivel: boolean;
  motivo: 'emitidoNoMes' | 'quitado' | 'foraDoPeriodo' | 'aguardandoPagtoCliente' | 'cancelado';
  /** Regime A: previsão de recebimento (dia de pagamento no mês seguinte ao período). */
  previsaoRecebimento?: Date;
}

function fimDoMes(p: PeriodoFechamento): Date {
  return new Date(Date.UTC(p.ano, p.mes, 0, 23, 59, 59, 999));
}

function dentroDoMes(d: Date, p: PeriodoFechamento): boolean {
  return d.getUTCFullYear() === p.ano && d.getUTCMonth() + 1 === p.mes;
}

/**
 * Elegibilidade da comissão para o fechamento de um período (docs/regras-negocio.md §2.3).
 * Regime A: elegível se o pedido foi EMITIDO dentro do mês do fechamento.
 * Regime B: elegível se o pedido foi QUITADO até o fim do mês do fechamento
 *           (o chamador exclui comissões já fechadas em períodos anteriores).
 */
export function elegibilidadeParaFechamento(
  c: ParametrosElegibilidade,
  periodo: PeriodoFechamento,
  diaPagtoComissao = 15,
): ResultadoElegibilidade {
  if (c.cancelado) return { elegivel: false, motivo: 'cancelado' };

  if (c.regime === 'mensalFixo') {
    if (!dentroDoMes(c.dataEmissao, periodo)) return { elegivel: false, motivo: 'foraDoPeriodo' };
    return {
      elegivel: true,
      motivo: 'emitidoNoMes',
      previsaoRecebimento: new Date(Date.UTC(periodo.ano, periodo.mes, diaPagtoComissao)),
    };
  }

  if (!c.dataQuitacao) return { elegivel: false, motivo: 'aguardandoPagtoCliente' };
  if (c.dataQuitacao.getTime() > fimDoMes(periodo).getTime()) {
    return { elegivel: false, motivo: 'foraDoPeriodo' };
  }
  return { elegivel: true, motivo: 'quitado' };
}

export interface ParcelaPaga {
  valorCentavos: number;
  /** ausente = parcela ainda em aberto */
  dataPagto?: Date;
}

/**
 * Regime B com elegibilidade 'porParcela' (regras-negocio §2.3, exemplos E6/E7):
 * fração da comissão elegível = round(comissaoTotal × valorPago / totalPedido),
 * considerando as parcelas pagas até o fim do período.
 */
export function comissaoElegivelPorParcelas(
  comissaoTotalCentavos: number,
  totalPedidoCentavos: number,
  parcelas: readonly ParcelaPaga[],
  periodo: PeriodoFechamento,
): { valorElegivelCentavos: number; valorPagoCentavos: number } {
  if (totalPedidoCentavos <= 0) throw new Error('Total do pedido inválido');
  const limite = fimDoMes(periodo).getTime();
  const valorPagoCentavos = parcelas
    .filter((p) => p.dataPagto && p.dataPagto.getTime() <= limite)
    .reduce((soma, p) => soma + p.valorCentavos, 0);
  return {
    valorElegivelCentavos: percentualDe(comissaoTotalCentavos, (valorPagoCentavos / totalPedidoCentavos) * 100),
    valorPagoCentavos,
  };
}
