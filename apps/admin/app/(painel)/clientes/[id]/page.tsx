'use client';

import { ClienteSchema, STATUS_CLIENTE, type Cliente, type StatusCliente } from '@gestao-hb/core';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { CampoArea, CampoSelect, CampoTexto } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar, limparIndefinidos } from '../../../../lib/auditoria';
import { ROTULO_STATUS_CLIENTE } from '../../../../lib/clientes';
import { fb } from '../../../../lib/firebase';
import { slugId } from '../../../../lib/industrias';
import { useSnackbar } from '../../../../lib/snackbar';
import { SecaoContatos } from './secao-contatos';

type Formulario = {
  tipoPessoa: 'PJ' | 'PF';
  razaoSocial: string;
  fantasia: string;
  cnpjCpf: string;
  inscrEstadual: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  enderecoCobranca: string;
  enderecoEntrega: string;
  emailGeral: string;
  emailFinanceiro: string;
  emailNfe: string;
  telefone: string;
  whatsapp: string;
  pix: string;
  vendedorId: string;
  status: StatusCliente;
  categoriaId: string;
  rede: string;
  segmento: string;
  limiteCredito: string;
  observacoes: string;
};

const VAZIO: Formulario = {
  tipoPessoa: 'PJ',
  razaoSocial: '',
  fantasia: '',
  cnpjCpf: '',
  inscrEstadual: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  enderecoCobranca: '',
  enderecoEntrega: '',
  emailGeral: '',
  emailFinanceiro: '',
  emailNfe: '',
  telefone: '',
  whatsapp: '',
  pix: '',
  vendedorId: '',
  status: 'ativo',
  categoriaId: '',
  rede: '',
  segmento: '',
  limiteCredito: '',
  observacoes: '',
};

export default function PaginaCliente() {
  const { id } = useParams<{ id: string }>();
  const novo = id === 'novo';
  const router = useRouter();
  const avisar = useSnackbar();

  const [form, setForm] = useState<Formulario | null>(novo ? VAZIO : null);
  const [anterior, setAnterior] = useState<Record<string, unknown> | null>(null);
  const [vendedores, setVendedores] = useState<Array<{ id: string; nome: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void getDocs(collection(fb().db, 'vendedores')).then((foto) =>
      setVendedores(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id }))),
    );
    void getDocs(collection(fb().db, 'categoriasCliente')).then((foto) =>
      setCategorias(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id }))),
    );
  }, []);

  useEffect(() => {
    if (novo) return;
    void getDoc(doc(fb().db, 'clientes', id)).then((foto) => {
      if (!foto.exists()) {
        avisar('Cliente não encontrado.', 'erro');
        router.replace('/clientes');
        return;
      }
      const d = foto.data();
      setAnterior(d);
      const s = (v: unknown) => (v == null ? '' : String(v));
      const e = (d['endereco'] ?? {}) as Record<string, unknown>;
      const em = (d['emails'] ?? {}) as Record<string, unknown>;
      setForm({
        ...VAZIO,
        tipoPessoa: (d['tipoPessoa'] as 'PJ' | 'PF') ?? 'PJ',
        razaoSocial: s(d['razaoSocial']),
        fantasia: s(d['fantasia']),
        cnpjCpf: s(d['cnpjCpf']),
        inscrEstadual: s(d['inscrEstadual']),
        logradouro: s(e['logradouro']),
        bairro: s(e['bairro']),
        cidade: s(e['cidade']),
        uf: s(e['uf']),
        cep: s(e['cep']),
        enderecoCobranca: s(d['enderecoCobranca']),
        enderecoEntrega: s(d['enderecoEntrega']),
        emailGeral: s(em['geral']),
        emailFinanceiro: s(em['financeiro']),
        emailNfe: s(em['nfe']),
        telefone: s(d['telefone']),
        whatsapp: s(d['whatsapp']),
        pix: s(d['pix']),
        vendedorId: s(d['vendedorId']),
        status: (d['status'] as StatusCliente) ?? 'ativo',
        categoriaId: s(d['categoriaId']),
        rede: s(d['rede']),
        segmento: s(d['segmento']),
        limiteCredito: d['limiteCreditoCentavos'] ? String(((d['limiteCreditoCentavos'] as number) / 100).toFixed(2)).replace('.', ',') : '',
        observacoes: s(d['observacoes']),
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

  const definir = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) =>
    setForm((f) => (f ? { ...f, [chave]: valor } : f));

  async function aoSalvar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    let dados: Cliente;
    try {
      const limite = form.limiteCredito.trim()
        ? Math.round(Number(form.limiteCredito.replace(/\./g, '').replace(',', '.')) * 100)
        : undefined;
      dados = ClienteSchema.parse({
        tipoPessoa: form.tipoPessoa,
        razaoSocial: form.razaoSocial,
        fantasia: form.fantasia || undefined,
        cnpjCpf: form.cnpjCpf || undefined,
        inscrEstadual: form.inscrEstadual || undefined,
        endereco: {
          logradouro: form.logradouro || undefined,
          bairro: form.bairro || undefined,
          cidade: form.cidade || undefined,
          uf: form.uf || undefined,
          cep: form.cep || undefined,
        },
        enderecoCobranca: form.enderecoCobranca || undefined,
        enderecoEntrega: form.enderecoEntrega || undefined,
        emails: {
          geral: form.emailGeral || undefined,
          financeiro: form.emailFinanceiro || undefined,
          nfe: form.emailNfe || undefined,
        },
        telefone: form.telefone || undefined,
        whatsapp: form.whatsapp || undefined,
        pix: form.pix || undefined,
        vendedorId: form.vendedorId || undefined,
        status: form.status,
        categoriaId: form.categoriaId || undefined,
        rede: form.rede || undefined,
        segmento: form.segmento || undefined,
        limiteCreditoCentavos: limite,
        observacoes: form.observacoes || undefined,
      });
    } catch (excecao) {
      const zod = excecao as { issues?: Array<{ message: string }> };
      avisar(zod.issues?.[0]?.message ?? 'Confira os campos.', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const idFinal = novo ? slugId(dados.razaoSocial) : id;
      const ref = doc(fb().db, 'clientes', idFinal);
      if (novo && (await getDoc(ref)).exists()) {
        avisar('Já existe um cliente com esse nome.', 'erro');
        return;
      }
      const documento = limparIndefinidos(dados as unknown as Record<string, unknown>);
      documento['atualizadoEm'] = serverTimestamp();
      if (novo) documento['criadoEm'] = serverTimestamp();
      await setDoc(ref, documento, { merge: true });
      await auditar(novo ? 'cliente_criado' : 'cliente_editado', 'cliente', idFinal, anterior, limparIndefinidos(dados as unknown as Record<string, unknown>));
      avisar(novo ? 'Cliente criado.' : 'Alterações salvas.', 'sucesso');
      if (novo) router.replace(`/clientes/${idFinal}`);
    } catch {
      avisar('Não foi possível salvar. Tente novamente.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>{novo ? 'Novo cliente' : form.fantasia || form.razaoSocial}</h1>
          <p className={estilos.subtitulo}>{novo ? 'Cadastro de cliente PJ ou PF.' : form.razaoSocial}</p>
        </div>
      </div>

      <form onSubmit={aoSalvar} noValidate>
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Identificação</h2>
          <div className={estilos.grade}>
            <CampoSelect rotulo="Tipo *" value={form.tipoPessoa} onChange={(e) => definir('tipoPessoa', e.target.value as 'PJ' | 'PF')}>
              <option value="PJ">Pessoa Jurídica</option>
              <option value="PF">Pessoa Física</option>
            </CampoSelect>
            <CampoTexto rotulo={form.tipoPessoa === 'PJ' ? 'Razão social *' : 'Nome completo *'} value={form.razaoSocial} onChange={(e) => definir('razaoSocial', e.target.value)} />
            <CampoTexto rotulo="Nome fantasia" value={form.fantasia} onChange={(e) => definir('fantasia', e.target.value)} />
            <CampoTexto rotulo={form.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'} value={form.cnpjCpf} onChange={(e) => definir('cnpjCpf', e.target.value)} />
            {form.tipoPessoa === 'PJ' && (
              <CampoTexto rotulo="Inscrição estadual" value={form.inscrEstadual} onChange={(e) => definir('inscrEstadual', e.target.value)} />
            )}
            <CampoSelect rotulo="Status *" value={form.status} onChange={(e) => definir('status', e.target.value as StatusCliente)}>
              {STATUS_CLIENTE.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_CLIENTE[s]}
                </option>
              ))}
            </CampoSelect>
            <CampoSelect rotulo="Vendedor" value={form.vendedorId} onChange={(e) => definir('vendedorId', e.target.value)}>
              <option value="">Sem vendedor</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </CampoSelect>
            <CampoSelect rotulo="Categoria" value={form.categoriaId} onChange={(e) => definir('categoriaId', e.target.value)}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto rotulo="Rede" value={form.rede} onChange={(e) => definir('rede', e.target.value)} />
            <CampoTexto rotulo="Segmento" value={form.segmento} onChange={(e) => definir('segmento', e.target.value)} />
          </div>
        </section>

        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Contato e endereço</h2>
          <div className={estilos.grade}>
            <CampoTexto rotulo="E-mail" type="email" value={form.emailGeral} onChange={(e) => definir('emailGeral', e.target.value)} />
            <CampoTexto rotulo="E-mail financeiro" type="email" value={form.emailFinanceiro} onChange={(e) => definir('emailFinanceiro', e.target.value)} />
            <CampoTexto rotulo="E-mail NFe" type="email" value={form.emailNfe} onChange={(e) => definir('emailNfe', e.target.value)} />
            <CampoTexto rotulo="Telefone" value={form.telefone} onChange={(e) => definir('telefone', e.target.value)} />
            <CampoTexto rotulo="WhatsApp" value={form.whatsapp} onChange={(e) => definir('whatsapp', e.target.value)} />
            <CampoTexto rotulo="PIX" value={form.pix} onChange={(e) => definir('pix', e.target.value)} />
            <CampoTexto rotulo="Endereço" largo value={form.logradouro} onChange={(e) => definir('logradouro', e.target.value)} />
            <CampoTexto rotulo="Bairro" value={form.bairro} onChange={(e) => definir('bairro', e.target.value)} />
            <CampoTexto rotulo="Cidade" value={form.cidade} onChange={(e) => definir('cidade', e.target.value)} />
            <CampoTexto rotulo="UF" maxLength={2} value={form.uf} onChange={(e) => definir('uf', e.target.value.toUpperCase())} />
            <CampoTexto rotulo="CEP" value={form.cep} onChange={(e) => definir('cep', e.target.value)} />
            <CampoArea rotulo="Endereço de cobrança (se diferente)" largo value={form.enderecoCobranca} onChange={(e) => definir('enderecoCobranca', e.target.value)} />
            <CampoArea rotulo="Endereço de entrega (se diferente)" largo value={form.enderecoEntrega} onChange={(e) => definir('enderecoEntrega', e.target.value)} />
          </div>
        </section>

        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Comercial</h2>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Limite de crédito (R$)" inputMode="decimal" placeholder="0,00" value={form.limiteCredito} onChange={(e) => definir('limiteCredito', e.target.value)} />
            <CampoArea rotulo="Observações" largo value={form.observacoes} onChange={(e) => definir('observacoes', e.target.value)} />
          </div>
        </section>

        <div className={estilos.acoesForm}>
          <button type="button" className={estilos.botaoSecundario} onClick={() => router.push('/clientes')}>
            Voltar
          </button>
          <button type="submit" className={estilos.botaoPrimario} disabled={salvando}>
            {salvando && <span className={estilos.girador} aria-hidden />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {!novo && <SecaoContatos clienteId={id} />}
    </div>
  );
}
