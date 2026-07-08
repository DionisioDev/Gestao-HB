import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

// Região e defaults do projeto (docs/arquitetura.md §5/§7)
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

const SESSAO_MAX_MS = 24 * 60 * 60 * 1000;

/** Guarda comum: autenticado, sessão ≤ 24h (seção 7 da especificação). */
export function exigirSessao(auth: { uid: string; token: Record<string, unknown> } | undefined) {
  if (!auth) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
  const authTime = Number(auth.token['auth_time']) * 1000;
  if (Date.now() - authTime > SESSAO_MAX_MS) {
    throw new HttpsError('unauthenticated', 'Sessão expirada. Faça login novamente.');
  }
  return auth;
}

/** Verificação de saúde do backend (usada pelo smoke test do deploy). */
export const healthcheck = onCall((request) => {
  exigirSessao(request.auth);
  return { ok: true, timestamp: Date.now() };
});
