/**
 * Testes das Firestore Security Rules (critérios de aceite da Fase 1/2).
 * Rodar via emulador: pnpm test:rules (raiz) — exige Java 11+.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const AGORA_S = Math.floor(Date.now() / 1000);
const VELHO_S = AGORA_S - 25 * 60 * 60; // sessão de 25h (expirada)

const admin = () => env.authenticatedContext('admin1', { auth_time: AGORA_S }).firestore();
const vendedor = () => env.authenticatedContext('vend-uid', { auth_time: AGORA_S }).firestore();
const vendedorSessaoVelha = () => env.authenticatedContext('vend-uid', { auth_time: VELHO_S }).firestore();
const inativo = () => env.authenticatedContext('inativo1', { auth_time: AGORA_S }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gestao-hb',
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { perfil: 'admin', ativo: true, email: 'a@a.com' });
    await setDoc(doc(db, 'usuarios/vend-uid'), { perfil: 'vendedor', ativo: true, vendedorId: 'vend1' });
    await setDoc(doc(db, 'usuarios/inativo1'), { perfil: 'admin', ativo: false });
    await setDoc(doc(db, 'vendedores/vend1'), {
      nome: 'Vendedor 1',
      ativo: true,
      tabelasLiberadas: ['inove/vendas-900', 'spart/*'],
    });
    await setDoc(doc(db, 'industrias/inove'), { nome: 'INOVE', ativo: true });
    await setDoc(doc(db, 'produtos/p1'), { industriaId: 'inove', sku: 'P1', nome: 'Peça', ativo: true });
    await setDoc(doc(db, 'produtos/p1/precos/vendas-900'), { industriaId: 'inove', precoCentavos: 4604 });
    await setDoc(doc(db, 'produtos/p1/precos/heri-700'), { industriaId: 'inove', precoCentavos: 3804 });
    await setDoc(doc(db, 'produtos/p2'), { industriaId: 'spart', sku: 'P2', nome: 'Anel', ativo: true });
    await setDoc(doc(db, 'produtos/p2/precos/especial'), { industriaId: 'spart', precoCentavos: 2457 });
    await setDoc(doc(db, 'pedidos/ped-meu'), { vendedorId: 'vend1', numero: 1, status: 'emitido' });
    await setDoc(doc(db, 'pedidos/ped-alheio'), { vendedorId: 'vend2', numero: 2, status: 'emitido' });
    await setDoc(doc(db, 'valoresGrama/vg1'), { industriaId: 'inove', valorCentavos: 4604, vigenciaInicio: '2026-07-01' });
    await setDoc(doc(db, 'auditoria/a1'), { usuarioId: 'admin1', acao: 'teste' });
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe('pedidos — vendedor só enxerga e cria os próprios', () => {
  it('lê o próprio pedido', async () => {
    await assertSucceeds(getDoc(doc(vendedor(), 'pedidos/ped-meu')));
  });
  it('NÃO lê pedido de outro vendedor', async () => {
    await assertFails(getDoc(doc(vendedor(), 'pedidos/ped-alheio')));
  });
  it('cria pedido com o próprio vendedorId', async () => {
    await assertSucceeds(setDoc(doc(vendedor(), 'pedidos/novo1'), { vendedorId: 'vend1', numero: 3, status: 'emitido' }));
  });
  it('NÃO cria pedido em nome de outro vendedor', async () => {
    await assertFails(setDoc(doc(vendedor(), 'pedidos/novo2'), { vendedorId: 'vend2', numero: 4, status: 'emitido' }));
  });
  it('NÃO altera status de pedido (só admin)', async () => {
    await assertFails(updateDoc(doc(vendedor(), 'pedidos/ped-meu'), { status: 'cancelado' }));
  });
});

describe('preços por tabela — permissão da matriz (critério A.6)', () => {
  it('lê preço de tabela liberada', async () => {
    await assertSucceeds(getDoc(doc(vendedor(), 'produtos/p1/precos/vendas-900')));
  });
  it("lê preço via curinga '*' da indústria", async () => {
    await assertSucceeds(getDoc(doc(vendedor(), 'produtos/p2/precos/especial')));
  });
  it('NÃO lê preço de tabela não liberada', async () => {
    await assertFails(getDoc(doc(vendedor(), 'produtos/p1/precos/heri-700')));
  });
  it('admin lê qualquer preço', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'produtos/p1/precos/heri-700')));
  });
});

describe('auditoria — append-only (especificação §2.8)', () => {
  it('ninguém edita: nem admin', async () => {
    await assertFails(updateDoc(doc(admin(), 'auditoria/a1'), { acao: 'adulterado' }));
  });
  it('ninguém exclui: nem admin', async () => {
    await assertFails(deleteDoc(doc(admin(), 'auditoria/a1')));
  });
  it('cria registro do próprio uid', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'auditoria/a2'), { usuarioId: 'admin1', acao: 'x' }));
  });
  it('NÃO cria registro em nome de outro uid', async () => {
    await assertFails(setDoc(doc(admin(), 'auditoria/a3'), { usuarioId: 'outro', acao: 'x' }));
  });
});

describe('valor do grama — histórico imutável (ADR-006)', () => {
  it('nem admin edita registro existente', async () => {
    await assertFails(updateDoc(doc(admin(), 'valoresGrama/vg1'), { valorCentavos: 1 }));
  });
  it('nem admin exclui registro', async () => {
    await assertFails(deleteDoc(doc(admin(), 'valoresGrama/vg1')));
  });
});

describe('sessão e conta (seção 7)', () => {
  it('conta inativa NÃO lê nada', async () => {
    await assertFails(getDoc(doc(inativo(), 'industrias/inove')));
  });
  it('sessão com mais de 24h NÃO lê nada', async () => {
    await assertFails(getDoc(doc(vendedorSessaoVelha(), 'pedidos/ped-meu')));
  });
  it('não autenticado NÃO lê nada', async () => {
    await assertFails(getDoc(doc(anonimo(), 'industrias/inove')));
  });
});

describe('usuários — travas anti-lockout', () => {
  it('admin NÃO altera o próprio perfil/status', async () => {
    await assertFails(updateDoc(doc(admin(), 'usuarios/admin1'), { perfil: 'vendedor' }));
  });
  it('admin altera status de outro usuário', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'usuarios/vend-uid'), { ativo: false }));
  });
});

describe('usuários — o próprio dono mantém só foto e carimbo de sessão', () => {
  // o bloco anterior desativa vend-uid; sem ativo=true nada aqui passaria por sessaoOk()
  beforeAll(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'usuarios/vend-uid'), {
        perfil: 'vendedor',
        ativo: true,
        vendedorId: 'vend1',
      });
    });
  });

  it('grava a própria fotoUrl', async () => {
    await assertSucceeds(updateDoc(doc(vendedor(), 'usuarios/vend-uid'), { fotoUrl: 'https://x/f.jpg' }));
  });
  it('grava a própria ultimaSessao', async () => {
    await assertSucceeds(updateDoc(doc(vendedor(), 'usuarios/vend-uid'), { ultimaSessao: new Date() }));
  });
  it('NÃO se promove a admin', async () => {
    await assertFails(updateDoc(doc(vendedor(), 'usuarios/vend-uid'), { perfil: 'admin' }));
  });
  it('NÃO troca o próprio vínculo de vendedor', async () => {
    await assertFails(updateDoc(doc(vendedor(), 'usuarios/vend-uid'), { vendedorId: 'vend2' }));
  });
  it('NÃO passa perfil junto com um campo permitido', async () => {
    await assertFails(
      updateDoc(doc(vendedor(), 'usuarios/vend-uid'), { fotoUrl: 'https://x/f.jpg', perfil: 'admin' }),
    );
  });
  it('NÃO altera a foto de outro usuário', async () => {
    await assertFails(updateDoc(doc(vendedor(), 'usuarios/admin1'), { fotoUrl: 'https://x/f.jpg' }));
  });
  it('conta inativa NÃO grava nem a própria foto', async () => {
    await assertFails(updateDoc(doc(inativo(), 'usuarios/inativo1'), { fotoUrl: 'https://x/f.jpg' }));
  });
});
