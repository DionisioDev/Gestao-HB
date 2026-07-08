'use client';

import { STATUS_CLIENTE, type StatusCliente } from '@gestao-hb/core';
import { StatusChip } from '@gestao-hb/ui';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import estilos from '../../../components/ui.module.css';
import { ROTULO_STATUS_CLIENTE, TOM_STATUS_CLIENTE } from '../../../lib/clientes';
import { fb } from '../../../lib/firebase';

interface LinhaCliente {
  id: string;
  tipoPessoa: 'PJ' | 'PF';
  razaoSocial: string;
  fantasia?: string;
  cnpjCpf?: string;
  endereco?: { cidade?: string; uf?: string };
  vendedorId?: string;
  status: StatusCliente;
}

export default function PaginaClientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState<LinhaCliente[] | null>(null);
  const [vendedores, setVendedores] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'clientes'), orderBy('razaoSocial')), (foto) =>
      setClientes(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaCliente, 'id'>) }))),
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(fb().db, 'vendedores'), (foto) => {
      const mapa: Record<string, string> = {};
      foto.docs.forEach((d) => (mapa[d.id] = (d.data()['nome'] as string) ?? d.id));
      setVendedores(mapa);
    });
  }, []);

  const filtrados = useMemo(() => {
    if (!clientes) return null;
    const termo = busca.trim().toLowerCase();
    return clientes.filter(
      (c) =>
        (!termo ||
          c.razaoSocial.toLowerCase().includes(termo) ||
          (c.fantasia ?? '').toLowerCase().includes(termo) ||
          (c.cnpjCpf ?? '').includes(termo)) &&
        (!filtroStatus || c.status === filtroStatus) &&
        (!filtroVendedor || c.vendedorId === filtroVendedor),
    );
  }, [clientes, busca, filtroStatus, filtroVendedor]);

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Clientes</h1>
          <p className={estilos.subtitulo}>Joalherias e lojistas atendidos pela representação.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/clientes/categorias" className={estilos.botaoSecundario}>
            Categorias
          </Link>
          <Link href="/clientes/novo" className={estilos.botaoPrimario}>
            + Novo cliente
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          className={estilos.busca}
          placeholder="Buscar por nome, fantasia ou CNPJ/CPF…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar cliente"
        />
        <select className={estilos.entrada} style={{ maxWidth: 180 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {STATUS_CLIENTE.map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS_CLIENTE[s]}
            </option>
          ))}
        </select>
        <select className={estilos.entrada} style={{ maxWidth: 200 }} value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} aria-label="Filtrar por vendedor">
          <option value="">Todos os vendedores</option>
          {Object.entries(vendedores).map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
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
            <strong>{busca || filtroStatus || filtroVendedor ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</strong>
            {busca || filtroStatus || filtroVendedor
              ? 'Ajuste a busca ou os filtros.'
              : 'Cadastre o primeiro cliente ou aguarde a migração do sistema atual.'}
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cidade/UF</th>
                <th>Vendedor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/clientes/${c.id}`)}>
                  <td data-rotulo="Cliente">
                    <strong>{c.fantasia || c.razaoSocial}</strong>
                    <div style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>
                      {c.tipoPessoa} {c.cnpjCpf ? `· ${c.cnpjCpf}` : ''}
                    </div>
                  </td>
                  <td data-rotulo="Cidade">
                    {c.endereco?.cidade ? `${c.endereco.cidade}${c.endereco.uf ? `/${c.endereco.uf}` : ''}` : '—'}
                  </td>
                  <td data-rotulo="Vendedor">{c.vendedorId ? (vendedores[c.vendedorId] ?? c.vendedorId) : '—'}</td>
                  <td data-rotulo="Status">
                    <StatusChip tom={TOM_STATUS_CLIENTE[c.status]}>{ROTULO_STATUS_CLIENTE[c.status]}</StatusChip>
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
