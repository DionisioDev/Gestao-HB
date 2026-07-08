'use client';

import type { StatusPedido } from '@gestao-hb/core';
import { rotuloStatusPedido, tomStatusPedido } from '@gestao-hb/ui';

export { rotuloStatusPedido, tomStatusPedido };

/** Transições permitidas de status (brief Fase 2 §2.2). */
export const PROXIMOS_STATUS: Record<StatusPedido, StatusPedido[]> = {
  rascunho: ['emitido', 'cancelado'],
  emitido: ['enviadoIndustria', 'cancelado'],
  enviadoIndustria: ['faturado', 'cancelado'],
  faturado: ['entregue', 'cancelado'],
  entregue: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: [],
};
