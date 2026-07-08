import { z } from 'zod';

/**
 * Schemas de validação dos cadastros (docs/arquitetura.md §3).
 * Usados pelo admin (formulários) e, quando o Blaze/Functions entrar, pelas callables.
 */

export const TEORES = [700, 900, 925, 950] as const;

export const EnderecoSchema = z.object({
  logradouro: z.string().trim().max(120).optional(),
  bairro: z.string().trim().max(60).optional(),
  cidade: z.string().trim().max(60).optional(),
  uf: z.string().trim().length(2).toUpperCase().optional(),
  cep: z.string().trim().max(9).optional(),
});

export const IndustriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(80),
  fantasia: z.string().trim().max(80).optional(),
  /** indústria "lógica": agrupador de catálogo sem dados fiscais (análise §2) */
  logica: z.boolean().default(false),
  cnpj: z.string().trim().max(18).optional(),
  inscrEstadual: z.string().trim().max(20).optional(),
  endereco: EnderecoSchema.optional(),
  telefone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  pix: z.string().trim().max(120).optional(),
  regimeComissao: z.enum(['mensalFixo', 'posRecebimento']),
  /** dia do pagamento no regime A (ex.: 15) */
  diaPagtoComissao: z.number().int().min(1).max(28).optional(),
  /** regime B: quando a comissão fica elegível (regras-negocio §2.3) */
  elegibilidadeComissao: z.enum(['pedidoQuitado', 'porParcela']).optional(),
  modeloPreco: z.enum(['porGrama', 'tabelado']),
  /** % padrão de comissão do escritório sobre pedidos desta indústria */
  pctComissaoEscritorio: z.number().min(0).max(100).default(0),
  prazoEntregaDias: z.number().int().min(0).max(365).optional(),
  condicoesComerciais: z.string().trim().max(500).optional(),
  ativo: z.boolean().default(true),
});
export type Industria = z.infer<typeof IndustriaSchema>;

export const TabelaPrecoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(40),
  ordem: z.number().int().min(1).max(4),
  teor: z.number().int().optional(),
  ativo: z.boolean().default(true),
});
export type TabelaPreco = z.infer<typeof TabelaPrecoSchema>;

export const ValorGramaSchema = z.object({
  industriaId: z.string().min(1),
  tabelaId: z.string().min(1),
  teor: z.number().int().optional(),
  valorCentavos: z.number().int().positive('Valor do grama deve ser positivo'),
  /** ISO date (yyyy-mm-dd) do início da vigência */
  vigenciaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  criadoPor: z.string().min(1),
});
export type ValorGrama = z.infer<typeof ValorGramaSchema>;
