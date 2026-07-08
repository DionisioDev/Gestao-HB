import { configFirebase, criarClienteFirebase, type ClienteFirebase } from '@gestao-hb/firebase';

let cliente: ClienteFirebase | null = null;

/** Singleton Firebase do app do vendedor — com persistência offline (ADR-008). */
export function fb(): ClienteFirebase {
  cliente ??= criarClienteFirebase({
    config: configFirebase,
    offline: true,
    emuladores: import.meta.env['VITE_EMULADORES'] === '1',
  });
  return cliente;
}
