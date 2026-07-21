'use client';

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useRef, useState } from 'react';
import { fb } from '../lib/firebase';
import { Avatar } from './avatar';
import estilos from './ui.module.css';

const LIMITE_BYTES = 5 * 1024 * 1024;
const LADO_MAX = 512;

/**
 * Recorta o quadrado central e reduz para no máximo 512px (Anexo A.2.3).
 * Feito no cliente antes do envio: o Storage guarda sempre um JPEG pequeno.
 */
async function prepararImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const destino = Math.min(lado, LADO_MAX);

  const canvas = document.createElement('canvas');
  canvas.width = destino;
  canvas.height = destino;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(
    bitmap,
    (bitmap.width - lado) / 2,
    (bitmap.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    destino,
    destino,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Falha ao processar a imagem');
  return blob;
}

/**
 * Troca da própria foto de perfil. Sem Cloud Functions o admin não sobe a foto de
 * terceiros: as Storage Rules só autorizam `request.auth.uid == uid` e não conseguem
 * consultar o perfil no Firestore (ver docs/decisoes.md, ADR-010).
 */
export function FotoPerfil({
  uid,
  nome,
  fotoUrl,
  aoEnviar,
  aoFalhar,
}: {
  uid: string;
  nome: string;
  fotoUrl?: string | undefined;
  aoEnviar: (url: string) => Promise<void> | void;
  aoFalhar: (mensagem: string) => void;
}) {
  const entradaRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      aoFalhar('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      const mb = (arquivo.size / 1024 / 1024).toFixed(1);
      aoFalhar(`A imagem tem ${mb} MB e o limite é 5 MB. Escolha uma menor.`);
      return;
    }

    setEnviando(true);
    let urlPrevia: string | null = null;
    try {
      const imagem = await prepararImagem(arquivo);
      urlPrevia = URL.createObjectURL(imagem); // preview imediato, antes do upload terminar
      setPrevia(urlPrevia);

      const destino = ref(fb().storage, `usuarios/${uid}/perfil.jpg`);
      await uploadBytes(destino, imagem, { contentType: 'image/jpeg' });
      await aoEnviar(await getDownloadURL(destino));
    } catch {
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
      setPrevia(null);
      aoFalhar('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setEnviando(false);
      if (entradaRef.current) entradaRef.current.value = '';
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button
        type="button"
        onClick={() => entradaRef.current?.click()}
        disabled={enviando}
        title="Trocar foto de perfil"
        style={{
          position: 'relative',
          border: 0,
          padding: 0,
          background: 'none',
          cursor: enviando ? 'wait' : 'pointer',
          borderRadius: '50%',
          lineHeight: 0,
        }}
      >
        <Avatar nome={nome} fotoUrl={previa ?? fotoUrl} tamanho={72} />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            background: 'rgba(15, 42, 67, 0.55)',
            color: '#fff',
            fontSize: 20,
            opacity: enviando ? 1 : 0,
            transition: 'opacity 180ms ease',
          }}
          className={estilos.sobreposicaoFoto}
        >
          {enviando ? <span className={estilos.girador} /> : '📷'}
        </span>
      </button>

      <div>
        <button type="button" className={estilos.botaoSecundario} onClick={() => entradaRef.current?.click()} disabled={enviando}>
          {enviando ? 'Enviando…' : fotoUrl ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        <p style={{ margin: '6px 0 0', color: 'var(--hb-texto-suave)', fontSize: 'var(--hb-legenda)' }}>
          JPG, PNG ou WebP até 5 MB. A imagem é recortada em quadrado automaticamente.
        </p>
      </div>

      <input
        ref={entradaRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void aoEscolher(e.target.files?.[0])}
      />
    </div>
  );
}
