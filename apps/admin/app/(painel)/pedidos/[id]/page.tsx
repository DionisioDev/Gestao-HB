'use client';

import type { StatusPedido } from '@gestao-hb/core';
import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CampoTexto } from '../../../../components/campos';
import { ModalConfirmacao } from '../../../../components/modal';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { PROXIMOS_STATUS, rotuloStatusPedido, tomStatusPedido } from '../../../../lib/status-pedido';
import { useSnackbar } from '../../../../lib/snackbar';

interface Pedido {
  numero: number;
  tipo: 'pedido' | 'orcamento';
  clienteNome: string;
  vendedorNome: string;
  industriaNome: string;
  tabelaId: string;
  status: StatusPedido;
  dataEmissao: string;
  condicaoPagto?: string;
  observacoes?: string;
  motivoCancelamento?: string;
  itens: Array<{ sku: string; descricao: string; qtde: number; precoFinalCentavos: number; subtotalCentavos: number }>;
  valorGramaCongelado?: { valorCentavos: number; teor?: number };
  totais: { itensCentavos: number; freteCentavos: number; descontoCentavos: number; totalCentavos: number };
}

interface Parcela {
  id: string;
  numero: number;
  de: number;
  valorCentavos: number;
  vencimento: string;
  valorRecebidoCentavos: number;
  status: 'aberto' | 'parcial' | 'pago';
}

interface ComissaoDoc {
  id: string;
  regime: string;
  status: string;
  escritorio: { pct: number; valorCentavos: number };
  vendedor: { pctProporcional: number; valorCentavos: number };
  previsaoRecebimento?: string;
}

const ROTULO_COMISSAO: Record<string, string> = {
  aguardandoPagtoCliente: 'Aguardando pagamento do cliente',
  elegivel: 'Elegível para fechamento',
  fechada: 'Fechada',
  paga: 'Paga',
  estornada: 'Estornada',
};

export default function PaginaPedido() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const avisar = useSnackbar();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [comissao, setComissao] = useState<ComissaoDoc | null>(null);
  const [mudandoPara, setMudandoPara] = useState<StatusPedido | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [convertendo, setConvertendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const parar = onSnapshot(doc(fb().db, 'pedidos', id), (foto) => {
      if (!foto.exists()) {
        avisar('Pedido não encontrado.', 'erro');
        router.replace('/pedidos');
        return;
      }
      setPedido(foto.data() as Pedido);
    });
    const pararParcelas = onSnapshot(query(collection(fb().db, 'pedidos', id, 'parcelas'), orderBy('numero')), (foto) =>
      setParcelas(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Parcela, 'id'>) }))),
    );
    void getDocs(query(collection(fb().db, 'comissoes'), where('pedidoId', '==', id))).then((foto) => {
      const primeiro = foto.docs[0];
      if (primeiro) setComissao({ id: primeiro.id, ...(primeiro.data() as Omit<ComissaoDoc, 'id'>) });
    });
    return () => {
      parar();
      pararParcelas();
    };
  }, [id, router, avisar]);

  if (!pedido) {
    return (
      <div aria-busy="true">
        <div className={estilos.esqueleto} />
        <div className={estilos.esqueleto} />
      </div>
    );
  }

  async function mudarStatus(novo: StatusPedido) {
    setOcupado(true);
    try {
      await updateDoc(doc(fb().db, 'pedidos', id), { status: novo });
      await auditar('pedido_status_alterado', 'pedido', id, { status: pedido!.status }, { status: novo });
      avisar(`Status alterado para ${rotuloStatusPedido[novo]}.`, 'sucesso');
      setMudandoPara(null);
    } catch {
      avisar('Não foi possível alterar o status.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar() {
    if (!motivo.trim()) {
      avisar('Informe o motivo do cancelamento.', 'erro');
      return;
    }
    setOcupado(true);
    try {
      await updateDoc(doc(fb().db, 'pedidos', id), { status: 'cancelado', motivoCancelamento: motivo.trim() });
      if (comissao && !['fechada', 'paga'].includes(comissao.status)) {
        await updateDoc(doc(fb().db, 'comissoes', comissao.id), { status: 'estornada' });
      }
      await auditar('pedido_cancelado', 'pedido', id, { status: pedido!.status }, { status: 'cancelado', motivo: motivo.trim() });
      avisar('Pedido cancelado e comissão prevista estornada.', 'sucesso');
      setCancelando(false);
    } catch {
      avisar('Não foi possível cancelar.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function converterEmPedido() {
    setOcupado(true);
    try {
      await updateDoc(doc(fb().db, 'pedidos', id), { tipo: 'pedido', status: 'emitido' });
      if (comissao) {
        // regime A volta a ser elegível na conversão; B segue aguardando pagamento
        const novoStatus = comissao.regime === 'mensalFixo' ? 'elegivel' : 'aguardandoPagtoCliente';
        await updateDoc(doc(fb().db, 'comissoes', comissao.id), { status: novoStatus });
      }
      await auditar('orcamento_convertido', 'pedido', id, { tipo: 'orcamento' }, { tipo: 'pedido', politicaPreco: 'manter' });
      avisar('Orçamento convertido em pedido (preços mantidos — ADR-006).', 'sucesso');
      setConvertendo(false);
    } catch {
      avisar('Não foi possível converter.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  const proximos = PROXIMOS_STATUS[pedido.status].filter((s) => s !== 'cancelado');
  const podeCancelar = !['finalizado', 'cancelado'].includes(pedido.status);

  return (
    <div style={{ maxWidth: 880 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>
            {pedido.tipo === 'orcamento' ? 'Orçamento' : 'Pedido'} nº {pedido.numero}
          </h1>
          <p className={estilos.subtitulo}>
            {pedido.clienteNome} · {pedido.industriaNome} · {pedido.dataEmissao?.split('-').reverse().join('/')}
          </p>
        </div>
        <StatusChip tom={tomStatusPedido[pedido.status]}>{rotuloStatusPedido[pedido.status]}</StatusChip>
      </div>

      <section className={estilos.card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {pedido.tipo === 'orcamento' && pedido.status !== 'cancelado' && (
            <button className={estilos.botaoPrimario} onClick={() => setConvertendo(true)}>
              Converter em pedido
            </button>
          )}
          {proximos.map((s) => (
            <button key={s} className={estilos.botaoSecundario} onClick={() => setMudandoPara(s)}>
              Marcar como {rotuloStatusPedido[s].toLowerCase()}
            </button>
          ))}
          {podeCancelar && (
            <button className={estilos.botaoSecundario} style={{ color: 'var(--hb-erro)' }} onClick={() => setCancelando(true)}>
              Cancelar {pedido.tipo === 'orcamento' ? 'orçamento' : 'pedido'}
            </button>
          )}
        </div>
        {pedido.status === 'cancelado' && pedido.motivoCancelamento && (
          <p style={{ margin: '12px 0 0', color: 'var(--hb-erro)', fontSize: 'var(--hb-corpo-sm)' }}>
            Motivo do cancelamento: {pedido.motivoCancelamento}
          </p>
        )}
      </section>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Itens</h2>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Descrição</th>
              <th>Qtde</th>
              <th>Unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((i) => (
              <tr key={i.sku} style={{ cursor: 'default' }}>
                <td data-rotulo="SKU"><strong>{i.sku}</strong></td>
                <td data-rotulo="Descrição">{i.descricao}</td>
                <td data-rotulo="Qtde">{String(i.qtde).replace('.', ',')}</td>
                <td data-rotulo="Unitário">{formatarCentavos(i.precoFinalCentavos)}</td>
                <td data-rotulo="Subtotal"><strong>{formatarCentavos(i.subtotalCentavos)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, fontSize: 'var(--hb-corpo-sm)', color: 'var(--hb-texto-suave)' }}>
          <span>Itens: <strong style={{ color: 'var(--hb-texto)' }}>{formatarCentavos(pedido.totais.itensCentavos)}</strong></span>
          {pedido.totais.freteCentavos > 0 && <span>Frete: <strong style={{ color: 'var(--hb-texto)' }}>{formatarCentavos(pedido.totais.freteCentavos)}</strong></span>}
          {pedido.totais.descontoCentavos > 0 && <span>Desconto: <strong style={{ color: 'var(--hb-erro)' }}>−{formatarCentavos(pedido.totais.descontoCentavos)}</strong></span>}
          <span>Total: <strong style={{ color: 'var(--hb-primaria)', fontSize: 16 }}>{formatarCentavos(pedido.totais.totalCentavos)}</strong></span>
        </div>
        {pedido.valorGramaCongelado && (
          <p style={{ margin: '10px 0 0', fontSize: 'var(--hb-legenda)', color: 'var(--hb-texto-suave)' }}>
            Valor do grama congelado na emissão: <strong>{formatarCentavos(pedido.valorGramaCongelado.valorCentavos)}/g</strong>
            {pedido.valorGramaCongelado.teor ? ` (teor ${pedido.valorGramaCongelado.teor})` : ''} — alterações futuras do grama não afetam este pedido.
          </p>
        )}
      </section>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Parcelas</h2>
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Recebido</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {parcelas.map((p) => (
              <tr key={p.id} style={{ cursor: 'default' }}>
                <td data-rotulo="Parcela">{p.numero}/{p.de}</td>
                <td data-rotulo="Vencimento">{p.vencimento.split('-').reverse().join('/')}</td>
                <td data-rotulo="Valor">{formatarCentavos(p.valorCentavos)}</td>
                <td data-rotulo="Recebido">{formatarCentavos(p.valorRecebidoCentavos)}</td>
                <td data-rotulo="Status">
                  <StatusChip tom={p.status === 'pago' ? 'sucesso' : 'atencao'}>
                    {p.status === 'pago' ? 'Pago' : p.status === 'parcial' ? 'Parcial' : 'Em aberto'}
                  </StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: '10px 0 0', fontSize: 'var(--hb-legenda)', color: 'var(--hb-texto-suave)' }}>
          A baixa de pagamentos entra na Fase 3 (Financeiro).
        </p>
      </section>

      {comissao && (
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Comissão prevista</h2>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>
              Escritório ({comissao.escritorio.pct}%):{' '}
              <strong>{formatarCentavos(comissao.escritorio.valorCentavos)}</strong>
            </span>
            <span>
              Vendedor ({comissao.vendedor.pctProporcional}%):{' '}
              <strong>{formatarCentavos(comissao.vendedor.valorCentavos)}</strong>
            </span>
            <StatusChip tom={comissao.status === 'estornada' ? 'erro' : comissao.status === 'elegivel' ? 'sucesso' : 'atencao'}>
              {ROTULO_COMISSAO[comissao.status] ?? comissao.status}
            </StatusChip>
            {comissao.previsaoRecebimento && (
              <span style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-corpo-sm)' }}>
                Previsão: {comissao.previsaoRecebimento.split('-').reverse().join('/')}
              </span>
            )}
          </div>
        </section>
      )}

      {mudandoPara && (
        <ModalConfirmacao
          titulo={`Marcar como ${rotuloStatusPedido[mudandoPara].toLowerCase()}?`}
          rotuloConfirmar="Confirmar"
          ocupado={ocupado}
          aoConfirmar={() => void mudarStatus(mudandoPara)}
          aoCancelar={() => setMudandoPara(null)}
        >
          O pedido nº {pedido.numero} passará de <strong>{rotuloStatusPedido[pedido.status]}</strong> para{' '}
          <strong>{rotuloStatusPedido[mudandoPara]}</strong>. A mudança fica registrada na auditoria.
        </ModalConfirmacao>
      )}

      {convertendo && (
        <ModalConfirmacao
          titulo="Converter orçamento em pedido?"
          rotuloConfirmar="Converter"
          ocupado={ocupado}
          aoConfirmar={() => void converterEmPedido()}
          aoCancelar={() => setConvertendo(false)}
        >
          Os preços do orçamento serão <strong>mantidos</strong> (ADR-006) e a comissão prevista passa a
          valer conforme o regime da indústria.
        </ModalConfirmacao>
      )}

      {cancelando && (
        <ModalConfirmacao
          titulo={`Cancelar ${pedido.tipo === 'orcamento' ? 'o orçamento' : 'o pedido'} nº ${pedido.numero}?`}
          rotuloConfirmar="Cancelar definitivamente"
          tomPerigo
          ocupado={ocupado}
          aoConfirmar={() => void cancelar()}
          aoCancelar={() => setCancelando(false)}
        >
          A comissão prevista será estornada (se ainda não fechada) e o cancelamento fica na auditoria.
          <div style={{ marginTop: 12 }}>
            <CampoTexto rotulo="Motivo *" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: cliente desistiu" />
          </div>
        </ModalConfirmacao>
      )}
    </div>
  );
}
