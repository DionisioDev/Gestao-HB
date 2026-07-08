# Brief — Fase 1: Núcleo de Cadastros, Precificação e Permissões

**Formato:** Anexo A da [especificação](../especificacao.md). **Referências:** [arquitetura.md](../arquitetura.md), [regras-negocio.md](../regras-negocio.md), [analise-sistema-atual.md](../analise-sistema-atual.md), ADR-001..009 em [decisoes.md](../decisoes.md).

## 1. Contexto

Primeira fase funcional do sistema. Entrega os dados-mestre de que todos os módulos seguintes dependem (pedidos, financeiro, comissões): indústrias com regime de comissão e modelo de preço, tabelas de preço com valor do grama versionado, catálogo de produtos, clientes/contatos, vendedores com a matriz de comissão/permissão e a área de usuários. Tudo no **web admin** (`apps/admin`); o app do vendedor só consome esses dados na Fase 2.

## 2. Escopo

### 2.1 Autenticação e shell do admin
- Tela de login (e-mail/senha, "esqueci minha senha", bloqueio após tentativas), sessão 24h.
- Shell: sidebar (espaço reservado para a logo no topo), navegação por módulo, header com avatar/menu do usuário, responsivo (sidebar vira drawer no mobile).

### 2.2 Indústrias
- CRUD com os campos da especificação §2.1 (dados fiscais opcionais quando `logica = true`).
- Configuração por indústria: `regimeComissao` (A/B), `diaPagtoComissao`, `elegibilidadeComissao` (pedidoQuitado | porParcela), `modeloPreco` (porGrama | tabelado), `% comissão do escritório` padrão.
- Listagem com busca, filtro por status e chips de regime/modelo.
- Seed inicial: as 11 indústrias do ADR-004 com seus regimes (A: Spart, Anéis Brasil · B: demais).

### 2.3 Tabelas de preço e valor do grama
- Até 4 tabelas por indústria (nome, ordem, teor opcional).
- Para indústrias `porGrama`: tela de **valores do grama** por (tabela, teor) com **histórico de vigência** — atualizar cria registro novo (nunca edita), mostra linha do tempo; recalcula `produtos/*/precos/*` da indústria (Cloud Function).
- Para `tabelado`: preços vêm do cadastro/importação de produtos.

### 2.4 Produtos
- CRUD: SKU, nome, descrição, peso (g, obrigatório se indústria porGrama), teor, categoria, códigos auxiliares (original, referência, agrupamento, EAN), status.
- **Matriz de preços** produto × tabela (subcoleção `precos/{tabelaId}` com `industriaId` duplicado): editável para `tabelado`, calculada e somente-leitura para `porGrama`.
- Fotos: upload individual (drag-and-drop/URL) + **importação em lote via ZIP** com vínculo pelas 5 chaves (análise §2.7). Redimensionamento no upload (Function).
- **Importação por planilha** (xlsx/csv) por indústria + tabela — caminho da migração ADR-009.
- Listagem com busca, filtro por indústria/categoria/status, foto em miniatura.

### 2.5 Clientes e contatos
- CRUD PJ/PF com os campos confirmados (especificação §2.1 Clientes), incluindo 3 e-mails, endereços de cobrança/entrega e vendedor atribuído.
- Sub-cadastro de contatos (compradores).
- Status com chips coloridos; categorias de cliente (CRUD simples).
- Importação por planilha (migração).

### 2.6 Vendedores
- CRUD + **matriz "indústrias que este vendedor atenderá"**: linhas indústria × tabela ('*' = todas) × comissão proporcional % × pode alterar preço × limite de desconto (análise §9). A matriz é comissão **e** permissão de tabela.
- Ao salvar, Function denormaliza `tabelasLiberadas` (usada pelas Security Rules).
- Clonar matriz de outro vendedor (recurso do legado que os usuários já conhecem).

### 2.7 Área de usuários
- Conforme **Anexo A da especificação** (é o brief de referência): listagem, criação/edição, foto de perfil, reset de senha por link, ativar/desativar com revogação imediata, vínculo com vendedor quando perfil = vendedor.

### 2.8 Auditoria (fundação)
- Middleware de auditoria nas Functions + tela de listagem com filtros (usuário, período, ação, entidade) e diff antes/depois (especificação §2.8). Toda escrita da Fase 1 já gera registro.

## 3. Regras de negócio

- Todas as de [regras-negocio.md](../regras-negocio.md) §1 (precificação) — cálculo **sempre** via `packages/core`, no servidor.
- Valor do grama: histórico append-only; pedido futuro congela o vigente (ADR-006).
- Vendedor sem linha na matriz para (indústria, tabela) não vê preços dessa tabela — e não poderá emitir pedido nela (Fase 2).
- Último admin ativo não se desativa/rebaixa (Anexo A.3).
- Indústria com pedidos não pode ser excluída — apenas inativada (mesmo para produtos/clientes com vínculos).

## 4. Segurança

- Endpoints de escrita: callables com verificação de claims (`admin` para cadastros; leitura conforme Rules já versionadas em `firestore.rules`).
- Validação zod (schemas em `packages/core`) em toda entrada; nunca confiar em preço vindo do cliente.
- Testes de Security Rules no emulador cobrindo: vendedor não lê preço de tabela não liberada; vendedor não lê doc de outro vendedor; auditoria imutável; sessão > 24h recusada.
- Uploads (fotos): content-type e tamanho validados no Storage Rules + Function.

## 5. UX/UI

- **Skill `frontend-design` obrigatória em cada tela** (seção 8). Material 3 + tokens de `packages/ui`; nada de layout genérico.
- Padrões que os usuários já dominam no legado (manter familiaridade sem repetir as dores): busca global por tela, filtros por coluna, personalização leve de colunas; **sem** os postbacks/lentidão do WebForms.
- Feedback: snackbar em toda ação, skeleton em listas, spinner+disable em submits, estados vazios com CTA ("Nenhuma indústria — Nova indústria").
- Tabelas densas no desktop → cards no mobile. Toque ≥ 44px.
- Chips de status sempre via `StatusChip` (cor única por status no sistema todo).

## 6. Critérios de aceite

- [ ] Login com sessão de 24h; após expirar, qualquer leitura do Firestore é negada e o app volta ao login.
- [ ] Admin cadastra indústria porGrama (Inove), tabela "VENDAS - 900" e valor do grama R$ 46,04; produto de 3,5 g exibe preço **R$ 161,14** (exemplo P1) sem nenhum cálculo no cliente.
- [ ] Atualizar o grama para R$ 48,00 cria novo registro no histórico (o antigo permanece) e o preço do produto recalcula sozinho.
- [ ] Vendedor com matriz "Inove/VENDAS-900" **não** consegue ler `precos/HERI-700` nem via console do navegador (Rule nega).
- [ ] Importação de planilha de produtos cria/atualiza em lote com relatório de erros por linha.
- [ ] Todas as escritas aparecem na tela de auditoria com antes/depois e não podem ser alteradas.
- [ ] Critérios do Anexo A.6 (área de usuários) atendidos.
- [ ] Lighthouse acessibilidade ≥ 90 nas telas da fase; navegação por teclado nos modais.

## 7. Fora do escopo (Fase 1)

- Emissão de pedidos/orçamentos (Fase 2), financeiro (Fase 3), fechamento de comissões (Fase 4).
- App do vendedor (só o shell PWA existente).
- Integração Google Drive e WhatsApp.
- Importação automática de fotos por API das indústrias (Fase 5).
- MFA, perfis extras (fornecedor/financeiro/gerente) — estrutura extensível apenas.

## 8. Ordem de implementação sugerida

1. Autenticação + shell + claims + middleware de auditoria (base de tudo).
2. Indústrias + tabelas + valor do grama (com recálculo) — destrava precificação.
3. Produtos + matriz de preços + importação por planilha.
4. Vendedores (matriz) + área de usuários + testes de Rules.
5. Clientes/contatos + categorias + importações.
6. Tela de auditoria + passada de acessibilidade/UX na fase inteira.
