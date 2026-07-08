import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import '@gestao-hb/ui/tokens.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--fonte-inter' });

export const metadata: Metadata = {
  title: 'Gestão HB',
  description: 'Gestão de pedidos, financeiro e comissões — HB Representações',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
