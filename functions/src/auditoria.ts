import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface RegistroAuditoria {
  usuarioId: string;
  usuarioNome: string;
  perfil: string;
  acao: string;
  entidadeTipo: string;
  entidadeId: string;
  antes?: Record<string, unknown> | null;
  depois?: Record<string, unknown> | null;
  origem: 'admin' | 'vendedor' | 'sistema';
  ip?: string;
}

/** Grava um registro de auditoria append-only (especificação §2.8). Nunca lança — auditoria não pode derrubar a operação, mas falha é logada. */
export async function auditar(registro: RegistroAuditoria): Promise<void> {
  try {
    await getFirestore()
      .collection('auditoria')
      .add({ ...registro, timestamp: FieldValue.serverTimestamp() });
  } catch (erro) {
    console.error('Falha ao gravar auditoria', { acao: registro.acao, erro });
  }
}
