'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode, type SVGProps } from 'react';
import { useAuth } from '../../lib/auth';
import estilos from './painel.module.css';

type Icone = (props: SVGProps<SVGSVGElement>) => ReactNode;

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const IconePainel: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
const IconeIndustria: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <path d="M3 21V9l6 4V9l6 4V5l6-2v18Z" />
    <path d="M7 17h.01M11 17h.01M15 17h.01" />
  </svg>
);
const IconeProduto: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <path d="M6 3h12l3 6-9 12L3 9Z" />
    <path d="M3 9h18M9.5 9 12 21l2.5-12" />
  </svg>
);
const IconeCliente: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    <circle cx="17.5" cy="9.5" r="2.5" />
    <path d="M16 15.2c2.6.2 4.6 1.7 5.4 4.3" />
  </svg>
);
const IconeVendedor: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <rect x="3" y="6" width="18" height="15" rx="2" />
    <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M12 11v4M9 13h6" />
  </svg>
);
const IconeUsuario: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.9-3.4 3.7-5.3 7-5.3s6.1 1.9 7 5.3" />
  </svg>
);
const IconeAuditoria: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <path d="M12 3 5 6v5c0 4.4 2.9 8.2 7 10 4.1-1.8 7-5.6 7-10V6Z" />
    <path d="m9.5 12 2 2 3.5-4" />
  </svg>
);
const IconeSair: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
    <path d="M9 12h11m0 0-3-3m3 3-3 3" />
  </svg>
);
const IconeMenu: Icone = (p) => (
  <svg viewBox="0 0 24 24" {...traco} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const MENU: Array<{ rotulo: string; rota: string; Icone: Icone; pronto: boolean }> = [
  { rotulo: 'Painel', rota: '/', Icone: IconePainel, pronto: true },
  { rotulo: 'Indústrias', rota: '/industrias', Icone: IconeIndustria, pronto: true },
  { rotulo: 'Produtos', rota: '/produtos', Icone: IconeProduto, pronto: true },
  { rotulo: 'Clientes', rota: '/clientes', Icone: IconeCliente, pronto: false },
  { rotulo: 'Vendedores', rota: '/vendedores', Icone: IconeVendedor, pronto: true },
  { rotulo: 'Usuários', rota: '/usuarios', Icone: IconeUsuario, pronto: true },
  { rotulo: 'Auditoria', rota: '/auditoria', Icone: IconeAuditoria, pronto: false },
];

export default function LayoutPainel({ children }: { children: ReactNode }) {
  const { status, usuario, perfil, sair } = useAuth();
  const router = useRouter();
  const rota = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (status === 'deslogado') router.replace('/login');
  }, [status, router]);

  useEffect(() => setMenuAberto(false), [rota]);

  if (status !== 'logado') {
    return (
      <div className={estilos.carregando} role="status" aria-label="Carregando">
        <span className={estilos.giradorGrande} />
      </div>
    );
  }

  const nome = usuario?.displayName || usuario?.email || 'Usuário';
  const inicial = nome.charAt(0).toUpperCase();

  const sidebar = (
    <aside className={`${estilos.sidebar} ${menuAberto ? estilos.sidebarAberta : ''}`}>
      <div className={estilos.logo}>
        {/* espaço reservado para a logo definitiva (seção 6) */}
        <div className={estilos.logoCirculo} aria-hidden>
          HB
        </div>
        <div>
          <div className={estilos.logoNome}>Gestão HB</div>
          <div className={estilos.logoSub}>Representações</div>
        </div>
      </div>

      <nav className={estilos.nav} aria-label="Módulos">
        {MENU.map(({ rotulo, rota: r, Icone, pronto }) =>
          pronto ? (
            <Link key={r} href={r} className={estilos.navItem} aria-current={rota === r ? 'page' : undefined}>
              <Icone className={estilos.navIcone} aria-hidden />
              {rotulo}
            </Link>
          ) : (
            <span key={r} className={`${estilos.navItem} ${estilos.navDesabilitado}`} aria-disabled>
              <Icone className={estilos.navIcone} aria-hidden />
              {rotulo}
              <span className={estilos.emBreve}>em breve</span>
            </span>
          ),
        )}
      </nav>

      <div className={estilos.usuario}>
        <div className={estilos.avatar} aria-hidden>
          {inicial}
        </div>
        <div className={estilos.usuarioInfo}>
          <div className={estilos.usuarioNome}>{nome}</div>
          <div className={estilos.usuarioPerfil}>{perfil === 'admin' ? 'Administrador' : 'Vendedor'}</div>
        </div>
        <button className={estilos.sairBotao} onClick={() => void sair()} title="Sair" aria-label="Sair">
          <IconeSair width={19} height={19} aria-hidden />
        </button>
      </div>
    </aside>
  );

  return (
    <div className={estilos.shell}>
      <header className={estilos.topoMobile}>
        <button className={estilos.hamburger} onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
          <IconeMenu width={22} height={22} aria-hidden />
        </button>
        <strong>Gestão HB</strong>
      </header>

      {menuAberto && <div className={estilos.veu} onClick={() => setMenuAberto(false)} aria-hidden />}
      {sidebar}

      <main className={estilos.conteudo}>{children}</main>
    </div>
  );
}
