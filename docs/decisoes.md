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

## ADR-006 — Preço travado na emissão do pedido

- **Data:** 07/07/2026
- **Decisão:** o pedido **congela** os preços (e o valor do grama vigente) no momento da emissão; pedidos antigos nunca mudam de valor. Orçamento convertido em pedido pergunta a política (manter preços do orçamento ou atualizar para os atuais — mesmo comportamento do sistema legado).
- **Consequências:** `Pedido.valor_grama_congelado` no modelo; financeiro e comissão calculam sempre sobre valores congelados; recotação de pedido não faturado só por edição explícita com auditoria.

## ADR-007 — Romaneios no Drive em `/Romaneios/{Indústria}/{Ano}/{Mês}/`

- **Data:** 07/07/2026
- **Decisão:** estrutura por indústria → ano → mês; arquivo nomeado com nº do pedido + cliente (mantendo o padrão atual, ex.: `P01760-Cliente.pdf`).
- **Consequências:** o serviço de upload resolve/cria a hierarquia automaticamente; o registro `Romaneio` guarda `arquivo_drive_id` e URL.

## ADR-008 — App do vendedor: PWA com suporte offline

- **Data:** 07/07/2026
- **Decisão:** PWA mobile-first (instalável pelo navegador), com **suporte offline** via persistência do Firestore — o vendedor monta pedido sem sinal e sincroniza depois (fecha também a decisão nº 7 da seção 5).
- **Consequências:** uma única base TypeScript no monorepo; rascunho de pedido preservado localmente inclusive com sessão expirada (seção 7 da especificação); sem publicação em lojas.

## ADR-010 — Área de usuários sem Cloud Functions: foto auto-serviço e desativação por Rules

- **Data:** 21/07/2026
- **Contexto:** o Anexo A pede que o admin suba a foto de qualquer usuário e que a desativação "derrube a sessão em até 1 minuto". As duas coisas exigem Admin SDK (`setCustomUserClaims`, `revokeRefreshTokens`), ou seja, Cloud Functions — e a Cloud Functions API nunca foi habilitada no projeto (`SERVICE_DISABLED`). Storage Rules **não** conseguem consultar o Firestore, então sem custom claims não há como identificar um admin na hora do upload.
- **Decisão:** implementar a área dentro do que as Security Rules garantem sozinhas:
  - **Foto de perfil é auto-serviço** — só o dono da conta faz upload (`request.auth.uid == uid` nas Storage Rules). Na edição de terceiros o admin vê a foto, mas não a substitui.
  - **Desativação vale pelo Firestore** — `sessaoOk()` consulta `usuarios/{uid}.ativo`, então a conta inativa perde leitura e escrita imediatamente. O token do Auth continua renovável e o Storage segue acessível (suas regras não alcançam o Firestore).
  - O próprio usuário pode gravar **apenas** `fotoUrl`, `ultimaSessao` e `atualizadoEm` no próprio documento (`affectedKeys().hasOnly`), nunca perfil, status ou vínculo.
- **Consequências:** dois critérios de aceite do Anexo A ficam parcialmente atendidos e devem ser refeitos quando o Blaze/Functions entrarem — junto com a migração das escritas para callables (§7) e da auditoria para o servidor (§2.8), que hoje também rodam no cliente. **A foto depende ainda de provisionar o Firebase Storage**, que não está habilitado no projeto.

## ADR-009 — Migração: cadastros + pedidos/títulos em aberto

- **Data:** 07/07/2026
- **Decisão:** migrar do SuasVendas os **cadastros** (clientes, contatos, indústrias, produtos/tabelas de preço) e apenas **pedidos e títulos financeiros em aberto**. Histórico completo permanece no SuasVendas para consulta enquanto a assinatura durar.
- **Consequências:** exportações CSV/Excel do sistema atual (3ª rodada da análise) alimentam scripts de importação; dados legados inconsistentes (rascunhos vazios, peso zerado, produto duplicado por tabela) são normalizados na importação, não replicados.
