# criatura-vd-resistencias-salvamento.spec.md

> Task avulsa de refino da ficha de Criatura. Origem: pedido do autor (2026-11-26) — "alterações na VD
> deveriam aumentar a vida, conforme a tenacidade, e também a defesa", e revisar a ficha para melhorar o
> uso, começando pelas Resistências. Executa a parte de VD de `criatura-npc-vd-habilidades-ataques`
> (backlog, que segue aberta pela parte de NPC).

## Objetivo

Fazer Vida e Defesa acompanharem a VD, deixar o Limite de Resistências e o mínimo das Fraquezas visíveis e
editáveis sem modo de edição, e nunca mais esconder um salvamento recusado.

## Problemas (inspeção com O Ausente, cópia de teste)

1. Mudar a VD não mexia em Vida Máxima nem em Defesa (O Ausente: VD 45 com Vida 1.650, valor de estágio
   anterior).
2. O cabeçalho das Resistências mostrava só "Limite 90 pts", sem quanto está em uso; nada dizia que Geral
   conta 2× e subtipo ½, nem o mínimo da Fraqueza.
3. Baixar a VD abaixo do que as resistências pedem fazia o servidor recusar **todo** salvamento seguinte;
   a tela continuava mostrando a mudança, o indicador sumia e só um aviso passageiro explicava.
4. Resistências e Fraquezas com modo de edição geral, `select` nativo e valor inicial 0.

## Decisões do autor (2026-11-26)

- VD muda → Vida Máxima = VD × multiplicador da Tenacidade e Defesa = 15 + VD ÷ 2, sobrescrevendo ajuste
  manual; a Vida atual anda a mesma diferença.
- Resistências: orçamento visível, clicar no selo abre a edição (Remover dentro), tipo em botões, custo ao
  vivo, mínimo da Fraqueza.
- Salvamento recusado: manter a mudança na tela com aviso fixo "Não salvo — motivo" até salvar.

## Entregáveis

1. Motor (`shared/src/regras/criatura`): `recalcularVitalidadeCriatura`, `somarCustoResistencias`,
   `calcularValorMinimoFraqueza` (validação passa a usá-las), com testes contra o guia.
2. `FichaEdicaoCriaturaService`: VD recalcula Vida e Defesa; Tenacidade recalcula só a Vida; confirmar o
   mesmo valor (ou campo vazio) não mexe em nada. Estado `erro` com o motivo do servidor.
3. Página da criatura: "Não salvo" no cabeçalho (mesmas palavras/cor da ficha de NPC) e aviso fixo com o
   motivo. Tooltip da VD e da Tenacidade avisa do recálculo.
4. `criatura-resistencia-lista`: usado/limite e mínimo no cabeçalho, aviso quando fora da regra, selo
   clicável, caixa com segmentado de tipo, subtipo, valor, custo ao vivo e Remover.

## Fora de Escopo

- NPC (decisão em aberto em `criatura-npc-vd-habilidades-ataques`).
- Ficha de Agente (`ficha-edicao.service.ts` também esconde salvamento recusado — registrado como pendência).
