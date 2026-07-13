'use client';

import type { KeyboardEvent } from 'react';

/**
 * Torna uma linha de tabela clicável também navegável por teclado (WCAG 2.1.1):
 * foco via Tab, ativação com Enter/Espaço e semântica de link.
 */
export function linhaClicavel(aoAtivar: () => void) {
  return {
    tabIndex: 0,
    role: 'link' as const,
    onClick: aoAtivar,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        aoAtivar();
      }
    },
  };
}
