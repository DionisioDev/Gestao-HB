'use client';

import type { RegraVendedorEntrada } from '@gestao-hb/core';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { fb } from './firebase';
import { useIndustrias } from './industrias';

/** Nome das tabelas por indústria: { industriaId: { tabelaId: nome } }. */
export type MapaTabelas = Record<string, Record<string, string>>;

/** Resumo por indústria para os chips da listagem (Anexo A.2.5). */
export interface ResumoLiberacao {
  industria: string;
  tabelas: string;
}

/**
 * Carrega os nomes das tabelas de preço de todas as indústrias.
 * São ~11 indústrias × até 4 tabelas — barato o bastante para manter reativo.
 */
export function useMapaTabelas(): MapaTabelas {
  const industrias = useIndustrias();
  const [mapa, setMapa] = useState<MapaTabelas>({});

  useEffect(() => {
    if (!industrias) return;
    const cancelar = industrias.map((ind) =>
      onSnapshot(query(collection(fb().db, 'industrias', ind.id, 'tabelasPreco')), (foto) => {
        const tabelas: Record<string, string> = {};
        foto.docs.forEach((d) => (tabelas[d.id] = (d.data()['nome'] as string) ?? d.id));
        setMapa((atual) => ({ ...atual, [ind.id]: tabelas }));
      }),
    );
    return () => cancelar.forEach((c) => c());
  }, [industrias]);

  return mapa;
}

/**
 * Traduz a matriz do vendedor em "Spart: B, C" por indústria (Anexo A.2.5).
 * `tabelaId === '*'` significa todas as tabelas daquela indústria.
 */
export function resumirLiberacoes(
  regras: RegraVendedorEntrada[] | undefined,
  nomesIndustrias: Record<string, string>,
  mapaTabelas: MapaTabelas,
): ResumoLiberacao[] {
  if (!regras?.length) return [];

  const porIndustria = new Map<string, string[]>();
  for (const regra of regras) {
    const nomes = porIndustria.get(regra.industriaId) ?? [];
    nomes.push(
      regra.tabelaId === '*'
        ? 'todas'
        : (mapaTabelas[regra.industriaId]?.[regra.tabelaId] ?? regra.tabelaId),
    );
    porIndustria.set(regra.industriaId, nomes);
  }

  return [...porIndustria.entries()].map(([industriaId, tabelas]) => ({
    industria: nomesIndustrias[industriaId] ?? industriaId,
    // "todas" absorve as demais: liberar tudo torna a lista individual redundante
    tabelas: tabelas.includes('todas') ? 'todas' : [...new Set(tabelas)].join(', '),
  }));
}

/** "há 3 dias", "ontem", "hoje às 14:32" — leitura rápida na listagem. */
export function formatarUltimaSessao(data: Date | null): string {
  if (!data) return 'Nunca acessou';

  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dias = Math.round((inicioHoje.getTime() - inicioData.getTime()) / 86_400_000);

  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dias <= 0) return `Hoje às ${hora}`;
  if (dias === 1) return `Ontem às ${hora}`;
  if (dias < 30) return `Há ${dias} dias`;
  return data.toLocaleDateString('pt-BR');
}
