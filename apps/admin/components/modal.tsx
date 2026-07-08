'use client';

import { useEffect, type ReactNode } from 'react';
import estilos from './ui.module.css';

/** Modal de confirmação para ações sensíveis (Anexo A.5 — explica a consequência). */
export function ModalConfirmacao({
  titulo,
  children,
  rotuloConfirmar,
  tomPerigo = false,
  ocupado = false,
  aoConfirmar,
  aoCancelar,
}: {
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  tomPerigo?: boolean;
  ocupado?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoCancelar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 16 }}
    >
      <div
        onClick={aoCancelar}
        style={{ position: 'absolute', inset: 0, background: 'rgba(15,42,67,0.45)', animation: 'uiAparecer 150ms both' }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--hb-superficie)',
          borderRadius: 'var(--hb-raio-card)',
          boxShadow: 'var(--hb-sombra-2)',
          padding: '24px 26px',
          width: 'min(92vw, 440px)',
          animation: 'uiAparecer 200ms cubic-bezier(0.2,0,0,1) both',
        }}
      >
        <h2 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--hb-primaria)' }}>{titulo}</h2>
        <div style={{ color: 'var(--hb-texto-suave)', lineHeight: 1.55, fontSize: 'var(--hb-corpo-sm)' }}>{children}</div>
        <div className={estilos.acoesForm} style={{ marginTop: 18 }}>
          <button className={estilos.botaoSecundario} onClick={aoCancelar} disabled={ocupado}>
            Cancelar
          </button>
          <button
            className={estilos.botaoPrimario}
            style={tomPerigo ? { background: 'var(--hb-erro)' } : undefined}
            onClick={aoConfirmar}
            disabled={ocupado}
            autoFocus
          >
            {ocupado && <span className={estilos.girador} aria-hidden />}
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
