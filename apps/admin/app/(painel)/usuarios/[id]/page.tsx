'use client';

import { UsuarioSchema, type Usuario } from '@gestao-hb/core';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Avatar } from '../../../../components/avatar';
import { CampoSelect, CampoTexto } from '../../../../components/campos';
import { FotoPerfil } from '../../../../components/foto-perfil';
import estilos from '../../../../components/ui.module.css';
import { auditar, limparIndefinidos } from '../../../../lib/auditoria';
import { useAuth } from '../../../../lib/auth';
import { fb } from '../../../../lib/firebase';
import { useSnackbar } from '../../../../lib/snackbar';
import { criarContaAuth, mensagemErroCriacao } from '../../../../lib/usuarios';

export default function PaginaUsuario() {
  const { id } = useParams<{ id: string }>();
  const novo = id === 'novo';
  const router = useRouter();
  const avisar = useSnackbar();
  const { usuario: logado } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [perfil, setPerfil] = useState<'admin' | 'vendedor'>('vendedor');
  const [vendedorId, setVendedorId] = useState('');
  const [vendedores, setVendedores] = useState<Array<{ id: string; nome: string }>>([]);
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const [carregado, setCarregado] = useState(novo);
  const [anterior, setAnterior] = useState<Record<string, unknown> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const proprioUsuario = !novo && id === logado?.uid;

  useEffect(() => {
    void getDocs(collection(fb().db, 'vendedores')).then((foto) =>
      setVendedores(foto.docs.map((d) => ({ id: d.id, nome: (d.data()['nome'] as string) ?? d.id }))),
    );
  }, []);

  useEffect(() => {
    if (novo) return;
    void getDoc(doc(fb().db, 'usuarios', id)).then((foto) => {
      if (!foto.exists()) {
        avisar('Usuário não encontrado.', 'erro');
        router.replace('/usuarios');
        return;
      }
      const d = foto.data();
      setAnterior(d);
      setNome((d['nome'] as string) ?? '');
      setEmail((d['email'] as string) ?? '');
      setTelefone((d['telefone'] as string) ?? '');
      setPerfil((d['perfil'] as 'admin' | 'vendedor') ?? 'vendedor');
      setVendedorId((d['vendedorId'] as string) ?? '');
      setFotoUrl(d['fotoUrl'] as string | undefined);
      setCarregado(true);
    });
  }, [id, novo, router, avisar]);

  if (!carregado) {
    return (
      <div aria-busy="true">
        <div className={estilos.esqueleto} />
      </div>
    );
  }

  async function aoSalvar(e: FormEvent) {
    e.preventDefault();
    if (perfil === 'vendedor' && !vendedorId) {
      avisar('Perfil vendedor exige o vínculo com um cadastro de vendedor.', 'erro');
      return;
    }
    const analise = UsuarioSchema.safeParse({
      nome,
      email: email.trim().toLowerCase(),
      telefone: telefone || undefined,
      perfil,
      vendedorId: perfil === 'vendedor' ? vendedorId : undefined,
      ativo: true,
    });
    if (!analise.success) {
      avisar(analise.error.issues[0]?.message ?? 'Confira os campos.', 'erro');
      return;
    }
    const dados: Usuario = analise.data;

    setSalvando(true);
    try {
      if (novo) {
        let uid: string;
        try {
          uid = await criarContaAuth(dados.email);
        } catch (excecao) {
          avisar(mensagemErroCriacao((excecao as { code?: string }).code ?? ''), 'erro');
          return;
        }
        const documento = limparIndefinidos(dados as unknown as Record<string, unknown>);
        documento['criadoEm'] = serverTimestamp();
        await setDoc(doc(fb().db, 'usuarios', uid), documento);
        await auditar('usuario_criado', 'usuario', uid, null, documento);
        avisar(`Usuário criado — ${dados.email} recebeu o link para definir a senha.`, 'sucesso');
        router.replace('/usuarios');
      } else {
        // e-mail (login) e status são gerenciados fora deste form (Auth / listagem)
        const { email: _semEmail, ativo: _semAtivo, ...editaveis } = dados;
        const documento = limparIndefinidos(editaveis as unknown as Record<string, unknown>);
        if (proprioUsuario) delete documento['perfil']; // trava anti-lockout (Rules também bloqueiam)
        documento['atualizadoEm'] = serverTimestamp();
        await updateDoc(doc(fb().db, 'usuarios', id), documento);
        await auditar('usuario_editado', 'usuario', id, anterior, documento);
        avisar('Alterações salvas.', 'sucesso');
      }
    } catch {
      avisar('Não foi possível salvar. Tente novamente.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>{novo ? 'Novo usuário' : nome}</h1>
          <p className={estilos.subtitulo}>
            {novo
              ? 'A conta é criada com link de definição de senha por e-mail — nenhuma senha transita aqui.'
              : email}
          </p>
        </div>
      </div>

      {!novo && (
        <section className={estilos.card}>
          <h2 className={estilos.cardTitulo}>Foto de perfil</h2>
          {proprioUsuario ? (
            <FotoPerfil
              uid={id}
              nome={nome}
              fotoUrl={fotoUrl}
              aoFalhar={(mensagem) => avisar(mensagem, 'erro')}
              aoEnviar={async (url) => {
                await updateDoc(doc(fb().db, 'usuarios', id), { fotoUrl: url });
                setFotoUrl(url);
                await auditar('foto_perfil_alterada', 'usuario', id, { fotoUrl: fotoUrl ?? null }, { fotoUrl: url });
                avisar('Foto atualizada.', 'sucesso');
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar nome={nome} fotoUrl={fotoUrl} tamanho={72} />
              <p className={estilos.cardDescricao} style={{ margin: 0 }}>
                Cada pessoa define a própria foto ao entrar no sistema — o upload é autorizado apenas para
                o dono da conta.
              </p>
            </div>
          )}
        </section>
      )}

      <form onSubmit={aoSalvar} noValidate>
        <section className={estilos.card}>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} />
            <CampoTexto rotulo="E-mail (login) *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!novo} />
            <CampoTexto rotulo="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            <CampoSelect
              rotulo="Perfil *"
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as 'admin' | 'vendedor')}
              disabled={proprioUsuario}
              {...(proprioUsuario ? { title: 'Você não pode alterar o próprio perfil' } : {})}
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </CampoSelect>
            {perfil === 'vendedor' && (
              <CampoSelect rotulo="Cadastro de vendedor *" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                <option value="">Escolha…</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </CampoSelect>
            )}
          </div>
        </section>

        <div className={estilos.acoesForm}>
          <button type="button" className={estilos.botaoSecundario} onClick={() => router.push('/usuarios')}>
            Voltar
          </button>
          <button type="submit" className={estilos.botaoPrimario} disabled={salvando}>
            {salvando && <span className={estilos.girador} aria-hidden />}
            {salvando ? 'Salvando…' : novo ? 'Criar usuário' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
