'use client';

import { configFirebase } from '@gestao-hb/firebase';
import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';

/**
 * Cria a conta no Firebase Auth SEM derrubar a sessão do admin:
 * usa uma instância secundária do app, senha aleatória forte e dispara o
 * e-mail de redefinição — a senha nunca transita nem é conhecida (Anexo A.2.4).
 */
export async function criarContaAuth(email: string): Promise<string> {
  const existente = getApps().find((a) => a.name === 'criacao-usuario');
  const app2 = existente ?? initializeApp(configFirebase, 'criacao-usuario');
  const auth2 = getAuth(app2);
  try {
    const senhaDescartavel = `${crypto.randomUUID()}${crypto.randomUUID().toUpperCase()}!9`;
    const cred = await createUserWithEmailAndPassword(auth2, email, senhaDescartavel);
    await sendPasswordResetEmail(auth2, email);
    await signOut(auth2);
    return cred.user.uid;
  } finally {
    await deleteApp(app2).catch(() => {});
  }
}

export function mensagemErroCriacao(codigo: string): string {
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com esse e-mail.';
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique a digitação.';
    default:
      return 'Não foi possível criar a conta agora. Tente novamente.';
  }
}
