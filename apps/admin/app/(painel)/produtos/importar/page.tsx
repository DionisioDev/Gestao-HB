'use client';

import { ProdutoSchema } from '@gestao-hb/core';
import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import { collection, doc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { CampoSelect } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { slugId, useIndustrias } from '../../../../lib/industrias';
import { useSnackbar } from '../../../../lib/snackbar';

interface LinhaPlanilha {
  numero: number;
  sku: string;
  nome: string;
  pesoMg?: number;
  teor?: number;
  categoria?: string;
  precoCentavos?: number;
  erro?: string;
}

interface TabelaRef {
  id: string;
  nome: string;
}

const CABECALHOS: Record<string, keyof LinhaPlanilha | 'pesoG' | 'preco'> = {
  sku: 'sku',
  codigo: 'sku',
  'código': 'sku',
  nome: 'nome',
  descricao: 'nome',
  'descrição': 'nome',
  peso: 'pesoG',
  peso_g: 'pesoG',
  'peso (g)': 'pesoG',
  teor: 'teor',
  categoria: 'categoria',
  preco: 'preco',
  'preço': 'preco',
  valor: 'preco',
};

function analisarPlanilha(dados: ArrayBuffer): LinhaPlanilha[] {
  const pasta = XLSX.read(dados, { type: 'array' });
  const primeiraAba = pasta.Sheets[pasta.SheetNames[0] ?? ''];
  if (!primeiraAba) return [];
  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(primeiraAba, { defval: '' });

  return linhas.map((bruta, indice) => {
    const linha: LinhaPlanilha = { numero: indice + 2, sku: '', nome: '' };
    let pesoG: string | number = '';
    let preco: string | number = '';
    for (const [chave, valor] of Object.entries(bruta)) {
      const alvo = CABECALHOS[chave.trim().toLowerCase()];
      if (!alvo) continue;
      if (alvo === 'pesoG') pesoG = valor as string | number;
      else if (alvo === 'preco') preco = valor as string | number;
      else if (alvo === 'sku' || alvo === 'nome' || alvo === 'categoria') linha[alvo] = String(valor).trim();
      else if (alvo === 'teor') {
        const n = Number(String(valor).trim());
        if (Number.isFinite(n) && n > 0) linha.teor = n;
      }
    }
    if (pesoG !== '' && pesoG != null) {
      const n = Number(String(pesoG).replace(',', '.'));
      if (Number.isFinite(n) && n > 0) linha.pesoMg = Math.round(n * 1000);
    }
    if (preco !== '' && preco != null) {
      const n = Number(String(preco).replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) linha.precoCentavos = Math.round(n * 100);
    }
    if (!linha.sku) linha.erro = 'Sem código (SKU)';
    else if (!linha.nome) linha.erro = 'Sem nome';
    return linha;
  });
}

export default function PaginaImportar() {
  const router = useRouter();
  const avisar = useSnackbar();
  const industrias = useIndustrias();

  const [industriaId, setIndustriaId] = useState('');
  const [tabelaId, setTabelaId] = useState('');
  const [tabelas, setTabelas] = useState<TabelaRef[]>([]);
  const [linhas, setLinhas] = useState<LinhaPlanilha[] | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    setTabelaId('');
    if (!industriaId) {
      setTabelas([]);
      return;
    }
    return onSnapshot(
      query(collection(fb().db, 'industrias', industriaId, 'tabelasPreco'), orderBy('ordem')),
      (foto) => setTabelas(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id }))),
    );
  }, [industriaId]);

  const industria = industrias?.find((i) => i.id === industriaId);
  const validas = useMemo(() => (linhas ?? []).filter((l) => !l.erro), [linhas]);
  const invalidas = useMemo(() => (linhas ?? []).filter((l) => l.erro), [linhas]);
  const comPreco = useMemo(() => validas.filter((l) => l.precoCentavos), [validas]);

  async function aoEscolherArquivo(arquivo: File) {
    setNomeArquivo(arquivo.name);
    try {
      const conteudo = await arquivo.arrayBuffer();
      const resultado = analisarPlanilha(conteudo);
      if (resultado.length === 0) {
        avisar('A planilha está vazia ou sem colunas reconhecidas (sku, nome, peso, teor, categoria, preco).', 'erro');
        return;
      }
      setLinhas(resultado);
    } catch {
      avisar('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.', 'erro');
    }
  }

  async function importar() {
    if (!industriaId || validas.length === 0) return;
    if (industria?.modeloPreco === 'porGrama' && validas.some((l) => !l.pesoMg)) {
      avisar('Indústria por grama: todas as linhas precisam da coluna de peso.', 'erro');
      return;
    }
    if (comPreco.length > 0 && !tabelaId) {
      avisar('A planilha tem preços — escolha a tabela de destino.', 'erro');
      return;
    }
    setImportando(true);
    setProgresso(0);
    try {
      const LOTE = 200; // 200 linhas × (produto + preço) ≤ limite de 500 escritas do batch
      for (let i = 0; i < validas.length; i += LOTE) {
        const fatia = validas.slice(i, i + LOTE);
        const lote = writeBatch(fb().db);
        for (const linha of fatia) {
          const dados = ProdutoSchema.parse({
            industriaId,
            sku: linha.sku.toUpperCase(),
            nome: linha.nome,
            pesoMg: linha.pesoMg,
            teor: linha.teor,
            categoria: linha.categoria || undefined,
            ativo: true,
          });
          const idProduto = `${industriaId}__${slugId(dados.sku)}`;
          lote.set(
            doc(fb().db, 'produtos', idProduto),
            JSON.parse(JSON.stringify({ ...dados, atualizadoEm: new Date().toISOString() })),
            { merge: true },
          );
          if (linha.precoCentavos && tabelaId) {
            lote.set(doc(fb().db, 'produtos', idProduto, 'precos', tabelaId), {
              industriaId,
              tabelaId,
              precoCentavos: linha.precoCentavos,
              atualizadoEm: new Date().toISOString(),
            });
          }
        }
        await lote.commit();
        setProgresso(Math.min(i + LOTE, validas.length));
      }
      await auditar('produtos_importados', 'produto', industriaId, null, {
        arquivo: nomeArquivo,
        total: validas.length,
        comPreco: comPreco.length,
        tabelaId: tabelaId || null,
        linhasComErro: invalidas.length,
      });
      avisar(`Importação concluída: ${validas.length} produtos${comPreco.length ? ` (${comPreco.length} com preço)` : ''}.`, 'sucesso');
      router.push('/produtos');
    } catch {
      avisar('Falha durante a importação. Nada além dos lotes já confirmados foi gravado — tente de novo.', 'erro');
    } finally {
      setImportando(false);
    }
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Importar produtos</h1>
          <p className={estilos.subtitulo}>
            Planilha .xlsx/.csv com colunas: <code>sku, nome, peso (g), teor, categoria, preco</code> — é o caminho da
            migração do sistema atual.
          </p>
        </div>
      </div>

      <section className={estilos.card}>
        <div className={estilos.grade}>
          <CampoSelect rotulo="Indústria de destino *" value={industriaId} onChange={(e) => setIndustriaId(e.target.value)}>
            <option value="">Escolha…</option>
            {(industrias ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </CampoSelect>
          <CampoSelect rotulo="Tabela de preço (se a planilha tiver preços)" value={tabelaId} onChange={(e) => setTabelaId(e.target.value)} disabled={!industriaId}>
            <option value="">Sem preços / escolher…</option>
            {tabelas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </CampoSelect>
          <div className={`${estilos.campo} ${estilos.campoLargo}`}>
            <span className={estilos.rotulo}>Arquivo *</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className={estilos.entrada}
              style={{ paddingTop: 9 }}
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void aoEscolherArquivo(arquivo);
              }}
            />
          </div>
        </div>
      </section>

      {linhas && (
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Pré-visualização — {nomeArquivo}</h2>
          <p className={estilos.cardDescricao}>
            <StatusChip tom="sucesso">{`${validas.length} válidas`}</StatusChip>{' '}
            {invalidas.length > 0 && <StatusChip tom="erro">{`${invalidas.length} com erro`}</StatusChip>}{' '}
            {comPreco.length > 0 && <StatusChip tom="info">{`${comPreco.length} com preço`}</StatusChip>}
          </p>

          {invalidas.length > 0 && (
            <div style={{ background: 'var(--hb-erro-bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 'var(--hb-corpo-sm)' }}>
              <strong>Linhas ignoradas:</strong>{' '}
              {invalidas.slice(0, 8).map((l) => `linha ${l.numero} (${l.erro})`).join(' · ')}
              {invalidas.length > 8 && ` · +${invalidas.length - 8} outras`}
            </div>
          )}

          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Peso (g)</th>
                <th>Teor</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {validas.slice(0, 8).map((l) => (
                <tr key={l.numero} style={{ cursor: 'default' }}>
                  <td data-rotulo="SKU"><strong>{l.sku}</strong></td>
                  <td data-rotulo="Nome">{l.nome}</td>
                  <td data-rotulo="Peso">{l.pesoMg ? (l.pesoMg / 1000).toFixed(3).replace('.', ',') : '—'}</td>
                  <td data-rotulo="Teor">{l.teor ?? '—'}</td>
                  <td data-rotulo="Preço">{l.precoCentavos ? formatarCentavos(l.precoCentavos) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {validas.length > 8 && (
            <p style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)', margin: '10px 0 0' }}>
              Mostrando 8 de {validas.length} linhas válidas.
            </p>
          )}

          <div className={estilos.acoesForm}>
            <button className={estilos.botaoSecundario} onClick={() => router.push('/produtos')} disabled={importando}>
              Cancelar
            </button>
            <button className={estilos.botaoPrimario} disabled={importando || !industriaId || validas.length === 0} onClick={() => void importar()}>
              {importando && <span className={estilos.girador} aria-hidden />}
              {importando ? `Importando… ${progresso}/${validas.length}` : `Importar ${validas.length} produtos`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
