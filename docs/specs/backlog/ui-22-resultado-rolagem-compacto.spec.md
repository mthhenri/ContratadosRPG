# UI-22 — Resultado de rolagem: variante compacta e acabamento

> Filha da auditoria visual (seção Rolagem). Mexe em tela de jogo: pede uma rodada de mesa antes
> de fechar.

## Objetivo

O `app-resultado-rolagem` tem uma forma só — total de 44px, desenhada para a carta de 640px da
bandeja — e é reusado no painel lateral de 500px e no feed da campanha. Criar a variante de linha
e fechar três pontas soltas.

## Entregáveis

1. `[compacto]`: total 22px, pool em linha. Numa lista de dez rolagens cada item ocupa hoje quase
   120px de altura; a variante cabe três vezes mais histórico na mesma altura sem perder nada da
   leitura. Nenhum token novo — `--cor-ficha` no total, `--dano-*` nos chips, `--surface-2`,
   `--border`.
2. Adotar no painel lateral de histórico e no feed da campanha; a bandeja continua na forma cheia.
3. `aria-label` "descartado" no dado cortado por `kh/kl`, hoje comunicado só por opacidade 0,45 +
   risco.
4. Duração da barra de tempo vinda do serviço por custom property. Os 7s estão escritos no CSS e
   no serviço; enquanto forem dois números vão se separar.
5. Token (ou mixin) de realce do crítico. O glow é `text-shadow` calculado inline em três
   componentes com a mesma receita — mesmo caso do chip.

## Critérios de Aceite

- Dez rolagens no painel de 500px caem em pelo menos três vezes menos altura que hoje, com total,
  fórmula, autor e chips de dano ainda legíveis.
- Leitor de tela anuncia o dado descartado.
- A receita do glow não aparece mais inline em nenhum dos três componentes.
- Alterar a duração no serviço muda a animação sem tocar no SCSS.
- Gate visual da bandeja (forma cheia), painel e feed (compacto) nos dois viewports.

## Fora de Escopo

Alterar a fórmula ou o cálculo da rolagem, mudar a cor por ficha e redesenhar a carta da bandeja.

## Dependências

`ui-13` (chips), `ui-18`, `shared/{bandeja-dados,resultado-rolagem,historico-rolagens-sidebar}`.
