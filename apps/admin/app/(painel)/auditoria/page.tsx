'use client';

import { StatusChip } from '@gestao-hb/ui';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import estilos from '../../../components/ui.module.css';
import { fb } from '../../../lib/firebase';

interface Registro {
  id: string;
  usuarioNome: string;
  acao: string;
  entidadeTipo: string;
  entidadeId: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  origem: string;
  timestamp?: Timestamp;
}

function formatarData(t?: Timestamp): string {
  if (!t) return '—';
  const d = t.toDate();
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Diferença campo a campo antes → depois (especificação §2.8). */
function calcularDiff(antes: Record<string, unknown> | null, depois: Record<string, unknown> | null) {
  const chaves = new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})]);
  const linhas: Array<{ campo: string; de: string; para: string }> = [];
  for (const chave of chaves) {
    if (['atualizadoEm', 'criadoEm', 'criadoPor'].includes(chave)) continue;
    const de = JSON.stringify(antes?.[chave] ?? null);
    const para = JSON.stringify(depois?.[chave] ?? null);
    if (de !== para) linhas.push({ campo: chave, de, para });
  }
  return linhas;
}

export default function PaginaAuditoria() {
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroEntidade, setFiltroEntidade] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'auditoria'), orderBy('timestamp', 'desc'), limit(300)), (foto) =>
      setRegistros(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Registro, 'id'>) }))),
    );
  }, []);

  const acoes = useMemo(() => [...new Set((registros ?? []).map((r) => r.acao))].sort(), [registros]);
  const entidades = useMemo(() => [...new Set((registros ?? []).map((r) => r.entidadeTipo))].sort(), [registros]);

  const filtrados = useMemo(() => {
    if (!registros) return null;
    const termo = busca.trim().toLowerCase();
    return registros.filter(
      (r) =>
        (!filtroAcao || r.acao === filtroAcao) &&
        (!filtroEntidade || r.entidadeTipo === filtroEntidade) &&
        (!termo || r.usuarioNome.toLowerCase().includes(termo) || r.entidadeId.toLowerCase().includes(termo)),
    );
  }, [registros, filtroAcao, filtroEntidade, busca]);

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Auditoria</h1>
          <p className={estilos.subtitulo}>
            Lastro imutável de quem fez o quê — registros não podem ser editados nem apagados.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input className={estilos.busca} placeholder="Buscar por usuário ou registro…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar na auditoria" />
        <select className={estilos.entrada} style={{ maxWidth: 220 }} value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)} aria-label="Filtrar por ação">
          <option value="">Todas as ações</option>
          {acoes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select className={estilos.entrada} style={{ maxWidth: 200 }} value={filtroEntidade} onChange={(e) => setFiltroEntidade(e.target.value)} aria-label="Filtrar por entidade">
          <option value="">Todas as entidades</option>
          {entidades.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className={estilos.tabelaEnvoltorio}>
        {!filtrados ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : filtrados.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>Nenhum registro</strong>
            Ajuste os filtros — os últimos 300 eventos são exibidos.
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => {
                const diff = aberto === r.id ? calcularDiff(r.antes, r.depois) : [];
                return (
                  <tr key={r.id} onClick={() => setAberto(aberto === r.id ? null : r.id)}>
                    <td data-rotulo="Quando" style={{ whiteSpace: 'nowrap' }}>{formatarData(r.timestamp)}</td>
                    <td data-rotulo="Usuário">{r.usuarioNome}</td>
                    <td data-rotulo="Ação">
                      <StatusChip tom={r.acao.includes('remov') || r.acao.includes('desativ') ? 'erro' : r.acao.includes('criad') ? 'sucesso' : 'info'}>
                        {r.acao}
                      </StatusChip>
                    </td>
                    <td data-rotulo="Registro">
                      <span style={{ color: 'var(--hb-texto-suave)' }}>{r.entidadeTipo}/</span>
                      {r.entidadeId}
                      {aberto === r.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginTop: 10, background: '#f7fafd', border: '1px solid var(--hb-borda)', borderRadius: 10, padding: '10px 14px', fontSize: 'var(--hb-legenda)', cursor: 'default' }}
                        >
                          {diff.length === 0 ? (
                            <em style={{ color: 'var(--hb-texto-suave)' }}>Sem alterações de campo registradas.</em>
                          ) : (
                            diff.map((l) => (
                              <div key={l.campo} style={{ padding: '3px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <strong>{l.campo}:</strong>
                                <span style={{ color: 'var(--hb-erro)', textDecoration: l.de !== 'null' ? 'line-through' : 'none' }}>
                                  {l.de === 'null' ? '∅' : l.de}
                                </span>
                                <span aria-hidden>→</span>
                                <span style={{ color: 'var(--hb-sucesso)' }}>{l.para === 'null' ? '∅' : l.para}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
