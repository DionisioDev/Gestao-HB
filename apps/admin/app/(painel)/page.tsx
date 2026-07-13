'use client';

import type { StatusPedido } from '@gestao-hb/core';
import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import { collection, collectionGroup, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import estilos from '../../components/ui.module.css';
import { fb } from '../../lib/firebase';
import { rotuloStatusPedido, tomStatusPedido } from '../../lib/status-pedido';

interface PedidoResumo {
  numero: number;
  tipo: string;
  status: StatusPedido;
  dataEmissao: string;
  totais?: { totalCentavos: number };
}

interface ComissaoResumo {
  status: string;
  escritorio: { valorCentavos: number };
  vendedor: { valorCentavos: number };
}

interface ParcelaResumo {
  status: string;
  vencimento: string;
  valorCentavos: number;
  valorRecebidoCentavos: number;
}

const inicioDoMes = () => `${new Date().toISOString().slice(0, 7)}-01`;
const hoje = () => new Date().toISOString().slice(0, 10);

function Cartao({ titulo, valor, rodape, href }: { titulo: string; valor: string; rodape?: string; href?: string }) {
  const conteudo = (
    <div className={estilos.card} style={{ margin: 0, height: '100%' }}>
      <div style={{ fontSize: 'var(--hb-legenda)', fontWeight: 600, color: 'var(--hb-texto-suave)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {titulo}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--hb-primaria)', margin: '6px 0 2px' }}>{valor}</div>
      {rodape && <div style={{ fontSize: 'var(--hb-corpo-sm)', color: 'var(--hb-texto-suave)' }}>{rodape}</div>}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

export default function PaginaPainel() {
  const [pedidosMes, setPedidosMes] = useState<PedidoResumo[] | null>(null);
  const [comissoes, setComissoes] = useState<ComissaoResumo[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaResumo[]>([]);

  useEffect(() => {
    return onSnapshot(
      query(collection(fb().db, 'pedidos'), where('dataEmissao', '>=', inicioDoMes()), orderBy('dataEmissao', 'desc')),
      (foto) => setPedidosMes(foto.docs.map((d) => d.data() as PedidoResumo)),
      () => setPedidosMes([]),
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(fb().db, 'comissoes'), (foto) => setComissoes(foto.docs.map((d) => d.data() as ComissaoResumo)));
  }, []);

  useEffect(() => {
    return onSnapshot(
      query(collectionGroup(fb().db, 'parcelas'), where('tipoPedido', '==', 'pedido'), orderBy('vencimento')),
      (foto) => setParcelas(foto.docs.map((d) => d.data() as ParcelaResumo)),
      () => setParcelas([]),
    );
  }, []);

  const soPedidos = useMemo(() => (pedidosMes ?? []).filter((p) => p.tipo === 'pedido' && p.status !== 'cancelado'), [pedidosMes]);
  const totalMes = soPedidos.reduce((s, p) => s + (p.totais?.totalCentavos ?? 0), 0);

  const porStatus = useMemo(() => {
    const mapa = new Map<StatusPedido, number>();
    for (const p of soPedidos) mapa.set(p.status, (mapa.get(p.status) ?? 0) + 1);
    return [...mapa.entries()];
  }, [soPedidos]);

  const aFechar = comissoes.filter((c) => c.status === 'elegivel');
  const totalAFechar = aFechar.reduce((s, c) => s + c.vendedor.valorCentavos, 0);
  const comissaoEscritorioMes = comissoes
    .filter((c) => ['elegivel', 'fechada', 'paga'].includes(c.status))
    .reduce((s, c) => s + c.escritorio.valorCentavos, 0);

  const vencidas = parcelas.filter((p) => p.status !== 'pago' && p.vencimento < hoje());
  const totalVencidas = vencidas.reduce((s, p) => s + (p.valorCentavos - (p.valorRecebidoCentavos ?? 0)), 0);

  const mesRotulo = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Painel</h1>
          <p className={estilos.subtitulo}>Visão de {mesRotulo}.</p>
        </div>
        <Link href="/pedidos/novo" className={estilos.botaoPrimario}>
          + Novo pedido
        </Link>
      </div>

      {!pedidosMes ? (
        <div aria-busy="true">
          <div className={estilos.esqueleto} />
          <div className={estilos.esqueleto} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <Cartao titulo="Vendas do mês" valor={formatarCentavos(totalMes)} rodape={`${soPedidos.length} pedidos`} href="/pedidos" />
            <Cartao titulo="Comissões a fechar" valor={formatarCentavos(totalAFechar)} rodape={`${aFechar.length} pedidos elegíveis`} href="/comissoes" />
            <Cartao titulo="Parcelas vencidas" valor={formatarCentavos(totalVencidas)} rodape={`${vencidas.length} parcelas em atraso`} href="/financeiro" />
            <Cartao titulo="Comissão do escritório" valor={formatarCentavos(comissaoEscritorioMes)} rodape="elegível + fechada + paga" />
          </div>

          <section className={estilos.card}>
            <h2 className={estilos.cardTitulo}>Pedidos do mês por status</h2>
            {porStatus.length === 0 ? (
              <p style={{ color: 'var(--hb-texto-suave)', margin: 0 }}>
                Nenhum pedido em {mesRotulo} ainda — o primeiro sai pelo botão acima.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {porStatus.map(([status, qtde]) => (
                  <Link key={status} href="/pedidos" style={{ textDecoration: 'none' }}>
                    <StatusChip tom={tomStatusPedido[status]}>{`${rotuloStatusPedido[status]}: ${qtde}`}</StatusChip>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={estilos.card}>
            <h2 className={estilos.cardTitulo}>Últimos pedidos</h2>
            {soPedidos.length === 0 ? (
              <p style={{ color: 'var(--hb-texto-suave)', margin: 0 }}>—</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(pedidosMes ?? []).slice(0, 6).map((p) => (
                  <div key={p.numero} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--hb-corpo-sm)' }}>
                    <strong style={{ width: 64 }}>nº {p.numero}</strong>
                    <span style={{ color: 'var(--hb-texto-suave)' }}>{p.dataEmissao?.split('-').reverse().join('/')}</span>
                    <StatusChip tom={tomStatusPedido[p.status]}>{rotuloStatusPedido[p.status]}</StatusChip>
                    <strong style={{ marginLeft: 'auto' }}>{formatarCentavos(p.totais?.totalCentavos ?? 0)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
