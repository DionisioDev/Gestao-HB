import type { CSSProperties, ReactNode } from 'react';
import type { TomStatus } from './status.js';

// tons de texto escurecidos p/ contraste AA (≥4.5:1) sobre os fundos suaves
const cores: Record<TomStatus, { bg: string; fg: string }> = {
  sucesso: { bg: 'var(--hb-sucesso-bg)', fg: '#176c30' },
  atencao: { bg: 'var(--hb-atencao-bg)', fg: '#7a5000' },
  erro: { bg: 'var(--hb-erro-bg)', fg: '#a50e0e' },
  info: { bg: 'var(--hb-info-bg)', fg: '#14549c' },
  neutro: { bg: 'var(--hb-acento)', fg: '#4c5866' },
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
