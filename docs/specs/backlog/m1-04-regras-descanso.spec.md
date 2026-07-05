# m1-04-regras-descanso.spec.md

> Task 4/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Extrair para `shared/regras/descanso/` as regras de descanso — tipos, modificadores, escada
de dados e cálculo de resultado — com testes para as partes determinísticas.

## Entregáveis

1. Dados e funções puras em `regras/descanso/` (entregável 1 da milestone): tipos de descanso
   e seus dados (`DADOS_DESCANSO`), modificadores de qualidade (`QUALIDADE_MOD`), escada de
   dados (`DADOS_SEQ`/`_DIE_LADDER`), seleção/descrição de dado (`tipoDado`, `descDado`,
   `_upgradeDie`) e parsing de dados extras (`parseExtraDice`).
2. A utilidade de rolagem (`rollDice`) **pode** viver em `regras/descanso/` como "utilidade
   de rolagem explícita" sancionada por §6.6 (a única brecha à proibição de `random`); a
   **animação/scramble** e o gatilho visual ficam na página (m1-09), não aqui.
3. Testes unitários das partes determinísticas (seleção de dado, escada, parsing, cálculo do
   resultado dado um valor de rolagem), conferidos contra `docs/core/sistema-v4.1.0.md`. A
   aleatoriedade da rolagem, se incluída, é testada só por limites (faixa), não por valor.

## Critérios de Aceite

- Mesmas saídas determinísticas do site antigo; conformidade com o documento do sistema
  (documento vence — proibição #27).
- `regras/` sem I/O nem estado; `random` só dentro da utilidade de rolagem explícita (§6.6).

## Fora de Escopo

- Página de descanso e a animação de rolagem (m1-09).
- Demais domínios de regras.

## Dependências

- `m1-01-regras-fundacao-enums.spec.md`.
