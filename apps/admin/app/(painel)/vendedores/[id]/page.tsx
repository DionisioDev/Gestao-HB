'use client';

import {
  calcularTabelasLiberadas,
  VendedorSchema,
  type RegraVendedorEntrada,
  type Vendedor,
} from '@gestao-hb/core';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { CampoTexto, Interruptor } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { auditar, limparIndefinidos } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { slugId, useIndustrias } from '../../../../lib/industrias';
import { useSnackbar } from '../../../../lib/snackbar';
import { LinhaRegra } from './linha-regra';

const REGRA_VAZIA: RegraVendedorEntrada = {
  industriaId: '',
  tabelaId: '*',
  comissaoProporcionalPct: 0,
  acrescimoTabelaPct: 0,
  podeAlterarPreco: false,
  limiteDescontoPct: 0,
};

export default function PaginaVendedor() {
  const { id } = useParams<{ id: string }>();
  const novo = id === 'novo';
  const router = useRouter();
  const avisar = useSnackbar();
  const industrias = useIndustrias();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [regras, setRegras] = useState<RegraVendedorEntrada[]>([]);
  const [carregado, setCarregado] = useState(novo);
  const [anterior, setAnterior] = useState<Record<string, unknown> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [outros, setOutros] = useState<Array<{ id: string; nome: string }>>([]);
  const [origemClone, setOrigemClone] = useState('');

  useEffect(() => {
    void getDocs(collection(fb().db, 'vendedores')).then((foto) =>
      setOutros(
        foto.docs
          .filter((d) => d.id !== id)
          .map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id })),
      ),
    );
  }, [id]);

  useEffect(() => {
    if (novo) return;
    void getDoc(doc(fb().db, 'vendedores', id)).then((foto) => {
      if (!foto.exists()) {
        avisar('Vendedor não encontrado.', 'erro');
        router.replace('/vendedores');
        return;
      }
      const d = foto.data();
      setAnterior(d);
      setNome((d['nome'] as string) ?? '');
      setEmail((d['email'] as string) ?? '');
      setTelefone((d['telefone'] as string) ?? '');
      setAtivo(d['ativo'] !== false);
      setRegras(((d['regras'] as RegraVendedorEntrada[]) ?? []).map((r) => ({ ...REGRA_VAZIA, ...r })));
      setCarregado(true);
    });
  }, [id, novo, router, avisar]);

  if (!carregado) {
    return (
      <div aria-busy="true">
        <div className={estilos.esqueleto} />
        <div className={estilos.esqueleto} />
      </div>
    );
  }

  async function clonarDe(origemId: string) {
    const foto = await getDoc(doc(fb().db, 'vendedores', origemId));
    const copiadas = ((foto.data()?.['regras'] as RegraVendedorEntrada[]) ?? []).map((r) => ({ ...REGRA_VAZIA, ...r }));
    setRegras(copiadas);
    avisar(`Matriz clonada de ${foto.data()?.['nome'] ?? origemId} — revise e salve.`, 'info');
  }

  async function aoSalvar(e: FormEvent) {
    e.preventDefault();
    const analise = VendedorSchema.safeParse({
      nome,
      email: email || undefined,
      telefone: telefone || undefined,
      regras: regras.filter((r) => r.industriaId),
      ativo,
    });
    if (!analise.success) {
      avisar(analise.error.issues[0]?.message ?? 'Confira os campos.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      const dados: Vendedor = analise.data;
      const idFinal = novo ? slugId(dados.nome) : id;
      const ref = doc(fb().db, 'vendedores', idFinal);
      if (novo && (await getDoc(ref)).exists()) {
        avisar('Já existe um vendedor com esse nome.', 'erro');
        return;
      }
      const documento = limparIndefinidos(dados as unknown as Record<string, unknown>);
      documento['tabelasLiberadas'] = calcularTabelasLiberadas(dados.regras);
      documento['atualizadoEm'] = serverTimestamp();
      if (novo) documento['criadoEm'] = serverTimestamp();
      await setDoc(ref, documento, { merge: true });
      await auditar(novo ? 'vendedor_criado' : 'vendedor_editado', 'vendedor', idFinal, anterior, documento);
      avisar(novo ? 'Vendedor criado.' : 'Alterações salvas — permissões valem imediatamente.', 'sucesso');
      if (novo) router.replace(`/vendedores/${idFinal}`);
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
          <h1 className={estilos.titulo}>{novo ? 'Novo vendedor' : nome}</h1>
          <p className={estilos.subtitulo}>Dados comerciais e matriz de comissão/permissão.</p>
        </div>
      </div>

      <form onSubmit={aoSalvar} noValidate>
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Dados do vendedor</h2>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} />
            <CampoTexto rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <CampoTexto rotulo="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            <div className={estilos.campo} style={{ justifyContent: 'end' }}>
              <Interruptor rotulo={ativo ? 'Vendedor ativo' : 'Vendedor inativo'} checked={ativo} onChange={setAtivo} />
            </div>
          </div>
        </section>

        <section className={estilos.card}>
          <div className={estilos.cabecalho} style={{ marginBottom: 8 }}>
            <div>
              <h2 className={estilos.cardTitulo}>Indústrias que este vendedor atenderá</h2>
              <p className={estilos.cardDescricao} style={{ margin: 0 }}>
                Cada linha libera as tabelas e define a comissão proporcional (%) sobre a comissão do
                escritório. Sem linha = sem acesso.
              </p>
            </div>
            {outros.length > 0 && (
              <span style={{ display: 'inline-flex', gap: 8 }}>
                <select
                  className={estilos.entrada}
                  style={{ minWidth: 170 }}
                  value={origemClone}
                  onChange={(e) => setOrigemClone(e.target.value)}
                  aria-label="Clonar matriz de outro vendedor"
                >
                  <option value="">Clonar de…</option>
                  {outros.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={estilos.botaoSecundario}
                  disabled={!origemClone}
                  onClick={() => void clonarDe(origemClone)}
                >
                  Clonar
                </button>
              </span>
            )}
          </div>

          {regras.length === 0 ? (
            <div className={estilos.vazio} style={{ padding: '20px 0' }}>
              <strong>Nenhuma tabela liberada</strong>
              Este vendedor não verá preços nem emitirá pedidos até ter linhas na matriz.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px,1.2fr) minmax(120px,1fr) 92px 110px 44px',
                  gap: 10,
                  padding: '0 12px',
                  fontSize: 'var(--hb-legenda)',
                  color: 'var(--hb-texto-suave)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  fontWeight: 600,
                }}
              >
                <span>Indústria</span>
                <span>Tabela</span>
                <span>% comissão</span>
                <span>Desc. máx %</span>
                <span />
              </div>
              {regras.map((r, i) => (
                <LinhaRegra
                  key={i}
                  regra={r}
                  industrias={industrias ?? []}
                  aoMudar={(nova) => setRegras((rs) => rs.map((x, j) => (j === i ? nova : x)))}
                  aoRemover={() => setRegras((rs) => rs.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className={estilos.botaoSecundario}
              onClick={() => setRegras((rs) => [...rs, { ...REGRA_VAZIA }])}
            >
              + Adicionar indústria/tabela
            </button>
          </div>
        </section>

        <div className={estilos.acoesForm}>
          <button type="button" className={estilos.botaoSecundario} onClick={() => router.push('/vendedores')}>
            Voltar
          </button>
          <button type="submit" className={estilos.botaoPrimario} disabled={salvando}>
            {salvando && <span className={estilos.girador} aria-hidden />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
