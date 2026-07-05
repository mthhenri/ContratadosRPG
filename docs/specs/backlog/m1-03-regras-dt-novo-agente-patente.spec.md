# m1-03-regras-dt-novo-agente-patente.spec.md

> Task 3/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Extrair os três domínios de regras **leves**, agrupados por serem pequenos: `dt/`,
`novo-agente/` e `patente/`, cada um com testes contra `docs/core/sistema-v4.1.0.md`.

## Entregáveis

1. **`regras/dt/`** — DT de atributo (`calcDT` do site antigo).
2. **`regras/novo-agente/`** — nível inicial, prestígio inicial, bônus monetário e motivos
   de entrada (`calcNovoAgente`, `calcBonus`).
3. **`regras/patente/`** — lookup de patente por prestígio e recortes derivados usados pela
   aba patente (`getPatente`/`calcPatente`), consumindo a tabela `PATENTES` da m1-01.
4. DTOs de entrada/saída conforme convenções de DTO (recorte computado / value-object).
5. Testes unitários dos três domínios, conferidos contra o documento do sistema.

## Critérios de Aceite

- Mesmas saídas do site antigo para os mesmos inputs nas três abas; conformidade com
  `docs/core/sistema-v4.1.0.md` (documento vence — proibição #27).
- Cobertura de teste dos três domínios; `regras/` sem dependências externas.

## Fora de Escopo

- Páginas/UI de dt, novo-agente e patente (m1-08).
- Demais domínios de regras.

## Dependências

- `m1-01-regras-fundacao-enums.spec.md`.
