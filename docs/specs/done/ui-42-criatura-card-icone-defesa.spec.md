# ui-42-criatura-card-icone-defesa.spec.md

> Spec avulsa, pequena. Pedido do autor em 2026-10-14: no card de criatura da visão do mestre, a
> Defesa está sem ícone.

## Objetivo

O card de criatura no painel da campanha do mestre mostra a Defesa com o ícone `defesa`, igual ao card
de agente.

## Situação atual (levantada em 2026-10-14)

- `modules/campanha/componentes/criatura-esquadrao-card/criatura-esquadrao-card.component.html`:
  `<span>Def <strong>{{ criatura().defesa }}</strong></span>`, sem ícone.
- Análogo aprovado: `espectador-ficha-card.component.html` —
  `<app-icone class="icone--texto icone--defesa" nome="defesa" appTooltip="Defesa" /> Def <strong>…</strong>`.
  O `cartao-ficha-acervo` usa o mesmo glifo.
- Criatura só tem Defesa (sem Esquiva/Bloqueio/Contra-ataque) — não acrescentar reações.

## Entregáveis

1. Ícone `defesa` com a mesma receita/classes do card de agente, `appTooltip="Defesa"`.
2. Conferir outros pontos de criatura com Defesa sem ícone (`criatura-visualizacao`, ficha flutuante,
   encontro) e **levar ao autor** a lista antes de estender.

## Critérios de Aceite

- Card de criatura com o mesmo alinhamento/tamanho de ícone do card de agente.
- Gate visual (`verify`) em `1920×1080` e `360×800` comparando lado a lado com o card de agente. Teste do
  componente, lint, `npm run repo:verificar`.

## Fora de Escopo

Ícones de VD e Tenacidade (`icones-criatura-vd-tenacidade`).
