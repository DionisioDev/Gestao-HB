import type { StatusPedido } from '@gestao-hb/core';
import { formatarCentavos, rotuloStatusPedido, StatusChip, tomStatusPedido } from '@gestao-hb/ui';
import { collection, doc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fb } from '../lib/firebase';
import './pedido.css';

interface PedidoDoc {
  numero: number;
  tipo: string;
  clienteNome: string;
  industriaNome: string;
  dataEmissao: string;
  status: StatusPedido;
  condicaoPagto?: string;
  itens: Array<{ sku: string; descricao: string; qtde: number; precoFinalCentavos: number; subtotalCentavos: number }>;
  totais: { itensCentavos: number; freteCentavos: number; descontoCentavos: number; totalCentavos: number };
  valorGramaCongelado?: { valorCentavos: number };
}

interface ParcelaDoc {
  numero: number;
  de: number;
  valorCentavos: number;
  valorRecebidoCentavos: number;
  vencimento: string;
  status: string;
}

interface ComissaoDoc {
  status: string;
  vendedor: { valorCentavos: number; pctProporcional: number };
}

const ROTULO_COMISSAO: Record<string, string> = {
  aguardandoPagtoCliente: 'Aguardando pagamento do cliente',
  elegivel: 'Confirmada — no próximo fechamento',
  fechada: 'Fechada — a pagar',
  paga: 'Paga',
  estornada: 'Estornada',
};

export function Pedido() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const [pedido, setPedido] = useState<PedidoDoc | null>(null);
  const [parcelas, setParcelas] = useState<ParcelaDoc[]>([]);
  const [comissao, setComissao] = useState<ComissaoDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    const parar = onSnapshot(doc(fb().db, 'pedidos', id), (foto) => {
      if (!foto.exists()) {
        navegar('/', { replace: true });
        return;
      }
      setPedido(foto.data() as PedidoDoc);
    });
    const pararParcelas = onSnapshot(query(collection(fb().db, 'pedidos', id, 'parcelas'), orderBy('numero')), (foto) =>
      setParcelas(foto.docs.map((d) => d.data() as ParcelaDoc)),
    );
    void getDocs(query(collection(fb().db, 'comissoes'), where('pedidoId', '==', id))).then((foto) => {
      const primeiro = foto.docs[0];
      if (primeiro) setComissao(primeiro.data() as ComissaoDoc);
    });
    return () => {
      parar();
      pararParcelas();
    };
  }, [id, navegar]);

  if (!pedido) {
    return <div className="ped-carregando" role="status" aria-label="Carregando" />;
  }

  return (
    <div className="ped">
      <header className="ped-topo">
        <button className="ped-voltar" onClick={() => navegar('/')} aria-label="Voltar">
          ‹
        </button>
        <div>
          <div className="ped-titulo">
            {pedido.tipo === 'orcamento' ? 'Orçamento' : 'Pedido'} nº {pedido.numero}
          </div>
          <div className="ped-sub">{pedido.clienteNome}</div>
        </div>
      </header>

      <main className="ped-corpo">
        <div className="ped-cartao ped-linha-status">
          <StatusChip tom={tomStatusPedido[pedido.status]}>{rotuloStatusPedido[pedido.status]}</StatusChip>
          <span className="ped-suave">
            {pedido.industriaNome} · {pedido.dataEmissao?.split('-').reverse().join('/')}
          </span>
        </div>

        {comissao && (
          <div className="ped-cartao">
            <div className="ped-cartao-titulo">Sua comissão</div>
            <div className="ped-comissao">
              <strong>{formatarCentavos(comissao.vendedor.valorCentavos)}</strong>
              <StatusChip tom={comissao.status === 'paga' ? 'sucesso' : comissao.status === 'estornada' ? 'erro' : comissao.status === 'aguardandoPagtoCliente' ? 'atencao' : 'info'}>
                {ROTULO_COMISSAO[comissao.status] ?? comissao.status}
              </StatusChip>
            </div>
          </div>
        )}

        <div className="ped-cartao">
          <div className="ped-cartao-titulo">Itens ({pedido.itens.length})</div>
          <ul className="ped-itens">
            {pedido.itens.map((i) => (
              <li key={i.sku}>
                <span className="ped-item-desc">
                  {String(i.qtde).replace('.', ',')}× <strong>{i.sku}</strong> {i.descricao}
                </span>
                <span>{formatarCentavos(i.subtotalCentavos)}</span>
              </li>
            ))}
          </ul>
          <div className="ped-total">
            <span>Total</span>
            <strong>{formatarCentavos(pedido.totais.totalCentavos)}</strong>
          </div>
          {pedido.valorGramaCongelado && (
            <p className="ped-suave ped-nota">Grama congelado: {formatarCentavos(pedido.valorGramaCongelado.valorCentavos)}/g</p>
          )}
        </div>

        <div className="ped-cartao">
          <div className="ped-cartao-titulo">Parcelas{pedido.condicaoPagto ? ` · ${pedido.condicaoPagto}` : ''}</div>
          <ul className="ped-itens">
            {parcelas.map((p) => (
              <li key={p.numero}>
                <span className="ped-item-desc">
                  {p.numero}/{p.de} · vence {p.vencimento?.split('-').reverse().join('/')}
                </span>
                <span className="ped-parcela-direita">
                  {formatarCentavos(p.valorCentavos)}
                  <StatusChip tom={p.status === 'pago' ? 'sucesso' : 'atencao'}>
                    {p.status === 'pago' ? 'Paga' : p.status === 'parcial' ? 'Parcial' : 'Aberta'}
                  </StatusChip>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
