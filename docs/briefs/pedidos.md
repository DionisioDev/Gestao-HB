# Brief — Fase 2: Pedidos e Orçamentos

**Formato:** Anexo A da [especificação](../especificacao.md). **Referências:** especificação §2.3, [regras-negocio.md](../regras-negocio.md) §1–3, análise §4/§9, ADR-005/006.

## 1. Contexto

O pedido é o centro do sistema: congela preços na emissão (ADR-006), gera a previsão de comissão em dois níveis (escritório + vendedor) e alimenta o financeiro (parcelas) e os fechamentos. A Fase 2 entrega o ciclo no **web admin** primeiro (emissão, listagem, detalhe, status) e na sequência o **fluxo mobile do vendedor** no PWA. Diferente do legado, **abrir a tela de emissão não cria nada no banco** — o pedido só existe ao confirmar.

## 2. Escopo

### 2.1 Emissão (admin — este ciclo)
1. Cabeçalho: cliente (busca), comprador (contato, opcional), vendedor*, indústria*, tabela de preço* (filtrada pela matriz do vendedor), tipo (pedido | orçamento), datas, condição de pagamento, observações (pública/privada).
2. Itens: busca de produto por SKU/nome dentro da indústria; preço unitário automático — tabelado: preço da tabela; por grama: `peso × valor do grama vigente` (congelado no pedido com referência ao registro usado). Quantidade fracionada (3 casas) para indústrias por grama. Subtotais e total ao vivo (funções do `packages/core`, replicadas no servidor quando houver Functions).
3. Frete, acréscimo e desconto (R$; desconto respeita o limite da matriz do vendedor quando emissão for do vendedor).
4. Parcelas: divisão automática em N parcelas iguais (resto na última) com vencimentos por intervalo de dias, editáveis antes de salvar.
5. Confirmação em transação: numeração sequencial (`config/contadores`), pedido + parcelas + **comissão prevista** (regime A: `elegivel` com previsão dia 15 do mês seguinte; regime B: `aguardandoPagtoCliente`) + auditoria.

### 2.2 Gestão (admin — este ciclo)
- Listagem com busca (número/cliente) e filtros (status, indústria, vendedor, tipo), totais visíveis.
- Detalhe do pedido: cabeçalho, itens, totais, parcelas, comissão prevista; **mudança de status** (`emitido → enviadoIndustria → faturado → entregue → finalizado`), **cancelamento** com motivo (estorna comissão não fechada) e conversão orçamento→pedido (política de preço: manter × atualizar — ADR-006).

### 2.3 Próximo ciclo da fase (não neste PR)
- App do vendedor (PWA): fluxo mobile-first de emissão com rascunho offline, catálogo com fotos, resumo fixo do total.
- PDF do pedido/orçamento e romaneio no Drive (dependem de Functions/integrações), envio por WhatsApp.

## 3. Regras de negócio

- Todas de [regras-negocio.md](../regras-negocio.md) §1 (precificação/total), §2 (comissões na emissão) e §3 (parcelas/status).
- **Parcelas iguais:** `base = floor(total/N)`; as N−1 primeiras recebem `base`, a última recebe `total − base×(N−1)` (resto na última). Vencimentos: primeira data + intervalo em dias.
- Pedido guarda `valorGramaCongelado` (valor, id do registro e teor) por tabela usada; edições posteriores de itens usam o valor congelado, nunca o vigente.
- Sem linha na matriz do vendedor para (indústria, tabela) → emissão bloqueada para esse vendedor.
- Cancelamento: exige motivo; comissão `estornada` se ainda não fechada (se fechada, decisão 1b — pendente).

## 4. Segurança

- INTERINO (sem Functions): escrita de pedidos/parcelas/comissões e do contador permitida só a admin nas Rules; vendedor lê apenas os próprios pedidos (já nas Rules). Com Functions: emissão vira callable com revalidação de preços no servidor.
- Total e preços sempre recalculados a partir do catálogo/valores vigentes no momento da emissão — nunca aceitos do formulário às cegas.

## 5. UX/UI

- Skill de frontend; padrões já estabelecidos (cards M3, chips por status com cor única, snackbar, skeleton, modais explicativos).
- Emissão em página única com resumo de totais sempre visível; estados vazios orientando ("nenhum item ainda — busque pelo código").
- Status do pedido com as cores: emitido azul, enviado à indústria azul, faturado/entregue âmbar, finalizado verde, cancelado vermelho.

## 6. Critérios de aceite

- [ ] Emitir pedido INOVE com item de 3,5 g e grama vigente R$ 46,04 gera item de R$ 161,14 (P1) e congela o valor do grama usado.
- [ ] Registrar novo valor do grama depois da emissão **não** altera o pedido.
- [ ] Pedido de R$ 10.000 (sem frete) com escritório 10% e vendedor 40% cria comissão prevista de R$ 1.000/R$ 400 (C1); regime A nasce `elegivel` (previsão dia 15 do mês seguinte), regime B nasce `aguardandoPagtoCliente`.
- [ ] Divisão em 3 parcelas de R$ 100,00 → 33,33 + 33,33 + 33,34.
- [ ] Números sequenciais sem furo/duplicata em emissões concorrentes (transação).
- [ ] Cancelar pedido exige motivo, estorna a comissão prevista e aparece na auditoria com diff.
- [ ] Abrir e abandonar a tela de emissão não deixa rastro no banco.

## 7. Fora do escopo (agora)

- Baixa de pagamento das parcelas (Fase 3 — Financeiro).
- Fechamento de comissões (Fase 4).
- PDF, Drive, WhatsApp, fotos no catálogo do fluxo de emissão.
