'use client';

import { formatarPesoMg } from '@gestao-hb/ui';
import { StatusChip } from '@gestao-hb/ui';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import estilos from '../../../components/ui.module.css';
import { fb } from '../../../lib/firebase';
import { useIndustrias } from '../../../lib/industrias';

const PAGINA = 50;

interface LinhaProduto {
  id: string;
  sku: string;
  nome: string;
  industriaId: string;
  pesoMg?: number;
  categoria?: string;
  ativo: boolean;
}

export default function PaginaProdutos() {
  const router = useRouter();
  const industrias = useIndustrias();
  const [industriaId, setIndustriaId] = useState('');
  const [busca, setBusca] = useState('');
  const [linhas, setLinhas] = useState<LinhaProduto[] | null>(null);
  const [ultimo, setUltimo] = useState<QueryDocumentSnapshot | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregar = useCallback(
    async (aposDoc: QueryDocumentSnapshot | null) => {
      const termo = busca.trim().toUpperCase();
      const filtros: QueryConstraint[] = [];
      if (industriaId) filtros.push(where('industriaId', '==', industriaId));
      filtros.push(orderBy('sku'));
      if (termo) filtros.push(where('sku', '>=', termo), where('sku', '<=', termo + ''));
      if (aposDoc) filtros.push(startAfter(aposDoc));
      filtros.push(limit(PAGINA));
      const foto = await getDocs(query(collection(fb().db, 'produtos'), ...filtros));
      const novas = foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaProduto, 'id'>) }));
      setLinhas((atuais) => (aposDoc && atuais ? [...atuais, ...novas] : novas));
      setUltimo(foto.docs[foto.docs.length - 1] ?? null);
      setTemMais(foto.docs.length === PAGINA);
    },
    [industriaId, busca],
  );

  useEffect(() => {
    setLinhas(null);
    const timer = setTimeout(() => void carregar(null), busca ? 350 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

  const nomeIndustria = (id: string) => industrias?.find((i) => i.id === id)?.nome ?? id;

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Produtos</h1>
          <p className={estilos.subtitulo}>Catálogo por indústria, com preços por tabela.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/produtos/importar" className={estilos.botaoSecundario}>
            Importar planilha
          </Link>
          <Link href="/produtos/novo" className={estilos.botaoPrimario}>
            + Novo produto
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select
          className={estilos.entrada}
          style={{ maxWidth: 260 }}
          value={industriaId}
          onChange={(e) => setIndustriaId(e.target.value)}
          aria-label="Filtrar por indústria"
        >
          <option value="">Todas as indústrias</option>
          {(industrias ?? []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
        <input
          className={estilos.busca}
          placeholder="Buscar por código (SKU)…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar produto por SKU"
        />
      </div>

      <div className={estilos.tabelaEnvoltorio}>
        {!linhas ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : linhas.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>{busca || industriaId ? 'Nenhum produto encontrado' : 'Catálogo vazio'}</strong>
            {busca || industriaId
              ? 'Ajuste os filtros ou importe a planilha da indústria.'
              : 'Importe a planilha de uma indústria ou cadastre o primeiro produto.'}
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Indústria</th>
                <th>Peso</th>
                <th>Categoria</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/produtos/${p.id}`)}>
                  <td data-rotulo="SKU">
                    <strong>{p.sku}</strong>
                  </td>
                  <td data-rotulo="Nome">{p.nome}</td>
                  <td data-rotulo="Indústria">{nomeIndustria(p.industriaId)}</td>
                  <td data-rotulo="Peso">{p.pesoMg ? formatarPesoMg(p.pesoMg) : '—'}</td>
                  <td data-rotulo="Categoria">{p.categoria ?? '—'}</td>
                  <td data-rotulo="Status">
                    <StatusChip tom={p.ativo ? 'sucesso' : 'erro'}>{p.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {temMais && linhas && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <button
            className={estilos.botaoSecundario}
            disabled={carregandoMais}
            onClick={async () => {
              setCarregandoMais(true);
              await carregar(ultimo);
              setCarregandoMais(false);
            }}
          >
            {carregandoMais ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
}
