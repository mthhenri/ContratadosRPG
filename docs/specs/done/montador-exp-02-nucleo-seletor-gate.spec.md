# montador-exp-02-nucleo-seletor-gate.spec.md

> Task 2/4 do guarda-chuva `montador-rolagem-experimento.spec.md` (`IDEAS.md` `I-041`).

## Objetivo

Centralizar o gate do montador (restrito a TESTER/ADMIN), oferecer o seletor Atual/Essencial/Completo/Blocos com a
preferência por dispositivo e entregar a casca e o modelo de estado comuns às três versões novas.

## Entregáveis

1. Gate único `podeUsarMontador` (`shared/montador-rolagem-experimental/montador-acesso.ts`), padrão restrito; o
   input `restringirMontadorATester` sai de `RolagemRapida`, `FichaRolagens`, `FichaRolagensPainel` e dos cinco
   templates que o passavam.
2. Seletor `app-montador-seletor-versao` (`app-segmentado`) na barra de "Rolagem rápida", fora das janelas, só para
   quem passa no gate; o Atual (`MontadorRolagem`) não é modificado.
3. Preferência `MontadorVersaoPreferenciaService`: `localStorage` com `try/catch`, padrão Atual.
4. Modelo puro (`montador-modelo.ts`): estado derivado do texto (vazia/peças/avançada/inválida), receitas de partida,
   edição por peças sobre `tokenizarFormula`/`montarFormula` (task 01), Desfazer e atalhos só com valor na ficha.
5. Casca `app-montador-rolagem-experimental`: gatilho, `app-painel-flutuante`, visor sincronizado nos dois sentidos,
   "Começar por"/"Modelos" (primitivo novo `app-cartao-receita`), avisos de avançada e inválida, último resultado
   (o painel não fecha ao rolar) e rodapé Desfazer · Limpar · Rolar.

## Critérios de Aceite

- Testes: gate (TESTER e ADMIN veem, NORMAL e sem sessão não), seletor, preferência (armazenamento indisponível →
  Atual), Desfazer e sincronização; abrir o Atual com conta na quantidade de dados não quebra.
- Lint e build de produção sem aviso novo; `verify` do seletor em `1920×1080` e `360×800`.

## Fora de Escopo

Os editores de cada versão (tasks 03 e 04); qualquer mudança no `MontadorRolagem`; backend.

## Dependências

`montador-exp-01-tokenizacao-formula.spec.md` (em `done/`).
