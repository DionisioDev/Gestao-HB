# Gestao-HB — Sistema de Gestão de Pedidos, Financeiro e Comissões

Sistema para **representação comercial no setor de joias/prata** (indústrias: Spart, Anéis Brasil, Inove, Tendenze, Zarrara). Substitui o sistema web atual. Ciclo completo: cadastros, precificação pelo valor do grama, pedidos/orçamentos (vendedor mobile), financeiro e comissões.

## Fonte da verdade

**[docs/especificacao.md](docs/especificacao.md)** é o documento normativo do projeto. Regra: **nenhuma regra de negócio nova entra no código sem antes constar na especificação ou em `docs/regras-negocio.md`.** Divergência entre código e doc é bug de documentação — corrigir o doc no mesmo PR.

Documentos derivados (criados/mantidos pelo agente conforme seção 10 da especificação):

| Arquivo | Conteúdo | Status |
|---|---|---|
| `docs/analise-sistema-atual.md` | Levantamento do sistema web atual (roteiro seção 4) | Pendente (Fase 0) |
| `docs/arquitetura.md` | Backend definitivo, estrutura do monorepo, coleções Firestore, Security Rules | Pendente (após decisão da stack) |
| `docs/regras-negocio.md` | Fórmulas de precificação por grama e elegibilidade de comissão, com exemplos numéricos → testes | Pendente (Fase 1) |
| `docs/briefs/<modulo>.md` | Um brief por módulo (formato do Anexo A da especificação) | Antes de cada módulo |
| `docs/decisoes.md` | ADR simplificado — decisões resolvidas da seção 5 | Contínuo |

## Stack (decidido até agora)

- **Firestore + Firebase Auth + Firebase Storage** — fechado (ADR-002).
- **Monorepo**: apps (web admin, app vendedor PWA) + backend + pacotes compartilhados (tipos, regras de precificação/comissão com testes) — fechado.
- **Backend: Node/TypeScript ponta a ponta**, com **foco em segurança das informações** — fechado (ADR-003 em `docs/decisoes.md`); a seção 7 da especificação é requisito obrigatório, não sugestão.
- Decisões em aberto: ver tabela da seção 5 da especificação. Decisões fechadas: `docs/decisoes.md`.

## Regras de domínio essenciais (resumo — detalhes na especificação)

- **Precificação**: `preço = peso (g) × valor do grama (por teor/indústria/tabela) × fatores`. Valor do grama tem **histórico com vigência**; pedidos preservam o valor da época.
- **Comissões — dois regimes, definidos por indústria**:
  - **Regime A (mensal fixo)**: Spart, Anéis Brasil — pedidos emitidos no mês são comissionados, pagamento dia 15 do mês seguinte, independe do cliente pagar.
  - **Regime B (pós-recebimento)**: Inove, Tendenze, Zarrara — comissão elegível só após pagamento do cliente; entra no próximo fechamento.
- **Permissões**: vendedor vê só os próprios pedidos e só as tabelas de preço liberadas para ele (até 4 tabelas por indústria). Enforcement no backend **e** nas Firestore Security Rules, nunca só na UI.
- **Auditoria append-only** (seção 2.8): toda ação sensível gera registro imutável com antes/depois, gravado pelo servidor.

## Diretrizes obrigatórias para o agente (seção 8 da especificação)

1. Usar a skill `frontend-design` em toda criação/alteração de UI — nada de layout genérico.
2. Seguir a seção 6 (Design): Material Design 3, paleta (primária `#0F2A43`, ação `#1A73E8`, fundo `#EEF3F8`, superfícies `#FFFFFF`, acento `#F7F3EA`), Inter/Roboto, mobile-first no app do vendedor.
3. Feedback em toda ação: snackbar, skeleton, spinner em botão durante submit, erros acionáveis, estados vazios com CTA.
4. Animações sutis (150–300ms). Acessibilidade AA, toque ≥ 44px.
5. Tabelas densas no desktop viram **cards empilhados no mobile** — nunca scroll horizontal.
6. Testes nas regras de negócio compartilhadas; revisão de segurança (seção 7) a cada endpoint novo.

## Convenções do monorepo

- **pnpm workspaces + Turborepo**, Node 22, TypeScript strict. Estrutura: `apps/admin` (Next.js), `apps/vendedor` (React PWA), `functions/` (Cloud Functions v2), `packages/core` (domínio puro, sem Firebase), `packages/ui`, `packages/firebase`. Detalhes em [docs/arquitetura.md](docs/arquitetura.md).
- **Comandos:** `pnpm install` · `pnpm build` · `pnpm test` · `pnpm typecheck` (Turbo na raiz; `pnpm --filter @gestao-hb/core test` para um pacote).
- **Unidades:** dinheiro em **centavos** (inteiro), peso em **miligramas** (inteiro), percentuais decimais (40 = 40%). Arredondamento half-up no centavo, só no fim de cada item — ver [docs/regras-negocio.md](docs/regras-negocio.md).
- **Regras de negócio só em `packages/core`**, com teste para cada exemplo numérico de `docs/regras-negocio.md`. Apps e functions nunca reimplementam cálculo.
- Escritas de negócio via Cloud Functions (callable) com validação zod + auditoria; leituras direto do Firestore sob Security Rules.

## Idioma

Documentação, UI, mensagens de commit e **identificadores de domínio em português (pt-BR)** camelCase (`valorGramaCentavos`, `comissaoEscritorio`). Termos técnicos de infraestrutura permanecem em inglês.
