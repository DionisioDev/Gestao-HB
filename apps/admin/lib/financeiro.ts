'use client';

import { comissaoElegivelPorParcelas, type ParcelaPaga } from '@gestao-hb/core';
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { auditar } from './auditoria';
import { fb } from './firebase';

export const FORMAS_PAGAMENTO = [
  'PIX',
  'Boleto',
  'Transferência',
  'Dinheiro',
  'Cartão de crédito',
  'Cartão de débito',
  'Cheque',
  'Duplicata',
  'Outros',
] as const;

export interface DadosBaixa {
  pedidoId: string;
  parcelaId: string;
  valorCentavos: number;
  forma: string;
  data: string; // yyyy-mm-dd
}

/**
 * Baixa de pagamento em transação (brief Fase 3 §2.2/2.3):
 * atualiza a parcela e recalcula a elegibilidade da comissão do pedido (Regime B).
 * INTERINO no cliente (admin, sob Rules) até as Functions assumirem.
 */
export async function baixarParcela(dados: DadosBaixa): Promise<void> {
  const db = fb().db;
  if (dados.valorCentavos <= 0) throw new Error('Informe um valor válido.');
  if (dados.data > new Date().toISOString().slice(0, 10)) throw new Error('A data da baixa não pode ser futura.');

  // comissão do pedido (fora da transação: id estável)
  const comissoes = await getDocs(query(collection(db, 'comissoes'), where('pedidoId', '==', dados.pedidoId)));
  const refComissao = comissoes.docs[0]?.ref ?? null;

  const refParcela = doc(db, 'pedidos', dados.pedidoId, 'parcelas', dados.parcelaId);
  const refPedido = doc(db, 'pedidos', dados.pedidoId);
  const colParcelas = await getDocs(collection(db, 'pedidos', dados.pedidoId, 'parcelas'));
  const refsParcelas = colParcelas.docs.map((d) => d.ref);

  let resumo: Record<string, unknown> = {};

  await runTransaction(db, async (tx) => {
    const fotoParcela = await tx.get(refParcela);
    if (!fotoParcela.exists()) throw new Error('Parcela não encontrada.');
    const parcela = fotoParcela.data();
    const saldo = (parcela['valorCentavos'] as number) - ((parcela['valorRecebidoCentavos'] as number) ?? 0);
    if (dados.valorCentavos > saldo) throw new Error('O valor excede o saldo da parcela.');

    // lê todas as parcelas na transação para decidir a quitação
    const parcelas: Array<{ ref: (typeof refsParcelas)[number]; dados: Record<string, unknown> }> = [];
    for (const ref of refsParcelas) {
      const foto = await tx.get(ref);
      parcelas.push({ ref, dados: foto.data() ?? {} });
    }

    const fotoPedido = await tx.get(refPedido);
    const pedido = fotoPedido.data() ?? {};
    const fotoComissao = refComissao ? await tx.get(refComissao) : null;
    const comissao = fotoComissao?.data() ?? null;

    // 1. atualiza a parcela
    const novoRecebido = ((parcela['valorRecebidoCentavos'] as number) ?? 0) + dados.valorCentavos;
    const novoStatus = novoRecebido >= (parcela['valorCentavos'] as number) ? 'pago' : 'parcial';
    tx.update(refParcela, {
      valorRecebidoCentavos: novoRecebido,
      status: novoStatus,
      dataPagto: dados.data,
      baixas: [
        ...(((parcela['baixas'] as unknown[]) ?? []) as Record<string, unknown>[]),
        { valorCentavos: dados.valorCentavos, forma: dados.forma, data: dados.data },
      ],
    });

    // 2. estado consolidado pós-baixa
    const posBaixa: ParcelaPaga[] = parcelas.map(({ ref, dados: p }) => {
      const recebido = ref.id === dados.parcelaId ? novoRecebido : (((p['valorRecebidoCentavos'] as number) ?? 0) as number);
      const pago = recebido >= (p['valorCentavos'] as number);
      return { valorCentavos: p['valorCentavos'] as number, ...(pago ? { dataPagto: new Date(`${dados.data}T00:00:00Z`) } : {}) };
    });
    const quitado = posBaixa.every((p) => p.dataPagto);

    // 3. elegibilidade da comissão (Regime B; A já nasce elegível — regras-negocio §2.3)
    if (refComissao && comissao && !['fechada', 'paga', 'estornada'].includes(comissao['status'] as string)) {
      if (comissao['regime'] === 'posRecebimento') {
        if ((comissao['elegibilidade'] ?? 'pedidoQuitado') === 'pedidoQuitado') {
          if (quitado) {
            tx.update(refComissao, { status: 'elegivel', dataElegibilidade: dados.data });
          }
        } else {
          const totalPedidoCentavos = ((pedido['totais'] as Record<string, unknown>)?.['totalCentavos'] as number) ?? 0;
          const comissaoEscritorioCentavos = (comissao['escritorio'] as Record<string, unknown>)['valorCentavos'] as number;
          const { valorElegivelCentavos, valorPagoCentavos } = comissaoElegivelPorParcelas(
            comissaoEscritorioCentavos,
            totalPedidoCentavos,
            posBaixa,
            { ano: 9999, mes: 12 }, // sem corte de período aqui — o fechamento (Fase 4) aplica o período
          );
          tx.update(refComissao, {
            status: valorElegivelCentavos > 0 ? 'elegivel' : 'aguardandoPagtoCliente',
            valorPagoAcumuladoCentavos: valorPagoCentavos,
            valorElegivelEscritorioCentavos: valorElegivelCentavos,
            ...(quitado ? { dataElegibilidade: dados.data } : {}),
          });
        }
      }
    }

    resumo = {
      parcela: `${parcela['numero']}/${parcela['de']}`,
      valorCentavos: dados.valorCentavos,
      forma: dados.forma,
      data: dados.data,
      statusParcela: novoStatus,
      pedidoQuitado: quitado,
    };
  });

  await auditar('pagamento_baixado', 'parcela', `${dados.pedidoId}/${dados.parcelaId}`, null, resumo);
}
