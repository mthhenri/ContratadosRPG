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

Uma rota que reserva `--largura-painel-lateral` (Histórico de Rolagens, Inventário de Esquadrão)
fica mais estreita que a viewport sozinha sugere — os mixins `bp.tablet-lateral-aberta`/
`bp.mobile-lateral-aberta` somam a reserva máxima do painel (`$reserva-painel-lateral`, `540px` =
`500px` + `2×20px` de margem) a `$bp-tablet`/`$bp-mobile`, para que o mesmo arranjo de 1 coluna
dispare pela largura que sobrou ao conteúdo, não pela tela inteira. Use-os em vez de `bp.tablet`/
`bp.mobile` sempre que o CSS estiver sob um modificador de painel lateral aberto.

Toda verificação visual do projeto usa quatro viewports fixos — nunca a janela padrão do
navegador: **mobile `360×800`** (Galaxy S20 FE), **tela dividida `960×1080`** (metade de um
FullHD, para ficha/campanha ao lado de mapa ou chamada), **notebook `1366×768`** (resolução de
notebook mais comum, bem mais baixa que os 1080px dos outros dois viewports desktop) e
**desktop `1920×1080`** (FullHD) — ver `.agents/skills/verify/`. As capturas de
[`examples/`](examples/README.md) seguem os dois formatos de referência principais; a tela
dividida e o notebook são validações interativas obrigatórias.

O shell de página (`app-layout`) usa `padding: 24px 20px` no desktop e `16px 12px` no mobile,
sem largura máxima fixa — cada tela decide sua própria grade de colunas.

## Componentes visuais base

A biblioteca é código em `frontend/src/app/shared/ui/` (`PROBLEMS.md` `P-034`). Consuma o
primitivo canônico; não copie seu bloco BEM. `tema/_componentes.scss` preserva o mapa histórico e
aponta, bloco a bloco, para a implementação correspondente.

| Bloco | O que é | Variantes | Primitivo |
|---|---|---|---|
| `.ficha-atributo` | Ladrilho de atributo extraído do Jogador, também usado no NPC (`m4-18`): sigla com tooltip focável, valor e estados | `sigla`/`nome`/`valor`/`dt` vêm do consumidor; `maestria`/`lesao`/`modificador`/`dados` só apresentam valores recebidos. `mostrarMaestria`/`mostrarLesao`/`mostrarModificador`/`mostrarDados`/`mostrarRolar` são `true` por padrão; NPC desliga as cinco. `podeRolar` guarda a permissão; `editando` mantém a caixa e projeta `[atributoValor]`, `[atributoModificador]`, `[atributoDados]` (steppers do consumidor). Eventos `rolar`/`maestriaAlternada`/`competenciaAlternada`; elegibilidade e dicas de Maestria/lesão/Competência são recebidas, sem regra de domínio no primitivo. Competência de NPC (`m4-21`) é opcional e desligada por padrão: `mostrarCompetencia`, `competencia`, `competenciaHabilitada`, `dicaCompetencia` e `rotuloCompetencia` (dado, ex. `+2D6`) — na edição, botão `dado-mais` no lugar da ★; marcado, o ladrilho ganha borda `--accent` com brilho leve (`--accent-dim`/`--accent-border`) e, na leitura, o selo do dado no canto superior esquerdo. `dicaEdicao` preserva a dica original do Jogador; por padrão usa Nome — DT também em edição. A grade pertence ao consumidor | **`<app-atributo-ficha sigla="DES" nome="Destreza" [valor]="…" [dt]="…">`** (`shared/ui/atributo-ficha/`) |
| `.card` | Container de seção — cabeçalho com índice numerado + título uppercase + régua fina | `[titulo]`/`[nivelTitulo]` (`h1`/`h2`), índice por `[cartaoIndice]`, metadado ou ação compacta no cabeçalho por `[cartaoFim]`, ação que conclui o conteúdo no rodapé por `[cartaoRodape]` (régua própria), `[semCaixa]` larga a caixa (fundo/borda/raio/padding) e deixa só o cabeçalho como divisor de seção solto sobre o fundo da página (`P-052`) | **`<app-cartao titulo="…">`** |
| `.stat` | Caixa de estatística (rótulo + valor grande) | `vida` (`--vida`, fixo — não `--accent`), `energia` (`--energy`), `positivo` (`--positive`); `0` é valor real, enquanto `null`/`undefined`/texto vazio exibem traço em `--text-mute`; `[tamanho]` `fino`/`compacto`/`padrao`/`hero` (`fino`, `m4-17`: ladrilho de apoio em coluna densa — padding vertical no primeiro degrau, rótulo colado no valor; `hero`: destaque das simulações, `P-054`); `[statInfo]` projeta um botão de ajuda ao lado do rótulo; `[appStatValor]` (`m4-17`) projeta um controle no lugar do texto do valor — o caso é o `app-valor-editavel` do mestre, mantendo caixa, rótulo e tipografia do primitivo; `[pulso]` incrementa para disparar um pulso de escala no valor (`P-054`); `[faixa]` (`revisao-visual-regras`) liga o cartão de recurso do exemplão M10: faixa lateral de 3px e rótulo na cor da variante, ícone em quadro tingido projetado por `[statIcone]`, nota mono sob filete tracejado | **`<app-stat rotulo="…" [valor]="…">`** |
| `.barra-recurso` | Recurso com máximo — rótulo, valor atual/máximo e trilho de progresso (`ui-16`) | `recurso`: `vida` (`--vida`) ou `energia` (`--energy`); `--alerta` automático abaixo de 25% (`--warning`, vence a cor do recurso); `[editavel]` liga a digitação por clique (com `[maximoEditavel]` quando o máximo exibido já soma bônus e a edição precisa partir só da base armazenada); slot `[barraRecursoAcao]` ao lado do rótulo | **`<app-barra-recurso rotulo="…" [recurso]="…" [atual]="…" [maximo]="…">`** (`shared/ui/barra-recurso/`) |
| `.barra-escala` | Posição numa escala fechada com faixas — rótulo, número + texto curto da faixa, trilho em degradê e marcador em losango (`m4-17`) | cores `corInicio`/`corMeio?`/`corFim` vindas do consumidor como tokens (sem `corMeio`, o degradê vai direto de início a fim); `[marcadores]` desenha ticks nos limites de faixa; `textoValor`/`descricao` aceitam texto ou função do valor (acompanham o arrasto); `[editavel]` troca o `role="meter"` por um `<input type="range">` nativo do próprio primitivo (setas, Home/End, PageUp/PageDown), que emite `valorConfirmado` **uma vez** ao soltar/Enter/sair do campo — nunca por passo — e restaura com Esc; `[desabilitado]` enquanto o consumidor salva; `descartar()` devolve o trilho ao valor recebido quando o consumidor não gravou. A cor nunca é a única informação: número e faixa sempre visíveis, marcador com forma. Não é variante de `.barra-recurso` (não há máximo a gastar nem alerta) | **`<app-barra-escala rotulo="…" [valor]="…" corInicio="var(--…)" corFim="var(--…)">`** (`shared/ui/barra-escala/`) |
| `.stepper` | Input numérico com botões `−`/`+` | `[tamanho]` `padrao`/`compacto`/`mini`; `[digitavel]` (default `true`) — `false` troca o `<input>` central por texto só-leitura e os botões passam a usar segurar-para-repetir (`appHoldRepeat`) em vez de clique único, para o padrão de "ajuste rápido" sem digitação (atributo, modificador de teste, custo de habilidade...); `[comSinal]` (só com `digitavel=false`) antepõe `+` a valores positivos e marca `--ativo` quando != 0 | **`<app-step-input [formControl]="…">`** (`shared/ui/stepper/`) |
| `.botao` | Botão de ação | **8 severidades** — `primario`, `secundario`, `positivo`, `info`, `aviso`, `perigo`, `ajuda`, `contraste` — × **4 estilos** (`preenchido`, `contorno`, `texto`, `link`), + `tamanho` (`pequeno`/`medio`/`grande`, ver "Degraus de tamanho" abaixo), `posicaoIcone`, `fluido` e `carregando` (guarda `Enter`/`Espaço`, ver "`carregando` × `disabled`" abaixo). Opacidade de desabilitado única: `0.55`, sem escape hatch por consumidor. Sem `rounded`/`raised`: contrariam o raio máximo e a regra de sombra deste documento | **`<button app-botao variante="…">`** |
| `.botao-icone` | Ação unitária sem rótulo visual | `mini` (16px, sem borda — ícone inline dentro de outro controle, ex. dadinho de um pill), `compacto` (26px) e `padrao` (32px); em mobile `compacto`/`padrao` passam ao alvo de toque de 44px (`mini` não, é sempre inline). `[redondo]` (ui-30): raio 50% em vez do raio de controle padrão, para selos circulares sobre canto de foto/card (enquadrar/remover avatar, "i" de informação) — combina com qualquer `tamanho`. `[ativo]`: destaque de alternância ligada (mesma receita do item ativo de `.segmentado`) — só visual, o `aria-pressed` continua no consumidor. O hover só existe com `@media (hover: hover)`: no toque o `:hover` fica grudado depois do toque e, com ícone/borda em `--accent`, lia como "ativo". Aceita `<button>` ou `<a>` (ui-28). Exige `aria-label` e `appTooltip`; foco e desabilitado são nativos (`:disabled` não afeta `<a>`) | **`<button app-botao-icone aria-label="…" appTooltip="…">`** ou **`<a app-botao-icone aria-label="…" appTooltip="…">`** |
| `.campo` | Invólucro de campo — rótulo mono uppercase, dica e mensagem de erro em volta do controle | `--compacto` (rótulo 9px), padrão (10px), `--amplo` (11px + `--tracking-label`) | **`<app-campo rotulo="…">`** |
| `.chip-classificacao` | Selo mono uppercase com borda (ex.: "CLASSE-E // CONFIDENCIAL") | Rótulo: `padrao` (`--accent`) ou `sutil` (`--text-mute`/`--border-strong`). Estado: severidade `primario`, `secundario`, `sucesso`, `aviso`, `perigo`, `energia` (`--energy`, custo de Energia) ou `ajuda` (`--help`, Reação), tom `sutil` (fundo 12% + borda 40%) ou `contorno` | **`<app-chip variante="…">`** ou **`<app-chip severidade="…" tom="…">`** |
| `.selecionavel--ativo` | Estado ativo de item selecionável/tab avulso | — | — |
| `.topbar` | Barra de navegação superior (chrome "Barra de Comando") | `__item--ativo`, dropdown de perfil (`__perfil-*`) | — (consumidor único) |
| `.abas` | Barra de abas — troca de painel no lugar (`tablist`/`tab`/`tabpanel`), não navegação de rota | `__item--ativa`, colapso mobile só-ícone | **`<app-abas rotulo="…">` + `<button app-aba valor="…">` + `[appAbaPainel]`** |
| `.segmentado` | Grupo de seleção única — `role="group"` + item `aria-pressed`, não `tablist`/`tab` (`P-056`); pill com fundo `--surface-2`, item ativo em `--accent-dim` | `__item--ativo`; `[desabilitado]` no item; tamanho/conteúdo (ícone só, ícone+texto) ficam pela classe BEM do consumidor no mesmo elemento, como `Aba` | **`<app-segmentado rotulo="…">` + `<button app-segmentado-item [ativo]="…" [desabilitado]="…">`** |
| `.modal` | Caixa de diálogo modal, sobre `<dialog>` nativo — cabeçalho com título + "×", corpo projetado | `[largura]` (CSS livre), `[fechavelPeloFundo]` (default `true`), slots `[modalIcone]` (ícone no cabeçalho) e `[modalAcoes]` (rodapé de botões, régua acima, some por completo se vazio) | **`<app-modal aberto titulo>…</app-modal>`** |
| `.confirmacao` | Diálogo de confirmação destrutiva sobre `app-modal` — mensagem + botão de ação + cancelar no `[modalAcoes]` | Severidade `perigo` (padrão — `variante="perigo"` no botão, ícone `alerta` em `--erro` no cabeçalho) ou `padrao` (`variante="primario"`, sem ícone); `entidade` destaca um trecho da mensagem em negrito | **`ConfirmacaoService.confirmar({ titulo, mensagem, … }): Promise<boolean>`** + `<app-confirmacao />` (um único, no `layout`) |
| `.notificacoes` | Fila de notificações flutuante, `bottom-center` | 4 severidades — `sucesso`, `informacao`, `aviso`, `erro` (`--vida` fixo, não `--accent`) — cada uma com ícone, cor de régua/barra e ação opcional (`estilo="link"`, ver "Fila de notificações" abaixo); barra de duração com pausa no hover, duração real por severidade | **`NotificacaoService.notificar(...)`** + `<app-notificacoes />` (um único, no `layout`) |
| `.estado-vazio` | Estado vazio de lista — ícone + título mono + linha de apoio, borda tracejada `--border-strong`; `[tamanho]="'compacto'"` encolhe o padding para dentro de listas já contidas por outro cartão | Ação opcional projetada (`[estadoVazioAcao]`, `app-botao` `contorno`/`link`) | **`<app-estado-vazio icone="…" titulo="…" [linhaApoio]="…" [tamanho]="'compacto'">`** |
| `.esqueleto` | Bloco de esqueleto de carregamento — fundo `--surface-2` pulsante, honra `prefers-reduced-motion` | Só identidade (cor/raio/pulso); o consumidor dimensiona pela própria classe BEM no mesmo elemento | **`<app-esqueleto class="…">`** |
| `.painel-flutuante` | Janela flutuante arrastável, não modal — mesma superfície/borda/sombra de `.modal`, cabeçalho com título + minimizar (`−`) + "×" | `[compacta]` (popup pequeno, ex. calculadora) vs. janela normal (`[largura]`/`[altura]` do consumidor); `[mobile]` vira folha cheia sem arraste; `[maximizada]` só acabamento (some o raio); slots `[painelCabecalhoExtra]`, `[painelAcoesExtras]`, `[painelRedimensionar]` | **`<app-painel-flutuante id="…" titulo="…" [aberto]="…" (fechar)="…">`** (`shared/ui/painel-flutuante/`) |
| `.gaveta` | Painel deslizante confinado ao ancestral posicionado, com véu local e texto visível por trás (`m10-05`) | `[(aberta)]` (model), `[lado]` `inicio`/`fim`, `[rotulo]` acessível e conteúdo projetado; fecha por Esc, véu ou botão, circula Tab e devolve foco ao gatilho. Movimento reduzido respeitado; largura `min(320px, 85%)`, corpo rolável e cabeçalho da família do painel flutuante. Consumidor define o contêiner com `position: relative` e altura; para cobrir a viewport, dimensiona esse contêiner à viewport. Não usa `fixed` global, top layer nem trava global da página | **`<app-gaveta [(aberta)]="…" rotulo="Sumário">…</app-gaveta>`** (`shared/ui/gaveta/`) |
| `.paginador` | Paginação com salto para extremos — `Primeira < […] [x] […] > Última` | `[paginasVizinhas]` (padrão 2 de cada lado da atual); a janela desliza perto das bordas em vez de encolher; `Primeira`/`Anterior`/`Próxima`/`Última` desabilitam nos extremos | **`<app-paginador [pagina]="…" [totalPaginas]="…" (paginaAlterada)="…">`** (`shared/ui/paginador/`) |
| `.cartao-receita` | Ponto de partida clicável — título (conteúdo projetado, como o rótulo de `app-botao`) e descrição curta; caixa interna `--surface-2`, hover `--accent-border` | `[ativo]` (receita em uso, `aria-pressed` + `--accent-dim`/`--accent-border`); `[descricao]` opcional. O host é o `<button>` nativo; grade e largura são do consumidor. Nasceu no experimento do montador (`montador-rolagem-experimento`) | **`<button app-cartao-receita [descricao]="…">Título</button>`** (`shared/ui/cartao-receita/`) |
| `.ficha-termo` | Ficha removível de um termo editável — linha com ícone, rótulo, controles e "×"; segunda linha com o conteúdo do consumidor e o botão "Mais" (chevron); faixa de 3px na base na cor do tipo de dano (`--dano-*`, meio a meio no Composto) | `[cor]`/`[corSecundaria]`, `[compacta]` (uma linha; o "Mais" vai para a primeira linha), `[temMais]` + `[(maisAberto)]` (área `[fichaTermoMais]` recolhível), `[removivel]`, `(remover)`. Slots `[fichaTermoIcone]`, `[fichaTermoRotulo]`, `[fichaTermoControles]` — o elemento do slot precisa ser filho direto ou raiz única de um bloco de controle de fluxo (um `@if` dentro de outro não é casado). É o controle removível que `app-chip` não é | **`<app-ficha-termo rotuloRemover="…" (remover)="…">`** (`shared/ui/ficha-termo/`) |

Os dois últimos (`.topbar`, `.abas`) foram extraídos direto de `layout.component.scss` e
`ficha-visualizacao.component.scss` nesta atualização — existiam como padrão real no app, mas
nunca tinham sido documentados aqui. Ver as telas em [`examples/`](examples/README.md) para o
resultado renderizado de cada um.

### Página pública de Regras (M10-06)

`modules/regras` usa os trilhos de leitura dos patchnotes e a página/Coluna do
exemplão M10: sumário sticky à esquerda, documento até 960px alinhado à esquerda,
cartões nos dois trilhos, títulos mono e texto sans. Seções usam a hierarquia de
glifos ⬢/⬡/⬥/⬦; verbetes têm filete. Nota usa amarelo fixo e Exemplo usa `--accent`.
Tarja sólida segue Documento de contenção. Tabelas têm rolagem local, fade e primeira
coluna fixa no celular. Habilidades são listas densas com chip de Energia (ícone +
valor) secundário/contorno e REAÇÃO primário/contorno, com tooltip por extenso.

Revisão mobile de 09/10/2026: tabelas comuns distribuem as colunas com largura fixa
no celular para a primeira coluna não ocultar o começo da última no fim da rolagem.
Amplificadores seguem a densidade de `RegrasModificacoes`: nome e empilhamento
na primeira linha, efeito abaixo na largura inteira; nomes não quebram. Grades de
módulos usam `app-cartao`, cada título junto dos efeitos da sua coluna, dois cartões
por linha quando o container comporta e um no celular. Sumário acompanha a altura
do seletor Sistema/Guia. Rodapé usa `app-marca` e botão canônico para voltar ao topo,
com “Você é nossa prioridade — 2026” e crédito CC BY-SA abaixo.
[Verificação](../specs/done/regras-mobile-tabelas-e-rodape/verificacao.md).

Controles: `app-segmentado` Sistema/Guia, `app-botao` completo para retry,
`app-esqueleto` e `app-estado-vazio`; links de sumário seguem a receita dos patchnotes.
Item ativo acompanha a leitura; link interno foca e pisca o título, respeitando
movimento reduzido. Desde M10-08, página mobile e painel normal usam `app-gaveta`
de sumário, com texto na largura disponível e controles com alvo de 44px no celular.
Painel maximizado desktop usa os dois trilhos da página. Topbar e ficha abrem um
único `app-painel-flutuante` de Regras, carregado no primeiro uso; cabeçalho segue
a Biblioteca M9-11/M9-12. ↗ abre a página na seção atual; memória separada por livro.
Rolagem e gaveta locais, IDs isolados entre hospedeiros. Topbar usa Regras com o ícone
`documentos` (livro aberto) e crédito CC BY-SA no rodapé. Desde M10-11, a publicação usa apenas
os JSONs derivados do Markdown; o download provisório foi retirado.
[Gates e limites](../specs/done/m10-06-pagina-regras/m10-06-verificacao.md).
[Painel, celular e comparação com a Biblioteca](../specs/done/m10-08-painel-flutuante-e-celular/m10-08-verificacao.md).

Desde M10-09, pesquisa no topo do trilho/gaveta segue a busca da Biblioteca:
`app-campo` compacto com ícone busca, resultados em `app-botao` secundário/texto/
pequeno, caminho mono e trecho seguro com `mark`. Mínimo de dois caracteres como
o exemplão; normalização sem caixa/acento, tarjas excluídas. Resultados substituem
sumário, com `app-estado-vazio` compacto quando não há resultado. Contador sticky
e `app-botao-icone` compacto navegam ocorrências; Enter/Shift+Enter também navegam,
Esc limpa. Alvos mobile seguem 44px. Outro livro usa botão secundário/link/pequeno.
Destaques usam `--accent-dim`/`--text`, ocorrência atual com contorno `--accent`.
Rolagem posiciona o destaque abaixo da barra e do contador medidos na aplicação.
[Pesquisa, comparação visual e gates](../specs/done/m10-09-pesquisa-regras/m10-09-verificacao.md).

Desde M10-10, `app-botao-icone` compacto com tooltip Exportar PDF fica ao lado
do título/versão no trilho/gaveta. Projeção sob demanda reutiliza os blocos do
leitor em papel A4 claro, com tokens `--papel-*`, IBM Plex, capa/tarjas/versão,
sumário hierárquico e margens com livro/versão e página/total. Capítulos e
arquétipos começam em novas páginas; caixas curtas/linhas permanecem inteiras,
containers longos fragmentam. Cores de ameaça são preservadas. Controles e
marcas de pesquisa ficam fora da impressão. Sumário sem páginas e referências
por nome são limites da impressão nativa.
[Inspeção dos livros e limites](../specs/done/m10-10-exportar-pdf/verificacao.md).
Após avaliação do autor, a apresentação dos PDFs permanece em revisão (P-108).
Exportar o Sistema está temporariamente desativado; o Guia permanece disponível.

**Uso da marca (decisão do autor, M10-04, 08/10/2026):** a marca própria
ContratadosRPG — SCP misturado com D20, assets `frontend/public/logo-{black,white}.*`
— é o padrão geral, inclusive nos níveis de ameaça. A entrada Regras da topbar usa o
ícone `documentos` (livro aberto), decisão do autor de 08/10/2026 (`revisao-visual-regras`).
O logo SCP oficial fica reservado à identidade de Criatura. Os desenhos da
[prancha M10-04](../specs/done/m10-04-svg-scp-definitivo/m10-04-scp-aprovacao.html),
paleta/fundos e crédito foram aprovados em 08/10/2026. `app-icone` oferece `scp`/
`criatura` (oficial) e `contratados` (marca própria). Assets preenchidos e crédito
distribuído em `frontend/public/marcas/`; geometria própria existente preservada.
Uso, escalas, tokens de ameaça e licença: [MARCAS.md](MARCAS.md).
Essa decisão prevalece sobre o uso anterior do logo oficial no exemplão.

### Blocos ricos de Regras (M10-07)

Dossiês/origens usam `app-cartao`, Vida/Energia/Defesa usam `app-stat` com valor
projetado e ícone de recurso. Arquétipos usam `app-abas` com ícone, habilidade inicial,
habilidades e melhorias gerais. Habilidades e equipamentos formam grades densas de
duas colunas que recolhem a uma no celular. Danos Uma/Duas Mãos têm chips distintos;
modificações conservam ■□ e Bloqueia. Cinco módulos permanecem V → I, com tooltip
explícito de Energia Máxima; identidade/atributos/roteiro e ficha do Guia preservam
texto explicativo e âncoras. Ameaças usam a marca própria com paleta/fundos M10-04.

**Revisão visual (`revisao-visual-regras`, 08/10/2026):** abertura em cartão centralizado;
Atributos, Maestrias, Penalidades de Energia e Sequelas em grade de termos (`.t12`);
subclasses com custo em quadro roxo, Vida/Energia em `app-stat [faixa]` e habilidade inicial
em quadro dourado (`regras-destaque`, mesma família de `regras-nota`); painel de arquétipo e
de subclasse em 2 colunas, uma no celular/painel estreito (container query). Custo de
habilidade em `app-chip severidade="energia"`, Reação em `severidade="ajuda"`. No texto
corrido, as palavras Vida/Energia (maiúscula, palavra inteira) ficam em `--vida`/`--energy`.
Tabelas de layout sem assinatura viram `grade`, uma célula por caixa.
Comparação pessoal com exemplão e app real, quatro tamanhos e duas bases:
[verificação](../specs/done/m10-07-blocos-ricos/m10-07-verificacao.md).

### Trio de recursos (`icones-recursos-sistema`, entrega 1)

`vida`, `energia` e `defesa` são a exceção preenchida do `app-icone`: coração cheio
sem pulso (opção A confirmada pelo autor em 08/10/2026), raio e escudo do exemplão.
Herdam `currentColor`, sem stroke; valores têm rótulo acessível e `appTooltip` por
extenso. Conferidos em 14/16/24px, claro/escuro. A adoção no restante do site permanece
aberta na [spec avulsa](../specs/active/icones-recursos-sistema.spec.md).

### Dano, categoria de habilidade, fragmento e reação (`icones-dano-habilidade-fragmento-reacao`)

Família de contorno (mesmo traço `1.75`, `currentColor`, decorativa com `aria-hidden`) votada na
prancha da entrega 3 de `icones-recursos-sistema`. O ícone **acompanha** o texto do conceito, nunca
o substitui; onde ele é a única pista, o consumidor fornece `appTooltip`. Desenhos e votação em
`docs/specs/done/icones-dano-habilidade-fragmento-reacao/`.

| Família | Nomes em `IconeNome` | Desenhos |
|---|---|---|
| Tipo de dano | `dano-fisico`, `dano-balistico`, `dano-explosao`, `dano-quimico`, `dano-geral`, `dano-composto` | Punho, projétil, estouro duplo, béquer, escudo rachado, círculo meio a meio |
| Categoria de habilidade | `habilidade-geral`, `-geral-melhorada`, `-classe`, `-arquetipo`, `-subclasse`, `-outra-classe`, `-personalidade`, `-especialidade`, `-civil`, `-unica` | Estrela, estrela sobre base, bandeira, árvore, ramo fundo, troca, silhueta, medalha, crachá, gema |
| Fragmento | `fragmento-construtor`, `fragmento-potencializador` | Prisma, cristal radiante (substituem o diamante com selo; `link`/`chama` mantêm o selo) |
| Reação | `reacao-esquiva`, `reacao-bloqueio`, `reacao-contra-ataque` | Vento, escudo e impacto, espada atrás do escudo |

`habilidade-personalidade` (silhueta) é parente próximo de `civil` (identidade); os dois só
convivem em telas diferentes, e o texto ao lado desfaz a dúvida.

### Ícones de identidade (`m10-03`)

O catálogo canônico `app-icone` (`frontend/src/app/shared/icone/`) reúne a família de
identidade decidida no [exemplão de Regras](../specs/done/m10-regras/m10-regras-exemplao.html), objeto
`ICO`, opção `dec`. SVGs de contorno em `viewBox="0 0 24 24"`, traço `1.75`, pontas e
junções arredondadas; herdam `currentColor`, sem cor própria, nas bases clara e escura.
A mira de Mercenário conserva o ponto central preenchido; Assassino conserva a rotação
de 45°. Como os demais ícones, são decorativos (`aria-hidden`): o consumidor fornece
o rótulo acessível quando os usa em um controle.

| Família | Nomes em `IconeNome` | Desenhos aprovados |
|---|---|---|
| Classes | `combatente`, `especialista`, `suporte` | Espadas cruzadas, bússola, cruz em círculo |
| Arquétipos do Combatente | `lutador`, `mercenario`, `vanguarda` | Halter, mira, escudo com avanço |
| Arquétipos do Especialista | `engenheiro`, `assassino`, `academico` | Chave, adaga a 45°, capelo |
| Arquétipos do Suporte | `paramedico`, `diplomata`, `comandante` | Cruz, balança, divisas |
| Subclasses de experimento | `bestial`, `artificial`, `hibrido` | Garras, circuito, hélice |
| Personagem/ficha | `civil`, `npc` | Silhueta, peão |

Destinados aos dossiês de Classe, arquétipos, subclasses e blocos do Guia no leitor de
Regras (M10-07), e disponíveis a outros consumidores. A M10-03 só acrescenta os 17 nomes:
não substitui ícones nas telas atuais. `criatura` entrou no catálogo pela M10-04.
Refinos de Suporte × Paramédico, espadas pequenas e silhueta
permanecem em `IDEAS.md` I-050; recursos Vida/Energia/Defesa seguem a seção do trio acima.

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
aceitas hoje são `primario` (estado ativo), `secundario` (informação neutra), `sucesso` (novidade ou
ganho, `--positive`; o "Novo" da lista de versões, pn-10), `aviso` e `perigo`.
O tom `sutil` é a receita padrão, com fundo a 12% e borda a 40% da cor; `contorno` preserva um
aviso contextual que não deve competir com o conteúdo. Ícones `app-icone` podem ser projetados no
chip de severidade quando acrescentam significado; chip não é botão, nem controle removível — para um termo removível, `app-ficha-termo` (abaixo).

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
  já mora na barra acima da lista). `[tamanho]="'compacto'"` (`P-055`) mantém a mesma moldura
  tracejada e só reduz o padding, para caber dentro de listas já contidas por outro cartão
  (iniciativa, log de encontro, habilidades/ataques/resistências de criatura, sanidade, inventário).
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
ao redor dele ou no slot `[barraRecursoAcao]`. Sanidade fica de fora: `sistema-v4.1.4.md`
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

- **`.modal`** — sobre `<dialog>` nativo, `showModal()`. A API `posicao="inferior"`
  apresenta folha inferior no mobile e conserva o modal central no desktop; posição
  padrão `centro` permanece igual. Foco, Escape, backdrop e trava de rolagem são do
  mesmo primitivo. Bloqueia: o fundo escurece
  (`::backdrop`) e nada atrás dele recebe foco ou clique enquanto está aberto. Centralizado
  na posição padrão, nunca arrasta. Use para uma decisão pontual que precisa da atenção inteira do usuário antes de
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
some com `[hidden]`, não `@if`, ao minimizar, preservando o estado interno
dos consumidores. O antigo leitor foi removido na M10-11; Regras usa memória
de leitura própria. A Biblioteca flutuante
(`BibliotecaFlutuante`, `m9-11`) usa o mesmo primitivo — ver "Biblioteca de documentos".
A premissa de reuso do leitor antigo foi retirada na
[atualização da M9](../specs/done/m9-documentos-campanha/atualizacao-m10-11.md).

`app-coluna-acoes` (`shared/ui/coluna-acoes/`, `campanha-detalhe-mestre-coluna-acoes.spec.md`) é uma
quarta forma, mais próxima do painel lateral de 500px que do painel flutuante: participa do fluxo
normal do layout (flex, nunca `position: fixed`) e empurra o conteúdo ao expandir/retrair em vez de
sobrepor. Substitui `.utilitario-flutuante` só na visão de mestre da campanha por ora — os outros 6
consumidores de `.utilitario-flutuante` (ficha, Iniciativa, campanha do jogador) migram em specs
futuras, mesmo padrão de rollout gradual de `ui-28`…`ui-32`. A visão do **mestre** da Iniciativa
migrou na `ui-37` e a do **jogador** na `ui-39` (ambas abaixo) — as duas com a coluna de ações.

`app-coluna-acoes-item` aceita `[pressionado]` (`boolean | null`, `ui-37`) para item de
**alternância** (Editar combatentes, Selecionar combatentes, Adicionar avulso): vira `aria-pressed`
e ganha o mesmo destaque `--ativo` do item de rota, sem o `aria-current="page"` que só cabe a rota.
`null` (padrão) mantém o item comum.

### Iniciativa — visão do mestre (`ui-37`)

Composição aprovada na POC "Tela de Iniciativa" (v9): **coluna de ações | trilha de turnos | coluna
de rolagens | palco**, sobre a casca de `detalhe-mestre` (coluna 56/200px encostada na topbar e na
borda; conteúdo com o restante da largura). Só existe para o mestre — o jogador tem a própria visão
(`ui-39`, abaixo), com a mesma casca. **Sem combate aberto (`ui-38`)** a casca fica (coluna com
"Novo combate" + Ferramentas, cabeçalho "Iniciativa" sem nome/chip) e o palco vira um
`app-estado-vazio` com a ação **Novo combate**, que abre um `app-modal` "Novo combate" (campo
"Nome do encontro" em `app-campo`, Cancelar/Abrir combate; Enter envia). Lendo um encontro
encerrado, o cabeçalho mostra "Combate atual" só se houver combate aberto — senão, "Novo combate".
**Combates encerrados:** com um encontro na tela, o gatilho "N encerrados" do cabeçalho abre um menu
ancorado (`.historico__menu`, mesmo desenho do dropdown de perfil da topbar: fecha pelo botão, ao
escolher ou com `Escape`; não fecha por clique-fora) — uma linha por combate (nome, data de criação,
rodadas e combatentes, seta) que abre o registro. Sem combate aberto o gatilho some e a lista vira
a seção "Combates anteriores" (cartões) logo abaixo do estado vazio.

- **Trilha** (`app-trilha-turnos`, 262px): contadores Rodada/Turno, uma posição por slot da rodada
  (Cadência > 1 repete), avatar 36px, nome em até 2 linhas, iniciativa à direita. Item ativo em
  `accent` a 12% + borda `--accent`; quem já agiu recua só pelo avatar (mesma regra do cartão,
  `ui-16`). No tablet vira faixa horizontal de chips de 56px sem nome.
- **Rolagens** (`app-historico-rolagens-sidebar [fixo]`, `clamp(300px, 23.44vw, 450px)`): mesmo
  cabeçalho, item e resultado compacto do painel lateral, como coluna da página (sem gatilho, sem
  fundo, sem fechar); a lista rola por dentro do container posicionado que a hospeda.
- **Palco:** `app-conducao-turno` (voltar · quem age · avançar primário · Encerrar `perigo`; em
  montagem, Pedir/Rolar iniciativas e Iniciar combate; encerrado, só o estado) sobre
  `app-resumo-combatente` (280px: foto **quadrada** na largura da coluna, Vida/Energia, Reações em
  2 colunas e Resistências em **3 + 2**, caixas `.ficha-mini`/`.ficha-resistencia` da ficha de
  campanha) ao lado da grade `.grade--compacta.grade--palco` (`repeat(auto-fill, minmax(260px,
  1fr))`).
- **Regra vence o mockup:** criatura só com Defesa; avulso e NPC sem Resistências
  (`resistencias: null`); o agente sem Contra-ataque mostra a caixa tracejada "—".
- **Responsivo:** `bp.tablet` empilha (trilha → palco → rolagens) e a ficha resumida vira linha (foto
  84px); `bp.mobile` transforma `app-coluna-acoes` na barra inferior fixa e devolve o cartão às
  métricas cheias — a condução fica no fluxo da página, não em rodapé fixo próprio.
- **Ordem de leitura:** a grade e a trilha usam as mesmas funções puras de
  `encontro-leitura.util.ts`; nenhuma regra de iniciativa/Cadência vive na UI.

### Iniciativa — visão do jogador (`ui-39`)

Mesma casca da visão do mestre — **coluna de ações | trilha | Rolagens | palco** —, em que o palco é a
**própria ficha** do jogador e as ações dele moram no topo da trilha (mock aprovado "POC Iniciativa do
jogador"). A tela é uma **casca** (`PainelCenaShell`, desde a `m7-23` o painel de uma cena com iniciativa) que resolve o papel e monta
`PainelEncontroMestre` ou `PainelEncontroJogador`, no molde de `detalhe-shell`; o layout comum das
duas vive no parcial `paginas/_casca-iniciativa.scss` (mixin `casca`), incluído por cada página com o
próprio bloco BEM (`iniciativa-mestre`/`iniciativa-jogador`) — e também pelo hub de cenas
(`hub-cenas`), que não usa a coluna de ações, e pelos painéis de cena sem iniciativa
(`cena-mestre`/`cena-jogador`, `m7-24`: a mesma composição **sem a trilha** — coluna de ações |
Rolagens | palco com a grade de agentes do Esquadrão ou a própria ficha). Quem inclui o mixin herda os elementos dele
(`__linha`, `__trilha`, `__palco`...): não reutilize esses nomes para outra coisa no próprio bloco.

- **Coluna de ações:** só **Ferramentas** (Calculadora, Caderno, `[pressionado]`). No mobile, com a
  ficha no palco, ela some — a barra fixa do rodapé colide com a `.ficha-nav` do cartão de ficha (mesma
  faixa) — e as duas ferramentas sobem para o cabeçalho como `app-botao-icone` (a saída do
  `detalhe-jogador`). Sem ficha em campo a coluna continua sendo a barra inferior.
- **Trilha** (`app-trilha-turnos`): os mesmos contadores Rodada/Turno e, logo abaixo, o **bloco de
  ação** (`app-acao-jogador`, projetado em `[trilhaAcao]`; `.trilha__topo` agrupa os dois). O item do
  próprio jogador ganha o subtítulo **"Você"** (`--accent`, negrito) e, sem ninguém na vez, é o alvo
  do rolar-até-o-item. O mestre não passa nenhum dos dois e a trilha é a de sempre.
- **Bloco de ação** (moldura acesa como a `app-conducao-turno`, `--acesa` em `accent` a 9%): **rolar**
  (montagem, sem iniciativa — botão primário "Rolar iniciativa"; acende quando o mestre chamou),
  **aguardando** ("Iniciativa N"), **minha vez** (nome, "N ação/ações restante(s)" e "Avançar turno"),
  **vez de outro** ("Age agora" + "Faltam N turnos para a sua vez." / "Você é o próximo.", de
  `turnosAteAVez`), **assistindo** (sem combatente em campo) e **encerrado** (sem botões).
- **Palco:** o `app-ficha-campanha-card` da própria ficha ocupando toda a largura, **sem cabeçalho de seção**
  (`[mostrarTopo]="false"` também dispensa a faixa "Ficha de Jogador · FICHA-JGD-NNNN" — o nome já está no
  cartão; a região é nomeada "Minha ficha" só para leitor de tela). Sem combatente com ficha em campo
  (quem só assiste) o palco é a grade de leitura `.grade--compacta.grade--palco`; sem encontro, um
  `app-estado-vazio`.
- **Responsivo:** ≥ 1600px, três colunas (trilha 262px | Rolagens `clamp(300px, 23.44vw, 450px)` | palco),
  com trilha e Rolagens `sticky` na altura da janela enquanto o palco rola. **1081–1599px:** trilha e
  Rolagens dividem **uma só coluna** de 300px empilhada (3 : 2), também `sticky` — o cartão de ficha só
  empilha pela largura da *janela* e pede ~700px de palco (Identidade e Status lado a lado), o que três
  colunas não deixam num notebook. ≤ 1080px (`bp.tablet`) empilha (trilha em faixa, com o bloco de ação ao
  lado dos contadores → ficha → Rolagens); `bp.mobile` põe o bloco de ação na linha inteira, com a ação
  primária já na primeira tela.
- **Saíram:** a coluna lateral de 70% e a divisão `iniciativa-tela`, o botão "Minha ficha" do cabeçalho, o
  histórico flutuante de rolagens, o chip "Espectador" e os contadores redundantes do mobile. Quem tem
  ficha em campo deixa de ver a grade de cartões (e de abrir a ficha de um colega por ela).

O corpo projetado pelo primitivo é uma **coluna flexível** (`flex: 1; min-height: 0`): controles
fixos de cada consumidor ficam no fluxo normal, e a região que deve preencher o restante declara
o seu próprio `flex: 1; min-height: 0`. Esse contrato mantém caderno, leitor e futuros utilitários
com a altura íntegra sem obrigar calculadoras ou conteúdos naturalmente compactos a crescer.

### Documento de contenção (`app-documento-contencao`, pn-04)

A moldura "Terminal de Contenção" das telas de recusa e erro — cabeçalho `// PROTOCOLO DE CONTENÇÃO`
com o código, faixa de classificação, bloco da Fundação, mensagem, registro expurgado, avisos e
rodapé com ações — é um componente compartilhado (`shared/documento-contencao/`), usado pela tela de
Acesso negado (`403`) e pelos estados 404 (versão inexistente) e 503 (falha ao carregar) dos
patchnotes. Só apresenta: textos por input, ações projetadas em `[acoes]` (`app-botao`; a de ênfase
leva `contencao__acao`, a secundária soma `contencao__acao--neutra`). Não traz `<main>` nem
posicionamento (cada tela centraliza a sua) e usa `ViewEncapsulation.None` para as classes
`contencao__*` alcançarem os botões projetados. Tom SCP no enquadramento, mas sempre com uma frase
direta do que houve e do que fazer.

### Versão do sistema na topbar (pn-01)

Chip de versão (`app-botao` `secundario`/`contorno`, tamanho compacto na classe `topbar__versao`) ao
lado da marca, com ponto `--accent` enquanto há versão que este navegador ainda não viu; some no
mobile (`bp.mobile`), onde vira o item "Novidades" (com o mesmo ponto) dentro do menu do perfil.
Ambos levam a `/patchnotes`. Página `/patchnotes`: lista de versões à esquerda (faixa horizontal no
mobile, por *container query* de `720px`), nota à direita em cartão. A nota tem **grupos** (`# Título`
→ título mono `// PARA OS PLAYERS` com filete) e **blocos** (`## Título`): os blocos de balanço Novidades
(`--positive`), Melhorias (`--energy`) e Correções (`--warning`) usam o rótulo miúdo com quadradinho
colorido; qualquer outro título é uma **funcionalidade**, com título de seção em sans 15px e o texto
abaixo. O Markdown é renderizado por `renderizarMarkdownSeguro`.

### Página de leitura em trilhos (`/patchnotes`, pn-08)

Padrão para páginas de leitura longa com navegação lateral. A largura vem dos **trilhos**, nunca do
parágrafo. Tudo por *container query* do próprio `.patchnotes` (não do viewport), então vale igual
com a tela dividida:

| Largura do contêiner | Zonas |
|---|---|
| `≥ 1240px` (inclui 1366) | três colunas: versões `250px` · nota fluida · trilho direito `260px` (reservado ao sumário "Nesta versão", pn-09) |
| `720–1239px` | duas colunas: versões `250px` · nota; o conteúdo do trilho direito vai para o topo da nota |
| `< 720px` | uma coluna; versões em faixa horizontal |

- **Contêiner** com `max-width: 1400px` (era 1120px).
- **Trilhos `sticky`** sob a topbar: `top: calc(var(--altura-topbar) + var(--space-16))` e
  `max-height: calc(100dvh - var(--altura-topbar) - 2 * var(--space-16))` com `overflow-y: auto`
  (rolagem interna: em notebook a lista não cabe inteira). Análogo: `.criar__resumo`.
- **Cabeçalho compacto** no topo do trilho esquerdo, sobre um filete: eyebrow `// Patchnotes`, `h1`
  mono 15px e, na ponta direita, o botão do ADMIN (`app-botao-icone`). Sem faixa própria nem frase de
  apresentação. O `h1` continua único.
- **Medida de leitura**: o Markdown sobe de 14px/66ch para no máximo **15px/70ch**, e só em três zonas.
- Estados de contenção (404/503) ficam centralizados **fora** do grid.

### Lista de versões dos patchnotes (pn-10)

Cada item: número mono, selos `app-chip` (`primario` "Atual" na mais recente; `sucesso` "Novo" nas
versões depois da última visita), data e título em até duas linhas (`appClampTruncado` + `appTooltip` só
quando cortado). No trilho vertical os itens se agrupam por `MAJOR.MINOR` sob um rótulo mono `v1.4.x`; a
faixa horizontal do mobile não tem rótulos e os itens ficam mais largos (168–220px). Com versões novas,
uma linha `--positive` no topo ("N versões novas desde a sua última visita"). O "Novo" vem da chave
`versao-vista` lida **antes** de `marcarVista()` (`VersaoService.vistaAnterior`).

### Resumo, rodapé e voltar ao topo dos patchnotes (pn-11)

- **Resumo** (`# RESUMO…` só com texto): cartão logo após o cabeçalho da nota — `--bg`, filete `--accent` à
  esquerda, rótulo mono `// Resumo da versão`. Sai do fim da nota; a âncora do capítulo é a mesma e, no
  sumário, ele é o primeiro item ("Resumo").
- **Rodapé**: a versão mais nova à esquerda (`←`) e a mais antiga à direita (`→`), na ordem da lista, `app-botao` `estilo="link"` `tamanho="pequeno"` com o
  número sublinhado e o título como linha de apoio (sem sublinhado nem caixa alta); empilham no mobile.
  Trocar de versão sem fragmento volta ao topo da nota.
- **Voltar ao topo** (aparece depois de ~400px de rolagem): em três zonas, `app-botao` `secundario`/
  `contorno` no fim do trilho direito (`sticky`); abaixo de 1240px, `app-botao-icone` flutuante no canto
  inferior direito (`sticky` no fim da coluna — `fixed` não serve: o contêiner de container query contém
  descendentes fixos). Ícone `chevron` girado 180°. O clique rola ao topo, limpa o fragmento da URL
  (`replaceUrl`) e zera o destaque do sumário. Voltar ao topo **rolando** (de volta a ~0px depois de ter saído) faz o mesmo
  com o fragmento: um F5 não leva de volta ao capítulo.

### Sumário "Nesta versão" (`sumario-patchnote`, pn-09)

Componente **local** dos patchnotes (decisão do autor: vira `app-sumario` em `shared/ui/` só se surgir um
segundo uso). Grupos viram rótulo mono em caixa alta (`10.5px`, `--tracking-label`) e blocos viram
itens sans `12.5px` com o título completo; o item ativo usa `aria-current="location"`, fundo
`--surface-2` e filete `--accent` à esquerda, e o grupo dele sobe para `--text`. Posição: trilho direito
`sticky` em três zonas; abaixo de `1240px` do contêiner, `<details>` "Nesta versão · N capítulos" no
topo da nota, fechado por padrão (fecha ao navegar). No mobile, `summary`, rótulos e itens têm `44px`.
*Scroll-spy*: `IntersectionObserver` numa faixa de 1px na linha de leitura (`scroll-margin-top` + 1px) —
vale o último título que a cruzou. O item ativo é mantido visível rolando só o trilho.

### Biblioteca de documentos (`m9-04`)

A página **Biblioteca** (`/campanhas/:id/documentos`; o rótulo não é "Documentos" porque esse é o
leitor das regras na topbar) junta dois análogos aprovados: a **casca do hub de cenas** e a
composição **lista | conteúdo do Caderno**. A `m9-05` (visão da mesa) reusa a mesma composição sem
os controles do mestre.

- **Casca:** o mixin `casca` de `_casca-iniciativa.scss` com o bloco `biblioteca`, sem coluna de
  ações — cabeçalho com voltar, `//`, "Biblioteca", nome da campanha, régua e a ação principal
  (`app-botao` `primario` `pequeno`, "Novo documento"); divisor de seção "Documentos" com a contagem.
- **Lista** (360px no desktop): `ol` de **`.documento-cartao`**, a receita do `.cena-cartao` do hub
  (superfície, borda, raio de cartão, hover com `--accent-border`). O cartão leva o ícone do tipo
  (`anotacoes` para texto, `imagem` para imagem), o título em mono e, abaixo, o rótulo do tipo e o
  **chip de estado**: `Revelado` (`severidade="primario"` + `olho`) ou `Oculto` (`secundario` +
  `olho-fechado`). O aberto fica com a borda de destaque parada e o ícone em `--accent`. As setas de
  ordem são as do hub (`app-botao-icone` `padrao` + `chevron` girado), desabilitadas nos limites.
- **Seleção (`m9-07`):** clicar de novo no cartão aberto fecha o painel; `aria-pressed` reflete
  a seleção e o foco permanece no cartão. Com rascunho, o mestre confirma o descarte. O resultado
  da busca apenas abre: clicar no documento já aberto mantém o painel.
- **Painel** (resto da largura): a caixa do cartão (`--surface`, borda, raio) com o cabeçalho do
  documento (ícone + título, chip de estado e as ações `Revelar`/`Ocultar`, `Editar`, `Remover` em
  `app-botao` `pequeno`) e o corpo — o `app-leitor-documento` ou, no mesmo lugar, a edição (título em
  `app-campo` + `campo__controle`, texto no `app-editor-markdown`, limites de `shared` como dica).
  Na edição, as ações do cabeçalho saem e o rodapé traz `Cancelar`/`Salvar`. Sem documento aberto,
  um `app-estado-vazio` sem a caixa; sem nenhum documento, o painel nem aparece (o vazio da lista
  basta).
- **Importação (`m9-08`):** na edição de texto, "Importar Markdown" fica abaixo do editor ao lado
  da dica de caracteres, na mesma receita de "Trocar imagem" (`biblioteca__upload`, `app-botao`
  secundário pequeno + ícone `importar`). Lê `.md`/`.markdown` localmente, confirma a substituição
  quando há texto e mantém o título. O aviso inline (`role="status"`) informa sucesso/erro; só
  Salvar grava e comunica à mesa. No mobile, o botão mantém alvo de 44px.
- **Leitor** (`app-leitor-documento`, também do palco da Investigação na `m7-25`): texto pelo
  editor Markdown em somente leitura, dentro da borda do cartão; imagem num quadro `--bg` com
  esqueleto até carregar, `app-estado-vazio` se a URL falhar e a alternância `tamanho-real` ↔
  `ajustar-largura` (`app-botao-icone` com `aria-pressed`; no tamanho real o quadro rola e recebe
  foco).
- **Conflito de versão:** faixa de aviso inline no editor (`--warning` a 12% de fundo e 40% de borda,
  a receita do chip `aviso`) com `Recarregar` (`app-botao` `aviso` `contorno`) — nunca um toast
  genérico, e o rascunho continua no editor.
- **Mobile:** duas vistas, como o Caderno — a lista, ou o documento com um "voltar" (`app-botao`
  `secundario` `texto`, "Documentos") que só existe abaixo de `bp.mobile`. Ações e setas passam ao
  alvo de 44px.
- **Faixa 561–1080px (`m9-06`):** sem breakpoint próprio — a lista fixa de 360px ao lado do painel
  (o mesmo arranjo do desktop) já cabe sem espremer em `960×1080`, a tela dividida de referência do
  projeto; abaixo de `bp.mobile` (560px) o layout já virou as duas vistas do celular. Título de até
  120 caracteres na lista usa a mesma receita de `.trilha__nome` (`trilha-turnos.component.scss`) —
  `-webkit-line-clamp: 2` em vez de só `overflow-wrap`, que deixava o cartão com a altura de um
  título de oito linhas; o painel do documento aberto continua sem clamp (o título precisa ficar
  legível por inteiro quando lido).
- **Estrutura comum (`m9-05`):** casca, coluna da lista, painel e as duas vistas do celular moram
  em `app-biblioteca-layout` (`modules/documento/componentes/`), usado pelas três visões. O que é
  só do mestre entra por projeção (`[bibliotecaAcao]`, `[bibliotecaAcoesDocumento]`,
  `[bibliotecaCorpoDocumento]`) e por input (`mostrarEstado` liga os chips, `ordenavel` as setas).
  O cartão é o `button[app-documento-cartao]`, o mesmo na lista e na busca. Desde a `m9-11`, a
  lista e o documento aberto são o `app-biblioteca-corpo` (o host **é** o `.biblioteca__corpo`, sem
  nó novo — a página ficou idêntica pixel a pixel nas três visões e nos quatro viewports), que o
  layout monta reprojetando os dois slots de documento, e o painel flutuante monta direto.
- **Documentos da cena do espectador:** na Investigação ativa, coluna de vínculos revelados com
  `DocumentoCartao`, índice biblioteca e `LeitorDocumento` em `Modal`, abertura voluntária. Usa
  como análogos a lista/modal do jogador sem iniciativa e a casca própria espectadora. Desktop
  mantém documentos, rolagens e agentes; tablet/mobile empilham, com cartões na largura disponível.
  Carregamento decorativo em contêiner anunciado, vazio e erro com botão canônico de tentar
  novamente. Não exibe presença ou controles de mestre. Evidências comparadas em
  `docs/specs/done/espectador-documentos-cena/RELATORIO.md`;
  capturas locais em `.artifacts/espectador-documentos-cena/`.
- **Visão da mesa (jogador e espectador, `m9-05`):** a mesma biblioteca **menos** os controles —
  sem "Novo documento", sem chip de estado (para a mesa, tudo é revelado), sem setas e sem ações no
  documento aberto; o cartão ocupa a coluna inteira. Vazio: "Nenhum documento revelado ainda." /
  "O que o mestre revelar aparece aqui ao vivo." Um documento revelado entra na lista ao vivo, mas
  **nada abre sozinho**; o aberto que é ocultado ou removido fecha com o aviso "Este documento não
  está mais disponível." (notificação `aviso`). O espectador tem a rota própria
  (`/campanhas/:id/espectador/documentos`), com o voltar ao painel do espectador; nas prévias do
  mestre o item "Biblioteca" fica desabilitado com o tooltip "Biblioteca indisponível na prévia".
- **Busca (`m9-05`):** no topo da coluna da lista, abaixo do divisor — `app-campo` "Buscar" com o
  ícone `busca` dentro do controle (input `icone` do primitivo, que acende em `--accent` no foco) e
  `inputmode="search"` (não `type="search"`: o "×" nativo fugiria dos tokens). Com termo, os
  resultados tomam o lugar da lista e o divisor vira "Resultados" com o total. Cada resultado é o
  mesmo cartão com o **trecho** abaixo (12px `--text-dim`, até três linhas) e o termo num `<mark>`
  com fundo `--accent-dim`, sublinhado `--accent-border` e texto `--text` 600 — o trecho é
  segmentado em texto, nunca `innerHTML`. Estados: esqueleto, `app-estado-vazio` "Nada encontrado."
  com o termo citado, erro com "Tentar de novo", e "Carregar mais" (`app-botao` `secundario`
  `contorno` `pequeno`) enquanto houver páginas. O chip Revelado/Oculto só aparece para o mestre.
- **Presença de leitura (`m9-10`, só o mestre):** quem está com o documento aberto agora. No cartão
  (lista e busca), mais um `app-chip` na linha de meta, depois do chip de estado: `severidade=
  "primario"` **`tom="contorno"`** + ícone `olho-membros` e a contagem ("1 lendo", "3 lendo") —
  mesma cor do Revelado, mas sem fundo e com o olho + pessoa, para não ser lido como estado
  (decisão do autor). Sem leitores, nada aparece (nunca "0 lendo"). O tooltip (`appTooltip`) lista
  os nomes ("Ana, Bruno e Carla (espectador)"); os mesmos nomes vão escondidos (receita de texto
  oculto da `coluna-acoes-item`) no rótulo acessível do cartão. No documento aberto, uma linha
  própria abaixo do título e do chip de estado: rótulo "Lendo agora" no tom do rótulo do tipo (mono
  10px caixa-alta, `--text-mute`, ícone `olho-membros`) e um `app-chip` `secundario` `contorno` por
  nome, o espectador com "(espectador)"; some quando ninguém lê. Sem `aria-live` — presença muda o
  tempo todo e seria ruído. Jogador e espectador não recebem o dado nem o indicador.
- **Forma flutuante (`m9-11`):** a Biblioteca também abre em `app-painel-flutuante` (`id=
  "biblioteca"`), na casca do Caderno — sem gatilho próprio, pelo item "Biblioteca" (`icone=
  "biblioteca"`, `[pressionado]` enquanto aberto, mesmo minimizado) da coluna de ações das cenas
  (com e sem iniciativa), da ficha completa (categoria "Ficha", logo depois de Caderno, só com
  campanha), da tela da campanha e do Painel do espectador (`m9-12`, forma leitura; o botão da
  página leva à rota dele, `/campanhas/:id/espectador/documentos`) — nesses dois o item deixou de
  navegar; nos menus "⋯" e nos atalhos de
  cabeçalho do celular, junto de Calculadora/Caderno. Título `Biblioteca · <campanha>`, kicker
  "Arquivo da campanha". Posição inicial `{ x: 320, y: 112 }`, em cascata com o Caderno (`{ 280, 72
  }`): abertos juntos, os dois cabeçalhos ficam à vista. Tamanho padrão 960×680, mínimo 440×480,
  e fora do maximizado a janela nunca cobre a faixa da coluna de ações (240px): na tela dividida
  ela fica com 720px em vez de cobrir o item que a fecha. O corpo é o mesmo da página; dentro da
  janela, lista e documento rolam cada um por dentro, e abaixo de **800px de janela**
  (`@container`, a janela é o container) vira as duas vistas do celular — no celular, folha cheia.
  Jogador e espectador só leem e buscam. O mestre vê os ocultos com o chip de estado, alterna
  `Revelar`/`Ocultar` (mesmo `app-botao` `pequeno`, mesma trava do `IMAGEM` sem arquivo com a nota
  "Envie a imagem para poder revelar este documento.", mesmo toast) — e o aberto **não** fecha
  quando ele mesmo oculta — e, desde a `m9-13`, **cria e edita no painel**: "Novo documento"
  (`app-botao` `primario` `pequeno` + `mais`, a receita do cabeçalho da página) no fim do divisor
  "Documentos" da lista, também com a lista vazia; abre o mesmo dialog da página, fora da janela.
  O criado abre já em edição; "Editar" (`secundario` `pequeno`, ao lado de Revelar/Ocultar) reabre
  a edição, que é o mesmo componente da página (`DocumentoEdicao`) — só que, na janela, o editor
  estica até o rodapé Cancelar/Salvar ficar no fim dela, sem rolar. Com rascunho, trocar/fechar o
  documento, criar outro, fechar o painel e sair da tela pedem o "Descartar alterações?" da página;
  minimizar e maximizar não descartam. Remover e reordenar ficam **só na página**, aberta pelo
  `app-botao-icone` "Abrir página da Biblioteca" do cabeçalho (glifo `biblioteca`, distinto do
  `abrir-externo` do "Abrir em janela" do Caderno). Estados próprios: vazio do mestre "Nenhum
  documento ainda." com o apoio da página (o do jogador é o da mesa) e erro de carga
  (`app-estado-vazio` `alerta` + "Tentar novamente", `secundario` `contorno` `pequeno`). Sem
  presença "N lendo" no painel (só na página).

Na Investigação, o cartão em foco também alterna: o segundo clique limpa o leitor do palco e
mantém a grade de Agentes. Essa seleção continua independente da Biblioteca flutuante e da
abertura voluntária da mesa. Falha de recuperação do leitor usa `app-estado-vazio` compacto
com ícone `alerta` e `app-botao` secundário/contorno/pequeno "Tentar novamente", com alvo de
44px no celular; nenhuma variação local de controle. O leitor do mestre permanece acima dos
agentes, conforme a `m7-25`.

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
para sobrescrever esse valor com `0.4` ou `0.6` (`receber-dano-dialog`,
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

### Barra do editor Markdown (`app-editor-markdown`)

Desfazer · Refazer ficam numa área fixa à esquerda, fora da rolagem (depois de um erro têm de
estar à vista). Ao lado, a faixa de formatação de `app-botao-icone tamanho="compacto"` em grupos
separados só por espaço (H1 · H2 | Negrito · Itálico · Código em linha | Lista · Lista numerada ·
Citação | Inserir tabela); formatos alternáveis usam `[ativo]` + `aria-pressed` e desligam com um
segundo clique (não há botão "texto normal"; bloco de código se faz digitando ```). Com o cursor
numa tabela aparece a **faixa contextual** de `app-botao tamanho="pequeno"` com rótulos que se
explicam sozinhos, na ordem de uso: Texto abaixo · + Linha abaixo · + Linha acima · Remover
linha · + Coluna à direita · + Coluna à esquerda · Remover coluna · Apagar tabela (remoções em
`perigo`) — ícones de linha/coluna parecidos entre si eram a principal queixa. Fora do celular
essa faixa é uma **grade 4 × 2** de colunas alinhadas (linha em cima, coluna embaixo, espelhadas;
"Texto abaixo" e "Apagar tabela" empilhados na 1ª coluna), com os botões na altura dos de ícone
(26px) e rolagem lateral quando não cabe. No mobile cada faixa é uma linha só com rolagem lateral
e degradê; dentro de tabela cabe **uma faixa por vez**,
trocada pelo botão "Formatar"/"Tabela" ao lado do histórico. Com foco, a barra se prende acima do
teclado virtual (`visualViewport`) em `z-index: 20` — acima de `app-coluna-acoes` (15), abaixo das
janelas arrastáveis (1200+). **Campo curto (`[compacto]`):** sem barra fora de uso; com o campo em
uso, a barra aparece numa linha **embaixo** do texto (em cima empurrava o texto ao aparecer) e só a
área de texto rola, para a barra continuar visível com o campo redimensionado.

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
  (`width`/`height: 5px` — metade dos 10px originais, a pedido do autor; no Firefox a largura é
  `thin`, o mínimo que o navegador oferece). No `:hover`, o contorno passa a `--accent-border`
  (realce sutil — **nunca** `--accent` sólido, reservado para ação/estado ativo).
- **Track / corner:** transparentes.
- **Cross-browser:** `::-webkit-scrollbar-*` (Chrome/Edge/Safari) **ou** `scrollbar-width: thin` +
  `scrollbar-color: var(--border-strong) transparent` (Firefox e a spec padrão) — **uma forma por
  navegador, nunca as duas**. No Chromium ≥ 121 uma propriedade padrão diferente de `auto` desliga o
  `::-webkit-scrollbar` do elemento, e `scrollbar-color` é herdado: declará-la em `html` fazia todo
  container cair na barra nativa de 15px com setas. Por isso as propriedades padrão ficam em `*` e
  voltam a `auto` dentro de `@supports selector(::-webkit-scrollbar)`, onde o pseudo-elemento
  assume. `scrollbar-width` não é herdado, então também precisa ir em `*` (em `html` só cobriria a
  barra da página). Componentes que precisam esconder a barra (abas) usam `scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }` no próprio elemento.
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
