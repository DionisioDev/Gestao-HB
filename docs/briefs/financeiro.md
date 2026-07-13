# Brief — Fase 3: Financeiro (Contas a Receber)

**Formato:** Anexo A da [especificação](../especificacao.md). **Referências:** especificação §2.4, [regras-negocio.md](../regras-negocio.md) §2.3/§3, análise §5, ADR-001/005.

## 1. Contexto

O contas a receber é o gatilho do Regime B: a **baixa de pagamento** das parcelas é o evento que torna a comissão elegível (pedido quitado ou proporcional por parcela, conforme a indústria). A Fase 3 entrega a visão de parcelas e a baixa no web admin; o dashboard financeiro completo (fluxo de caixa, DRE) fica fora do escopo — o negócio é representação, o foco é receber e comissionar.

## 2. Escopo

1. **Contas a Receber (admin):** lista de todas as parcelas (collection group), com filtros por status (aberto/parcial/pago), vencimento (vencidas/próximas), indústria e busca por cliente/nº do pedido. Totais do filtro (a receber × recebido).
2. **Baixa de pagamento:** modal por parcela — valor recebido (pré-preenchido com o restante), forma de pagamento (PIX, boleto, transferência, dinheiro, cartão, cheque, outros), data. Baixa parcial mantém a parcela `parcial` com saldo visível.
3. **Efeito na comissão (transação):** ao quitar a última parcela de um pedido Regime B `pedidoQuitado` → comissão `elegivel` (dataElegibilidade = data da baixa). Regime B `porParcela` → recalcula `valorElegivelCentavos` proporcional (regras-negocio §2.3) a cada baixa.
4. **Estorno de baixa:** reverte a última baixa da parcela (com motivo), refaz o status e a elegibilidade. Auditoria em tudo.
5. Denormalização: parcelas passam a carregar `pedidoId`, `pedidoNumero`, `clienteNome`, `industriaId`, `vendedorId` (para lista e Rules de collection group).

## 3. Regras de negócio

- regras-negocio §3 (parcela `aberto → parcial → pago`; pedido quitado = todas pagas) e §2.3 (elegibilidade A/B).
- Valor da baixa não pode exceder o saldo da parcela; data da baixa não pode ser futura.
- Comissão já `fechada/paga` nunca é alterada por baixa/estorno (estorno pós-fechamento = decisão 1b, pendente).

## 4. Segurança

- INTERINO: baixa/estorno só admin (Rules: update de parcelas e comissões restrito a admin). Vendedor lê as próprias parcelas (collection group filtrado por `vendedorId`).
- Com Functions: baixa vira callable com validação no servidor.

## 5. UX/UI

- Padrões do admin (chips por status, modal explicativo, snackbar). Parcelas vencidas destacadas (chip vermelho "vencida").
- Modal de baixa mostra o pedido/cliente e o saldo antes de confirmar.

## 6. Critérios de aceite

- [ ] Baixar a última parcela de um pedido INOVE (Regime B, pedidoQuitado) muda a comissão para `elegivel` na hora, com a data da baixa.
- [ ] Em indústria `porParcela`, baixar 1 de 3 parcelas iguais torna elegível 1/3 da comissão (E6).
- [ ] Baixa parcial deixa a parcela `parcial` com saldo correto; a soma recebida nunca excede o valor.
- [ ] Estorno reverte parcela e elegibilidade, com motivo na auditoria.
- [ ] Parcela vencida e em aberto aparece destacada no topo da lista.

## 7. Fora do escopo

- Contas a pagar, fluxo de caixa, DRE, boletos/integração bancária.
- Fechamento de comissões (Fase 4).
