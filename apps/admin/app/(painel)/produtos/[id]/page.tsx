'use client';

import { ProdutoSchema, TEORES, type Produto } from '@gestao-hb/core';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { CampoArea, CampoSelect, CampoTexto, Interruptor } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar, limparIndefinidos } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { slugId, useIndustrias } from '../../../../lib/industrias';
import { useSnackbar } from '../../../../lib/snackbar';
import { SecaoPrecos } from './secao-precos';

type Formulario = {
  industriaId: string;
  sku: string;
  nome: string;
  descricao: string;
  pesoG: string;
  teor: string;
  categoria: string;
  codigoOriginal: string;
  referencia: string;
  referenciaAgrupamento: string;
  ean: string;
  ativo: boolean;
};

const VAZIO: Formulario = {
  industriaId: '',
  sku: '',
  nome: '',
  descricao: '',
  pesoG: '',
  teor: '',
  categoria: '',
  codigoOriginal: '',
  referencia: '',
  referenciaAgrupamento: '',
  ean: '',
  ativo: true,
};

export default function PaginaProduto() {
  const { id } = useParams<{ id: string }>();
  const novo = id === 'novo';
  const router = useRouter();
  const avisar = useSnackbar();
  const industrias = useIndustrias();

  const [form, setForm] = useState<Formulario | null>(novo ? VAZIO : null);
  const [anterior, setAnterior] = useState<Record<string, unknown> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (novo) return;
    void getDoc(doc(fb().db, 'produtos', id)).then((foto) => {
      if (!foto.exists()) {
        avisar('Produto não encontrado.', 'erro');
        router.replace('/produtos');
        return;
      }
      const d = foto.data();
      setAnterior(d);
      const s = (v: unknown) => (v == null ? '' : String(v));
      setForm({
        industriaId: s(d['industriaId']),
        sku: s(d['sku']),
        nome: s(d['nome']),
        descricao: s(d['descricao']),
        pesoG: d['pesoMg'] ? String((d['pesoMg'] as number) / 1000).replace('.', ',') : '',
        teor: d['teor'] ? String(d['teor']) : '',
        categoria: s(d['categoria']),
        codigoOriginal: s(d['codigoOriginal']),
        referencia: s(d['referencia']),
        referenciaAgrupamento: s(d['referenciaAgrupamento']),
        ean: s(d['ean']),
        ativo: d['ativo'] !== false,
      });
    });
  }, [id, novo, router, avisar]);

  if (!form) {
    return (
      <div aria-busy="true">
        <div className={estilos.esqueleto} />
        <div className={estilos.esqueleto} />
      </div>
    );
  }

  const industria = industrias?.find((i) => i.id === form.industriaId);
  const porGrama = industria?.modeloPreco === 'porGrama';

  const definir = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) =>
    setForm((f) => (f ? { ...f, [chave]: valor } : f));

  async function aoSalvar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErros({});

    const pesoMg = form.pesoG.trim() ? Math.round(Number(form.pesoG.replace(',', '.')) * 1000) : undefined;
    if (porGrama && (!pesoMg || pesoMg <= 0)) {
      setErros({ pesoG: 'Peso é obrigatório para indústria por grama' });
      avisar('Informe o peso em gramas.', 'erro');
      return;
    }

    let dados: Produto;
    try {
      dados = ProdutoSchema.parse({
        industriaId: form.industriaId,
        sku: form.sku.toUpperCase(),
        nome: form.nome,
        descricao: form.descricao || undefined,
        pesoMg,
        teor: form.teor ? Number(form.teor) : undefined,
        categoria: form.categoria || undefined,
        codigoOriginal: form.codigoOriginal || undefined,
        referencia: form.referencia || undefined,
        referenciaAgrupamento: form.referenciaAgrupamento || undefined,
        ean: form.ean || undefined,
        ativo: form.ativo,
      });
    } catch (excecao) {
      const zod = excecao as { issues?: Array<{ path: (string | number)[]; message: string }> };
      const mapa: Record<string, string> = {};
      for (const issue of zod.issues ?? []) mapa[String(issue.path[0] ?? '')] = issue.message;
      setErros(mapa);
      avisar('Confira os campos destacados.', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const idFinal = novo ? `${dados.industriaId}__${slugId(dados.sku)}` : id;
      const ref = doc(fb().db, 'produtos', idFinal);
      if (novo && (await getDoc(ref)).exists()) {
        avisar('Já existe um produto com esse SKU nesta indústria.', 'erro');
        return;
      }
      const documento = limparIndefinidos(dados as unknown as Record<string, unknown>);
      documento['atualizadoEm'] = serverTimestamp();
      if (novo) documento['criadoEm'] = serverTimestamp();
      await setDoc(ref, documento, { merge: true });
      await auditar(novo ? 'produto_criado' : 'produto_editado', 'produto', idFinal, anterior, limparIndefinidos(dados as unknown as Record<string, unknown>));
      avisar(novo ? 'Produto criado — defina os preços por tabela abaixo.' : 'Alterações salvas.', 'sucesso');
      if (novo) router.replace(`/produtos/${idFinal}`);
    } catch {
      avisar('Não foi possível salvar. Verifique a conexão e tente de novo.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>{novo ? 'Novo produto' : `${form.sku} — ${form.nome}`}</h1>
          <p className={estilos.subtitulo}>
            {industria ? `${industria.nome} · ${porGrama ? 'preço por grama' : 'preço tabelado'}` : 'Catálogo'}
          </p>
        </div>
      </div>

      <form onSubmit={aoSalvar} noValidate>
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Dados do produto</h2>
          <div className={estilos.grade}>
            <CampoSelect
              rotulo="Indústria *"
              value={form.industriaId}
              onChange={(e) => definir('industriaId', e.target.value)}
              disabled={!novo}
              {...(erros['industriaId'] ? { erro: erros['industriaId'] } : {})}
            >
              <option value="">Escolha…</option>
              {(industrias ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto rotulo="Código (SKU) *" value={form.sku} onChange={(e) => definir('sku', e.target.value)} disabled={!novo} {...(erros['sku'] ? { erro: erros['sku'] } : {})} />
            <CampoTexto rotulo="Nome *" value={form.nome} onChange={(e) => definir('nome', e.target.value)} {...(erros['nome'] ? { erro: erros['nome'] } : {})} />
            <CampoTexto rotulo={porGrama ? 'Peso (g) *' : 'Peso (g)'} inputMode="decimal" placeholder="3,500" value={form.pesoG} onChange={(e) => definir('pesoG', e.target.value)} {...(erros['pesoG'] ? { erro: erros['pesoG'] } : {})} />
            <CampoSelect rotulo="Teor de prata" value={form.teor} onChange={(e) => definir('teor', e.target.value)}>
              <option value="">Sem teor</option>
              {TEORES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto rotulo="Categoria" value={form.categoria} onChange={(e) => definir('categoria', e.target.value)} />
            <CampoArea rotulo="Descrição" largo value={form.descricao} onChange={(e) => definir('descricao', e.target.value)} />
          </div>
        </section>

        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Códigos auxiliares</h2>
          <p className={estilos.cardDescricao}>Chaves usadas no vínculo de fotos e na importação (análise §2.7).</p>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Código original" value={form.codigoOriginal} onChange={(e) => definir('codigoOriginal', e.target.value)} />
            <CampoTexto rotulo="Referência" value={form.referencia} onChange={(e) => definir('referencia', e.target.value)} />
            <CampoTexto rotulo="Ref. de agrupamento" value={form.referenciaAgrupamento} onChange={(e) => definir('referenciaAgrupamento', e.target.value)} />
            <CampoTexto rotulo="EAN (código de barras)" value={form.ean} onChange={(e) => definir('ean', e.target.value)} />
            <div className={estilos.campo} style={{ justifyContent: 'end' }}>
              <Interruptor rotulo={form.ativo ? 'Produto ativo' : 'Produto inativo'} checked={form.ativo} onChange={(v) => definir('ativo', v)} />
            </div>
          </div>
        </section>

        <div className={estilos.acoesForm}>
          <button type="button" className={estilos.botaoSecundario} onClick={() => router.push('/produtos')}>
            Voltar
          </button>
          <button type="submit" className={estilos.botaoPrimario} disabled={salvando}>
            {salvando && <span className={estilos.girador} aria-hidden />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {!novo && industria && (
        <SecaoPrecos
          produtoId={id}
          industriaId={form.industriaId}
          modeloPreco={industria.modeloPreco}
          pesoMg={form.pesoG.trim() ? Math.round(Number(form.pesoG.replace(',', '.')) * 1000) : undefined}
        />
      )}
    </div>
  );
}
