'use client';

import { configFirebase, criarClienteFirebase, type ClienteFirebase } from '@gestao-hb/firebase';

let cliente: ClienteFirebase | null = null;

/** Singleton do cliente Firebase no browser. */
export function fb(): ClienteFirebase {
  cliente ??= criarClienteFirebase({
    config: configFirebase,
    emuladores: process.env.NEXT_PUBLIC_EMULADORES === '1',
  });
  return cliente;
}
