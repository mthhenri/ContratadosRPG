# m7-12-layout-desktop-iniciativa.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Corrigir a densidade do shell desktop da tela Iniciativa: lateral mais estreita na visão de jogador
e controles laterais do mestre com altura e espaçamento coerentes, sem scroll vertical artificial.

## Entregáveis

1. Redimensionar a lateral da visão de jogador de modo que a tela em desktop comporte o conteúdo
   previsto sem introduzir scroll da página por sobra de largura/altura do shell.
2. Ajustar altura, alinhamento e espaçamento vertical dos botões laterais à esquerda no painel do
   mestre, preservando a ordem de ações e os estados de foco/disabled.
3. Reutilizar como análogo o shell de duas colunas do painel de campanha e os `.botao` canônicos;
   consumir apenas tokens e breakpoints existentes.
4. Não alterar os controles mobile, cuja disposição é responsabilidade de `m7-08` e da barra fixa.

## Critérios de Aceite

- Em `1920×1080`, os dois papéis não apresentam scroll vertical causado pela composição do shell;
  conteúdos naturalmente longos mantêm seus próprios pontos de rolagem acessíveis.
- Os botões laterais têm ritmo visual consistente, alvos utilizáveis e foco visível.
- Em `360×800`, não há regressão da barra de ação nem overflow horizontal.
- Verificação pela skill `verify` nos dois viewports; `npm run test -w frontend` verde e `npm run
  lint -w frontend` limpo.

## Fora de Escopo

- Reorganizar ações, alterar permissões ou redesenhar os cartões de combatente.

## Dependências

- `m7-05`, `m7-06` e `m7-08`.
