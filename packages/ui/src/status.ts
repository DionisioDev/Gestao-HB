import type { StatusParcela, StatusPedido } from '@gestao-hb/core';

export type TomStatus = 'sucesso' | 'atencao' | 'erro' | 'info' | 'neutro';

/** Mapeamento único status → tom de cor (seção 6: um mesmo status tem sempre a mesma cor). */
export const tomStatusPedido: Record<StatusPedido, TomStatus> = {
  rascunho: 'neutro',
  emitido: 'info',
  enviadoIndustria: 'info',
  faturado: 'atencao',
  entregue: 'atencao',
  finalizado: 'sucesso',
  cancelado: 'erro',
};

export const rotuloStatusPedido: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  emitido: 'Emitido',
  enviadoIndustria: 'Enviado à indústria',
  faturado: 'Faturado',
  entregue: 'Entregue',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const tomStatusParcela: Record<StatusParcela, TomStatus> = {
  aberto: 'atencao',
  parcial: 'atencao',
  pago: 'sucesso',
};

export const rotuloStatusParcela: Record<StatusParcela, string> = {
  aberto: 'Em aberto',
  parcial: 'Parcial',
  pago: 'Pago',
};
