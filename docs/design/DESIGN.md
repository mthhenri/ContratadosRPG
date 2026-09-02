# DESIGN.md — Tema "Terminal de Contenção"

Especificação do sistema visual do ContratadosRPG (Angular 21 · Tailwind ·
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

`tema/_tokens.scss` (CSS custom properties) é a **única fonte de verdade em runtime**. Tailwind
aponta para essas vars — nunca redeclara hex. Trocar o `--accent` (seletor de tema, spec M1) muda
tudo de uma vez.

> **Identidade x trocável:** o *dark base* e a família *IBM Plex* são a identidade. O `--accent`
> e a base clara/escura são trocáveis em runtime pelo `TemaService`, com trava de contraste. O
> serviço também escreve `color-scheme` no `<html>` para os controles nativos acompanharem a base.

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
| `--accent-text` | branco ou preto | — | Texto sobre preenchimento de `--accent`; o `TemaService` escolhe a cor de maior contraste a cada troca |
| `--accent-hover` | varia com `--accent` | — | Preenchimento de hover do accent; o `TemaService` ajusta a luminância na direção que preserva o contraste de `--accent-text` |
| `--accent-press` | varia com `--accent` | — | Preenchimento do estado pressionado; segue a direção de `--accent-hover`, mais distante do repouso, preservando o contraste de `--accent-text` |
| `--accent-dim` | `color-mix(accent 12%, transparent)` | — | Fundo de destaque suave |
| `--accent-border` | `color-mix(accent 40%, transparent)` | — | Borda de destaque, hover, foco |
| `--vida` | `#d53030` | `213, 48, 48` | Stat Vida — vermelho **fixo**, não acompanha `--accent` |
| `--erro` | `var(--vida)` | — | Erro de campo e ação destrutiva — vermelho **fixo**, não acompanha `--accent` |
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
porque o primitivo de botão cobre as oito severidades da API própria (`ui-01b`). `--help` foi
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
| `--radius-compact` | `3px` | Badges e controles compactos |
| `--radius-selo` | `3px` | Chips e selos semânticos |
| `--radius-tight` | `2px` | Barras de progresso e acabamento mínimo |
| `--pad-card` | `20px` | Padding interno de card (densidade "confortável") |
| `--gap-grid` | `16px` | Gap entre cards/colunas de grid |
| `--grid-cell` / `--grid-line` | `32px` / `rgba(255,255,255,.02)` | Textura de grid de fundo, sutil |

Sem raio maior que 6px em nenhum lugar do sistema (nada "pill"/arredondado demais) e sem sombra
pesada — só bordas hairline (`--border`/`--border-strong`) e, no máximo, o `box-shadow` sutil do
dropdown de perfil.

### Escala de espaço (`ui-18`)

Cinco degraus, congelados em `_tokens.scss` — `--space-4` · `--space-8` · `--space-12` ·
`--space-16` · `--space-20` — para `padding`/`gap`/`margin`. Escolhidos para preservar a
densidade que já existia em `shared/ui` (cada literal foi arredondado para o degrau mais
próximo), não para redesenhar nada; `--pad-card`/`--gap-grid` continuam os tokens semânticos que
compõem sobre esses degraus, sem duplicar a escala.

**Regra:** todo `padding`/`gap`/`margin` novo em `shared/ui` usa um destes cinco degraus. Um
literal de espaço novo (fora da escala) só entra com justificativa escrita no PR — igual à regra
de raio/cor da proibição #29, agora estendida a espaço.

**Exceção documentada:** um valor abaixo do primeiro degrau (`1px`, em `chip` tom-contorno e no
campo de digitação de `barra-recurso`) fica de fora da escala — é compensação fina de um controle
miniatura, e arredondar para `4px` mudaria o desenho de forma perceptível. Cada ocorrência carrega
o comentário `// ui-18` explicando o motivo no próprio SCSS.

### Breakpoints (`tema/_breakpoints.scss`)

| Token | Valor | Uso |
|---|---|---|
| `$bp-mobile` | `560px` | 1 coluna, navegação colapsa pra ícone, mixin `bp.mobile` |
| `$bp-tablet` | `1080px` | Segundo degrau — grades de 3 colunas viram 1 antes do mobile puro, mixin `bp.tablet` |
| `$alvo-toque` | `44px` | Altura/largura mínima de alvo tocável (WCAG 2.5.5) abaixo de `$bp-mobile` |

Media queries são avaliadas em tempo de compilação e não leem `var(--…)` — por isso o breakpoint é
um token **Sass**, não uma CSS custom property (não viola a proibição de hex/raio hardcoded, que
trata de valor visual, não de estrutura responsiva).

Toda verificação visual do projeto usa três viewports fixos — nunca a janela padrão do navegador:
**mobile `360×800`** (Galaxy S20 FE), **tela dividida `960×1080`** (metade de um FullHD, para
ficha/campanha ao lado de mapa ou chamada) e **desktop `1920×1080`** (FullHD) — ver
`.agents/skills/verify/`. As capturas de [`examples/`](examples/README.md) seguem os dois formatos
de referência principais; a tela dividida é uma validação interativa obrigatória.

O shell de página (`app-layout`) usa `padding: 24px 20px` no desktop e `16px 12px` no mobile,
sem largura máxima fixa — cada tela decide sua própria grade de colunas.

## Componentes visuais base

A biblioteca é código em `frontend/src/app/shared/ui/` (`PROBLEMS.md` `P-034`). Consuma o
primitivo canônico; não copie seu bloco BEM. `tema/_componentes.scss` preserva o mapa histórico e
aponta, bloco a bloco, para a implementação correspondente.

| Bloco | O que é | Variantes | Primitivo |
|---|---|---|---|
| `.card` | Container de seção — cabeçalho com índice numerado + título uppercase + régua fina | `[titulo]`/`[nivelTitulo]` (`h1`/`h2`), índice por `[cartaoIndice]`, metadado ou ação compacta no cabeçalho por `[cartaoFim]`, ação que conclui o conteúdo no rodapé por `[cartaoRodape]` (régua própria) | **`<app-cartao titulo="…">`** |
| `.stat` | Caixa de estatística (rótulo + valor grande) | `vida` (`--vida`, fixo — não `--accent`), `energia` (`--energy`), `positivo` (`--positive`); `0` é valor real, enquanto `null`/`undefined`/texto vazio exibem traço em `--text-mute` | **`<app-stat rotulo="…" [valor]="…">`** |
| `.barra-recurso` | Recurso com máximo — rótulo, valor atual/máximo e trilho de progresso (`ui-16`) | `recurso`: `vida` (`--vida`) ou `energia` (`--energy`); `--alerta` automático abaixo de 25% (`--warning`, vence a cor do recurso); `[editavel]` liga a digitação por clique (com `[maximoEditavel]` quando o máximo exibido já soma bônus e a edição precisa partir só da base armazenada); slot `[barraRecursoAcao]` ao lado do rótulo | **`<app-barra-recurso rotulo="…" [recurso]="…" [atual]="…" [maximo]="…">`** (`shared/ui/barra-recurso/`) |
| `.stepper` | Input numérico com botões `−`/`+` | — | **`<app-step-input [formControl]="…">`** (`shared/ui/stepper/`) |
| `.botao` | Botão de ação | **8 severidades** — `primario`, `secundario`, `positivo`, `info`, `aviso`, `perigo`, `ajuda`, `contraste` — × **4 estilos** (`preenchido`, `contorno`, `texto`, `link`), + `tamanho` (`pequeno`/`medio`/`grande`, ver "Degraus de tamanho" abaixo), `posicaoIcone`, `fluido` e `carregando` (guarda `Enter`/`Espaço`, ver "`carregando` × `disabled`" abaixo). Opacidade de desabilitado única: `0.55`, sem escape hatch por consumidor. Sem `rounded`/`raised`: contrariam o raio máximo e a regra de sombra deste documento | **`<button app-botao variante="…">`** |
| `.botao-icone` | Ação unitária sem rótulo visual | `compacto` (26px) e `padrao` (32px); em mobile os dois passam ao alvo de toque de 44px. Exige `aria-label` e `appTooltip`; foco e desabilitado são nativos | **`<button app-botao-icone aria-label="…" appTooltip="…">`** |
| `.campo` | Invólucro de campo — rótulo mono uppercase, dica e mensagem de erro em volta do controle | `--compacto` (rótulo 9px), padrão (10px), `--amplo` (11px + `--tracking-label`) | **`<app-campo rotulo="…">`** |
| `.chip-classificacao` | Selo mono uppercase com borda (ex.: "CLASSE-E // CONFIDENCIAL") | Rótulo: `padrao` (`--accent`) ou `sutil` (`--text-mute`/`--border-strong`). Estado: severidade `primario`, `secundario`, `aviso` ou `perigo`, tom `sutil` (fundo 12% + borda 40%) ou `contorno` | **`<app-chip variante="…">`** ou **`<app-chip severidade="…" tom="…">`** |
| `.selecionavel--ativo` | Estado ativo de item selecionável/tab avulso | — | — |
| `.topbar` | Barra de navegação superior (chrome "Barra de Comando") | `__item--ativo`, dropdown de perfil (`__perfil-*`) | — (consumidor único) |
| `.abas` | Barra de abas — troca de painel no lugar (`tablist`/`tab`/`tabpanel`), não navegação de rota | `__item--ativa`, colapso mobile só-ícone | **`<app-abas rotulo="…">` + `<button app-aba valor="…">` + `[appAbaPainel]`** |
| `.modal` | Caixa de diálogo modal, sobre `<dialog>` nativo — cabeçalho com título + "×", corpo projetado | `[largura]` (CSS livre), `[fechavelPeloFundo]` (default `true`), slots `[modalIcone]` (ícone no cabeçalho) e `[modalAcoes]` (rodapé de botões, régua acima, some por completo se vazio) | **`<app-modal aberto titulo>…</app-modal>`** |
| `.confirmacao` | Diálogo de confirmação destrutiva sobre `app-modal` — mensagem + botão de ação + cancelar no `[modalAcoes]` | Severidade `perigo` (padrão — `variante="perigo"` no botão, ícone `alerta` em `--erro` no cabeçalho) ou `padrao` (`variante="primario"`, sem ícone); `entidade` destaca um trecho da mensagem em negrito | **`ConfirmacaoService.confirmar({ titulo, mensagem, … }): Promise<boolean>`** + `<app-confirmacao />` (um único, no `layout`) |
| `.notificacoes` | Fila de notificações flutuante, `bottom-center` | 4 severidades — `sucesso`, `informacao`, `aviso`, `erro` (`--vida` fixo, não `--accent`) — cada uma com ícone, cor de régua/barra e ação opcional (`estilo="link"`, ver "Fila de notificações" abaixo); barra de duração com pausa no hover, duração real por severidade | **`NotificacaoService.notificar(...)`** + `<app-notificacoes />` (um único, no `layout`) |
| `.estado-vazio` | Estado vazio de lista — ícone + título mono + linha de apoio, borda tracejada `--border-strong` | Ação opcional projetada (`[estadoVazioAcao]`, `app-botao` `contorno`/`link`) | **`<app-estado-vazio icone="…" titulo="…" [linhaApoio]="…">`** |
| `.esqueleto` | Bloco de esqueleto de carregamento — fundo `--surface-2` pulsante, honra `prefers-reduced-motion` | Só identidade (cor/raio/pulso); o consumidor dimensiona pela própria classe BEM no mesmo elemento | **`<app-esqueleto class="…">`** |
| `.painel-flutuante` | Janela flutuante arrastável, não modal — mesma superfície/borda/sombra de `.modal`, cabeçalho com título + minimizar (`−`) + "×" | `[compacta]` (popup pequeno, ex. calculadora) vs. janela normal (`[largura]`/`[altura]` do consumidor); `[mobile]` vira folha cheia sem arraste; `[maximizada]` só acabamento (some o raio); slots `[painelCabecalhoExtra]`, `[painelAcoesExtras]`, `[painelRedimensionar]` | **`<app-painel-flutuante id="…" titulo="…" [aberto]="…" (fechar)="…">`** (`shared/ui/painel-flutuante/`) |

Os dois últimos (`.topbar`, `.abas`) foram extraídos direto de `layout.component.scss` e
`ficha-visualizacao.component.scss` nesta atualização — existiam como padrão real no app, mas
nunca tinham sido documentados aqui. Ver as telas em [`examples/`](examples/README.md) para o
resultado renderizado de cada um.

### Escolha de botão

Use `app-botao` quando a ação possui rótulo visual, severidade ou uma ação principal/secundária
legível por texto. Use `app-botao-icone` somente para uma ação unitária cuja leitura visual já é
um ícone canônico — por exemplo mostrar senha, copiar, editar ou fechar — sempre com `aria-label`
e `appTooltip`. Teclas da calculadora, `app-step-input`, `app-aba`, o fundo que fecha um modal e
controles de domínio compostos (como ações de inventário e vitalidade) continuam exceções: a
interação deles representa valor, navegação ou estado de domínio, não uma ação isolada.

### Escolha de chip

Use o chip de **rótulo** (`variante="padrao"`/`"sutil"`) para classificação, código ou identidade
sem estado do domínio. Use o chip de **severidade** para informar um estado curto: as severidades
aceitas hoje são `primario` (estado ativo), `secundario` (informação neutra), `aviso` e `perigo`.
O tom `sutil` é a receita padrão, com fundo a 12% e borda a 40% da cor; `contorno` preserva um
aviso contextual que não deve competir com o conteúdo. Ícones `app-icone` podem ser projetados no
chip de severidade quando acrescentam significado; chip não é botão, nem controle removível.

### Confirmação destrutiva (`ui-15`)

Toda ação que apaga ou remove dado sem volta passa por `ConfirmacaoService.confirmar(...)` —
nunca um `<app-modal>` montado à mão, nem uma área de confirmação inline (`role="alertdialog"`)
como o produto praticava antes desta task. A ordem dos botões é fixa: ação perigosa primeiro,
`Cancelar` depois; `Escape`, o clique fora e o "×" resolvem como `Cancelar`.

A consequência (`Esta ação não pode ser desfeita.`) só entra na `mensagem` quando a ação é
realmente irreversível para quem confirma — excluir ficha ou campanha, por exemplo. Uma ação que
o mestre pode desfazer por outro caminho (remover um membro, que pode ser reconvidado) não precisa
da frase: o título e o verbo ("Remover") já bastam. Não adicione a frase por padrão a toda
chamada — ela é para quando a alternativa de fato não existe.

### Estado vazio e esqueleto de lista (`ui-14`)

Toda lista tem dois momentos sem conteúdo real — carregando e vazia — e os dois usam sempre o
mesmo par de primitivos, nunca tipografia ou cor própria por consumidor:

- **`app-estado-vazio`** cobre vazio de verdade ("Nenhuma campanha ainda.") e vazio por filtro
  ("Nenhuma criatura ainda.") com o **mesmo componente** — a API não separa os dois casos, só
  recebe o texto que o consumidor já decidiu. Três slots (ícone via `app-icone`, título mono,
  linha de apoio) mais uma ação opcional projetada (`[estadoVazioAcao]`, sempre um `app-botao`
  `contorno` ou `link` — nunca `preenchido`, para não competir com a ação principal da tela, que
  já mora na barra acima da lista).
- **`app-esqueleto`** reserva a geometria do conteúdo real enquanto ele carrega — evita o "flash"
  de layout quando a resposta chega (a lista não salta de altura). É só identidade (fundo
  `--surface-2` pulsante, `prefers-reduced-motion` zera a animação); o consumidor monta a
  silhueta (título/linha/chip/avatar…) com a própria classe BEM no mesmo elemento, igual à
  composição de `app-botao`.

**Quando usar esqueleto vs. a linha de 2px da topbar:** `app-esqueleto` é para uma **lista com
geometria conhecida** — o consumidor já sabe a forma do card/linha real e pode desenhar a
silhueta antes da resposta chegar (histórico de rolagens, acervo de fichas, lista de campanhas,
inventário). A linha fina `.carregando-global` (`layout.component.scss`, fixa no topo do
viewport, `--accent`, 2px) é para **navegação global** — qualquer requisição em voo, contada pelo
`LoadingService`, sem geometria nenhuma para antecipar (troca de rota, submit de formulário,
ação pontual). Uma tela nunca combina os dois para o mesmo carregamento: se a lista tem forma
conhecida, esqueleto; senão, a linha global já basta.

Adotado em `HistoricoRolagensSidebar`, `FichaAcervo`, `CampanhaLista`, `InventarioEsquadrao` e
`FichaInventario` — apagando a marcação ad-hoc (`.esqueleto-bloco`/`@keyframes esqueleto-pulso`
copiados por página, `<p class="…__vazio">`/`…__estado` com texto solto) que cada um tinha.

### Recurso com máximo e precedência de estado do cartão de combatente (`ui-16`)

`app-barra-recurso` substitui três desenhos que a `ui-16` encontrou divergentes — o HUD sticky
mobile da ficha, o bloco de vitalidade desktop da mesma ficha e o cartão de combatente, que não
tinha trilho algum (Vida/Energia eram texto puro). O primitivo é dono do rótulo, do valor
atual/máximo e do trilho; steppers e o botão "Receber dano" continuam do consumidor, projetados
ao redor dele ou no slot `[barraRecursoAcao]`. Sanidade fica de fora: `sistema-v4.1.0.md`
§Sanidade diz que ela "não é uma barra de valor convencional" — o sistema a modela como listas de
Sequelas/Traumas/Lesões (`ficha-sanidade`), sem par atual/máximo.

O cartão de combatente (`cartao-combatente.component.scss`) tem três classes de estado —
`--ativo` (é a vez dele), `--agiu` (já gastou os turnos da rodada) e `--morrendo` — que podem
coincidir: `--agiu` é mutuamente exclusivo de `--ativo` no template
(`jaAgiu() && !ehTurnoAtual()`), mas `--morrendo` pode somar com qualquer um dos outros dois. A
precedência é uma decisão registrada, não a ordem incidental em que as regras foram escritas:

- **`--morrendo` vence `--ativo`** para o fundo/borda do cartão inteiro (a regra `&--morrendo`
  fica depois de `&--ativo` no SCSS, de propósito — não mova). Mesma prioridade que a etiqueta de
  texto já usa (`etiqueta()`, `cartao-combatente.component.ts`): "Morrendo" aparece antes de
  checar o turno. O selo de iniciativa (`&__iniciativa`) continua acendendo em `--accent` quando é
  a vez dele, então "é a vez dele" não desaparece de todo mesmo morrendo.
- **`--agiu` só mexe em opacidade do retrato** (`0.55`), nunca no fundo/borda do cartão — por isso
  soma sem conflito com `--morrendo`. Antes da `ui-16` era `opacity: .62` no cartão inteiro, que
  apagava justamente os números (Vida, Defesa, selo de iniciativa) que o mestre precisa ler à
  distância; agora eles ficam em contraste cheio mesmo com o combatente recuado.

A Cadência (`turnosPorRodada() > 1`) é `<app-chip severidade="secundario">` ao lado da linha de
origem — antes da `ui-16` era um sufixo concatenado na mesma string (`" · Cadência 2"`). Não
existe severidade `info` em `app-chip` (ver "Escolha de chip" acima); `secundario` já é o tom
informativo neutro do catálogo, reaproveitado aqui sem estender a `ui-13`.

### Painel flutuante, modal e painel lateral (`ui-17`)

O produto tem três formas de sobrepor conteúdo à tela, e a escolha entre elas não é estética —
depende de **quanto a interação bloqueia o resto da tela** e de **quem é dono da posição**:

- **`.modal`** — sobre `<dialog>` nativo, `showModal()`. Bloqueia: o fundo escurece
  (`::backdrop`) e nada atrás dele recebe foco ou clique enquanto está aberto. Sempre centralizado,
  nunca arrasta. Use para uma decisão pontual que precisa da atenção inteira do usuário antes de
  continuar — confirmar, editar um formulário curto, escolher algo de uma lista.
- **`.painel-flutuante`** — não bloqueia nada. O resto da tela continua clicável, rolável e
  interagível enquanto o painel está aberto (por design: o jogador rola dados com a calculadora
  aberta, o mestre lê o Sistema enquanto acompanha o combate). Arrasta, lembra posição e estado
  minimizado entre sessões (`localStorage`, por `[id]`) e limita a posição salva ao viewport ao
  abrir ou restaurar, empilha por z-index quando mais de um está aberto ao mesmo tempo. Use para
  uma ferramenta de apoio que o usuário mantém aberta *enquanto* faz outra coisa — calculadora,
  documentos de referência, caderno de anotações.
- **Painel lateral de 500px** (`HistoricoRolagensSidebar`, `InventarioEsquadraoSidebar` — sem
  primitivo próprio ainda, dois consumidores com a mesma métrica) — desliza da borda da tela,
  largura fixa de 500px no desktop e tela cheia no mobile. Não bloqueia o restante da coluna
  principal (que continua visível ao lado), mas também não arrasta nem flutua: é sempre a mesma
  borda, sempre a mesma largura. Use para uma lista/consulta longa que acompanha a tela principal
  sem competir por espaço com ela.

A régua prática: **precisa da atenção inteira do usuário antes de continuar?** → modal. **O usuário
mantém aberto enquanto faz outra coisa em qualquer lugar da tela?** → painel flutuante. **É uma
lista/consulta que acompanha uma coluna fixa?** → painel lateral de 500px.

`app-painel-flutuante` (`shared/ui/painel-flutuante/`) nasceu apagando a reimplementação
divergente de arraste, posição, empilhamento de z-index, minimizar e fechar que
`CalculadoraFlutuante`, `CadernoFlutuante` e `LeitorDocumentos` mantinham cada um à sua maneira —
inclusive um defeito real que só apareceu ao unificar: o z-index fixo da calculadora (66) sempre
perdia para a faixa dinâmica dos outros dois (1200+), então ela nunca conseguia ficar por cima ao
ser focada por último. Redimensionar por arraste e maximizar continuam do consumidor (a resolução
que cada um quer resolver é diferente — a calculadora tem um mínimo de 190×250, o caderno e o
leitor têm o próprio mínimo e um estado de tela cheia); o primitivo só precisa saber a caixa
renderizada (`obterElemento()`) para o consumidor medir o próprio redimensionamento, e expõe
`moverPara()`/`obterPosicaoAtual()` para quem maximiza também precisar mover a janela. A janela
some com `[hidden]`, não `@if`, ao minimizar — o iframe do leitor de documentos preserva página,
zoom e rolagem do PDF em vez de recarregar ao restaurar, e a mesma escolha beneficia de graça
qualquer conteúdo futuro que se importe com o próprio estado interno.

O corpo projetado pelo primitivo é uma **coluna flexível** (`flex: 1; min-height: 0`): controles
fixos de cada consumidor ficam no fluxo normal, e a região que deve preencher o restante declara
o seu próprio `flex: 1; min-height: 0`. Esse contrato mantém caderno, leitor e futuros utilitários
com a altura íntegra sem obrigar calculadoras ou conteúdos naturalmente compactos a crescer.

### Acabamento do botão (`ui-19`)

`app-botao` cobre 8 severidades × 4 estilos e ~20 consumidores; esta task fechou três lacunas
sem mexer no ícone/spinner nem no mapa de cor de `perigo` (`ui-12`).

**`carregando` × `disabled`.** `carregando` nunca desabilita o botão de verdade — `disabled`
continua exclusivo do consumidor (`[disabled]="enviando()"`), para as duas fontes não brigarem
pelo mesmo atributo. Antes, `carregando` só barrava o clique por ponteiro
(`pointer-events: none`); pelo teclado, `Enter`/`Espaço` num `<button>`/`<a>` focado ainda
disparava a ação, porque `pointer-events` não tem efeito nenhum sobre ativação por teclado. A
guarda correta cancela o `keydown` de `Enter`/`Espaço` (`evento.preventDefault()`) — cancelar aí
impede o `click` de sequer existir, em vez de tentar interceptá-lo depois num `(click)` do host:
esse `(click)` correria depois do `(click)` do template do consumidor (mesmo elemento, sem nó
wrapper — a ordem de invocação de listeners no mesmo alvo é a ordem de registro no DOM, não a de
declaração do primitivo), tarde demais para barrar. `carregando` também marca `aria-busy="true"`
e `aria-disabled="true"` para o leitor de tela anunciar o estado.

**Uma única opacidade de desabilitado.** O primitivo sempre teve `0.55`
(`:host(:disabled) { opacity: 0.55; }`); seis cópias declaravam `--botao-opacidade-desabilitado`
para sobrescrever esse valor com `0.4` ou `0.6` (`receber-dano-dialog`, `leitor-pdf-mobile`,
`historico-rolagens-sidebar` "Carregar mais", `login`/`registro` "Entrar", `perfil` "Salvar"/
ações). A fresta de customização foi removida junto com as seis declarações — não sobrou jeito
de um consumidor novo divergir do canônico sem editar o próprio primitivo.

**Degraus de tamanho.** `[tamanho]` é opcional — sem ele, o consumidor continua dono da dimensão,
como a `ui-01` estabeleceu; a `ui-19` não mudou esse contrato, só migrou os consumidores cujo
`padding` já batia com um degrau, usando a escala de espaço da `ui-18`:

| Degrau | `padding` | `font-size` | `font-weight` | `letter-spacing` |
|---|---|---|---|---|
| `pequeno` | `var(--space-8) var(--space-12)` (8px 12px) | 11px | 600 | `0.08em` |
| `medio` | `var(--space-12) var(--space-16)` (12px 16px) | 12px | 700 | `var(--tracking-label)` |
| `grande` | `var(--space-12) var(--space-20)` (12px 20px), `min-height: 48px` | 13px | 700 | `var(--tracking-label)` |

Todo degrau soma `gap: var(--space-8)` e `text-transform: uppercase`. Alvo de toque de 44px no
mobile é responsabilidade do consumidor (`min-height`/`min-width` na própria classe BEM ou
`bp.$alvo-toque`) nos três degraus — nenhum deles garante 44px sozinho no desktop.

### Fila de notificações — ícone, ação e duração (`ui-20`)

`app-notificacoes` (`NotificacaoService`) ganhou três acabamentos, sem mexer no posicionamento
`bottom-center` nem no par entra/sai da `ui-02`.

**Ícone por severidade.** Cada severidade sai com o ícone que já existe no catálogo do
`app-icone` — nenhum glifo novo: `check` (sucesso), `olho` (informação, por eliminação — não há
"i" no catálogo), `alerta` (aviso) e `excluir` (erro, também por eliminação). A cor do ícone, da
régua esquerda e da barra de duração é sempre a mesma por severidade —
`--positive`/`--energy`/`--warning`/`--erro`, os quatro tokens que já pintavam a régua desde a
`ui-02`.

**Quando a notificação leva ação, e quando o erro exige diálogo.** O slot de ação
(`acao: { rotulo, executar }` em `NotificacaoService.notificar(...)`) é para uma resposta curta,
de uma etapa e sem confirmação própria — "tentar de novo" numa requisição que falhou, "ver
detalhes" num aviso. É **erro** quem mais costuma precisar dela; sucesso/informação/aviso raramente
têm o que responder além de fechar. Ela sai como `app-botao` `estilo="link"`, com a `variante` da
própria severidade (`positivo`/`info`/`aviso`/`perigo` — as quatro já usam exatamente os mesmos
tokens `--positive`/`--energy`/`--warning`/`--erro`), **nunca** um botão `preenchido`/`contorno`:
a notificação não é um cartão de decisão, é um aviso passageiro que pode ganhar uma saída rápida.
Uma ação **destrutiva**, que precisa de confirmação, ou um erro que exige explicar **várias**
opções ao usuário não cabem no toast — isso é sempre `ConfirmacaoService.confirmar(...)` (`ui-15`)
ou um `app-modal` de verdade, nunca um `acao` de notificação disfarçado de diálogo. A ação nunca
fecha o toast antes de rodar: `executarAcao` chama `entrada.acao.executar()` e só depois chama
`fechar(id)` — na ordem inversa, um erro dentro de `executar()` fecharia a notificação sem o
usuário saber se a ação de fato aconteceu.

**Barra de duração.** Mesmo comportamento da bandeja de dados (`ui-16`/`m3-22`): uma barra de 3px
no rodapé do card esvazia da esquerda pra direita e volta cheia + pausa no `:hover` do card
inteiro (não só da barra). A diferença para a bandeja — que tem uma duração só (7s) — é que aqui
cada severidade tem a sua (`sucesso` 4s, `informação` 5s, `aviso` 6s, `erro` 8s, mais tempo de
leitura pra quem mais precisa dele); por isso a duração real do `NotificacaoService` chega à barra
por `entrada.duracaoMs`, ligado a `animation-duration` no template — nunca um segundo número
escrito solto no SCSS. O par `pausar`/`retomar` do serviço (mesmo par de `BandejaDadosService`)
cancela e reagenda o timer de auto-sumir junto com o hover, para a barra visual e o fechamento de
verdade nunca discordarem. `prefers-reduced-motion` zera a animação da barra.

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

`:root { color-scheme: dark; }`, em `_base.scss`, é o fallback inicial. Antes da renderização, o
`TemaService` aplica no `<html>` o `color-scheme` claro ou escuro persistido; assim os controles
nativos (popup de `<select>`, date/time picker e autofill) acompanham a base efetiva.

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
- **`tema/_base.scss`** — reset de body, fontes IBM Plex, textura de grid, fallback de
  `color-scheme`, scrollbar customizada global, foco de teclado, indicador de campo obrigatório.
- **`tema/_breakpoints.scss`** — `$bp-mobile`/`$bp-tablet`/`$alvo-toque` + mixins `bp.mobile`/
  `bp.tablet`, usados via `@use 'tema/breakpoints' as bp;`.
- **`tema/_componentes.scss`** — mapa histórico dos blocos BEM e de seus primitivos em
  `shared/ui/`; não é arquivo de cópia.
- **`tema/tailwind.config.ts`** — o `theme.extend` que o `tailwind.config.ts` real do frontend usa
  (cores, fontes, radius, tracking apontando pras mesmas vars de `_tokens.scss`).

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
