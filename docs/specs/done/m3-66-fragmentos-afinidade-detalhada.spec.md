# m3-66-fragmentos-afinidade-detalhada.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do lote de Fragmentos (`m3-35`, `m3-42`,
> `m3-49`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema "Terminal de
> Contenção" (proibição #29).

## Objetivo

A Afinidade hoje só aparece como um número agregado (aba Extras) e uma nota de redução também
agregada — o jogador não vê **quanto cada fragmento** contribui nem o efeito real da Afinidade nos
custos que vai pagar, porque os cards do catálogo e os paineis de ação mostram sempre o custo
**bruto**, nunca o já reduzido pela Afinidade atual do agente.

## Contexto (o que já existe)

- `ficha-visualizacao.component.html:1509-1530` — bloco "Afinidade de Fragmentos": total
  (`afinidadeFragmentos()`), chips de módulo (`modulosFragmentosPortados()`, só o número do módulo,
  sem indicar quantos fragmentos de cada) e uma linha de redução agregada
  (`reducaoAfinidade()`) só quando > 0.
- `cartaoModulosFragmento` (`ficha-inventario.component.ts:718-725`) usa
  `custoAquisicaoFragmento` **sem** `aplicarReducaoAfinidade` — o catálogo sempre mostra o custo
  cheio do módulo, mesmo quando o agente já tem Afinidade suficiente para pagar menos.
- Os paineis "Aplicar em..." e "Consumir" não mostram nenhum número de custo antes de confirmar (o
  débito só aparece depois, refletido na Energia).

## Entregáveis

1. **Chips por fragmento, não por módulo único.** Trocar `modulosFragmentosPortados()` (lista de
   módulos únicos) por uma contagem por módulo (ex.: "2× Módulo V", "1× Módulo IV") e mostrar, por
   chip, a afinidade individual que aquele grupo contribui (`valorAfinidadeFragmento(modulo) ×
   quantidade`), para o jogador enxergar a composição da soma, não só o total.
2. **Custo já reduzido no catálogo.** `cartaoModulosFragmento` passa a expor **os dois valores**:
   custo bruto e custo já com `aplicarReducaoAfinidade` aplicado (usando a Afinidade atual do
   agente, que o componente já tem via `listarModulosFragmentosPortados`/`calcularAfinidade`).
   Exibir o reduzido em destaque e o bruto riscado/secundário quando forem diferentes (mesmo padrão
   visual que preço promocional, se existir um token para isso no tema).
3. **Prévia de custo nos paineis de ação.** Os paineis "Aplicar em..." (acoplamento) e "Consumir"
   passam a mostrar o custo de Energia/Energia Máxima **já reduzido** antes de confirmar, não só
   depois — reaproveitando os mesmos cálculos que `confirmarAplicarFragmento`/
   `confirmarConsumirFragmento` já fazem ao debitar, só antecipados para exibição (proibição #26:
   mesma função, não duplicar a conta).
4. Testes de componente cobrindo: catálogo com Afinidade zero (bruto = reduzido, sem destaque) e com
   Afinidade alta (reduzido menor, ambos visíveis); paineis mostrando o custo correto pré-confirmação.

## Critérios de Aceite

- Cada chip de fragmento portado na aba Extras mostra quantidade e afinidade individual, não só o
  módulo.
- Os cards de catálogo de fragmentos mostram o custo já reduzido pela Afinidade atual, com o bruto
  visível quando diferente.
- Os paineis "Aplicar em..." e "Consumir" mostram o custo exato que será debitado antes do jogador
  confirmar.

## Fora de Escopo

- A mecânica de redução em si (`reducaoCustoPorAfinidade`/`aplicarReducaoAfinidade`) — já existe na
  `m3-42`, aqui é só exibição.
- Botão de venda de fragmento na ficha — registrado em `IDEAS.md`, fora desta task.

## Dependências

- `m3-42` (Afinidade/redução), `m3-49` (bloco "Afinidade de Fragmentos" na aba Extras).
