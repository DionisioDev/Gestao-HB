// Cria/remove usuários demo temporários para captura de telas da apresentação.
// Uso: node scripts/usuario-demo.mjs criar|remover
// Credencial: serviceAccount.json na raiz ou `firebase login`.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { obterCredencialAdmin } from './lib/credencial-google.mjs';

const acao = process.argv[2];
const { credential, projeto, limpar } = await obterCredencialAdmin();
process.on('exit', limpar);
initializeApp({ credential, projectId: projeto ?? 'gestao-hb' });
const db = getFirestore();
const auth = getAuth();

const DEMOS = [
  { email: 'demo-admin@gestao-hb.local', perfil: 'admin', nome: 'Demo Admin' },
  { email: 'demo-vendedor@gestao-hb.local', perfil: 'vendedor', nome: 'Fabio (demo)', vendedorId: 'vendedor-teste' },
];
const SENHA = 'Demo-HB-2026!captura';

if (acao === 'criar') {
  for (const d of DEMOS) {
    let usuario;
    try {
      usuario = await auth.getUserByEmail(d.email);
      await auth.updateUser(usuario.uid, { password: SENHA, disabled: false });
    } catch {
      usuario = await auth.createUser({ email: d.email, password: SENHA, displayName: d.nome });
    }
    await db.doc(`usuarios/${usuario.uid}`).set(
      { email: d.email, nome: d.nome, perfil: d.perfil, ativo: true, ...(d.vendedorId ? { vendedorId: d.vendedorId } : {}), criadoEm: FieldValue.serverTimestamp() },
      { merge: true },
    );
    console.log('OK criado/atualizado:', d.email, usuario.uid);
  }
  console.log('SENHA:', SENHA);
} else if (acao === 'remover') {
  for (const d of DEMOS) {
    try {
      const usuario = await auth.getUserByEmail(d.email);
      await auth.deleteUser(usuario.uid);
      await db.doc(`usuarios/${usuario.uid}`).delete();
      console.log('OK removido:', d.email);
    } catch {
      console.log('já não existia:', d.email);
    }
  }
} else {
  console.error('Uso: node scripts/usuario-demo.mjs criar|remover');
  process.exit(1);
}
