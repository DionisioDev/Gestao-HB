# Registro de Decisões (ADR simplificado)

Decisões fechadas migram da tabela da seção 5 de [especificacao.md](especificacao.md) para cá.

---

## ADR-001 — Regime de comissão configurável por indústria

- **Data:** 03/07/2026
- **Decisão:** o regime de comissionamento é um atributo da indústria, com dois regimes:
  - **Regime A — Mensal fixo** (Spart, Anéis Brasil): pedidos emitidos no mês são comissionados e pagos no dia 15 do mês seguinte, independentemente do pagamento do cliente.
  - **Regime B — Pós-recebimento** (Inove, Tendenze, Zarrara): comissão elegível somente após a baixa do pagamento do cliente; entra no fechamento subsequente.
- **Consequências:** entidade `Industria` carrega `regime_comissao` e `dia_pagto_comissao`; elegibilidade no fechamento é classificada automaticamente por regime (seção 2.5 da especificação).

## ADR-002 — Banco, autenticação e storage: Firebase

- **Data:** 03/07/2026
- **Decisão:** Firestore como banco, Firebase Auth para autenticação, Firebase Storage para arquivos. Estrutura em monorepo com pacotes compartilhados (tipos + regras de negócio testadas).
- **Consequências:** autorização em camadas com Firestore Security Rules espelhando as permissões; App Check; sessão de 24h validada por `auth_time` (seção 7 da especificação).

## ADR-003 — Backend em TypeScript ponta a ponta, com foco em segurança

- **Data:** 07/07/2026
- **Decisão:** backend em **Node/TypeScript** (descartado .NET). TypeScript em todo o monorepo: web admin, app do vendedor, backend e pacotes compartilhados.
- **Motivação:** integração de 1ª classe com Firebase (Admin SDK, Cloud Functions, triggers do Firestore), tipos e regras de negócio compartilhados de ponta a ponta numa única linguagem, hospedagem serverless com escala a zero (custo baixo para o porte do projeto).
- **Condição imposta pelo cliente:** **segurança das informações é prioridade inegociável** — toda a seção 7 da especificação (auth obrigatória, sessão 24h, autorização em camadas, Security Rules, App Check, Secret Manager, validação de entrada, rate limiting, auditoria append-only) vale como requisito, não como sugestão. Cada endpoint novo passa por revisão de segurança.
- **Consequências:** `docs/arquitetura.md` (a criar) detalhará a estrutura do monorepo, as coleções do Firestore e a estratégia de Security Rules.
