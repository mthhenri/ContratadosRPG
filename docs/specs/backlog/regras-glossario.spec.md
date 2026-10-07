# regras-glossario.spec.md

> **Spec avulsa, independente do M10** (decisão do autor, 2026-10-06): o leitor de Regras não
> depende do glossário e ele entra a qualquer momento depois da `m10-06`. Esboço — refinar com o
> autor antes de mover para `active/`.

## Objetivo

Marcar termos do sistema no texto das Regras com um cartão: definição curta + "ir para a seção".

## Pontos a fechar com o autor antes de implementar

- **Fonte das definições:** trecho do próprio `.md` (primeira frase do verbete ⬦) ou lista curada
  à parte. Nunca texto inventado.
- **Quais termos:** todos os verbetes ⬦ ou uma lista explícita (atributos, condições, recursos…).
- **Onde aparece:** só no leitor de Regras ou também na ficha (aproxima das "pontes site → regra"
  da `IDEAS`).
- **Primeira ocorrência por seção** ou todas.

## Entregáveis (provisórios)

1. Dados do glossário gerados pelo normalizador (`m10-01`) junto do formato canônico.
2. Termo marcado no texto (sublinhado discreto); cartão com `app-cartao`/tooltip rico; atalho para a
   âncora da seção.
3. Teste: todo termo marcado tem âncora existente.
