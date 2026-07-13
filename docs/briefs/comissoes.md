# Brief — Fase 4: Fechamento de Comissões

**Formato:** Anexo A da [especificação](../especificacao.md). **Referências:** especificação §2.5, [regras-negocio.md](../regras-negocio.md) §2, ADR-001, análise §9 (relatórios 1038–1044 do legado).

## 1. Contexto

A comissão é a receita do negócio. O fechamento consolida, por vendedor e período, as comissões elegíveis (Regime A: pedidos emitidos no mês; Regime B: pagas pelo cliente — quitado ou por parcela) e marca o que foi pago ao vendedor. O vendedor acompanha a previsão do mês em duas faixas no app (confirmado × aguardando pagamento do cliente).

## 2. Escopo

1. **Tela de fechamento (admin):** seleção de período (mês/ano) e vendedor → o sistema lista as comissões candidatas com **pré-seleção automática por regime** (especificação §2.5): Regime A com `dataElegibilidade` no período; Regime B `elegivel` até o fim do período (no `porParcela`, o valor elegível acumulado). Ajuste manual (incluir/excluir), totais ao vivo (escritório × vendedor).
2. **Confirmação:** cria `fechamentosComissao/{id}` (vendedor, período, comissões, totais) e marca cada comissão como `fechada` com `fechamentoId` — em lote, com auditoria.
3. **Histórico:** lista de fechamentos com totais e status (`fechado` → `pago`); ação **"Marcar como pago"** (data do pagamento) muda as comissões para `paga`.
4. **Previsão do vendedor (PWA):** card na home com as duas faixas — **Confirmado** (elegíveis + fechadas não pagas) e **Aguardando pagamento do cliente** (Regime B em aberto) — valores da parte do vendedor.

## 3. Regras de negócio

- regras-negocio §2.3 (elegibilidade por regime/modalidade) e §2.4 (faixas da previsão).
- Comissão entra em no máximo um fechamento (`fechamentoId` único); `estornada` nunca entra.
- No `porParcela` fechado parcialmente: fecha-se o valor elegível acumulado; o restante volta a acumular para fechamentos futuros (v1: comissão fecha inteira quando selecionada — fração remanescente documentada como limitação até as Functions).
- Estorno pós-fechamento (cancelamento/devolução): decisão 1b pendente — bloquear cancelamento de pedido com comissão `paga` até decisão.

## 4. Segurança

- INTERINO: fechamento só admin (Rules); vendedor lê apenas os próprios fechamentos/comissões. Com Functions, confirmação vira callable.

## 5. UX/UI

- Padrões do admin; totais grandes e claros; checkboxes com área de toque ≥44px; confirmação em modal explicando a consequência (irreversível sem estorno).
- PWA: card no topo da home, verde (confirmado) × âmbar (aguardando), com valores formatados.

## 6. Critérios de aceite

- [ ] Pedido Regime A emitido no mês aparece pré-selecionado no fechamento do mês, com previsão dia 15 do mês seguinte.
- [ ] Pedido Regime B só aparece após a baixa (quitação ou fração por parcela).
- [ ] Confirmar fechamento marca as comissões `fechada` e elas somem de fechamentos futuros.
- [ ] Marcar como pago muda tudo para `paga` com data.
- [ ] Home do vendedor mostra as duas faixas corretas após emissão e após baixa.
- [ ] Tudo auditado (criação do fechamento, pagamento).

## 7. Fora do escopo

- Relatórios comparativo previsto × realizado (fase de relatórios).
- Estorno/abatimento pós-pagamento (decisão 1b).
- PDF/recibo de fechamento.
