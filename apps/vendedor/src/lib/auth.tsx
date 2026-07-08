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

export interface SessaoVendedor {
  status: 'carregando' | 'deslogado' | 'logado';
  usuario: User | null;
  nome: string;
  /** id do cadastro de vendedor vinculado ao usuário */
  vendedorId: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
}

const Contexto = createContext<SessaoVendedor | null>(null);

export function mensagemErroAuth(codigo: string): string {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos ou redefina sua senha.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente de novo.';
    case 'app/sem-acesso':
      return 'Sua conta não tem acesso de vendedor. Fale com o gestor.';
    default:
      return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
}

async function carregarVendedor(usuario: User): Promise<{ nome: string; vendedorId: string }> {
  const foto = await getDoc(doc(fb().db, 'usuarios', usuario.uid));
  const dados = foto.exists() ? foto.data() : null;
  if (!dados || dados['ativo'] !== true || dados['perfil'] !== 'vendedor' || !dados['vendedorId']) {
    throw Object.assign(new Error('Sem acesso de vendedor.'), { code: 'app/sem-acesso' });
  }
  return { nome: (dados['nome'] as string) ?? usuario.email ?? '', vendedorId: dados['vendedorId'] as string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Pick<SessaoVendedor, 'status' | 'usuario' | 'nome' | 'vendedorId'>>({
    status: 'carregando',
    usuario: null,
    nome: '',
    vendedorId: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onAuthStateChanged(fb().auth, async (usuario) => {
      if (timer.current) clearTimeout(timer.current);
      if (!usuario) {
        setEstado({ status: 'deslogado', usuario: null, nome: '', vendedorId: null });
        return;
      }
      try {
        const token = await usuario.getIdTokenResult();
        const restante = new Date(token.authTime).getTime() + SESSAO_MAX_MS - Date.now();
        if (restante <= 0) {
          await signOut(fb().auth);
          return;
        }
        timer.current = setTimeout(() => void signOut(fb().auth), restante);
        const { nome, vendedorId } = await carregarVendedor(usuario);
        setEstado({ status: 'logado', usuario, nome, vendedorId });
      } catch {
        await signOut(fb().auth);
      }
    });
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const cred = await signInWithEmailAndPassword(fb().auth, email.trim(), senha);
    await carregarVendedor(cred.user);
  }, []);

  const sair = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await signOut(fb().auth);
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    await sendPasswordResetEmail(fb().auth, email.trim());
  }, []);

  return <Contexto.Provider value={{ ...estado, entrar, sair, recuperarSenha }}>{children}</Contexto.Provider>;
}

export function useAuth(): SessaoVendedor {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth precisa do AuthProvider');
  return ctx;
}
