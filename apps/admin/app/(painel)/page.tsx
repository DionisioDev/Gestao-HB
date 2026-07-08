import { StatusChip } from '@gestao-hb/ui';

// Painel do gestor — os widgets reais (totais do mês, pedidos por status,
// comissões a fechar) entram com os módulos das próximas fases.
export default function PaginaPainel() {
  return (
    <div>
      <h1 style={{ color: 'var(--hb-primaria)', fontSize: 'var(--hb-titulo-1)', margin: '0 0 4px' }}>Painel</h1>
      <p style={{ color: 'var(--hb-texto-suave)', margin: '0 0 24px' }}>
        Bem-vindo ao Gestão HB. Os módulos serão liberados conforme as fases do projeto.
      </p>
      <div
        style={{
          background: 'var(--hb-superficie)',
          borderRadius: 'var(--hb-raio-card)',
          boxShadow: 'var(--hb-sombra-1)',
          padding: '24px 28px',
          maxWidth: 520,
        }}
      >
        <h2 style={{ fontSize: 'var(--hb-titulo-2)', color: 'var(--hb-primaria)', margin: '0 0 8px' }}>
          Fase 1 — Núcleo de cadastros
        </h2>
        <p style={{ color: 'var(--hb-texto-suave)', lineHeight: 1.6, margin: '0 0 16px' }}>
          Indústrias, tabelas com valor do grama, produtos, clientes, vendedores e usuários — em
          construção, na ordem do brief.
        </p>
        <StatusChip tom="info">Em andamento</StatusChip>
      </div>
    </div>
  );
}
