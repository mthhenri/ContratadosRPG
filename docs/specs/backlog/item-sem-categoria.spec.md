# item-sem-categoria.spec.md

> **Task avulsa (pedido direto do autor, 2026-08-25), não é feature de milestone.** O número/slot
> definitivo (`mN-NN`) fica a critério do autor na revisão de backlog.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Ícone novo é glifo monocromático (`stroke:
> currentColor`) no componente `Icone` — nunca emoji cru (proibição #29).

## Objetivo

Dar ao item **custom** uma categoria genérica — `SEM_CATEGORIA` — para o que não se encaixa em
nenhuma categoria mecânica do catálogo (arma, proteção, munição, etc.): uma modificação solta que o
mestre quer registrar como item, um papel/documento importante, ou qualquer objeto puramente
narrativo. Hoje o formulário de item custom (ficha e esquadrão) só oferece as categorias reais do
catálogo — para registrar algo assim, o jogador/mestre precisa escolher uma categoria mecânica que
não bate com o item (normalmente `OPERACIONAL`, o padrão do form), o que é uma mentira estrutural: a
categoria não descreve o item, só empresta um bucket que também não é modificável nem tem dano.

**`SEM_CATEGORIA` é uma categoria de sistema, não do livro de regras.** Diferente das demais
entradas de `ItemCategoriaEnum` (cada uma nomeia um capítulo real de "Equipamentos" em
`docs/core/sistema-v4.1.0.md`), esta não tem fonte no documento — é um bucket organizacional puro,
sem efeito mecânico algum, e nunca ganha item de catálogo (só existe via item custom). Isso não
contraria a autoridade do documento (não altera fórmula nem categoria existente): só acrescenta uma
opção de organização que o sistema de regras não precisa conhecer.

## Estado atual (o que existe)

- **Enum.** `ItemCategoriaEnum` (`shared/src/enums/item-categoria.enum.ts`) tem 12 valores, todos
  citando um capítulo de `docs/core/sistema-v4.1.0.md` no comentário da fonte.
- **Catálogo.** `CATALOGO_ITENS` (`shared/src/regras/compras/catalogo.dados.ts:76`) é
  `Record<ItemCategoriaEnum, readonly ItemCatalogo[]>` — toda categoria precisa de uma entrada,
  mesmo vazia. `AMPLIFICADOR`/`FRAGMENTO_CONSTRUTOR`/`FRAGMENTO_POTENCIALIZADOR` já são `[]` com
  comentário explicando por quê (linhas 232-235) — mesmo padrão a seguir.
- **Rótulo/ícone.** `CATALOGO_CATEGORIAS` (`shared/src/regras/compras/compras.dados.ts:52-65`) dá a
  cada categoria um `{ categoria, rotulo, icone }` — o `icone` aqui é emoji cru (`🗡️`, `💊`…) e é
  campo obrigatório da interface, mas **não é renderizado em lugar nenhum do frontend hoje**
  (confirmado por busca: nenhum template lê `categoria.icone`) — os três componentes (ficha,
  esquadrão, calculadora) sempre traduzem para o glifo do tema via seus próprios `ICONES_CATEGORIA`
  locais (ver abaixo), nunca o emoji do catálogo. O campo só precisa de um valor não vazio para
  satisfazer o tipo e o teste de coerência abaixo. Um teste de coerência
  (`shared/src/regras/compras/compras.spec.ts:758-765`) já garante que **toda** entrada de
  `ItemCategoriaEnum` tem uma linha em `CATALOGO_CATEGORIAS` com rótulo/ícone não vazios — falha
  sozinho se a categoria nova ficar de fora.
- **Teste de coerência do catálogo vazio.** `compras.spec.ts:767-786` tem uma lista `semCatalogo`
  (linhas 770-774, hoje `AMPLIFICADOR`/`FRAGMENTO_CONSTRUTOR`/`FRAGMENTO_POTENCIALIZADOR`) que
  espera `CATALOGO_ITENS[categoria]` vazio; qualquer categoria **fora** dessa lista é obrigada a ter
  pelo menos 1 item (linha 781) — a categoria nova precisa entrar nessa lista, senão o teste falha
  esperando um item de catálogo que nunca vai existir.
- **Nenhum switch exaustivo sobre a categoria.** `shared/src/regras/compras/compras.ts` só compara
  categoria por categoria com `===` (confirmado por leitura completa do arquivo) — uma categoria
  nova não quebra nenhum cálculo de peso/custo/stat por omissão; ela só participa das regras em que
  for explicitamente incluída.
- **Comportamento por categoria é duplicado em 3 arquivos de frontend** (constantes locais, cada uma
  com o mesmo padrão de comentário "Categorias que..."):
  - `frontend/.../ficha-inventario/ficha-inventario.component.ts`: `CATEGORIAS_EMPILHAVEIS` (105-108,
    hoje só Operacional/Medicinal), `ORDEM_CATEGORIAS_LISTA` (117-125, ordem da lista principal),
    `CATEGORIAS_NAO_MODIFICAVEIS` (133-137, hoje Operacional/Medicinal/Fragmento Potencializador),
    `CATEGORIAS_COM_DANO`/`CATEGORIAS_COM_RESISTENCIA`/`CATEGORIAS_COM_EMPRESTIMO`/
    `CATEGORIAS_FRAGMENTO`/`CATEGORIAS_EMPRESTAVEIS` (139-173, nenhuma se aplica à categoria nova).
  - `frontend/.../calculadora/paginas/compras/compras.page.ts`: mesmo conjunto de constantes,
    duplicado localmente (`CATEGORIAS_EMPILHAVEIS` 182-185, `CATEGORIAS_NAO_MODIFICAVEIS` 187-191,
    mais as `COM_DANO`/`COM_RESISTENCIA`/`COM_EMPRESTIMO`/`FRAGMENTO` 193-218).
  - `frontend/.../campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.ts`: **não**
    tem essas constantes — todo item do inventário de esquadrão já usa `quantidade` uniformemente,
    sem distinção "empilhável"/"não modificável" por categoria (o esquadrão não tem painel de
    modificação de item; ver fora de escopo do `preservar-modificacoes-inventario-esquadrao.spec.md`).
- **Abas do catálogo (navegação de compra) não filtram por "tem item".** Três componentes montam a
  lista de abas a partir de `CATALOGO_CATEGORIAS` excluindo só o que já sabem ser vazio hoje:
  - `ficha-inventario.component.ts:548-551` — `categorias` exclui `CATEGORIAS_FRAGMENTO`.
  - `inventario-esquadrao.component.ts:55-58` — `categorias` exclui `AMPLIFICADOR` +
    `FRAGMENTO_CONSTRUTOR`/`FRAGMENTO_POTENCIALIZADOR`; **linha 59, `categoriasItem = this.categorias`
    é a mesma referência** — usada tanto pelas abas do catálogo quanto pelo seletor de categoria do
    item custom.
  - `compras.page.ts:322-324` — `categorias` exclui `CATEGORIAS_FRAGMENTO`.

  Nenhum desses três exclui automaticamente uma categoria vazia — sem ajuste, `SEM_CATEGORIA`
  apareceria como aba clicável sempre vazia nos três.
  Já `guia-equipamento-loja.component.ts:76` monta suas abas com
  `CATALOGO_CATEGORIAS.filter((c) => (CATALOGO_ITENS[c.categoria]?.length ?? 0) > 0)` — filtra
  **qualquer** categoria vazia automaticamente; não precisa de nenhum ajuste (não tem criação de
  item custom, só navegação do catálogo).
- **Seletor de categoria do item custom** (formulário "criar item custom", campo `categoria`):
  - `ficha-inventario.component.ts:604-607` — `categoriasItem` exclui só `AMPLIFICADOR`. Uma
    categoria nova aparece aqui automaticamente, sem ajuste.
  - `compras.page.ts:397-400` — mesmo filtro, mesmo comportamento automático.
  - `inventario-esquadrao.component.ts:59` — **não existe filtro próprio**: é a mesma referência de
    `categorias` (abas do catálogo). Excluir a categoria nova das abas (necessário, ver acima) também
    a esconde daqui — as duas listas precisam ser separadas.
- **Ícone.** `IconeNome` (`frontend/src/app/shared/icone/icone.component.ts:25-87`) é a union de
  nomes de glifo; o SVG de cada um vive em `icone.component.html` (`@case ('nome') { <path .../> }`),
  recortado/adaptado da Tabler Icons (MIT, tabler.io/icons) — ver comentário de `operacional`
  (linhas 94-96) como exemplo do padrão de atribuição. `ICONES_CATEGORIA` existe **duplicado** em
  `ficha-inventario.component.ts:89-104`, `inventario-esquadrao.component.ts:15-27` e
  `calculadora/rotulos.ts:51-64` (`Record<ItemCategoriaEnum, IconeNome>` — TypeScript já obriga as
  três a cobrir todo valor do enum, então o compilador aponta os três pontos que faltam ajustar).
- **Grade dupla empilhável na ficha.** `itensListaMedicinalOperacional`
  (`ficha-inventario.component.ts:1120-1126`) já é só um `computed` sem cabeçalho textual na UI —
  confirmado em `ficha-inventario.component.html:1462-1466`, que renderiza a grade
  (`.ficha-inv__grade-medop`) sem nenhum rótulo de seção visível. Renomear o comentário/nome da
  categoria descrita ali é cosmético no código, sem impacto visual.

## Entregáveis

### Contrato (`shared`)

1. `ItemCategoriaEnum` ganha `SEM_CATEGORIA = 'SEM_CATEGORIA'`, com comentário deixando explícito
   que é categoria de sistema (sem capítulo correspondente no documento), destinada só a item
   custom.
2. `CATALOGO_ITENS` (`catalogo.dados.ts`) ganha `[ItemCategoriaEnum.SEM_CATEGORIA]: []`, com o mesmo
   comentário-padrão das demais categorias vazias (linhas 232-235) explicando que é intencional.
3. `CATALOGO_CATEGORIAS` (`compras.dados.ts`) ganha
   `{ categoria: ItemCategoriaEnum.SEM_CATEGORIA, rotulo: 'Sem Categoria', icone: '❔' }` — o emoji
   só precisa existir para satisfazer o tipo/teste de coerência (não é renderizado, ver Estado
   Atual).
4. `compras.spec.ts:770-774` — `SEM_CATEGORIA` entra na lista `semCatalogo`, ao lado de
   `AMPLIFICADOR`/`FRAGMENTO_CONSTRUTOR`/`FRAGMENTO_POTENCIALIZADOR`.

### Ícone

5. Novo `IconeNome` (`icone.component.ts`) — nome sugerido `'sem-categoria'` — glifo monocromático
   em `icone.component.html`, mesmo padrão de recorte da Tabler Icons (ex.: ícone "tag"/etiqueta,
   coerente com "categoria genérica"). `ICONES_CATEGORIA` ganha a entrada nova nos três arquivos que
   o declaram (`ficha-inventario.component.ts`, `inventario-esquadrao.component.ts`,
   `calculadora/rotulos.ts`) — o TypeScript aponta os três por erro de tipo até serem completados.

### Comportamento mecânico (ficha + calculadora)

6. `ficha-inventario.component.ts`: `SEM_CATEGORIA` entra em `CATEGORIAS_EMPILHAVEIS` (105-108) —
   item empilha por quantidade e cai na grade dupla junto de Medicinal/Operacional — e em
   `CATEGORIAS_NAO_MODIFICAVEIS` (133-137) — sem painel "Modificar", sem dano/resistência/
   empréstimo (fica fora de `CATEGORIAS_COM_DANO`/`COM_RESISTENCIA`/`COM_EMPRESTIMO`/`FRAGMENTO`/
   `EMPRESTAVEIS`, sem entrar nelas). Não entra em `ORDEM_CATEGORIAS_LISTA` (117-125) — não se aplica,
   já que é empilhável e vai para a grade, não para a lista principal.
7. Comentário de `itensListaMedicinalOperacional` (1120-1126) e do bloco HTML equivalente
   (`ficha-inventario.component.html:1462-1466`) deixa de dizer "só Medicinal/Operacional" —
   passa a descrever "categorias empilháveis" genericamente, já que agora inclui `SEM_CATEGORIA`.
8. `compras.page.ts` (calculadora pública): mesmo ajuste do item 6 — `SEM_CATEGORIA` em
   `CATEGORIAS_EMPILHAVEIS` (182-185) e `CATEGORIAS_NAO_MODIFICAVEIS` (187-191).
9. Inventário de esquadrão (`inventario-esquadrao.component.ts`) não precisa de ajuste equivalente —
   já não distingue categoria empilhável/modificável (item 5 do "Estado atual atual").

### Abas do catálogo vs. seletor de item custom

10. `ficha-inventario.component.ts:548-551` — `categorias` (abas do catálogo) exclui também
    `ItemCategoriaEnum.SEM_CATEGORIA`, ao lado de `CATEGORIAS_FRAGMENTO`. `categoriasItem` (604-607,
    seletor do form de item custom) não muda — já inclui a categoria nova automaticamente (só
    exclui `AMPLIFICADOR`).
11. `compras.page.ts:322-324` — mesmo ajuste do item 10 (`categorias` exclui `SEM_CATEGORIA` também;
    `categoriasItem`, 397-400, não muda).
12. `inventario-esquadrao.component.ts` — separar `categoriasItem` de `categorias` (hoje a mesma
    referência, linha 59): `categorias` (abas do catálogo, 55-58) ganha `SEM_CATEGORIA` na lista de
    exclusão; `categoriasItem` vira sua própria constante — mesmo filtro-base de `categorias` (exclui
    `AMPLIFICADOR`/`FRAGMENTO_CONSTRUTOR`/`FRAGMENTO_POTENCIALIZADOR`) **sem** excluir
    `SEM_CATEGORIA`, para a categoria continuar disponível no seletor de item custom.
13. `guia-equipamento-loja.component.ts` — nenhuma mudança (já filtra categoria vazia
    automaticamente, e não tem criação de item custom).

## Critérios de Aceite

- Criar um item custom na ficha do agente oferece "Sem Categoria" no seletor; salvar cria um item
  empilhável (quantidade ajustável), que aparece na grade dupla junto de itens Medicinal/Operacional,
  sem botão "Modificar" e sem campos de Dano/Resistência/"encaixa em" no form de criação.
- O mesmo vale no inventário de esquadrão: "Sem Categoria" aparece no seletor de item custom.
- Em nenhum dos três catálogos navegáveis (ficha, esquadrão, calculadora pública "Compras") "Sem
  Categoria" aparece como aba — as abas continuam só com categorias que têm item de verdade.
- No guia de criação (`GuiaEquipamentoLoja`), nada muda — sem aba nova, sem opção de item custom.
- `rotuloCategoria`/`ICONES_CATEGORIA` mostram "Sem Categoria" com o ícone novo em qualquer card que
  tenha um item dessa categoria, nos três lugares (ficha, esquadrão, calculadora).
- `shared`: `compras.spec.ts` (teste de coerência de `CATALOGO_CATEGORIAS` e o de catálogo
  vazio/`semCatalogo`) passa sem alteração de expectativa além do já listado nos Entregáveis; suíte
  completa verde.
- `frontend`: build e lint limpos nos três componentes tocados (TypeScript aponta sozinho qualquer
  `Record<ItemCategoriaEnum, ...>` esquecido); suíte completa verde.
- Gate visual (skill `verify`, `1920×1080` e `360×800`): seletor de categoria do form de item custom
  mostra "Sem Categoria" sem quebrar layout (ficha e esquadrão); o ícone novo renderiza corretamente
  no card de um item criado com essa categoria; nenhuma aba vazia "Sem Categoria" aparece nos
  catálogos de compra.

## Fora de Escopo

- Qualquer item de **catálogo** (real, comprável) na categoria `SEM_CATEGORIA` — ela existe só para
  item custom, por definição (ver Objetivo).
- Migration de banco — `ItemCategoriaEnum` é conteúdo de JSONB (`ficha.dados`/`campanha.inventario`),
  não vira tabela `tipo_*` (§10.3/CONVENTIONS.md — "Enums de CONTEÚDO DE JOGO").
- Qualquer alteração em `docs/core/sistema-v4.1.0.md` — a categoria é de sistema, não de regra de
  jogo; não há capítulo do documento para atualizar ou criar.
- Modificação de item em `SEM_CATEGORIA` — permanece sempre não modificável (item 6/8).
- Qualquer mudança em como o inventário de esquadrão trata quantidade/empilhamento em geral — só o
  seletor de categoria do item custom é tocado ali (item 12).

## Dependências

- `shared/src/enums/item-categoria.enum.ts` (enum).
- `shared/src/regras/compras/catalogo.dados.ts` (`CATALOGO_ITENS`), `compras.dados.ts`
  (`CATALOGO_CATEGORIAS`), `compras.spec.ts` (testes de coerência, linhas 758-786).
- `frontend/src/app/shared/icone/icone.component.ts` (`IconeNome`) e `.html` (glifo).
- `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts`
  (constantes `CATEGORIAS_*`, `ICONES_CATEGORIA`, `categorias`/`categoriasItem`,
  `itensListaMedicinalOperacional`) e `.html` (comentário da grade dupla).
- `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/
  inventario-esquadrao.component.ts` (`ICONES_CATEGORIA`, `categorias`/`categoriasItem`).
- `frontend/src/app/modules/calculadora/paginas/compras/compras.page.ts` (constantes `CATEGORIAS_*`,
  `categorias`/`categoriasItem`) e `frontend/src/app/modules/calculadora/rotulos.ts`
  (`ICONES_CATEGORIA`).
- `frontend/src/app/modules/ficha/componentes/guia-equipamento-loja/guia-equipamento-loja.component.ts`
  (referência de que já não precisa de ajuste — filtro automático por "tem item").
