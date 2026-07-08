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

## ADR-004 — Escopo de indústrias: as 11 do sistema atual (todas menos "Hb Joias")

- **Data:** 07/07/2026 (confirmado pelo cliente)
- **Decisão:** entram no novo sistema **todas as indústrias do SuasVendas exceto "Hb Joias"**: ANEIS BRASIL, BRILHUS, CAMADI, GENUELE, IMPORTADOS, INOVE, PRONTA ENTREGA, SPART, TENDENZE, ZARRARA e ZARRARA LUXO. A especificação citava 5; o levantamento revelou o conjunto completo.
- **Consequências:** o cadastro de indústrias precisa aceitar tanto indústrias com dados fiscais completos quanto "indústrias lógicas" (agrupadores de catálogo, sem CNPJ). Migração de dados considera 11 catálogos.

## ADR-005 — Precificação: por grama apenas em Inove e Tendenze; demais por tabela fixa

- **Data:** 07/07/2026 (confirmado pelo cliente)
- **Decisão:** o cálculo pelo **valor do grama** aplica-se somente aos itens de **INOVE** e **TENDENZE**. Todas as demais indústrias usam **preço tabelado** (valores fixos definidos pelas próprias indústrias, importados/cadastrados por tabela). As tabelas "-BRUTO" vistas no sistema atual **não** são preço por grama — são apenas mais uma tabela de valores fixos.
- **Consequências:** o modelo de precificação passa a ser um atributo da indústria (ou da tabela): `por_grama` (peso × valor do grama, com histórico de vigência — seção 2.2 da especificação) vs `tabelado` (preço fixo por item × tabela). O pacote compartilhado de regras de negócio implementa as duas estratégias; o requisito de peso confiável por item vale só para Inove/Tendenze.
