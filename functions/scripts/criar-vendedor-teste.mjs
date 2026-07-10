// Cria um vendedor de teste completo: cadastro comercial (matriz INOVE) +
// conta de login vinculada + link de definição de senha impresso no console.
// Uso: node scripts/criar-vendedor-teste.mjs <email>  (com ../serviceAccount.json)
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/criar-vendedor-teste.mjs <email>');
  process.exit(1);
}

const chave = JSON.parse(readFileSync(new URL('../../serviceAccount.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(chave), projectId: chave.project_id });
const db = getFirestore();

// 1. Cadastro comercial do vendedor (reaproveita se já existir)
const vendedorId = 'vendedor-teste';
const regras = [
  { industriaId: 'inove', tabelaId: '*', comissaoProporcionalPct: 40, acrescimoTabelaPct: 0, podeAlterarPreco: false, limiteDescontoPct: 0 },
  { industriaId: 'spart', tabelaId: '*', comissaoProporcionalPct: 40, acrescimoTabelaPct: 0, podeAlterarPreco: false, limiteDescontoPct: 5 },
];
await db.doc(`vendedores/${vendedorId}`).set(
  {
    nome: 'Vendedor Teste',
    email,
    regras,
    tabelasLiberadas: [...new Set(regras.map((r) => `${r.industriaId}/${r.tabelaId}`))],
    ativo: true,
    criadoEm: FieldValue.serverTimestamp(),
  },
  { merge: true },
);
console.log(`OK vendedor comercial: vendedores/${vendedorId} (INOVE e SPART, 40%)`);

// 2. Conta de login (Auth) — cria ou reaproveita
let usuario;
try {
  usuario = await getAuth().getUserByEmail(email);
  console.log(`Conta Auth já existia: ${usuario.uid}`);
} catch {
  usuario = await getAuth().createUser({ email, displayName: 'Vendedor Teste' });
  console.log(`OK conta Auth criada: ${usuario.uid}`);
}

// 3. Documento de acesso vinculado
await db.doc(`usuarios/${usuario.uid}`).set(
  {
    email,
    nome: 'Vendedor Teste',
    perfil: 'vendedor',
    vendedorId,
    ativo: true,
    criadoEm: FieldValue.serverTimestamp(),
  },
  { merge: true },
);
console.log(`OK usuarios/${usuario.uid} (perfil vendedor -> ${vendedorId})`);

await db.collection('auditoria').add({
  usuarioId: 'sistema',
  usuarioNome: 'script local',
  perfil: 'admin',
  acao: 'vendedor_teste_criado',
  entidadeTipo: 'usuario',
  entidadeId: usuario.uid,
  antes: null,
  depois: { email, perfil: 'vendedor', vendedorId },
  origem: 'sistema',
  timestamp: FieldValue.serverTimestamp(),
});

// 4. Link de definição de senha (sem depender de e-mail)
const link = await getAuth().generatePasswordResetLink(email);
console.log('\n=== LINK PARA DEFINIR A SENHA (abra no navegador) ===');
console.log(link);
