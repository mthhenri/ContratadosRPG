# DESIGN.md — Tema "Terminal de Contenção"

Especificação do sistema visual do ContratadosRPG (Angular 21 · PrimeNG 21 · Tailwind ·
SCSS + BEM em português), auditada contra o app real (`frontend/`) e as capturas de
[`examples/`](examples/README.md). **Nenhum valor é inventado** — todo token e toda medida abaixo
existe hoje em `docs/design/tema/` (espelhado 1:1 em `frontend/src/styles/tema/`) ou em um
componente Angular já implementado.

> Este documento descreve o estado **atual** do sistema, não um alvo pré-implementação. Ele fica
> desatualizado com o tempo, do mesmo jeito que o código — se uma mudança de tema/componente não
> se refletir aqui, o documento (e não o app) está errado; corrija-o na mesma tarefa.

> **Fora de escopo desta revisão:** a ficha de criatura (m4-04b) está em refatoração manual —
> nenhum token, componente ou captura relacionado a criatura foi revisado ou alterado aqui.

## Princípio

`tema/_tokens.scss` (CSS custom properties) é a **única fonte de verdade em runtime**. Tailwind e
o preset PrimeNG apenas *apontam* para essas vars — nunca redeclaram hex. Trocar o `--accent`
(seletor de tema, spec M1) muda tudo de uma vez.

> **Identidade x trocável:** o *dark base* e a família *IBM Plex* são a identidade e não mudam. Só
> o `--accent` é trocável (com trava de contraste, spec M1). **Não existe modo claro hoje** — o
> app é dark-only (`color-scheme: dark` fixo); se isso mudar, esta seção precisa ser reescrita, não
> só emendada.

## Paleta de cores oficial

| Token | Hex | RGB | Uso |
|---|---|---|---|
| `--bg` | `#0a0c0f` | `10, 12, 15` | Fundo da página |
| `--surface` | `#13161b` | `19, 22, 27` | Cards, topbar, painéis |
| `--surface-2` | `#1a1e24` | `26, 30, 36` | Caixas internas, inputs, stat boxes |
| `--border` | `rgba(255,255,255,.07)` | `255, 255, 255` @ 7% | Borda hairline padrão |
| `--border-strong` | `rgba(255,255,255,.12)` | `255, 255, 255` @ 12% | Borda de controle (input, stepper) |
| `--text` | `#e6e8eb` | `230, 232, 235` | Texto principal |
| `--text-dim` | `#969ba3` | `150, 155, 163` | Texto secundário, rótulo |
| `--text-mute` | `#656a72` | `101, 106, 114` | Texto terciário, ícone inativo |
| `--accent` | `#d53030` (padrão) | `213, 48, 48` | Cor de tema — **trocável por usuário** (seletor, spec M1) |
| `--accent-dim` | `color-mix(accent 12%, transparent)` | — | Fundo de destaque suave |
| `--accent-border` | `color-mix(accent 40%, transparent)` | — | Borda de destaque, hover, foco |
| `--vida` | `#d53030` | `213, 48, 48` | Stat Vida — vermelho **fixo**, não acompanha `--accent` |
| `--energy` | `#4c8dd0` | `76, 141, 208` | Stat Energia |
| `--positive` | `#4a9d6b` | `74, 157, 107` | Ganho, dano furtivo |
| `--warning` | `#d9a441` | `217, 164, 65` | Aviso, prestígio |
| `--dano-fisico` | `#ef4444` | `239, 68, 68` | Chip de dano — Físico |
| `--dano-balistico` | `#3b82f6` | `59, 130, 246` | Chip de dano — Balístico |
| `--dano-explosao` | `#f97316` | `249, 115, 22` | Chip de dano — Explosão |
| `--dano-quimico` | `#22c55e` | `34, 197, 94` | Chip de dano — Químico |
| `--dano-geral` | `#e5e7eb` | `229, 231, 235` | Chip de dano — Geral (irredutível) |
| `--help` | `#9b78d0` | `155, 120, 208` | Severidade `ajuda` do botão — **sem papel de domínio** (ui-01b) |
| `--contrast` | `#f4f6f8` | `244, 246, 248` | Severidade `contraste` do botão — quase-branco de superfície, não de texto (ui-01b) |

Cada cor semântica (`--vida`, `--energy`, `--positive`, `--warning`, `--dano-*`, `--help`,
`--contrast`) tem variantes `-dim` (12%) e `-border` (40%) via `color-mix()`, mesma receita do
`--accent` — não recalcule a fórmula por componente. Ver `--cor-ficha` (identidade por
personagem) na seção dedicada abaixo.

`--help` e `--contrast` são as duas únicas cores da paleta **sem papel de domínio**: existem
porque o primitivo de botão cobre as oito severidades que o `p-button` do PrimeNG oferecia
(`ui-01b`), para que a saída do PrimeNG na `ui-05` não empobreça a biblioteca. `--help` foi
escolhido pela luminância, não pelo matiz — 5,59:1 contra o `--bg`, entre `--energy` (5,62) e
`--positive` (5,90) —, para entrar na família em vez de destoar dela. Não use nenhum dos dois
para representar conceito de jogo: para isso existem as cores de domínio acima.

## Tipografia

Duas famílias, carregadas via `@fontsource` ou `<link>` do Google Fonts (ver `tema/_base.scss`):

- **`--font-mono`** — `'IBM Plex Mono'`: dados, títulos, rótulos, números. É a família dominante
  do sistema — a maior parte do que aparece na tela usa mono, não sans.
- **`--font-sans`** — `'IBM Plex Sans'`: corpo de texto longo (descrições, parágrafos).
- **`--tracking-label`** — `0.12em`, aplicado a todo rótulo UPPERCASE em mono.

O sistema **não usa uma escala semântica H1–H6** — não há hierarquia de `<h1>`…`<h6>` aninhada;
cada tela monta seu próprio título com `font-mono` + peso + cor, sem herdar de um nível acima.
A tabela abaixo é a escala **real**, por papel, medida nos componentes (não um padrão H1–H6
inventado):

| Papel | Tamanho | Peso | Família | Exemplo |
|---|---|---|---|---|
| Título de página | `24px` | 700 | mono | "Entrar" (`login.page.scss__titulo`) |
| Frase de destaque (marketing) | `22px` | 700 | mono | Slogan do painel de login |
| Valor numérico grande (stat) | `22px` | 700 | mono | `.stat__valor`, cards de contagem do painel |
| Marca da topbar | `15px` | 700 | mono, uppercase | "CONTRATADOS RPG" |
| Título de card/seção | `13px` | 600 | mono, uppercase | `.card__titulo` |
| Item de navegação | `11.5px` | 600 | mono | `.topbar__item` |
| Corpo / texto longo | `14–16px` (herdado do navegador) | 400 | sans | Descrições, parágrafos |
| Rótulo de campo / stat | `10px` | 500–600 | mono, uppercase | `.stat__rotulo`, `.abas__item` |

## Forma e espaço

| Token | Valor | Uso |
|---|---|---|
| `--radius-card` | `6px` | Cards, painéis, dropdown |
| `--radius-control` | `4px` | Botão, input, stepper, tab |
| `--pad-card` | `20px` | Padding interno de card (densidade "confortável") |
| `--gap-grid` | `16px` | Gap entre cards/colunas de grid |
| `--grid-cell` / `--grid-line` | `32px` / `rgba(255,255,255,.02)` | Textura de grid de fundo, sutil |

Sem raio maior que 6px em nenhum lugar do sistema (nada "pill"/arredondado demais) e sem sombra
pesada — só bordas hairline (`--border`/`--border-strong`) e, no máximo, o `box-shadow` sutil do
dropdown de perfil.

### Breakpoints (`tema/_breakpoints.scss`)

| Token | Valor | Uso |
|---|---|---|
| `$bp-mobile` | `560px` | 1 coluna, navegação colapsa pra ícone, mixin `bp.mobile` |
| `$bp-tablet` | `1080px` | Segundo degrau — grades de 3 colunas viram 1 antes do mobile puro, mixin `bp.tablet` |
| `$alvo-toque` | `44px` | Altura/largura mínima de alvo tocável (WCAG 2.5.5) abaixo de `$bp-mobile` |

Media queries são avaliadas em tempo de compilação e não leem `var(--…)` — por isso o breakpoint é
um token **Sass**, não uma CSS custom property (não viola a proibição de hex/raio hardcoded, que
trata de valor visual, não de estrutura responsiva).

Toda verificação visual do projeto usa dois viewports fixos — nunca a janela padrão do navegador:
**mobile `360×800`** (Galaxy S20 FE) e **desktop `1920×1080`** (FullHD) — ver
`.agents/skills/verify/`. As capturas de [`examples/`](examples/README.md) seguem os dois mesmos
tamanhos.

O shell de página (`app-layout`) usa `padding: 24px 20px` no desktop e `16px 12px` no mobile,
sem largura máxima fixa — cada tela decide sua própria grade de colunas.

## Componentes visuais base

A biblioteca está migrando de **catálogo para copiar** para **código para importar**
(`PROBLEMS.md` `P-034`, série `ui-01`…`ui-05`). Onde já existe primitivo em
`frontend/src/app/shared/ui/`, **consuma o primitivo**; onde ainda não existe, copie o bloco
canônico de `tema/_componentes.scss` para o SCSS scoped do componente — não importe o arquivo
inteiro.

| Bloco | O que é | Variantes | Primitivo |
|---|---|---|---|
| `.card` | Container de seção — cabeçalho com índice numerado + título uppercase + régua fina | `[titulo]`/`[nivelTitulo]` (`h1`/`h2`), índice por `[cartaoIndice]` projetado | **`<app-cartao titulo="…">`** |
| `.stat` | Caixa de estatística (rótulo + valor grande) | `vida` (`--vida`, fixo — não `--accent`), `energia` (`--energy`), `positivo` (`--positive`) | **`<app-stat rotulo="…" [valor]="…">`** |
| `.stepper` | Input numérico com botões `−`/`+` | — | **`<app-step-input [formControl]="…">`** (`shared/ui/stepper/`) |
| `.botao` | Botão de ação | **8 severidades** — `primario`, `secundario`, `positivo`, `info`, `aviso`, `perigo`, `ajuda`, `contraste` — × **4 estilos** (`preenchido`, `contorno`, `texto`, `link`), + `tamanho`, `posicaoIcone`, `fluido` e `carregando`. Sem `rounded`/`raised`: contrariam o raio máximo e a regra de sombra deste documento | **`<button app-botao variante="…">`** |
| `.campo` | Invólucro de campo — rótulo mono uppercase, dica e mensagem de erro em volta do controle | `--compacto` (rótulo 9px), padrão (10px), `--amplo` (11px + `--tracking-label`) | **`<app-campo rotulo="…">`** |
| `.chip-classificacao` | Selo mono uppercase com borda (ex.: "CLASSE-E // CONFIDENCIAL") | `padrao` (`--accent`), `sutil` (`--text-mute`/`--border-strong`) | **`<app-chip variante="…">`** |
| `.selecionavel--ativo` | Estado ativo de item selecionável/tab avulso | — | — |
| `.topbar` | Barra de navegação superior (chrome "Barra de Comando") | `__item--ativo`, dropdown de perfil (`__perfil-*`) | — (consumidor único) |
| `.abas` | Barra de abas — troca de painel no lugar (`tablist`/`tab`/`tabpanel`), não navegação de rota | `__item--ativa`, colapso mobile só-ícone | **`<app-abas rotulo="…">` + `<button app-aba valor="…">` + `[appAbaPainel]`** |
| `.modal` | Caixa de diálogo modal, sobre `<dialog>` nativo — cabeçalho com título + "×", corpo projetado | `[largura]` (CSS livre), `[fechavelPeloFundo]` (default `true`) | **`<app-modal aberto titulo>…</app-modal>`** |
| `.notificacoes` | Fila de notificações flutuante, `bottom-center` | 4 severidades — `sucesso`, `informacao`, `aviso`, `erro` (`--vida` fixo, não `--accent`) | **`NotificacaoService.notificar(...)`** + `<app-notificacoes />` (um único, no `layout`) |

Os dois últimos (`.topbar`, `.abas`) foram extraídos direto de `layout.component.scss` e
`ficha-visualizacao.component.scss` nesta atualização — existiam como padrão real no app, mas
nunca tinham sido documentados aqui. Ver as telas em [`examples/`](examples/README.md) para o
resultado renderizado de cada um.

## Cor de ficha (identidade por personagem, m3-61)

`--cor-ficha` é um token **independente** de `--accent`: `--accent` é a cor de tema escolhida por
**usuário** (`TemaService`, persistida em `localStorage`, aplicada uma vez no `<html>`); `--cor-
ficha` é a identidade visual de uma **ficha**, igual para todo mundo que olha uma rolagem daquele
personagem — nunca substitui nem interfere no `--accent` do viewer.

- **Nunca um valor global fixo no SCSS.** `--cor-ficha` não ganha valor em `_tokens.scss` — é
  sempre setada **inline por instância** (`[style.--cor-ficha]="fichaCor()"`), no componente que já
  tem a ficha em escopo (`ResultadoRolagem`, o item de `HistoricoRolagensSidebar`…). Isso permite
  várias fichas com cores diferentes coexistirem na mesma tela (ex.: feed de campanha) sem colidir.
- **Variantes dim/border já existem em `_tokens.scss`**, mesma receita do accent
  (`--cor-ficha-dim` 12%, `--cor-ficha-border` 40%, via `color-mix()`) — não recalcule a fórmula
  por componente.
- **Fallback sempre explícito no consumo**: todo uso lê `var(--cor-ficha, var(--accent))` (nunca
  `var(--cor-ficha)` sozinho) — ficha sem cor definida (`null`) cai no accent de quem visualiza,
  comportamento de hoje, sem quebra para fichas existentes.
- **Sem trava de contraste** (ao contrário do accent do seletor de tema, M1) — o color-picker da
  ficha é livre.

## Scrollbar (padrão global)

O tema **não usa a barra de rolagem nativa** do navegador em lugar nenhum — ela destoa da
estética "técnica, sóbria, fria". O padrão canônico vive em **`tema/_base.scss`** (não em
`_componentes.scss`, porque é regra **global**, não um bloco para copiar por componente) e vale
para todo container com overflow — scroll geral, os modais, tabelas e o textarea de código — sem
precisar ser repetido por componente.

- **Thumb:** `--surface-2` com contorno `--border-strong`, raio `--radius-control`. Fino
  (`width`/`height: 10px`). No `:hover`, o contorno passa a `--accent-border` (realce sutil —
  **nunca** `--accent` sólido, reservado para ação/estado ativo).
- **Track / corner:** transparentes.
- **Cross-browser:** `::-webkit-scrollbar-*` (Chrome/Edge/Safari) + `scrollbar-width: thin` e
  `scrollbar-color: var(--border-strong) transparent` (Firefox e a spec padrão).
- **Só tokens** (`--surface-2`/`--border-strong`/`--accent-border`) → segue legível e discreto nas
  duas bases (clara/escura) do tema em runtime, que sobrescrevem esses tokens. Nenhum hex solto
  (proibição #29).

`:root { color-scheme: dark; }`, também em `_base.scss`, avisa o navegador que o app é dark-only:
controles nativos sem CSS próprio (popup de `<select>`, date/time picker, autofill) usam a
variante escura do SO em vez do branco padrão.

## Foco de teclado (padrão global)

Mesmo racional da scrollbar: definido **uma vez** em `tema/_base.scss`, não repetido por
componente. Todo `a`/`button` ganha um `outline: 2px solid var(--accent-border)` (com
`outline-offset: 2px`) em `:focus-visible` — navegação por teclado consistente com a identidade,
em vez do outline padrão (inconsistente) do navegador. Inputs/textarea ficam de fora dessa regra
global porque já têm o próprio tratamento de `:focus` (borda `--accent-border`) definido por
página — um outline extra ali duplicaria o sinal.

## Onde cada arquivo vive

`docs/design/tema/` é espelhado 1:1 em `frontend/src/styles/tema/` — qualquer mudança de token,
base ou preset precisa ser feita **nos dois lugares** (ou extraída pra um só, se um dia isso for
automatizado). Hoje são arquivos irmãos mantidos manualmente em sincronia.

- **`tema/_tokens.scss`** — as CSS custom properties. Importado primeiro em `styles.scss`.
- **`tema/_base.scss`** — reset de body, fontes IBM Plex, textura de grid, `color-scheme: dark`,
  scrollbar customizada global, foco de teclado, indicador de campo obrigatório.
- **`tema/_breakpoints.scss`** — `$bp-mobile`/`$bp-tablet`/`$alvo-toque` + mixins `bp.mobile`/
  `bp.tablet`, usados via `@use 'tema/breakpoints' as bp;`.
- **`tema/_componentes.scss`** — biblioteca de referência. Copie o bloco BEM que precisar
  (`.card`, `.stat`, `.stepper`, `.topbar`, `.abas`…) para o SCSS do componente standalone
  correspondente.
- **`tema/tailwind.config.ts`** — o `theme.extend` que o `tailwind.config.ts` real do frontend usa
  (cores, fontes, radius, tracking apontando pras mesmas vars de `_tokens.scss`).
- **`tema/contencao.preset.ts`** — preset PrimeNG (base Aura), registrado em `app.config.ts`:
  ```ts
  providePrimeNG({
    theme: { preset: ContencaoPreset, options: { darkModeSelector: '.dark' } }
  });
  ```
  Importa de `@primeuix/themes` (nome do pacote no PrimeNG 21) — não `@primeng/themes`, que não
  está instalado.

## Referência visual

As capturas em [`examples/`](examples/README.md) são HTML único e offline exportado do app real
(`1920×1080` + `360×800`, dados de uma seed descartável, CSS e imagens embutidos, sem script) —
não mockups. Consulte a tabela completa lá; aqui vão as três mais representativas do padrão geral:

- [`examples/campanhas.html`](examples/campanhas.html) — topbar, cards de stat, card de campanha
- [`examples/ficha-de-jogador.html`](examples/ficha-de-jogador.html) — barras Vida/Energia, grid de
  atributos, abas
- [`examples/ficha-criacao-guia.html`](examples/ficha-criacao-guia.html) — trilha de passos, resumo
  operacional lateral

A ficha de criatura está **fora desta revisão** (m4-04b em refatoração manual) — não há captura
nem entrada de referência para ela aqui; ver a nota de exclusão em
[`examples/README.md`](examples/README.md#excluído-de-propósito).
