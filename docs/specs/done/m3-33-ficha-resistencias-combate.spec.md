# m3-33-ficha-resistencias-combate.spec.md

> Task 33 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

A aba Combate hoje não mostra resistências a dano. Esta task agrega a resistência de todo
equipamento **equipado** (Proteções, e Armas pensando na "arma atual" de `m3-34`), agrupada
por `TipoDanoEnum`, e exibe na aba Combate — incluindo bônus de fragmentos aplicados
(`m3-32`).

## Entregáveis

1. Pré-requisito: campo `readonly equipado?: boolean;` em `CarrinhoItemDto`, com toggle na
   UI do Inventário (Proteções/Armas) — hoje só Armazenamento tem um conceito parecido
   (`guardada`), que **não** serve pra isso.
2. Extrair o regex de parsing de resistência hoje inline em `calcularStatItem`
   (`shared/src/regras/compras/compras.ts`) para uma função exportada
   `interpretarNotacaoResistencia(texto)` — refactor puro, sem mudança de comportamento.
3. Novo arquivo `shared/src/regras/agente/resistencia.ts`:
   `calcularResistencias(dto: { itens })`, somando `calcularStatItem({item}).resistencia`
   só dos itens `equipado === true`, agrupado por tipo. Tratar a semântica de dano GERAL
   (reduz qualquer tipo) conforme o parágrafo exato do documento. Aceitar
   `bonusExternos?` opcional (não populado ainda — ponto de extensão pra quando Formação,
   `m3-25`, precisar injetar bônus).
4. `ficha-visualizacao.component.ts`: computed signal `resistencias()` **calculado ao
   vivo** (não persistido/editável — diferente das outras linhas de Combate, já que
   resistência muda toda vez que o equipamento muda). Novo bloco na aba Combate com uma
   linha por tipo de dano com valor > 0, legenda "calculado do equipamento" no lugar da
   affordance de edição.

## Critérios de Aceite

- Equipar/desequipar uma Proteção atualiza a resistência exibida no Combate imediatamente.
- Soma bate com o valor individual de resistência mostrado no Inventário.
- Bônus de fragmento aplicado (`m3-32`) entra na soma.

## Fora de Escopo

- Abater resistência de dano recebido durante uma rolagem (só exibição/agregação aqui).

## Dependências

- `m3-14` (Inventário), `m3-32` (fragmentos aplicados alimentam a soma).
