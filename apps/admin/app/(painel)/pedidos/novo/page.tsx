'use client';

import {
  gerarParcelasIguais,
  precoPorGrama,
  resolverRegraVendedor,
  subtotalItem,
  totalPedido,
  type ParcelaGerada,
  type RegraVendedorEntrada,
} from '@gestao-hb/core';
import { formatarCentavos, StatusChip } from '@gestao-hb/ui';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAt,
  endAt,
  where,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CampoSelect, CampoTexto } from '../../../../components/campos';
import estilos from '../../../../components/ui.module.css';
import { fb } from '../../../../lib/firebase';
import { useIndustrias } from '../../../../lib/industrias';
import { emitirPedido, type ItemEmissao } from '../../../../lib/pedidos';
import { useSnackbar } from '../../../../lib/snackbar';

interface Ref {
  id: string;
  nome: string;
}

interface VendedorRef extends Ref {
  regras: RegraVendedorEntrada[];
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

const hoje = () => new Date().toISOString().slice(0, 10);

export default function PaginaNovoPedido() {
  const router = useRouter();
  const avisar = useSnackbar();
  const industrias = useIndustrias();

  // cabeçalho
  const [tipo, setTipo] = useState<'pedido' | 'orcamento'>('pedido');
  const [clientes, setClientes] = useState<Ref[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [vendedores, setVendedores] = useState<VendedorRef[]>([]);
  const [vendedorId, setVendedorId] = useState('');
  const [industriaId, setIndustriaId] = useState('');
  const [tabelas, setTabelas] = useState<TabelaRef[]>([]);
  const [tabelaId, setTabelaId] = useState('');
  const [dataEmissao, setDataEmissao] = useState(hoje());
  const [condicaoPagto, setCondicaoPagto] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // catálogo/preços
  const [gramaVigente, setGramaVigente] = useState<Record<string, { valorCentavos: number; id: string; teor?: number }>>({});
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<ProdutoBusca[]>([]);
  const [itens, setItens] = useState<ItemEmissao[]>([]);

  // valores
  const [frete, setFrete] = useState('');
  const [desconto, setDesconto] = useState('');
  const [pctEscritorio, setPctEscritorio] = useState('');

  // parcelas
  const [nParcelas, setNParcelas] = useState('1');
  const [primeiraParcela, setPrimeiraParcela] = useState(hoje());
  const [intervaloDias, setIntervaloDias] = useState('30');
  const [parcelas, setParcelas] = useState<ParcelaGerada[]>([]);

  const [emitindo, setEmitindo] = useState(false);

  useEffect(() => {
    void getDocs(query(collection(fb().db, 'clientes'), orderBy('razaoSocial'))).then((foto) =>
      setClientes(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['fantasia'] as string) || (d.data()['razaoSocial'] as string) }))),
    );
    void getDocs(collection(fb().db, 'vendedores')).then((foto) =>
      setVendedores(
        foto.docs
          .filter((d) => d.data()['ativo'] !== false)
          .map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id, regras: (d.data()['regras'] as RegraVendedorEntrada[]) ?? [] })),
      ),
    );
  }, []);

  const industria = industrias?.find((i) => i.id === industriaId);
  const vendedor = vendedores.find((v) => v.id === vendedorId);
  const porGrama = industria?.modeloPreco === 'porGrama';

  // tabelas da indústria filtradas pela matriz do vendedor
  useEffect(() => {
    setTabelaId('');
    setItens([]);
    if (!industriaId) {
      setTabelas([]);
      return;
    }
    return onSnapshot(query(collection(fb().db, 'industrias', industriaId, 'tabelasPreco'), orderBy('ordem')), (foto) =>
      setTabelas(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id, ...(d.data()['teor'] ? { teor: d.data()['teor'] as number } : {}) }))),
    );
  }, [industriaId]);

  const tabelasPermitidas = useMemo(() => {
    if (!vendedor || !industriaId) return tabelas;
    return tabelas.filter((t) => resolverRegraVendedor(vendedor.regras, industriaId, t.id));
  }, [tabelas, vendedor, industriaId]);

  const regra = vendedor && industriaId && tabelaId ? resolverRegraVendedor(vendedor.regras, industriaId, tabelaId) : undefined;

  // % escritório default da indústria
  useEffect(() => {
    if (!industriaId) return;
    void getDoc(doc(fb().db, 'industrias', industriaId)).then((foto) => {
      const pct = foto.data()?.['pctComissaoEscritorio'] as number | undefined;
      setPctEscritorio(pct ? String(pct).replace('.', ',') : '');
    });
  }, [industriaId]);

  // grama vigente por tabela
  useEffect(() => {
    if (!industriaId || !porGrama) {
      setGramaVigente({});
      return;
    }
    void getDocs(query(collection(fb().db, 'valoresGrama'), where('industriaId', '==', industriaId), orderBy('vigenciaInicio', 'desc'))).then((foto) => {
      const referencia = dataEmissao || hoje();
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
  }, [industriaId, porGrama, dataEmissao]);

  // busca de produtos
  useEffect(() => {
    if (!industriaId || busca.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const termo = busca.trim().toUpperCase();
    const timer = setTimeout(() => {
      void getDocs(
        query(collection(fb().db, 'produtos'), where('industriaId', '==', industriaId), orderBy('sku'), startAt(termo), endAt(termo + ''), limit(8)),
      ).then((foto) =>
        setSugestoes(foto.docs.map((d) => ({ id: d.id, sku: d.data()['sku'] as string, nome: d.data()['nome'] as string, ...(d.data()['pesoMg'] ? { pesoMg: d.data()['pesoMg'] as number } : {}) }))),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, industriaId]);

  async function adicionarItem(p: ProdutoBusca) {
    if (!tabelaId) {
      avisar('Escolha a tabela de preço antes de incluir itens.', 'erro');
      return;
    }
    let precoUnit: number;
    if (porGrama) {
      const grama = gramaVigente[tabelaId];
      if (!grama) {
        avisar('Sem valor do grama vigente para esta tabela — registre na indústria.', 'erro');
        return;
      }
      if (!p.pesoMg) {
        avisar(`${p.sku} não tem peso cadastrado — corrija no catálogo.`, 'erro');
        return;
      }
      precoUnit = precoPorGrama(p.pesoMg, grama.valorCentavos);
    } else {
      const precoDoc = await getDoc(doc(fb().db, 'produtos', p.id, 'precos', tabelaId));
      const preco = precoDoc.data()?.['precoCentavos'] as number | undefined;
      if (!preco) {
        avisar(`${p.sku} não tem preço na tabela escolhida.`, 'erro');
        return;
      }
      precoUnit = preco;
    }
    setItens((atuais) => {
      const existente = atuais.find((i) => i.produtoId === p.id);
      if (existente) return atuais.map((i) => (i.produtoId === p.id ? { ...i, qtde: i.qtde + 1, subtotalCentavos: subtotalItem(i.precoFinalCentavos, i.qtde + 1) } : i));
      return [
        ...atuais,
        {
          produtoId: p.id,
          sku: p.sku,
          descricao: p.nome,
          qtde: 1,
          ...(p.pesoMg ? { pesoMg: p.pesoMg } : {}),
          precoTabelaCentavos: precoUnit,
          precoFinalCentavos: precoUnit,
          subtotalCentavos: precoUnit,
        },
      ];
    });
    setBusca('');
    setSugestoes([]);
  }

  function mudarQtde(produtoId: string, texto: string) {
    const qtde = Number(texto.replace(',', '.'));
    if (!Number.isFinite(qtde) || qtde <= 0) return;
    setItens((atuais) => atuais.map((i) => (i.produtoId === produtoId ? { ...i, qtde, subtotalCentavos: subtotalItem(i.precoFinalCentavos, qtde) } : i)));
  }

  const somaItens = itens.reduce((s, i) => s + i.subtotalCentavos, 0);
  const paraCentavos = (t: string) => (t.trim() ? Math.round(Number(t.replace(/\./g, '').replace(',', '.')) * 100) : 0);
  const freteCentavos = paraCentavos(frete);
  const descontoCentavos = paraCentavos(desconto);
  let total = 0;
  try {
    total = totalPedido({ somaItensCentavos: somaItens, freteCentavos, descontoCentavos });
  } catch {
    total = 0;
  }

  function gerarParcelas() {
    if (total <= 0) {
      avisar('Inclua itens antes de gerar as parcelas.', 'erro');
      return;
    }
    try {
      setParcelas(gerarParcelasIguais(total, Number(nParcelas), primeiraParcela, Number(intervaloDias)));
    } catch {
      avisar('Confira a quantidade de parcelas e a data.', 'erro');
    }
  }

  const somaParcelas = parcelas.reduce((s, p) => s + p.valorCentavos, 0);
  const pctVendedor = regra?.comissaoProporcionalPct ?? 0;
  const pctEsc = Number(pctEscritorio.replace(',', '.')) || 0;

  async function confirmar() {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente || !vendedor || !industria || !tabelaId) {
      avisar('Preencha cliente, vendedor, indústria e tabela.', 'erro');
      return;
    }
    if (!regra) {
      avisar('O vendedor não tem esta tabela liberada na matriz — ajuste no cadastro do vendedor.', 'erro');
      return;
    }
    if (itens.length === 0) {
      avisar('Inclua ao menos um item.', 'erro');
      return;
    }
    if (parcelas.length === 0 || somaParcelas !== total) {
      avisar('Gere as parcelas — a soma precisa bater com o total.', 'erro');
      return;
    }
    setEmitindo(true);
    try {
      const industriaDoc = await getDoc(doc(fb().db, 'industrias', industriaId));
      const dadosInd = industriaDoc.data() ?? {};
      const grama = porGrama ? gramaVigente[tabelaId] : undefined;
      const { id, numero } = await emitirPedido({
        tipo,
        clienteId,
        clienteNome: cliente.nome,
        vendedorId,
        vendedorNome: vendedor.nome,
        industriaId,
        industriaNome: industria.nome,
        regimeComissao: (dadosInd['regimeComissao'] as 'mensalFixo' | 'posRecebimento') ?? 'posRecebimento',
        ...(dadosInd['diaPagtoComissao'] ? { diaPagtoComissao: dadosInd['diaPagtoComissao'] as number } : {}),
        ...(dadosInd['elegibilidadeComissao'] ? { elegibilidadeComissao: dadosInd['elegibilidadeComissao'] as 'pedidoQuitado' | 'porParcela' } : {}),
        tabelaId,
        dataEmissao,
        ...(condicaoPagto ? { condicaoPagto } : {}),
        ...(observacoes ? { observacoes } : {}),
        itens,
        freteCentavos,
        acrescimoCentavos: 0,
        descontoCentavos,
        ...(grama ? { valorGramaCongelado: { valorCentavos: grama.valorCentavos, valorGramaId: grama.id, ...(grama.teor ? { teor: grama.teor } : {}) } } : {}),
        pctComissaoEscritorio: pctEsc,
        pctComissaoVendedor: pctVendedor,
        parcelas,
      });
      avisar(`${tipo === 'pedido' ? 'Pedido' : 'Orçamento'} nº ${numero} emitido.`, 'sucesso');
      router.replace(`/pedidos/${id}`);
    } catch (excecao) {
      avisar((excecao as Error).message || 'Não foi possível emitir. Tente novamente.', 'erro');
    } finally {
      setEmitindo(false);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Novo {tipo === 'pedido' ? 'pedido' : 'orçamento'}</h1>
          <p className={estilos.subtitulo}>Nada é gravado até você confirmar a emissão.</p>
        </div>
      </div>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Cabeçalho</h2>
        <div className={estilos.grade}>
          <CampoSelect rotulo="Tipo *" value={tipo} onChange={(e) => setTipo(e.target.value as 'pedido' | 'orcamento')}>
            <option value="pedido">Pedido</option>
            <option value="orcamento">Orçamento</option>
          </CampoSelect>
          <CampoSelect rotulo="Cliente *" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Escolha…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </CampoSelect>
          <CampoSelect rotulo="Vendedor *" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            <option value="">Escolha…</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </CampoSelect>
          <CampoSelect rotulo="Indústria *" value={industriaId} onChange={(e) => setIndustriaId(e.target.value)}>
            <option value="">Escolha…</option>
            {(industrias ?? []).filter((i) => i.ativo).map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </CampoSelect>
          <CampoSelect
            rotulo="Tabela de preço *"
            value={tabelaId}
            onChange={(e) => setTabelaId(e.target.value)}
            disabled={!industriaId}
            {...(vendedorId && industriaId && tabelasPermitidas.length === 0 ? { erro: 'Vendedor sem tabela liberada nesta indústria' } : {})}
          >
            <option value="">Escolha…</option>
            {tabelasPermitidas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </CampoSelect>
          <CampoTexto rotulo="Data de emissão *" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
          <CampoTexto rotulo="Condição de pagamento" placeholder="ex.: 30/60/90" value={condicaoPagto} onChange={(e) => setCondicaoPagto(e.target.value)} />
          <CampoTexto rotulo="Observações" largo value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
        {regra && (
          <p style={{ margin: '12px 0 0', fontSize: 'var(--hb-corpo-sm)', color: 'var(--hb-texto-suave)' }}>
            Comissão: escritório <strong>{pctEscritorio || '0'}%</strong> · vendedor <strong>{pctVendedor}%</strong> (proporcional
            — matriz do vendedor).
          </p>
        )}
      </section>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Itens</h2>
        <div style={{ position: 'relative', maxWidth: 420, marginBottom: 14 }}>
          <input
            className={estilos.entrada}
            placeholder={tabelaId ? 'Buscar produto por SKU…' : 'Escolha indústria e tabela primeiro'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={!tabelaId}
            aria-label="Buscar produto"
          />
          {sugestoes.length > 0 && (
            <div
              style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--hb-superficie)', border: '1px solid var(--hb-borda)', borderRadius: 10, boxShadow: 'var(--hb-sombra-2)', overflow: 'hidden' }}
            >
              {sugestoes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void adicionarItem(p)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}
                >
                  <strong>{p.sku}</strong> — {p.nome}
                  {p.pesoMg ? ` · ${(p.pesoMg / 1000).toFixed(3).replace('.', ',')} g` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {itens.length === 0 ? (
          <p style={{ color: 'var(--hb-texto-suave)', margin: 0 }}>Nenhum item ainda — busque pelo código acima.</p>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descrição</th>
                <th>{porGrama ? 'Qtde (un)' : 'Qtde'}</th>
                <th>Unitário</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.produtoId} style={{ cursor: 'default' }}>
                  <td data-rotulo="SKU"><strong>{i.sku}</strong></td>
                  <td data-rotulo="Descrição">{i.descricao}</td>
                  <td data-rotulo="Qtde">
                    <input
                      className={estilos.entrada}
                      style={{ width: 90 }}
                      inputMode="decimal"
                      defaultValue={String(i.qtde).replace('.', ',')}
                      onBlur={(e) => mudarQtde(i.produtoId, e.target.value)}
                      aria-label={`Quantidade de ${i.sku}`}
                    />
                  </td>
                  <td data-rotulo="Unitário">{formatarCentavos(i.precoFinalCentavos)}</td>
                  <td data-rotulo="Subtotal"><strong>{formatarCentavos(i.subtotalCentavos)}</strong></td>
                  <td>
                    <button
                      onClick={() => setItens((a) => a.filter((x) => x.produtoId !== i.produtoId))}
                      aria-label={`Remover ${i.sku}`}
                      style={{ background: 'none', border: 'none', color: 'var(--hb-erro)', cursor: 'pointer', fontSize: 16 }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {porGrama && tabelaId && gramaVigente[tabelaId] && (
          <p style={{ margin: '12px 0 0', fontSize: 'var(--hb-legenda)', color: 'var(--hb-texto-suave)' }}>
            Grama vigente nesta tabela: <strong>{formatarCentavos(gramaVigente[tabelaId]!.valorCentavos)}/g</strong> — será
            congelado no pedido.
          </p>
        )}
      </section>

      <section className={estilos.card}>
        <h2 className={estilos.cardTitulo}>Valores e parcelas</h2>
        <div className={estilos.grade}>
          <CampoTexto rotulo="Frete (R$)" inputMode="decimal" placeholder="0,00" value={frete} onChange={(e) => setFrete(e.target.value)} />
          <CampoTexto rotulo="Desconto (R$)" inputMode="decimal" placeholder="0,00" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          <CampoTexto rotulo="% comissão do escritório" inputMode="decimal" value={pctEscritorio} onChange={(e) => setPctEscritorio(e.target.value)} />
        </div>

        <div className={estilos.grade} style={{ marginTop: 14 }}>
          <CampoTexto rotulo="Nº de parcelas" type="number" min={1} max={36} value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} />
          <CampoTexto rotulo="Primeiro vencimento" type="date" value={primeiraParcela} onChange={(e) => setPrimeiraParcela(e.target.value)} />
          <CampoTexto rotulo="Intervalo (dias)" type="number" min={1} value={intervaloDias} onChange={(e) => setIntervaloDias(e.target.value)} />
          <div className={estilos.campo} style={{ justifyContent: 'end' }}>
            <button type="button" className={estilos.botaoSecundario} onClick={gerarParcelas}>
              Gerar parcelas
            </button>
          </div>
        </div>

        {parcelas.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {parcelas.map((p) => (
              <StatusChip key={p.numero} tom={somaParcelas === total ? 'neutro' : 'erro'}>
                {`${p.numero}ª · ${formatarCentavos(p.valorCentavos)} · ${p.vencimento.split('-').reverse().join('/')}`}
              </StatusChip>
            ))}
          </div>
        )}
      </section>

      <section className={estilos.card} style={{ position: 'sticky', bottom: 12, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 'var(--hb-corpo-sm)', color: 'var(--hb-texto-suave)' }}>
            <span>Itens: <strong style={{ color: 'var(--hb-texto)' }}>{formatarCentavos(somaItens)}</strong></span>
            {freteCentavos > 0 && <span>Frete: <strong style={{ color: 'var(--hb-texto)' }}>{formatarCentavos(freteCentavos)}</strong></span>}
            {descontoCentavos > 0 && <span>Desconto: <strong style={{ color: 'var(--hb-erro)' }}>−{formatarCentavos(descontoCentavos)}</strong></span>}
            <span style={{ fontSize: 'var(--hb-corpo)' }}>
              Total: <strong style={{ color: 'var(--hb-primaria)', fontSize: 18 }}>{formatarCentavos(total)}</strong>
            </span>
          </div>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10 }}>
            <button className={estilos.botaoSecundario} onClick={() => router.push('/pedidos')} disabled={emitindo}>
              Cancelar
            </button>
            <button className={estilos.botaoPrimario} onClick={() => void confirmar()} disabled={emitindo}>
              {emitindo && <span className={estilos.girador} aria-hidden />}
              {emitindo ? 'Emitindo…' : `Emitir ${tipo === 'pedido' ? 'pedido' : 'orçamento'}`}
            </button>
          </span>
        </div>
      </section>
    </div>
  );
}
