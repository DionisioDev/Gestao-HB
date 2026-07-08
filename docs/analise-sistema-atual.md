# Análise do Sistema Atual — SuasVendas (conta HB Joias)

**Data do levantamento:** 07/07/2026
**Método:** navegação autenticada via Playwright (somente leitura — nenhum dado criado/alterado), captura de screenshot full-page + extração estrutural (campos, dropdowns, colunas, botões) de cada tela do menu. Prints em [prints-sistema-atual/](prints-sistema-atual/).
**Sistema:** SuasVendas (app3.suasvendas.com), plano "Representante Comercial - Plano Ouro", stack legado ASP.NET WebForms.
**Status:** 1ª rodada (todas as telas de menu). Pendências para 2ª rodada na [seção 9](#9-pendências--2ª-rodada-de-captura).

---

## 1. Inventário de telas (menu principal)

| Menu | URL | Uso real | Print |
|---|---|---|---|
| Início (Indicadores) | `/indicadores` | ✅ Dashboard com widgets | [inicio.png](prints-sistema-atual/inicio.png) |
| Emitir Pedido | `/fornecedores?GC=...#step-1` | ✅ Wizard de pedido (passo 1 = escolher indústria) | [emitir-pedido.png](prints-sistema-atual/emitir-pedido.png) |
| Clientes | `/clientes` | ✅ 156 clientes | [clientes.png](prints-sistema-atual/clientes.png) |
| Contatos | `/contatos` | ✅ 74 contatos (compradores) | [contatos.png](prints-sistema-atual/contatos.png) |
| Orçamentos | `/orcamentos` | ⚪ Vazio — não usado | [orcamentos.png](prints-sistema-atual/orcamentos.png) |
| Pedidos | `/pedidos` | ✅ 188 pedidos | [pedidos.png](prints-sistema-atual/pedidos.png) |
| Produtos | `/produtos` | ✅ 108.134 registros (produto × tabela) | [produtos.png](prints-sistema-atual/produtos.png) |
| Agenda | `/agenda` | Calendário + checklist por curva ABC | [agenda.png](prints-sistema-atual/agenda.png) |
| Financeiro | `/financeiro/financeiro` | ✅ Painel de bordo + contas a pagar/receber | [financeiro.png](prints-sistema-atual/financeiro.png) |
| Relatórios | `/relatorios` | ✅ 8 categorias, códigos numéricos | [relatorios.png](prints-sistema-atual/relatorios.png) |
| CRM | `/crm/interacao` | ⚪ Vazio | [crm.png](prints-sistema-atual/crm.png) |
| Funil | — | 🔒 Bloqueado (add-on pago não contratado) | [funil.png](prints-sistema-atual/funil.png) |
| Mais → Indústrias | `/fornecedores` | ✅ 12 indústrias | [industrias.png](prints-sistema-atual/industrias.png) |
| Mais → Equipe de Vendas | `/equipes-venda` | 🔒 Serviço não ativo na conta | [equipe-de-vendas.png](prints-sistema-atual/equipe-de-vendas.png) |
| Mais → E-commerce B2B | `/Modulo/YourSales/CatalogoV2.aspx` | ⚪ Vazio | [e-commerce-b2b.png](prints-sistema-atual/e-commerce-b2b.png) |
| Mais → SV.Drive | `/svdrive` | ✅ 1.008 arquivos (romaneios/planilhas de pedido!) | [sv-drive.png](prints-sistema-atual/sv-drive.png) |
| Mais → E-mails | `/emails-enviados` | ⚪ Só notificações internas | [e-mails.png](prints-sistema-atual/e-mails.png) |
| Mais → Metas | `/Modulo/YourSales/Meta/Form.aspx` | ✅ Metas anuais por vendedor/indústria | [metas.png](prints-sistema-atual/metas.png) |
| Mais → Usuários | `/usuarios` | ✅ 4 usuários admin | [usuarios.png](prints-sistema-atual/usuarios.png) |
| Mais → Vendedores | `/prepostos` | ✅ 2 vendedores | [vendedores.png](prints-sistema-atual/vendedores.png) |
| Mais → Configurações | `/configuracoes` | ✅ Importações, modelos, financeiro | [configuracoes.png](prints-sistema-atual/configuracoes.png) |
| Mais → Status do Pedido | `/pedidos-status` | ✅ 6 status configurados | [status-do-pedido.png](prints-sistema-atual/status-do-pedido.png) |
| Mais → Regiões | `/regioes` | ⚪ Vazio | [regioes.png](prints-sistema-atual/regioes.png) |
| Mais → Transportadoras | `/transportadoras` | ⚪ Vazio | [transportadoras.png](prints-sistema-atual/transportadoras.png) |
| Mais → Departamentos | `/departamentos` | 4 registros (Comercial, Diretoria, Financeiro, Logística) | [departamentos.png](prints-sistema-atual/departamentos.png) |
| Mais → Auditoria de Acesso | `/Modulo/Grid.aspx?gid=...` | ✅ Log de logins (retém 2.000 registros) | [auditoria-de-acesso.png](prints-sistema-atual/auditoria-de-acesso.png) |
| Mais → Categorias do Cliente | `/clientes/categoria` | 2 registros ("Heri", "Vendas - P") | [categorias-do-cliente.png](prints-sistema-atual/categorias-do-cliente.png) |
| Mais → E-commerce Antigo | — | Legado | [e-commerce-antigo.png](prints-sistema-atual/e-commerce-antigo.png) |

Legenda: ✅ usado ativamente · ⚪ existe mas vazio/não usado · 🔒 bloqueado no plano

---

## 2. Achados centrais (o que muda na especificação)

1. **São 12 indústrias, não 5:** ANEIS BRASIL, BRILHUS, CAMADI, GENUELE, Hb Joias, IMPORTADOS, INOVE, PRONTA ENTREGA, SPART, TENDENZE, ZARRARA, ZARRARA LUXO. Algumas são "reais" (CNPJ/endereço: GENUELE, SPART, INOVE, ANEIS BRASIL, IMPORTADOS) e outras são **indústrias "lógicas"** — agrupadores de catálogo/preço sem dados fiscais (BRILHUS, CAMADI, TENDENZE, ZARRARA, ZARRARA LUXO, PRONTA ENTREGA, Hb Joias). O novo sistema precisa suportar indústria como "catálogo/segmento".
2. **O produto é duplicado por tabela de preço** (108 mil registros ≈ mesmo catálogo × N tabelas). Ex.: SKU `PAN1056` (INOVE) existe em "VENDAS - 900" R$ 46,04, "HERI - 900" R$ 44,12, "HERI - 700" R$ 38,04, "FOLHEADO 40MM" R$ 15,58, "VENDAS - 700" R$ 39,62. No novo sistema: produto único + matriz produto × tabela.
3. **Os nomes das tabelas codificam teor + canal + base de cálculo:** teor de prata (700/900/925), canal/cliente (VENDAS, HERI, ESPECIAL) e tabelas "**- BRUTO**" com valores muito menores (AB 29881: HERI R$ 22,75 vs HERI-BRUTO R$ 4,88) — forte indício de **preço por grama** (bruto ≈ R$/g). Há também variações com desconto embutido ("Prata 700 - 10% off").
4. **⚠️ O campo Peso(Kg) está zerado na grade de produtos.** A precificação por grama do novo sistema depende de peso confiável por item — é preciso descobrir onde o peso real vive (2ª rodada / exportação) ou se será recadastrado.
5. **Fluxo de status real:** `DIGITANDO → EM PRODUÇÃO → ENTREGUE → PAGO → FINALIZADO` + `CANCELADO` (status configurável com nome/cor/sequência/tipo). Note: **ENTREGUE vem antes de PAGO** — entrega-se e depois recebe (venda a prazo).
6. **Pedido tem duas numerações:** interna sequencial (1555–1605...) e "Nº na Representada"/Número ERP (ex.: "OP 9810", "OP 9605-1 saldo") — inclusive pedidos de saldo/parciais.
7. **Faturamento é separado do pedido** (Dt. Fatura, Valor Faturado, Itens Faturados, Total Recebido) com **faturamento parcial** e comissão calculada sobre faturamento (colunas "Comissão Vendedor (Faturamento)", "Com. Recebida", "Com. Não Recebida").
8. **Financeiro:** status binário de título (Pago/Recebido vs Não Pago/Não Recebido) + **liquidação parcial** (baixa parcial gera saldo com nova data prevista) + desconto na baixa (valor e %). Formas de pagamento (19): Boleto, Carnê, Cartão Crédito/Débito, Crédito Devolução, Cheque, DAM, DARF, DARE, DAS, Depósito, Dinheiro, Duplicata, Débito em conta, Fatura, Nota Promissória, Transferência, PIX, Outros. Existe configuração para **gerar lançamento automático de comissão e de recebimento a partir do pedido**.
9. **Romaneios de hoje = SV.Drive:** 1.008 arquivos, majoritariamente planilhas geradas por pedido (`P0176xx-<Cliente>.xlsx`, variantes `-PL`, `-Laser`, `-3D`) e PDFs de OP/orçamento vinculados ao pedido — confirma o requisito de arquivar romaneio por pedido (no novo sistema: Google Drive).
10. **Fotos dos itens:** importadas por **upload de ZIP** por indústria, vinculando por código do produto / EAN / código original / referência / referência de agrupamento — não há integração automática com as indústrias. Isso define a estratégia da seção 2.7 da especificação: importação em lote, não API.
11. **Vendedores × Usuários são cadastros distintos** (2 vendedores: Fabio Fadu, Thiago Ayres; 4 usuários: Hb Joias, Junior, Pedro + Modo Suporte SV). Vendedor tem: 2FA, metas, link de recuperação de senha gerado pelo admin e **clonagem de permissões** entre vendedores. Usuários também emitem pedidos (aparecem como "Vendedor" nos clientes).
12. **Clientes:** 156 PJ/PF com status ricos (`Ativo, Inativo, Jurídico, Potencial, Prospectado, Sem Crédito, Fechou, Lead`), curva ABC calculada, dias sem comprar, limite de crédito, previsão de próxima compra, 3 e-mails (geral/financeiro/NFe), endereços de cobrança e entrega, matriz/filial, rede de cliente, vendedor atribuído.
13. **Orçamentos não são usados hoje** (0 registros) — mas a estrutura é a mesma do pedido (entidade única com tipo), e a conversão pede política de preço ("manter preços" vs "atualizar com preço atual") — exatamente a decisão nº 2 da especificação.
14. **Auditoria atual é só de login** (data/hora, nome, e-mail, IP, tipo Usuário/Vendedor, retém 2.000 registros) — muito aquém da auditoria append-only da seção 2.8 da especificação. Impersonação do suporte ("Modo Suporte SV") aparece logada.
15. **Motor de precificação em massa por indústria** ("Gerar Preços"): despesas em % (custo fixo/variável, comissão, frete, impostos...), margens (lucro, segurança, mínima), markup, custo médio configurável (última compra / 3 últimas / 10 últimas / todas / preço atual) → gera preços de uma tabela inteira.

---

## 3. Cadastros

### Indústrias (`/fornecedores`)
- **Propósito:** cadastro dos fornecedores/indústrias representadas — pivô de todo o sistema (produto, tabela, estoque, pedido e importação são sempre por indústria).
- **Listagem (12 registros):** Nome Fantasia, Razão Social, Cidade, Estado, Telefone, Fax, E-mail, Status, Endereço, Bairro, CEP, **PIX**, CNPJ, Inscr. Estadual, Dt. Cadastro. Coluna extra: "Ver Clientes".
- **Ações:** Nova Indústria, Ver Pedidos, Importar Produtos, Editar, Excluir, Ver Estoque, Ver Ficha, Mais Ações (inclui "Gerar Preços").
- **Modal "Gerar Preço de Venda"** (precificação em massa): opção "calcular com base nas despesas dos produtos" ou "informar agora"; despesas em % (Custo Fixo, Custo Variável, Comissão, Frete, Despesa Comercial, Seguro, Despesas Admin, Desconto de Título, Taxa de Cartão, Custo Indireto, Simples, IR, ICMS, ISS, PIS, COFINS, Marketplace, Chargeback, Devolução, Marketing, Embalagem); Margem de Lucro / Segurança / Mínima; Markup; cálculo do custo médio (Último preço de compra | Últimas 3 | Últimas 10 | Todas | Usar Preço Atual); tabela de preço destino.

### Vendedores (`/prepostos`)
- **Listagem (2):** Nome, E-mail, Telefone, Status, Dt. Cadastro, Código, Gênero. Fabio Fadu e Thiago Ayres, ativos.
- **Ações:** Novo Vendedor, Editar, Excluir, **Desativar 2FA**, **Definir Metas**, **Clonar Permissões** (origem: outro vendedor), URL Recuperar Senha.
- Formulário de edição (com percentuais de comissão e permissões de tabela) fica em página própria — **pendência da 2ª rodada**.

### Usuários (`/usuarios`)
- **Listagem (4):** mesmas colunas de Vendedores. Hb Joias (conta principal, desde 2012), Junior, Pedro, Modo Suporte SV (usuário de impersonação do fornecedor).
- **Ações:** Novo Usuário, Editar, Excluir, Desativar 2FA, Definir Metas, Ativar IA, URL Recuperar Senha.

### Clientes (`/clientes`)
- **Listagem (156):** UF, Nome Fantasia, Cidade, Razão Social, CNPJ, Dt. Cadastro, Última compra, Vendedor, Tipo Pessoa, Status, Dias sem Comprar, Latitude. Colunas extras: Bairro, Cadastrado por, Categoria do Cliente, CEP, Classificação, Código, **Curva ABC (Vendas)**, Dt. Abertura, E-mail, **E-mail Financeiro**, **E-mail NFe**, End. Cobrança, End. Entrega, Inscrições, **Limite crédito**, Matriz, Observações, PIX, Plataforma, **Ranking**, **Rede de Cliente**.
- **Filtros rápidos:** Data, Status, Rede, Segmento, UF, Cidade, TRC, TRV, TRI, Curva ABC.
- **Status possíveis:** Ativo | Inativo | Jurídico | Potencial | Prospectado | Sem Crédito | Fechou | Lead.
- **Ações:** **Novo PJ** e **Novo PF** (fluxos separados), CRM, Adicionar no Funil, VISION (360°), Novo Pedido, Ver Pedidos, Editar.
- Sistema calcula: curva ABC, dias sem comprar, ranking, **data de próxima compra estimada** (widget "SV.Ciclo").
- Perfil real: joalherias/óticas de SP, RJ e MG, quase todas PJ.

### Contatos (`/contatos`)
- **Listagem (74):** Nome, Comprador, **Vínculo com** (cliente pai), Tipo (todos "CLIENTE"), E-mail, Celular, WhatsApp + dados herdados do cliente. Campos legados: Skype, Nextel, Twitter (descartar).
- **Papel-chave:** o contato é a credencial de acesso do cliente ao e-commerce B2B/portal — ações "Liberar acesso ao E-commerce e Portal do Cliente" e "**Link de Acesso à Loja**" (link mágico com opção de uso único + URL de recuperação de senha).

### Auxiliares
- **Categorias do Cliente** (2: "Heri", "Vendas - P" — note: mesmos nomes das tabelas de preço HERI/VENDAS, sugerindo vínculo categoria do cliente ↔ tabela aplicável).
- **Departamentos** (4: Comercial, Diretoria, Financeiro, Logística).
- **Regiões, Transportadoras, Equipes de Venda:** vazios/não ativos — baixa prioridade na reescrita.

---

## 4. Fluxo de pedidos

### Emitir Pedido (wizard)
- **Passo 1:** banner "Dê um clique na indústria abaixo que deseja emitir o pedido" — 1 pedido = 1 indústria = 1 catálogo.
- **Passos seguintes** (inferidos; capturar na 2ª rodada): cliente → tabela de preço → itens do catálogo da indústria → condição de pagamento → totais.

### Pedidos (`/pedidos`)
- **Listagem (188, abas):** Todos | Últ. 12 meses | **Faturamento & Comissão** | Lucratividade.
- **Colunas:** Razão Social, Comprador, Valor, **Número ERP**, Número, Cliente, Indústria, Dt. Venda, Dt. Envio, **Dt. Fatura**, **Valor Faturado**, Status Cor, Cidade, CNPJ/CPF, Vendedor, Bloqueado, Cancelado, Orçamento, **Total Recebido**, Qtde Itens, Casas decimais. Extras: **Comissão**, **Comissão Vendedor (Faturamento)**, **Com. Recebida**, **Com. Não Recebida**, **Condição de Pagamento**, **Desconto Encadeado Global**, Digitador, Dt. Entrega, Dt. Início/Fim de Produção, Frete, Itens Faturados, NF-e Gerada?, **Nº na Representada**, Nº no Talão, Nº Ordem de Compra, Código de Rastreio...
- **Filtros:** SV.FastBI (Data, Indústria, Cliente, Status, Vendedor, UF, Cidade, Região, Rede, Tipo, Plataforma, Matriz) + faixas de data (venda, fatura, entrega, envio, digitação...) e de valor (total, comissão, saldo, impostos).
- **Ações:** Novo Pedido, Pedido Rápido, Gerar NF-e, Visualizar, Enviar (e-mail/WhatsApp/SV.ZAP com PDF A3/A4/Ofício/Carta), **Pedido com IA** (texto/arquivo → pedido), Duplicar (política: manter preços | atualizar com preço atual), Baixar/Faturar (com status pós-baixa), Alterar Status, Importar XML de NF-e (inclusive "XML da fábrica"), link público de acompanhamento.

### Status do Pedido (`/pedidos-status`)
| Seq. | Nome | Cor | Tipo |
|---|---|---|---|
| 1 | DIGITANDO | Roxo | Pedido |
| 2 | EM PRODUÇÃO | Ciano | Pedido |
| 3 | ENTREGUE | Laranja | Pedido |
| 4 | PAGO | Verde-água | Pedido |
| 5 | FINALIZADO | Verde | Pedido |
| 10 | CANCELADO | Cinza | Pedido |

Status é dado mestre configurável (nome + cor + sequência + tipo), não enum fixo.

### Orçamentos (`/orcamentos`)
- Vazio (não usado). Mesma estrutura do pedido (prefixos `pedi_`), com **validade** própria. Conversão para pedido exige política de preço: "Manter preços do orçamento" | "Atualizar com preço atual".

### Produtos (`/produtos`)
- **108.134 registros** = produto duplicado por tabela de preço (ver achado nº 2).
- **Colunas:** Código (SKU), Nome, Indústria, **Preço**, **Tabela de Preço**, **Peso(Kg)** (zerado!), Casas Decimais, ICMS, IPI (%), Promoção, Embalagem/Unid, Cód. de Barras (externo + interno), Foto, Status, dimensões da unidade e caixa master, volume m³, Categoria. Extras: **Preço de Compra**, Certificado de Aprovação, Identificador.
- **Tabelas de preço observadas:** INOVE: VENDAS-900, HERI-900, HERI-700, VENDAS-700, FOLHEADO 40MM · GENUELE: "Prata 700 - 10% off", "Prata 925" · ANEIS BRASIL: HERI, HERI-BRUTO, ESPECIAL, ESPECIAL-BRUTO · IMPORTADOS: VENDAS, HERI.
- **Ações:** Novo Produto, Importar, Editar, Excluir, Categorias, Pronta Entrega/compra (registro de compras → custo médio), integração com lojas/marketplaces (markup preço/estoque, sincronização), SmartView.

---

## 5. Financeiro

### Painel de Bordo (`/financeiro/financeiro`)
- **Abas:** Painel de Bordo | Contas a Pagar | Contas a Receber | Fluxo de Caixa | DRE | Central de Recursos.
- **Dashboard:** gráfico Recebimentos × Pagamentos por dia; cards À Receber Hoje / Recebido Hoje / Recebido no Mês / À Pagar Hoje / Pago Hoje / Pago no Mês; Saldo Atual por conta bancária (com ocultar valor).
- **Status de título:** binário — "Pago/Recebido" | "Não Pago/Não Recebido" + data de efetivação.
- **Lançamento Rápido:** valor, grupo de conta, data, detalhes, centro de custo (opcional), conta bancária (opcional); tipos Recebimento/Pagamento.
- **Liquidar Rápido (baixa):** valor original, desconto (R$ e %), valor efetivado, data, **tipo de documento** (19 formas — ver achado nº 8), conta bancária, grupo de conta, nº documento, observação, "Gerar Lançamento", **Valor Restante + Data Prevista do saldo (liquidação parcial)**.
- **Grupos de conta** separados Receita (Comissão de Pedido, Venda no Caixa, Venda Vitrine, NF-e, Outras Receitas...) / Despesa (26 grupos, inclui "Comissão do Preposto") — customizáveis.
- **Configuração relevante** (em Configurações → Configurar Financeiro): gerar lançamento automático de **comissão** e de **recebimento** a partir do pedido, com grupo de conta padrão.

---

## 6. Relatórios (`/relatorios`)

Categorias: **Indústrias, Produtos, Clientes, Pedidos, Regiões, Vendedores, Comissão, Financeiro** (só "Indústrias" capturada — demais na 2ª rodada, em especial **Comissão**).

Categoria Indústrias: 1000 Relação de Clientes por Indústria · 1001 Gráfico de Vendas por Indústria · 1002/1003 Vendas Agrupado por Indústria (Sintético/Analítico) · 1004 Ranking de Indústrias · 1005 Planilha de Vendas por Indústria · 1069 Clientes sem compra na Indústria · 2010 Planilha de Vendas **Faturadas** por Indústria (por data da venda / da fatura / da fatura da **parcela**) · 2016 Ranking de Metas por Indústria.

Padrão recorrente: distinção **data da venda × data da fatura × data da fatura (parcela)**; filtros por Indústria, Vendedor, Tipo, Status, Cliente, UF/Cidade, Segmento.

---

## 7. Demais módulos

- **Metas:** por ano (2013–2027) + indústria (opcional), referência por **Data da Venda ou Data da Fatura**; grade global e por vendedor com Prevista/Realizada/Resultado% mês a mês; gauges de atingimento.
- **SV.Drive:** 1.008 arquivos (214 MB / 1 GB), vinculados a pedidos; taxonomia de tipos (XML/PDF NFe, Boleto, Pedido, Orçamento, Comprovante, Recibo, fotos, contratos...); flag "Arquivo Privado"; copiar link. **É o "romaneio" atual.**
- **Agenda:** calendário multi-responsável; geração de checklist em massa por **curva ABC do cliente** × ação (Ligação, Visita, WhatsApp, E-mail) × período; integração por link (Google Calendar).
- **Auditoria de Acesso:** só logins (data/hora, nome, e-mail, IP, tipo), retenção de 2.000 registros.
- **E-mails enviados:** log com rastreio de leitura; não usado pelo cliente para pedidos.
- **CRM / Funil / E-commerce B2B / Equipes:** vazios ou bloqueados — não fazem parte da operação atual.
- **Configurações:** importações em massa (clientes, contatos, indústrias, produtos, faturamento, formas de pagamento, transportadoras, pedidos, grupos de conta, **fotos por ZIP**); logomarcas (software e pedidos); SMTP próprio; 16 modelos de PDF de pedido + 6 em grade; personalizar campos; backup.

---

## 8. Padrões transversais de UI (legado)

Grades com: contador "(N de M)", busca global, filtro por coluna, faixas de data, **Personalizar Colunas**, **SmartView** (visões salvas com agrupamento e indicadores), Relatório Rápido, paginação 30/página, ações contextuais por seleção de checkbox, FAB "+". Stack ASP.NET WebForms (postbacks, formulário único gigante por página) — origem de várias dores de UX (lentidão, sem mobile).

---

## 9. Pendências — 2ª rodada de captura

1. **Wizard Emitir Pedido passos 2+** (clicar numa indústria e seguir): tela de itens, tabela de preço aplicada, condição de pagamento, cálculo do total. *(Somente navegação — sem salvar.)*
2. **Formulário de edição de Vendedor:** percentuais de comissão (por indústria? por tabela?) e permissões de tabela — hoje só vimos "Clonar Permissões".
3. **Formulário de edição de Produto:** onde vive o peso em gramas e como o preço por grama é configurado (tabelas "-BRUTO").
4. **Detalhe de um Pedido** (visualizar): campos completos, itens, parcelas/faturas.
5. **Abas Contas a Receber e Contas a Pagar** do financeiro: colunas, parcelas, vínculo com pedido.
6. **Relatórios das categorias Comissão, Financeiro, Pedidos, Vendedores** (nomes e filtros).
7. **Exportações CSV/Excel** de clientes, produtos, pedidos e tabelas de preço para migração (item 9 do roteiro da seção 4 da especificação).
8. **Login com perfil de vendedor** para mapear diferenças de acesso (item 8 do roteiro).
9. Confirmar com o gestor: quais das 12 indústrias entram no novo sistema e o que são as "lógicas" (BRILHUS, CAMADI, ZARRARA LUXO, PRONTA ENTREGA, Hb Joias, IMPORTADOS) — a especificação cita só 5.
