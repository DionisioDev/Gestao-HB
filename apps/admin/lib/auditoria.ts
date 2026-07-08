'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { fb } from './firebase';

/**
 * Auditoria INTERINA no cliente (create-only pelas Rules; update/delete negados).
 * Quando as Functions entrarem (Blaze), a gravação migra para o servidor (especificação §2.8).
 */
export async function auditar(
  acao: string,
  entidadeTipo: string,
  entidadeId: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): Promise<void> {
  const usuario = fb().auth.currentUser;
  if (!usuario) return;
  try {
    await addDoc(collection(fb().db, 'auditoria'), {
      usuarioId: usuario.uid,
      usuarioNome: usuario.email ?? usuario.uid,
      perfil: 'admin',
      acao,
      entidadeTipo,
      entidadeId,
      antes,
      depois,
      origem: 'admin',
      timestamp: serverTimestamp(),
    });
  } catch (erro) {
    console.error('Falha ao auditar', acao, erro);
  }
}

/** Remove chaves undefined (Firestore não aceita undefined). */
export function limparIndefinidos<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
