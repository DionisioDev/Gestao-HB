'use client';

import { ValorGramaSchema } from '@gestao-hb/core';
import { formatarCentavos } from '@gestao-hb/ui';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { CampoSelect, CampoTexto } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { useSnackbar } from '../../../../lib/snackbar';

interface RegistroGrama {
  id: string;
  tabelaId: string;
  teor?: number;
  valorCentavos: number;
  vigenciaInicio: string;
}

interface TabelaRef {
  id: string;
  nome: string;
  teor?: number;
}

/** Histórico do valor do grama — append-only, com vigência (ADR-006, regras-negocio §1.2). */
export function SecaoGrama({ industriaId }: { industriaId: string }) {
  const avisar = useSnackbar();
  const [tabelas, setTabelas] = useState<TabelaRef[]>([]);
  const [historico, setHistorico] = useState<RegistroGrama[] | null>(null);
  const [tabelaId, setTabelaId] = useState('');
  const [valor, setValor] = useState('');
  const [vigencia, setVigencia] = useState(new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(fb().db, 'industrias', industriaId, 'tabelasPreco'), (foto) =>
      setTabelas(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TabelaRef, 'id'>) }))),
    );
  }, [industriaId]);

  useEffect(() => {
    return onSnapshot(
      query(
        collection(fb().db, 'valoresGrama'),
        where('industriaId', '==', industriaId),
        orderBy('vigenciaInicio', 'desc'),
      ),
      (foto) => setHistorico(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RegistroGrama, 'id'>) }))),
    );
  }, [industriaId]);

  async function registrar() {
    const usuario = fb().auth.currentUser;
    const tabela = tabelas.find((t) => t.id === tabelaId);
    const centavos = Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100);
    const analise = ValorGramaSchema.safeParse({
      industriaId,
      tabelaId,
      teor: tabela?.teor,
      valorCentavos: centavos,
      vigenciaInicio: vigencia,
      criadoPor: usuario?.uid ?? '',
    });
    if (!tabela) {
      avisar('Escolha a tabela de preço.', 'erro');
      return;
    }
    if (!analise.success || !Number.isFinite(centavos)) {
      avisar('Informe um valor válido, ex.: 46,04.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      const dados = JSON.parse(JSON.stringify(analise.data)) as Record<string, unknown>;
      dados['criadoEm'] = serverTimestamp();
      const ref = await addDoc(collection(fb().db, 'valoresGrama'), dados);
      await auditar('valor_grama_registrado', 'valorGrama', ref.id, null, dados);
      avisar(`Valor do grama registrado: ${formatarCentavos(centavos)} a partir de ${vigencia.split('-').reverse().join('/')}.`, 'sucesso');
      setValor('');
    } catch {
      avisar('Não foi possível registrar o valor.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  const nomeTabela = (id: string) => tabelas.find((t) => t.id === id)?.nome ?? id;

  return (
    <section className={estilos.card}>
      <h2 className={estilos.cardTitulo}>Valor do grama</h2>
      <p className={estilos.cardDescricao}>
        Histórico com vigência — registros nunca são editados ou apagados; pedidos congelam o valor
        vigente na emissão.
      </p>

      <div className={estilos.grade} style={{ marginBottom: 16 }}>
        <CampoSelect rotulo="Tabela de preço *" value={tabelaId} onChange={(e) => setTabelaId(e.target.value)}>
          <option value="">Escolha…</option>
          {tabelas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
              {t.teor ? ` (teor ${t.teor})` : ''}
            </option>
          ))}
        </CampoSelect>
        <CampoTexto rotulo="Valor do grama (R$) *" inputMode="decimal" placeholder="46,04" value={valor} onChange={(e) => setValor(e.target.value)} />
        <CampoTexto rotulo="Vigente a partir de *" type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
        <div className={estilos.campo} style={{ justifyContent: 'end' }}>
          <button className={estilos.botaoPrimario} disabled={salvando} onClick={() => void registrar()}>
            {salvando && <span className={estilos.girador} aria-hidden />}
            Registrar novo valor
          </button>
        </div>
      </div>

      {!historico ? (
        <div className={estilos.esqueleto} />
      ) : historico.length === 0 ? (
        <p style={{ color: 'var(--hb-texto-suave)', margin: 0 }}>
          Nenhum valor registrado ainda — os preços por grama desta indústria dependem disso.
        </p>
      ) : (
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Vigência</th>
              <th>Tabela</th>
              <th>Valor do grama</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((h, i) => (
              <tr key={h.id} style={{ cursor: 'default', opacity: i === 0 ? 1 : 0.75 }}>
                <td data-rotulo="Vigência">{h.vigenciaInicio.split('-').reverse().join('/')}</td>
                <td data-rotulo="Tabela">{nomeTabela(h.tabelaId)}{h.teor ? ` · teor ${h.teor}` : ''}</td>
                <td data-rotulo="Valor">
                  <strong>{formatarCentavos(h.valorCentavos)}</strong>
                  {i === 0 && <span style={{ color: 'var(--hb-sucesso)', marginLeft: 8, fontSize: 'var(--hb-legenda)' }}>vigente</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
