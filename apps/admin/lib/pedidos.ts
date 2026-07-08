'use client';

import { emitirPedido as emitirCompartilhado, type DadosEmissao, type ItemEmissao } from '@gestao-hb/firebase';
import { fb } from './firebase';

export type { DadosEmissao, ItemEmissao };

/** Emissão pelo admin — delega ao motor compartilhado (packages/firebase/emissao). */
export async function emitirPedido(dados: DadosEmissao): Promise<{ id: string; numero: number }> {
  const usuario = fb().auth.currentUser;
  if (!usuario) throw new Error('Sessão expirada. Faça login novamente.');
  return emitirCompartilhado(
    fb().db,
    { uid: usuario.uid, nome: usuario.email ?? usuario.uid, origem: 'admin', perfil: 'admin' },
    dados,
  );
}
