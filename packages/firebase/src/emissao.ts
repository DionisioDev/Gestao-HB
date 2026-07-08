'use client';

import {
  comissaoEscritorio,
  comissaoVendedor,
  totalPedido,
  type ParcelaGerada,
  type RegimeComissao,
} from '@gestao-hb/core';
import { addDoc, collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';

export interface AutorEmissao {
  uid: string;
  nome: string;
  origem: 'admin' | 'vendedor';
  perfil: 'admin' | 'vendedor';
}

export interface ItemEmissao {
  produtoId: string;
  sku: string;
  descricao: string;
  qtde: number;
  pesoMg?: number;
  precoTabelaCentavos: number;
  precoFinalCentavos: number;
  subtotalCentavos: number;
}

export interface DadosEmissao {
  tipo: 'pedido' | 'orcamento';
  clienteId: string;
  clienteNome: string;
  contatoNome?: string;
  vendedorId: string;
  vendedorNome: string;
  industriaId: string;
  industriaNome: string;
  regimeComissao: RegimeComissao;
  diaPagtoComissao?: number;
  elegibilidadeComissao?: 'pedidoQuitado' | 'porParcela';
  tabelaId: string;
  dataEmissao: string; // yyyy-mm-dd
  condicaoPagto?: string;
  observacoes?: string;
  observacaoPrivada?: string;
  itens: ItemEmissao[];
  freteCentavos: number;
  acrescimoCentavos: number;
  descontoCentavos: number;
  /** congelamento por tabela usada (ADR-006) — presente só em indústria por grama */
  valorGramaCongelado?: { valorCentavos: number; valorGramaId: string; teor?: number };
  pctComissaoEscritorio: number;
  pctComissaoVendedor: number;
  parcelas: ParcelaGerada[];
}

/** Previsão de recebimento no regime A: dia D do mês seguinte à emissão (ADR-001). */
export function previsaoRegimeA(dataEmissao: string, dia: number): string {
  const [ano, mes] = dataEmissao.split('-').map(Number);
  const proximo = new Date(Date.UTC(ano!, (mes ?? 1) - 1 + 1, Math.min(dia, 28)));
  return proximo.toISOString().slice(0, 10);
}

/**
 * Emissão em transação (brief Fase 2 §2.1.5): numeração sequencial sem furo,
 * pedido + parcelas + comissão prevista num único commit. INTERINO no cliente
 * (admin, sob Rules) até as Functions assumirem com revalidação no servidor.
 */
export async function emitirPedido(
  db: Firestore,
  autor: AutorEmissao,
  dados: DadosEmissao,
): Promise<{ id: string; numero: number }> {
  const somaItens = dados.itens.reduce((s, i) => s + i.subtotalCentavos, 0);
  const total = totalPedido({
    somaItensCentavos: somaItens,
    freteCentavos: dados.freteCentavos,
    acrescimoCentavos: dados.acrescimoCentavos,
    descontoCentavos: dados.descontoCentavos,
  });
  const somaParcelas = dados.parcelas.reduce((s, p) => s + p.valorCentavos, 0);
  if (dados.itens.length === 0) throw new Error('Inclua ao menos um item.');
  if (somaParcelas !== total) throw new Error('A soma das parcelas difere do total do pedido.');

  const baseComissao = total - dados.freteCentavos;
  const valorEscritorio = comissaoEscritorio(total, dados.freteCentavos, dados.pctComissaoEscritorio);
  const valorVendedor = comissaoVendedor(valorEscritorio, dados.pctComissaoVendedor);

  const refContador = doc(db, 'config', 'contadores');
  const refPedido = doc(collection(db, 'pedidos'));
  const refComissao = doc(collection(db, 'comissoes'));

  const numero = await runTransaction(db, async (tx) => {
    const contador = await tx.get(refContador);
    const proximo = ((contador.data()?.['pedido'] as number) ?? 0) + 1;
    tx.set(refContador, { pedido: proximo }, { merge: true });

    const limpar = (o: Record<string, unknown>) => JSON.parse(JSON.stringify(o)) as Record<string, unknown>;

    tx.set(refPedido, {
      ...limpar({
        numero: proximo,
        tipo: dados.tipo,
        clienteId: dados.clienteId,
        clienteNome: dados.clienteNome,
        contatoNome: dados.contatoNome,
        vendedorId: dados.vendedorId,
        vendedorNome: dados.vendedorNome,
        industriaId: dados.industriaId,
        industriaNome: dados.industriaNome,
        tabelaId: dados.tabelaId,
        status: 'emitido',
        dataEmissao: dados.dataEmissao,
        condicaoPagto: dados.condicaoPagto,
        observacoes: dados.observacoes,
        observacaoPrivada: dados.observacaoPrivada,
        itens: dados.itens,
        valorGramaCongelado: dados.valorGramaCongelado,
        totais: {
          itensCentavos: somaItens,
          freteCentavos: dados.freteCentavos,
          acrescimoCentavos: dados.acrescimoCentavos,
          descontoCentavos: dados.descontoCentavos,
          totalCentavos: total,
        },
      }),
      criadoEm: serverTimestamp(),
    });

    for (const p of dados.parcelas) {
      tx.set(doc(db, 'pedidos', refPedido.id, 'parcelas', String(p.numero)), {
        numero: p.numero,
        de: dados.parcelas.length,
        valorCentavos: p.valorCentavos,
        vencimento: p.vencimento,
        valorRecebidoCentavos: 0,
        status: 'aberto',
      });
    }

    const regimeA = dados.regimeComissao === 'mensalFixo';
    tx.set(refComissao, {
      ...limpar({
        pedidoId: refPedido.id,
        pedidoNumero: proximo,
        vendedorId: dados.vendedorId,
        vendedorNome: dados.vendedorNome,
        industriaId: dados.industriaId,
        regime: dados.regimeComissao,
        elegibilidade: regimeA ? undefined : (dados.elegibilidadeComissao ?? 'pedidoQuitado'),
        baseCentavos: baseComissao,
        escritorio: { pct: dados.pctComissaoEscritorio, valorCentavos: valorEscritorio },
        vendedor: { pctProporcional: dados.pctComissaoVendedor, valorCentavos: valorVendedor },
        status: dados.tipo === 'orcamento' ? 'aguardandoPagtoCliente' : regimeA ? 'elegivel' : 'aguardandoPagtoCliente',
        dataElegibilidade: regimeA && dados.tipo === 'pedido' ? dados.dataEmissao : undefined,
        previsaoRecebimento:
          regimeA && dados.tipo === 'pedido' ? previsaoRegimeA(dados.dataEmissao, dados.diaPagtoComissao ?? 15) : undefined,
      }),
      criadoEm: serverTimestamp(),
    });

    return proximo;
  });

  // auditoria (interina no cliente — nunca derruba a emissão já confirmada)
  try {
    await addDoc(collection(db, 'auditoria'), {
      usuarioId: autor.uid,
      usuarioNome: autor.nome,
      perfil: autor.perfil,
      acao: 'pedido_emitido',
      entidadeTipo: 'pedido',
      entidadeId: refPedido.id,
      antes: null,
      depois: {
        numero,
        tipo: dados.tipo,
        cliente: dados.clienteNome,
        industria: dados.industriaNome,
        totalCentavos: total,
        itens: dados.itens.length,
      },
      origem: autor.origem,
      timestamp: serverTimestamp(),
    });
  } catch (erro) {
    console.error('Falha ao auditar emissão', erro);
  }

  return { id: refPedido.id, numero };
}
