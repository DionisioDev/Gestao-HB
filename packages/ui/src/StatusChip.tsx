import type { CSSProperties, ReactNode } from 'react';
import type { TomStatus } from './status.js';

const cores: Record<TomStatus, { bg: string; fg: string }> = {
  sucesso: { bg: 'var(--hb-sucesso-bg)', fg: 'var(--hb-sucesso)' },
  atencao: { bg: 'var(--hb-atencao-bg)', fg: '#8a5a00' },
  erro: { bg: 'var(--hb-erro-bg)', fg: 'var(--hb-erro)' },
  info: { bg: 'var(--hb-info-bg)', fg: 'var(--hb-acao)' },
  neutro: { bg: 'var(--hb-acento)', fg: 'var(--hb-texto-suave)' },
};

export interface StatusChipProps {
  tom: TomStatus;
  children: ReactNode;
}

/** Chip de status Material 3 — mesma aparência para o mesmo status em qualquer tela (seção 6). */
export function StatusChip({ tom, children }: StatusChipProps) {
  const { bg, fg } = cores[tom];
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px',
    borderRadius: 999,
    background: bg,
    color: fg,
    fontSize: 'var(--hb-legenda)',
    fontWeight: 600,
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  };
  return (
    <span style={style}>
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}
      />
      {children}
    </span>
  );
}
