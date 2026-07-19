# m3-34-ficha-combate-rolagens-combos.spec.md

> Task 34 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Mesclar as abas "Combate" e "Rolagens" numa só, e adicionar **Combos**: sequência ordenada
de rolagens (referenciando presets já existentes) que o jogador monta e executa passo a
passo.

## Entregáveis

1. Remover `'rolagens'` de `AbaFicha`/`ABAS_FICHA`, manter `'combate'` como aba única —
   deixa `m3-27` (histórico de rolagem, backlog) livre pra adicionar um `'historico'`
   futuro sem colidir. Ajustar deep-links `?aba=rolagens` (redirecionar pra
   `?aba=combate`).
2. Painel mesclado da aba Combate hospeda: o `<dl>` de stats existente, Resistências
   (`m3-33`), `<app-ficha-rolagens>` e a nova seção de Combos, como sub-navegação interna
   (chips) dentro da mesma aba.
3. Novo DTO `shared/src/dtos/ficha/ficha-combo.dtos.ts`:
   `FichaComboPassoDto { nome; rolagemNome (referencia FichaRolagemDto.nome); descricao? }`
   e `FichaComboDto { nome; passos }`. `FichaJogadorDadosDto` ganha `combos?`.
4. Cada passo do combo **referencia** um preset de rolagem já existente — nenhum motor
   novo em `shared/src/regras/rolagem`, reusa `resolverPreset`/`rolarPasso`.
5. Novo componente standalone `ficha-combos` (padrão de `ficha-rolagens`): editor CRUD
   (nome, passos, reordenar), runner "Executar combo" com estado de "passo atual" e botão
   "Próximo" que avança **um passo por vez** (não dispara tudo de uma vez), chamando o
   mesmo caminho de rolagem que `ficha-rolagens` já usa e mostrando cada resultado na
   `BandejaDadosService` como uma rolagem normal (mesmo débito de energia de habilidades
   vinculadas).
6. Referência pendurada (preset renomeado/apagado) não bloqueia salvar — vira um estado de
   "preset não encontrado" em tempo de execução.
7. Novo output `combosMudou`, persistido em `visualizar.page.ts` igual a `rolagensMudou`.

## Critérios de Aceite

- Não existe mais uma aba "Rolagens" separada; tudo mesclado em "Combate".
- Um combo com N passos executa um por clique em "Próximo", cada resultado aparecendo na
  bandeja de dados na ordem certa.
- Energia de habilidade vinculada debita uma vez por execução do passo, sem duplicar.
- Passo com referência quebrada mostra erro gracioso, não quebra a tela.

## Fora de Escopo

- Nova gramática de fórmula ou novo componente de resultado (reusa o que já existe).
- Histórico persistido de rolagens (`m3-27`, backlog separado).
- Layout/densidade fina da aba mesclada — `m3-26` (backlog) pode restilizar depois.

## Dependências

- `m3-15` (presets de rolagem), `m3-33` (Resistências, compõe o mesmo painel).
