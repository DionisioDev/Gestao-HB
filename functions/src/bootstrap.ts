import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { auditar } from './auditoria.js';
import { exigirSessao } from './sessao.js';

/**
 * Promoção one-shot do PRIMEIRO administrador: só funciona enquanto nenhum
 * usuário tiver o claim de admin. Depois disso, retorna sempre erro —
 * novos usuários são criados pela área de usuários (Anexo A da especificação).
 */
export const bootstrapAdmin = onCall(async (request) => {
  const auth = exigirSessao(request.auth);
  const db = getFirestore();

  const jaExisteAdmin = !(await db.collection('usuarios').where('perfil', '==', 'admin').limit(1).get()).empty;
  if (jaExisteAdmin) {
    throw new HttpsError('failed-precondition', 'O sistema já possui um administrador.');
  }

  const usuarioAuth = await getAuth().getUser(auth.uid);
  await getAuth().setCustomUserClaims(auth.uid, { perfil: 'admin' });
  await db.doc(`usuarios/${auth.uid}`).set({
    email: usuarioAuth.email,
    nome: usuarioAuth.displayName ?? usuarioAuth.email,
    perfil: 'admin',
    ativo: true,
    criadoEm: FieldValue.serverTimestamp(),
    ultimaSessao: FieldValue.serverTimestamp(),
  });

  await auditar({
    usuarioId: auth.uid,
    usuarioNome: usuarioAuth.email ?? auth.uid,
    perfil: 'admin',
    acao: 'bootstrap_admin',
    entidadeTipo: 'usuario',
    entidadeId: auth.uid,
    antes: null,
    depois: { perfil: 'admin', ativo: true },
    origem: 'sistema',
  });

  return { ok: true };
});
