import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { exigirSessao } from './sessao.js';

initializeApp();

// Região e defaults do projeto (docs/arquitetura.md §5/§7)
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

export { bootstrapAdmin } from './bootstrap.js';

/** Verificação de saúde do backend (usada pelo smoke test do deploy). */
export const healthcheck = onCall((request) => {
  exigirSessao(request.auth);
  return { ok: true, timestamp: Date.now() };
});
