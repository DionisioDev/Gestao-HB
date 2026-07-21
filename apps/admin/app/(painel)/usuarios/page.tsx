'use client';

import type { RegraVendedorEntrada } from '@gestao-hb/core';
import { StatusChip } from '@gestao-hb/ui';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, type Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../../../components/avatar';
import { ModalConfirmacao } from '../../../components/modal';
import estilos from '../../../components/ui.module.css';
import { linhaClicavel } from '../../../lib/a11y';
import { auditar } from '../../../lib/auditoria';
import { useAuth } from '../../../lib/auth';
import { fb } from '../../../lib/firebase';
import { useIndustrias } from '../../../lib/industrias';
import { useSnackbar } from '../../../lib/snackbar';
import { formatarUltimaSessao, resumirLiberacoes, useMapaTabelas } from '../../../lib/tabelas-liberadas';

interface LinhaUsuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'admin' | 'vendedor';
  vendedorId?: string;
  fotoUrl?: string;
  ultimaSessao?: Timestamp;
  ativo: boolean;
}

type Acao = { tipo: 'reset' | 'status'; usuario: LinhaUsuario } | null;

export default function PaginaUsuarios() {
  const router = useRouter();
  const avisar = useSnackbar();
  const { usuario: logado } = useAuth();
  const [usuarios, setUsuarios] = useState<LinhaUsuario[] | null>(null);
  const [regrasPorVendedor, setRegrasPorVendedor] = useState<Record<string, RegraVendedorEntrada[]>>({});
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [acao, setAcao] = useState<Acao>(null);
  const [ocupado, setOcupado] = useState(false);

  const industrias = useIndustrias();
  const mapaTabelas = useMapaTabelas();

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'usuarios'), orderBy('nome')), (foto) =>
      setUsuarios(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LinhaUsuario, 'id'>) }))),
    );
  }, []);

  // matriz indústria × tabela mora no cadastro do vendedor (VendedorSchema.regras)
  useEffect(() => {
    return onSnapshot(collection(fb().db, 'vendedores'), (foto) => {
      const mapa: Record<string, RegraVendedorEntrada[]> = {};
      foto.docs.forEach((d) => (mapa[d.id] = (d.data()['regras'] as RegraVendedorEntrada[]) ?? []));
      setRegrasPorVendedor(mapa);
    });
  }, []);

  const nomesIndustrias = useMemo(() => {
    const mapa: Record<string, string> = {};
    (industrias ?? []).forEach((i) => (mapa[i.id] = i.nome));
    return mapa;
  }, [industrias]);

  const adminsAtivos = useMemo(
    () => (usuarios ?? []).filter((u) => u.perfil === 'admin' && u.ativo).length,
    [usuarios],
  );

  const filtrados = useMemo(() => {
    if (!usuarios) return null;
    const termo = busca.trim().toLowerCase();
    return usuarios.filter(
      (u) =>
        (!termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)) &&
        (!filtroPerfil || u.perfil === filtroPerfil) &&
        (!filtroStatus || String(u.ativo) === filtroStatus),
    );
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  async function confirmarAcao() {
    if (!acao) return;
    const { tipo, usuario } = acao;
    setOcupado(true);
    try {
      if (tipo === 'reset') {
        await sendPasswordResetEmail(fb().auth, usuario.email);
        await auditar('reset_senha_disparado', 'usuario', usuario.id, null, { email: usuario.email });
        avisar(`Link de redefinição enviado para ${usuario.email}.`, 'sucesso');
      } else {
        const novoStatus = !usuario.ativo;
        await updateDoc(doc(fb().db, 'usuarios', usuario.id), { ativo: novoStatus });
        await auditar(novoStatus ? 'usuario_ativado' : 'usuario_desativado', 'usuario', usuario.id, { ativo: usuario.ativo }, { ativo: novoStatus });
        avisar(
          novoStatus
            ? `${usuario.nome} reativado.`
            : `${usuario.nome} desativado — o acesso é bloqueado imediatamente pelas regras do banco.`,
          'sucesso',
        );
      }
      setAcao(null);
    } catch {
      avisar('Não foi possível concluir a ação. Tente novamente.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  function pedirDesativacao(u: LinhaUsuario) {
    if (u.id === logado?.uid) {
      avisar('Você não pode desativar a própria conta.', 'erro');
      return;
    }
    if (u.perfil === 'admin' && u.ativo && adminsAtivos <= 1) {
      avisar('Este é o último administrador ativo — cadastre outro admin antes de desativá-lo.', 'erro');
      return;
    }
    setAcao({ tipo: 'status', usuario: u });
  }

  return (
    <div>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Usuários</h1>
          <p className={estilos.subtitulo}>Contas de acesso ao sistema — admins e vendedores.</p>
        </div>
        <Link href="/usuarios/novo" className={estilos.botaoPrimario}>
          + Novo usuário
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          className={estilos.busca}
          placeholder="Buscar por nome ou e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar usuário"
        />
        <select
          className={estilos.entrada}
          style={{ maxWidth: 190 }}
          value={filtroPerfil}
          onChange={(e) => setFiltroPerfil(e.target.value)}
          aria-label="Filtrar por perfil"
        >
          <option value="">Todos os perfis</option>
          <option value="admin">Administrador</option>
          <option value="vendedor">Vendedor</option>
        </select>
        <select
          className={estilos.entrada}
          style={{ maxWidth: 170 }}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      <div className={estilos.tabelaEnvoltorio}>
        {!filtrados ? (
          <div aria-busy="true">
            <div className={estilos.esqueleto} />
            <div className={estilos.esqueleto} />
          </div>
        ) : filtrados.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>Nenhum usuário encontrado</strong>
            <p>Ajuste a busca ou os filtros para ver outras contas.</p>
            <button
              className={estilos.botaoSecundario}
              onClick={() => {
                setBusca('');
                setFiltroPerfil('');
                setFiltroStatus('');
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Tabelas liberadas</th>
                <th>Última sessão</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} {...linhaClicavel(() => router.push(`/usuarios/${u.id}`))}>
                  <td data-rotulo="Usuário">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar nome={u.nome} fotoUrl={u.fotoUrl} />
                      <span>
                        <strong>{u.nome}</strong>
                        {u.id === logado?.uid && (
                          <span style={{ color: 'var(--hb-acao)', fontSize: 'var(--hb-legenda)' }}> (você)</span>
                        )}
                        <div style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>{u.email}</div>
                      </span>
                    </span>
                  </td>
                  <td data-rotulo="Perfil">
                    <StatusChip tom={u.perfil === 'admin' ? 'info' : 'neutro'}>
                      {u.perfil === 'admin' ? 'Administrador' : 'Vendedor'}
                    </StatusChip>
                  </td>
                  <td data-rotulo="Tabelas liberadas">
                    {u.perfil === 'admin' ? (
                      <span style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>
                        Acesso total
                      </span>
                    ) : (
                      (() => {
                        const resumo = resumirLiberacoes(
                          u.vendedorId ? regrasPorVendedor[u.vendedorId] : undefined,
                          nomesIndustrias,
                          mapaTabelas,
                        );
                        if (resumo.length === 0) {
                          return (
                            <span style={{ color: 'var(--hb-erro)', fontSize: 'var(--hb-legenda)' }}>
                              Nenhuma tabela liberada
                            </span>
                          );
                        }
                        return resumo.map((r) => (
                          <span key={r.industria} className={estilos.chipTabela}>
                            {r.industria}: {r.tabelas}
                          </span>
                        ));
                      })()
                    )}
                  </td>
                  <td data-rotulo="Última sessão" style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>
                    {formatarUltimaSessao(u.ultimaSessao?.toDate() ?? null)}
                  </td>
                  <td data-rotulo="Status">
                    <StatusChip tom={u.ativo ? 'sucesso' : 'erro'}>{u.ativo ? 'Ativo' : 'Inativo'}</StatusChip>
                  </td>
                  <td data-rotulo="Ações" style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={estilos.botaoSecundario}
                      style={{ minHeight: 38, padding: '0 14px', marginRight: 8 }}
                      onClick={() => setAcao({ tipo: 'reset', usuario: u })}
                    >
                      Reset de senha
                    </button>
                    <button
                      className={estilos.botaoSecundario}
                      style={{ minHeight: 38, padding: '0 14px', color: u.ativo ? 'var(--hb-erro)' : 'var(--hb-sucesso)' }}
                      onClick={() => pedirDesativacao(u)}
                    >
                      {u.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {acao?.tipo === 'reset' && (
        <ModalConfirmacao
          titulo="Enviar link de redefinição de senha?"
          rotuloConfirmar="Enviar link"
          ocupado={ocupado}
          aoConfirmar={() => void confirmarAcao()}
          aoCancelar={() => setAcao(null)}
        >
          Um e-mail será enviado para <strong>{acao.usuario.email}</strong> com o link para definir uma
          nova senha. Nenhuma senha é exibida ou transita pelo sistema.
        </ModalConfirmacao>
      )}

      {acao?.tipo === 'status' && (
        <ModalConfirmacao
          titulo={acao.usuario.ativo ? `Desativar ${acao.usuario.nome}?` : `Reativar ${acao.usuario.nome}?`}
          rotuloConfirmar={acao.usuario.ativo ? 'Desativar' : 'Reativar'}
          tomPerigo={acao.usuario.ativo}
          ocupado={ocupado}
          aoConfirmar={() => void confirmarAcao()}
          aoCancelar={() => setAcao(null)}
        >
          {acao.usuario.ativo ? (
            <>
              <strong>{acao.usuario.email}</strong> perde o acesso aos dados imediatamente — as regras do
              banco recusam qualquer leitura ou gravação de conta inativa. Se estiver com o sistema aberto,
              a tela atual continua visível até a próxima leitura, que falhará. A conta pode ser reativada
              depois.
            </>
          ) : (
            <>
              <strong>{acao.usuario.email}</strong> voltará a acessar o sistema com o perfil{' '}
              {acao.usuario.perfil === 'admin' ? 'Administrador' : 'Vendedor'}.
            </>
          )}
        </ModalConfirmacao>
      )}
    </div>
  );
}
