# m1-19-botao-limpar-abas-calculadora.spec.md

> Extensão do milestone `m1-calculadora-paridade.spec.md` (pós-m1-18) — task `m1-19`.
> Spec redigida **após** a implementação, a pedido do autor (registro do que foi entregue).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Adicionar, **ao lado do botão "Ajuda"** em **todas as 6 abas** da calculadora (`agente`, `dt`,
`novo-agente`, `patente`, `descanso`, `compras`), um botão **"Limpar"** que faz a aba voltar ao
**estado padrão** (o mesmo do primeiro carregamento). Para evitar zerar a aba por engano, o
Limpar é em **duas etapas com confirmação temporizada**.

## Entregáveis

1. **Botão "Limpar" ao lado do "Ajuda"**, uniforme nas 6 abas. Como o gatilho de ajuda já vem do
   componente único `AjudaCalculadora` (m1-12) renderizado no topo de cada página, o botão nasce
   **nesse mesmo componente** — um único ponto de inserção, mesma posição em toda aba.
2. **Confirmação em duas etapas (in-place):**
   - **1º clique** → o rótulo vira **"Tem certeza?"** e o botão passa a **invertido/filled**
     (fundo `--accent`, texto `--bg` — linguagem do `.botao--primario` do tema).
   - **2º clique dentro de 3s** → confirma e **limpa** a aba; o rótulo volta a "Limpar".
   - **sem 2º clique em até 3s** → reverte sozinho para "Limpar" (temporizador cancelado na
     confirmação e na destruição do componente — nada de timer pendente após desmontar a rota lazy).
3. **Componente burro quanto ao reset:** `AjudaCalculadora` só **emite** o output `limpar` na
   confirmação; **quem sabe voltar ao estado padrão é a página** (o componente não conhece o
   formulário da aba). Cada página liga `(limpar)="limpar()"` e implementa o próprio reset:
   - `agente` / `dt` / `patente` — `formulario.reset()` (controles `nonNullable` voltam ao preset de
     construção); o `valueChanges` já existente regrava o preset no singleton de estado (m1-17).
   - `novo-agente` — `reset()` **e** re-executa o auto-preenchimento do Prestígio do bônus, para
     bater com o primeiro load (o campo nasce preenchido, não zerado).
   - `descanso` — cancela uma rolagem animada em curso, esconde a última rolagem e `reset()`.
   - `compras` — `reset()` dos recursos + esvazia carrinho/amplificadores/painéis + busca limpa +
     catálogo na 1ª categoria; o `effect` de persistência (m1-11) regrava o padrão no `localStorage`,
     então recarregar segue no padrão (**descarta o carrinho salvo** — é o que "Limpar" faz aqui).
4. **Só apresentação/estado de UI** — nenhuma regra de jogo tocada (`shared/regras` intocado),
   nenhum backend, nenhum DTO. **SCSS/BEM só com tokens** (proibição #29): o botão reusa a
   linguagem do gatilho de ajuda; o passo de confirmação usa `--accent`/`--bg`/`--accent-border`.

## Critérios de Aceite

- Botão "Limpar" visível ao lado de "Ajuda" nas 6 abas, alinhado à direita como o gatilho.
- 1º clique → "Tem certeza?" filled; 2º clique (≤3s) limpa; timeout de 3s reverte para "Limpar".
- Cada aba volta exatamente ao estado do primeiro load (inclui o bônus auto-preenchido do
  `novo-agente`, a rolagem oculta do `descanso` e o `localStorage` do `compras`).
- Identidade "Terminal de Contenção" preservada; `lint`/`test`/`build` do frontend verdes.

## Fora de Escopo

- Confirmação via modal/dialog (a confirmação é in-place no próprio botão, sem `confirm()` nativo).
- Persistir/limpar o estado de outras abas (cada Limpar afeta só a aba em que foi acionado).
- Qualquer regra de jogo, backend, DTO ou dado novo.

## Notas de Implementação

- `AjudaCalculadora` ganhou o output `limpar`, o Signal `confirmandoLimpeza`, o método
  `aoClicarLimpar()` e o temporizador de 3s (`JANELA_CONFIRMACAO_MS`), com limpeza via `DestroyRef`.
- **+8 testes** (Vitest): **2** no `ajuda-calculadora.component.spec` (confirmação em dois passos;
  reversão após 3s com fake timers) e **1** por página (6) provando o reset ao padrão de cada aba
  (incl. o re-preenchimento do bônus no `novo-agente`, a rolagem oculta no `descanso` e o descarte
  do carrinho persistido no `compras`). Todos verdes.
