'use client';

import { PrecoProdutoSchema, precoPorGrama } from '@gestao-hb/core';
import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { useSnackbar } from '../../../../lib/snackbar';

interface TabelaRef {
  id: string;
  nome: string;
  ordem: number;
  teor?: number;
  ativo: boolean;
}

/** Matriz de preços produto × tabela: editável no tabelado, calculada no por-grama (ADR-005). */
export function SecaoPrecos({
  produtoId,
  industriaId,
  modeloPreco,
  pesoMg,
}: {
  produtoId: string;
  industriaId: string;
  modeloPreco: 'porGrama' | 'tabelado';
  pesoMg: number | undefined;
}) {
  const avisar = useSnackbar();
  const [tabelas, setTabelas] = useState<TabelaRef[] | null>(null);
  const [precos, setPrecos] = useState<Record<string, number>>({});
  const [gramaVigente, setGramaVigente] = useState<Record<string, number>>({});
  const [edicao, setEdicao] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(fb().db, 'industrias', industriaId, 'tabelasPreco'), orderBy('ordem')),
      (foto) => setTabelas(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TabelaRef, 'id'>) }))),
    );
  }, [industriaId]);

  useEffect(() => {
    return onSnapshot(collection(fb().db, 'produtos', produtoId, 'precos'), (foto) => {
      const mapa: Record<string, number> = {};
      foto.docs.forEach((d) => (mapa[d.id] = (d.data()['precoCentavos'] as number) ?? 0));
      setPrecos(mapa);
    });
  }, [produtoId]);

  useEffect(() => {
    if (modeloPreco !== 'porGrama') return;
    void getDocs(
      query(
        collection(fb().db, 'valoresGrama'),
        where('industriaId', '==', industriaId),
        orderBy('vigenciaInicio', 'desc'),
      ),
    ).then((foto) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const mapa: Record<string, number> = {};
      foto.docs.forEach((d) => {
        const dados = d.data();
        const tabelaId = dados['tabelaId'] as string;
        const vigencia = dados['vigenciaInicio'] as string;
        if (!(tabelaId in mapa) && vigencia <= hoje) mapa[tabelaId] = dados['valorCentavos'] as number;
      });
      setGramaVigente(mapa);
    });
  }, [industriaId, modeloPreco]);

  async function salvarPreco(tabelaId: string) {
    const texto = edicao[tabelaId] ?? '';
    const centavos = Math.round(Number(texto.replace(/\./g, '').replace(',', '.')) * 100);
    const analise = PrecoProdutoSchema.safeParse({ industriaId, tabelaId, precoCentavos: centavos });
    if (!analise.success || !Number.isFinite(centavos)) {
      avisar('Informe um preço válido, ex.: 24,57.', 'erro');
      return;
    }
    setSalvando(tabelaId);
    try {
      await setDoc(doc(fb().db, 'produtos', produtoId, 'precos', tabelaId), {
        ...analise.data,
        atualizadoEm: new Date().toISOString(),
      });
      await auditar('preco_produto_definido', 'precoProduto', `${produtoId}/${tabelaId}`, precos[tabelaId] != null ? { precoCentavos: precos[tabelaId] } : null, analise.data as unknown as Record<string, unknown>);
      avisar('Preço salvo.', 'sucesso');
      setEdicao((e) => {
        const { [tabelaId]: _fora, ...resto } = e;
        return resto;
      });
    } catch {
      avisar('Não foi possível salvar o preço.', 'erro');
    } finally {
      setSalvando(null);
    }
  }

  if (!tabelas) return <div className={estilos.esqueleto} />;
  if (tabelas.length === 0) {
    return (
      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Preços por tabela</h2>
        <p className={estilos.cardDescricao} style={{ margin: 0 }}>
          Esta indústria ainda não tem tabelas de preço — cadastre-as na tela da indústria.
        </p>
      </section>
    );
  }

  return (
    <section className={estilos.card}>
      <h2 className={estilos.cardTitulo}>Preços por tabela</h2>
      <p className={estilos.cardDescricao}>
        {modeloPreco === 'porGrama'
          ? 'Calculados automaticamente: peso × valor do grama vigente da tabela.'
          : 'Preço fixo definido pela indústria em cada tabela.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tabelas.map((t) => {
          const calculado =
            modeloPreco === 'porGrama' && pesoMg && gramaVigente[t.id]
              ? precoPorGrama(pesoMg, gramaVigente[t.id]!)
              : null;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: '#f7fafd',
                border: '1px solid var(--hb-borda)',
                borderRadius: 10,
                flexWrap: 'wrap',
              }}
            >
              <strong style={{ minWidth: 150 }}>{t.nome}</strong>
              {t.teor && <StatusChip tom="neutro">{`Teor ${t.teor}`}</StatusChip>}

              {modeloPreco === 'porGrama' ? (
                <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                  {calculado != null ? (
                    <>
                      {formatarCentavos(calculado)}{' '}
                      <span style={{ color: 'var(--hb-texto-suave)', fontWeight: 400, fontSize: 'var(--hb-legenda)' }}>
                        ({formatarCentavos(gramaVigente[t.id]!)}/g)
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--hb-atencao)', fontSize: 'var(--hb-corpo-sm)' }}>
                      {pesoMg ? 'sem valor do grama vigente' : 'informe o peso do produto'}
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className={estilos.entrada}
                    style={{ width: 130, textAlign: 'right' }}
                    inputMode="decimal"
                    placeholder={precos[t.id] != null ? formatarCentavos(precos[t.id]!).replace('R$', '').trim() : '0,00'}
                    value={edicao[t.id] ?? ''}
                    onChange={(e) => setEdicao((ed) => ({ ...ed, [t.id]: e.target.value }))}
                    aria-label={`Preço na tabela ${t.nome}`}
                  />
                  <button
                    className={estilos.botaoSecundario}
                    style={{ minHeight: 40, padding: '0 14px' }}
                    disabled={salvando === t.id || !(edicao[t.id] ?? '').trim()}
                    onClick={() => void salvarPreco(t.id)}
                  >
                    {salvando === t.id ? '…' : 'Salvar'}
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
