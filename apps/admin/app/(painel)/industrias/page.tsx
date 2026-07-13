'use client';

import { StatusChip } from '@gestao-hb/ui';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import estilos from '../../../components/ui.module.css';
import { linhaClicavel } from '../../../lib/a11y';
import { fb } from '../../../lib/firebase';

interface LinhaIndustria {
  id: string;
  nome: string;
  logica?: boolean;
  regimeComissao: 'mensalFixo' | 'posRecebimento';
  diaPagtoComissao?: number;
  modeloPreco: 'porGrama' | 'tabelado';
  pctComissaoEscritorio?: number;
  ativo: boolean;
}

export default function PaginaIndustrias() {
  const router = useRouter();
  const [industrias, setIndustrias] = useState<LinhaIndustria[] | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'industrias'), orderBy('nome')), (foto) => {
      setIndustrias(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaIndustria, 'id'>) })));
    });
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!industrias) return null;
    return termo ? industrias.filter((i) => i.nome.toLowerCase().includes(termo)) : industrias;
  }, [industrias, busca]);

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Indústrias</h1>
          <p className={estilos.subtitulo}>
            Representadas, regimes de comissão e modelo de preço de cada catálogo.
          </p>
        </div>
        <Link href="/industrias/nova" className={estilos.botaoPrimario}>
          + Nova indústria
        </Link>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          className={estilos.busca}
          placeholder="Buscar por nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar indústria"
        />
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
            <strong>{busca ? 'Nenhuma indústria encontrada' : 'Nenhuma indústria cadastrada'}</strong>
            {busca ? 'Tente outro termo de busca.' : 'Comece cadastrando a primeira representada.'}
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Indústria</th>
                <th>Regime de comissão</th>
                <th>Preço</th>
                <th>% escritório</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((i) => (
                <tr key={i.id} {...linhaClicavel(() => router.push(`/industrias/${i.id}`))}>
                  <td data-rotulo="Indústria">
                    <strong>{i.nome}</strong>
                    {i.logica && (
                      <span style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>
                        {' '}
                        · catálogo
                      </span>
                    )}
                  </td>
                  <td data-rotulo="Regime">
                    <StatusChip tom={i.regimeComissao === 'mensalFixo' ? 'info' : 'neutro'}>
                      {i.regimeComissao === 'mensalFixo'
                        ? `Mensal fixo · dia ${i.diaPagtoComissao ?? 15}`
                        : 'Pós-recebimento'}
                    </StatusChip>
                  </td>
                  <td data-rotulo="Preço">
                    <StatusChip tom={i.modeloPreco === 'porGrama' ? 'atencao' : 'neutro'}>
                      {i.modeloPreco === 'porGrama' ? 'Por grama' : 'Tabelado'}
                    </StatusChip>
                  </td>
                  <td data-rotulo="% escritório">
                    {i.pctComissaoEscritorio ? `${i.pctComissaoEscritorio}%` : '—'}
                  </td>
                  <td data-rotulo="Status">
                    <StatusChip tom={i.ativo ? 'sucesso' : 'erro'}>{i.ativo ? 'Ativa' : 'Inativa'}</StatusChip>
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
