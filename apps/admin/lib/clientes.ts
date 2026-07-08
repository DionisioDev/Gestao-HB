'use client';

import type { StatusCliente } from '@gestao-hb/core';
import type { TomStatus } from '@gestao-hb/ui';

export const ROTULO_STATUS_CLIENTE: Record<StatusCliente, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  juridico: 'Jurídico',
  potencial: 'Potencial',
  prospectado: 'Prospectado',
  semCredito: 'Sem crédito',
  fechou: 'Fechou',
  lead: 'Lead',
};

export const TOM_STATUS_CLIENTE: Record<StatusCliente, TomStatus> = {
  ativo: 'sucesso',
  inativo: 'neutro',
  juridico: 'erro',
  potencial: 'info',
  prospectado: 'info',
  semCredito: 'atencao',
  fechou: 'erro',
  lead: 'info',
};
