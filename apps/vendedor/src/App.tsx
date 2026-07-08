import { StatusChip } from '@gestao-hb/ui';

// Placeholder da fundação — o fluxo de pedido mobile-first entra na Fase 2,
// criado com a skill de frontend (seção 8 da especificação).
export function App() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 }}>
      <div
        style={{
          background: 'var(--hb-superficie)',
          borderRadius: 'var(--hb-raio-card)',
          boxShadow: 'var(--hb-sombra-1)',
          padding: '28px 24px',
          textAlign: 'center',
          width: '100%',
          maxWidth: 360,
        }}
      >
        <h1 style={{ color: 'var(--hb-primaria)', fontSize: 'var(--hb-titulo-2)', margin: '0 0 8px' }}>
          Gestão HB — Vendedor
        </h1>
        <p style={{ color: 'var(--hb-texto-suave)', margin: '0 0 16px' }}>
          PWA em construção. Instalável e com suporte offline.
        </p>
        <StatusChip tom="atencao">Aguardando Fase 2</StatusChip>
      </div>
    </main>
  );
}
