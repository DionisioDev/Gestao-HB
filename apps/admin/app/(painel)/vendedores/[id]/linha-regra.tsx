'use client';

import type { RegraVendedorEntrada } from '@gestao-hb/core';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import estilos from '../../../../components/ui.module.css';
import { fb } from '../../../../lib/firebase';
import type { IndustriaResumo } from '../../../../lib/industrias';

interface TabelaRef {
  id: string;
  nome: string;
}

/** Linha editável da matriz do vendedor: indústria × tabela × comissão × limites. */
export function LinhaRegra({
  regra,
  industrias,
  aoMudar,
  aoRemover,
}: {
  regra: RegraVendedorEntrada;
  industrias: IndustriaResumo[];
  aoMudar: (nova: RegraVendedorEntrada) => void;
  aoRemover: () => void;
}) {
  const [tabelas, setTabelas] = useState<TabelaRef[]>([]);

  useEffect(() => {
    if (!regra.industriaId) {
      setTabelas([]);
      return;
    }
    return onSnapshot(
      query(collection(fb().db, 'industrias', regra.industriaId, 'tabelasPreco'), orderBy('ordem')),
      (foto) => setTabelas(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id }))),
    );
  }, [regra.industriaId]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(140px,1.2fr) minmax(120px,1fr) 92px 110px 44px',
        gap: 10,
        alignItems: 'center',
        padding: '10px 12px',
        background: '#f7fafd',
        border: '1px solid var(--hb-borda)',
        borderRadius: 10,
      }}
    >
      <select
        className={estilos.entrada}
        value={regra.industriaId}
        onChange={(e) => aoMudar({ ...regra, industriaId: e.target.value, tabelaId: '*' })}
        aria-label="Indústria"
      >
        <option value="">Indústria…</option>
        {industrias.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nome}
          </option>
        ))}
      </select>

      <select
        className={estilos.entrada}
        value={regra.tabelaId}
        onChange={(e) => aoMudar({ ...regra, tabelaId: e.target.value })}
        disabled={!regra.industriaId}
        aria-label="Tabela de preço"
      >
        <option value="*">Todas as tabelas</option>
        {tabelas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <input
        className={estilos.entrada}
        inputMode="decimal"
        placeholder="% com."
        title="Comissão proporcional (%)"
        aria-label="Comissão proporcional (%)"
        value={regra.comissaoProporcionalPct === 0 ? '' : String(regra.comissaoProporcionalPct).replace('.', ',')}
        onChange={(e) => {
          const n = Number(e.target.value.replace(',', '.'));
          aoMudar({ ...regra, comissaoProporcionalPct: Number.isFinite(n) ? n : 0 });
        }}
      />

      <input
        className={estilos.entrada}
        inputMode="decimal"
        placeholder="% desc. máx"
        title="Limite de desconto (%)"
        aria-label="Limite de desconto (%)"
        value={regra.limiteDescontoPct === 0 ? '' : String(regra.limiteDescontoPct).replace('.', ',')}
        onChange={(e) => {
          const n = Number(e.target.value.replace(',', '.'));
          aoMudar({ ...regra, limiteDescontoPct: Number.isFinite(n) ? n : 0 });
        }}
      />

      <button
        type="button"
        onClick={aoRemover}
        aria-label="Remover linha"
        title="Remover"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--hb-erro)',
          cursor: 'pointer',
          fontSize: 18,
          minHeight: 40,
          borderRadius: 8,
        }}
      >
        ✕
      </button>
    </div>
  );
}
