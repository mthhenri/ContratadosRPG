# m3-12-ficha-editor-sanidade.spec.md

> Task 12 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> As **regras de jogo** de Sanidade/Lesões vêm de `docs/core/sistema-v4.1.0.md` — o documento vence
> (proibição #27).

## Objetivo

Editor **no próprio lugar** da aba **Sanidade** (`m3-11`): as três listas de `estado` —
**sequelas** (temporárias), **traumas** (permanentes, tratáveis) e **lesões** (removem pontos de
atributo). Hoje são só exibidas (`m3-07`); esta task permite **adicionar, editar e remover** entradas,
persistindo no `dados`. Liberdade total de edição (o mestre reflete o que aconteceu em campanha) — o
motor de regras é referência de limites (sugestão), não trava (`m3-10`).

## Entregáveis

1. **Sequelas** — adicionar/editar/remover `{ nome, descricao? }`. Lista com o padrão de "marca" do
   tema (borda colorida por tipo).
2. **Traumas** — `{ nome, descricao?, tratado }`; alternar **tratado** in loco (o trauma permanece;
   só reduz a penalidade — `sistema-v4.1.0.md`).
3. **Lesões** — `{ atributo (keyof atributos), pontos, severidade (SeveridadeLesaoEnum), permanente }`;
   editor com `<select>` de atributo e severidade, stepper de pontos, toggle permanente. Exibe o
   efeito ("−N no atributo") derivado, não persiste o texto.
4. Cada mutação persiste via `alterarFicha` (documento inteiro), otimista na tela; um **lápis/＋** por
   lista, confirmação/cancelamento locais (padrão granular de `m3-10`). Contadores de marcas atualizam.
5. Standalone, Signals, Reactive Forms (sem `ngModel`), `.scss`/BEM com tokens.

## Critérios de Aceite

- Dono/mestre adiciona, edita e remove sequelas/traumas/lesões; recarregar mantém as listas íntegras.
- Alternar "tratado" e "permanente" persiste; a lesão mostra o efeito no atributo.
- Sem trava de faixa além da forma (camada 1) — coerência de regra é sugestão visual, não bloqueio.

## Fora de Escopo

- Aplicar **mecanicamente** o efeito de lesão/sequela/trauma nos cálculos derivados (o autor edita os
  `derivados` diretamente em `m3-10`); aqui só a lista.
- Limite de traumas/sequelas por Vontade como **trava** — só como aviso, se houver (não bloqueia).

## Dependências

- `m3-10` (edição granular + persistência), `m3-11` (aba Sanidade), `m3-01` (contrato das listas).
