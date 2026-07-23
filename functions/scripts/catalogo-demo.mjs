// Semeia/remove um CATÁLOGO de demonstração (tudo marcado com demo:true):
// tabelas de preço + valor do grama na INOVE (por grama) e tabela + produtos
// com preço fixo na SPART. Suficiente para telas de produto, indústria e o
// fluxo de novo pedido funcionarem em captura/treinamento.
// Uso: node scripts/catalogo-demo.mjs criar|remover
// Credencial: serviceAccount.json na raiz ou `firebase login`.
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { obterCredencialAdmin } from './lib/credencial-google.mjs';

const acao = process.argv[2];
const { credential, projeto, limpar } = await obterCredencialAdmin();
process.on('exit', limpar);
initializeApp({ credential, projectId: projeto ?? 'gestao-hb' });
const db = getFirestore();

const hoje = new Date().toISOString().slice(0, 10);

const TABELAS = [
  { industriaId: 'inove', id: 'vendas-900', nome: 'VENDAS-900', ordem: 1, teor: 900 },
  { industriaId: 'inove', id: 'heri-700', nome: 'HERI-700', ordem: 2, teor: 700 },
  { industriaId: 'spart', id: 'especial', nome: 'ESPECIAL', ordem: 1 },
];

// INOVE precifica por grama (peso obrigatório); SPART é tabela fixa.
const PRODUTOS = [
  { ind: 'inove', sku: 'PAN1056', nome: 'Pingente coração', pesoMg: 3500, teor: 900, categoria: 'Pingentes' },
  { ind: 'inove', sku: 'AN2201', nome: 'Anel solitário zircônia', pesoMg: 2800, teor: 900, categoria: 'Anéis' },
  { ind: 'inove', sku: 'PUL3310', nome: 'Pulseira veneziana 18cm', pesoMg: 5200, teor: 900, categoria: 'Pulseiras' },
  { ind: 'inove', sku: 'COR4415', nome: 'Corrente grumet 60cm', pesoMg: 8900, teor: 700, categoria: 'Correntes' },
  { ind: 'spart', sku: 'BR1102', nome: 'Brinco argola cravejada', categoria: 'Brincos', precos: { especial: 12900 } },
  { ind: 'spart', sku: 'GAR2005', nome: 'Gargantilha ponto de luz', categoria: 'Gargantilhas', precos: { especial: 18400 } },
];

const VALOR_GRAMA = [
  { industriaId: 'inove', tabelaId: 'vendas-900', teor: 900, valorCentavos: 4604 },
  { industriaId: 'inove', tabelaId: 'heri-700', teor: 700, valorCentavos: 3804 },
];

if (acao === 'criar') {
  for (const t of TABELAS) {
    await db.doc(`industrias/${t.industriaId}/tabelasPreco/${t.id}`).set({
      demo: true,
      nome: t.nome,
      ordem: t.ordem,
      ...(t.teor ? { teor: t.teor } : {}),
      ativo: true,
    });
  }

  for (const v of VALOR_GRAMA) {
    await db.collection('valoresGrama').add({
      demo: true,
      ...v,
      vigenciaInicio: hoje,
      criadoPor: 'script-demo',
      criadoEm: FieldValue.serverTimestamp(),
    });
  }

  for (const p of PRODUTOS) {
    const id = `${p.ind}__${p.sku.toLowerCase()}`;
    await db.doc(`produtos/${id}`).set({
      demo: true,
      industriaId: p.ind,
      sku: p.sku,
      nome: p.nome,
      ...(p.pesoMg ? { pesoMg: p.pesoMg } : {}),
      ...(p.teor ? { teor: p.teor } : {}),
      categoria: p.categoria,
      ativo: true,
      atualizadoEm: new Date().toISOString(),
    });
    for (const [tabelaId, precoCentavos] of Object.entries(p.precos ?? {})) {
      await db.doc(`produtos/${id}/precos/${tabelaId}`).set({
        demo: true,
        industriaId: p.ind,
        tabelaId,
        precoCentavos,
        atualizadoEm: new Date().toISOString(),
      });
    }
  }
  console.log(`OK: ${TABELAS.length} tabelas, ${VALOR_GRAMA.length} valores de grama, ${PRODUTOS.length} produtos demo.`);
} else if (acao === 'remover') {
  const remocoes = [];
  for (const t of TABELAS) {
    remocoes.push(db.doc(`industrias/${t.industriaId}/tabelasPreco/${t.id}`).delete());
  }
  for (const col of ['valoresGrama', 'produtos']) {
    const foto = await db.collection(col).where('demo', '==', true).get();
    for (const d of foto.docs) {
      if (col === 'produtos') {
        const precos = await d.ref.collection('precos').get();
        for (const preco of precos.docs) remocoes.push(preco.ref.delete());
      }
      remocoes.push(d.ref.delete());
    }
  }
  await Promise.all(remocoes);
  console.log(`OK: ${remocoes.length} documentos de catálogo demo removidos.`);
} else {
  console.error('Uso: node scripts/catalogo-demo.mjs criar|remover');
  process.exit(1);
}
