'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Tom = 'sucesso' | 'erro' | 'info';

interface Snack {
  id: number;
  mensagem: string;
  tom: Tom;
}

const Contexto = createContext<((mensagem: string, tom?: Tom) => void) | null>(null);

const CORES: Record<Tom, string> = {
  sucesso: 'var(--hb-sucesso)',
  erro: 'var(--hb-erro)',
  info: 'var(--hb-primaria)',
};

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const proximoId = useRef(1);

  const avisar = useCallback((mensagem: string, tom: Tom = 'info') => {
    const id = proximoId.current++;
    setSnacks((s) => [...s.slice(-2), { id, mensagem, tom }]);
    setTimeout(() => setSnacks((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          translate: '-50% 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 100,
          width: 'min(92vw, 440px)',
        }}
      >
        {snacks.map((s) => (
          <div
            key={s.id}
            role="status"
            style={{
              background: CORES[s.tom],
              color: '#fff',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: 'var(--hb-sombra-2)',
              fontSize: 'var(--hb-corpo-sm)',
              lineHeight: 1.45,
              animation: 'hbSnackSubir 200ms cubic-bezier(0.2,0,0,1) both',
            }}
          >
            {s.mensagem}
          </div>
        ))}
      </div>
      <style>{`@keyframes hbSnackSubir { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </Contexto.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSnackbar precisa do SnackbarProvider');
  return ctx;
}
