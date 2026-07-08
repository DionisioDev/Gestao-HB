'use client';

import { ContatoClienteSchema } from '@gestao-hb/core';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { CampoTexto } from '../../../../components/campos';
import { ModalConfirmacao } from '../../../../components/modal';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { slugId } from '../../../../lib/industrias';
import { useSnackbar } from '../../../../lib/snackbar';

interface Contato {
  id: string;
  nome: string;
  email?: string;
  celular?: string;
  whatsapp?: string;
  aniversario?: string;
  observacoes?: string;
}

const VAZIO: Contato = { id: '', nome: '' };

/** Compradores vinculados ao cliente (análise §3 — Contatos). */
export function SecaoContatos({ clienteId }: { clienteId: string }) {
  const avisar = useSnackbar();
  const [contatos, setContatos] = useState<Contato[] | null>(null);
  const [editando, setEditando] = useState<Contato | null>(null);
  const [removendo, setRemovendo] = useState<Contato | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'clientes', clienteId, 'contatos'), orderBy('nome')), (foto) =>
      setContatos(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Contato, 'id'>) }))),
    );
  }, [clienteId]);

  async function salvar() {
    if (!editando) return;
    const analise = ContatoClienteSchema.safeParse({
      nome: editando.nome,
      email: editando.email || undefined,
      celular: editando.celular || undefined,
      whatsapp: editando.whatsapp || undefined,
      aniversario: editando.aniversario || undefined,
      observacoes: editando.observacoes || undefined,
    });
    if (!analise.success) {
      avisar(analise.error.issues[0]?.message ?? 'Confira os campos.', 'erro');
      return;
    }
    setOcupado(true);
    try {
      const id = editando.id || slugId(editando.nome);
      const dados = JSON.parse(JSON.stringify(analise.data)) as Record<string, unknown>;
      await setDoc(doc(fb().db, 'clientes', clienteId, 'contatos', id), dados, { merge: true });
      await auditar(editando.id ? 'contato_editado' : 'contato_criado', 'contatoCliente', `${clienteId}/${id}`, null, dados);
      avisar('Contato salvo.', 'sucesso');
      setEditando(null);
    } catch {
      avisar('Não foi possível salvar o contato.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    if (!removendo) return;
    setOcupado(true);
    try {
      await deleteDoc(doc(fb().db, 'clientes', clienteId, 'contatos', removendo.id));
      await auditar('contato_removido', 'contatoCliente', `${clienteId}/${removendo.id}`, { nome: removendo.nome }, null);
      avisar('Contato removido.', 'sucesso');
      setRemovendo(null);
    } catch {
      avisar('Não foi possível remover.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={estilos.card}>
      <div className={estilos.cabecalho} style={{ marginBottom: 8 }}>
        <div>
          <h2 className={estilos.cardTitulo}>Contatos (compradores)</h2>
          <p className={estilos.cardDescricao} style={{ margin: 0 }}>
            Pessoas que compram por este cliente.
          </p>
        </div>
        {!editando && (
          <button className={estilos.botaoSecundario} onClick={() => setEditando({ ...VAZIO })}>
            + Novo contato
          </button>
        )}
      </div>

      {!contatos ? (
        <div className={estilos.esqueleto} />
      ) : contatos.length === 0 && !editando ? (
        <p style={{ color: 'var(--hb-texto-suave)', margin: 0 }}>Nenhum contato cadastrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contatos.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: '#f7fafd',
                border: '1px solid var(--hb-borda)',
                borderRadius: 10,
                flexWrap: 'wrap',
              }}
            >
              <strong>{c.nome}</strong>
              <span style={{ color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-corpo-sm)' }}>
                {[c.whatsapp && `WhatsApp ${c.whatsapp}`, c.celular && `Cel. ${c.celular}`, c.email].filter(Boolean).join(' · ') || '—'}
              </span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                <button className={estilos.botaoSecundario} style={{ minHeight: 36, padding: '0 12px' }} onClick={() => setEditando(c)}>
                  Editar
                </button>
                <button
                  className={estilos.botaoSecundario}
                  style={{ minHeight: 36, padding: '0 12px', color: 'var(--hb-erro)' }}
                  onClick={() => setRemovendo(c)}
                >
                  Remover
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hb-borda)' }}>
          <div className={estilos.grade}>
            <CampoTexto rotulo="Nome *" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
            <CampoTexto rotulo="WhatsApp" value={editando.whatsapp ?? ''} onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })} />
            <CampoTexto rotulo="Celular" value={editando.celular ?? ''} onChange={(e) => setEditando({ ...editando, celular: e.target.value })} />
            <CampoTexto rotulo="E-mail" type="email" value={editando.email ?? ''} onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
            <CampoTexto rotulo="Aniversário" type="date" value={editando.aniversario ?? ''} onChange={(e) => setEditando({ ...editando, aniversario: e.target.value })} />
            <CampoTexto rotulo="Observações" value={editando.observacoes ?? ''} onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })} />
          </div>
          <div className={estilos.acoesForm}>
            <button className={estilos.botaoSecundario} onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className={estilos.botaoPrimario} disabled={ocupado} onClick={() => void salvar()}>
              {ocupado && <span className={estilos.girador} aria-hidden />}
              Salvar contato
            </button>
          </div>
        </div>
      )}

      {removendo && (
        <ModalConfirmacao
          titulo={`Remover ${removendo.nome}?`}
          rotuloConfirmar="Remover"
          tomPerigo
          ocupado={ocupado}
          aoConfirmar={() => void remover()}
          aoCancelar={() => setRemovendo(null)}
        >
          O contato será removido deste cliente. Essa ação fica registrada na auditoria.
        </ModalConfirmacao>
      )}
    </section>
  );
}
