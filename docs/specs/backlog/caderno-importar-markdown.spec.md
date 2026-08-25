# caderno-importar-markdown.spec.md

> **Task avulsa (pedido direto do autor, 2026-08-25), não é feature de milestone.** O número/slot
> definitivo (`mN-NN`) fica a critério do autor na revisão de backlog.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Ícone novo é glifo monocromático (`stroke:
> currentColor`) no componente `Icone` — nunca emoji cru (proibição #29).
>
> **Componente análogo aprovado (obrigatório para a parte visual):** a tabela `.calc-tabela` /
> `.calc-tabela-wrap` de `frontend/src/app/modules/calculadora/paginas/patente/patente.page.scss`
> (linhas 184-220) e `dt.page.scss` — é a única tabela de dados aprovada do produto (mono 13px,
> cabeçalho uppercase 10px em `--text-mute`, linha separada por `--border`, wrapper com
> `overflow-x: auto`). O botão de importar segue `.caderno__acao-icone`
> (`caderno-flutuante.component.scss:106`), o mesmo do "Criar página" que ficará ao lado dele.

## Objetivo

Permitir **importar um arquivo Markdown para dentro do Caderno da campanha**: o autor escolhe um
`.md`, o nome do arquivo vira o título da página e o conteúdo entra formatado no editor, já
persistido como uma página nova do próprio caderno.

**O arquivo em si nunca é enviado nem armazenado.** A leitura é 100% client-side
(`arquivo.text()`); só o **texto normalizado** resultante vai ao backend, como `conteudoMarkdown` de
um `POST` no mesmo endpoint que já cria página manualmente — sem upload, sem `FormData`, sem blob em
disco/S3, sem endpoint ou migration novos. É consequência direta da regra já documentada do Caderno
("páginas com título e Markdown, sem imagens ou anexos"): ele não tem conceito de arquivo anexado.

Junto disso — e como pré-requisito de fidelidade, não como extra —, o editor do Caderno passa a
**suportar tabelas GFM** (`| a | b |`). Hoje ele não suporta: um arquivo com tabela (o caso mais
comum de anotação de mesa: tabela de pistas, de NPCs, de loot) seria importado como um bloco de
texto com barras verticais, não como tabela. Importar sem tabela seria entregar meia funcionalidade.

## Estado atual (o que existe)

### Editor e formato

- **O editor é Milkdown com preset `commonmark` apenas.**
  `frontend/src/app/modules/pagina-caderno/editor-markdown.component.ts:21-32` importa só de
  `@milkdown/kit/preset/commonmark`, e a montagem do editor (`:103`) faz `.use(commonmark)
  .use(listener)`. Nenhum preset GFM está ativo.
- **Consequência direta:** sem GFM não existe `tableSchema` no schema do ProseMirror; uma tabela em
  pipes vira um **parágrafo** com as barras literais. Não é "tabela feia" — não é tabela: não
  navega por célula, não alinha, não tem cabeçalho.
- **A dependência já está instalada.** `@milkdown/kit@^7.22.1` (`frontend/package.json:25`) traz
  `@milkdown/preset-gfm@7.22.1` como dependência própria, e o mapa de exports do kit expõe
  `./preset/gfm`, `./prose/tables` e `./component/table-block`. **Nenhum pacote novo é necessário** —
  confirmar antes de implementar rodando `npm ls @milkdown/preset-gfm` no workspace do frontend.
- **O que o preset `gfm` traz junto** (verificado no fonte de `@milkdown/preset-gfm@7.22.1`):
  - `remarkGFMPlugin` (parse/serialize), `tableEditingPlugin` (seleção de célula do
    prosemirror-tables), `keepTableAlignPlugin`, `autoInsertSpanPlugin` (correção de IME no Safari);
  - `tableKeymap`: `Tab`/`Shift-Tab` navegam entre células (prioridade 100, só dentro de tabela),
    `Mod-Enter`/`Enter` saem da tabela;
  - `insertTableInputRule`: digitar `|3x3| ` cria uma tabela 3×3;
  - comandos: `insertTableCommand({ row, col })`, `addRowBeforeCommand`, `addRowAfterCommand`,
    `addColBeforeCommand`, `addColAfterCommand`, `selectRowCommand`, `selectColCommand`,
    `deleteSelectedCellsCommand`, `setAlignCommand`;
  - **`columnResizingPlugin` NÃO entra no preset** (é exportado à parte) — redimensionamento de
    coluna continua desligado, e é o comportamento desejado: largura de coluna não existe em
    Markdown, então seria estado que não sobrevive ao salvamento;
  - além de tabela, o preset ativa **strikethrough (`~~texto~~`), task list (`- [ ]`) e footnote** —
    efeito colateral aceito e registrado (ver Decisões).
- **`deleteSelectedCellsCommand` exige uma `CellSelection`** (fonte: `command.ts`, "if (!(selection
  instanceof CellSelection)) return false") — um botão de barra que só tem cursor numa célula
  precisa primeiro chamar `selectRowCommand`/`selectColCommand` com o índice da linha/coluna atual.
- **A barra de formatação é achatada e local.** `editor-markdown.component.ts:35-44` define o union
  `FormatoMarkdown`, `:71-87` mapeia cada formato a um `callCommand`, e `:126-138` renderiza os
  botões. Toda a integração com Milkdown está atrás do `EDITOR_MARKDOWN_FACTORY`
  (`:65-119`) — token injetável, **mockado em todos os testes** (`editor-markdown.component.spec.ts`,
  `caderno-flutuante.component.spec.ts:60-70`). Ou seja: **nenhum teste unitário exercita o Milkdown
  real**; round-trip de tabela só é comprovável na verificação ao vivo.
- **Nenhum CSS do Milkdown/prosemirror-tables é importado** (nem em `styles.scss` nem em
  `angular.json`): todo o visual do editor é escrito à mão com tokens em
  `editor-markdown.component.scss` (`:66-118`, via `::ng-deep .milkdown .editor`). O CSS do
  `prosemirror-tables` usa cores fixas — **não deve ser importado**; a tabela é estilizada com
  tokens, como o resto.
- **Limite de conteúdo duplicado no editor.** `editor-markdown.component.ts:46` define
  `LIMITE_MARKDOWN = 100_000` como constante local e **trunca** o texto no `markdownUpdated` quando
  passa; o mesmo número é o `PAGINA_CADERNO_CONTEUDO_MAXIMO` de
  `shared/src/validators/pagina-caderno.validators.ts:3` (fonte de verdade, usada pelo backend em
  `pagina-caderno.service.ts:208-212`). O título máximo é `PAGINA_CADERNO_TITULO_MAXIMO = 120`
  (mesmo arquivo), replicado como `maxlength="120"` no input
  (`caderno-flutuante.component.html:243-249`).
- **`markdown-seguro.ts` está órfão.** `renderizarMarkdownSeguro` (`marked` + `DomSanitizer`,
  remove HTML e imagens, só aceita `http/https/mailto` em links) não é chamado por nenhum
  componente — só pelo próprio `markdown-seguro.spec.ts`. É resíduo do modelo anterior (fonte +
  prévia), anterior ao Milkdown. Vale como **registro da regra de produto** ("caderno sem imagens
  nem HTML"), não como caminho de código a reutilizar.
- **HTML cru é inerte no editor.** `htmlSchema` do preset commonmark monta o nó com
  `span.textContent = value` — HTML importado aparece como **texto literal**, não é renderizado.
  Portanto não há vetor de XSS aqui (importante porque o mestre lê o caderno dos jogadores), e não
  há motivo de segurança para removê-lo na importação.

### Fluxo de criação de página (o que a importação reaproveita)

- `CadernoFlutuanteStore.iniciarNovaPagina()` (`caderno-flutuante.store.ts:129-137`) zera
  `paginaAtiva`, `rascunho`, as revisões e o estado de salvamento, e muda a vista mobile para
  `CONTEUDO`.
- `alterarRascunho()` (`:139-144`) grava o rascunho, incrementa `revisaoRascunho` e **agenda** o
  autosave (`CADERNO_AUTOSAVE_DELAY`).
- `salvarAgora()` (`:146-205`) decide POST (criar) ou PUT (alterar) por `paginaAtiva`, e **sai
  cedo** quando `rascunho.titulo.trim()` é vazio ou quando `revisaoRascunho === revisaoEmSalvamento`
  (nada sujo). Sucesso chama `aplicarPaginaSalva` (`:332-340`), que insere a página no topo da lista
  e passa a ser `paginaAtiva`.
- API: `POST campanha/:campanhaId/caderno/paginas` com `{ titulo, conteudoMarkdown }`
  (`pagina-caderno.controller.ts:58-65`) → `PaginaCadernoService.criarPagina`
  (`pagina-caderno.service.ts:42-51`), que valida membro da campanha, faz `trim` no título e aplica
  os dois limites. **A importação não precisa de endpoint, DTO nem migration novos.**
- Na UI, o botão "Criar página" vive em `.caderno__lista-acoes`
  (`caderno-flutuante.component.html:185-195`), visível só quando `modoCaderno() === 'MEU'` — o
  mestre lendo caderno de jogador (`'JOGADORES'`) não cria nada, e `somenteLeitura()`
  (`caderno-flutuante.component.ts:104-106`) bloqueia edição.
- Mensagens de estado usam `.caderno__estado` / `.caderno__estado--erro`
  (`caderno-flutuante.component.scss:183,217`); o rótulo de salvamento (`Salvando…`/`Salvo`/`Falha
  ao salvar`) fica no cabeçalho (`rotuloSalvamento`, `:107-116`).

### Padrão de `<input type="file">` já aprovado no produto

`ficha-visualizacao.component.html:138-147` — um `<label>` com `[appTooltip]`, o `<input
type="file">` invisível por dentro (`opacity: 0`, `inset: 0`, `cursor: pointer`;
`ficha-visualizacao.component.scss:1589-1597`) e um `<app-icone>` visível por cima. A validação fica
no handler: `criar.page.ts:175-193` lê `files?.[0]`, **zera `input.value` imediatamente** (permite
reescolher o mesmo arquivo), valida tipo e tamanho contra constantes locais e grava a mensagem de
erro num signal.

## Entregáveis

### 1. Tabelas no editor (`gfm`)

1. `editor-markdown.component.ts`: `.use(commonmark).use(gfm)` (import de
   `@milkdown/kit/preset/gfm`; `gfm` depende do commonmark e entra **depois** dele).
2. `FormatoMarkdown` (`:35-44`) ganha os formatos de tabela e a barra
   (`:126-138`) ganha um grupo novo, depois do separador das listas:
   - **`TABELA`** — `insertTableCommand` com `{ row: 3, col: 3 }` (cabeçalho + 2 linhas);
   - **`LINHA_ADICIONAR`** — `addRowAfterCommand`;
   - **`COLUNA_ADICIONAR`** — `addColAfterCommand`;
   - **`LINHA_REMOVER`** — `selectRowCommand` com o índice da linha do cursor, seguido de
     `deleteSelectedCellsCommand`;
   - **`COLUNA_REMOVER`** — `selectColCommand` + `deleteSelectedCellsCommand`.
   Os quatro últimos só fazem sentido dentro de uma tabela: ficam `disabled` (com
   `aria-disabled`) quando a seleção não está numa tabela — derivar de `isInTable(state)`
   (`@milkdown/kit/prose/tables`) lido dentro de um `editor.action`, exposto pela instância do
   factory como um `estaEmTabela(): boolean`, mantendo o componente sem dependência direta do
   Milkdown (o token `EDITOR_MARKDOWN_FACTORY` continua sendo a única fronteira).
   Cada botão tem `aria-label` em português ("Inserir tabela", "Adicionar linha", "Remover coluna"…)
   e `(mousedown)="$event.preventDefault()"`, como todos os botões já existentes da barra.
3. Nenhum CSS de terceiro é importado; nenhuma dependência nova no `package.json`.

### 2. Visual da tabela (tokens, análogo `.calc-tabela`)

4. `editor-markdown.component.scss` ganha o bloco de tabela sob `:host ::ng-deep .milkdown .editor`,
   espelhando `.calc-tabela` (`patente.page.scss:184-220`): `border-collapse: collapse`,
   `font-family: var(--font-mono)`, `font-size: 13px`, célula `padding: 10px 8px`, `thead th`
   uppercase 10px em `var(--text-mute)` com `letter-spacing: 0.08em`. **Diferença deliberada do
   análogo:** por ser superfície editável, cada célula recebe `border: 1px solid var(--border)`
   (grade completa), não só `border-bottom` — sem grade não dá para saber onde a célula termina ao
   digitar.
5. Rolagem horizontal contida: a tabela **nunca** pode alargar a janela do Caderno (mínimo 440px no
   desktop) nem a viewport mobile. Envolver o nó de tabela num container com `overflow-x: auto` —
   mesmo papel de `.calc-tabela-wrap` — e garantir `max-width: 100%`. A barra usa a scrollbar
   customizada global do tema (`docs/design/tema/_base.scss:40`), sem estilo próprio.
6. Estado de seleção de célula do prosemirror-tables: `.selectedCell` com fundo
   `var(--accent-dim)` e borda `var(--accent-border)` (mesmo par usado pelo `:hover/:focus-visible`
   dos botões da barra, `editor-markdown.component.scss:48-54`). Nada de cor fixa.
7. No breakpoint mobile (`max-width: 560px`, bloco `:109-119` do mesmo arquivo): fonte da tabela cai
   junto com a do editor e o `padding` da célula encolhe para `8px 6px`, mantendo a legibilidade sem
   estourar 360px.

### 3. Importar arquivo `.md`

8. **Função pura nova** `frontend/src/app/modules/pagina-caderno/importar-markdown.ts`
   (mesmo lugar e mesmo padrão de `markdown-seguro.ts`: função pura, sem Angular, com `.spec.ts`
   próprio). Ela **não** duplica limite nenhum — importa `PAGINA_CADERNO_TITULO_MAXIMO` e
   `PAGINA_CADERNO_CONTEUDO_MAXIMO` de `@contratados-rpg/shared/validators`.

   ```ts
   export interface MarkdownImportadoDto { titulo: string; conteudoMarkdown: string }
   export type FalhaImportacaoMarkdown = 'EXTENSAO' | 'TAMANHO' | 'VAZIO';

   export function derivarTituloDeArquivo(nomeArquivo: string): string;
   export function normalizarMarkdownImportado(texto: string): string;
   ```

   `derivarTituloDeArquivo`:
   - descarta qualquer caminho antes do último `/` ou `\`;
   - remove a extensão final `.md` ou `.markdown` (case-insensitive);
   - colapsa espaços em branco (`\s+` → um espaço) e faz `trim`;
   - vazio ao final → `'Página importada'`;
   - corta em `PAGINA_CADERNO_TITULO_MAXIMO` e faz `trim` de novo.

   `normalizarMarkdownImportado`, nesta ordem:
   - remove BOM/zero-width inicial (mesma faixa `\u200B-\u200F` mais `\uFEFF` do regex de
     `markdown-seguro.ts:37`);
   - normaliza `\r\n` e `\r` soltos para `\n`;
   - remove **front matter YAML**: bloco delimitado por uma linha `---` no início absoluto do
     arquivo e a próxima linha `---` (ou `...`), incluindo as linhas em branco seguintes. O Caderno
     não tem modelo de metadados — nenhum campo do front matter é aproveitado;
   - converte **imagem em link**: `![alt](url)` → `[alt](url)` quando `url` é `http`/`https`;
     caso contrário deixa só o `alt` (e nada, se o `alt` for vazio). Motivo: o Caderno é
     documentado como "sem imagens ou anexos" (`CONTEXT.md`, seção do Caderno) e um `<img>` remoto
     numa página que o mestre também lê dispara requisição a terceiro a partir do navegador dele;
   - **não** toca em nada dentro de bloco de código cercado (```` ``` ````/`~~~`) nem de código
     inline (`` ` ``) — as duas transformações acima são aplicadas só fora desses trechos;
   - `trim` no final e uma quebra de linha final única.

   Fica **fora** da função (decisão, ver Decisões): HTML cru, links relativos ao vault e
   wiki-links `[[...]]` passam intactos.

9. **Store** — `CadernoFlutuanteStore` ganha `importarPagina(pagina: CadernoRascunho): void`,
   ao lado de `iniciarNovaPagina` (`caderno-flutuante.store.ts:129-137`): cancela o agendamento,
   zera `paginaAtiva` (para o salvamento ser POST/criar), grava o rascunho importado, marca o
   rascunho como sujo (`revisaoRascunho` à frente de `revisaoEmSalvamento`, senão o guard de
   `salvarAgora():153-160` engole o salvamento), põe a vista mobile em `CONTEUDO` e chama
   `salvarAgora()` **imediatamente** — a página importada aparece na lista sem esperar o debounce.
   Falha de rede cai no `estadoSalvamento = 'FALHA'` já existente, sem caminho de erro novo.

10. **UI** — `caderno-flutuante.component.html`, dentro de `.caderno__lista-acoes`
    (`:185-195`), ao lado de "Criar página" e sob o mesmo `@if (modoCaderno() === 'MEU')`:
    um `<label class="caderno__acao-icone">` com `<input type="file" class="caderno__importar-entrada"
    accept=".md,.markdown,text/markdown" aria-label="Importar arquivo Markdown"
    (change)="aoSelecionarArquivo($event)">` e `<app-icone nome="importar" />` — exatamente o padrão
    do upload de avatar (`ficha-visualizacao.component.html:138-147` + `.scss:1589-1597`).
    No mobile o alvo continua sendo `bp.$alvo-toque` pela regra já existente
    (`caderno-flutuante.component.scss:398`).

11. **Handler** `aoSelecionarArquivo` em `caderno-flutuante.component.ts`, seguindo
    `criar.page.ts:175-193`: pega `files?.[0]`, **zera `input.value`**, e então:
    - extensão fora de `.md`/`.markdown` → erro `EXTENSAO`;
    - `arquivo.size` acima de `TAMANHO_MAXIMO_IMPORTACAO_BYTES` (constante local, **1 MB** — folga
      de ~10× sobre o limite de 100 000 caracteres, evitando ler um arquivo enorme na memória) →
      erro `TAMANHO`;
    - lê como texto (`arquivo.text()`), normaliza, e se o resultado passar de
      `PAGINA_CADERNO_CONTEUDO_MAXIMO` → erro `TAMANHO` **sem truncar** (truncar silenciosamente
      perderia conteúdo do autor; o truncamento do editor em `:96-99` é rede de segurança de
      digitação, não política de importação);
    - conteúdo normalizado vazio → erro `VAZIO`;
    - sucesso → `store.importarPagina({ titulo, conteudoMarkdown })` e foco no input de título.

12. **Aviso** — um signal `avisoImportacao: { texto: string; erro: boolean } | null`, renderizado
    logo abaixo de `.caderno__lista-cabecalho` como `.caderno__estado` (+ `--erro` quando for
    falha), com `role="status"` e `aria-live="polite"`. Textos:
    - sucesso: `Importado de "<arquivo>".` — e, quando o front matter foi removido,
      `Importado de "<arquivo>". Front matter removido.` (o autor precisa saber que algo saiu);
    - `EXTENSAO`: `Formato inválido: envie um arquivo .md`;
    - `TAMANHO`: `Arquivo maior que o limite da página (100.000 caracteres)`;
    - `VAZIO`: `O arquivo não tem conteúdo`.
    O aviso é limpo ao selecionar outra página, ao criar página nova e ao trocar de modo/campanha.

### 4. Ícone

13. `IconeNome` (`frontend/src/app/shared/icone/icone.component.ts:25-87`) ganha `'importar'`, com
    o glifo em `icone.component.html` (`@case ('importar')`), recorte da Tabler Icons (MIT) —
    sugestão: `file-import` ou `arrow-bar-to-down` —, seguindo o comentário-padrão de atribuição já
    usado por `operacional` (`:94-96`).

### 5. Testes

14. `importar-markdown.spec.ts` (novo, Vitest — padrão de `markdown-seguro.spec.ts`), cobrindo no
    mínimo: extensão `.md` e `.MARKDOWN`; nome com caminho; nome só com extensão (fallback);
    título acima de 120; CRLF; BOM; front matter removido (e `---` no **meio** do texto preservado
    como divisor); imagem http virando link; imagem com URL relativa virando só o alt; imagem
    dentro de bloco de código **preservada**; tabela GFM atravessando a normalização sem alteração.
15. `caderno-flutuante.component.spec.ts` (existente): importação com sucesso chama
    `api.criarPagina` com título derivado e conteúdo normalizado; arquivo `.txt` não chama a API e
    mostra o aviso de erro; o botão de importar **não existe** em `modoCaderno() === 'JOGADORES'`.
16. `caderno-flutuante.store.spec.ts` (existente): `importarPagina` faz POST imediato (sem esperar
    o timer do autosave) e a página importada entra no topo da lista.
17. `editor-markdown.component.spec.ts` (existente): os botões novos existem, chamam
    `aplicarFormato` com o formato certo e ficam desabilitados fora de tabela (o factory mockado
    passa a expor `estaEmTabela`). **Round-trip real de tabela não é testável aqui** (o Milkdown é
    mockado em todos os testes) — é item de verificação ao vivo, não de suíte.

## Critérios de Aceite

- Nenhuma requisição de upload/`FormData` é feita ao importar — só o `POST`/`PUT` de
  `{ titulo, conteudoMarkdown }` já existente para criar/alterar página; o objeto `File` escolhido
  nunca sai do navegador (confirmar na aba Rede da verificação ao vivo: o payload da requisição é
  JSON de texto, sem `multipart/form-data` e sem o tamanho em bytes do arquivo original).
- Com o Caderno aberto no **meu caderno**, o botão de importar aparece ao lado de "Criar página";
  escolher `Sessão 04 — Pistas.md` cria imediatamente uma página com o título `Sessão 04 — Pistas`
  (sem a extensão) e o conteúdo do arquivo no editor, já salva (aparece na lista, rótulo `Salvo`).
- Um arquivo com tabela GFM é importado **como tabela**: cabeçalho, células navegáveis por `Tab`,
  alinhamento (`:---`, `:---:`, `---:`) preservado; recarregar a página (F5) e reabrir o Caderno
  mostra a mesma tabela — prova de que o Markdown persistido continua uma tabela GFM válida.
- Editar uma célula e deixar o autosave rodar não corrompe a tabela nem entra em `Conflito de
  versão`; o conteúdo persistido continua sendo tabela.
- Importar não dispara um laço de salvamento: a normalização que o Milkdown faz do texto importado
  pode gerar **um** salvamento adicional (POST de criação + PUT canônico), nunca uma sequência
  contínua; o rótulo estabiliza em `Salvo`.
- Inserir tabela pela barra (3×3), adicionar/remover linha e coluna funcionam; os quatro botões de
  linha/coluna ficam desabilitados com o cursor fora de tabela.
- Arquivo `.txt`, arquivo acima de 1 MB, arquivo cujo conteúdo passa de 100 000 caracteres e arquivo
  vazio **não** criam página e mostram a mensagem correspondente; escolher o **mesmo** arquivo de
  novo logo depois volta a disparar a importação (o `input.value` é zerado).
- O mestre em **Cadernos dos jogadores** não vê o botão de importar em nenhum viewport, e a página
  aberta continua `Somente leitura`.
- Nenhuma imagem remota é carregada por uma página importada: `![x](https://…)` virou link.
- Página existente com `|` no texto corrido continua legível depois de editada com o preset GFM
  ativo (o serializador GFM escapa `|` fora de tabela — confirmar que o texto exibido não muda).
- `frontend`: build, lint e suíte completa verdes; nenhuma dependência nova no `package.json`.
- **Gate visual obrigatório** (skill `verify`, `1920×1080` e `360×800`, mais a janela do Caderno no
  seu mínimo de **440px** no desktop): tabela renderizada com a densidade e a tipografia do análogo
  `.calc-tabela`; tabela larga rola **dentro** do editor, sem alargar a janela do Caderno nem gerar
  scroll horizontal na página; célula selecionada usa `--accent-dim`; barra de formatação com os
  botões novos sem quebrar em duas linhas (ela já rola horizontalmente,
  `editor-markdown.component.scss:24`); botão de importar com alvo de 44px no mobile; aviso de
  sucesso e de erro visíveis nos dois viewports.

## Fora de Escopo

- **Importar vários arquivos de uma vez** e **arrastar-e-soltar** arquivo na janela do Caderno —
  um arquivo por vez, pelo seletor (ver `IDEAS.md`, I-022).
- **Exportar** página do Caderno como `.md` (mesma ideia I-022).
- Importar `.docx`, `.pdf`, `.txt` ou colar de editor externo com conversão — só Markdown.
- Imagens e anexos no Caderno; o modelo continua "texto Markdown puro" (`CONTEXT.md`). A importação
  degrada imagem para link, não introduz upload.
- Front matter como metadado (tags, aliases, data): removido, não mapeado.
- Wiki-links `[[Nota]]` do Obsidian: passam como texto literal, sem virar link nem busca.
- Redimensionamento de coluna da tabela (`columnResizingPlugin`) e widget flutuante de tabela
  (`@milkdown/kit/component/table-block`): largura de coluna não é representável em Markdown.
- Mudar o modelo de persistência, o endpoint, os DTOs ou o schema — a importação usa o
  `POST campanha/:campanhaId/caderno/paginas` existente, sem migration.
- Reativar ou remover `markdown-seguro.ts` — permanece órfão; se o autor quiser, é limpeza à parte.
- Busca textual: a página importada é indexada pelo mesmo `tsvector` das demais, sem ajuste.

## Decisões registradas

- **Título é o nome do arquivo, literal** (sem trocar `-`/`_` por espaço, sem ler o `# H1` do
  conteúdo): foi o pedido explícito, e adivinhar o título a partir do conteúdo produz surpresa
  quando o arquivo já tem cabeçalho próprio. O autor renomeia no input, que fica focado logo após a
  importação.
- **O preset GFM inteiro entra**, não só o nó de tabela: strikethrough, task list e footnote vêm
  junto. Escolher plugin a plugin economizaria pouco e criaria um subconjunto que só este projeto
  conhece; os três extras são compatíveis com o editor e não exigem UI nova (funcionam por sintaxe).
- **Conteúdo acima do limite é recusado, não truncado** — ver entregável 11.
- **HTML cru é preservado** — é inerte no editor (renderizado como texto por `htmlSchema`), então
  não há razão de segurança para removê-lo, e removê-lo destruiria conteúdo do autor.

## Dependências

- `frontend/src/app/modules/pagina-caderno/editor-markdown.component.ts` (preset, `FormatoMarkdown`,
  factory, barra) e `.scss` (tabela, mobile).
- `frontend/src/app/modules/pagina-caderno/caderno-flutuante.component.ts` / `.html` / `.scss`
  (botão, handler, aviso) e `caderno-flutuante.store.ts` (`importarPagina`).
- `frontend/src/app/modules/pagina-caderno/importar-markdown.ts` (novo) + `.spec.ts` (novo).
- `frontend/src/app/shared/icone/icone.component.ts` / `.html` (glifo `importar`).
- `shared/src/validators/pagina-caderno.validators.ts` (limites — só consumidos, não alterados).
- Análogos de referência: `frontend/src/app/modules/calculadora/paginas/patente/patente.page.scss`
  (`.calc-tabela`), `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/
  ficha-visualizacao.component.html` + `.scss` (input de arquivo) e
  `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts:175-193` (validação de arquivo).
- Backend/`shared`: **nenhuma alteração**.
