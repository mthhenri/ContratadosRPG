# resistencia-protecao-base-bonus.spec.md

> Task avulsa decorrente do refinamento solicitado pelo autor em 2026-08-26. Esta spec corrige o
> recorte semântico dos efeitos já modelados para **Maestria de Vigor** e **Tanque**. Não altera os
> valores de nenhum item, modificação ou habilidade.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md`, em especial “Maestrias” (Vigor),
> “Vanguarda” (Tanque), “Proteções e Escudos” e “Modificações”. O documento vence. Task de motor
> compartilhado com reflexo de exibição: testar `shared` e verificar Inventário + catálogo de itens
> na aplicação real.

## Objetivo

Fazer com que a **Maestria de Vigor** e a habilidade **Tanque** do arquétipo Vanguarda incidam
somente sobre cada **tipo de resistência nativo** de uma Proteção — isto é, o tipo já presente na
definição canônica da Proteção na loja (ou na resistência-base de uma Proteção customizada).

Uma resistência criada exclusivamente por uma modificação não recebe nenhum dos dois bônus. Por
exemplo, uma Armadura Pesada com Hazmat continua obtendo os `+2 [Químico]` de Hazmat, mas esse valor
Químico não recebe `+Vigor` nem `+3` de Tanque, pois Químico não é uma resistência-base da Armadura
Pesada.

## Regra fechada

Para cada Proteção equipada:

1. Determine os tipos de dano declarados na resistência-base da própria Proteção, antes de aplicar
   modificações. Uma entrada composta de escudo, como `[Físico/Balístico]`, declara os dois tipos.
2. Para cada tipo nativo, some `+Vigor` se a ficha tiver Maestria de Vigor e some `+3` se possuir a
   habilidade Tanque.
3. Em seguida, preserve os efeitos das modificações exatamente como já são calculados. Eles podem
   aumentar, reduzir ou criar resistências, mas não recebem uma segunda incidência dos bônus acima.
4. Uma modificação que altera o **valor** de um tipo nativo (por exemplo Blindada, Reforçada ou
   Camuflada) não elimina o direito do tipo nativo aos bônus fixos. A distinção é por tipo de dano
   nativo, não pela parcela numérica que veio do catálogo.
5. A regra vale apenas para `ItemCategoriaEnum.PROTECOES`; armazenamento com resistência (inclusive
   Camadas Extras) nunca recebe Maestria de Vigor nem Tanque.

## Exemplos normativos

| Proteção/efeito | Maestria Vigor 6 | Tanque | Resultado esperado |
| --- | ---: | ---: | --- |
| Armadura Pesada: `10 [Físico], 6 [Balístico]` | sim | sim | `19 [Físico], 15 [Balístico]` |
| Armadura Pesada + Hazmat: `+2 [Químico]` | sim | sim | `19 [Físico], 15 [Balístico], 2 [Químico]` |
| Armadura Pesada + Blindada: `+2` nos tipos existentes | sim | não | `18 [Físico], 14 [Balístico]` |
| Colete de Kevlar + Hazmat | não | sim | `8 [Físico], 6 [Balístico], 2 [Químico]` |
| Mochila Kevlar / Camadas Extras | sim | sim | sem bônus de Maestria ou Tanque |

## Entregáveis

1. **Motor de resistências.** Revisar `shared/src/regras/agente/resistencia.ts` para separar a
   resistência-base da Proteção do stat já fundido com modificações. O cálculo agregado do Combate
   deve aplicar Maestria e Tanque somente aos tipos nativos, preservando a soma de modificações,
   amplificadores, Formação e base manual conforme as regras atuais.
2. **Formatação de item.** Revisar o helper compartilhado usado pelo Inventário para que a
   descrição da resistência efetiva use o mesmo recorte. Ela deve receber contexto suficiente do
   item para saber quais tipos são nativos, em vez de aplicar Maestria sobre a string final já
   computada.
3. **Inventário e catálogo.** Manter a visualização da resistência efetiva tanto no item já
   possuído quanto no cartão de “Adicionar itens”, sem mutar o item persistido nem o catálogo
   canônico.
4. **Testes.** Adicionar testes unitários que reproduzam a regressão com Hazmat e cubram ambos os
   bônus, tipos compostos de escudo, modificações em tipo nativo e resistência de armazenamento.

## Critérios de aceite

- Maestria de Vigor acrescenta Vigor exatamente uma vez a cada tipo nativo de cada Proteção
  equipada e não cria resistência em tipo introduzido por modificação.
- Tanque acrescenta 3 exatamente uma vez a cada tipo nativo de cada Proteção equipada e não cria
  resistência em tipo introduzido por modificação.
- Quando ambos coexistem, os dois bônus se somam somente aos tipos nativos.
- Hazmat e Antibombas mantêm suas resistências próprias, sem Maestria/Tanque se o tipo não for
  nativo da Proteção. O mesmo vale para efeitos customizados `RESISTENCIA` que criem um tipo novo.
- Blindada, Reforçada, Camuflada e efeitos customizados que modifiquem um tipo já nativo preservam
  o bônus fixo desse tipo, sem duplicá-lo.
- A soma de resistência no Combate/Encontro e o texto do Inventário/catálogo apresentam o mesmo
  resultado efetivo.
- Itens não equipados e itens fora de `PROTECOES` continuam sem os bônus; a Maestria não cria
  resistência sem Proteção equipada.
- `shared`, `backend` e `frontend` permanecem verdes; lint limpo. A UI é verificada na aplicação
  real em `1920×1080` e `360×800`, com Maestria/Tanque e uma Proteção Hazmat, sem overflow nem
  divergência entre o cartão e o total de Combate.

## Fora de escopo

- Alterar o texto, valor, limite ou compatibilidade de qualquer modificação.
- Rebalancear Maestria de Vigor ou Tanque.
- Aplicar qualquer outro efeito de Maestria.
- Aplicar Maestria ou Tanque a criatura/NPC.
- Alterar resistências manuais, Formação de Origem ou amplificadores, exceto para preservar sua
  composição atual no total calculado.

## Dependências e pontos de atenção

- `docs/specs/active/maestrias-efeitos.spec.md` introduziu a Maestria de Vigor; esta task é um
  refinamento posterior e não autoriza reescrever a spec histórica quando ela for concluída.
- `shared/src/regras/compras/compras.ts` é a fonte do stat de item com modificações e expõe
  `resolverDadosItem`/`interpretarNotacaoResistencia`; não duplicar a leitura da notação na UI.
- `shared/src/regras/agente/resistencia.ts` alimenta a ficha e o Encontro; a regra precisa ficar
  centralizada ali para que ambos permaneçam coerentes.
- `frontend/src/app/modules/ficha/componentes/ficha-inventario/` exibe a resistência efetiva e deve
  consumir a mesma regra compartilhada, sem recalcular a distinção no componente.
