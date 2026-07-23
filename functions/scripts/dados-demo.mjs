// Semeia/remove dados de DEMONSTRAÇÃO (marcados com demo:true) para a apresentação.
// Uso: node scripts/dados-demo.mjs criar|remover
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
const mes = hoje.slice(0, 7);

if (acao === 'criar') {
  // clientes demo
  const clientes = [
    { id: 'demo-bella-joias', razaoSocial: 'BELLA JOIAS LTDA', fantasia: 'Bella Joias', cidade: 'São Paulo', uf: 'SP' },
    { id: 'demo-prata-cia', razaoSocial: 'PRATA & CIA COMERCIO', fantasia: 'Prata & Cia', cidade: 'Campinas', uf: 'SP' },
  ];
  for (const c of clientes) {
    await db.doc(`clientes/${c.id}`).set({
      demo: true,
      tipoPessoa: 'PJ',
      razaoSocial: c.razaoSocial,
      fantasia: c.fantasia,
      endereco: { cidade: c.cidade, uf: c.uf },
      status: 'ativo',
      vendedorId: 'vendedor-teste',
      criadoEm: FieldValue.serverTimestamp(),
    });
  }

  // contador
  const refContador = db.doc('config/contadores');
  const atual = ((await refContador.get()).data()?.pedido ?? 0) + 1;

  const pedidos = [
    // [industria, regime, cliente, total, parcelas pagas de N, status pedido, comissao status]
    { ind: 'spart', indNome: 'SPART', regime: 'mensalFixo', cli: clientes[0], total: 1284500, pagas: 0, de: 3, status: 'enviadoIndustria', com: 'elegivel', prev: `${mes.slice(0, 5)}${String(Number(mes.slice(5)) + 1).padStart(2, '0')}-15` },
    { ind: 'inove', indNome: 'INOVE', regime: 'posRecebimento', cli: clientes[1], total: 861400, pagas: 2, de: 2, status: 'entregue', com: 'elegivel' },
    { ind: 'inove', indNome: 'INOVE', regime: 'posRecebimento', cli: clientes[0], total: 452030, pagas: 1, de: 3, status: 'faturado', com: 'aguardandoPagtoCliente' },
    { ind: 'zarrara', indNome: 'ZARRARA', regime: 'posRecebimento', cli: clientes[1], total: 219900, pagas: 0, de: 2, status: 'emitido', com: 'aguardandoPagtoCliente' },
  ];

  let numero = atual;
  for (const p of pedidos) {
    const refPedido = db.collection('pedidos').doc(`demo-${numero}`);
    const base = Math.round(p.total * 0.1);
    const vend = Math.round(base * 0.4);
    await refPedido.set({
      demo: true,
      numero,
      tipo: 'pedido',
      clienteId: p.cli.id,
      clienteNome: p.cli.fantasia,
      vendedorId: 'vendedor-teste',
      vendedorNome: 'Vendedor Teste',
      industriaId: p.ind,
      industriaNome: p.indNome,
      tabelaId: 'vendas-900',
      status: p.status,
      dataEmissao: hoje,
      itens: [
        { produtoId: 'demo', sku: 'PAN1056', descricao: 'Pingente coração 3,5 g', qtde: 10, precoTabelaCentavos: 16114, precoFinalCentavos: 16114, subtotalCentavos: 161140 },
      ],
      totais: { itensCentavos: p.total, freteCentavos: 0, acrescimoCentavos: 0, descontoCentavos: 0, totalCentavos: p.total },
      criadoEm: FieldValue.serverTimestamp(),
    });
    const valorParcela = Math.floor(p.total / p.de);
    for (let i = 1; i <= p.de; i++) {
      const valor = i === p.de ? p.total - valorParcela * (p.de - 1) : valorParcela;
      const paga = i <= p.pagas;
      const venc = new Date();
      venc.setDate(venc.getDate() + (i - 1) * 30 - (p.pagas > 0 ? 15 : -10));
      await refPedido.collection('parcelas').doc(String(i)).set({
        demo: true,
        numero: i,
        de: p.de,
        valorCentavos: valor,
        vencimento: venc.toISOString().slice(0, 10),
        valorRecebidoCentavos: paga ? valor : 0,
        status: paga ? 'pago' : 'aberto',
        ...(paga ? { dataPagto: hoje } : {}),
        pedidoId: refPedido.id,
        pedidoNumero: numero,
        clienteNome: p.cli.fantasia,
        industriaId: p.ind,
        vendedorId: 'vendedor-teste',
        tipoPedido: 'pedido',
      });
    }
    await db.collection('comissoes').doc(`demo-${numero}`).set({
      demo: true,
      pedidoId: refPedido.id,
      pedidoNumero: numero,
      vendedorId: 'vendedor-teste',
      vendedorNome: 'Vendedor Teste',
      industriaId: p.ind,
      regime: p.regime,
      baseCentavos: p.total,
      escritorio: { pct: 10, valorCentavos: base },
      vendedor: { pctProporcional: 40, valorCentavos: vend },
      status: p.com,
      ...(p.com === 'elegivel' ? { dataElegibilidade: hoje } : {}),
      ...(p.prev ? { previsaoRecebimento: p.prev } : {}),
      criadoEm: FieldValue.serverTimestamp(),
    });
    numero++;
  }
  await refContador.set({ pedido: numero - 1 }, { merge: true });
  console.log(`OK: ${pedidos.length} pedidos demo (nº ${atual}–${numero - 1}), 2 clientes, parcelas e comissões.`);
} else if (acao === 'remover') {
  const lotes = [];
  for (const col of ['pedidos', 'comissoes', 'clientes']) {
    const foto = await db.collection(col).where('demo', '==', true).get();
    for (const d of foto.docs) {
      if (col === 'pedidos') {
        const parcelas = await d.ref.collection('parcelas').get();
        for (const par of parcelas.docs) lotes.push(par.ref.delete());
      }
      lotes.push(d.ref.delete());
    }
  }
  await Promise.all(lotes);
  console.log(`OK: ${lotes.length} documentos demo removidos.`);
} else {
  console.error('Uso: node scripts/dados-demo.mjs criar|remover');
  process.exit(1);
}
