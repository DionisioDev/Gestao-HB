'use client';

import { formatarCentavos } from '@gestao-hb/ui';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CampoSelect, CampoTexto } from '../../../components/campos';
import estilos from '../../../components/ui.module.css';
import { centavosParaCsv, exportarCsv } from '../../../lib/csv';
import { fb } from '../../../lib/firebase';
import { useIndustrias } from '../../../lib/industrias';

type TipoRelatorio = 'vendas-industria' | 'vendas-vendedor' | 'comissoes-industria' | 'comissoes-vendedor';

const RELATORIOS: Record<TipoRelatorio, { nome: string; descricao: string }> = {
  'vendas-industria': {
    nome: 'Vendas por indústria',
    descricao: 'Total vendido e nº de pedidos por indústria no período, do maior para o menor.',
  },
  'vendas-vendedor': {
    nome: 'Vendas por vendedor',
    descricao: 'Total vendido, pedidos e comissão prevista de cada vendedor no período.',
  },
  'comissoes-industria': {
    nome: 'Comissões por indústria',
    descricao: 'Comissão do escritório: recebida × a receber × aguardando cliente (como os relatórios 1039/1040 do sistema antigo).',
  },
  'comissoes-vendedor': {
    nome: 'Comissões por vendedor',
    descricao: 'Parte dos vendedores: prevista × confirmada × paga no período.',
  },
};

interface PedidoRel {
  id: string;
  clienteNome: string;
  vendedorId: string;
  vendedorNome: string;
  industriaId: string;
  industriaNome: string;
  tipo: string;
  status: string;
  dataEmissao: string;
  totais?: { totalCentavos: number };
}

interface ComissaoRel {
  pedidoId: string;
  status: string;
  escritorio: { valorCentavos: number };
  vendedor: { valorCentavos: number };
}

interface Linha {
  chave: string;
  celulas: (string | number)[];
}

const inicioDoMes = () => `${new Date().toISOString().slice(0, 7)}-01`;
const hoje = () => new Date().toISOString().slice(0, 10);

export default function PaginaRelatorios() {
  const industrias = useIndustrias();
  const [tipo, setTipo] = useState<TipoRelatorio>('vendas-industria');
  const [dataDe, setDataDe] = useState(inicioDoMes());
  const [dataAte, setDataAte] = useState(hoje());
  const [filtroIndustria, setFiltroIndustria] = useState('');
  const [pedidos, setPedidos] = useState<PedidoRel[] | null>(null);
  const [comissoes, setComissoes] = useState<ComissaoRel[]>([]);
  const [gerando, setGerando] = useState(false);

  const gerar = useCallback(async () => {
    setGerando(true);
    try {
      const fotoPedidos = await getDocs(
        query(
          collection(fb().db, 'pedidos'),
          where('dataEmissao', '>=', dataDe),
          where('dataEmissao', '<=', dataAte),
          orderBy('dataEmissao'),
        ),
      );
      const lista = fotoPedidos.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PedidoRel, 'id'>) }))
        .filter((p) => p.tipo === 'pedido' && p.status !== 'cancelado')
        .filter((p) => !filtroIndustria || p.industriaId === filtroIndustria);
      setPedidos(lista);
      const fotoComissoes = await getDocs(collection(fb().db, 'comissoes'));
      setComissoes(fotoComissoes.docs.map((d) => d.data() as ComissaoRel));
    } finally {
      setGerando(false);
    }
  }, [dataDe, dataAte, filtroIndustria]);

  useEffect(() => {
    void gerar();
  }, [gerar]);

  const { cabecalhos, linhas, totais } = useMemo((): { cabecalhos: string[]; linhas: Linha[]; totais: (string | number)[] } => {
    if (!pedidos) return { cabecalhos: [], linhas: [], totais: [] };
    const idsPedidos = new Set(pedidos.map((p) => p.id));
    const comissoesDoPeriodo = comissoes.filter((c) => idsPedidos.has(c.pedidoId) && c.status !== 'estornada');
    const comissaoPorPedido = new Map(comissoesDoPeriodo.map((c) => [c.pedidoId, c]));

    const agrupar = (chaveDe: (p: PedidoRel) => [string, string]) => {
      const mapa = new Map<string, { rotulo: string; pedidos: PedidoRel[] }>();
      for (const p of pedidos) {
        const [chave, rotulo] = chaveDe(p);
        const grupo = mapa.get(chave) ?? { rotulo, pedidos: [] };
        grupo.pedidos.push(p);
        mapa.set(chave, grupo);
      }
      return mapa;
    };
    const soma = (ps: PedidoRel[]) => ps.reduce((s, p) => s + (p.totais?.totalCentavos ?? 0), 0);
    const somaComissao = (ps: PedidoRel[], de: (c: ComissaoRel) => number, filtro?: (c: ComissaoRel) => boolean) =>
      ps.reduce((s, p) => {
        const c = comissaoPorPedido.get(p.id);
        return s + (c && (!filtro || filtro(c)) ? de(c) : 0);
      }, 0);

    if (tipo === 'vendas-industria' || tipo === 'vendas-vendedor') {
      const grupos = agrupar((p) =>
        tipo === 'vendas-industria' ? [p.industriaId, p.industriaNome] : [p.vendedorId, p.vendedorNome],
      );
      const linhas = [...grupos.values()]
        .map((g) => ({ rotulo: g.rotulo, qtde: g.pedidos.length, total: soma(g.pedidos), comissao: somaComissao(g.pedidos, (c) => c.vendedor.valorCentavos) }))
        .sort((a, b) => b.total - a.total)
        .map((g) => ({
          chave: g.rotulo,
          celulas:
            tipo === 'vendas-industria'
              ? [g.rotulo, g.qtde, formatarCentavos(g.total), formatarCentavos(Math.round(g.total / Math.max(g.qtde, 1)))]
              : [g.rotulo, g.qtde, formatarCentavos(g.total), formatarCentavos(g.comissao)],
        }));
      const totalGeral = soma(pedidos);
      return tipo === 'vendas-industria'
        ? {
            cabecalhos: ['Indústria', 'Pedidos', 'Total vendido', 'Ticket médio'],
            linhas,
            totais: ['Total', pedidos.length, formatarCentavos(totalGeral), ''],
          }
        : {
            cabecalhos: ['Vendedor', 'Pedidos', 'Total vendido', 'Comissão prevista'],
            linhas,
            totais: ['Total', pedidos.length, formatarCentavos(totalGeral), formatarCentavos(somaComissao(pedidos, (c) => c.vendedor.valorCentavos))],
          };
    }

    // comissões (escritório ou vendedor) por grupo
    const doEscritorio = tipo === 'comissoes-industria';
    const valorDe = (c: ComissaoRel) => (doEscritorio ? c.escritorio.valorCentavos : c.vendedor.valorCentavos);
    const grupos = agrupar((p) => (doEscritorio ? [p.industriaId, p.industriaNome] : [p.vendedorId, p.vendedorNome]));
    const linhas = [...grupos.values()]
      .map((g) => {
        const prevista = somaComissao(g.pedidos, valorDe);
        const confirmada = somaComissao(g.pedidos, valorDe, (c) => ['elegivel', 'fechada'].includes(c.status));
        const paga = somaComissao(g.pedidos, valorDe, (c) => c.status === 'paga');
        const aguardando = somaComissao(g.pedidos, valorDe, (c) => c.status === 'aguardandoPagtoCliente');
        return { rotulo: g.rotulo, prevista, confirmada, paga, aguardando };
      })
      .sort((a, b) => b.prevista - a.prevista)
      .map((g) => ({
        chave: g.rotulo,
        celulas: [g.rotulo, formatarCentavos(g.prevista), formatarCentavos(g.confirmada), formatarCentavos(g.paga), formatarCentavos(g.aguardando)],
      }));
    const total = (filtro?: (c: ComissaoRel) => boolean) => somaComissao(pedidos, valorDe, filtro);
    return {
      cabecalhos: [doEscritorio ? 'Indústria' : 'Vendedor', 'Prevista', 'Confirmada (a receber)', 'Paga', 'Aguardando cliente'],
      linhas,
      totais: [
        'Total',
        formatarCentavos(total()),
        formatarCentavos(total((c) => ['elegivel', 'fechada'].includes(c.status))),
        formatarCentavos(total((c) => c.status === 'paga')),
        formatarCentavos(total((c) => c.status === 'aguardandoPagtoCliente')),
      ],
    };
  }, [pedidos, comissoes, tipo]);

  function exportar() {
    const paraCsv = (v: string | number) =>
      typeof v === 'string' && v.startsWith('R$') ? centavosParaCsv(Math.round(Number(v.replace(/[R$\s.]/g, '').replace(',', '.')) * 100)) : v;
    exportarCsv(
      `${tipo}-${dataDe}-a-${dataAte}`,
      cabecalhos,
      [...linhas.map((l) => l.celulas.map(paraCsv)), totais.map(paraCsv)],
    );
  }

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Relatórios</h1>
          <p className={estilos.subtitulo}>{RELATORIOS[tipo].descricao}</p>
        </div>
        <button className={estilos.botaoSecundario} onClick={exportar} disabled={linhas.length === 0}>
          Exportar CSV
        </button>
      </div>

      <section className={estilos.card}>
        <div className={estilos.grade}>
          <CampoSelect rotulo="Relatório" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRelatorio)}>
            {Object.entries(RELATORIOS).map(([valor, r]) => (
              <option key={valor} value={valor}>
                {r.nome}
              </option>
            ))}
          </CampoSelect>
          <CampoTexto rotulo="De" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
          <CampoTexto rotulo="Até" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
          <CampoSelect rotulo="Indústria" value={filtroIndustria} onChange={(e) => setFiltroIndustria(e.target.value)}>
            <option value="">Todas</option>
            {(industrias ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </CampoSelect>
        </div>
      </section>

      <div className={estilos.tabelaEnvoltorio}>
        {gerando || !pedidos ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : linhas.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>Sem dados no período</strong>
            Ajuste as datas ou os filtros — apenas pedidos (não orçamentos) e não cancelados entram.
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                {cabecalhos.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} style={{ cursor: 'default' }}>
                  {l.celulas.map((c, i) => (
                    <td key={i} data-rotulo={cabecalhos[i]}>
                      {i === 0 ? <strong>{c}</strong> : c}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ cursor: 'default', background: 'var(--hb-acento)' }}>
                {totais.map((c, i) => (
                  <td key={i} data-rotulo={cabecalhos[i]}>
                    <strong>{c}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
