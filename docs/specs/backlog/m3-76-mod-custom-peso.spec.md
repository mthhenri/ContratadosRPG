# m3-76-mod-custom-peso.spec.md

> Ajuste pós-milestone do M3 — Inventário. Pedido direto do autor: "nas mods custom, adicionar
> definição de peso da mod".

## Regra do sistema

Fonte: `docs/core/sistema-v4.1.0.md:958` —

> "Modificações são melhorias que ampliam as funções do equipamento. Cada modificação **acrescenta
> +0,2 de peso, salvo indicação contrária em sua descrição**. O custo para aplicar as modificações é
> fixo: $ 750 por modificação, independentemente da quantidade já aplicada no item."

A regra já prevê explicitamente uma exceção ("salvo indicação contrária") — é o gancho para uma mod
**custom** (que não existe no catálogo e não tem uma "descrição" oficial de peso) declarar seu
próprio peso em vez de herdar o padrão de 0,2.

## Estado atual

- Toda modificação do catálogo pode ter `peso?: number` próprio (`ModificacaoDados`,
  `shared/src/regras/compras/compras.dados.ts:118-126`); sem valor definido, usa
  `PESO_MODIFICACAO_PADRAO = 0.2` (`compras.dados.ts:16`).
- `obterPesoModificacao` (`shared/src/regras/compras/compras.ts:320-329`) busca a modificação pelo
  **nome** no catálogo; se não encontrar (como acontece com qualquer mod custom, cujo nome é livre),
  cai no padrão de 0,2 por empilhamento.
- O DTO de mod **aplicada a um item** (`ModificacaoAplicadaDto`,
  `shared/src/regras/compras/compras.dtos.ts:53-92`) não tem campo `peso` — o peso só existe na
  definição de catálogo, nunca na instância.
- O formulário de mod custom no frontend
  (`frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts:856-867`)
  tem `nome`, `empilhamentoMaximo`, `ignoraLimiteTotal`, `ignoraLimiteProprio`, `descricao` e
  `efeitos` — sem campo de peso. Comentário existente no código
  (`ficha-inventario.component.ts:2394-2396`) já documenta a decisão atual: *"Sem definição de
  catálogo, o motor cobra o custo/peso padrão da categoria"*.
- O peso total do carrinho/inventário é somado em
  `calcularTotaisCarrinho` (`shared/src/regras/compras/compras.ts:688-732`, linhas 716-721) e
  replicado em `listarSubInventarios` (mesmo arquivo, ~linha 763) para itens dentro de containers.

## Entregáveis

1. `ModificacaoAplicadaDto` (`shared/src/regras/compras/compras.dtos.ts`) ganha um campo
   `pesoCustom?: number` (opcional — só relevante para mods sem correspondência no catálogo).
2. `obterPesoModificacao` passa a aceitar/consultar esse valor: quando a modificação não é
   encontrada no catálogo (é custom) **e** `pesoCustom` está definido, usa `pesoCustom`; caso
   contrário mantém o comportamento atual (peso do catálogo, ou `PESO_MODIFICACAO_PADRAO` como
   fallback). Uma mod do catálogo real ignora `pesoCustom` mesmo se vier preenchido — o peso do
   catálogo é sempre a fonte de verdade para mods conhecidas.
3. `calcularTotaisCarrinho` e `listarSubInventarios` propagam `pesoCustom` ao chamar
   `obterPesoModificacao` (hoje já passam `{ item, modificacao: nome, origemFragmento }`; passam a
   incluir o novo campo quando presente na instância aplicada).
4. Frontend: `modCustomForm` (`ficha-inventario.component.ts`) ganha um campo numérico "Peso da
   modificação" (opcional, default vazio = usa o padrão de 0,2 do sistema, coerente com a regra
   citada). O formulário deve deixar claro, no texto de ajuda, que o padrão do sistema é 0,2 por
   modificação e que o campo serve para declarar uma exceção descrita.
5. Fragmentos Construtor/Potencializador continuam pesando 0 como hoje (não usam este campo) — a
   mudança é só para o caminho de mod custom "solta".

## Critérios de Aceite

- Criar uma mod custom sem preencher peso: o item pesa exatamente como hoje (0,2 por
  empilhamento, ou o padrão da categoria vigente).
- Criar uma mod custom com peso `0,5`: o peso total do item/inventário reflete 0,5 por
  empilhamento daquela mod, não 0,2.
- Uma modificação do catálogo real continua usando o peso definido no catálogo, mesmo que por
  coincidência de implementação `pesoCustom` estivesse presente na instância (não deve acontecer
  pela UI, mas o motor não deve considerar esse campo para mods reconhecidas).
- Sub-inventários (Pochete/Bolso de Corpo) somam o peso customizado da mesma forma que o inventário
  principal.
- `npm run test -w shared` e `npm run test -w frontend` verdes, com teste de regressão cobrindo peso
  custom informado e não informado.
- Verificação pela skill `verify`: adicionar uma mod custom com peso definido a um item e confirmar
  visualmente que o peso total do inventário muda de acordo.

## Fora de Escopo

- Custo em dinheiro da mod custom (a regra já fixa $750 por modificação, sem exceção documentada
  para custo — só peso tem a cláusula "salvo indicação contrária").
- Qualquer alteração no peso de modificações do catálogo existente.

## Dependências

`m3-14` (editor de inventário), `m3-44` (sub-inventários).
