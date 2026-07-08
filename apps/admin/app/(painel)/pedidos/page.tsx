'use client';

import type { StatusPedido } from '@gestao-hb/core';
import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import estilos from '../../../components/ui.module.css';
import { fb } from '../../../lib/firebase';
import { useIndustrias } from '../../../lib/industrias';
import { rotuloStatusPedido, tomStatusPedido } from '../../../lib/status-pedido';

interface LinhaPedido {
  id: string;
  numero: number;
  tipo: 'pedido' | 'orcamento';
  clienteNome: string;
  vendedorNome: string;
  industriaId: string;
  industriaNome: string;
  status: StatusPedido;
  dataEmissao: string;
  totais?: { totalCentavos: number };
}

export default function PaginaPedidos() {
  const router = useRouter();
  const industrias = useIndustrias();
  const [pedidos, setPedidos] = useState<LinhaPedido[] | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroIndustria, setFiltroIndustria] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'pedidos'), orderBy('numero', 'desc'), limit(200)), (foto) =>
      setPedidos(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaPedido, 'id'>) }))),
    );
  }, []);

  const filtrados = useMemo(() => {
    if (!pedidos) return null;
    const termo = busca.trim().toLowerCase();
    return pedidos.filter(
      (p) =>
        (!termo || String(p.numero).includes(termo) || p.clienteNome.toLowerCase().includes(termo)) &&
        (!filtroStatus || p.status === filtroStatus) &&
        (!filtroIndustria || p.industriaId === filtroIndustria) &&
        (!filtroTipo || p.tipo === filtroTipo),
    );
  }, [pedidos, busca, filtroStatus, filtroIndustria, filtroTipo]);

  const totalFiltrado = (filtrados ?? []).reduce((s, p) => s + (p.totais?.totalCentavos ?? 0), 0);

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Pedidos</h1>
          <p className={estilos.subtitulo}>
            {filtrados ? `${filtrados.length} exibidos · ${formatarCentavos(totalFiltrado)}` : 'Pedidos e orçamentos.'}
          </p>
        </div>
        <Link href="/pedidos/novo" className={estilos.botaoPrimario}>
          + Novo pedido
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input className={estilos.busca} placeholder="Buscar por número ou cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pedido" />
        <select className={estilos.entrada} style={{ maxWidth: 170 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Pedidos e orçamentos</option>
          <option value="pedido">Só pedidos</option>
          <option value="orcamento">Só orçamentos</option>
        </select>
        <select className={estilos.entrada} style={{ maxWidth: 180 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {Object.entries(rotuloStatusPedido).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
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
        {!filtrados ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : filtrados.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>{busca || filtroStatus || filtroIndustria || filtroTipo ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}</strong>
            {busca || filtroStatus || filtroIndustria || filtroTipo ? 'Ajuste a busca ou os filtros.' : 'Emita o primeiro pedido pelo botão acima.'}
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Indústria</th>
                <th>Vendedor</th>
                <th>Emissão</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/pedidos/${p.id}`)}>
                  <td data-rotulo="Nº">
                    <strong>{p.numero}</strong>
                    {p.tipo === 'orcamento' && (
                      <span style={{ color: 'var(--hb-atencao)', fontSize: 'var(--hb-legenda)' }}> orç.</span>
                    )}
                  </td>
                  <td data-rotulo="Cliente">{p.clienteNome}</td>
                  <td data-rotulo="Indústria">{p.industriaNome}</td>
                  <td data-rotulo="Vendedor">{p.vendedorNome}</td>
                  <td data-rotulo="Emissão">{p.dataEmissao?.split('-').reverse().join('/')}</td>
                  <td data-rotulo="Total"><strong>{formatarCentavos(p.totais?.totalCentavos ?? 0)}</strong></td>
                  <td data-rotulo="Status">
                    <StatusChip tom={tomStatusPedido[p.status]}>{rotuloStatusPedido[p.status]}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
