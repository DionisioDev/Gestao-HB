import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@gestao-hb/ui/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestão HB',
  description: 'Gestão de pedidos, financeiro e comissões — HB Representações',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
