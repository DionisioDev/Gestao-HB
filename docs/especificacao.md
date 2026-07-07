# Especificação — Sistema de Gestão de Pedidos, Financeiro e Comissões

**Versão:** 0.1 (rascunho inicial)
**Data:** 03/07/2026
**Status:** Em levantamento — seções marcadas com `[A PREENCHER]` serão completadas após análise do sistema atual (via Claude Code).

---

## 1. Visão Geral

Sistema de gestão para representação comercial no setor de joias/prata, substituindo o sistema web atual. Cobre o ciclo completo: cadastro de indústrias e itens, precificação pelo valor do grama, emissão de pedidos e orçamentos pelos vendedores (mobile), controle financeiro dos pedidos e apuração/pagamento de comissões.

**Usuários:**
- **Administrador/Gestor:** visão total, cadastros, financeiro, comissionamento.
- **Vendedores:** acesso restrito (próprios pedidos, tabelas de preço liberadas para seu perfil). Tiram pedidos direto no aplicativo, em campo, pelo celular.
- **Possível extensão futura:** acesso para fornecedores (indústrias) e outros perfis.

**Premissas de plataforma:**
- Acesso principal dos vendedores: **celular** (mobile-first, possivelmente PWA ou app).
- Acesso do gestor: desktop e mobile.
- Integração com **Google Drive** para arquivamento de romaneios.

---

## 2. Módulos

### 2.1 Cadastros

#### Indústrias (fornecedores)
- Cadastro de múltiplas indústrias. **Indústrias representadas hoje:** Spart, Anéis Brasil, Inove, Tendenze e Zarrara.
- Cada indústria define seu **regime de comissionamento** (ver seção 2.5).
- Dados: razão social, nome fantasia, CNPJ, contatos, condições comerciais, prazo de entrega. `[A PREENCHER: campos exatos do sistema atual]`
- Cada indústria pode ter **configurações próprias de teor de prata** (ex.: 925 e 950) e **valor do grama** próprio.

#### Itens (produtos)
- Vinculados a uma indústria.
- Um mesmo item pode existir em **teores diferentes de prata** (ex.: dois teores dentro da mesma indústria), com preços distintos.
- Cada item pode ter **até 4 valores de tabela** (tabelas de preço/comissão diferentes — ex.: Tabela A/B/C/D, atacado/varejo, prazo/à vista). `[A PREENCHER: confirmar o que diferencia cada tabela no sistema atual]`
- **Fotos dos itens:** importadas dos sistemas/catálogos das indústrias, para uso em orçamentos e no catálogo interno.
- Dados sugeridos: código do item (código da indústria + código interno), descrição, peso em gramas, teor, categoria, foto(s), status ativo/inativo.

#### Vendedores
- Cadastro com dados pessoais/comerciais, região de atuação, percentuais de comissão.
- Vínculo com perfil de permissões (ver seção 2.6).
- Percentual de comissão pode variar por **indústria**, por **tabela de preço** e/ou por **vendedor**. `[A PREENCHER: confirmar a regra exata usada hoje]`

#### Clientes
- `[A PREENCHER: o sistema atual tem cadastro de clientes? Campos, vínculo com vendedor/região?]`

### 2.2 Precificação (valor do grama)

- O sistema deve calcular preços **pelo valor do grama** internamente:
  - `preço do item = peso (g) × valor do grama (por teor/indústria/tabela) × fatores` `[A PREENCHER: fórmula exata usada hoje — existe multiplicador por tabela? margem? fator de mão de obra?]`
- Valor do grama configurável e atualizável (a prata oscila): manter **histórico de valores do grama** com data de vigência, para que pedidos antigos preservem o preço da época.
- Ao atualizar o valor do grama, o sistema recalcula os preços de tabela dos itens automaticamente.
- Decisão em aberto: preço do pedido é travado no momento da emissão (recomendado) ou acompanha o grama do dia? `[DECIDIR]`

### 2.3 Pedidos e Orçamentos

- **Emissão pelo vendedor no app (mobile):** seleção de cliente, indústria, itens (com foto), quantidades, tabela de preço aplicável ao seu perfil.
- **Orçamentos:** mesma estrutura do pedido, com fotos dos itens, exportável/compartilhável (PDF/WhatsApp) para o cliente. Orçamento pode ser convertido em pedido.
- Status do pedido (proposta inicial): `Orçamento → Emitido → Enviado à indústria → Faturado → Entregue → Cancelado`. `[A PREENCHER: fluxo de status real do sistema atual]`
- Campos do pedido: cliente, vendedor, indústria, itens/quantidades/preços, condição de pagamento, prazo, transportadora, observações. `[A PREENCHER]`
- **Romaneios:** documentos do romaneio arquivados automaticamente no **Google Drive**, organizados por pasta (sugestão: `/Romaneios/{Indústria}/{Ano}/{Mês}/`). `[DECIDIR: estrutura de pastas]`
- Vendedor enxerga **somente os próprios pedidos**.

### 2.4 Financeiro (contas a receber sobre pedidos)

- Por pedido, registrar:
  - **Status de pagamento:** em aberto, parcial, pago.
  - **Como foi pago:** forma de pagamento (boleto, pix, transferência, etc.) e **quando** (data de cada pagamento/parcela).
  - Suporte a **parcelas** (ex.: 30/60/90). `[A PREENCHER: o sistema atual controla parcelas? Como?]`
- **Previsão de comissão** calculada automaticamente a partir do pedido (valor × % de comissão aplicável).
- Flag de **comissão paga** (por pedido e/ou por fechamento — ver 2.5).
- Regra em aberto: comissão é devida sobre pedido **faturado** ou sobre pedido **pago pelo cliente**? `[DECIDIR — impacta todo o módulo]`

### 2.5 Módulo de Comissões

Contexto: a empresa é uma **representação comercial** — a comissão é a receita principal do negócio. Existem **dois regimes de comissionamento**, definidos por indústria:

| Regime | Indústrias | Regra |
|---|---|---|
| **A — Mensal fixo** | Spart, Anéis Brasil | Todos os pedidos **retirados (emitidos) no mês** são comissionados e pagos no **dia 15 do mês seguinte**, independentemente de o cliente já ter pago. |
| **B — Pós-recebimento** | Inove, Tendenze, Zarrara | A comissão só se torna elegível **após o pagamento do cliente**; entra no **próximo fechamento** subsequente à baixa do pagamento. |

Implicações no sistema:

- **Elegibilidade automática:** ao abrir um fechamento, o sistema classifica os pedidos por regime da indústria:
  - Regime A → elegíveis todos os pedidos emitidos no mês de referência.
  - Regime B → elegíveis apenas pedidos com pagamento do cliente baixado e comissão ainda não fechada.
- **Fechamento:** o gestor filtra (vendedor, período, indústria) e **seleciona os pedidos** a comissionar. O sistema pré-seleciona os elegíveis pelo regime, mas permite ajuste manual (incluir/excluir). O fechamento consolida: pedidos, base de cálculo, % aplicado e total por vendedor.
- Ao confirmar, os pedidos são marcados como **comissão fechada/paga**, com data e referência do fechamento.
- **Visão do vendedor — previsão do mês em duas faixas:**
  - **Confirmado:** comissões do Regime A (pedidos do mês anterior, recebimento dia 15) + Regime B já elegíveis para o próximo fechamento.
  - **Aguardando pagamento do cliente:** comissões do Regime B de pedidos ainda em aberto (estimativa, sem data garantida).
- Pedidos cancelados/devolvidos após comissionamento no Regime A: prever **estorno/abatimento** no fechamento seguinte. `[DECIDIR: como é tratado hoje?]`
- Relatórios: comissões por vendedor, por indústria, por período, por regime; comparativo previsto × realizado.

### 2.6 Perfis e Permissões

| Capacidade | Admin | Vendedor |
|---|---|---|
| Ver todos os pedidos | ✅ | ❌ (só os próprios) |
| Tabelas de preço | Todas | Somente as liberadas para seu perfil |
| Cadastros (indústrias, itens, vendedores) | ✅ | ❌ (ou leitura do catálogo) |
| Financeiro completo | ✅ | ❌ |
| Comissões — fechamento | ✅ | ❌ |
| Comissões — previsão/histórico próprios | ✅ | ✅ |
| Emitir pedidos/orçamentos | ✅ | ✅ |

- Permissão de tabela é **por vendedor** (ex.: vendedor X só vê tabelas A e B). `[A PREENCHER: confirmar granularidade — por vendedor, por grupo de vendedores, por indústria?]`
- Prever perfis adicionais futuros (fornecedor, financeiro, gerente).

#### Área de usuários (administração)
- **CRUD de usuários:** criar, editar, ativar/desativar (desativação revoga a sessão imediatamente — ver seção 7).
- **Foto de perfil:** upload pelo próprio usuário ou pelo admin; armazenada no Firebase Storage com redimensionamento; exibida no app, na sidebar e nos registros de pedido.
- **Redefinição de senha:** o admin dispara um **link de redefinição** (e-mail via Firebase Auth) — o usuário define a nova senha sozinho; **nenhuma senha transita em texto ou é visível ao admin**. O próprio usuário também pode solicitar pelo "esqueci minha senha" na tela de login.
- Campos: nome, e-mail (login), telefone, perfil (admin/vendedor/...), vínculo com cadastro de vendedor, tabelas liberadas, status, foto, última sessão.
- Ações sensíveis (criação, mudança de perfil, desativação, disparo de reset) entram no **log de auditoria**.

### 2.7 Integrações

- **Google Drive:** upload automático dos documentos de romaneio; autenticação OAuth com a conta do escritório. `[DECIDIR: conta única do escritório ou por usuário]`
- **Fotos dos itens das indústrias:** importação dos catálogos/sistemas das indústrias. `[A PREENCHER: como as fotos são obtidas hoje? URL pública, portal com login, envio manual? Isso define se dá para automatizar ou se será upload/importação em lote]`
- Futuras: WhatsApp (envio de orçamento), emissão de PDF de pedido/orçamento.

### 2.8 Auditoria (lastro de ações)

Todo evento relevante gera um **registro de auditoria imutável** — o lastro de quem fez o quê no sistema.

**O que é registrado:**
- **Autenticação:** login, logout, falha de login, disparo/uso de link de redefinição de senha, expiração forçada de sessão.
- **Usuários e permissões:** criação/edição/desativação de usuário, mudança de perfil, alteração de tabelas liberadas, troca de foto.
- **Cadastros sensíveis:** alteração do valor do grama, edição de preços/tabelas, edição de percentuais de comissão.
- **Pedidos:** criação, edição, mudança de status, cancelamento, conversão de orçamento.
- **Financeiro:** baixa/estorno de pagamento, alteração de parcelas.
- **Comissões:** criação/confirmação de fechamento, estorno, marcação de comissão paga.

**Cada registro contém:** usuário (id, nome, perfil), data/hora do servidor, ação, entidade afetada (tipo + id), **valores anterior → novo** (diff), e origem (app/web, IP, dispositivo).

**Garantias:**
- **Append-only:** a coleção de auditoria não aceita edição nem exclusão por nenhum perfil (negado nas Security Rules e no backend); registros são gravados pelo servidor, nunca pelo cliente.
- Retenção mínima de 5 anos. `[DECIDIR: prazo definitivo]`

**Tela de auditoria (perfil admin):** listagem com filtros por usuário, período, tipo de ação e entidade; visualização do diff antes/depois; exportação CSV. Atalho contextual: em qualquer pedido/usuário, ação "ver histórico" abre a auditoria já filtrada por aquele registro.


---

## 3. Modelo de Dados (rascunho inicial)

```
Industria (id, nome, cnpj, contatos, prazo_entrega, ativo,
           regime_comissao: mensal_fixo | pos_recebimento,
           dia_pagto_comissao: int?)                            # ex.: 15 p/ regime A
TeorPrata (id, industria_id, teor, descricao)                  # ex.: 925, 950
ValorGrama (id, industria_id, teor_id?, valor, vigencia_inicio) # histórico
TabelaPreco (id, industria_id, nome, ordem 1..4, fator/regra)
Item (id, industria_id, codigo, descricao, peso_g, teor_id, categoria, ativo)
ItemFoto (id, item_id, url/arquivo, origem)
ItemPreco (item_id, tabela_id, preco, calculado_por_grama: bool)
Vendedor (id, usuario_id, nome, regiao, ativo)
VendedorTabela (vendedor_id, tabela_id)                        # permissões de tabela
RegraComissao (id, vendedor_id?, industria_id?, tabela_id?, percentual)
Cliente (id, nome/razao, cnpj/cpf, cidade, vendedor_id?, ...)
Pedido (id, numero, tipo: orcamento|pedido, cliente_id, vendedor_id,
        industria_id, tabela_id, status, data_emissao, condicao_pagto,
        valor_total, valor_grama_congelado, obs)
PedidoItem (pedido_id, item_id, qtde, peso_g, preco_unit, subtotal)
Pagamento (id, pedido_id, parcela, valor, forma, data_vencimento, data_pagto, status)
Comissao (id, pedido_id, vendedor_id, base, percentual, valor_previsto,
          regime: mensal_fixo | pos_recebimento,
          status: aguardando_pagto_cliente | elegivel | fechada | paga | estornada,
          data_elegibilidade, previsao_recebimento, fechamento_id?)
FechamentoComissao (id, vendedor_id, periodo, total, data_pagto, obs)
Romaneio (id, pedido_id, arquivo_drive_id, url, data)
Usuario (id, login/email, nome, telefone, perfil: admin|vendedor|..., 
         foto_url, vendedor_id?, ativo, ultima_sessao)
Auditoria (id, usuario_id, usuario_nome, perfil, acao, entidade_tipo, entidade_id,
           valores_antes, valores_depois, origem: web|app, ip, dispositivo,
           timestamp_servidor)                                  # append-only, imutável
```

---

## 4. Roteiro para análise do sistema atual (executar com Claude Code)

Objetivo: mapear o sistema web atual e preencher os `[A PREENCHER]` deste documento. Para cada aba/tela:

1. **Inventário de telas:** listar todas as abas/menus e o propósito de cada uma.
2. **Campos:** para cada tela de cadastro/edição, listar todos os campos, tipos, obrigatoriedade e valores possíveis (dropdowns!).
3. **Listagens:** colunas exibidas, filtros disponíveis, ações por linha.
4. **Fluxo de pedido:** passo a passo da emissão de um pedido — telas, campos, cálculo do total, status possíveis e transições.
5. **Precificação:** onde o valor do grama é configurado, como o preço do item é calculado, o que diferencia as tabelas de preço entre si.
6. **Comissões:** onde/como o percentual é definido, como é calculada, existe fechamento hoje?
7. **Financeiro:** como pagamentos são registrados (parcelas? formas?), quais status existem.
8. **Permissões:** logar (se possível) com um perfil de vendedor e registrar as diferenças de acesso.
9. **Exportações:** exportar CSV/Excel de pedidos, itens, clientes e tabelas de preço — anexar ao projeto para migração de dados.
10. **Fotos:** verificar de onde vêm as imagens dos itens (URLs, upload manual, integração).
11. **Relatórios:** listar todos os relatórios existentes e seus filtros.
12. **Dores:** anotar o que é ruim/limitado hoje (para não replicarmos).

> Saída esperada: atualizar este documento substituindo os `[A PREENCHER]`, e gerar um anexo `analise-sistema-atual.md` com prints/descrições tela a tela.

---

## 5. Decisões em aberto

| # | Decisão | Opções | Status |
|---|---|---|---|
| 1 | Regra de comissão | **Resolvida: configurável por indústria.** Regime A (mensal fixo, dia 15) p/ Spart e Anéis Brasil; Regime B (pós-recebimento) p/ Inove, Tendenze e Zarrara | ✅ Fechada |
| 1b | Estorno de comissão em cancelamento/devolução (Regime A) | abatimento no fechamento seguinte / outro | Aberta |
| 2 | Preço travado na emissão do pedido ou grama do dia | travado (recomendado) / dinâmico | Aberta |
| 3 | Estrutura de pastas do Drive para romaneios | por indústria/ano/mês | Aberta |
| 4 | Plataforma mobile | PWA / app nativo | Aberta |
| 5 | Migração de dados do sistema atual | importar histórico ou começar limpo | Aberta |
| 6 | Stack tecnológica | **Resolvida: Firebase (Firestore/Auth/Storage) + monorepo + backend Node/TypeScript, com foco em segurança das informações** — ver ADR-003 em `docs/decisoes.md` | ✅ Fechada (07/07/2026) |
| 7 | Suporte offline no app do vendedor | sim (Firestore offline) / não | Aberta |

---

## 6. Design e Identidade Visual

### Direção
Visual **moderno e profissional**, com referência principal no **Google Material Design 3**: superfícies limpas, hierarquia clara, cantos arredondados, sombras sutis, animações discretas de feedback. Prioridade absoluta: **intuitivo e fácil de usar** — o vendedor em campo precisa tirar um pedido no celular em poucos toques, sem treinamento.

A logo será incluída posteriormente; reservar espaço no topo da sidebar (desktop) e no header (mobile).

### Paleta de cores

| Papel | Cor | Sugestão (hex) | Uso |
|---|---|---|---|
| Primária | Azul escuro | `#0F2A43` | Sidebar/header, títulos, botões primários em telas claras |
| Ação/Destaque | Azul tech | `#1A73E8` | Botões de ação, links, elementos ativos, gráficos |
| Fundo principal | Gelo | `#EEF3F8` | Background geral do app |
| Superfícies | Branco | `#FFFFFF` | Cards, tabelas, modais, inputs |
| Acento suave | Creme | `#F7F3EA` | Destaques sutis, cards de resumo, badges neutras |

Cores funcionais complementares: verde `#1E8E3E` (pago/sucesso), âmbar `#F9AB00` (pendente/atenção), vermelho `#D93025` (cancelado/erro) — tons alinhados ao Material.

> Os hex são ponto de partida; refinar quando a logo for definida para garantir harmonia.

### Tipografia e componentes
- Fonte: **Inter** ou **Roboto** (padrão Google), com escala tipográfica bem definida (títulos 20–24, corpo 14–16, legendas 12).
- Componentes Material: cards com cantos arredondados (8–12px), botões preenchidos para ação principal e outline/texto para secundárias, chips para filtros e status, snackbars para feedback, FAB no mobile para "Novo pedido".
- Tabelas densas no desktop (financeiro/comissões) e **cards empilhados no mobile** — nunca tabela horizontal com scroll no celular.

### Princípios de UX
1. **Mobile-first para o vendedor:** fluxo de pedido otimizado para o polegar — busca de item com foto grande, adição rápida de quantidade, resumo fixo do total no rodapé.
2. **Dashboard objetivo:** ao logar, o vendedor vê previsão de comissão do mês (confirmado × aguardando) e pedidos recentes; o gestor vê totais do mês, pedidos por status e comissões a fechar.
3. **Status sempre visíveis por cor:** pago (verde), pendente (âmbar), cancelado (vermelho), com chips consistentes em todo o sistema.
4. **Poucos cliques:** conversão orçamento→pedido em 1 ação; repetir pedido anterior; favoritos de itens.
5. **Feedback imediato:** toda ação confirma com snackbar; estados de carregamento com skeleton screens.
6. **Acessibilidade:** contraste mínimo AA (o azul escuro sobre branco e o branco sobre azul tech atendem), áreas de toque ≥ 44px no mobile.

---

## 7. Arquitetura Técnica

### Stack definida
- **Banco de dados: Firebase** (Firestore) — decisão fechada.
- **Autenticação: Firebase Auth** (par natural do Firestore; ver Segurança).
- **Storage: Firebase Storage** para fotos dos itens e arquivos.
- **Estrutura: monorepo** — apps (web admin, app do vendedor) + backend + pacotes compartilhados (tipos, regras de cálculo de preço/comissão, validações). Regras de negócio críticas (precificação por grama, elegibilidade de comissão) vivem em um pacote compartilhado com testes, usadas por frontend e backend — uma única fonte da verdade.

### Backend — recomendação
O cliente cogita **.NET**; ambos os caminhos são viáveis, com trade-offs:

| Critério | Node/TypeScript (recomendado) | .NET (ASP.NET Core) |
|---|---|---|
| Integração Firebase | Nativa e de 1ª classe (Admin SDK, Cloud Functions, triggers do Firestore) | Boa via `FirebaseAdmin` e `Google.Cloud.Firestore`, mas sem triggers nativos |
| Monorepo | Uma linguagem só (TS no front, back e pacotes compartilhados) — tipos compartilhados de ponta a ponta | Duas linguagens; tipos duplicados ou gerados via OpenAPI |
| Hospedagem | Cloud Functions/Cloud Run — serverless, escala a zero, custo baixo p/ este porte | Cloud Run ou VM — funciona bem, um pouco mais de infra |
| Time/manutenção | Ecossistema alinhado ao Firebase e ao frontend | Vale a pena se já existe forte domínio de .NET |

> **Decidido (07/07/2026 — ADR-003):** TypeScript de ponta a ponta (Next.js/React no front + Cloud Functions ou API Node no back), pelo encaixe com Firebase e pelo pacote de tipos/regras compartilhado no monorepo. **Segurança das informações é prioridade inegociável** — os requisitos desta seção 7 são obrigatórios em toda entrega.

### Frontend
- **Web admin:** React (Next.js) com Material Design 3 (ver seção 6).
- **App do vendedor:** PWA mobile-first com **suporte offline** (persistência do Firestore) — vendedor consegue montar pedido em campo sem sinal e sincronizar depois. `[Confirmar necessidade de offline]`

### Segurança (prioridade do projeto)
- **Autenticação obrigatória em toda a API:** nenhum endpoint público; verificação de token do Firebase Auth (Bearer JWT) em todas as requisições.
- **Login e controle de sessão (sessão de 1 dia):**
  - Login por e-mail e senha (Firebase Auth), com "esqueci minha senha" e limite de tentativas (bloqueio temporário após falhas consecutivas).
  - **Sessão expira em 24 horas** após a autenticação: o backend e as Security Rules validam o `auth_time` do token e recusam sessões com mais de 24h, exigindo novo login. Nada de sessão eterna por refresh token.
  - Revogação imediata: logout remoto e desativação de usuário derrubam a sessão na hora (revoke de refresh tokens + checagem de flag `ativo`).
  - MFA opcional para o perfil admin.
  - Eventos de login/logout/falha registrados na auditoria (seção 2.8).
  - App do vendedor: se a sessão expirar com pedido montado offline, o rascunho é preservado localmente e sincroniza após o novo login — o vendedor não perde trabalho.
- **Autorização em camadas (defesa em profundidade):**
  1. Custom claims no token (perfil: admin/vendedor) verificadas no backend;
  2. **Firestore Security Rules** espelhando as permissões (vendedor só lê os próprios pedidos e as tabelas liberadas) — mesmo que a API falhe, o banco não entrega dado indevido;
  3. Checagens de autorização na camada de serviço do backend.
- **Criptografia:** TLS em todo o tráfego; dados em repouso criptografados (padrão do Firebase); segredos em Secret Manager (nunca em código); hash de qualquer credencial fora do Auth.
- **App Check** para garantir que só os apps oficiais chamam a API/Firestore.
- **Auditoria:** lastro imutável de todas as ações relevantes — ver seção 2.8 (módulo dedicado).
- **LGPD:** minimização de dados pessoais de clientes, controle de acesso por perfil, possibilidade de exclusão/anonimização.
- Validação de entrada em todos os endpoints (schema validation), proteção contra injeção, rate limiting.

---

## 8. Diretrizes para o agente de desenvolvimento (Claude Code)

O agente deve atuar como **especialista em UX e UI**, não apenas como implementador. Diretrizes obrigatórias:

1. **Usar as skills de frontend disponíveis** (ex.: `frontend-design`) em toda criação ou alteração de interface — nada de layout genérico/templated.
2. **Animações e micro-interações:** transições suaves entre telas, animações discretas de entrada de cards/listas, estados de hover/press perceptíveis. Sempre sutis e rápidas (150–300ms) — nunca atrapalhar o uso.
3. **Feedback ao usuário é inegociável:** toda ação tem resposta visível — snackbar/toast de confirmação, skeleton screens em carregamentos, spinners em botões durante submit (com botão desabilitado), mensagens de erro claras e acionáveis (o que houve + o que fazer), estados vazios bem desenhados com call-to-action.
4. **Seguir a seção 6 (Design)** à risca: paleta, Material Design 3, tipografia, mobile-first no app do vendedor.
5. **Consistência:** componentes reutilizáveis no pacote de UI do monorepo; um mesmo status tem sempre a mesma cor e o mesmo chip em qualquer tela.
6. **Acessibilidade:** contraste AA, áreas de toque ≥ 44px, navegação por teclado no admin, labels em todos os inputs.
7. **Qualidade:** testes nas regras de negócio compartilhadas (precificação, comissões); revisar segurança (seção 7) a cada endpoint novo.

---

## 9. Fases sugeridas de execução

1. **Fase 0 — Levantamento:** análise do sistema atual (Claude Code) + fechamento das decisões da seção 5.
2. **Fase 1 — Núcleo:** cadastros (indústrias, teores, itens, tabelas, vendedores, clientes) + precificação por grama + permissões.
3. **Fase 2 — Pedidos:** emissão mobile de orçamentos/pedidos com fotos, PDF, romaneio no Drive.
4. **Fase 3 — Financeiro:** pagamentos/parcelas, previsão de comissão.
5. **Fase 4 — Comissões:** fechamento por seleção de pedidos, visão do vendedor (previsão do mês), relatórios.
6. **Fase 5 — Extensões:** acesso de fornecedores, importação automática de fotos, WhatsApp.

---

## 10. Documentação do projeto — arquivos a gerar (instrução ao agente)

**Este é o único documento de entrada do projeto** (além do `demo-sistema.html`, referência visual). Os demais documentos devem ser **criados e mantidos pelo agente de desenvolvimento** no repositório, conforme abaixo:

| Arquivo | Conteúdo | Quando criar |
|---|---|---|
| `CLAUDE.md` | Resumo do projeto apontando para este documento como fonte da verdade; convenções do monorepo, comandos de build/test | Início do repositório |
| `docs/analise-sistema-atual.md` | Resultado do levantamento do sistema web atual (roteiro da seção 4), tela a tela; ao concluir, **atualizar os `[A PREENCHER]` deste documento** | Fase 0 |
| `docs/arquitetura.md` | Decisão final de backend (seção 7), estrutura do monorepo, coleções do Firestore derivadas do modelo da seção 3, estratégia de Security Rules | Após decisão da stack |
| `docs/regras-negocio.md` | Fórmulas fechadas de precificação por grama e elegibilidade de comissão por regime, com exemplos numéricos que virarão testes | Fase 1 |
| `docs/briefs/<modulo>.md` | Um brief por módulo no formato do Anexo A (contexto, escopo, regras, segurança, UX, critérios de aceite, fora do escopo) | Antes de cada módulo |
| `docs/decisoes.md` | Registro de decisões (ADR simplificado): mover para cá as linhas resolvidas da tabela da seção 5 | Contínuo |

Regra: **nenhuma regra de negócio nova entra no código sem antes constar neste documento ou em `docs/regras-negocio.md`.** Divergência entre código e documentação é bug de documentação — corrigir o doc no mesmo PR.

---

## Anexo A — Brief de implementação: Área de Usuários com Edição de Permissões

*(Formato de referência para os demais briefs de módulo.)*

### A.1. Contexto

Sistema de gestão para representação comercial (setor prata/joias). A área de usuários é administrativa: o gestor gerencia contas, fotos, senhas e — ponto central desta tarefa — **quais tabelas de preço cada vendedor pode ver**. Essa permissão controla o que o vendedor enxerga ao montar pedidos no app: preços das tabelas não liberadas jamais chegam ao cliente (filtro no backend e nas Security Rules, não só na UI).

### A.2. Escopo desta tarefa

1. **Listagem de usuários** — colunas: usuário (foto + nome + e-mail), perfil, tabelas liberadas, última sessão, status, ações. Busca por nome/e-mail e filtro por perfil e status.
2. **Criação/edição de usuário** — nome, e-mail (login), telefone, perfil (admin | vendedor), vínculo com cadastro de vendedor (obrigatório quando perfil = vendedor), status ativo/inativo.
3. **Foto de perfil** — upload com preview imediato, crop quadrado, redimensionamento (máx. 512px) antes do envio ao Firebase Storage; aceitar apenas image/*; limite 5 MB com erro claro se exceder.
4. **Redefinição de senha** — botão por usuário → modal de confirmação exibindo o e-mail de destino → dispara e-mail de reset do Firebase Auth. Nunca exibir, gerar ou digitar senhas. Registrar no log de auditoria.
5. **Edição de permissões de tabela (novo):**
   - No painel de edição do usuário vendedor, exibir as tabelas de preço agrupadas **por indústria** (Spart, Anéis Brasil, Inove, Tendenze, Zarrara), cada indústria com suas tabelas (até 4) como checkboxes/switches.
   - Atalhos: "liberar todas da indústria" e "remover todas".
   - Resumo visível na listagem (ex.: chips "Spart: B, C · Inove: A").
   - Alterações de permissão têm efeito **imediato**: na próxima leitura o vendedor só recebe as tabelas liberadas (invalidar cache/claims se aplicável).
6. **Ativar/desativar usuário** — desativação com modal de confirmação; deve **revogar a sessão imediatamente** (revoke refresh tokens no Firebase Auth + flag checada nas Security Rules).

### A.3. Regras de negócio

- Perfil **admin**: acesso total; não possui vínculo com vendedor nem restrição de tabelas.
- Perfil **vendedor**: enxerga somente (a) os próprios pedidos e (b) itens/preços das tabelas liberadas. Sem nenhuma tabela liberada, o app exibe estado vazio orientando a falar com o gestor — nunca erro cru.
- Um usuário não pode desativar a si mesmo nem remover o próprio perfil de admin se for o último admin ativo (bloquear com mensagem explicativa).
- Toda mudança de permissão, perfil, status e disparo de reset grava no **log de auditoria**: quem, quando, valor anterior → novo.

### A.4. Segurança (inegociável — ver seção 7 da especificação)

- Endpoints desta área exigem perfil admin (verificação do token + custom claims no backend).
- **Firestore Security Rules** espelham as permissões: vendedor não consegue ler documentos de tabelas não liberadas nem pedidos de outros vendedores, mesmo chamando o banco diretamente.
- Permissões de tabela armazenadas no servidor (documento do usuário + claims), nunca decididas no cliente.
- Upload de foto: validar content-type e tamanho no backend/Storage Rules, não apenas na UI.

### A.5. UX/UI (seções 6 e 8 da especificação)

- Usar a skill de frontend; seguir paleta e componentes do design system (Material 3, chips de status, botões pill).
- Feedback em toda ação: snackbar de confirmação, spinner no botão durante submit (botão desabilitado), erros acionáveis.
- Modais para ações sensíveis (reset de senha, desativação) com texto explicando a consequência.
- Foto: hover no avatar mostra ícone de câmera; preview imediato após seleção; animações sutis (150–300ms).
- Responsivo: tabela vira cards empilhados no mobile.

### A.6. Critérios de aceite

- [ ] Admin cria vendedor, sobe foto, libera tabelas "Spart B" e "Inove A"; ao logar, esse vendedor vê apenas essas tabelas no fluxo de pedido.
- [ ] Tentativa de leitura de tabela não liberada direto no Firestore é negada pelas Rules.
- [ ] Reset de senha envia e-mail e nenhuma senha aparece em tela, log ou rede.
- [ ] Desativar usuário derruba a sessão ativa dele em até 1 minuto.
- [ ] Último admin ativo não consegue se desativar/rebaixar.
- [ ] Todas as ações sensíveis aparecem no log de auditoria com antes/depois.
- [ ] Lighthouse acessibilidade ≥ 90 na tela; navegação por teclado funcional nos modais.

### A.7. Fora do escopo (não implementar agora)

- Perfis adicionais (fornecedor, financeiro, gerente) — apenas deixar a estrutura extensível.
- MFA (previsto para admin em fase posterior).
- Convite de usuário por link de onboarding.
