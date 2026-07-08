import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { mensagemErroAuth, useAuth } from '../lib/auth';
import './login.css';

export function Login() {
  const { status, entrar, recuperarSenha } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'logado') navegar('/', { replace: true });
  }, [status, navegar]);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      navegar('/', { replace: true });
    } catch (excecao) {
      setErro(mensagemErroAuth((excecao as { code?: string }).code ?? ''));
    } finally {
      setEnviando(false);
    }
  }

  async function aoEsquecer() {
    setErro(null);
    if (!email.trim()) {
      setErro('Digite seu e-mail acima e toque de novo em "Esqueci minha senha".');
      return;
    }
    try {
      await recuperarSenha(email);
      setAviso(`Enviamos o link de redefinição para ${email.trim()}.`);
    } catch (excecao) {
      setErro(mensagemErroAuth((excecao as { code?: string }).code ?? ''));
    }
  }

  return (
    <div className="login">
      <header className="login-topo">
        <div className="login-selo" aria-hidden>
          HB
        </div>
        <div>
          <div className="login-nome">Gestão HB</div>
          <div className="login-sub">Vendedor</div>
        </div>
      </header>

      <main className="login-corpo">
        <form className="login-cartao" onSubmit={aoEnviar} noValidate>
          <h1>Entrar</h1>
          <p className="login-descricao">Use o e-mail e a senha da sua conta.</p>

          {erro && (
            <div className="login-erro" role="alert">
              {erro}
            </div>
          )}
          {aviso && (
            <div className="login-erro login-aviso" role="status">
              {aviso}
            </div>
          )}

          <div className="login-campo">
            <input id="email" type="email" placeholder=" " autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="email">E-mail</label>
          </div>
          <div className="login-campo">
            <input id="senha" type="password" placeholder=" " autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            <label htmlFor="senha">Senha</label>
          </div>

          <button className="login-botao" type="submit" disabled={enviando}>
            {enviando && <span className="login-girador" aria-hidden />}
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="login-esqueci" onClick={() => void aoEsquecer()}>
            Esqueci minha senha
          </button>
        </form>
      </main>
    </div>
  );
}
