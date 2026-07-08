'use client';

import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import estilos from './ui.module.css';

interface BaseProps {
  rotulo: string;
  erro?: string;
  largo?: boolean;
}

function Envoltorio({ rotulo, erro, largo, children }: BaseProps & { children: ReactNode }) {
  return (
    <div className={`${estilos.campo} ${largo ? estilos.campoLargo : ''}`}>
      <span className={estilos.rotulo}>{rotulo}</span>
      {children}
      {erro && <span className={estilos.erroCampo}>{erro}</span>}
    </div>
  );
}

export function CampoTexto({ rotulo, erro, largo, ...resto }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envoltorio rotulo={rotulo} {...(erro ? { erro } : {})} {...(largo ? { largo } : {})}>
      <input className={estilos.entrada} aria-invalid={!!erro} {...resto} />
    </Envoltorio>
  );
}

export function CampoArea({ rotulo, erro, largo, ...resto }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Envoltorio rotulo={rotulo} {...(erro ? { erro } : {})} {...(largo ? { largo } : {})}>
      <textarea className={estilos.entrada} aria-invalid={!!erro} {...resto} />
    </Envoltorio>
  );
}

export function CampoSelect({
  rotulo,
  erro,
  largo,
  children,
  ...resto
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <Envoltorio rotulo={rotulo} {...(erro ? { erro } : {})} {...(largo ? { largo } : {})}>
      <select className={estilos.entrada} aria-invalid={!!erro} {...resto}>
        {children}
      </select>
    </Envoltorio>
  );
}

export function Interruptor({
  rotulo,
  checked,
  onChange,
}: {
  rotulo: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className={estilos.interruptor}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={estilos.trilho} aria-hidden />
      {rotulo}
    </label>
  );
}
