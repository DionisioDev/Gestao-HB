'use client';

import { StatusChip } from '@gestao-hb/ui';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import estilos from '../../../components/ui.module.css';
import { fb } from '../../../lib/firebase';
import { useIndustrias } from '../../../lib/industrias';

interface LinhaVendedor {
  id: string;
  nome: string;
  email?: string;
  regras?: Array<{ industriaId: string; tabelaId: string; comissaoProporcionalPct: number }>;
  ativo: boolean;
}

export default function PaginaVendedores() {
  const router = useRouter();
  const industrias = useIndustrias();
  const [vendedores, setVendedores] = useState<LinhaVendedor[] | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'vendedores'), orderBy('nome')), (foto) =>
      setVendedores(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaVendedor, 'id'>) }))),
    );
  }, []);

  const nomeIndustria = (id: string) => industrias?.find((i) => i.id === id)?.nome ?? id;

  const resumoRegras = (v: LinhaVendedor) => {
    const porIndustria = new Map<string, string[]>();
    for (const r of v.regras ?? []) {
      const lista = porIndustria.get(r.industriaId) ?? [];
      lista.push(r.tabelaId === '*' ? 'todas' : r.tabelaId);
      porIndustria.set(r.industriaId, lista);
    }
    return [...porIndustria.entries()].slice(0, 3).map(([ind, tabs]) => `${nomeIndustria(ind)}: ${tabs.join(', ')}`);
  };

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Vendedores</h1>
          <p className={estilos.subtitulo}>
            A matriz indústria × tabela define a comissão proporcional e o que cada vendedor enxerga.
          </p>
        </div>
        <Link href="/vendedores/novo" className={estilos.botaoPrimario}>
          + Novo vendedor
        </Link>
      </div>

      <div className={estilos.tabelaEnvoltorio}>
        {!vendedores ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : vendedores.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>Nenhum vendedor cadastrado</strong>
            Cadastre o primeiro vendedor e defina as tabelas que ele atenderá.
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Indústrias / tabelas liberadas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id} onClick={() => router.push(`/vendedores/${v.id}`)}>
                  <td data-rotulo="Vendedor">
                    <strong>{v.nome}</strong>
                    {v.email && (
                      <div style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>{v.email}</div>
                    )}
                  </td>
                  <td data-rotulo="Tabelas">
                    {(v.regras?.length ?? 0) === 0 ? (
                      <StatusChip tom="atencao">Sem tabelas liberadas</StatusChip>
                    ) : (
                      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                        {resumoRegras(v).map((r) => (
                          <StatusChip key={r} tom="neutro">
                            {r}
                          </StatusChip>
                        ))}
                        {new Set((v.regras ?? []).map((r) => r.industriaId)).size > 3 && (
                          <StatusChip tom="neutro">…</StatusChip>
                        )}
                      </span>
                    )}
                  </td>
                  <td data-rotulo="Status">
                    <StatusChip tom={v.ativo ? 'sucesso' : 'erro'}>{v.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
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
