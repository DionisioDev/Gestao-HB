'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { mensagemErroAuth, useAuth } from '../../lib/auth';
import estilos from './login.module.css';

export default function PaginaLogin() {
  const { status, entrar, recuperarSenha } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'logado') router.replace('/');
  }, [status, router]);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      router.replace('/');
    } catch (excecao) {
      const codigo = (excecao as { code?: string }).code ?? '';
      setErro(
        codigo === 'app/sem-perfil'
          ? 'Sua conta ainda não tem perfil de acesso. Peça ao administrador para liberar.'
          : mensagemErroAuth(codigo),
      );
    } finally {
      setEnviando(false);
    }
  }

  async function aoEsquecerSenha() {
    setErro(null);
    setAviso(null);
    if (!email.trim()) {
      setErro('Digite seu e-mail no campo acima e clique de novo em "Esqueci minha senha".');
      return;
    }
    try {
      await recuperarSenha(email);
      setAviso(`Enviamos um link de redefinição para ${email.trim()}. Confira sua caixa de entrada.`);
    } catch (excecao) {
      setErro(mensagemErroAuth((excecao as { code?: string }).code ?? ''));
    }
  }

  return (
    <div className={estilos.pagina}>
      <aside className={estilos.marca}>
        <div className={estilos.selo}>
          <div className={estilos.seloCirculo} aria-hidden>
            HB
          </div>
          <div>
            <div className={estilos.seloNome}>Gestão HB</div>
            <div className={estilos.seloSub}>Representações</div>
          </div>
        </div>

        <div className={estilos.manchete}>
          <h2>
            Pedidos, financeiro e comissões <em>em um só lugar</em>.
          </h2>
          <p>O ciclo completo da representação — do catálogo por grama ao fechamento de comissões.</p>
        </div>

        <div className={estilos.rodapeMarca}>HB Joias Representações</div>
      </aside>

      <main className={estilos.formArea}>
        <form className={estilos.cartao} onSubmit={aoEnviar} noValidate>
          <h1 className={estilos.titulo}>Entrar</h1>
          <p className={estilos.subtitulo}>Use o e-mail e a senha da sua conta.</p>

          {erro && (
            <div className={estilos.erro} role="alert">
              {erro}
            </div>
          )}
          {aviso && (
            <div className={`${estilos.erro} ${estilos.aviso}`} role="status">
              {aviso}
            </div>
          )}

          <div className={estilos.campo}>
            <input
              id="email"
              type="email"
              placeholder=" "
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!erro}
              required
            />
            <label htmlFor="email">E-mail</label>
          </div>

          <div className={estilos.campo}>
            <input
              id="senha"
              type="password"
              placeholder=" "
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-invalid={!!erro}
              required
            />
            <label htmlFor="senha">Senha</label>
          </div>

          <button className={estilos.botao} type="submit" disabled={enviando}>
            {enviando && <span className={estilos.girador} aria-hidden />}
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <button type="button" className={estilos.esqueci} onClick={aoEsquecerSenha}>
            Esqueci minha senha
          </button>
        </form>
      </main>
    </div>
  );
}
