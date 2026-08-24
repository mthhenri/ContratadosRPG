# descricao-modificacoes-item-inventario.spec.md

> **Task avulsa (pedido do autor, 2026-08-16), não é feature de milestone.** O número/slot
> definitivo (`mN-NN`) fica a critério do autor na revisão de backlog. Nasce de `docs/context/IDEAS.md`
> `I-021`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Dar a cada item modificável do inventário de ficha uma **descrição textual curta**, composta a
partir das modificações efetivamente aplicadas, exibida **acima** da contagem de cenas/munição do
item. Ex.: um item de Munição com a modificação "Calibre" mostraria algo como
`Calibre: +1 dado de dano da arma`. Hoje entender o efeito de uma modificação exige abrir o painel
de modificação e ler o chip individual — não existe uma frase de resumo no nível do item.

## Estado atual (o que existe)

- `montarItemInventario` (`frontend/src/app/modules/ficha/componentes/ficha-inventario/
  ficha-inventario.component.ts:2614`) já monta, por modificação ativa, um `ModAtivaVM.descricao`
  (linha ~2684) via `descreverEfeitosModificacao(modificacao.efeitos)` (`shared/regras/compras`)
  concatenado com a nota livre (`modificacao.descricao`), separados por `" — "`. Esse texto só é
  usado no **chip individual** de cada modificação (dentro do painel de modificações do item), não
  no corpo do card.
- `descreverEfeitosModificacao` (`shared/src/regras/compras/compras.ts:178`) já converte uma lista
  de `ModificacaoEfeitoDto` num texto único, juntando os efeitos com `" · "` — é a peça pura já
  testada que também gera o texto por modificação.
- No template (`ficha-inventario.component.html:910`-`917`), o card do item mostra, nesta ordem:
  `item.stat` → `item.descricao` (descrição livre do item custom) → `item.bonusMunicaoTexto` (só
  Munição Construtor, `m3-65`) → `item.contagemMunicao` (linha 918, cenas/munição). Não existe hoje
  nenhuma linha de resumo das modificações **do item como um todo**.
- `ItemInventarioVM` não tem nenhum campo agregado de "descrição das modificações" — só
  `modsAtivas: ModAtivaVM[]`, cada uma com sua própria `descricao`.

## Entregáveis

1. **View model.** `montarItemInventario` ganha um campo novo, ex. `descricaoModificacoesTexto:
   string | null`, calculado a partir de `item.modificacoes` (não de `modsAtivas`, que já existe só
   para o painel): para cada modificação com efeito/nota renderizável, compor
   `"${modificacao.nome}: ${descreverEfeitosModificacao(modificacao.efeitos) || modificacao.descricao}"`;
   `null` quando o item não tem nenhuma modificação com texto a mostrar.
2. **Composição com mais de uma modificação.** Juntar as entradas de cada modificação com `"; "`
   (ponto e vírgula) — distinto do `" · "` que `descreverEfeitosModificacao` já usa **dentro** de
   uma única modificação para separar efeitos múltiplos, preservando a hierarquia visual
   modificação → efeitos. Esta é uma proposta de formato; validar com o autor se o resultado ficar
   longo demais para o card (ex.: 3+ modificações com efeito).
3. **Template.** Novo bloco em `ficha-inventario.component.html`, posicionado **acima** de
   `item.contagemMunicao` (antes da linha 918) e depois de `item.bonusMunicaoTexto` — mesma classe
   de texto (`ficha-inv__item-stat` ou uma nova modificadora, conforme a leitura visual pedir),
   renderizado só quando `item.descricaoModificacoesTexto` não é `null`.
4. Nenhuma mudança de contrato (`shared`) — é derivação de exibição, 100% frontend, sobre um dado
   (`ModificacaoAplicadaDto.efeitos`/`.descricao`) que já existe.

## Critérios de Aceite

- Um item com uma modificação de efeito estruturado (ex.: Calibre em Munição) mostra a linha
  `Calibre: +1 dado de dano da arma` (ou texto equivalente gerado por `descreverEfeitosModificacao`)
  acima da contagem de munição/cenas.
- Um item com **duas ou mais** modificações mostra as duas descrições compostas, separadas
  conforme o formato escolhido no Entregável 2, sem quebrar o layout do card em `1920×1080` nem em
  `360×800`.
- Um item **sem** modificação, ou com modificação puramente cosmética (sem `efeitos` nem
  `descricao`), não mostra a linha nova (sem espaço vazio no card).
- Nenhuma mudança de comportamento no chip de modificação já existente no painel (`ModAtivaVM`).
- `shared` sem mudança de suíte; `frontend`: suíte verde (novo caso cobrindo item com 1 e com 2+
  modificações), lint limpo.
- Gate visual (skill `verify`, `1920×1080` e `360×800`): a nova linha não empurra o layout do card
  nem cria overflow, e lê-se claramente acima da contagem de munição/cenas.

## Fora de Escopo

- Mudar `descreverEfeitosModificacao` ou o formato do chip individual de modificação
  (`ModAtivaVM.descricao`) — só um novo consumidor agregado no nível do item.
- Qualquer edição de modificação a partir desta nova linha (é só exibição).
- Estender esse resumo a outros inventários (ex.: inventário de esquadrão) — fora do pedido
  original; ver `docs/context/IDEAS.md` `I-020` para a frente de modificações no inventário de
  esquadrão, que é independente.

## Dependências

- `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts`
  (`montarItemInventario`, `ItemInventarioVM`) e `.html` (bloco de exibição do item).
- `shared/src/regras/compras/compras.ts` (`descreverEfeitosModificacao`, já existente, sem alteração
  esperada).
