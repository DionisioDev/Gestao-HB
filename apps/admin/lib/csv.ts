'use client';

/** Exporta linhas como CSV (separador ; — padrão Excel pt-BR) e baixa no navegador. */
export function exportarCsv(nomeArquivo: string, cabecalhos: string[], linhas: (string | number)[][]): void {
  const escapar = (v: string | number) => {
    const texto = String(v);
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const conteudo = [cabecalhos, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n');
  // BOM p/ Excel reconhecer UTF-8 (acentos)
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Centavos → "1234,56" (número puro para o Excel somar). */
export function centavosParaCsv(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
