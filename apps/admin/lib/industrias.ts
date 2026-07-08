'use client';

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { fb } from './firebase';

export interface IndustriaResumo {
  id: string;
  nome: string;
  modeloPreco: 'porGrama' | 'tabelado';
  ativo: boolean;
}

/** Lista reativa de indústrias (para selects e filtros). */
export function useIndustrias(): IndustriaResumo[] | null {
  const [industrias, setIndustrias] = useState<IndustriaResumo[] | null>(null);
  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'industrias'), orderBy('nome')), (foto) =>
      setIndustrias(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IndustriaResumo, 'id'>) }))),
    );
  }, []);
  return industrias;
}

export function slugId(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
