import {
  gerarParcelasIguais,
  precoPorGrama,
  resolverRegraVendedor,
  subtotalItem,
  totalPedido,
  type ParcelaGerada,
  type RegraVendedorEntrada,
} from '@gestao-hb/core';
import { emitirPedido, type ItemEmissao } from '@gestao-hb/firebase';
import { formatarCentavos } from '@gestao-hb/ui';
import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  where,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fb } from '../lib/firebase';
import { useSnackbar } from '../lib/snackbar';
import './novo-pedido.css';

type Etapa = 'cliente' | 'catalogo' | 'itens' | 'pagamento' | 'revisao';

interface Ref {
  id: string;
  nome: string;
}

interface TabelaRef extends Ref {
  teor?: number;
}

interface ProdutoBusca {
  id: string;
  sku: string;
  nome: string;
  pesoMg?: number;
}

interface Rascunho {
  clienteId: string;
  clienteNome: string;
  industriaId: string;
  tabelaId: string;
  itens: ItemEmissao[];
}

const hoje = () => new Date().toISOString().slice(0, 10);
const CHAVE_RASCUNHO = 'gestao-hb-rascunho-pedido';

const TITULOS: Record<Etapa, [string, string]> = {
  cliente: ['Cliente', 'Etapa 1 de 5'],
  catalogo: ['Indústria e tabela', 'Etapa 2 de 5'],
  itens: ['Itens', 'Etapa 3 de 5'],
  pagamento: ['Pagamento', 'Etapa 4 de 5'],
  revisao: ['Revisão', 'Etapa 5 de 5'],
};

export function NovoPedido() {
  const navegar = useNavigate();
  const avisar = useSnackbar();
  const { usuario, nome: nomeUsuario, vendedorId } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>('cliente');
  const [regras, setRegras] = useState<RegraVendedorEntrada[]>([]);
  const [nomeVendedor, setNomeVendedor] = useState('');

  const [clientes, setClientes] = useState<Ref[] | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');

  const [industrias, setIndustrias] = useState<Array<Ref & { modeloPreco: string }>>([]);
  const [industriaId, setIndustriaId] = useState('');
  const [tabelas, setTabelas] = useState<TabelaRef[]>([]);
  const [tabelaId, setTabelaId] = useState('');
  const [gramaVigente, setGramaVigente] = useState<Record<string, { valorCentavos: number; id: string; teor?: number }>>({});

  const [buscaProduto, setBuscaProduto] = useState('');
  const [sugestoes, setSugestoes] = useState<ProdutoBusca[]>([]);
  const [itens, setItens] = useState<ItemEmissao[]>([]);

  const [nParcelas, setNParcelas] = useState('1');
  const [primeiraParcela, setPrimeiraParcela] = useState(hoje());
  const [intervaloDias, setIntervaloDias] = useState('30');
  const [parcelas, setParcelas] = useState<ParcelaGerada[]>([]);
  const [condicaoPagto, setCondicaoPagto] = useState('');

  const [emitindo, setEmitindo] = useState(false);

  const industria = industrias.find((i) => i.id === industriaId);
  const porGrama = industria?.modeloPreco === 'porGrama';

  // matriz do vendedor + nome
  useEffect(() => {
    if (!vendedorId) return;
    void getDoc(doc(fb().db, 'vendedores', vendedorId)).then((foto) => {
      setRegras(((foto.data()?.['regras'] as RegraVendedorEntrada[]) ?? []));
      setNomeVendedor((foto.data()?.['nome'] as string) ?? nomeUsuario);
    });
  }, [vendedorId, nomeUsuario]);

  // clientes e indústrias
  useEffect(() => {
    void getDocs(query(collection(fb().db, 'clientes'), orderBy('razaoSocial'))).then((foto) =>
      setClientes(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['fantasia'] as string) || (d.data()['razaoSocial'] as string) }))),
    );
    void getDocs(query(collection(fb().db, 'industrias'), orderBy('nome'))).then((foto) =>
      setIndustrias(
        foto.docs
          .filter((d) => d.data()['ativo'] !== false)
          .map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id, modeloPreco: (d.data()['modeloPreco'] as string) ?? 'tabelado' })),
      ),
    );
  }, []);

  // restaura rascunho salvo (offline / sessão expirada — seção 7 da especificação)
  useEffect(() => {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return;
    try {
      const r = JSON.parse(bruto) as Rascunho;
      if (r.itens.length > 0) {
        setClienteId(r.clienteId);
        setClienteNome(r.clienteNome);
        setIndustriaId(r.industriaId);
        setTabelaId(r.tabelaId);
        setItens(r.itens);
        setEtapa('itens');
        avisar('Rascunho recuperado — continue de onde parou.', 'info');
      }
    } catch {
      localStorage.removeItem(CHAVE_RASCUNHO);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persiste rascunho a cada mudança relevante
  useEffect(() => {
    if (itens.length === 0) return;
    const rascunho: Rascunho = { clienteId, clienteNome, industriaId, tabelaId, itens };
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho));
  }, [clienteId, clienteNome, industriaId, tabelaId, itens]);

  // tabelas permitidas pela matriz
  useEffect(() => {
    if (!industriaId) {
      setTabelas([]);
      return;
    }
    void getDocs(query(collection(fb().db, 'industrias', industriaId, 'tabelasPreco'), orderBy('ordem'))).then((foto) =>
      setTabelas(
        foto.docs
          .map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id, ...(d.data()['teor'] ? { teor: d.data()['teor'] as number } : {}) }))
          .filter((t) => resolverRegraVendedor(regras, industriaId, t.id)),
      ),
    );
  }, [industriaId, regras]);

  // grama vigente
  useEffect(() => {
    if (!industriaId || !porGrama) {
      setGramaVigente({});
      return;
    }
    void getDocs(query(collection(fb().db, 'valoresGrama'), where('industriaId', '==', industriaId), orderBy('vigenciaInicio', 'desc'))).then((foto) => {
      const referencia = hoje();
      const mapa: Record<string, { valorCentavos: number; id: string; teor?: number }> = {};
      foto.docs.forEach((d) => {
        const dados = d.data();
        const tid = dados['tabelaId'] as string;
        if (!(tid in mapa) && (dados['vigenciaInicio'] as string) <= referencia) {
          mapa[tid] = { valorCentavos: dados['valorCentavos'] as number, id: d.id, ...(dados['teor'] ? { teor: dados['teor'] as number } : {}) };
        }
      });
      setGramaVigente(mapa);
    });
  }, [industriaId, porGrama]);

  // busca de produtos
  useEffect(() => {
    if (!industriaId || buscaProduto.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const termo = buscaProduto.trim().toUpperCase();
    const timer = setTimeout(() => {
      void getDocs(
        query(collection(fb().db, 'produtos'), where('industriaId', '==', industriaId), orderBy('sku'), startAt(termo), endAt(termo + ''), limit(10)),
      ).then((foto) =>
        setSugestoes(foto.docs.map((d) => ({ id: d.id, sku: d.data()['sku'] as string, nome: d.data()['nome'] as string, ...(d.data()['pesoMg'] ? { pesoMg: d.data()['pesoMg'] as number } : {}) }))),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaProduto, industriaId]);

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    return (clientes ?? []).filter((c) => !termo || c.nome.toLowerCase().includes(termo)).slice(0, 30);
  }, [clientes, buscaCliente]);

  const somaItens = itens.reduce((s, i) => s + i.subtotalCentavos, 0);
  const total = (() => {
    try {
      return totalPedido({ somaItensCentavos: somaItens });
    } catch {
      return 0;
    }
  })();
  const somaParcelas = parcelas.reduce((s, p) => s + p.valorCentavos, 0);
  const regra = industriaId && tabelaId ? resolverRegraVendedor(regras, industriaId, tabelaId) : undefined;

  async function adicionarItem(p: ProdutoBusca) {
    let precoUnit: number;
    if (porGrama) {
      const grama = gramaVigente[tabelaId];
      if (!grama || !p.pesoMg) {
        avisar(!grama ? 'Sem valor do grama vigente — fale com o gestor.' : `${p.sku} sem peso no catálogo.`, 'erro');
        return;
      }
      precoUnit = precoPorGrama(p.pesoMg, grama.valorCentavos);
    } else {
      const precoDoc = await getDoc(doc(fb().db, 'produtos', p.id, 'precos', tabelaId));
      const preco = precoDoc.data()?.['precoCentavos'] as number | undefined;
      if (!preco) {
        avisar(`${p.sku} não tem preço nesta tabela.`, 'erro');
        return;
      }
      precoUnit = preco;
    }
    setItens((atuais) => {
      const existente = atuais.find((i) => i.produtoId === p.id);
      if (existente) {
        return atuais.map((i) => (i.produtoId === p.id ? { ...i, qtde: i.qtde + 1, subtotalCentavos: subtotalItem(i.precoFinalCentavos, i.qtde + 1) } : i));
      }
      return [...atuais, { produtoId: p.id, sku: p.sku, descricao: p.nome, qtde: 1, ...(p.pesoMg ? { pesoMg: p.pesoMg } : {}), precoTabelaCentavos: precoUnit, precoFinalCentavos: precoUnit, subtotalCentavos: precoUnit }];
    });
    setBuscaProduto('');
    setSugestoes([]);
  }

  function mudarQtde(produtoId: string, delta: number, valorDireto?: string) {
    setItens((atuais) =>
      atuais
        .map((i) => {
          if (i.produtoId !== produtoId) return i;
          const nova = valorDireto != null ? Number(valorDireto.replace(',', '.')) : i.qtde + delta;
          if (!Number.isFinite(nova) || nova <= 0) return i;
          return { ...i, qtde: nova, subtotalCentavos: subtotalItem(i.precoFinalCentavos, nova) };
        })
        .filter((i) => i.qtde > 0),
    );
  }

  async function confirmar() {
    if (!usuario || !vendedorId || !regra || !industria) return;
    setEmitindo(true);
    try {
      const industriaDoc = await getDoc(doc(fb().db, 'industrias', industriaId));
      const dadosInd = industriaDoc.data() ?? {};
      const grama = porGrama ? gramaVigente[tabelaId] : undefined;
      const { numero } = await emitirPedido(
        fb().db,
        { uid: usuario.uid, nome: nomeUsuario, origem: 'vendedor', perfil: 'vendedor' },
        {
          tipo: 'pedido',
          clienteId,
          clienteNome,
          vendedorId,
          vendedorNome: nomeVendedor,
          industriaId,
          industriaNome: industria.nome,
          regimeComissao: (dadosInd['regimeComissao'] as 'mensalFixo' | 'posRecebimento') ?? 'posRecebimento',
          ...(dadosInd['diaPagtoComissao'] ? { diaPagtoComissao: dadosInd['diaPagtoComissao'] as number } : {}),
          ...(dadosInd['elegibilidadeComissao'] ? { elegibilidadeComissao: dadosInd['elegibilidadeComissao'] as 'pedidoQuitado' | 'porParcela' } : {}),
          tabelaId,
          dataEmissao: hoje(),
          ...(condicaoPagto ? { condicaoPagto } : {}),
          itens,
          freteCentavos: 0,
          acrescimoCentavos: 0,
          descontoCentavos: 0,
          ...(grama ? { valorGramaCongelado: { valorCentavos: grama.valorCentavos, valorGramaId: grama.id, ...(grama.teor ? { teor: grama.teor } : {}) } } : {}),
          pctComissaoEscritorio: (dadosInd['pctComissaoEscritorio'] as number) ?? 0,
          pctComissaoVendedor: regra.comissaoProporcionalPct,
          parcelas,
        },
      );
      localStorage.removeItem(CHAVE_RASCUNHO);
      avisar(`Pedido nº ${numero} emitido com sucesso!`, 'sucesso');
      navegar('/', { replace: true });
    } catch (excecao) {
      avisar((excecao as Error).message || 'Não foi possível emitir. Seu rascunho está salvo — tente de novo.', 'erro');
    } finally {
      setEmitindo(false);
    }
  }

  function voltar() {
    const ordem: Etapa[] = ['cliente', 'catalogo', 'itens', 'pagamento', 'revisao'];
    const atual = ordem.indexOf(etapa);
    if (atual === 0) {
      navegar('/');
      return;
    }
    setEtapa(ordem[atual - 1]!);
  }

  const [titulo, subtitulo] = TITULOS[etapa];

  const podeAvancar =
    etapa === 'cliente'
      ? !!clienteId
      : etapa === 'catalogo'
        ? !!tabelaId
        : etapa === 'itens'
          ? itens.length > 0
          : etapa === 'pagamento'
            ? parcelas.length > 0 && somaParcelas === total
            : true;

  function avancar() {
    const ordem: Etapa[] = ['cliente', 'catalogo', 'itens', 'pagamento', 'revisao'];
    const atual = ordem.indexOf(etapa);
    if (etapa === 'pagamento' && somaParcelas !== total) {
      avisar('Gere as parcelas — a soma precisa bater com o total.', 'erro');
      return;
    }
    if (atual < ordem.length - 1) setEtapa(ordem[atual + 1]!);
    else void confirmar();
  }

  return (
    <div className="np">
      <header className="np-topo">
        <button className="np-voltar" onClick={voltar} aria-label="Voltar">
          ‹
        </button>
        <div>
          <div className="np-titulo">{titulo}</div>
          <div className="np-etapa">{subtitulo}</div>
        </div>
      </header>

      <main className="np-corpo">
        {etapa === 'cliente' && (
          <>
            <input className="np-busca" placeholder="Buscar cliente…" value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} aria-label="Buscar cliente" />
            {!clientes ? (
              <div className="np-vazio">Carregando clientes…</div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="np-vazio">Nenhum cliente encontrado.</div>
            ) : (
              <ul className="np-lista">
                {clientesFiltrados.map((c) => (
                  <li key={c.id}>
                    <button
                      className={`np-opcao ${c.id === clienteId ? 'np-opcao-marcada' : ''}`}
                      onClick={() => {
                        setClienteId(c.id);
                        setClienteNome(c.nome);
                        setEtapa('catalogo');
                      }}
                    >
                      <strong>{c.nome}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {etapa === 'catalogo' && (
          <>
            <p className="np-secao-titulo">Indústria</p>
            <ul className="np-lista" style={{ marginBottom: 18 }}>
              {industrias
                .filter((i) => regras.some((r) => r.industriaId === i.id))
                .map((i) => (
                  <li key={i.id}>
                    <button
                      className={`np-opcao ${i.id === industriaId ? 'np-opcao-marcada' : ''}`}
                      onClick={() => {
                        setIndustriaId(i.id);
                        setTabelaId('');
                        setItens([]);
                      }}
                    >
                      <strong>{i.nome}</strong>
                      <small>{i.modeloPreco === 'porGrama' ? 'preço por grama' : 'preço tabelado'}</small>
                    </button>
                  </li>
                ))}
            </ul>
            {industriaId && (
              <>
                <p className="np-secao-titulo">Tabela de preço</p>
                {tabelas.length === 0 ? (
                  <div className="np-vazio">Nenhuma tabela liberada para você nesta indústria — fale com o gestor.</div>
                ) : (
                  <ul className="np-lista">
                    {tabelas.map((t) => (
                      <li key={t.id}>
                        <button
                          className={`np-opcao ${t.id === tabelaId ? 'np-opcao-marcada' : ''}`}
                          onClick={() => {
                            setTabelaId(t.id);
                            setEtapa('itens');
                          }}
                        >
                          <strong>{t.nome}</strong>
                          {t.teor && <small>teor {t.teor}</small>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        {etapa === 'itens' && (
          <>
            <input className="np-busca" placeholder="Buscar produto por código…" value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} aria-label="Buscar produto" />
            {sugestoes.length > 0 && (
              <ul className="np-lista" style={{ marginBottom: 16 }}>
                {sugestoes.map((p) => (
                  <li key={p.id}>
                    <button className="np-opcao" onClick={() => void adicionarItem(p)}>
                      <strong>{p.sku}</strong>
                      <small>
                        {p.nome}
                        {p.pesoMg ? ` · ${(p.pesoMg / 1000).toFixed(3).replace('.', ',')} g` : ''}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {itens.length === 0 ? (
              <div className="np-vazio">
                <strong>Nenhum item ainda</strong>
                <br />
                Busque pelo código acima para adicionar.
              </div>
            ) : (
              <ul className="np-lista">
                {itens.map((i) => (
                  <li key={i.produtoId} className="np-item">
                    <div className="np-item-info">
                      <div className="np-item-nome">
                        {i.sku} — {i.descricao}
                      </div>
                      <div className="np-item-preco">
                        {formatarCentavos(i.precoFinalCentavos)} · subtotal <strong>{formatarCentavos(i.subtotalCentavos)}</strong>
                      </div>
                    </div>
                    <span className="np-stepper">
                      <button onClick={() => (i.qtde <= 1 ? setItens((a) => a.filter((x) => x.produtoId !== i.produtoId)) : mudarQtde(i.produtoId, -1))} aria-label={`Diminuir ${i.sku}`}>
                        −
                      </button>
                      <input inputMode="decimal" value={String(i.qtde).replace('.', ',')} onChange={(e) => mudarQtde(i.produtoId, 0, e.target.value)} aria-label={`Quantidade de ${i.sku}`} />
                      <button onClick={() => mudarQtde(i.produtoId, 1)} aria-label={`Aumentar ${i.sku}`}>
                        +
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {etapa === 'pagamento' && (
          <>
            <div className="np-campo">
              <label htmlFor="np-cond">Condição de pagamento</label>
              <input id="np-cond" placeholder="ex.: 30/60/90" value={condicaoPagto} onChange={(e) => setCondicaoPagto(e.target.value)} />
            </div>
            <div className="np-campo">
              <label htmlFor="np-n">Nº de parcelas</label>
              <input id="np-n" type="number" min={1} max={36} value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} />
            </div>
            <div className="np-campo">
              <label htmlFor="np-data">Primeiro vencimento</label>
              <input id="np-data" type="date" value={primeiraParcela} onChange={(e) => setPrimeiraParcela(e.target.value)} />
            </div>
            <div className="np-campo">
              <label htmlFor="np-int">Intervalo (dias)</label>
              <input id="np-int" type="number" min={1} value={intervaloDias} onChange={(e) => setIntervaloDias(e.target.value)} />
            </div>
            <button
              className="np-avancar"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                try {
                  setParcelas(gerarParcelasIguais(total, Number(nParcelas), primeiraParcela, Number(intervaloDias)));
                } catch {
                  avisar('Confira a quantidade de parcelas e a data.', 'erro');
                }
              }}
            >
              Gerar parcelas
            </button>
            {parcelas.length > 0 && (
              <div className="np-parcelas">
                {parcelas.map((p) => (
                  <span key={p.numero} className="np-opcao" style={{ padding: '8px 12px', minHeight: 0 }}>
                    {p.numero}ª · {formatarCentavos(p.valorCentavos)} · {p.vencimento.split('-').reverse().join('/')}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {etapa === 'revisao' && (
          <dl className="np-revisao">
            <dt>Cliente</dt>
            <dd>{clienteNome}</dd>
            <dt>Indústria / tabela</dt>
            <dd>
              {industria?.nome} · {tabelas.find((t) => t.id === tabelaId)?.nome}
            </dd>
            <dt>Itens ({itens.length})</dt>
            {itens.map((i) => (
              <dd key={i.produtoId} style={{ fontWeight: 400 }}>
                {String(i.qtde).replace('.', ',')}× {i.sku} — {formatarCentavos(i.subtotalCentavos)}
              </dd>
            ))}
            <dt>Parcelas</dt>
            <dd style={{ fontWeight: 400 }}>
              {parcelas.map((p) => `${p.numero}ª ${formatarCentavos(p.valorCentavos)}`).join(' · ')}
            </dd>
            {porGrama && gramaVigente[tabelaId] && (
              <>
                <dt>Grama congelado</dt>
                <dd>{formatarCentavos(gramaVigente[tabelaId]!.valorCentavos)}/g</dd>
              </>
            )}
            <dt>Comissão prevista (sua)</dt>
            <dd>{regra ? `${regra.comissaoProporcionalPct}% da comissão do escritório` : '—'}</dd>
          </dl>
        )}
      </main>

      <footer className="np-resumo">
        <div className="np-resumo-linha">
          <div>
            <div className="np-total-rotulo">
              {itens.length} {itens.length === 1 ? 'item' : 'itens'}
            </div>
            <div className="np-total-valor">{formatarCentavos(total)}</div>
          </div>
          <button className="np-avancar" onClick={avancar} disabled={!podeAvancar || emitindo}>
            {emitindo && <span className="np-girador" aria-hidden />}
            {etapa === 'revisao' ? (emitindo ? 'Emitindo…' : 'Confirmar pedido') : 'Continuar'}
          </button>
        </div>
      </footer>
    </div>
  );
}
