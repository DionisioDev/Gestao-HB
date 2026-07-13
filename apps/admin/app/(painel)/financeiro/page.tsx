'use client';

import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import { collectionGroup, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ModalConfirmacao } from '../../../components/modal';
import { CampoSelect, CampoTexto } from '../../../components/campos';
import estilos from '../../../components/ui.module.css';
import { baixarParcela, FORMAS_PAGAMENTO } from '../../../lib/financeiro';
import { fb } from '../../../lib/firebase';
import { useIndustrias } from '../../../lib/industrias';
import { useSnackbar } from '../../../lib/snackbar';

interface LinhaParcela {
  id: string;
  pedidoId: string;
  pedidoNumero: number;
  clienteNome: string;
  industriaId: string;
  numero: number;
  de: number;
  valorCentavos: number;
  valorRecebidoCentavos: number;
  vencimento: string;
  status: 'aberto' | 'parcial' | 'pago';
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function PaginaFinanceiro() {
  const avisar = useSnackbar();
  const industrias = useIndustrias();
  const [parcelas, setParcelas] = useState<LinhaParcela[] | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('pendentes');
  const [filtroIndustria, setFiltroIndustria] = useState('');
  const [busca, setBusca] = useState('');
  const [baixando, setBaixando] = useState<LinhaParcela | null>(null);
  const [valorBaixa, setValorBaixa] = useState('');
  const [formaBaixa, setFormaBaixa] = useState<string>('PIX');
  const [dataBaixa, setDataBaixa] = useState(hoje());
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(fb().db, 'parcelas'), where('tipoPedido', '==', 'pedido'), orderBy('vencimento'), limit(400)),
      (foto) => setParcelas(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaParcela, 'id'>) }))),
      (erro) => {
        console.error(erro);
        setParcelas([]);
      },
    );
  }, []);

  const filtradas = useMemo(() => {
    if (!parcelas) return null;
    const termo = busca.trim().toLowerCase();
    return parcelas.filter((p) => {
      const pendente = p.status !== 'pago';
      const casaStatus =
        filtroStatus === 'pendentes' ? pendente : filtroStatus === 'vencidas' ? pendente && p.vencimento < hoje() : filtroStatus === 'pagas' ? p.status === 'pago' : true;
      return (
        casaStatus &&
        (!filtroIndustria || p.industriaId === filtroIndustria) &&
        (!termo || p.clienteNome?.toLowerCase().includes(termo) || String(p.pedidoNumero).includes(termo))
      );
    });
  }, [parcelas, filtroStatus, filtroIndustria, busca]);

  const totalAReceber = (filtradas ?? []).reduce((s, p) => s + (p.valorCentavos - p.valorRecebidoCentavos), 0);
  const totalRecebido = (filtradas ?? []).reduce((s, p) => s + p.valorRecebidoCentavos, 0);

  function abrirBaixa(p: LinhaParcela) {
    setBaixando(p);
    setValorBaixa(String(((p.valorCentavos - p.valorRecebidoCentavos) / 100).toFixed(2)).replace('.', ','));
    setFormaBaixa('PIX');
    setDataBaixa(hoje());
  }

  async function confirmarBaixa() {
    if (!baixando) return;
    const centavos = Math.round(Number(valorBaixa.replace(/\./g, '').replace(',', '.')) * 100);
    if (!Number.isFinite(centavos) || centavos <= 0) {
      avisar('Informe um valor válido.', 'erro');
      return;
    }
    setOcupado(true);
    try {
      await baixarParcela({
        pedidoId: baixando.pedidoId,
        parcelaId: baixando.id,
        valorCentavos: centavos,
        forma: formaBaixa,
        data: dataBaixa,
      });
      avisar(`Baixa de ${formatarCentavos(centavos)} registrada — comissão atualizada conforme o regime.`, 'sucesso');
      setBaixando(null);
    } catch (excecao) {
      avisar((excecao as Error).message || 'Não foi possível registrar a baixa.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  const nomeIndustria = (id: string) => industrias?.find((i) => i.id === id)?.nome ?? id;

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Contas a Receber</h1>
          <p className={estilos.subtitulo}>
            {filtradas
              ? `A receber: ${formatarCentavos(totalAReceber)} · recebido: ${formatarCentavos(totalRecebido)}`
              : 'Parcelas dos pedidos — a baixa dispara a comissão do Regime B.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input className={estilos.busca} placeholder="Buscar por cliente ou nº do pedido…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar parcela" />
        <select className={estilos.entrada} style={{ maxWidth: 170 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="pendentes">Pendentes</option>
          <option value="vencidas">Vencidas</option>
          <option value="pagas">Pagas</option>
          <option value="todas">Todas</option>
        </select>
        <select className={estilos.entrada} style={{ maxWidth: 200 }} value={filtroIndustria} onChange={(e) => setFiltroIndustria(e.target.value)} aria-label="Filtrar por indústria">
          <option value="">Todas as indústrias</option>
          {(industrias ?? []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>

      <div className={estilos.tabelaEnvoltorio}>
        {!filtradas ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : filtradas.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>Nenhuma parcela {filtroStatus === 'pagas' ? 'paga' : 'pendente'}</strong>
            As parcelas nascem com a emissão dos pedidos. (Pedidos emitidos antes da Fase 3 não aparecem
            aqui — apenas os novos.)
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Indústria</th>
                <th>Parcela</th>
                <th>Saldo</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => {
                const vencida = p.status !== 'pago' && p.vencimento < hoje();
                const saldo = p.valorCentavos - p.valorRecebidoCentavos;
                return (
                  <tr key={`${p.pedidoId}-${p.id}`} style={{ cursor: 'default' }}>
                    <td data-rotulo="Vencimento">
                      {p.vencimento?.split('-').reverse().join('/')}
                      {vencida && (
                        <span style={{ marginLeft: 8 }}>
                          <StatusChip tom="erro">vencida</StatusChip>
                        </span>
                      )}
                    </td>
                    <td data-rotulo="Pedido">
                      <Link href={`/pedidos/${p.pedidoId}`} style={{ fontWeight: 600 }}>
                        nº {p.pedidoNumero}
                      </Link>
                    </td>
                    <td data-rotulo="Cliente">{p.clienteNome}</td>
                    <td data-rotulo="Indústria">{nomeIndustria(p.industriaId)}</td>
                    <td data-rotulo="Parcela">
                      {p.numero}/{p.de} · {formatarCentavos(p.valorCentavos)}
                    </td>
                    <td data-rotulo="Saldo">
                      <strong>{formatarCentavos(saldo)}</strong>
                    </td>
                    <td data-rotulo="Status">
                      <StatusChip tom={p.status === 'pago' ? 'sucesso' : 'atencao'}>
                        {p.status === 'pago' ? 'Paga' : p.status === 'parcial' ? 'Parcial' : 'Em aberto'}
                      </StatusChip>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status !== 'pago' && (
                        <button className={estilos.botaoSecundario} style={{ minHeight: 38, padding: '0 14px' }} onClick={() => abrirBaixa(p)}>
                          Receber
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {baixando && (
        <ModalConfirmacao
          titulo={`Receber parcela ${baixando.numero}/${baixando.de} — pedido nº ${baixando.pedidoNumero}`}
          rotuloConfirmar="Confirmar recebimento"
          ocupado={ocupado}
          aoConfirmar={() => void confirmarBaixa()}
          aoCancelar={() => setBaixando(null)}
        >
          <p style={{ margin: '0 0 4px' }}>
            {baixando.clienteNome} · saldo{' '}
            <strong>{formatarCentavos(baixando.valorCentavos - baixando.valorRecebidoCentavos)}</strong>
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <CampoTexto rotulo="Valor recebido (R$) *" inputMode="decimal" value={valorBaixa} onChange={(e) => setValorBaixa(e.target.value)} />
            <CampoSelect rotulo="Forma de pagamento *" value={formaBaixa} onChange={(e) => setFormaBaixa(e.target.value)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto rotulo="Data do recebimento *" type="date" value={dataBaixa} onChange={(e) => setDataBaixa(e.target.value)} />
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 'var(--hb-legenda)' }}>
            Se esta baixa quitar o pedido de uma indústria Regime B, a comissão fica elegível para o
            próximo fechamento automaticamente.
          </p>
        </ModalConfirmacao>
      )}
    </div>
  );
}
