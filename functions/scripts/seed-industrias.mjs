// Seed inicial das 11 indústrias (ADR-004) com regimes (ADR-001) e modelo de preço (ADR-005).
// Uso: node scripts/seed-industrias.mjs  (de dentro de functions/, com ../serviceAccount.json)
// Idempotente: usa o slug do nome como id e faz merge — rodar de novo não duplica.
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const chave = JSON.parse(readFileSync(new URL('../../serviceAccount.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(chave), projectId: chave.project_id });
const db = getFirestore();

const A = { regimeComissao: 'mensalFixo', diaPagtoComissao: 15 };
const B = { regimeComissao: 'posRecebimento', elegibilidadeComissao: 'pedidoQuitado' };

const INDUSTRIAS = [
  { id: 'aneis-brasil', nome: 'ANEIS BRASIL', logica: false, modeloPreco: 'tabelado', ...A },
  { id: 'spart', nome: 'SPART', logica: false, modeloPreco: 'tabelado', ...A },
  { id: 'inove', nome: 'INOVE', logica: false, modeloPreco: 'porGrama', ...B },
  { id: 'tendenze', nome: 'TENDENZE', logica: true, modeloPreco: 'porGrama', ...B },
  { id: 'zarrara', nome: 'ZARRARA', logica: true, modeloPreco: 'tabelado', ...B },
  { id: 'zarrara-luxo', nome: 'ZARRARA LUXO', logica: true, modeloPreco: 'tabelado', ...B },
  { id: 'brilhus', nome: 'BRILHUS', logica: true, modeloPreco: 'tabelado', ...B },
  { id: 'camadi', nome: 'CAMADI', logica: true, modeloPreco: 'tabelado', ...B },
  { id: 'genuele', nome: 'GENUELE', logica: false, modeloPreco: 'tabelado', ...B },
  { id: 'importados', nome: 'IMPORTADOS', logica: false, modeloPreco: 'tabelado', ...B },
  { id: 'pronta-entrega', nome: 'PRONTA ENTREGA', logica: true, modeloPreco: 'tabelado', ...B },
];

const lote = db.batch();
for (const { id, ...dados } of INDUSTRIAS) {
  lote.set(
    db.doc(`industrias/${id}`),
    { ...dados, pctComissaoEscritorio: 0, ativo: true, criadoEm: FieldValue.serverTimestamp() },
    { merge: true },
  );
}
await lote.commit();
console.log(`OK: ${INDUSTRIAS.length} indústrias gravadas (merge).`);
console.log('Regime A (mensal fixo, dia 15): ANEIS BRASIL, SPART. Por grama: INOVE, TENDENZE.');
console.log('Ajuste % de comissão do escritório e dados fiscais pela tela de Indústrias.');
