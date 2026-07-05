# m1-02-regras-agente.spec.md

> Task 2/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Extrair para `shared/regras/agente/` **todas** as fórmulas do agente (aba `agente` do site
antigo — função `calc()` e auxiliares), com testes Jest validados contra
`docs/core/sistema-v4.1.0.md`.

## Entregáveis

1. Fórmulas puras em `regras/agente/` (entregável 1 da milestone): vida, energia, limite de
   energia, defesa, proficiência, deslocamento (`calcularDeslocamento`), dano corpo a corpo
   (`calcularDanoCorpo`), inventário (`calcularInventario`), traumas/sequelas, área de
   percepção, dano furtivo, limite de habilidades por turno, benefícios por nível, progressão
   acumulada e limites por classe (`aplicarLimitesPorClasse`).
2. DTOs de entrada/saída das funções conforme convenções de DTO (recorte computado /
   value-object — ver skill `dto-conventions`); funções recebem DTO tipado, nunca uma cascata
   de primitivos soltos.
3. Testes unitários cobrindo **todas** as fórmulas da aba, conferidos contra as tabelas do
   `docs/core/sistema-v4.1.0.md`.

## Critérios de Aceite

- Mesmas saídas do `calc()` antigo para os mesmos inputs (verificação vs `script.js`) **e**
  conformidade com `docs/core/sistema-v4.1.0.md` — em conflito, o documento vence
  (proibição #27); divergências registradas.
- 100% das fórmulas da aba agente cobertas por teste; zero dependências externas em `regras/`.

## Fora de Escopo

- Página/UI do agente (m1-07).
- Fórmulas das outras abas.

## Dependências

- `m1-01-regras-fundacao-enums.spec.md` (harness, enums e dados compartilhados).
