import type { StatusPedido } from '@gestao-hb/core';
import { formatarCentavos, rotuloStatusPedido, StatusChip, tomStatusPedido } from '@gestao-hb/ui';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fb } from '../lib/firebase';
import './home.css';

interface PedidoResumo {
  id: string;
  numero: number;
  tipo: 'pedido' | 'orcamento';
  clienteNome: string;
  industriaNome: string;
  dataEmissao: string;
  status: StatusPedido;
  totais?: { totalCentavos: number };
}

interface ComissaoResumo {
  status: string;
  elegibilidade?: string;
  escritorio?: { valorCentavos: number };
  vendedor: { valorCentavos: number; pctProporcional: number };
  valorElegivelEscritorioCentavos?: number;
}

export function Home() {
  const { nome, vendedorId, sair } = useAuth();
  const navegar = useNavigate();
  const [pedidos, setPedidos] = useState<PedidoResumo[] | null>(null);
  const [comissoes, setComissoes] = useState<ComissaoResumo[]>([]);

  useEffect(() => {
    if (!vendedorId) return;
    return onSnapshot(query(collection(fb().db, 'comissoes'), where('vendedorId', '==', vendedorId)), (foto) =>
      setComissoes(foto.docs.map((d) => d.data() as ComissaoResumo)),
    );
  }, [vendedorId]);

  // previsão em duas faixas (especificação §2.5): confirmado × aguardando pagamento do cliente
  const valorVendedor = (c: ComissaoResumo) =>
    c.elegibilidade === 'porParcela' && c.valorElegivelEscritorioCentavos != null
      ? Math.round((c.valorElegivelEscritorioCentavos * c.vendedor.pctProporcional) / 100)
      : c.vendedor.valorCentavos;
  const confirmado = comissoes
    .filter((c) => ['elegivel', 'fechada'].includes(c.status))
    .reduce((s, c) => s + valorVendedor(c), 0);
  const aguardando = comissoes
    .filter((c) => c.status === 'aguardandoPagtoCliente')
    .reduce((s, c) => s + c.vendedor.valorCentavos, 0);

  useEffect(() => {
    if (!vendedorId) return;
    return onSnapshot(
      query(
        collection(fb().db, 'pedidos'),
        where('vendedorId', '==', vendedorId),
        orderBy('numero', 'desc'),
        limit(50),
      ),
      (foto) => setPedidos(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PedidoResumo, 'id'>) }))),
      () => setPedidos([]),
    );
  }, [vendedorId]);

  const primeiroNome = nome.split(' ')[0] ?? nome;

  return (
    <div className="home">
      <header className="home-topo">
        <div>
          <div className="home-ola">Olá, {primeiroNome}</div>
          <div className="home-sub">Seus pedidos</div>
        </div>
        <button className="home-sair" onClick={() => void sair()} aria-label="Sair">
          Sair
        </button>
      </header>

      <main className="home-corpo">
        <div className="home-previsao">
          <div className="home-faixa home-faixa-confirmado">
            <span className="home-faixa-rotulo">Comissão confirmada</span>
            <strong>{formatarCentavos(confirmado)}</strong>
          </div>
          <div className="home-faixa home-faixa-aguardando">
            <span className="home-faixa-rotulo">Aguardando pagto do cliente</span>
            <strong>{formatarCentavos(aguardando)}</strong>
          </div>
        </div>

        {!pedidos ? (
          <div aria-busy="true">
            <div className="home-esqueleto" />
            <div className="home-esqueleto" />
            <div className="home-esqueleto" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="home-vazio">
            <strong>Nenhum pedido ainda</strong>
            Seus pedidos e orçamentos aparecerão aqui. Toque no botão + para emitir o primeiro.
          </div>
        ) : (
          <ul className="home-lista">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className="home-pedido"
                role="link"
                tabIndex={0}
                onClick={() => navegar(`/pedido/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navegar(`/pedido/${p.id}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
                aria-label={`Pedido ${p.numero} de ${p.clienteNome}`}
              >
                <div className="home-pedido-linha">
                  <strong>
                    Nº {p.numero}
                    {p.tipo === 'orcamento' && <span className="home-orc"> orç.</span>}
                  </strong>
                  <StatusChip tom={tomStatusPedido[p.status]}>{rotuloStatusPedido[p.status]}</StatusChip>
                </div>
                <div className="home-pedido-cliente">{p.clienteNome}</div>
                <div className="home-pedido-linha home-pedido-rodape">
                  <span>
                    {p.industriaNome} · {p.dataEmissao?.split('-').reverse().join('/')}
                  </span>
                  <strong>{formatarCentavos(p.totais?.totalCentavos ?? 0)}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <button className="home-fab" aria-label="Novo pedido" onClick={() => navegar('/novo')}>
        +
      </button>
    </div>
  );
}
