'use client';

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fb } from './firebase';

const SESSAO_MAX_MS = 24 * 60 * 60 * 1000;

export type Perfil = 'admin' | 'vendedor';

export interface Sessao {
  status: 'carregando' | 'deslogado' | 'logado';
  usuario: User | null;
  perfil: Perfil | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
}

const ContextoAuth = createContext<Sessao | null>(null);

/** Mensagens de erro acionáveis (seção 8: o que houve + o que fazer). */
export function mensagemErroAuth(codigo: string): string {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos ou redefina sua senha.';
    case 'auth/user-disabled':
      return 'Esta conta está desativada. Fale com o administrador.';
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique a digitação.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente de novo.';
    default:
      return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
}

async function garantirPerfil(usuario: User): Promise<Perfil> {
  // INTERINO (sem Functions/claims): perfil e status vêm do doc usuarios/{uid},
  // o mesmo que as Security Rules consultam.
  const foto = await getDoc(doc(fb().db, 'usuarios', usuario.uid));
  const dados = foto.exists() ? foto.data() : null;
  if (!dados || dados['ativo'] !== true) {
    throw Object.assign(new Error('Conta sem acesso.'), { code: 'app/sem-perfil' });
  }
  const perfil = dados['perfil'];
  if (perfil !== 'admin' && perfil !== 'vendedor') {
    throw Object.assign(new Error('Conta sem perfil.'), { code: 'app/sem-perfil' });
  }
  return perfil;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Pick<Sessao, 'status' | 'usuario' | 'perfil'>>({
    status: 'carregando',
    usuario: null,
    perfil: null,
  });
  const timerSessao = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sair = useCallback(async () => {
    if (timerSessao.current) clearTimeout(timerSessao.current);
    await signOut(fb().auth);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(fb().auth, async (usuario) => {
      if (timerSessao.current) clearTimeout(timerSessao.current);
      if (!usuario) {
        setEstado({ status: 'deslogado', usuario: null, perfil: null });
        return;
      }
      try {
        const token = await usuario.getIdTokenResult();
        const authTime = new Date(token.authTime).getTime();
        const restanteMs = authTime + SESSAO_MAX_MS - Date.now();
        if (restanteMs <= 0) {
          await signOut(fb().auth); // sessão de 24h vencida (seção 7)
          return;
        }
        timerSessao.current = setTimeout(() => void signOut(fb().auth), restanteMs);
        const perfil = await garantirPerfil(usuario);
        setEstado({ status: 'logado', usuario, perfil });
      } catch {
        await signOut(fb().auth);
      }
    });
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const cred = await signInWithEmailAndPassword(fb().auth, email.trim(), senha);
    await garantirPerfil(cred.user);
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    await sendPasswordResetEmail(fb().auth, email.trim());
  }, []);

  return (
    <ContextoAuth.Provider value={{ ...estado, entrar, sair, recuperarSenha }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth(): Sessao {
  const ctx = useContext(ContextoAuth);
  if (!ctx) throw new Error('useAuth precisa do AuthProvider');
  return ctx;
}
