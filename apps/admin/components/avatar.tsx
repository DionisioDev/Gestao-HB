'use client';

/** Avatar do usuário: foto quando existe, senão a inicial do nome sobre o acento da marca. */
export function Avatar({
  nome,
  fotoUrl,
  tamanho = 34,
}: {
  nome: string;
  fotoUrl?: string | undefined;
  tamanho?: number;
}) {
  const estiloBase = {
    width: tamanho,
    height: tamanho,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover' as const,
  };

  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- URL do Storage, sem loader do Next no Worker
    return <img src={fotoUrl} alt="" aria-hidden style={estiloBase} />;
  }

  return (
    <span
      aria-hidden
      style={{
        ...estiloBase,
        background: 'var(--hb-acento)',
        color: 'var(--hb-primaria)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: Math.round(tamanho * 0.38),
      }}
    >
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}
