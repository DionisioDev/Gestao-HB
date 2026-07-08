import { HttpsError } from 'firebase-functions/v2/https';

const SESSAO_MAX_MS = 24 * 60 * 60 * 1000;

export interface AuthCallable {
  uid: string;
  token: Record<string, unknown>;
}

/** Guarda comum: autenticado e sessão ≤ 24h (seção 7 da especificação). */
export function exigirSessao(auth: AuthCallable | undefined): AuthCallable {
  if (!auth) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
  const authTime = Number(auth.token['auth_time']) * 1000;
  if (!Number.isFinite(authTime) || Date.now() - authTime > SESSAO_MAX_MS) {
    throw new HttpsError('unauthenticated', 'Sessão expirada. Faça login novamente.');
  }
  return auth;
}

/** Exige perfil admin (claims verificadas no backend — arquitetura §4). */
export function exigirAdmin(auth: AuthCallable | undefined): AuthCallable {
  const a = exigirSessao(auth);
  if (a.token['perfil'] !== 'admin') {
    throw new HttpsError('permission-denied', 'Acesso restrito a administradores.');
  }
  return a;
}
