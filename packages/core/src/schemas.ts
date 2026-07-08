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

export const RegraVendedorSchema = z.object({
  industriaId: z.string().min(1, 'Escolha a indústria'),
  /** id da tabela ou '*' para todas as tabelas da indústria */
  tabelaId: z.string().min(1),
  comissaoProporcionalPct: z.number().min(0, 'Comissão inválida').max(100, 'Máx. 100%'),
  acrescimoTabelaPct: z.number().min(0).max(100).default(0),
  podeAlterarPreco: z.boolean().default(false),
  limiteDescontoPct: z.number().min(0).max(100).default(0),
});

export const VendedorSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(80),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().trim().max(20).optional(),
  regioes: z.array(z.string().trim().min(1)).default([]),
  /** matriz indústria × tabela: comissão proporcional E permissão de tabela (análise §9) */
  regras: z.array(RegraVendedorSchema).default([]),
  ativo: z.boolean().default(true),
});
export type Vendedor = z.infer<typeof VendedorSchema>;
export type RegraVendedorEntrada = z.infer<typeof RegraVendedorSchema>;

/** Denormaliza a matriz para a lista usada pelas Security Rules (arquitetura §3). */
export function calcularTabelasLiberadas(regras: RegraVendedorEntrada[]): string[] {
  return [...new Set(regras.map((r) => `${r.industriaId}/${r.tabelaId}`))];
}

export const UsuarioSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(80),
  email: z.string().trim().email('E-mail inválido'),
  telefone: z.string().trim().max(20).optional(),
  perfil: z.enum(['admin', 'vendedor']),
  vendedorId: z.string().optional(),
  ativo: z.boolean().default(true),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const ProdutoSchema = z.object({
  industriaId: z.string().min(1, 'Escolha a indústria'),
  sku: z.string().trim().min(1, 'Informe o código (SKU)').max(40),
  nome: z.string().trim().min(1, 'Informe o nome').max(120),
  descricao: z.string().trim().max(500).optional(),
  /** peso em miligramas — obrigatório quando a indústria precifica por grama */
  pesoMg: z.number().int().positive('Peso deve ser positivo').optional(),
  teor: z.number().int().optional(),
  categoria: z.string().trim().max(60).optional(),
  codigoOriginal: z.string().trim().max(40).optional(),
  referencia: z.string().trim().max(40).optional(),
  referenciaAgrupamento: z.string().trim().max(40).optional(),
  ean: z.string().trim().max(14).optional(),
  ativo: z.boolean().default(true),
});
export type Produto = z.infer<typeof ProdutoSchema>;

export const PrecoProdutoSchema = z.object({
  industriaId: z.string().min(1),
  tabelaId: z.string().min(1),
  precoCentavos: z.number().int().positive('Preço deve ser positivo'),
});
export type PrecoProduto = z.infer<typeof PrecoProdutoSchema>;

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
