import { StatusChip } from '@gestao-hb/ui';

// Placeholder da fundação — as telas reais entram módulo a módulo (Fase 1+),
// sempre criadas com a skill de frontend (seção 8 da especificação).
export default function Home() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 24 }}>
      <div
        style={{
          background: 'var(--hb-superficie)',
          borderRadius: 'var(--hb-raio-card)',
          boxShadow: 'var(--hb-sombra-1)',
          padding: '32px 40px',
          textAlign: 'center',
          maxWidth: 420,
        }}
      >
        <h1 style={{ color: 'var(--hb-primaria)', fontSize: 'var(--hb-titulo-1)', margin: '0 0 8px' }}>
          Gestão HB
        </h1>
        <p style={{ color: 'var(--hb-texto-suave)', margin: '0 0 16px' }}>
          Fundação do web admin — módulos em construção.
        </p>
        <StatusChip tom="info">Fase 1 — Núcleo</StatusChip>
      </div>
    </main>
  );
}
