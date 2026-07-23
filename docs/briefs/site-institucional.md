# Brief — Site Institucional (Landing Page da Empresa)

> **Status (23/07/2026):** ✅ **Implementado e publicado.**
>
> - **No ar:** https://hb-site-5k3.pages.dev (Cloudflare Pages, projeto `hb-site`).
> - **Código:** repositório privado **`DionisioDev/hb-site`** (local: `c:\Workspace\hb-site`), separado do monorepo. Site estático (HTML/CSS/JS, sem build).
> - **Direção final:** versão **clara e luminosa** (não a dark explorada abaixo), com **hero cinematográfico em vídeo** (rodízio de 3 clipes 1080p, CRF 23, SSIM ~0,99) e âncoras escuras (contato e rodapé) para profundidade.
> - **Marca:** logo oficial **HB Joias Representações** aplicada (header e rodapé). Paleta confirmada pela logo: marinho `#0F2A43` + champanhe `#C8A96A`.
> - **Tipografia:** **Cormorant** self-hosted (woff2 500/600) nos títulos; sans do sistema no corpo.
> - **Contato:** WhatsApp **+55 11 96143-1525** com mensagem automática informando que o cliente veio do site (botão flutuante, rodapé, bloco de contato e formulário).
>
> As seções abaixo registram a exploração original (direção dark). A paleta, tipografia e componentes definitivos estão no `README.md` e no `assets/css/styles.css` do projeto `hb-site`.
>
> **Pendências:** tagline oficial, e-mail/CNPJ/endereço/Instagram reais, números reais (anos de mercado, regiões, itens) e fotos das peças para a vitrine (hoje com placeholders metálicos), além dos logos das indústrias.

> **Objetivo deste documento:** servir de briefing completo — design system + roteiro de conteúdo — para a construção de uma página institucional de **altíssimo padrão visual** da empresa. Escrito para ser entregue a um agente/designer ("Claude Design") produzir a implementação.
>
> **Inspiração de referência:** [stoneinvestment.fr/en](https://www.stoneinvestment.fr/en) — consultoria de imóveis de luxo em Mauritius/Provence. O que copiamos é o **arquétipo**, não o conteúdo: estética cinematográfica e escura, sensação de exclusividade, imagens em tela cheia, tipografia serifada refinada, muito respiro (whitespace), navegação minimalista e narrativa que se revela conforme o scroll. **Adaptamos o "luxo imobiliário" para o "luxo da joalheria em prata e folheados".**

---

## 0. Contexto da empresa

- **Negócio:** representação comercial no setor de **joias em prata (925/950) e folheados**. A empresa conecta indústrias (Spart, Anéis Brasil, Inove, Tendenze, Zarrara, Brilhus, Camadi, Genuele e outras) a lojistas e clientes por meio de uma equipe de representantes em campo.
- **Proposta de valor:** curadoria de catálogo, condições comerciais, agilidade de pedido pelo vendedor (app mobile), e a confiança de uma operação estruturada (financeiro, comissões, romaneios).
- **Público da página institucional:** lojistas/clientes potenciais, novas indústrias parceiras e candidatos a representante. Também funciona como cartão de visita da marca.
- **Nome de marca:** `HB` (Representações). **⚠️ Confirmar com o cliente o nome/assinatura exatos e se há logo — hoje não há arquivo de logo no repositório.** Reservar espaço para logo em todos os layouts.

> **Tom:** sofisticado, sóbrio, confiante. Menos "vitrine de e-commerce", mais "casa de curadoria". A prata é fria, elegante, atemporal — o design deve transmitir isso.

---

## 1. Conceito e posicionamento

**Tese criativa:** *"O brilho da prata, a solidez de uma representação de verdade."*

Três pilares narrativos que a página deve comunicar (nesta ordem emocional):

1. **Desejo** — a beleza do produto. Macro-fotografia de peças em prata/folheado, luz controlada, fundo escuro. Faz o visitante querer tocar.
2. **Confiança** — a estrutura por trás. Indústrias representadas, cobertura de regiões, números da operação, processo claro.
3. **Convite** — como fazer parte. Seja lojista, indústria parceira ou representante — CTAs distintos.

**Diferencial de tom vs. concorrentes:** o mercado de bijuteria/prata costuma se comunicar de forma barata e saturada (banners piscando, muitos preços, promoções). Nós fazemos o oposto: **quieto, caro, curado**. O luxo está no vazio e na luz.

---

## 2. Design System

### 2.1 Direção visual

- **Modo predominante: DARK.** Fundo quase-preto azulado, peças iluminadas como em joalheria. O claro aparece só em seções de conteúdo utilitário (formulário, rodapé secundário) para descanso.
- **Cinematográfico:** seções full-bleed (100vh) alternadas com blocos de conteúdo respirados. Cada seção é uma "cena".
- **Metal como material:** acabamentos que remetem a metal — bordas finas prateadas (1px), gradientes sutis champanhe→prata em textos de destaque, reflexos discretos. Nunca dourado saturado; sempre **champanhe/platina**.

### 2.2 Paleta

Ancorada no azul de marca já existente no sistema (`#0F2A43`), estendida para o registro "luxo escuro".

| Papel | Nome | Hex | Uso |
|---|---|---|---|
| Fundo base | Ônix azulado | `#0A1622` | Background principal (dark) |
| Fundo elevado | Marinho profundo | `#0F2A43` | Cards, seções elevadas (cor de marca) |
| Superfície escura | Azul fumê | `#152F49` | Hover, divisórias sutis |
| Texto primário | Branco gelo | `#F4F7FB` | Títulos e corpo sobre dark |
| Texto secundário | Prata fria | `#A9B7C6` | Subtítulos, legendas |
| **Acento prata** | Platina | `#C9D2DC` → gradiente `#E8EDF2` | Detalhes, linhas, ícones — "a prata" |
| **Acento quente** | Champanhe | `#C8A96A` → `#E7CE9B` | Folheado/ouro — CTA, números de destaque, filetes |
| Ação | Azul tech | `#1A73E8` | Botão primário quando em fundo claro; links no app |
| Fundo claro | Gelo | `#EEF3F8` | Seções utilitárias claras (formulário) |
| Sucesso / Alerta / Erro | — | `#1E8E3E` / `#F9AB00` / `#D93025` | Estados funcionais (herdados do app) |

**Regra de ouro dos acentos:** champanhe e prata **nunca competem**. Champanhe = ação/calor (CTA, número-herói). Prata = estrutura/frieza (linhas, molduras, ícones). Máximo ~5% da tela em champanhe.

Gradiente-assinatura para textos-herói:
```css
background: linear-gradient(120deg, #E8EDF2 0%, #C9D2DC 40%, #E7CE9B 100%);
-webkit-background-clip: text; color: transparent;
```

### 2.3 Tipografia

Dupla de fontes — **serifada display** (personalidade/luxo) + **sans neutra** (leitura/UI). Manter coerência com o app (Inter é a sans do sistema).

| Papel | Fonte | Peso | Notas |
|---|---|---|---|
| Display / Headlines | **"Playfair Display"** ou **"Cormorant Garamond"** (serifadas altas) | 500–600 | Títulos de seção, hero. Tracking levemente negativo. Alternativa mais moderna: **"Fraunces"**. |
| Corpo / UI | **Inter** (já usada no sistema) | 400–600 | Parágrafos, botões, labels |
| Sobretítulos / kicker | Inter | 500, **letter-spacing 0.2em, UPPERCASE, 12px** | Rótulos acima dos títulos ("NOSSAS INDÚSTRIAS") |

Escala (desktop): Hero 64–88px · H2 40–48px · H3 24–28px · corpo 16–18px · kicker 12px. Mobile: hero 36–44px, escala proporcional. Line-height generoso (títulos 1.05–1.15; corpo 1.6).

### 2.4 Espaçamento e grid

- Grid de 12 colunas, `max-width` de conteúdo **1200–1280px**, gutters largos.
- **Respiro é o luxo:** padding vertical de seção 120–160px no desktop (64–88px mobile). Não encha as telas.
- Escala de espaçamento base 8px (8/16/24/40/64/96/128).

### 2.5 Movimento e interação

- **Reveal on scroll:** elementos sobem 16–24px + fade, 400–600ms, `cubic-bezier(0.16,1,0.3,1)`, com leve stagger entre itens.
- **Parallax sutil** nas imagens full-bleed (fundo desloca ~10% mais devagar que o scroll). Discreto.
- **Hover em cards:** elevação + borda prateada acende (1px `#C9D2DC` a 40%), imagem dá zoom 1.03. 200–300ms.
- **Números que contam:** counters animados nas estatísticas ao entrar na viewport.
- Cursor/CTA com micro-brilho champanhe no hover.
- Respeitar `prefers-reduced-motion` (desliga parallax e counters).

### 2.6 Componentes de UI

- **Botões:** primário = preenchido champanhe com texto ônix, ou outline prateado sobre dark; secundário = texto com filete inferior animado. Cantos 8px (ou "pill" 999px para CTAs principais — escolher um e manter).
- **Cards de indústria/produto:** imagem 4:5 ou 1:1, borda 1px prateada sutil, título serifado, hover com zoom + brilho.
- **Filete divisor:** linha 1px com gradiente prata que "acende" da esquerda ao entrar na tela.
- **Badges/chips:** discretos, outline prateado, uppercase.
- **Header:** transparente sobre o hero, fica sólido (`#0A1622` com blur) ao rolar. Logo à esquerda, menu minimalista à direita, um CTA champanhe ("Fale conosco").
- **Footer:** escuro, generoso, com colunas (marca+tagline, indústrias, links, contato/redes) e barra legal.

### 2.7 Imagens e mídia

- **Macro de joias:** prata/folheado sobre fundo escuro, luz lateral, reflexos. Estilo editorial de joalheria.
- **Bastidores humanos:** representantes em atendimento, showroom, embalagem/romaneio — dá o lado "confiança/gente real".
- **Vídeo:** o hero pode ter loop de vídeo (peça girando, luz correndo no metal). **Não bloquear a entrega por falta de vídeo** — usar imagem estática de alta qualidade como fallback e trocar depois. Todo `<video>` com `poster` obrigatório.
- Tratamento: leve vinheta escura nas bordas para o texto respirar; overlay `rgba(10,22,34,0.45)` sobre fotos com texto por cima.
- **Placeholders:** onde faltar asset, usar bloco com gradiente ônix→marinho + filete prateado e rótulo `[imagem: descrição]`, para o cliente ver a intenção.

### 2.8 Acessibilidade

- Contraste AA garantido: branco gelo sobre ônix ✔; champanhe sobre ônix ✔ (checar tamanhos pequenos). Evitar prata clara como texto de corpo em fundo médio.
- Áreas de toque ≥ 44px, foco visível (anel champanhe), navegação por teclado, `alt` em todas as imagens, `prefers-reduced-motion` respeitado.

---

## 3. Roteiro da página (seção a seção)

Página única, longa, com scroll narrativo. Menu âncora leva às seções.

| # | Seção | Objetivo | Conteúdo-chave |
|---|---|---|---|
| 0 | **Header fixo** | Navegação | Logo · menu (A Empresa · Indústrias · Como Trabalhamos · Seja Representante · Contato) · CTA "Fale conosco" · seletor de acesso ao Sistema (login admin/vendedor) |
| 1 | **Hero (100vh)** | Impacto imediato | Vídeo/imagem full-bleed de peça em prata. Título serifado com gradiente-assinatura: *"Prata que representa você."* (headline a definir). Subtítulo curto. 1 CTA champanhe + 1 secundário. Indicador de scroll animado. |
| 2 | **Manifesto / A Empresa** | Posicionamento | Bloco de texto respirado (2–4 linhas de impacto) sobre quem somos: representação comercial de joias em prata e folheados, curadoria e confiança. Kicker + parágrafo grande. |
| 3 | **Números / Prova** | Confiança | 3–5 estatísticas com counter animado: nº de indústrias representadas, regiões atendidas, anos de mercado, itens em catálogo, pedidos/mês. *(Preencher com dados reais.)* |
| 4 | **Indústrias representadas** | Portfólio | Grid de cards/logos das marcas (Spart, Anéis Brasil, Inove, Tendenze, Zarrara, Brilhus, Camadi, Genuele…). Hover elegante. Cada card pode abrir breve descrição. |
| 5 | **Coleção em destaque / Vitrine** | Desejo | Galeria editorial de macro-fotos das peças (prata 925/950 e folheados). Carrossel ou mosaico. Foco em beleza, sem preço. |
| 6 | **Como trabalhamos** | Processo/clareza | Timeline ou 3–4 passos: curadoria → representante em campo → pedido pelo app → entrega/romaneio. Reforça a estrutura profissional (financeiro, comissões, rastreio). |
| 7 | **Para lojistas** | Conversão B2B | Benefícios de comprar com a representação (condições, mix de indústrias, atendimento dedicado). CTA "Quero comprar / Falar com um representante". |
| 8 | **Seja representante** | Recrutamento | Convite à equipe de vendas: autonomia, app mobile, comissões. CTA "Quero representar". |
| 9 | **Depoimentos** *(opcional)* | Prova social | 2–3 depoimentos de lojistas/indústrias em cards sóbrios. |
| 10 | **Cobertura / Regiões** *(opcional)* | Alcance | Mapa estilizado (Brasil) com regiões atendidas destacadas em prata/champanhe. |
| 11 | **CTA final + Contato** | Ação | Bloco forte: título convite + formulário (nome, empresa, telefone/WhatsApp, mensagem, "sou lojista / indústria / candidato") + WhatsApp direto. Fundo pode virar claro (gelo) para contraste e foco no form. |
| 12 | **Footer** | Fechamento | Marca + tagline · colunas de links · indústrias · contato/redes · endereço · barra legal (CNPJ, © ano). Link discreto para acessar o Sistema. |

**Elementos globais:** botão flutuante de **WhatsApp** (padrão da referência — mensagem pré-preenchida "Olá, gostaria de conhecer o portfólio de vocês"), voltar-ao-topo, e barra de progresso de scroll fina em champanhe (opcional).

---

## 4. Conteúdo / copy (pt-BR, a validar com o cliente)

Sugestões de tom — o cliente confirma os fatos:

- **Kicker hero:** REPRESENTAÇÃO EM JOIAS DE PRATA E FOLHEADOS
- **Headline (opções):** "Prata que representa você." · "A curadoria por trás do brilho." · "Do metal à vitrine, com quem entende do negócio."
- **Manifesto:** algo como *"Representamos as melhores indústrias de prata 925 e folheados do país, levando curadoria, condições e confiança até a sua loja — com uma equipe que conhece cada peça e cada região."*
- **CTAs:** "Fale conosco" · "Conheça o portfólio" · "Quero representar" · "Seja um parceiro"

> **Dados a coletar com o cliente antes de finalizar:** nome/logo oficial, tagline, anos de mercado, nº real de indústrias/itens/regiões, cidades atendidas, contatos (WhatsApp, e-mail, redes, endereço, CNPJ), fotos das peças e das indústrias, depoimentos.

---

## 5. Notas técnicas (integração ao monorepo)

- **Onde mora:** novo app no monorepo — sugestão `apps/site` (Next.js, para SEO e SSR das metatags/OpenGraph) ou uma landing estática. Alinhar com [docs/arquitetura.md](../arquitetura.md).
- **Stack coerente:** TypeScript strict, componentes próprios (a landing tem linguagem visual distinta do app operacional — **não** reusar o Material do admin; é um tema à parte, "luxo dark").
- **Fontes:** carregar Playfair/Cormorant/Fraunces + Inter via `next/font` (self-host, sem FOUT).
- **Performance:** imagens `next/image` com AVIF/WebP, lazy-load abaixo da dobra, vídeo do hero com `poster` e `preload="none"` no mobile. Meta Lighthouse ≥ 90.
- **SEO:** title/description, OpenGraph, favicon, `sitemap`, dados estruturados de organização (`Organization`/`LocalBusiness`).
- **Acesso ao Sistema:** link discreto no header/footer apontando para os apps existentes (admin/vendedor). A landing é a "porta da rua"; o sistema é a "área interna".
- **Formulário de contato:** enviar via Cloud Function (callable/HTTP) com validação zod + honeypot anti-spam; ou integração WhatsApp direta. Sem expor credenciais no cliente.
- **i18n:** por ora só pt-BR; estruturar para permitir EN futuramente (a referência é bilíngue).

---

## 6. Referências de moodboard

- **Arquétipo/estrutura:** [stoneinvestment.fr/en](https://www.stoneinvestment.fr/en) (dark, cinematográfico, WhatsApp CTA, narrativa por scroll).
- **Buscar também:** sites de joalherias de alto padrão e marcas de prata (dark editorial, macro de metal, serif display) para calibrar a fotografia e o ritmo.

---

## 7. Pendências / decisões a confirmar

1. Nome de marca, logo e tagline oficiais.
2. Fonte display definitiva (Playfair × Cormorant × Fraunces).
3. Um único CTA-herói ou dois (comprar × representar)?
4. Vídeo no hero já ou fallback estático primeiro? *(Recomendado: começar estático, trocar depois — como pediu o cliente, "vamos criando".)*
5. Dados reais para a seção de números e cobertura.
6. `apps/site` Next.js vs. landing estática separada.
