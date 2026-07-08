# Regras de Negócio — fórmulas e exemplos

**Status:** v1 — precificação e comissões (Fase 1). Cada exemplo numérico daqui vira teste em `packages/core`.
Regra do projeto: **nenhuma regra entra no código sem constar aqui ou na [especificação](especificacao.md).**

Convenções de cálculo: dinheiro em **centavos** (inteiro), peso em **miligramas** (inteiro), percentuais em **pontos-base opcionais**? Não — percentuais como número decimal (ex.: `40` = 40%). Arredondamento monetário: **half-up para o centavo** ao final de cada item (nunca no meio da fórmula).

---

## 1. Precificação (ADR-005, ADR-006)

Cada indústria tem `modeloPreco`:

### 1.1 `tabelado` (todas exceto Inove/Tendenze)
```
precoItem(produto, tabela) = preco cadastrado em produtos/{id}/precos/{tabelaId}
```

### 1.2 `porGrama` (Inove e Tendenze)
```
precoItem = round( pesoMg × valorGramaVigente(industria, tabela, teor) / 1000 )
```
- `valorGramaVigente` = doc de `valoresGrama` com maior `vigenciaInicio` ≤ data de referência, para (indústria, tabela, teor).
- Ao **emitir o pedido**, o valor do grama vigente é **congelado** no pedido (`valorGramaCongelado`) — ADR-006. Recalculos posteriores do catálogo não afetam pedidos emitidos.
- Atualizar o valor do grama **cria novo registro** (histórico append-only) e dispara recálculo de `produtos/*/precos/*` das tabelas por grama.

**Exemplos (viram testes):**
| # | Peso | Valor do grama | Preço esperado |
|---|---|---|---|
| P1 | 3,500 g (3500 mg) | R$ 46,04 (4604 c) | 3500×4604/1000 = 16114 c = **R$ 161,14** |
| P2 | 2,335 g | R$ 38,04 (3804 c) | 2335×3804/1000 = 8882,34 → **8882 c = R$ 88,82** |
| P3 | 0,850 g | R$ 44,12 (4412 c) | 850×4412/1000 = 3750,2 → **3750 c = R$ 37,50** |
| P4 | 10 g | R$ 46,04 | **46040 c = R$ 460,40** |

### 1.3 Total do item e do pedido
```
subtotalItem = round(precoUnit × qtde)            # qtde inteira (unidades)
totalPedido  = Σ subtotalItens + freteCentavos + acrescimoCentavos − descontoCentavos
```
Acréscimo/desconto percentuais são convertidos a centavos sobre Σ subtotalItens antes da soma (round half-up).

> **Confirmado (07/07/2026):** itens por grama têm quantidade **em gramas, fracionada** (até 3 casas decimais); `subtotalItem = round(precoUnit × qtde)`. Itens tabelados usam quantidade inteira (unidades).

## 2. Comissões (ADR-001, análise §9)

Dois níveis, calculados por pedido no momento da emissão e ajustados nos eventos financeiros:

### 2.1 Comissão do escritório (receita da representação)
```
baseComissao = totalPedido − freteCentavos            # base "1 - Valor dos Produtos + Acréscimo - Desconto" (legado)
comissaoEscritorio = round(baseComissao × pctEscritorio / 100)
```
- `pctEscritorio` vem da indústria (padrão) e pode ser sobrescrito no pedido (campo Comissão % do legado).

### 2.2 Comissão do vendedor (proporcional)
```
comissaoVendedor = round(comissaoEscritorio × pctProporcional / 100)
```
- `pctProporcional` vem da **matriz do vendedor** (indústria × tabela; linha específica da tabela vence a linha "Todas" (`'*'`)).
- Sem linha na matriz para (indústria, tabela) → vendedor **não pode emitir** pedido nessa combinação (é também a permissão).

**Exemplos (viram testes):**
| # | Total pedido | Frete | % escritório | % proporcional | Escritório | Vendedor |
|---|---|---|---|---|---|---|
| C1 | R$ 10.000,00 | R$ 0 | 10% | 40% | R$ 1.000,00 | R$ 400,00 |
| C2 | R$ 5.016,94 | R$ 16,94 | 12% | 40% | round(500000×0,12)=R$ 600,00 | R$ 240,00 |
| C3 | R$ 337,15 | R$ 0 | 10,5% | 35% | 33715×0,105=3540,07→**3540 c** | 3540×0,35=1239 c |

### 2.3 Elegibilidade por regime (ADR-001)
- **Regime A (mensalFixo — Spart, Anéis Brasil):** comissão de pedido **emitido no mês M** fica `elegivel` no fechamento de M, com `previsaoRecebimento` = dia `diaPagtoComissao` (15) de M+1. Independe do pagamento do cliente.
- **Regime B (posRecebimento — Inove, Tendenze, Zarrara, demais):** comissão nasce `aguardandoPagtoCliente`. **Confirmado (07/07/2026): as duas modalidades existem e são configuráveis por indústria** (`elegibilidadeComissao`):
  - **`pedidoQuitado`:** elegível quando a **última parcela** é baixada (pedido quitado); `dataElegibilidade` = data da baixa; entra no fechamento subsequente.
  - **`porParcela`:** a cada parcela baixada, torna-se elegível a **fração proporcional** da comissão:
    ```
    comissaoElegivel = round( comissaoTotal × valorParcelasPagasNoPeriodo / totalPedido )
    ```
    O fechamento consome as frações elegíveis ainda não fechadas (controle por parcela: `fechamentoId` na fração).
- Pedido **cancelado** antes do fechamento → comissão `estornada`, fora de qualquer fechamento.
- Pedido cancelado/devolvido **após** comissão paga (Regime A): gera lançamento negativo no fechamento seguinte — decisão 1b ainda aberta; implementação só após fechada.

**Exemplos (viram testes):**
| # | Regime | Emissão | Pagamentos | Fechamento de julho/26 inclui? |
|---|---|---|---|---|
| E1 | A | 10/07/26 | nenhum | **Sim** (elegível; previsão 15/08/26) |
| E2 | B | 10/07/26 | quitado 20/07/26 | **Sim** (elegível em 20/07) |
| E3 | B | 10/07/26 | parcial (1 de 3) | **Não** (aguardandoPagtoCliente) |
| E4 | A | 28/06/26 | — | Não (pertence ao fechamento de junho) |
| E5 | B | 05/06/26 | quitado 02/07/26 | **Sim** (elegível só em julho) |
| E6 | B `porParcela` | 10/07/26 | 1 de 3 parcelas iguais paga em 15/07/26 (pedido R$ 3.000,00; comissão total R$ 300,00) | **Sim, parcialmente:** elegível round(30000 × 100000/300000) = 10000 c = **R$ 100,00**; vendedor 40% → R$ 40,00 |
| E7 | B `porParcela` | 10/07/26 | 2 parcelas pagas (R$ 1.000,00 + R$ 500,00 de um pedido de R$ 3.000,00; comissão R$ 300,00) | Elegível round(30000 × 150000/300000) = **R$ 150,00** |

### 2.4 Previsão do vendedor (dashboard)
- **Confirmado:** Σ comissões `elegivel`/`fechada` do próximo fechamento (Regime A do mês anterior + Regime B já elegíveis).
- **Aguardando pagamento do cliente:** Σ comissões `aguardandoPagtoCliente` (estimativa).

## 3. Pagamentos e status do pedido

- Parcela: `aberto → parcial → pago` (`valorRecebido` acumulado; baixa parcial mantém `parcial`).
- Pedido quitado = todas as parcelas `pago`.
- Status do pedido no novo sistema: `rascunho → emitido → enviadoIndustria → faturado → entregue → finalizado` + `cancelado` (mapeamento do legado DIGITANDO→rascunho/emitido, EM PRODUÇÃO→enviadoIndustria, ENTREGUE→entregue, PAGO→(derivado das parcelas), FINALIZADO→finalizado).
- Cancelamento exige motivo; libera estorno de comissão conforme §2.3.
