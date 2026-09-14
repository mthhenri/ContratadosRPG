# criatura-visualizacao-shell-ui34.spec.md

> Task avulsa, pedida em conversa pelo autor: alinhar visualmente a ficha de criatura ao shell que
> `ui-34-ficha-completa-redesenho` deu à ficha de jogador. Desenho aprovado via mockup estático
> (Artifact, antes/depois com callouts numerados) antes desta spec.

## Objetivo

Alinhar o cabeçalho e a coluna de ações de `visualizar-criatura.page`/`CriaturaVisualizacao` ao
mesmo padrão que `ui-34` já deu a `visualizar.page`/`FichaVisualizacao`, e fundir visualmente as
colunas Identidade+Atributos numa só. Conteúdo, campos, fórmulas e regras da criatura não mudam —
só a moldura ao redor deles.

## Entregáveis

1. **`visualizar-criatura.page` (html/ts/scss)** — cabeçalho novo substituindo
   `.ficha-pagina__topo` (ícone voltar solto + kebab): índice `//`, `<h1>` com o nome, nome da
   campanha inline (novo `campanhaNome` signal, buscado como em `visualizar.page.ts`), régua,
   chip de classificação `FICHA-CRT-NNNN` (sobe do componente pra cá) e indicador de persistência
   (mantido). `app-coluna-acoes` lateral com os itens já existentes (Acesso de visualização,
   Ocultar/Exibir ficha, Excluir ficha) mais um novo item "Rolagem oculta" (bindado de fora do
   componente). Menu "⋯" mobile-only duplicando os mesmos itens — mesmo padrão de `visualizar.page`.
2. **`criatura-visualizacao.component` (html/ts/scss)** — remove a barra `.criatura__topo`
   (rótulo "Ficha de Criatura" + régua + chip); o `classificacao` computed sai do componente (a
   página assume o mesmo formato `FICHA-CRT-` + id com 4 dígitos); `rolagemOculta` vira
   `[rolagemOculta]`/`(rolagemOcultaChange)` bindável de fora, mesmo padrão de
   `anotacoesPainelAberto` em `FichaVisualizacao`. Cada cabeçalho de card
   (`.criatura__cartao-cabecalho`) ganha o índice `//` compacto, mesma caixa 22×22px/accent que
   `.ficha-cartao__indice` já tem na ficha de jogador. O cabeçalho do card Identidade ganha dois
   selos só-leitura ao lado da régua — "Ficha visível/oculta" e "Rolagem oculta/pública" — mesmo
   padrão do selo de visibilidade que `FichaVisualizacao` já tem; os toggles de verdade continuam
   na coluna de ações da página (item 1).
3. **Colunas Identidade + Atributos fundidas** numa única coluna (largura somada das duas
   antigas), com Atributos empilhado abaixo de Identidade em vez de ao lado. A coluna Status
   (abas Geral/Descrição/Ataques/Habilidades) não muda de lugar nem de conteúdo. Com a largura
   maior, cada grupo de atributos (Físico/Mental) passa a caber numa linha de 5 — comportamento já
   existente via `@container` no card de Atributos, sem CSS novo de breakpoint.
4. **`docs/design/examples/README.md`** — nota na seção "Excluído de propósito" registrando que o
   cabeçalho/moldura de `visualizar-criatura.page`/`CriaturaVisualizacao` passou a seguir o padrão
   `ui-34` a partir desta task, divergindo do mockup mantido à mão (`ficha-de-criatura.html`); o
   mockup continua sendo a fonte pro conteúdo interno dos cards, não pro cabeçalho. Sem reescrever
   o mockup nesta task.

## Critérios de Aceite

- `npm run test --workspace=frontend` e `npm run lint --workspace=frontend` verdes (suíte
  completa + foco em `criatura-visualizacao`/`visualizar-criatura`).
- Gate visual (`verify`) em `1920×1080` e `360×800`, análogo aprovado `visualizar.page` +
  `FichaVisualizacao` (ui-34): cabeçalho com índice/campanha, coluna de ações expandida/retraída/
  barra mobile, índice nos cards, selos de estado na Identidade, fusão de colunas — sem overflow,
  sem regressão nos demais estados (edição de atributos, deslocamento indeterminado, criatura
  oculta/revelada).
- Estados percorridos: dono/mestre (ajustável) e visualizador com acesso concedido (só-leitura),
  com campanha (`/campanhas/:campanhaId/criatura/:id`) e solta (`/fichas/criatura/:id`).

## Fora de Escopo

- Card de criatura na visão de mestre da campanha (`EspectadorFichaCard`/grid de Criaturas) —
  fica para uma task futura, combinada com o autor.
- Qualquer mudança de regra, fórmula ou campo novo de criatura — puramente moldura/apresentação.
- Reescrever ou regenerar o mockup `ficha-de-criatura.html` — só registrar a divergência no
  `README.md` de `examples/`.
- Layout interno de cada aba (Geral/Descrição/Ataques/Habilidades) — não muda.

## Dependências

`ui-34-ficha-completa-redesenho` (spec em `docs/specs/done/`) — análogo aprovado, cabeçalho e
coluna de ações replicados ponto a ponto de lá.
