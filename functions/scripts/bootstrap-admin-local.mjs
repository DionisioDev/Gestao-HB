// Bootstrap local do primeiro admin — usado enquanto o projeto não tem Blaze/Functions.
// Uso: node scripts/bootstrap-admin-local.mjs <email>  (rodar de dentro de functions/,
// com a chave em ../serviceAccount.json — arquivo gitignored, nunca commitar)
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/bootstrap-admin-local.mjs <email>');
  process.exit(1);
}

const chave = JSON.parse(readFileSync(new URL('../../serviceAccount.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(chave), projectId: chave.project_id });

const usuario = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(usuario.uid, { perfil: 'admin' });

const db = getFirestore();
await db.doc(`usuarios/${usuario.uid}`).set(
  {
    email: usuario.email,
    nome: usuario.displayName ?? usuario.email,
    perfil: 'admin',
    ativo: true,
    criadoEm: FieldValue.serverTimestamp(),
    ultimaSessao: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

await db.collection('auditoria').add({
  usuarioId: usuario.uid,
  usuarioNome: usuario.email,
  perfil: 'admin',
  acao: 'bootstrap_admin_local',
  entidadeTipo: 'usuario',
  entidadeId: usuario.uid,
  antes: null,
  depois: { perfil: 'admin', ativo: true },
  origem: 'sistema',
  timestamp: FieldValue.serverTimestamp(),
});

console.log(`OK: ${email} (uid ${usuario.uid}) agora é admin, com doc em usuarios/ e auditoria gravada.`);
console.log('Obs.: se já estava logado no app, saia e entre de novo para o token trazer o novo perfil.');
