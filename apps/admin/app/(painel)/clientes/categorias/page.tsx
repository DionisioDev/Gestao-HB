'use client';

import { CategoriaClienteSchema } from '@gestao-hb/core';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CampoTexto } from '../../../../components/campos';
import { ModalConfirmacao } from '../../../../components/modal';
import estilos from '../../../../components/ui.module.css';
import { auditar } from '../../../../lib/auditoria';
import { fb } from '../../../../lib/firebase';
import { slugId } from '../../../../lib/industrias';
import { useSnackbar } from '../../../../lib/snackbar';

interface Categoria {
  id: string;
  nome: string;
  codigo?: string;
}

export default function PaginaCategorias() {
  const router = useRouter();
  const avisar = useSnackbar();
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [removendo, setRemovendo] = useState<Categoria | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    return onSnapshot(query(collection(fb().db, 'categoriasCliente'), orderBy('nome')), (foto) =>
      setCategorias(foto.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Categoria, 'id'>) }))),
    );
  }, []);

  async function adicionar() {
    const analise = CategoriaClienteSchema.safeParse({ nome, codigo: codigo || undefined });
    if (!analise.success) {
      avisar(analise.error.issues[0]?.message ?? 'Informe o nome.', 'erro');
      return;
    }
    setOcupado(true);
    try {
      const id = slugId(analise.data.nome);
      const dados = JSON.parse(JSON.stringify(analise.data)) as Record<string, unknown>;
      await setDoc(doc(fb().db, 'categoriasCliente', id), dados, { merge: true });
      await auditar('categoria_cliente_criada', 'categoriaCliente', id, null, dados);
      avisar('Categoria salva.', 'sucesso');
      setNome('');
      setCodigo('');
    } catch {
      avisar('Não foi possível salvar.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    if (!removendo) return;
    setOcupado(true);
    try {
      await deleteDoc(doc(fb().db, 'categoriasCliente', removendo.id));
      await auditar('categoria_cliente_removida', 'categoriaCliente', removendo.id, { nome: removendo.nome }, null);
      avisar('Categoria removida.', 'sucesso');
      setRemovendo(null);
    } catch {
      avisar('Não foi possível remover.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo}>Categorias de cliente</h1>
          <p className={estilos.subtitulo}>Classificação livre usada no cadastro de clientes.</p>
        </div>
        <button className={estilos.botaoSecundario} onClick={() => router.push('/clientes')}>
          Voltar
        </button>
      </div>

      <section className={estilos.card}>
        <div className={estilos.grade}>
          <CampoTexto rotulo="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Heri" />
          <CampoTexto rotulo="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <div className={estilos.campo} style={{ justifyContent: 'end' }}>
            <button className={estilos.botaoPrimario} disabled={ocupado || !nome.trim()} onClick={() => void adicionar()}>
              {ocupado && <span className={estilos.girador} aria-hidden />}
              Adicionar
            </button>
          </div>
        </div>
      </section>

      <div className={estilos.tabelaEnvoltorio}>
        {!categorias ? (
          <div className={estilos.esqueleto} />
        ) : categorias.length === 0 ? (
          <div className={estilos.vazio}>
            <strong>Nenhuma categoria</strong>
            Crie a primeira acima (no sistema atual existem "Heri" e "Vendas - P").
          </div>
        ) : (
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id} style={{ cursor: 'default' }}>
                  <td data-rotulo="Nome">
                    <strong>{c.nome}</strong>
                  </td>
                  <td data-rotulo="Código">{c.codigo ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={estilos.botaoSecundario}
                      style={{ minHeight: 36, padding: '0 12px', color: 'var(--hb-erro)' }}
                      onClick={() => setRemovendo(c)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {removendo && (
        <ModalConfirmacao
          titulo={`Remover a categoria ${removendo.nome}?`}
          rotuloConfirmar="Remover"
          tomPerigo
          ocupado={ocupado}
          aoConfirmar={() => void remover()}
          aoCancelar={() => setRemovendo(null)}
        >
          Clientes que usam esta categoria ficarão sem categoria. A ação fica na auditoria.
        </ModalConfirmacao>
      )}
    </div>
  );
}
