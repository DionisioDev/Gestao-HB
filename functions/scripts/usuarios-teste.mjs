// Cria (ou atualiza) as duas contas genéricas para o cliente testar o sistema:
// um administrador e um vendedor já com cadastro comercial e tabelas liberadas.
// Idempotente: rodar de novo apenas redefine a senha e reativa as contas.
//
// Uso: node scripts/usuarios-teste.mjs [--senha <senha>] [--remover]
// Credencial: serviceAccount.json na raiz ou `firebase login`.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { obterCredencialAdmin } from './lib/credencial-google.mjs';

const argumentos = process.argv.slice(2);
const valorDe = (flag, padrao) => {
  const i = argumentos.indexOf(flag);
  return i >= 0 ? argumentos[i + 1] : padrao;
};

const SENHA = valorDe('--senha', 'TesteHB@2026');
const REMOVER = argumentos.includes('--remover');
const VENDEDOR_ID = 'vendedor-teste-cliente';

const CONTAS = [
  { email: 'admin.teste@gestao-hb.com.br', nome: 'Administrador (teste)', perfil: 'admin' },
  { email: 'vendedor.teste@gestao-hb.com.br', nome: 'Vendedor (teste)', perfil: 'vendedor', vendedorId: VENDEDOR_ID },
];

const { credential, projeto, origem, limpar } = await obterCredencialAdmin();
process.on('exit', limpar); // o ADC temporário não sobrevive ao processo, nem em erro

initializeApp({ credential, projectId: projeto ?? 'gestao-hb' });
console.log(`Credencial: ${origem} | projeto: ${projeto ?? 'gestao-hb'}\n`);

const db = getFirestore();
const auth = getAuth();

if (REMOVER) {
  for (const conta of CONTAS) {
    try {
      const usuario = await auth.getUserByEmail(conta.email);
      await auth.deleteUser(usuario.uid);
      await db.doc(`usuarios/${usuario.uid}`).delete();
      console.log(`removido: ${conta.email}`);
    } catch {
      console.log(`já não existia: ${conta.email}`);
    }
  }
  await db.doc(`vendedores/${VENDEDOR_ID}`).delete();
  console.log('\nContas de teste removidas.');
} else {
  // Só faz sentido liberar indústria que tenha tabela de preço: sem catálogo o
  // vendedor de teste cai no estado vazio e não consegue montar pedido nenhum.
  const industrias = await db.collection('industrias').get();
  const comCatalogo = [];
  for (const industria of industrias.docs) {
    const tabelas = await industria.ref.collection('tabelasPreco').limit(1).get();
    if (!tabelas.empty) comCatalogo.push(industria.id);
  }

  const regras = comCatalogo.map((industriaId) => ({
    industriaId,
    tabelaId: '*',
    comissaoProporcionalPct: 40,
    acrescimoTabelaPct: 0,
    podeAlterarPreco: false,
    limiteDescontoPct: 5,
  }));

  if (regras.length === 0) {
    console.warn(
      `AVISO: nenhuma das ${industrias.size} indústrias tem tabela de preço — o vendedor de teste ficará sem catálogo.`,
    );
  }

  await db.doc(`vendedores/${VENDEDOR_ID}`).set(
    {
      nome: 'Vendedor (teste)',
      email: CONTAS[1].email,
      regras,
      tabelasLiberadas: [...new Set(regras.map((r) => `${r.industriaId}/${r.tabelaId}`))],
      ativo: true,
      criadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  for (const conta of CONTAS) {
    let usuario;
    try {
      usuario = await auth.getUserByEmail(conta.email);
      await auth.updateUser(usuario.uid, { password: SENHA, disabled: false, displayName: conta.nome });
    } catch {
      usuario = await auth.createUser({ email: conta.email, password: SENHA, displayName: conta.nome });
    }

    await db.doc(`usuarios/${usuario.uid}`).set(
      {
        email: conta.email,
        nome: conta.nome,
        perfil: conta.perfil,
        ativo: true,
        ...(conta.vendedorId ? { vendedorId: conta.vendedorId } : {}),
        criadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db.collection('auditoria').add({
      usuarioId: usuario.uid,
      usuarioNome: conta.email,
      perfil: conta.perfil,
      acao: 'usuario_teste_provisionado',
      entidadeTipo: 'usuario',
      entidadeId: usuario.uid,
      antes: null,
      depois: { perfil: conta.perfil, ativo: true },
      origem: 'sistema',
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`${conta.perfil.padEnd(8)} ${conta.email}  (uid ${usuario.uid})`);
  }

  console.log(`\nSenha das duas contas: ${SENHA}`);
  console.log(`Tabelas liberadas ao vendedor: ${regras.map((r) => r.industriaId).join(', ') || '(nenhuma)'}`);
}
