'use client';

import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ModalConfirmacao } from '../../../components/modal';
import { CampoTexto } from '../../../components/campos';
import estilos from '../../../components/ui.module.css';
import { auditar } from '../../../lib/auditoria';
import { fb } from '../../../lib/firebase';
import { useSnackbar } from '../../../lib/snackbar';

interface ComissaoDoc {
  id: string;
  pedidoId: string;
  pedidoNumero: number;
  vendedorId: string;
  vendedorNome: string;
  industriaId: string;
  regime: 'mensalFixo' | 'posRecebimento';
  elegibilidade?: 'pedidoQuitado' | 'porParcela';
  status: string;
  dataElegibilidade?: string;
  previsaoRecebimento?: string;
  escritorio: { pct: number; valorCentavos: number };
  vendedor: { pctProporcional: number; valorCentavos: number };
  valorElegivelEscritorioCentavos?: number;
  fechamentoId?: string;
}

interface Fechamento {
  id: string;
  vendedorId: string;
  vendedorNome: string;
  periodo: string;
  totalEscritorioCentavos: number;
  totalVendedorCentavos: number;
  quantidade: number;
  status: 'fechado' | 'pago';
  dataPagto?: string;
}

const mesAtual = () => new Date().toISOString().slice(0, 7); // yyyy-mm

export default function PaginaComissoes() {
  const avisar = useSnackbar();
  const [comissoes, setComissoes] = useState<ComissaoDoc[] | null>(null);
  const [fechamentos, setFechamentos] = useState<Fechamento[] | null>(null);
  const [periodo, setPeriodo] = useState(mesAtual());
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [pagando, setPagando] = useState<Fechamento | null>(null);
  const [dataPagto, setDataPagto] = useState(new Date().toISOString().slice(0, 10));
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(fb().db, 'comissoes'), (foto) =>
      setComissoes(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ComissaoDoc, 'id'>) }))),
    );
  }, []);

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'fechamentosComissao'), orderBy('periodo', 'desc')), (foto) =>
      setFechamentos(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Fechamento, 'id'>) }))),
    );
  }, []);

  const fimDoPeriodo = `${periodo}-31`;

  // candidatas ao fechamento do período (especificação §2.5)
  const candidatas = useMemo(() => {
    if (!comissoes) return null;
    return comissoes
      .filter((c) => c.status === 'elegivel' && !c.fechamentoId)
      .filter((c) => (c.dataElegibilidade ?? '') <= fimDoPeriodo)
      .filter((c) => !filtroVendedor || c.vendedorId === filtroVendedor);
  }, [comissoes, fimDoPeriodo, filtroVendedor]);

  // pré-seleção: todas as candidatas (o gestor ajusta)
  useEffect(() => {
    if (candidatas) setSelecionadas(new Set(candidatas.map((c) => c.id)));
  }, [candidatas]);

  const vendedoresDasCandidatas = useMemo(
    () => [...new Map((comissoes ?? []).filter((c) => c.status === 'elegivel').map((c) => [c.vendedorId, c.vendedorNome])).entries()],
    [comissoes],
  );

  const escolhidas = (candidatas ?? []).filter((c) => selecionadas.has(c.id));
  const valorEscritorio = (c: ComissaoDoc) =>
    c.elegibilidade === 'porParcela' ? (c.valorElegivelEscritorioCentavos ?? c.escritorio.valorCentavos) : c.escritorio.valorCentavos;
  const valorVendedor = (c: ComissaoDoc) =>
    Math.round((valorEscritorio(c) * c.vendedor.pctProporcional) / 100);
  const totalEscritorio = escolhidas.reduce((s, c) => s + valorEscritorio(c), 0);
  const totalVendedor = escolhidas.reduce((s, c) => s + valorVendedor(c), 0);

  async function confirmarFechamento() {
    if (escolhidas.length === 0) return;
    const porVendedor = new Map<string, ComissaoDoc[]>();
    for (const c of escolhidas) {
      porVendedor.set(c.vendedorId, [...(porVendedor.get(c.vendedorId) ?? []), c]);
    }
    setOcupado(true);
    try {
      for (const [vendedorId, lista] of porVendedor) {
        const lote = writeBatch(fb().db);
        const refFechamento = doc(collection(fb().db, 'fechamentosComissao'));
        const totEsc = lista.reduce((s, c) => s + valorEscritorio(c), 0);
        const totVen = lista.reduce((s, c) => s + valorVendedor(c), 0);
        lote.set(refFechamento, {
          vendedorId,
          vendedorNome: lista[0]!.vendedorNome,
          periodo,
          comissaoIds: lista.map((c) => c.id),
          pedidos: lista.map((c) => c.pedidoNumero),
          quantidade: lista.length,
          totalEscritorioCentavos: totEsc,
          totalVendedorCentavos: totVen,
          status: 'fechado',
          criadoEm: serverTimestamp(),
        });
        for (const c of lista) {
          lote.update(doc(fb().db, 'comissoes', c.id), { status: 'fechada', fechamentoId: refFechamento.id });
        }
        await lote.commit();
        await auditar('fechamento_criado', 'fechamentoComissao', refFechamento.id, null, {
          vendedor: lista[0]!.vendedorNome,
          periodo,
          quantidade: lista.length,
          totalVendedorCentavos: totVen,
        });
      }
      avisar(`Fechamento de ${periodo.split('-').reverse().join('/')} confirmado (${escolhidas.length} comissões).`, 'sucesso');
      setConfirmando(false);
    } catch {
      avisar('Não foi possível confirmar o fechamento.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function marcarPago() {
    if (!pagando) return;
    setOcupado(true);
    try {
      const lote = writeBatch(fb().db);
      lote.update(doc(fb().db, 'fechamentosComissao', pagando.id), { status: 'pago', dataPagto });
      const doFechamento = (comissoes ?? []).filter((c) => c.fechamentoId === pagando.id);
      for (const c of doFechamento) {
        lote.update(doc(fb().db, 'comissoes', c.id), { status: 'paga' });
      }
      await lote.commit();
      await auditar('fechamento_pago', 'fechamentoComissao', pagando.id, { status: 'fechado' }, { status: 'pago', dataPagto });
      avisar(`Fechamento marcado como pago em ${dataPagto.split('-').reverse().join('/')}.`, 'sucesso');
      setPagando(null);
    } catch {
      avisar('Não foi possível marcar como pago.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Comissões</h1>
          <p className={estilos.subtitulo}>Fechamento por período e vendedor — pré-seleção automática por regime.</p>
        </div>
      </div>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Novo fechamento</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input className={estilos.entrada} style={{ maxWidth: 170 }} type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Período do fechamento" />
          <select className={estilos.entrada} style={{ maxWidth: 220 }} value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} aria-label="Filtrar por vendedor">
            <option value="">Todos os vendedores</option>
            {vendedoresDasCandidatas.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        {!candidatas ? (
          <div className={estilos.esqueleto} />
        ) : candidatas.length === 0 ? (
          <div className={estilos.vazio} style={{ padding: '28px 0' }}>
            <strong>Nenhuma comissão elegível até {periodo.split('-').reverse().join('/')}</strong>
            Regime A entra ao emitir o pedido; Regime B após a baixa do pagamento (Financeiro).
          </div>
        ) : (
          <>
            <table className={estilos.tabela}>
              <thead>
                <tr>
                  <th />
                  <th>Pedido</th>
                  <th>Vendedor</th>
                  <th>Regime</th>
                  <th>Elegível desde</th>
                  <th>Escritório</th>
                  <th>Vendedor recebe</th>
                </tr>
              </thead>
              <tbody>
                {candidatas.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() =>
                      setSelecionadas((s) => {
                        const nova = new Set(s);
                        if (nova.has(c.id)) nova.delete(c.id);
                        else nova.add(c.id);
                        return nova;
                      })
                    }
                  >
                    <td>
                      <input type="checkbox" checked={selecionadas.has(c.id)} readOnly style={{ width: 20, height: 20 }} aria-label={`Selecionar pedido ${c.pedidoNumero}`} />
                    </td>
                    <td data-rotulo="Pedido">
                      <strong>nº {c.pedidoNumero}</strong>
                    </td>
                    <td data-rotulo="Vendedor">{c.vendedorNome}</td>
                    <td data-rotulo="Regime">
                      <StatusChip tom={c.regime === 'mensalFixo' ? 'info' : 'neutro'}>
                        {c.regime === 'mensalFixo' ? 'A · mensal' : `B · ${c.elegibilidade === 'porParcela' ? 'por parcela' : 'quitado'}`}
                      </StatusChip>
                    </td>
                    <td data-rotulo="Elegível">{c.dataElegibilidade?.split('-').reverse().join('/') ?? '—'}</td>
                    <td data-rotulo="Escritório">{formatarCentavos(valorEscritorio(c))}</td>
                    <td data-rotulo="Vendedor recebe">
                      <strong>{formatarCentavos(valorVendedor(c))}</strong>{' '}
                      <span style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>({c.vendedor.pctProporcional}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 16, flexWrap: 'wrap' }}>
              <span>
                Selecionadas: <strong>{escolhidas.length}</strong> · Escritório:{' '}
                <strong>{formatarCentavos(totalEscritorio)}</strong> · Vendedores:{' '}
                <strong style={{ color: 'var(--hb-primaria)' }}>{formatarCentavos(totalVendedor)}</strong>
              </span>
              <button className={estilos.botaoPrimario} style={{ marginLeft: 'auto' }} disabled={escolhidas.length === 0} onClick={() => setConfirmando(true)}>
                Confirmar fechamento
              </button>
            </div>
          </>
        )}
      </section>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Fechamentos realizados</h2>
        {!fechamentos ? (
          <div className={estilos.esqueleto} />
        ) : fechamentos.length === 0 ? (
          <p style={{ color: 'var(--hb-texto-suave)', margin: 0 }}>Nenhum fechamento ainda.</p>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Período</th>
                <th>Vendedor</th>
                <th>Pedidos</th>
                <th>Total do vendedor</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fechamentos.map((f) => (
                <tr key={f.id} style={{ cursor: 'default' }}>
                  <td data-rotulo="Período">{f.periodo?.split('-').reverse().join('/')}</td>
                  <td data-rotulo="Vendedor">{f.vendedorNome}</td>
                  <td data-rotulo="Pedidos">{f.quantidade}</td>
                  <td data-rotulo="Total">
                    <strong>{formatarCentavos(f.totalVendedorCentavos)}</strong>
                  </td>
                  <td data-rotulo="Status">
                    <StatusChip tom={f.status === 'pago' ? 'sucesso' : 'atencao'}>
                      {f.status === 'pago' ? `Pago ${f.dataPagto?.split('-').reverse().join('/') ?? ''}` : 'Fechado'}
                    </StatusChip>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {f.status === 'fechado' && (
                      <button className={estilos.botaoSecundario} style={{ minHeight: 38, padding: '0 14px' }} onClick={() => setPagando(f)}>
                        Marcar como pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {confirmando && (
        <ModalConfirmacao
          titulo={`Confirmar fechamento de ${periodo.split('-').reverse().join('/')}?`}
          rotuloConfirmar="Confirmar fechamento"
          ocupado={ocupado}
          aoConfirmar={() => void confirmarFechamento()}
          aoCancelar={() => setConfirmando(false)}
        >
          {escolhidas.length} comissões serão consolidadas ({formatarCentavos(totalVendedor)} a pagar aos
          vendedores). Elas saem da lista de elegíveis e ficam vinculadas a este fechamento — a ação é
          registrada na auditoria.
        </ModalConfirmacao>
      )}

      {pagando && (
        <ModalConfirmacao
          titulo={`Marcar o fechamento de ${pagando.vendedorNome} como pago?`}
          rotuloConfirmar="Marcar como pago"
          ocupado={ocupado}
          aoConfirmar={() => void marcarPago()}
          aoCancelar={() => setPagando(null)}
        >
          <p style={{ margin: '0 0 10px' }}>
            Total de <strong>{formatarCentavos(pagando.totalVendedorCentavos)}</strong> ({pagando.quantidade}{' '}
            pedidos, período {pagando.periodo?.split('-').reverse().join('/')}).
          </p>
          <CampoTexto rotulo="Data do pagamento *" type="date" value={dataPagto} onChange={(e) => setDataPagto(e.target.value)} />
        </ModalConfirmacao>
      )}
    </div>
  );
}
