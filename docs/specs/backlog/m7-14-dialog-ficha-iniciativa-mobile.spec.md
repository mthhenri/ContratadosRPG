# m7-14-dialog-ficha-iniciativa-mobile.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Corrigir o dialog de ficha aberto pela tela Iniciativa: aumentar a folga lateral e estabelecer uma
única rolagem vertical utilizável no mobile, para que todo o conteúdo possa ser visto.

## Entregáveis

1. Aumentar os paddings laterais do conteúdo do dialog sem produzir overflow horizontal em telas
   pequenas.
2. No breakpoint mobile, definir claramente o único container responsável pela rolagem vertical do
   dialog; remover rolagens concorrentes que cortam ou tornam partes da ficha inalcançáveis.
3. Preservar cabeçalho, fechamento, foco no dialog e a navegação interna da ficha. Ao abrir ou fechar
   o dialog, o scroll de fundo permanece bloqueado conforme o padrão PrimeNG existente.
4. Usar como análogo os dialogs de ficha já aprovados e o padrão global de scrollbar do tema; não
   inserir medidas visuais hardcoded fora dos tokens/breakpoints do projeto.

## Critérios de Aceite

- Em `360×800`, o conteúdo inteiro da ficha flutuante é alcançável, sem corte, scroll horizontal ou
  duas barras verticais concorrentes.
- Em `1920×1080`, o dialog continua com respiro lateral, foco correto e sem regressão de tamanho.
- Verificação pela skill `verify` com fichas de conteúdo curto e longo; `npm run test -w frontend`
  verde e `npm run lint -w frontend` limpo.

## Fora de Escopo

- Alterar dados, permissões ou os conteúdos exibidos pela ficha flutuante.

## Dependências

- `m7-05` e `m7-08` (dialog e comportamento responsivo do encontro).
