# m3-56-ficha-mobile-skeletons.spec.md

> Task 53 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).
> **Spec grande** — pode ser quebrada em subtasks por aba na hora de implementar.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Fechar o passe **mobile** do novo design da ficha (todas as abas) e **ajustar os skeletons** de
carregamento para os novos layouts.

## Entregáveis

1. **Versão mobile (item 10).** Passe responsivo sobre **todas as abas** e o cabeçalho da ficha,
   estendendo o que a `m3-26` começou: usar os tokens de `_breakpoints.scss`
   (`$bp-mobile: 560px`/`$bp-tablet: 1080px` + mixins), grades que refluem para 1 coluna, alvos de
   toque ≥44px (`$alvo-toque`) nos controles principais, sem scroll horizontal do body em
   360/390/430px. Cobrir as abas/áreas que as tasks deste lote adicionam/alteram (Inventário
   reorganizado `m3-44`, História `m3-50`, card Extras `m3-49`, calculadora flutuante `m3-54`,
   bandeja `m3-55`).
2. **Skeletons (item 23).** Hoje **não existe skeleton da ficha** — só o texto "Carregando
   ficha…" (`visualizar.page.html` ~linha 48). Criar skeletons/shimmer para os novos layouts,
   **reusando o padrão** já existente em `modules/campanha` (lista/detalhe) e `modules/usuario`
   (perfil). Skeleton por área principal (cabeçalho, atributos, aba ativa) coerente com o layout
   real, adaptado ao mobile.
3. Verificação responsiva ao vivo (Playwright/stack real, ver skill `verify`) em 360/390/430px e
   desktop, garantindo zero scroll horizontal e alvos de toque nas larguras-alvo.

## Critérios de Aceite

- Todas as abas da ficha usáveis no mobile (360-430px) sem scroll horizontal do body; alvos de
  toque ≥44px nos controles principais.
- O carregamento mostra skeletons coerentes com os novos layouts, não texto solto.
- Sem regressão no desktop; budget de estilo respeitado (elevar se necessário, com precedente).

## Fora de Escopo

- Refino visual desktop pontual (é a `m3-55`).
- Novas features — só adaptação mobile + skeletons das telas existentes/deste lote.

## Dependências

- `m3-26` (otimização de espaço + base mobile + breakpoints), e as abas/editores anteriores
  (`m3-11`…`m3-14`, `m3-44`, `m3-49`, `m3-50`, `m3-54`, `m3-55`).
