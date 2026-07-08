'use client';

import { IndustriaSchema, type Industria } from '@gestao-hb/core';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { CampoArea, CampoSelect, CampoTexto, Interruptor } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar, limparIndefinidos } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { useSnackbar } from '../../../../lib/snackbar';
import { SecaoGrama } from './secao-grama';
import { SecaoTabelas } from './secao-tabelas';

type Formulario = {
  nome: string;
  fantasia: string;
  logica: boolean;
  cnpj: string;
  inscrEstadual: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  pix: string;
  regimeComissao: 'mensalFixo' | 'posRecebimento';
  diaPagtoComissao: string;
  elegibilidadeComissao: 'pedidoQuitado' | 'porParcela';
  modeloPreco: 'porGrama' | 'tabelado';
  pctComissaoEscritorio: string;
  prazoEntregaDias: string;
  condicoesComerciais: string;
  ativo: boolean;
};

const VAZIO: Formulario = {
  nome: '',
  fantasia: '',
  logica: false,
  cnpj: '',
  inscrEstadual: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  telefone: '',
  email: '',
  pix: '',
  regimeComissao: 'posRecebimento',
  diaPagtoComissao: '15',
  elegibilidadeComissao: 'pedidoQuitado',
  modeloPreco: 'tabelado',
  pctComissaoEscritorio: '',
  prazoEntregaDias: '',
  condicoesComerciais: '',
  ativo: true,
};

function slug(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function paraFormulario(d: Record<string, unknown>): Formulario {
  const e = (d['endereco'] ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (v == null ? '' : String(v));
  return {
    ...VAZIO,
    nome: s(d['nome']),
    fantasia: s(d['fantasia']),
    logica: !!d['logica'],
    cnpj: s(d['cnpj']),
    inscrEstadual: s(d['inscrEstadual']),
    logradouro: s(e['logradouro']),
    bairro: s(e['bairro']),
    cidade: s(e['cidade']),
    uf: s(e['uf']),
    cep: s(e['cep']),
    telefone: s(d['telefone']),
    email: s(d['email']),
    pix: s(d['pix']),
    regimeComissao: (d['regimeComissao'] as Formulario['regimeComissao']) ?? 'posRecebimento',
    diaPagtoComissao: s(d['diaPagtoComissao'] ?? '15'),
    elegibilidadeComissao: (d['elegibilidadeComissao'] as Formulario['elegibilidadeComissao']) ?? 'pedidoQuitado',
    modeloPreco: (d['modeloPreco'] as Formulario['modeloPreco']) ?? 'tabelado',
    pctComissaoEscritorio: d['pctComissaoEscritorio'] ? String(d['pctComissaoEscritorio']) : '',
    prazoEntregaDias: d['prazoEntregaDias'] ? String(d['prazoEntregaDias']) : '',
    condicoesComerciais: s(d['condicoesComerciais']),
    ativo: d['ativo'] !== false,
  };
}

function paraDominio(f: Formulario): Industria {
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));
  return IndustriaSchema.parse({
    nome: f.nome,
    fantasia: f.fantasia || undefined,
    logica: f.logica,
    cnpj: f.logica ? undefined : f.cnpj || undefined,
    inscrEstadual: f.logica ? undefined : f.inscrEstadual || undefined,
    endereco: f.logica
      ? undefined
      : { logradouro: f.logradouro || undefined, bairro: f.bairro || undefined, cidade: f.cidade || undefined, uf: f.uf || undefined, cep: f.cep || undefined },
    telefone: f.telefone || undefined,
    email: f.email || undefined,
    pix: f.pix || undefined,
    regimeComissao: f.regimeComissao,
    diaPagtoComissao: f.regimeComissao === 'mensalFixo' ? (num(f.diaPagtoComissao) ?? 15) : undefined,
    elegibilidadeComissao: f.regimeComissao === 'posRecebimento' ? f.elegibilidadeComissao : undefined,
    modeloPreco: f.modeloPreco,
    pctComissaoEscritorio: num(f.pctComissaoEscritorio) ?? 0,
    prazoEntregaDias: num(f.prazoEntregaDias),
    condicoesComerciais: f.condicoesComerciais || undefined,
    ativo: f.ativo,
  });
}

export default function PaginaIndustria() {
  const { id } = useParams<{ id: string }>();
  const nova = id === 'nova';
  const router = useRouter();
  const avisar = useSnackbar();

  const [form, setForm] = useState<Formulario | null>(nova ? VAZIO : null);
  const [anterior, setAnterior] = useState<Record<string, unknown> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (nova) return;
    void getDoc(doc(fb().db, 'industrias', id)).then((foto) => {
      if (!foto.exists()) {
        avisar('Indústria não encontrada.', 'erro');
        router.replace('/industrias');
        return;
      }
      setAnterior(foto.data());
      setForm(paraFormulario(foto.data()));
    });
  }, [id, nova, router, avisar]);

  if (!form) {
    return (
      <div aria-busy="true">
        <div className={estilos.esqueleto} />
        <div className={estilos.esqueleto} />
      </div>
    );
  }

  const definir = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) =>
    setForm((f) => (f ? { ...f, [chave]: valor } : f));

  async function aoSalvar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErros({});
    let dados: Industria;
    try {
      dados = paraDominio(form);
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
      const idFinal = nova ? slug(dados.nome) : id;
      const ref = doc(fb().db, 'industrias', idFinal);
      if (nova && (await getDoc(ref)).exists()) {
        avisar('Já existe uma indústria com esse nome.', 'erro');
        return;
      }
      const documento = limparIndefinidos({ ...dados, atualizadoEm: null }) as Record<string, unknown>;
      documento['atualizadoEm'] = serverTimestamp();
      if (nova) documento['criadoEm'] = serverTimestamp();
      await setDoc(ref, documento, { merge: true });
      await auditar(
        nova ? 'industria_criada' : 'industria_editada',
        'industria',
        idFinal,
        anterior,
        limparIndefinidos(dados as unknown as Record<string, unknown>),
      );
      avisar(nova ? 'Indústria criada.' : 'Alterações salvas.', 'sucesso');
      if (nova) router.replace(`/industrias/${idFinal}`);
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
          <h1 className={estilos.titulo}>{nova ? 'Nova indústria' : form.nome}</h1>
          <p className={estilos.subtitulo}>
            {nova ? 'Cadastre uma representada ou um catálogo lógico.' : 'Edição de indústria'}
          </p>
        </div>
      </div>

      <form onSubmit={aoSalvar} noValidate>
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Identificação</h2>
          <p className={estilos.cardDescricao}>
            Indústrias "catálogo" agrupam produtos e preços sem dados fiscais próprios.
          </p>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Nome *" value={form.nome} onChange={(e) => definir('nome', e.target.value)} {...(erros['nome'] ? { erro: erros['nome'] } : {})} />
            <CampoTexto rotulo="Nome fantasia" value={form.fantasia} onChange={(e) => definir('fantasia', e.target.value)} />
            <div className={estilos.campo} style={{ justifyContent: 'end' }}>
              <Interruptor rotulo="Somente catálogo (sem dados fiscais)" checked={form.logica} onChange={(v) => definir('logica', v)} />
            </div>
          </div>
        </section>

        {!form.logica && (
          <section className={estilos.card}>
            <h2 className={estilos.cardTitulo}>Dados fiscais e endereço</h2>
            <div className={estilos.grade}>
              <CampoTexto rotulo="CNPJ" value={form.cnpj} onChange={(e) => definir('cnpj', e.target.value)} />
              <CampoTexto rotulo="Inscrição estadual" value={form.inscrEstadual} onChange={(e) => definir('inscrEstadual', e.target.value)} />
              <CampoTexto rotulo="Endereço" largo value={form.logradouro} onChange={(e) => definir('logradouro', e.target.value)} />
              <CampoTexto rotulo="Bairro" value={form.bairro} onChange={(e) => definir('bairro', e.target.value)} />
              <CampoTexto rotulo="Cidade" value={form.cidade} onChange={(e) => definir('cidade', e.target.value)} />
              <CampoTexto rotulo="UF" maxLength={2} value={form.uf} onChange={(e) => definir('uf', e.target.value.toUpperCase())} />
              <CampoTexto rotulo="CEP" value={form.cep} onChange={(e) => definir('cep', e.target.value)} />
            </div>
          </section>
        )}

        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Contato</h2>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Telefone" value={form.telefone} onChange={(e) => definir('telefone', e.target.value)} />
            <CampoTexto rotulo="E-mail" type="email" value={form.email} onChange={(e) => definir('email', e.target.value)} {...(erros['email'] ? { erro: erros['email'] } : {})} />
            <CampoTexto rotulo="PIX" value={form.pix} onChange={(e) => definir('pix', e.target.value)} />
          </div>
        </section>

        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Comercial</h2>
          <p className={estilos.cardDescricao}>
            Regime de comissão (ADR-001) e modelo de precificação (ADR-005) desta indústria.
          </p>
          <div className={estilos.grade}>
            <CampoSelect rotulo="Regime de comissão *" value={form.regimeComissao} onChange={(e) => definir('regimeComissao', e.target.value as Formulario['regimeComissao'])}>
              <option value="mensalFixo">A — Mensal fixo (paga todo mês)</option>
              <option value="posRecebimento">B — Pós-recebimento do cliente</option>
            </CampoSelect>
            {form.regimeComissao === 'mensalFixo' ? (
              <CampoTexto rotulo="Dia do pagamento" type="number" min={1} max={28} value={form.diaPagtoComissao} onChange={(e) => definir('diaPagtoComissao', e.target.value)} />
            ) : (
              <CampoSelect rotulo="Comissão fica elegível" value={form.elegibilidadeComissao} onChange={(e) => definir('elegibilidadeComissao', e.target.value as Formulario['elegibilidadeComissao'])}>
                <option value="pedidoQuitado">Com o pedido quitado</option>
                <option value="porParcela">A cada parcela paga (proporcional)</option>
              </CampoSelect>
            )}
            <CampoSelect rotulo="Modelo de preço *" value={form.modeloPreco} onChange={(e) => definir('modeloPreco', e.target.value as Formulario['modeloPreco'])}>
              <option value="tabelado">Tabelado (preço fixo por item)</option>
              <option value="porGrama">Por grama (peso × valor do grama)</option>
            </CampoSelect>
            <CampoTexto rotulo="% comissão do escritório" inputMode="decimal" placeholder="ex.: 10" value={form.pctComissaoEscritorio} onChange={(e) => definir('pctComissaoEscritorio', e.target.value)} {...(erros['pctComissaoEscritorio'] ? { erro: erros['pctComissaoEscritorio'] } : {})} />
            <CampoTexto rotulo="Prazo de entrega (dias)" type="number" min={0} value={form.prazoEntregaDias} onChange={(e) => definir('prazoEntregaDias', e.target.value)} />
            <CampoArea rotulo="Condições comerciais" largo value={form.condicoesComerciais} onChange={(e) => definir('condicoesComerciais', e.target.value)} />
            <div className={estilos.campo} style={{ justifyContent: 'end' }}>
              <Interruptor rotulo={form.ativo ? 'Indústria ativa' : 'Indústria inativa'} checked={form.ativo} onChange={(v) => definir('ativo', v)} />
            </div>
          </div>
        </section>

        <div className={estilos.acoesForm}>
          <button type="button" className={estilos.botaoSecundario} onClick={() => router.push('/industrias')}>
            Voltar
          </button>
          <button type="submit" className={estilos.botaoPrimario} disabled={salvando}>
            {salvando && <span className={estilos.girador} aria-hidden />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {!nova && (
        <>
          <SecaoTabelas industriaId={id} />
          {form.modeloPreco === 'porGrama' && <SecaoGrama industriaId={id} />}
        </>
      )}
    </div>
  );
}
