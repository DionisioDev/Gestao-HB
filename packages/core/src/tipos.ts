/**
 * Tipos do domínio — ver docs/arquitetura.md (§3) e docs/regras-negocio.md.
 * Dinheiro em centavos (inteiro); peso em miligramas (inteiro); percentuais em número decimal (40 = 40%).
 */

export type RegimeComissao = 'mensalFixo' | 'posRecebimento';
export type ModeloPreco = 'porGrama' | 'tabelado';

export type StatusComissao =
  | 'aguardandoPagtoCliente'
  | 'elegivel'
  | 'fechada'
  | 'paga'
  | 'estornada';

export type StatusParcela = 'aberto' | 'parcial' | 'pago';

export type StatusPedido =
  | 'rascunho'
  | 'emitido'
  | 'enviadoIndustria'
  | 'faturado'
  | 'entregue'
  | 'finalizado'
  | 'cancelado';

/** Linha da matriz do vendedor: comissão proporcional + permissão de tabela. */
export interface RegraVendedor {
  industriaId: string;
  /** id da tabela de preço ou '*' para todas as tabelas da indústria */
  tabelaId: string;
  comissaoProporcionalPct: number;
  acrescimoTabelaPct: number;
  podeAlterarPreco: boolean;
  limiteDescontoPct: number;
}

export interface ItemPedido {
  produtoId: string;
  sku: string;
  descricao: string;
  /** unidades; itens por grama aceitam até 3 casas decimais (gramas) */
  qtde: number;
  pesoMg?: number;
  precoTabelaCentavos: number;
  precoFinalCentavos: number;
  subtotalCentavos: number;
}

export interface TotaisPedido {
  itensCentavos: number;
  freteCentavos: number;
  acrescimoCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
}
