# m7-20-regressao-botao-abrir-ficha-grade-compacta.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate. Pedido direto do autor: "no desktop, na tela de
> iniciativa, na visão de player, não deveria ter o botão de abrir ficha como card flutuante".
> Correção de regressão — o comportamento pedido já tinha sido implementado em `m7-12` e foi
> revertido sem intenção por um commit posterior.

## Objetivo

No desktop, quando o jogador está com a **ficha lateral já aberta** (grade compacta), o botão "abrir
ficha" de cada cartão de combatente não deve aparecer — a ficha já está visível ao lado, e abri-la de
novo como janela flutuante (`FichaFlutuante`) só duplica a mesma informação em cima da lateral.

## Causa raiz (regressão identificada)

`m7-12` (`docs/specs/done/m7-12-layout-desktop-iniciativa.spec.md`) implementou exatamente esse
esconder no commit `4f8ecd6`, em
`frontend/src/app/modules/encontro/componentes/cartao-combatente/cartao-combatente.component.scss`,
dentro do media query de desktop: `:host-context(.grade--compacta) .combatente { &__abrir-ficha {
display: none; } }`.

Essa regra foi **removida** no commit `139d221` ("feat(encontro): adiciona rolagens aos avulsos",
2026-08-22), que trocou o comentário do bloco para "As ações disponíveis continuam visíveis: compactar
a grade não pode remover funcionalidades do mestre ou do jogador" ao adicionar suporte a
`&__rolar-avulso` — revertendo, sem intenção, o comportamento específico do botão de abrir ficha.
Estado atual do arquivo (linhas 576-608): o bloco `.grade--compacta .combatente` não tem mais
nenhuma regra para `&__abrir-ficha`.

O botão continua sempre renderizado quando a ficha existe e está revelada
(`cartao-combatente.component.html:110-120` — `@if (combatente().fichaId !== null && (revelado() ||
ehMestre())) { <button class="combatente__abrir-ficha" ...> }`), e o output está sempre ligado em
`painel-encontro.page.html:516` (`(abrirFicha)="abrirFichaFlutuante(combatente)"`).
`.grade--compacta` é aplicada quando `mostrarFichaLateral()` é verdadeiro
(`painel-encontro.page.ts:460-462`, `307-309` — jogador não-mestre com ficha própria), então hoje
todo cartão da grade compacta, inclusive o do próprio jogador, ainda mostra o botão.

## Entregáveis

1. Restaurar, em `cartao-combatente.component.scss`, a regra que esconde `&__abrir-ficha` dentro do
   `.grade--compacta` no breakpoint desktop — sem remover nem esconder `&__rolar-avulso` nem
   qualquer outra ação adicionada depois de `m7-12` (o objetivo é reaplicar só a regra específica do
   botão de abrir ficha, preservando as demais funcionalidades que o comentário do commit `139d221`
   corretamente queria proteger).
2. Confirmar que a mesma regra não afeta o mestre (que não usa `.grade--compacta` — `gradeCompacta`
   é `mostrarFichaLateral() || colunasGrade() > 3`; se `colunasGrade() > 3` também ativar
   `.grade--compacta` para o mestre em telas largas com muitos combatentes, o botão "abrir ficha"
   deve continuar visível pra ele nesse caso, já que o mestre não tem ficha lateral — avaliar se a
   regra precisa ser mais específica que `.grade--compacta` sozinha, ex. condicionada também a
   `:host-context` de jogador, para não esconder a ação do mestre por engano nesse cenário de "mais
   de 3 colunas").
3. Não alterar o comportamento mobile, que já não usa essa grade compacta desktop.

## Critérios de Aceite

- Desktop, jogador com ficha lateral aberta (`grade--compacta` ativa por `mostrarFichaLateral`):
  nenhum cartão da grade mostra o botão "abrir ficha".
- Desktop, mestre com `colunasGrade() > 3` (grade compacta por quantidade de combatentes, sem ficha
  lateral): o botão "abrir ficha" continua visível nos cartões que já o tinham (o mestre não tem
  substituto lateral para a ficha).
- O botão "rolar avulso" (`&__rolar-avulso`) e as demais ações adicionadas após `m7-12` continuam
  visíveis normalmente nos dois cenários acima.
- Mobile sem alteração de comportamento.
- Verificação pela skill `verify` em `1920×1080`: como jogador com ficha lateral aberta, confirmar
  ausência do botão nos cartões; como mestre com grade compacta por quantidade, confirmar presença.

## Fora de Escopo

- Qualquer redesenho do cartão de combatente além de restaurar essa regra específica.
- Mudar a lógica de `gradeCompacta`/`mostrarFichaLateral` em si.

## Dependências

`m7-12` (implementação original), commit `139d221` (regressão a corrigir).
