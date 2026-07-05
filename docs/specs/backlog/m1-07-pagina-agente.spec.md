# m1-07-pagina-agente.spec.md

> Task 7/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Entregar a página `agente` — a carro-chefe da calculadora — com paridade funcional à aba do
site antigo (`calc()`), consumindo `shared/regras/agente`. Nenhuma regra de jogo no front.

**Antes de qualquer UI, ler `docs/design/DESIGN.md`; alvo de fidelidade visual 1:1 é
`docs/design/examples/calculadora-de-atributos.html`.**

## Entregáveis

1. Formulário reativo (atributos, classe, nível, civil/agente) em **Reactive Forms** com
   os steppers da m1-06; estado em **Signals**.
2. Exibição de todas as stats derivadas via `shared/regras/agente`: vida, energia, limite de
   energia, defesa, proficiência, deslocamento, dano corpo a corpo, inventário, área de
   percepção, dano furtivo, traumas/sequelas, limite de habilidades/turno, benefícios por
   nível e progressão acumulada.
3. Layout fiel ao protótipo aprovado `docs/design/examples/calculadora-de-atributos.html`,
   consumindo os tokens e os padrões BEM de `docs/design/tema/_componentes.scss`.

## Critérios de Aceite

- Mesmas saídas do site antigo para os mesmos inputs (verificação manual lado a lado).
- Zero regra de jogo duplicada no front — todo cálculo vem de `shared/regras/agente`.
- Funciona offline do backend; sem NgModule/`.css`/`style=""`/hex solto.

## Fora de Escopo

- Outras abas; conteúdo de ajuda (m1-12); troca de tema em runtime (m1-13).

## Dependências

- `m1-02-regras-agente.spec.md` e `m1-06-frontend-calculadora-base.spec.md`.
