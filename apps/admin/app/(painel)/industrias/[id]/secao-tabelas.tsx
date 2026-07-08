'use client';

import { TabelaPrecoSchema, TEORES } from '@gestao-hb/core';
import { StatusChip } from '@gestao-hb/ui';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { CampoSelect, CampoTexto, Interruptor } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { useSnackbar } from '../../../../lib/snackbar';

interface Tabela {
  id: string;
  nome: string;
  ordem: number;
  teor?: number;
  ativo: boolean;
}

/** Tabelas de preço da indústria — até 4 (especificação §2.1). */
export function SecaoTabelas({ industriaId }: { industriaId: string }) {
  const avisar = useSnackbar();
  const [tabelas, setTabelas] = useState<Tabela[] | null>(null);
  const [editando, setEditando] = useState<Tabela | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    return onSnapshot(
      query(collection(fb().db, 'industrias', industriaId, 'tabelasPreco'), orderBy('ordem')),
      (foto) => setTabelas(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tabela, 'id'>) }))),
    );
  }, [industriaId]);

  async function salvar() {
    if (!editando) return;
    const analise = TabelaPrecoSchema.safeParse({
      nome: editando.nome,
      ordem: editando.ordem,
      teor: editando.teor,
      ativo: editando.ativo,
    });
    if (!analise.success) {
      avisar(analise.error.issues[0]?.message ?? 'Dados inválidos.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      const nova = !editando.id;
      const id = editando.id || editando.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
      const dados = JSON.parse(JSON.stringify(analise.data)) as Record<string, unknown>;
      await setDoc(doc(fb().db, 'industrias', industriaId, 'tabelasPreco', id), dados, { merge: true });
      await auditar(nova ? 'tabela_preco_criada' : 'tabela_preco_editada', 'tabelaPreco', `${industriaId}/${id}`, null, dados);
      avisar('Tabela salva.', 'sucesso');
      setEditando(null);
    } catch {
      avisar('Não foi possível salvar a tabela.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className={estilos.card}>
      <div className={estilos.cabecalho} style={{ marginBottom: 8 }}>
        <div>
          <h2 className={estilos.cardTitulo}>Tabelas de preço</h2>
          <p className={estilos.cardDescricao} style={{ margin: 0 }}>
            Até 4 por indústria — segmentam canal e teor (ex.: VENDAS - 900).
          </p>
        </div>
        {tabelas && tabelas.length < 4 && !editando && (
          <button
            className={estilos.botaoSecundario}
            onClick={() => setEditando({ id: '', nome: '', ordem: (tabelas[tabelas.length - 1]?.ordem ?? 0) + 1, ativo: true })}
          >
            + Nova tabela
          </button>
        )}
      </div>

      {!tabelas ? (
        <div className={estilos.esqueleto} />
      ) : tabelas.length === 0 && !editando ? (
        <div className={estilos.vazio} style={{ padding: '24px 0' }}>
          <strong>Nenhuma tabela ainda</strong>
          Crie a primeira tabela de preço desta indústria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tabelas.map((t) => (
            <button
              key={t.id}
              onClick={() => setEditando(t)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: '#f7fafd',
                border: '1px solid var(--hb-borda)',
                borderRadius: 10,
                font: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>#{t.ordem}</span>
              <strong style={{ flex: 1 }}>{t.nome}</strong>
              {t.teor && <StatusChip tom="neutro">{`Teor ${t.teor}`}</StatusChip>}
              <StatusChip tom={t.ativo ? 'sucesso' : 'erro'}>{t.ativo ? 'Ativa' : 'Inativa'}</StatusChip>
            </button>
          ))}
        </div>
      )}

      {editando && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hb-borda)' }}>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Nome *" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} placeholder="ex.: VENDAS - 900" />
            <CampoTexto rotulo="Ordem (1–4)" type="number" min={1} max={4} value={String(editando.ordem)} onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })} />
            <CampoSelect
              rotulo="Teor de prata"
              value={editando.teor ? String(editando.teor) : ''}
              onChange={(e) => {
                const { teor: _descartado, ...resto } = editando;
                setEditando(e.target.value ? { ...resto, teor: Number(e.target.value) } : resto);
              }}
            >
              <option value="">Sem teor</option>
              {TEORES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CampoSelect>
            <div className={estilos.campo} style={{ justifyContent: 'end' }}>
              <Interruptor rotulo="Ativa" checked={editando.ativo} onChange={(v) => setEditando({ ...editando, ativo: v })} />
            </div>
          </div>
          <div className={estilos.acoesForm}>
            <button className={estilos.botaoSecundario} onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className={estilos.botaoPrimario} disabled={salvando} onClick={() => void salvar()}>
              {salvando && <span className={estilos.girador} aria-hidden />}
              Salvar tabela
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
