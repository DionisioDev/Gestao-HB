import type { ReactNode } from 'react';
import { Navigate, Route, HashRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { SnackbarProvider } from './lib/snackbar';
import { Home } from './views/Home';
import { Login } from './views/Login';
import { NovoPedido } from './views/NovoPedido';

function AreaProtegida({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'carregando') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }} role="status" aria-label="Carregando">
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '3px solid var(--hb-borda)',
            borderTopColor: 'var(--hb-acao)',
            animation: 'girarApp 700ms linear infinite',
            display: 'inline-block',
          }}
        />
        <style>{`@keyframes girarApp { to { rotate: 360deg; } }`}</style>
      </div>
    );
  }
  if (status === 'deslogado') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AreaProtegida>
                  <Home />
                </AreaProtegida>
              }
            />
            <Route
              path="/novo"
              element={
                <AreaProtegida>
                  <NovoPedido />
                </AreaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </SnackbarProvider>
    </AuthProvider>
  );
}
