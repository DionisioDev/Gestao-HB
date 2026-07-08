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

export function Home() {
  const { nome, vendedorId, sair } = useAuth();
  const navegar = useNavigate();
  const [pedidos, setPedidos] = useState<PedidoResumo[] | null>(null);

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
              <li key={p.id} className="home-pedido">
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
