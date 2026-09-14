# habilidade-unica.spec.md

> Task avulsa: categoria adicional para habilidades personalizadas na ficha de agente.

## Objetivo

Permitir que o autor classifique uma habilidade personalizada como **Única**, sem alterar as
regras, o catálogo ou os agrupamentos de habilidades do sistema.

## Entregáveis

1. `HabilidadeCategoriaEnum` expõe `UNICA` e o rótulo compartilhado `Única`.
2. O diálogo de adição personalizada oferece a opção e persiste a categoria na habilidade salva.
3. O chip e a borda de uma habilidade dessa categoria mostram `Única` com a cor de identidade do
   agente, igual à Personalidade; ela permanece fora dos quatro contadores-resumo, que representam
   somente classe, arquétipo, geral e outra origem.

## Critérios de Aceite

1. O teste focado de `FichaHabilidades` prova que a opção `Única` aparece no editor e que a
   habilidade emitida mantém `HabilidadeCategoriaEnum.UNICA`.
2. Build do `shared`, testes e lint do `frontend` passam.
3. Na aplicação real, o diálogo de habilidade personalizada é comparado ao próprio editor de
   Habilidades (análogo aprovado) em `1920×1080` e `360×800`, sem overflow e com o controle
   nativo coerente com a densidade existente.

## Fora de Escopo

- Criar uma habilidade Única no catálogo do sistema.
- Atribuir regras, cor exclusiva, origem, fórmula ou contador próprio à categoria.
- Alterar as categorias existentes ou migrar fichas já persistidas.

## Dependências

- `docs/core/sistema-v4.1.0.md` — Habilidades.
- `docs/design/DESIGN.md` e o editor existente de `FichaHabilidades`.

## Riscos e Mitigação

- O resumo possui apenas quatro buckets intencionais; o teste garante que Única não seja
  incluída indevidamente em nenhum deles.
