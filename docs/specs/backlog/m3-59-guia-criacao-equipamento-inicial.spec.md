# m3-59-guia-criacao-equipamento-inicial.spec.md

> Task 56 do milestone `m3-ficha-jogador.spec.md`. **Trio do guia de criação (`m3-57`…`m3-59`)** —
> fecha o guia com o passo do kit inicial.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "Informações Adicionais >
> Equipamento Inicial" e "> Dinheiro", e o capítulo "Equipamentos" (peso, categorias,
> modificações). **O documento vence** (proibição #27).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema (proibição #29).

## Objetivo

Fechar o guia com o **Equipamento Inicial**: escolher o kit na loja, dentro dos dois tetos do
documento — **soma até $2500** e **peso até 5** —, para a ficha nascer equipada em vez de com o
inventário vazio.

## Ponto de partida

O catálogo e o motor de compras já existem (`shared/src/regras/compras/`, `m1-05`), a tela pública
de Compras foi entregue na `m1-10` com carrinho persistido (`m1-11`), e o editor de Inventário da
ficha (`m3-14`) já reusa esse carrinho para comprar itens **para dentro** de uma ficha existente —
é esse caminho que o passo reaproveita, e não uma segunda implementação de loja.

**Atenção a uma regra fácil de errar:** o kit inicial é um orçamento **à parte**. O documento dá o
dinheiro inicial (`1000 + 4D4 × 250`) **além** dos itens do kit — logo, os $2500 do kit **não são
descontados** do dinheiro rolado no passo 07. E **não se pode modificar itens** com o dinheiro do
kit.

## Entregáveis

1. **Passo 08 // EQUIPAMENTO INICIAL** no guia, depois de Recursos e antes da Revisão. Reusa o
   componente de compras/carrinho da `m3-14` em modo "kit inicial":
   - **dois medidores** no topo — `$ gasto / 2500` e `peso / 5` —, cada um com estado de estouro;
   - **modificações desabilitadas** no catálogo enquanto o passo está em modo kit;
   - o passo é **pulável** (kit vazio é válido — quem quiser comprar depois usa o dinheiro).
2. **Trava dura com "modo livre"**, coerente com os passos anteriores: com qualquer medidor
   estourado não avança; o "modo livre" (sempre disponível ao mestre) libera.
3. **Os itens escolhidos entram em `dados.inventario`** da ficha criada, no mesmo formato que o
   editor de Inventário produz — **sem** debitar `dados.dinheiro` (orçamento à parte, ver acima).
4. **Revisão (passo 09) mostra o kit** — lista de itens, total gasto e peso — junto do resto do
   resumo.
5. **Mobile**: catálogo e carrinho em coluna única (catálogo com rolagem própria), medidores fixos
   no topo do passo, alvos de toque ≥44px.
6. **Verificação ao vivo** (skill `verify`): criar ficha com kit pelo guia e conferir no Postgres
   que os itens estão em `dados.inventario`, que `dados.dinheiro` **não** foi debitado e que o peso
   carregado bate com o que o Inventário da ficha exibe depois.

## Critérios de Aceite

- Não é possível concluir o passo com mais de $2500 ou mais de 5 de peso (salvo "modo livre").
- O dinheiro da ficha criada é exatamente o do passo 07 (inicial + bônus), **sem** desconto do kit.
- Modificar item está indisponível dentro do passo.
- Pular o passo cria a ficha com inventário vazio, sem travar o guia.
- Os itens aparecem no Inventário da ficha recém-criada exatamente como escolhidos.

## Fora de Escopo

- Gastar o **dinheiro rolado** dentro do guia (compras além do kit) — a ficha já nasce com a tela
  de Compras da `m3-14` disponível; misturar os dois orçamentos no mesmo passo confunde a regra.
- Amplificadores e Fragmentos no kit inicial, salvo se o documento os permitir explicitamente na
  criação.
- Mudanças no motor de compras/catálogo (`shared/regras/compras`) — o passo só o consome.

## Dependências

- `m3-57` (guia, shell e estado) e `m3-58` (ordem dos passos), `m3-14` (compras dentro da ficha +
  carrinho), `m1-05`/`m1-10`/`m1-11` (motor de compras, tela e persistência do carrinho),
  `m3-44` (reorganização do Inventário, se já implementada — o formato dos itens deve seguir a
  versão vigente).
