# Arquitetura — Gestao-HB

**Data:** 07/07/2026 · **Status:** aprovado com ADR-002/003/006/007/008/009 · Fonte da verdade de requisitos: [especificacao.md](especificacao.md)

---

## 1. Visão geral

```
┌─────────────────┐   ┌──────────────────┐
│  apps/admin      │   │  apps/vendedor    │
│  Next.js (web)   │   │  React PWA        │
│  gestor/admin    │   │  mobile-first,    │
│                  │   │  offline (cache   │
│                  │   │  Firestore)       │
└───────┬─────────┘   └────────┬──────────┘
        │  Firebase Auth (JWT, sessão 24h) + App Check
        ▼                      ▼
┌──────────────────────────────────────────┐
│ Firestore  ←— Security Rules (2ª camada) │
│ Storage (fotos)                          │
└───────────────┬──────────────────────────┘
                │ triggers / callables
┌───────────────▼──────────────────────────┐
│ functions/ — Cloud Functions v2 (Node/TS)│
│ · API callable (ações de negócio)        │
│ · triggers (auditoria, comissões)        │
│ · integração Google Drive (romaneios)    │
│ · jobs agendados (fechamentos, sessões)  │
└──────────────────────────────────────────┘
        packages/core = regras de negócio compartilhadas
        (precificação, comissões, validações zod) usadas
        pelos 2 apps e pelas functions — fonte única.
```

**Princício central:** leituras vão direto ao Firestore (com Security Rules garantindo o recorte por perfil); **escritas de negócio passam por Cloud Functions** (callable), que validam com `packages/core`, numeram, congelam preços e gravam auditoria com o Admin SDK. Exceção: rascunho de pedido offline do vendedor (gravado localmente e submetido via callable ao sincronizar).

## 2. Monorepo

Gerenciador: **pnpm workspaces + Turborepo**. Node 22, TypeScript strict em tudo.

```
Gestao-HB/
├── apps/
│   ├── admin/          # Next.js — web do gestor (desktop-first, responsivo)
│   └── vendedor/       # Vite + React PWA — app do vendedor (mobile-first, offline)
├── functions/          # Cloud Functions v2 (região southamerica-east1)
├── packages/
│   ├── core/           # domínio: tipos, zod schemas, precificação, comissões (100% testado)
│   ├── ui/             # design system Material 3 (tokens da seção 6, componentes, chips de status)
│   └── firebase/       # inicialização/client helpers compartilhados pelos 2 apps
├── firestore.rules     # Security Rules (versionadas, com testes no emulador)
├── storage.rules
├── firebase.json       # hosting (2 sites), functions, emuladores
└── docs/
```

- **`packages/core`** é a única fonte de regras: `calcularPrecoItem()` (estratégias `por_grama` × `tabelado`), `classificarElegibilidadeComissao()` (Regime A/B), `calcularComissao()` (escritório × proporcional do vendedor), validações de pedido/parcelas. Sem dependência de Firebase — puro e testável.
- **`packages/ui`**: paleta (`#0F2A43`, `#1A73E8`, `#EEF3F8`, `#FFFFFF`, `#F7F3EA` + verde/âmbar/vermelho funcionais), tipografia Inter, chips de status com cor única em todo o sistema (seções 6/8 da especificação).

## 3. Modelo de dados — coleções Firestore

Convenção: coleções e campos em **português camelCase** (`valorGramaCongelado`). Datas como `Timestamp`. Valores monetários em **centavos (integer)** para evitar ponto flutuante; pesos em **miligramas (integer)**.

```
industrias/{id}
  nome, fantasia?, cnpj?, inscrEstadual?, endereco{...}?, telefone?, email?, pix?
  logica: bool                      # indústria "agrupador" sem dados fiscais
  regimeComissao: 'mensalFixo' | 'posRecebimento'
  diaPagtoComissao?: number         # ex.: 15 (regime A)
  modeloPreco: 'porGrama' | 'tabelado'   # ADR-005: porGrama só Inove/Tendenze
  prazoEntregaDias?, condicoesComerciais?, ativo

industrias/{id}/tabelasPreco/{tabelaId}
  nome ("VENDAS - 900"), ordem (1..4), teor? (700|900|925), ativo

valoresGrama/{id}                   # histórico append-only (regra: nunca editar)
  industriaId, tabelaId?, teor, valorCentavos, vigenciaInicio, criadoPor

produtos/{id}
  industriaId, sku, nome, descricao?, pesoMg?, teor?, categoria?
  codigoOriginal?, referencia?, referenciaAgrupamento?, ean?
  fotos: [{storagePath, origem}], ativo
produtos/{id}/precos/{tabelaId}     # SUBCOLEÇÃO por tabela — ver §4 (Rules filtram por tabela liberada)
  precoCentavos, calculadoPorGrama: bool, atualizadoEm

clientes/{id}
  tipoPessoa: 'PJ'|'PF', razaoSocial, fantasia?, cnpjCpf, inscrEstadual?
  endereco{...}, enderecoCobranca?, enderecoEntrega?
  emails { geral?, financeiro?, nfe? }, telefones[], pix?
  vendedorId?, status: 'ativo'|'inativo'|'juridico'|'potencial'|'prospectado'|'semCredito'|'fechou'|'lead'
  categoriaId?, redeId?, matrizId?, limiteCreditoCentavos?, segmento?, observacoes?
clientes/{id}/contatos/{contatoId}  # compradores
  nome, email?, celular?, whatsapp?, aniversario?

usuarios/{uid}                      # uid = Firebase Auth
  email, nome, telefone?, perfil: 'admin'|'vendedor', vendedorId?
  fotoStoragePath?, ativo, ultimaSessao
vendedores/{id}
  usuarioId, nome, regioes?[], ativo
  regras: [{ industriaId, tabelaId: string|'*', comissaoProporcionalPct,
             acrescimoTabelaPct, podeAlterarPreco, limiteDescontoPct }]
  # matriz vendedor × indústria × tabela = comissão E permissão de tabela (análise §9)

pedidos/{id}
  numero (sequencial via transação), tipo: 'orcamento'|'pedido'
  clienteId, contatoId?, vendedorId, industriaId, tabelaId
  status: 'rascunho'|'emitido'|'enviadoIndustria'|'faturado'|'entregue'|'finalizado'|'cancelado'
  dataEmissao, validade? (orçamento), condicaoPagto, numeroErp?, codigoRastreio?
  itens: [{ produtoId, sku, descricao, qtde, pesoMg?, precoTabelaCentavos,
            precoFinalCentavos, subtotalCentavos }]          # embutido (limite 1MB ok)
  valorGramaCongelado?: { valorCentavos, valorGramaId, teor } # ADR-006
  totais { itens, freteCentavos, acrescimoCentavos, descontoCentavos, totalCentavos, pesoTotalMg }
  observacoes?, observacaoPrivada?, enderecoEntrega?, enderecoCobranca?
pedidos/{id}/parcelas/{n}
  numero ("1/3"), valorCentavos, forma, vencimento, valorRecebidoCentavos, dataPagto?, status: 'aberto'|'parcial'|'pago'

comissoes/{id}                      # 1 por pedido (comissão do escritório + previsão do vendedor)
  pedidoId, vendedorId, industriaId, regime, baseCentavos
  escritorio { pct, valorCentavos }         # comissão da representação
  vendedor  { pctProporcional, valorCentavos }
  status: 'aguardandoPagtoCliente'|'elegivel'|'fechada'|'paga'|'estornada'
  dataElegibilidade?, previsaoRecebimento?, fechamentoId?

fechamentosComissao/{id}
  vendedorId, periodo ("2026-07"), pedidoIds[], totalCentavos, dataPagto, status, obs?

romaneios/{id}
  pedidoId, driveFileId, url, nomeArquivo, data

auditoria/{id}                      # APPEND-ONLY — gravada SÓ pelo Admin SDK (functions)
  usuarioId, usuarioNome, perfil, acao, entidadeTipo, entidadeId
  antes?, depois?, origem: 'admin'|'vendedor', ip?, dispositivo?, timestamp (servidor)

config/contadores                   # numeração sequencial de pedido (transação)
```

**Por que preços em subcoleção:** Security Rules não filtram campos de um documento — se o preço de todas as tabelas ficasse num map dentro de `produtos/{id}`, o vendedor leria tudo. Com `produtos/{id}/precos/{tabelaId}`, a Rule nega leitura de tabela não liberada **no nível do banco** (critério de aceite A.6 da especificação).

## 4. Segurança (implementa a seção 7 da especificação)

**Autenticação:** Firebase Auth (e-mail/senha) + custom claims `{ perfil, vendedorId? }` gravadas pelas functions. Sessão de 24h: Rules e backend rejeitam `request.auth.token.auth_time < now - 24h`; desativação de usuário → `revokeRefreshTokens()` + flag `ativo` checada nas Rules (efeito ≤ 1 min, tempo de expiração do ID token).

**Autorização em 3 camadas:**
1. **Claims no token** — perfil verificado em toda callable.
2. **Security Rules** (espelho das permissões):
   - `usuarios/{uid}`: leitura do próprio doc; escrita só via functions.
   - `pedidos`: admin lê tudo; vendedor lê/consulta apenas `vendedorId == token.vendedorId`. Escrita de negócio só via functions (Rules negam create/update direto, exceto campos de rascunho do próprio vendedor se optarmos por rascunho no servidor).
   - `produtos`: leitura autenticada; `produtos/*/precos/{tabelaId}`: vendedor só lê se `tabelaId` estiver nas regras do seu doc `vendedores/{id}` (lookup via `get()`); admin lê tudo.
   - `valoresGrama`, `comissoes`, `fechamentosComissao`, `auditoria`: leitura por perfil; **escrita direta sempre negada** (`allow write: if false`) — só Admin SDK.
   - Todas as regras exigem `auth != null`, `auth_time` fresco, `ativo == true` e **App Check**.
3. **Camada de serviço** (functions): re-validação de perfil/propriedade + validação de entrada com zod (schemas do `packages/core`) antes de qualquer escrita.

**Auditoria:** middleware nas functions grava `auditoria/` (diff antes→depois) na mesma operação; triggers do Firestore cobrem escritas fora do fluxo padrão. Coleção sem update/delete para qualquer cliente. Retenção ≥ 5 anos.

**Segredos:** Secret Manager (credenciais OAuth do Drive, chaves). Nada em código ou `.env` commitado.

## 5. Fluxos críticos

- **Emissão de pedido (vendedor):** rascunho local (IndexedDB/persistência Firestore) → `emitirPedido` (callable): valida permissão de tabela, recalcula preços no servidor (nunca confia no cliente), congela `valorGramaCongelado` se `porGrama` (ADR-006), numera via transação em `config/contadores`, cria parcelas, grava `comissoes/` prevista + auditoria. **Nada de rascunho numerado no banco ao abrir a tela** (dor do legado).
- **Baixa de pagamento (admin):** `baixarParcela` (callable) → atualiza parcela/status do pedido → se regime B e pedido quitado, marca `comissoes.status = 'elegivel'` + `dataElegibilidade` → auditoria.
- **Fechamento de comissão:** `abrirFechamento` lista elegíveis por regime (core), gestor ajusta seleção, `confirmarFechamento` marca comissões como `fechada/paga` com referência, gera romaneio de fechamento se aplicável + auditoria.
- **Romaneio no Drive:** ao emitir/faturar, function gera PDF e envia à pasta `/Romaneios/{Indústria}/{Ano}/{Mês}/` (OAuth conta única do escritório), salva `romaneios/`.
- **Atualização do valor do grama:** `atualizarValorGrama` cria novo doc em `valoresGrama` (histórico intacto) → trigger recalcula `produtos/*/precos/*` das tabelas `porGrama` da indústria → auditoria. Pedidos existentes não mudam.

## 6. Ambientes, CI/CD e qualidade

- **Projetos Firebase:** `gestao-hb-dev` (emuladores + deploy de teste) e `gestao-hb-prod`. Deploy por alias (`firebase use`).
- **Emuladores** (Auth, Firestore, Functions, Storage) para desenvolvimento local e testes de Rules (`@firebase/rules-unit-testing`).
- **CI (GitHub Actions):** em todo PR — typecheck, lint, testes do `packages/core` (fórmulas com os exemplos numéricos de `docs/regras-negocio.md`), testes de Rules. Deploy: manual/por tag na fase inicial.
- **Testes obrigatórios:** 100% das funções de precificação/comissão do core; testes de Rules cobrindo os critérios de aceite (vendedor não lê tabela não liberada nem pedido alheio).

## 7. Hospedagem e custos

Firebase Hosting com 2 sites (admin + vendedor) no plano Blaze; Functions em `southamerica-east1`; escala a zero. Para o volume atual (≈200 pedidos/ano, 156 clientes, 2–5 usuários), o custo mensal projetado fica dentro/próximo da cota gratuita — compatível com a premissa de custo baixo.
