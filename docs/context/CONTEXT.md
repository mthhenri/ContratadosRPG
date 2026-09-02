# CONTEXT.md — Painel do Projeto

> **Formatação do frontend:** `frontend/.prettierrc.json` governa exclusivamente HTML/SCSS
> (`printWidth: 100`, quatro espaços); `npm run format:html-scss --workspace=frontend` é o corte
> manual. `.prettierignore` e `requirePragma` mantêm `.ts`/`.tsx` fora do alcance do Prettier.

> **Última revisão:** 2026-09-02 · **Última decisão registrada:** `ui-22` concluída — variante
> `[compacto]` de `app-resultado-rolagem` (total 22px, pool numa linha), adotada no painel lateral
> de histórico e no feed da campanha; item do histórico com rótulo dentro da caixa e a régua
> curva por ficha na lateral esquerda, mesma receita do item ativo da topbar (ui-21); aria-label
> no dado descartado; duração da barra da bandeja por custom property; glow do crítico em mixin;
> legenda discreta com a expressão de dados abaixo do rótulo (`rolagem.formula`, coluna nova via
> migration `0028`), ausente no teste de Atributo direto; dado descartado por `kh`/`kl` risca na
> diagonal (`::after` com gradiente, `currentColor`) em vez do antigo `text-decoration: line-
> through`.
> Ainda pendente: desligar o Render e reescrever `docs/DEPLOY.md` (cutover pro Cloud Run) — ver
> seção 1.
> O relato de cada decisão anterior (o *porquê* e o *como*, task a task) está em `HISTORY.md`.
>
> Este arquivo diz **o que é verdade agora**. Ele é **reescrito**, nunca acrescido — teto de
> ~400 linhas. O relato de *como se chegou aqui* está em [`HISTORY.md`](HISTORY.md).
>
> Vizinhos: [`PROBLEMS.md`](PROBLEMS.md) (o que está quebrado) ·
> [`MEMORY.md`](MEMORY.md) (onde fica o quê) · [`IDEAS.md`](IDEAS.md) (o que ainda não é sistema) ·
> [`HISTORY.md`](HISTORY.md) (o que aconteceu e por quê).

---

## 1. Próxima Task

**`fix-paineis-flutuantes-corpo-flex` concluída** (spec em `docs/specs/done/`, ainda sem commit):
o corpo projetado por `app-painel-flutuante` agora é uma coluna flexível. O `CadernoFlutuante`, que
projeta escopo, busca e `.caderno__corpo` diretamente nela, volta a expandir lista e editor até a
base da janela, em vez de deixar a maior parte do painel vazia. Filhos naturalmente compactos,
como a calculadora, preservam sua altura porque não recebem `flex: 1`. Testes focados, suíte
frontend completa (1510/1510) e inspeção real no tamanho compacto do relato, `1920×1080` e
`360×800` passaram; build de produção também passou e lint terminou sem erros (mantém os avisos
históricos do repositório).

**`fix-leitor-documentos-altura-pdf` concluída** (spec em `docs/specs/done/`, ainda sem commit):
o leitor agora envolve barra e visualizador em um corpo flexível, para o PDF preencher toda a
altura disponível abaixo dos controles em vez de nascer com os `150px` padrão do `iframe`. A
estrutura também preserva o leitor PDF próprio no mobile. Teste focado, suíte frontend completa
(1508/1508) e build passaram; lint sem erros (somente os avisos históricos). Na aplicação real,
o visualizador mediu `638×371` no cartão compacto de `640×480` que expunha o defeito e `342×633`
no mobile `360×800`, sem área vazia indevida ou overflow horizontal.

**`fix-leitor-documentos-abertura-visivel` concluída** (spec em `docs/specs/done/`, ainda sem
commit): `app-painel-flutuante` agora limita ao viewport uma posição restaurada de
`localStorage`, depois que a janela renderiza e também ao sair de minimizado. Assim o leitor de
documentos não fica parcialmente fora da tela ao reabrir em outro monitor ou tamanho de janela;
arraste, maximização, tamanho e a folha mobile foram preservados. Teste de regressão, suíte
frontend completa (1507/1507) e build passaram; lint sem erros (mantém os avisos históricos). Na
aplicação real, uma posição propositalmente fora da tela (`1800×900`) foi corrigida para
`1280×600` em `1920×1080`; no mobile `360×800`, o painel ocupou `344×784` com margem de `8px`,
sem overflow.

**`fix-coluna-vitalidade-energia` concluída** (commit `306a971`, spec em `docs/specs/done/`): a
grade do bloco Vida/Energia da ficha passou a se ajustar pela largura disponível da própria coluna,
em vez do viewport. Com menos de espaço para duas barras completas, Energia reflui para a linha
seguinte e os steppers continuam integralmente dentro do cartão. Teste focado e build de produção
passaram; lint sem erro novo (somente avisos preexistentes). Verificação ao vivo em `1920×1080` e
`360×800`: `scrollWidth` ficou igual à largura do bloco nos dois casos, sem overflow horizontal.

**`ui-12-tokens-semanticos-de-estado` concluída** (commit `4529cd8`, spec em `docs/specs/done/`):
`--erro`/`--accent-press` desacoplam erro e a severidade `perigo` do `--accent` trocável pelo
usuário; testes focados 36/36, build e lint limpos, verificação visual em
`1920×1080`/`360×800`. Registrou `P-043` (`PROBLEMS.md`), defeito pré-existente exposto durante o
gate, sem relação com o diff de tokens/SCSS.

**`ui-13-chip-com-severidade` concluída** (spec em `docs/specs/done/`, ainda sem commit): `app-chip`
ganhou `[severidade]`/`[tom]` e slot de ícone; as cinco cópias locais da mesma receita
(`indicador-tempo-real`, `historico-rolagens__privada`, `bandeja__visibilidade--privada`,
`combatente__condicao`, `combatente__etiqueta--ameaca`) migraram para o primitivo e perderam a
identidade BEM local. `--radius-selo` promovido a token; `DESIGN.md` documenta as quatro
severidades e a escolha entre chip de rótulo e chip de severidade. Testes focados 33/33, suíte
completa 1462/1463 (única falha é `P-043`, preexistente, sem relação com este diff), lint sem erro
novo, verificação visual em `1920×1080`/`360×800` nos quatro consumidores.

**`swagger-documentacao-api` concluída** (spec em `docs/specs/done/`, ainda sem commit): o
backend expõe Swagger UI em `/api/docs` e JSON OpenAPI em `/api/docs-json`. Uma ponte gerada a
partir dos DTOs públicos e das controllers preserva as interfaces de `shared` como fonte de
verdade, documenta os 87 pares REST atuais com JWT/envelopes/erros e protege deriva por teste.
`npm run openapi:gerar-contratos --workspace=backend` deve acompanhar toda alteração de endpoint
ou DTO público. Testes backend 476/476, build limpo e lint sem erros novos; ver `HISTORY.md`.

**`ui-14-estados-de-lista-vazio-e-esqueleto` concluída** (spec em `docs/specs/done/`): dois
primitivos novos em `shared/ui/` — `app-estado-vazio` (ícone opcional + título mono + linha de
apoio + ação projetada opcional, borda tracejada `--border-strong`, mesmo componente para vazio de
verdade e vazio por filtro) e `app-esqueleto` (bloco `--surface-2` pulsante, identidade só; o
consumidor dimensiona pela própria classe BEM, mesma composição de `app-botao`). Adotados em
**cinco** consumidores (a spec citava quatro; "inventário" resolveu ambíguo entre o do esquadrão e
o da ficha — decisão do autor: os dois): `HistoricoRolagensSidebar` (esqueleto novo — antes só
texto "Carregando…" — e estado vazio), `FichaAcervo`, `CampanhaLista` (as duas já tinham esqueleto/
vazio ad-hoc com `.esqueleto-bloco`/`@keyframes esqueleto-pulso` copiados por página, apagados),
`InventarioEsquadrao` e `FichaInventario` (as duas só tinham vazio — nenhuma carrega
assincronamente depois do primeiro paint, então não ganharam esqueleto). `DESIGN.md` documenta a
escolha entre `app-esqueleto` (lista com geometria conhecida) e a linha `.carregando-global` já
existente (2px no topo, navegação/requisição global sem geometria pra antecipar). Testes focados
41/41 (13 dos dois primitivos novos + 4 do histórico + os já existentes ajustados), suíte completa
frontend 1470/1471 (única falha é `P-043`, preexistente, sem relação com este diff), lint sem erro
novo. Verificação visual ao vivo (Postgres + backend + frontend reais) em `1920×1080`/`360×800`,
estados vazio/carregando/preenchido dos cinco consumidores (carregando via `page.route()` com
atraso, preenchido via mock de payload nos dois casos onde montar o dado real — rolagem/item de
esquadrão — seria desproporcional ao risco; vazio sempre real) — nenhum overflow, dashed border
visível nos dois viewports, `prefers-reduced-motion: reduce` confirmado zerando a animação do
esqueleto (`getComputedStyle().animationName === 'none'`).

**`ui-15-confirmacao-destrutiva` concluída** (spec em `docs/specs/done/`, ainda sem commit): a
spec original (herdada da auditoria) foi corrigida antes de implementar — "sair da campanha" não
existia como ação do jogador, e dois dos quatro fluxos citados não tinham confirmação nenhuma, não
uma cópia duplicada dela (ver spec para o detalhe). `app-modal` ganhou os slots `[modalIcone]`
(cabeçalho) e `[modalAcoes]` (rodapé, régua acima, some por completo via `:empty` quando vazio).
Novo primitivo `app-confirmacao` (`ConfirmacaoService.confirmar(...): Promise<boolean>` + um único
`<app-confirmacao />` no `layout`, mesmo padrão de singleton de `Notificacoes`) substitui os três
padrões concorrentes que o produto praticava: modal ad-hoc duplicado (excluir ficha, em
`acervo.page` e `detalhe.page`), área inline `role="alertdialog"` (excluir campanha, remover
membro) e nenhuma confirmação (encerrar combate, remover combatente — ganharam confirmação pela
primeira vez). Achado ao vivo: os quatro diálogos existentes confirmavam com `variante="primario"`
mesmo sendo destrutivos — nenhum usava a `variante="perigo"` que `app-botao` já tinha; os cinco
call sites migrados agora usam `perigo` (default do serviço) e ganharam alvo de toque de 44px no
mobile (`app-botao` não define tamanho por conta própria — a régua seguiu o padrão de
`ReceberDanoDialog`, o outro consumidor de `app-modal` com esse rodapé). `DESIGN.md` documenta o
primitivo e a regra de quando escrever "Esta ação não pode ser desfeita." (só quando não há
alternativa de fato). Testes focados 12/12 nos dois arquivos novos (`confirmacao.service.spec.ts`,
`confirmacao.component.spec.ts`) + consumidores ajustados, suíte completa frontend 1487/1487, lint
sem erro novo. Verificação visual ao vivo (Postgres local + backend + frontend reais, sem Docker
disponível no ambiente) em `1920×1080`/`360×800`, nos cinco fluxos migrados — ordem dos botões,
severidade, ícone, negrito da entidade e alvo de toque conferidos; achado e corrigido durante o
próprio gate: os dois botões nasceram sem `gap` (elemento projetado único dentro do slot em vez de
cada botão marcado com `[modalAcoes]`) e sem tamanho (`app-botao` não herda um por padrão).

**`ui-16-barra-de-recurso-e-cartao-de-combatente` concluída** (spec em `docs/specs/done/`). A spec
herdada da auditoria foi corrigida antes de implementar (commit `9bdad49`): Sanidade não é um
recurso numérico (`sistema-v4.1.0.md` §Sanidade: "não é uma barra de valor convencional"), o
"painel do mestre" não tinha marcação própria de recurso (só embrulha `app-cartao-combatente`) e
`app-chip` nunca teve severidade `info`. Novo primitivo `app-barra-recurso`
(`shared/ui/barra-recurso/`) — rótulo + valor atual/máximo + trilho, cor fixa por recurso
(`--vida`/`--energy`) e alerta abaixo de 25% (`--warning`, vence a cor do recurso) — substitui três
desenhos divergentes: o HUD sticky mobile da ficha, o bloco de vitalidade desktop da mesma ficha
(edição por clique preservada via `[editavel]`, com `[maximoEditavel]` para a base armazenada
quando o máximo exibido já soma bônus de amplificador) e o cartão de combatente, que não tinha
trilho algum (Vida/Energia eram texto puro). `criatura-visualizacao` ficou de fora (m4-04b, fora de
escopo de revisões de tema). O recuo do estado "já agiu" trocou de `opacity: .62` no cartão inteiro
para recuo pela moldura (retrato a 0,55; números e barras seguem em contraste cheio — confirmado ao
vivo: brilho médio do retrato caiu de 43,9 para 36,7 entre "ativo" e "agiu", brilho dos números de
Vida/Energia ficou estável, 35,1 → 35,6). A precedência entre `--ativo`/`--agiu`/`--morrendo` virou
decisão registrada (`DESIGN.md`): `--morrendo` vence `--ativo` no fundo/borda do cartão — mesma
prioridade que a etiqueta de texto já usava —, `--agiu` só mexe em opacidade do retrato e por isso
soma sem conflito com `--morrendo`. A Cadência virou `<app-chip severidade="secundario">` ao lado
da origem, em vez de sufixo concatenado na mesma string. Testes focados nos arquivos alterados
173/173 (`barra-recurso`, `cartao-combatente`, `ficha-visualizacao`), suíte completa frontend
1495/1495, lint sem erro novo (só os avisos preexistentes de aspas, repositório inteiro). Verificação
visual ao vivo (Postgres local nativo + backend + frontend reais, Docker bloqueado pela política de
rede do ambiente) em `1920×1080`/`360×800`: HUD mobile, bloco de vitalidade desktop (edição,
dica de progressão via tooltip), painel de Iniciativa nos dois viewports, com um combatente
`ativo+morrendo`, o mesmo depois de `agiu+morrendo`, uma criatura de Cadência 2 abaixo de 25% de
Vida (chip + trilho em alerta) e steppers mobile medidos em 44×44px. A spec cravava dois riscos
como "validar em sessão real antes de fechar" (legibilidade do recuo e a escolha `--morrendo` >
`--ativo`) que uma sessão de agente sozinha não resolve; o autor (mthhenri) revisou as capturas —
inclusive o par antes/depois de avançar o turno com o mesmo combatente `ativo+morrendo` →
`agiu+morrendo` — e aprovou.

**`ui-17-painel-flutuante` concluída** (spec em `docs/specs/done/`) — a última da série de tasks
derivadas da auditoria visual. Novo primitivo `app-painel-flutuante` (`shared/ui/painel-flutuante/`)
absorve arraste, posição (persistida em `localStorage` por `[id]`), empilhamento de z-index,
minimizar (idem persistido — novo pros três; nenhum media isso antes) e fechar — os cinco
comportamentos que `CalculadoraFlutuante`, `CadernoFlutuante` e `LeitorDocumentos` reimplementavam
cada um à sua maneira, inclusive um defeito real só visível ao unificar (o z-index fixo da
calculadora, 66, nunca vencia a faixa dinâmica dos outros dois, 1200+). Redimensionar e maximizar
continuam do consumidor (fora de escopo da spec); o primitivo expõe `obterElemento()`/
`moverPara()`/`obterPosicaoAtual()` pra quem precisa. A janela some com `[hidden]`, não `@if`, ao
minimizar — o iframe do leitor de documentos preserva página/zoom/rolagem do PDF em vez de
recarregar. Prende o foco (`Tab`/`Shift+Tab` só circulam dentro da janela) e fecha por `Escape` —
nenhum dos três fazia os dois juntos antes. `CadernoFlutuanteEstado` perdeu `minimizado` e `x`/`y`
de `geometria` (renomeada `tamanho`); `LeitorDocumentosEstado` perdeu `recolhido` e `x`/`y` de
`geometria` (idem, `tamanho`) — os dois não sabem mais que o próprio utilitário pode estar
minimizado ou onde está na tela, o primitivo sabe sozinho. A lista de páginas vazia do caderno
("Nenhuma página ainda") migrou pra `app-estado-vazio` (`ui-14`); os outros dois `.caderno__vazio`
("Nada encontrado" da busca, "Selecione uma página" do editor) ficaram como estavam — não são o
mesmo tipo de vazio que a spec pediu. `DESIGN.md` ganhou a seção "Painel flutuante, modal e painel
lateral" com a régua prática de quando usar cada um. Testes focados 80/80, suíte completa frontend
1506/1506, lint sem erro novo, build de produção limpo. Verificação visual ao vivo (Postgres nativo
— Docker indisponível no ambiente) em `1920×1080`/`360×800`: os três utilitários em normal/
minimizado/fechado, vazio do caderno, foco preso por 12 `Tab`s, `Escape` fechando com foco
devolvido ao gatilho, arraste real, z-index correto entre os três, e posição+minimizado
sobrevivendo a um `reload()` de verdade (`localStorage` conferido, painel reaberto na posição
exata); achado e corrigido durante o próprio gate — o cabeçalho completo (marca "//" + régua)
truncava o título "Calculadora" no popup compacto de 280px, mais no mobile (botões de 44px); agora
o popup compacto esconde marca/régua, mantendo só o essencial.

**`ui-24-ordem-dos-controles-do-painel-flutuante` concluída** (spec em `docs/specs/done/`): o slot
`[painelAcoesExtras]` do primitivo passou de antes de minimizar para entre minimizar e fechar. Assim,
os painéis com maximização (Caderno e Documentos) seguem `Minimizar → Maximizar/Restaurar → Fechar`
também no DOM e na navegação por teclado; sem ação extra, a sequência permanece `Minimizar → Fechar`.
Teste focado 14/14, suíte completa frontend 1521/1521 e build de produção limpo. Lint sem erros
novos, com 15.139 avisos preexistentes. Gate visual ao vivo em `1920×1080` e `360×800` conferiu a
janela de Documentos: ordem e densidade corretas no desktop; no mobile, onde maximizar não existe,
sem overflow horizontal.

**`ui-18-escala-de-espaco` concluída** (spec em `docs/specs/done/`): cinco degraus de espaço
congelados em `_tokens.scss` — `--space-4`/`--space-8`/`--space-12`/`--space-16`/`--space-20` —
fecham a última dimensão do tema sem escala (forma e tipografia já eram tokenizadas). Escopo real
(a nota "Fora de Escopo" da spec confirma `shared/ui` inteiro, não só os quatro exemplos citados):
os 13 primitivos com `padding`/`gap`/`margin` literal — `stat`, `chip`, `campo`, `cartao`, `botao`,
`abas`/`aba`, `modal`, `confirmacao`, `notificacao`, `stepper`, `painel-flutuante`,
`barra-recurso`, `estado-vazio` — mais o item de `HistoricoRolagensSidebar`. Cada literal foi para
o degrau mais próximo (a maioria a ≤2px do valor anterior); duas exceções documentadas ficaram
fora da escala (comentário `// ui-18` no SCSS): o `1px` de compensação fina em
`chip--tom-contorno` e em `barra-recurso__entrada` (abaixo do primeiro degrau, arredondar mudaria
visivelmente um controle miniatura). O `32px` de `estado-vazio` virou `calc(var(--space-16) * 2)`
— exato, não arredondado. `DESIGN.md` documenta a escala e a regra: literal de espaço novo só com
justificativa no PR. Suíte completa frontend 1506/1506, lint sem erro novo. Verificação visual ao
vivo (Postgres nativo, Docker bloqueado pela rede do ambiente) em `1920×1080`/`360×800`: comparação
direta contra as capturas congeladas de `docs/design/examples/` confirmou pixel a pixel o mesmo
espaçamento de antes em `stat`/`chip`/`cartao`/`botao`/`barra-recurso`; `campo`, `modal`,
`painel-flutuante`, `estado-vazio`, `abas` e `stepper` exercitados ao vivo sem regressão.
`notificacao`/`confirmacao` isoladas e o item de histórico com dados reais não foram exercitados ao
vivo nesta rodada (mudança de uma linha cada, mesmo mecanismo já confirmado no resto).

**`ui-20-fila-de-notificacoes` concluída** (spec em `docs/specs/done/`): `app-notificacoes` ganhou
ícone por severidade (`check`/`olho`/`alerta`/`excluir`, sem glifo novo — `olho`/`excluir` sobraram
por eliminação para informação/erro), slot de ação opcional (`acao?: { rotulo, executar }` em
`NotificacaoService.notificar(...)`, renderizado como `app-botao` `estilo="link"` com `[variante]`
da própria severidade — `executarAcao` chama `executar()` e só depois `fechar(id)`, nunca ao
contrário) e barra de duração de 3px com pausa no hover (mesma receita da bandeja de dados,
`m3-22`), alimentada por `entrada.duracaoMs` (4 valores por severidade, não um número fixo no CSS
como a bandeja tem). Achado lateral: a barra da bandeja de dados não honra
`prefers-reduced-motion` — registrado como `PROBLEMS.md` P-019, não corrigido (fora do recorte).
`DESIGN.md` ganhou a seção "Fila de notificações" com a régua de quando uma ação de toast basta e
quando o caso precisa de `ConfirmacaoService`/`app-modal`. Suíte completa frontend 1516/1516 (8
testes novos), build e lint limpos. Verificação visual ao vivo (Postgres nativo) em
`1920×1080`/`360×800`: quatro severidades com e sem ação, hover pausando/restaurando a barra,
ativação da ação só por teclado, `prefers-reduced-motion` emulado confirmando a animação
desligada. Sem call site real usando `acao` ainda (o candidato natural,
`error-handler.interceptor.ts`, exigiria reenviar a requisição original — fora do escopo do
entregável) — verificado com uma notificação disparada manualmente, mesmo padrão que a guarda de
teclado da `ui-19` já usou sem consumidor real. Detalhe completo em `HISTORY.md`.

**`ui-21-chrome-da-topbar` concluída** (spec em `docs/specs/done/`): cinco ajustes na mesma barra
de 52px. Item ativo ganhou régua de 2px em `--accent` (`box-shadow` inset, sem tocar fundo/texto);
novo `TopbarContextoService` alimenta um slot mono entre a marca e a nav (`// <campanha ou
ficha>`), alimentado por `CampanhaDetalhe`/`FichaVisualizar`/`FichaVisualizarCriatura`/
`PainelEncontro`, oculto abaixo de 900px e ausente do DOM quando vazio; `app-indicador-tempo-real`
saiu das quatro páginas que o duplicavam e virou singleton no `Layout` — exigiu o novo signal
`TempoRealService.ativo` (`true` desde a 1ª `conectar()` até `desconectar()`) para não acender
"offline" em página nenhuma tiver aberto ficha/campanha ainda; dropdown de perfil fecha por
`Escape` com foco devolvido ao gatilho; `.config-modal` (segunda implementação de modal em
paralelo ao `app-modal` da `ui-02`) foi substituído pelo primitivo, com o botão "Fechar" no slot
`modalAcoes`. Testes focados 63/63 + 243/243 nas quatro páginas, suíte completa frontend
1537/1537, lint sem erros (15.214 avisos preexistentes), build limpo. Verificação visual ao vivo
em `1920×1080`/`360×800`: régua vermelha do item ativo, contexto vazio/preenchido, painel de tema
sem `.config-modal`, `Escape` fechando tema e dropdown de perfil, e o selo "Tempo real offline"
forçado via bloqueio de rede do `socket.io` (sem depender do socket real nem derrubar o backend
compartilhado) — apareceu certo nos dois viewports, sem overflow. Detalhe completo em
`HISTORY.md`.

**`ui-22-resultado-rolagem-compacto` concluída, com ajuste pós-revisão** (spec em
`docs/specs/done/`): `app-resultado-rolagem` ganhou `[compacto]` (total 22px, pool/grupos/legenda
numa linha só) — `HistoricoRolagensSidebar` passa `true` no único call site, cobrindo os dois
consumidores (painel lateral da ficha, feed da campanha; é o mesmo componente para os dois, não
existiam dois lugares separados); a bandeja (carta de 640px) fica na forma cheia. Dado descartado
pelo `kh`/`kl` ganhou `aria-label` (antes só opacidade + risco); a duração da barra da bandeja
passou a vir do serviço por custom property (`--bandeja-duracao`, sem literal solto no CSS); o
glow do crítico/chip de dano (`text-shadow` + `color-mix()`, três vezes calculado inline) virou
mixin em `frontend/src/styles/tema/_glow.scss` (espelhado em `docs/design/tema/`). A primeira
entrega ficou compacta demais na revisão do autor — rótulo fora da caixa, padding apertado; a
caixa (`--surface-2`/`--border`) migrou de `resultado-rolagem--compacto` para
`historico-rolagens__item` (agora envolve rótulo + rolagem, um cartão só) e os paddings
cresceram. Medido ao vivo com as mesmas 10 rolagens reais: 1864px → 843px (`2,2×`). Testado
contra as 27 formas de expressão da gramática de rolagem (grupos de dano, `kh`/`kl`/`cm`/`!`/`?`,
atributo como dado/escalado/offset, repetição `#N`, crítico, desvantagem intrínseca — detalhe em
`HISTORY.md`), 38 rolagens reais na mesma lista sem overflow. 3 POCs visuais gerados e enviados ao
autor para escolha (cartão/tira colorida/linha corrida); escolheu a **tira colorida**, pedindo
mais padding e a "curvinha" da topbar — `historico-rolagens__item` trocou `border-left` por
`box-shadow` inset + `border-radius`, a mesma receita do item ativo da topbar
(`layout.component.scss` `&--ativo`, ui-21) que faz a régua curvar nos cantos; a régua migrou de
embaixo (`inset 0 -2px 0`) para a lateral esquerda (`inset 2px 0 0`) num terceiro ajuste da mesma
revisão. Medido de novo: 780px pras mesmas 10 rolagens. Num quarto ajuste, os cards passaram a
exibir a expressão de dados usada (ex.: `2d6+3[Físico]`) como legenda discreta abaixo do rótulo
(mono, `--text-dim` a 75% de opacidade, 10px — mesmo tamanho do horário), **exceto** no teste de
Atributo direto (rótulo já é o nome do atributo). A fórmula nunca tinha sido persistida —
`RolagemRegistrarDto`/`RolagemInternoRegistrarDto`/`RolagemResumoDto` ganharam `formula: string |
null` (migration `0028`, coluna nova em `rolagem`); `FichaRolagemRegistroService.registrar()`
passou a repassá-la; as duas chamadas de teste de Atributo (ficha de jogador e criatura) passaram
a omiti-la deliberadamente nesse registro (a bandeja/toast continua mostrando, como sempre).
Testes focados 8/8, suíte completa frontend 1541/1542 (única falha,
`painel-flutuante.component.spec.ts`, não reproduz isolada nem tem relação com este diff), backend
476/476, shared 744/744, lint sem erro novo, build limpo (backend e frontend). Verificação visual
ao vivo (Postgres nativo) em `1920×1080`/`360×800`, painel da ficha e feed da campanha, com dados
reais gerados pela rolagem rápida (fórmula curta e uma longa com Composto) e teste de Força — sem
overflow horizontal em nenhum dos dois, legenda ausente exatamente onde deveria (Força, rolagens
pré-migration). Num quinto ajuste, o dado descartado por `kh`/`kl` (ou qualquer expressão que não
conta todos os dados do pool) trocou `text-decoration: line-through` por um risco na diagonal —
`&--descartado` ganhou `position: relative` + `::after` com `linear-gradient(to top right, …)` em
`currentColor` (a cor de tipo de dano por trás continua a mesma de sempre), `border-radius:
inherit` pra não vazar pelos cantos do chip. Verificado com `6d6kh3[Físico]` e
`8d10kl2cm2[Explosão]` em `1920×1080`/`360×800`, bandeja e histórico compacto — diagonal legível
nos dois tamanhos de chip, `cm`/glow do crítico intactos. Testes 6/6 do componente + 22/22 de
`historico-rolagens-sidebar`/`bandeja-dados` (sanity, só CSS mudou). Detalhe completo em
`HISTORY.md`.

**⚠ Pendente operacional — cutover Render → Cloud Run:** o backend de produção já roda no Google
Cloud Run (migrado em 2026-09-01, detalhe completo em `HISTORY.md`); `apiBase` do frontend já
aponta para lá e o smoke test end-to-end (registro real gravando no Supabase) passou. Falta, a
pedido do autor (quer manter o Render como fallback por mais alguns dias antes do desligamento
definitivo): (1) desligar/suspender o serviço no Render; (2) remover `render.yaml`; (3) reescrever
`docs/DEPLOY.md` trocando a seção do Render pelo runbook do Cloud Run (setup de projeto GCP,
secrets, IAM, trigger do Cloud Build — todo esse conhecimento foi extraído ao vivo durante a
migração e está em `HISTORY.md`).

Não há spec ativa no momento (`ui-22` concluída — ver acima). Resta `ui-23` no backlog (stat sem
valor/rodapé do cartão — ver "Fila do backlog" abaixo). A única frente de código de milestone
ainda pendente é o **M4**
(`m4-05`…`m4-10`, criatura/NPC — ver seção 3), ao lado de `m3-53` (M3). M0, M1, M2, M6 e M7 estão
concluídos, incluindo todos os ajustes avulsos de pós-milestone.

### Fila do backlog (`docs/specs/backlog/`)

| Spec | Frente | O que é |
|---|---|---|
| `civil-guia-criacao` | ficha | mapeia o escopo de `PROBLEMS.md` `P-018` (o guia de criação trata a classe Civil como um agente comum em vários passos) — spec de levantamento, ainda não implementa |
| `m3-53` | ficha | exportar ficha em PDF fiel ao tema |
| `m4-05`…`m4-10` | criatura/NPC | 6 tasks restantes do M4 — contrato/regras/backend/frontend de NPC, listagem/revelação no painel do mestre, refinamento mobile |
| `ui-23` | frontend/design system | última spec restante da auditoria visual (stat sem valor/rodapé do cartão) — não citada na ordem sugerida original como bloqueante de milestone |
| `m8-01`…`m8-06` | campanha (M8) | papel ESPECTADOR, convite próprio, painel de leitura ao vivo, prévia fiel de jogador e visão read-only de Iniciativa/Encontro — módulo novo, ainda não iniciado |

Milestones ainda não abertos: `m5-guia-missao` e o M8 `m8-espectadores-campanha` (specs prontas em
`docs/specs/backlog/`, aguardando início).

---

## 2. Estado Geral

Monorepo npm workspaces (`shared/`, `backend/`, `frontend/`) rodando de ponta a ponta: Angular 21
SPA → NestJS 11 REST + Socket.IO → PostgreSQL 16. **M0, M1, M2, M6 e M7 concluídos; M3 (ficha de
jogador) em fase de refino avançado, falta só `m3-53`; M4 (criatura/NPC) iniciado, falta
`m4-05`…`m4-10`** — a ficha lê, edita, rola dados, persiste e sincroniza em tempo real; o Encontro
de Combate roda ponta a ponta com tempo real (ver seção 3 e seção 4).

Deploy em produção por **integração nativa das plataformas**, sem GitHub Actions no deploy: push em
`master` → um trigger do Cloud Build compila, migra e reimplanta o backend no **Google Cloud Run**,
e a Cloudflare Pages reimplanta o frontend sozinha; banco no Supabase. O backend migrou do Render
para o Cloud Run em 2026-09-01 (ver `HISTORY.md`); falta desligar o serviço no Render e reescrever
`docs/DEPLOY.md` — ver seção 1. O GitHub Actions só roda **CI** (lint + testes nos 3 workspaces em
todo PR).

**Suítes:** cada fecho de task registra a contagem da rodada em `HISTORY.md` — não repita a suíte
completa sem mudança relevante desde a última. A mais recente completa foi a da `ui-21`
(2026-09-02): frontend 1537/1537 — o defeito `P-043` que rondava a suíte completa em rodadas
anteriores não reproduziu nesta. `P-001`/`P-009`/`P-010`/`P-011` descrevem outras falhas que só
reproduzem isoladas (arquivo único), não na suíte completa.

---

## 3. Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, `core/`, CI, deploy) | **concluído** |
| M1 | Calculadora com paridade | **concluído** (`m1-01`…`m1-20`), incluindo os 2 passos operacionais de plataforma (Cloudflare Pages no ar, repo antigo arquivado) |
| M2 | Auth + Campanhas | **concluído**, incluindo o redesenho do painel (`m2-01`…`m2-09` + extensões `m2-10`…`m2-17`; `m2-18` lista, `m2-19` detalhe/mestre, `m2-20` detalhe/jogador, `m2-21` abas + Rolagens na lateral + menu de ficha do jogador) |
| M3 | Ficha de Jogador | **em andamento** — CRUD, editores, tempo real e rolagens prontos; guia de criação completo (`m3-57`/`m3-58`/`m3-59` — base, melhorias de nível, equipamento inicial); cor (`m3-61`) e avatar (`m3-62`) de identidade por ficha prontos; falta só `m3-53` |
| M4 | Ficha de Criatura/NPC | **iniciado** — dividido em `m4-01`…`m4-10` (`docs/specs/backlog/`); `m4-01` (contrato), `m4-02` (`shared/regras/criatura`), `m4-03` (`backend/ficha` para `CRIATURA`) e `m4-04` (assistente de criação no frontend) concluídas; `m4-04b`/`m4-04c` (polimento de UI fora da fila) também concluídas. Próxima: `m4-05` (NPC) |
| M5 | Guia de Missão | não iniciado |
| M6 | Gestão de Usuários e Papéis | **concluído** — `m6-01`…`m6-08` (`m6-08`: impersonação administrativa auditável) |
| M7 | Encontro de Combate | **concluído** — 8 tasks originais (`m7-01` contrato, `m7-02` motor puro, `m7-03` backend de montagem, `m7-04` backend de condução/tempo real, `m7-05` painel do mestre, `m7-06` visão do jogador, `m7-07` log da rodada, `m7-08` refinamento mobile) + 9 ajustes de pós-milestone (`m7-09`…`m7-17`, ver seção 4 "Encontro de Combate"). Numeração M7 é sugestão, não decisão de roadmap |
| M8 | Espectadores e Prévias de Campanha | **não iniciado** — specs `m8-01`…`m8-06` prontas em `docs/specs/backlog/` (papel ESPECTADOR, convite próprio, painel de leitura ao vivo, prévia fiel de jogador e visão read-only de Iniciativa/Encontro). Numeração M8 é sugestão, não decisão de roadmap — ver `docs/context/IDEAS.md` |

---

## 4. O Que o Sistema Faz Hoje

> Catálogo por capacidade. O detalhe task a task (o **porquê** de cada decisão) está no
> `HISTORY.md` — busque pelo código da task.

### Motor de regras — `shared/regras/` (funções puras, zero dependências)

Dez domínios implementados e testados: `agente/` (15 fórmulas — vida, energia,
defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo/furtivo, inventário),
`compras/` (catálogo, limites por patente, modificações, amplificadores, fragmentos, venda),
`dados/`, `descanso/`, `dt/`, `identidade/`, `novo-agente/`, `patente/`, `rolagem/` — todos
contra `docs/core/sistema-v4.1.0.md` — e `criatura/` (`m4-02`, 10 módulos de fórmula do "Guia
de Criação de Ameaças" — atributos, modificadores, saúde, defesa, resistências/fraquezas,
regeneração, deslocamento, cadência/iniciativa (Frenética declara `turnosPorRodada` >= 4, inclusive
para combatentes avulsos; após o cálculo, a Iniciativa desenha um cartão por slot intercalado de
`ordemRodada`, com iniciativa travada nas ocorrências adicionais), ataques, `validarFichaCriatura` — contra
`docs/core/guia_de_mestre-v4.0.0.md`, caso de teste completo "A Estátua").

**Fonte única:** frontend e backend consomem o mesmo motor. Nenhuma regra de jogo é reimplementada
em nenhum dos dois lados.

### Autenticação e conta — `backend/autenticacao`, `backend/usuario`, `frontend/autenticacao`, `frontend/usuario`

Registro e login com JWT (bcrypt, guard global, `@Public()` para abrir rota, `@ActiveUser()` para o
payload). Telas `/login` e `/registro` (split-panel). Perfil self-service em `/perfil`: alterar
nome/login, trocar senha e excluir a própria conta. Desde a `m6-01`, toda conta tem tipo global
(`NORMAL`, `ADMIN` ou `TESTER`) e `token_versao`; a conta `senhor.contratados` foi promovida a
`ADMIN`, contas anteriores receberam `NORMAL` e o registro público sempre persiste `NORMAL`.
Desde a `m6-02`, todo request não público relê tipo, versão e exclusão da conta no banco: sessão
ausente, excluída ou com versão divergente recebe 401; `@TiposPermitidos(...)` usa o tipo fresco e
responde 403 quando ele não está autorizado. Para testar um módulo restrito, anote a controller com
`@TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER)`; remova o decorator para permitir
qualquer usuário autenticado.
Desde a `m6-03`, administradores podem listar contas ativas ou excluídas com busca, filtro de tipo,
ordenação e paginação; criar contas; alterar nome/login; fazer soft delete; e reativar uma
conta preservando seus dados públicos. A `m6-04` acrescentou troca de tipo e reset administrativo
de senha, ambos com incremento de `token_versao`; bloqueia auto-exclusão/auto-rebaixamento pela
gestão, preserva ao menos um `ADMIN` ativo inclusive no self-service e impede excluir mestre de
campanha ativa antes de transferir o papel ou excluir a campanha. As rotas ficam sob
`usuario/admin` e permanecem restritas a `ADMIN`.
Desde a `m6-05`, `/admin/usuarios` expõe essas operações em uma tela inline protegida por
`adminGuard`: busca única por nome/login com debounce, filtros reativos de tipo e situação,
criação com escolha de tipo, edição, reset de senha, troca de tipo com confirmação, exclusão e
reativação. O perfil identifica o tipo atual sem permitir editá-lo, e a topbar sinaliza contas
`ADMIN`/`TESTER`.
Desde a `m6-06`, módulos futuros podem restringir suas rotas com
`tipoGuard([TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER])`. Sem sessão, o guard preserva o
retorno no redirecionamento ao login; uma sessão sem tipo permitido segue para a página pública
`/acesso-negado`. Ao abrir o módulo para todo usuário autenticado, substitua-o por
`autenticacaoGuard`; nenhuma rota funcional existente foi restringida pela entrega.
Desde a `m6-08`, a gestão administrativa ganhou **impersonação auditável**: o botão "Logar como",
em cada conta ativa diferente do admin da sessão, abre uma confirmação inline (nome + login do
alvo, aviso de que a sessão administrativa será encerrada); confirmar chama
`POST /usuario/admin/impersonar` (`@TiposPermitidos(ADMIN)`, recusa conta excluída/inexistente e
autoimpersonação) e o `SessaoTokenService` — o mesmo emissor do login — devolve um JWT com id,
login, tipo e `tokenVersao` atuais do alvo, nunca senha/hash. O frontend **substitui** a sessão
inteira (`SessaoService`, sem sessão dupla nem "voltar ao admin") e navega a `/campanhas`; recuperar o
admin exige logar de novo. A migration `0016` grava `usuario_impersonacao` (origem, alvo, data) só
após a validação bem-sucedida.

### Campanhas — `backend/campanha`, `frontend/campanha`

CRUD de campanha com papéis (mestre/jogador), entrada por `codigo_convite` com regeneração pelo
mestre, listagem de membros, remoção de jogador e transferência de mestre. UI sob `/campanhas`
(guardada): lista de campanhas (`/campanhas`) é um **painel de controle** (m2-18) — linhas densas por
campanha com tira de 4 estatísticas agregadas no topo (Campanhas/Você mestra/Fichas em
campo/Alertas), alerta visual + nome da ficha crítica por linha, resumo da própria ficha
(Vida atual/máxima, jogador) e convite copiável direto na linha (mestre), sem abrir o detalhe. O
detalhe (`/campanhas/:id`) tem banner de alerta condicional no topo (ficha crítica, com link direto
pra ela), tira de estatísticas — só o tile **Convite** (só mestre; ajuste pós-m4-04b: Membros/
Fichas/Alertas saíram da tira — a contagem de cada um já aparece no cabeçalho da própria coluna, e
o alerta crítico já tem o banner acima) — e tira horizontal rolável de rolagens da última hora (sem limite fixo de itens — a lista completa/sem limite de
tempo só na sidebar de histórico, aberta pelo seu próprio gatilho D20; cada pill tem rótulo +
dadinho d20 lado a lado na mesma linha flex — hover/foco no d20 mostra o resultado completo na
bandeja de dados flutuante, `BandejaDados`, a mesma que exibe rolagens ao vivo, mas sem timer/
barra de auto-sumir — `semAutoSumir`, a prévia só fecha no `mouseleave`/`blur`) — compartilhados
pelos dois papéis. Abaixo disso, o corpo diverge por papel (`@if (ehMestre())`/`@else`):

- **Mestre** (m2-19) — duas colunas: **Membros** (450px no desktop; nome/papel/gestão, sem
  fichas; mestre sempre primeiro, depois jogadores em ordem alfabética) e **Esquadrão** (grid fixo
  de 2 colunas — 1 no mobile, e antes de Membros quando a grade empilha; segue a mesma ordem
  mestre→alfabética da coluna Membros — com as fichas de **jogador** (`tipo === JOGADOR`) da
  campanha achatadas, nome do dono em cada mini-card, duas `app-barra-recurso` **compactas**
  (Vida/Energia com ajuste rápido ±) sem abrir a ficha — lado a lado no desktop e empilhadas no
  mobile (operação dedicada que só altera `dados.estado.vidaAtual`/`energiaAtual`, sem regravar
  identidade, cor, avatar ou visibilidade), reações
  (Defesa/Esquiva/Bloqueio/Contra-ataque, cada uma só aparece se a ficha tiver o valor — Contra-
  ataque recalculado ao vivo no backend quando o snapshot não foi persistido) e o kebab de ações da
  ficha — duplicar/remover-da-campanha/excluir). Cabeçalho da coluna tem dois botões — **Nova
  Criatura** (`/painel/:campanhaId/criatura/nova`) e **Novo Agente** (assistente de jogador,
  ex-"Nova ficha", m4-04b). Abaixo do grid, a mesma coluna se divide com a subseção **Criaturas**
  (m4-04b) — todas as fichas `tipo === CRIATURA` da campanha, cards enxutos (nome/imagem/cor/NA/
  Vida/Defesa, sem classe/energia/condições, que uma criatura não tem) e **sem link de navegação**:
  `FichaVisualizacao` ainda não sabe renderizar dados de criatura (pendência da `m4-04`, ver seção
  7) — abrir a ficha completa quebraria a tela. `FichaResumoDto` ganhou `tipo`/`na` (opcionais, para
  não quebrar fixtures de teste pré-m4-04) e a query de resumo (`FichaRepository.colunasResumo`)
  passou a resolver `vidaAtual`/`vidaMaxima`/`defesa` também no formato raiz que a criatura usa
  (`COALESCE` entre os dois formatos de `dados`), além de um `JOIN tipo_ficha` novo.
- **Jogador** (m2-20 + m2-21) — a ficha exibida na coluna principal (a própria, por padrão, ou a de
  um colega via "Ver ficha") como card embutido (`<app-ficha-visualizacao modo="compacto">`, o
  componente real da tela de ficha, não uma réplica): 2 colunas que **repartem a linha** —
  Identidade/Vitalidade/Reações/Resistências à esquerda, card de Status à direita com uma barra de
  **3 abas** (Informações · Inventário · Habilidades). **Informações** = Atributos (o mesmo bloco
  que o `modo="padrao"` põe na coluna própria, via `ng-template`) + glance de Combate só leitura
  (com os dadinhos de rolar dano) + Anotações editáveis inline; Sanidade, Extras, História e
  Prestígio ficam de fora, alcançáveis por "Abrir ficha completa" (link no cabeçalho do card +
  botão no rodapé) → `/painel/:campanhaId/ficha/:id` (`modo="padrao"`, sem corte). Inventário e
  Habilidades rolam por dentro com teto de 420px (subiu de 230/250px pós-m2-21, a pedido do autor —
  o teto antigo datava de quando Atributos ainda morava na coluna ao lado). Ao lado, uma coluna
  lateral de 450px com **três** cards: **Equipe** (roster compacto — Vida/Energia resumidas + um
  botão "Ver ficha" por ficha visível de cada colega, trocando a ficha exibida sem navegar),
  **Rolagens** (`<app-ficha-rolagens-painel>` — presets/rolagem avulsa + o toggle "Rolagem oculta";
  saiu do card na m2-21 pra ficar ao lado do histórico; **só rola** os presets existentes —
  `editavel` fixo em `false` aqui, criar/duplicar/editar/remover preset continua exclusivo da
  ficha completa) e **Sessão** (as mesmas rolagens da última hora, empilhadas em vez da tira
  horizontal, com teto de 3 pills — 179px — antes de rolar). O cabeçalho dá ao jogador um menu "⋯" próprio (mesmo
  lugar do kebab do mestre) com **Criar nova ficha** e **Vincular ficha existente** (`PUT
  /ficha/:id/campanha` da m3-28, só fichas com `campanhaId === null`); as duas ações também
  aparecem no estado vazio, e nenhuma delas tira o jogador da página. No mobile a barra inferior
  (`.ficha-nav`, m3-60) lista 5 destinos (Agente/Status/Inventário/Habilidades/Rolagens) — e
  `Rolagens` é o **único que não é uma aba**: rola a página até o card da lateral. Os handlers de
  edição (`ajustar*`) vêm de `FichaEdicaoService` e a flag/registro de rolagem de
  `FichaRolagemRegistroService`, os dois composables reusados com `VisualizarPage` — a ficha de um
  colega aparece só leitura (`ajustavel=false`) quando o usuário não é dono nem mestre. O cabeçalho
  também traz `<app-calculadora-flutuante>` ao lado do gatilho de histórico de rolagens, pros dois
  papéis.

O cabeçalho tem nome da campanha em linha própria (mais destaque no mobile) e, abaixo/ao lado,
indicador de tempo real, botão "Voltar às campanhas", gatilho de histórico de rolagens e (mestre)
o menu kebab de ações da campanha (editar nome/descrição, excluir). Também mostra o estado
operacional `Na Base`/`Em Missão`: o mestre pode alterná-lo e abrir o inventário compartilhado numa
sidebar; o jogador abre o inventário na coluna lateral somente quando está na base. O inventário de
esquadrão aceita itens do catálogo, ajustes de quantidade e transferência nos dois sentidos com
fichas próprias (`Pegar`/`Mandar pra base`). Durante uma missão, jogadores ainda podem consultar os
itens, mas não podem adicionar, ajustar quantidade, remover ou transferir; essas operações continuam
restritas à base. O atalho do jogador se chama
`Inventário do esquadrão`; `Na Base` usa a cor neutra adaptada à base clara/escura e `Em Missão`
usa o vermelho fixo de Vida. O catálogo repete busca, categorias com quebra de linha e densidade do
inventário da ficha, sem rolagem horizontal; adicionar preserva o catálogo aberto e sinaliza o card
acionado. A ação `Item custom` replica o formulário da ficha, com categoria iconográfica, quantidade,
descrição e campos mecânicos condicionais (`dano`, `informação`, `resistência` e `bônus`) limitados ao
contrato que o inventário coletivo já preserva. Usável em ~360px.
Operacionais e Medicinais com todos os campos descritivos idênticos compartilham um stack ao serem
adicionados; as demais categorias e qualquer variação descritiva permanecem em registros separados.
Remover um registro exige confirmação inline no próprio card. Modificações estruturadas são
preservadas nos dois sentidos da transferência ficha ↔ base; itens empilháveis só compartilham
stack quando as modificações também são estruturalmente iguais. O card da base exibe as
modificações como chip somente leitura, usando o mesmo texto de efeitos da ficha.
Antes de adicionar, tanto o item do catálogo quanto o Item custom podem abrir o seletor de
modificações canônicas: ele aplica categoria, restrições do item, conflitos e empilhamentos de
`shared/regras/compras`, enquanto a base deliberadamente não calcula prestígio, custo pessoal,
fragmentos ou modificações livres. O catálogo preserva a adição simples e oferece **Modificar**;
o Item custom mostra uma prévia de seus chips antes da criação.
No desktop, as sidebars compartilhadas de inventário de esquadrão e histórico de rolagens têm 500px;
o histórico usa a mesma largura na campanha e na ficha. A pilha de atalhos flutuantes (inventário,
histórico e calculadora, conforme a tela) fica a 24px do canto inferior esquerdo tanto na campanha
quanto na ficha. Em viewports mobile, esses controles continuam inline no cabeçalho com alvos de 44px
e as sidebars ocupam toda a largura disponível.

O **Caderno** também integra os utilitários da campanha. Cada membro possui um caderno privado por
campanha, formado por páginas com título e Markdown, sem imagens ou anexos. A página usa Milkdown
para edição visual direta: o conteúdo formatado é a própria superfície editável, com barra compacta
para títulos, ênfase, listas, citação e código, sem alternância entre fonte e prévia. O Markdown puro
continua sendo o formato persistido. O autor administra suas
páginas com salvamento automático e controle de versão; em conflito, o texto local permanece visível
até o usuário recarregar a versão persistida. O mestre alterna entre o próprio caderno editável e os
cadernos dos jogadores em modo estritamente somente leitura; jogadores não veem cadernos alheios.
Sincronizações internas do Milkdown — como a troca da página ativa — não são tratadas como digitação
e, portanto, não disparam autosave nem avançam indevidamente o controle otimista de versão. As datas
usadas como versão são devolvidas pelo backend com os seis dígitos de microssegundos do PostgreSQL,
evitando perda de precisão entre um salvamento e o seguinte. Os controles `Salvar agora` e `Excluir`
têm hover contextual, resposta de pressão ao clique e respeitam `prefers-reduced-motion`.
No desktop, a janela pode ser arrastada, redimensionada e minimizada e preserva sua geometria no
navegador. A lista de páginas pode ser recolhida e se recolhe ao criar uma página; em janelas de
640px ou menos ela se sobrepõe ao editor para não estreitá-lo, e a largura mínima da janela é 440px.
O seletor de arquivo do fluxo de importação é acionado por um botão real e fica totalmente oculto;
sua área interativa nunca ultrapassa o botão de 32px no desktop ou 44px no mobile.
No mobile, o gatilho fica inline
ao lado de histórico e calculadora, ocupa a área útil ao abrir e alterna entre lista e editor.

A mesma janela oferece busca textual unificada com fontes combináveis conforme o papel: caderno do
mestre, cadernos dos jogadores e anotações das fichas. A autorização é aplicada no backend antes da
consulta; um resultado de página abre o caderno correspondente e um resultado de ficha navega para
a visualização completa em `#anotacoes`. A implementação usa full-text search português do
PostgreSQL (`websearch_to_tsquery`, `tsvector` e índices GIN); o banco continua autoritativo.

O Caderno tem um terceiro modo, **Esquadrão** (`caderno-esquadrao-colaborativo.spec.md`): uma
página por campanha, editada em tempo real por todos os membros ativos ao mesmo tempo, com o mesmo
editor Milkdown das demais. O documento é um `Y.Doc` (Yjs, CRDT) persistido no Postgres com
projeção Markdown pesquisável (entra na mesma busca unificada acima); a sincronização usa REST
autorizado para o snapshot inicial e broadcast Socket.IO pós-gravação para o resto. Todo membro cria,
renomeia e edita páginas do Esquadrão; só o mestre exclui. A busca inclui o caderno do Esquadrão sem
expor conteúdo a quem não é membro da campanha. Presença e cursores remotos (`y-protocols/awareness`)
foram implementados na `P-039`: o `Awareness` roda sobre o mesmo `Y.Doc`, o gateway retransmite o
payload bruto (`caderno-esquadrao:presenca`) sem persistir nem decodificar, e o editor mostra o
cursor/seleção de cada colaborador (nome e cor) via `yCursorPlugin`, mais um indicador de
participantes no cabeçalho. No mobile, a `P-041` corrigiu a navegação: abrir uma página existente ou
criar uma nova no modo Esquadrão agora troca a vista de lista para o editor, como já acontecia no
caderno privado. A spec fechou (`docs/specs/done/`).

### Ficha de jogador — `backend/ficha`, `frontend/ficha`

CRUD completo com a matriz de permissões §14 arbitrada **só no service**, validação do documento
contra `shared/regras` antes de persistir, e concessão/revogação de acesso de visualização
(`usuario_ficha_acesso`).

As habilidades permanentes de custo 0 E entram nas fórmulas compartilhadas, sem regra duplicada
na UI ou no backend: `Tanque` (e a Maestria de Vigor) alteram Vida e resistência das Proteções
equipadas, mas só somam nos tipos de dano **nativos** da Proteção-base do catálogo — um tipo criado
por uma modificação (ex. Químico da modificação Hazmat sobre uma Armadura Pesada, cuja resistência
nativa é Físico/Balístico) recebe só o bônus da própria modificação, nunca o de Vigor/Tanque
(`P-029`, corrigido). Adicionar/remover a habilidade aplica apenas o delta à Vida máxima persistida,
preservando ajustes manuais. Criação, edição, visualização e Encontro usam o mesmo motor e propagam
`habilidades` aos fallbacks; o resumo público da ficha (mini-card do Esquadrão) e o mapper do
Encontro (cartão da Iniciativa) aplicam a mesma soma "efetiva" (amplificadores + equipamento) que a
ficha já mostrava — os três lugares exibem sempre os mesmos números de Vida/Energia/Defesa/
Esquiva/Bloqueio (`P-030`, corrigido).

A tela de visualização (`FichaVisualizacao`, componente reusável) é um **layout de três colunas**
(Identidade · Atributos · Status com abas internas), com **toda edição no próprio lugar** — nada
de página de formulário separada. Editores prontos: atributos e maestria (com modificador de teste
e ajuste manual de dados/`dadosTeste` por atributo, este último só afetando a contagem de dados
rolada, nunca o valor exibido nem os derivados; em edição, os atributos viram uma lista vertical —
nome completo + steppers — em vez da grade compacta do modo leitura), vitais, sanidade e
lesões, habilidades (com filtro e contador), inventário completo (itens, modificações,
amplificadores, fragmentos Potencializador — "Aplicar em..." num item (`m3-35`; cardápio "em um
item" com 4 destinos exclusivos — dano [`N× maior dado do alvo`, dano de verdade], teste, **efeito**
[`m3-68`: tipo `EFEITO` próprio, descritivo — reforça o efeito do item, ex.: "Em Chamas" de uma
granada, nunca soma no dano] e resistência; "uma única função" por item, checado por
`existeFragmentoNaMesmaFuncao`) ou "Consumir" pro bônus permanente do agente (teste/Defesa/dano do
Corpo, cardápio fechado por módulo, `m3-64`;
consumir sempre deixa um registro incondicional na aba Extras, acima da Afinidade — não depende da
sequela "Rejeição Biológica", que é evitável — e é **removível**: desfaz o bônus, a Energia Máxima e
devolve o item ao inventário, mas não mexe na sequela já gerada) — e fragmentos Construtor (nascem
com o bônus fixo do módulo já aplicado como modificação automática — Arma ganha dano/teste, Proteção
ganha resistência/Esquiva/Bloqueio/Defesa, `m3-65`; Munição não modifica item, tem a ação própria
"Recarregar" que debita Energia e concede dano por 1 cena, reset manual; modificações comuns
adicionadas a um Construtor custam o dobro e não pesam; `m3-69`: o form de item custom ganhou um
seletor "Base" — escolher uma arma/proteção real de `CATALOGO_ITENS[categoriaEmprestada]` trava
dano/informação/resistência com os valores daquele item e pré-preenche o peso, "Outra" continua livre
pra homebrew; `calcularStatItem` funde a Resistência de um Construtor Proteção com o bônus do módulo
desde essa task — antes só Proteções/Armazenamento eram elegíveis a esse bloco) —, sub-inventários,
custom), Limite mínimo
Itens custom do inventário do agente podem ter nome, descrição, custo e peso corrigidos pelo lápis
“Editar informações”. A ação abre uma `p-dialog` real que reutiliza integralmente o formulário e o
contrato visual da criação, já preenchido; categoria e campos mecânicos ficam bloqueados, e salvar
preserva quantidade, modificações e todos os demais dados. Item de catálogo não oferece a ação. O
inventário do esquadrão não participa desse fluxo e permanece sem edição de informações.

O card de cada item também resume as modificações que têm efeito estruturado ou nota livre, no
formato `Nome: descrição`; efeitos de uma mesma modificação mantêm o separador ` · ` do motor e
modificações diferentes usam `; `. A linha fica imediatamente acima da contagem de cenas/disparos
e não aparece para modificação puramente cosmética. É derivação exclusiva do frontend; chips e
contratos compartilhados permanecem inalterados (`descricao-modificacoes-item-inventario`).

de Energia/Anomalia Biológica (`m3-67`: `(Vigor + Destreza) × 2` — abaixo dele, aviso não-bloqueante
na aquisição de fragmento e, na aba Extras, os efeitos calculados como texto informativo (−15
testes, −10 Defesa, teto de 10% da Vida Máxima) + atalho pra pré-preencher o trauma "Limiar da
Humanidade" na aba Sanidade, sem nunca disparar sozinho), identidade (origem,
personalidade, afinidade de fragmentos), história privada, anotações e dinheiro. Extras possui a
subnavegação persistente **Identidade / Fragmentos** (`m3-71`), com ícones canônicos e painel interno
rolável limitado à altura de Agente/Atributos no desktop e ao viewport em telas empilhadas.
Persistência **otimista + em lote**, com
merge de edição concorrente — a lógica (~18 handlers `ajustar*` + progressão) mora em
`FichaEdicaoService` (`@Injectable()` sem `providedIn: 'root'`, uma instância por página via
`providers: []`), reusado por `VisualizarPage` (`/painel/:campanhaId/ficha/:id` e `/fichas/:id`) e
por `CampanhaDetalhe` (m2-20, ficha embutida na visão do jogador). O mesmo padrão vale para
`FichaRolagemRegistroService` (m2-21): a flag "Rolagem oculta" e o registro do histórico (m3-27)
moram na página porque no painel do jogador o toggle está **fora** do card (coluna lateral)
enquanto o teste de atributo e o dano continuam sendo rolados de dentro dele.
O controle relacional de visibilidade da ficha completa pede confirmação antes de persistir: fica
compacto junto ao avatar no desktop e migra para o menu de ações no mobile. Mudanças reais de
`oculta` em ficha vinculada emitem `ficha:visibilidade-alterada` na sala da campanha; o detalhe
refaz o recorte REST autorizado, fazendo a ficha sumir ou reaparecer para jogadores sem F5.
Na visualização completa, o menu de dono/mestre oferece **Remover da campanha** somente para ficha
vinculada; a desatribuição é direta e retorna ao acervo após o backend confirmar.

Item custom ganhou a categoria de sistema `SEM_CATEGORIA` (`ItemCategoriaEnum`, sem capítulo
correspondente em `sistema-v4.1.0.md` — bucket organizacional puro, nunca ganha item de catálogo):
disponível só no seletor de categoria do form de item custom (ficha, esquadrão, calculadora
"Compras"), nunca como aba do catálogo navegável. Item dessa categoria é sempre empilhável (cai na
grade dupla, junto de Medicinal/Operacional) e nunca modificável (sem Dano/Resistência/"encaixa em"
no form, sem painel "Modificar").

Input `modo: 'padrao' | 'compacto'` no componente: `'compacto'` reduz as 3 colunas pra 2
(Identidade/Vitalidade/Reações/Resistências ao lado do card de Status) e corta a barra de abas ao
trio Informações/Inventário/Habilidades, some com Prestígio, Sanidade, Extras e História, e leva
Atributos + Combate pra aba Informações (uso de `CampanhaDetalhe`, coluna estreita numa tela larga
— ver seção "Painel de campanhas" acima). No mobile a tela vira **HUD fixo no topo + barra de
navegação no rodapé** (não empilhamento de colunas) — por breakpoint real de viewport, não pelo
`modo`; em `'compacto'` a barra some com os destinos que não existem nesse modo. As barras de
Vida/Energia usam `app-barra-recurso[tamanho="compacto"]`: a grade as mantém lado a lado quando a
coluna comporta as duas e as reflui no mobile; a variante do primitivo reduz apenas sua densidade
interna, nunca impõe largura ao consumidor. A aba História tem caixa própria expansível (não herda
o teto de leitura de Anotações), preenchendo a coluna de Status no desktop e liberando o texto para
crescer no mobile.

Rolagem de dados: gramática v4, presets, teste de atributo, dano de item, iniciativa automática,
calculadora flutuante e **histórico persistido** com visibilidade `PUBLICA`/`PRIVADA`. Cada ficha
tem uma **cor de identidade** própria (`m3-61`, coluna `ficha.cor`, swatch no cabeçalho —
`ajustavelAmplo()`), independente do `--accent` de tema por usuário: colore o total/crítico de toda
rolagem daquela ficha (bandeja de dados, histórico, feed "Rolagens Recentes" do painel de
campanha), via REST e WebSocket; sem cor definida, cai no `--accent` de quem visualiza. Cada ficha
também tem um **avatar** opcional (`m3-62`, coluna `ficha.imagem_url`): `<img>` real no lugar do
placeholder decorativo no cabeçalho (com selos de trocar/remover, `ajustavelAmplo()`) e no card do
acervo — upload/remoção via `POST`/`DELETE /ficha/:id/imagem` (multipart, endpoint dedicado fora do
`PUT` genérico), persistidos **imediatamente** (sem o debounce dos demais campos), com o arquivo
guardado em disco local (dev) ou Cloudflare R2 (produção) atrás de `ArmazenamentoProvedor`
(`backend/src/core/armazenamento/`), escolhido por `ARMAZENAMENTO_PROVEDOR`. O card do acervo usa a
mesma receita visual do card de ficha do Esquadrão (`CampanhaDetalhe`, `m3-52`): borda + listras
diagonais do avatar seguem `--cor-ficha` (`color-mix` sobre `--border-strong` sem cor definida) e o
hover sustentado sobre o avatar abre um preview 300×300 sem recorte
(`agendarPreviewAvatar`/`cancelarPreviewAvatar`).

**Acervo (`/fichas`, `FichaAcervo`) separado por tipo (`m4-11`).** A tela lista agentes e criaturas
em blocos próprios (`AGENTES`/`CRIATURAS`; NPC estruturalmente pronto na mesma lista dirigida por
`TipoFichaEnum`, mas desligado do filtro/botão até `m4-07`/`m4-08` existirem), cada um com
cabeçalho (título + régua + contagem, padrão de `CampanhaDetalhe.__secao`) e um `<select>` de visão
(Todos/Agentes/Criaturas) alinhado à direita da barra de ações. Em "Todos", cada bloco trava em
~2 linhas de card e rola por dentro (`.acervo__lista--limitada`, `appOverflowFade`) — um bloco sem
ficha nenhuma é omitido; com um tipo filtrado, o bloco solta a trava e usa a altura toda, com
estado vazio próprio ("Nenhuma criatura ainda."). O card virou um componente único extraído
(`CartaoFichaAcervo`, `frontend/.../ficha/componentes/cartao-ficha-acervo/`) com recorte por tipo —
comum a todos (moldura, avatar, chip de campanha, kebab); agente mostra
`rotuloClasseCompleto(classe, arquetipo)` · Nível · **Patente** (`rotuloPatente`, que faltava no
card antes desta task) · Vida/Energia; criatura mostra Ameaça · NA · VD · Vida/Defesa. O menu (⋯) e
o preview do avatar continuam na raiz da página (`position: fixed`, cortados pelo `appOverflowFade`
do `<ul>` se vivessem dentro do card). Link do card por tipo: agente → `/fichas/:id`; criatura →
`/fichas/criatura/:id`.

**Criar criatura fora de campanha (`m4-11`).** `FichaCriaturaCriarDto.campanhaId` passou a aceitar
`null` — botão "Criar criatura" no acervo, visível só a quem é mestre de **alguma** campanha
(`CampanhaRepository.contarCampanhasComoMestre`, já existente, reusado sem SQL novo); o backend
aplica a mesma trava (`FichaService.criarFichaCriatura`), recusando com 403 quem não é mestre de
campanha nenhuma. As rotas `/fichas/criatura/nova`/`:id` (sem `mestreCampanhaGuard` — não há
`:campanhaId` de campanha nenhuma pra guardar) reusam `CriaturaCriar`/`CriaturaVisualizar` com
`campanhaId` opcional, mesmo padrão de `FichaCriar`/`FichaVisualizar` (m3-28): resolvido da rota
quando presente, ou do próprio payload da ficha carregada quando não. Atribuir uma criatura/NPC
solta a uma campanha agora exige que o dono seja **mestre** daquela campanha (não só membro) —
coerente com quem pode criá-la — e **nunca** emite `ficha:criada` na sala (o evento monta o resumo
na forma de jogador e vazaria nome/vida a todo membro antes de qualquer revelação deliberada,
mesma razão já valendo para a criação). Dois defeitos vivos, alcançáveis pelos mesmos controles do
acervo desde que criaturas passaram a listar lá, foram corrigidos junto: `duplicarFicha` fixava
sempre `tipo: JOGADOR` (duplicar uma criatura pelo menu criava um agente com `dados` de criatura) —
agora ramifica pelo `tipo` da ficha original (`FichaRepository.recuperarPorId` passou a devolver
`tipo` via o mesmo `JOIN tipo_ficha` de `colunasResumo()`).

### Ficha de criatura — `backend/ficha` (`m4-03`) + assistente de criação (`m4-04`)

`POST /ficha/criatura` cria uma ameaça: dentro de uma campanha, só o **mestre** daquela campanha
pode (`UnauthorizedAccessException` para qualquer outro papel); solta (`campanhaId: null`, `m4-11`
— ver o bloco no topo do arquivo), exige ser mestre de **alguma** campanha. Dono é sempre o próprio
mestre (sem delegação como em jogador). `GET`/`PUT /ficha/criatura/:id` reusam as mesmas checagens de
permissão de `recuperarFicha`/`alterarFicha` (dono/mestre/concessão, §14); exclusão
(`DELETE /ficha/:id`) e concessão/revogação/listagem de acesso (`/ficha/:id/acesso*`) são 100%
agnósticos de tipo e reusam as rotas de jogador sem endpoint próprio. Validação de domínio é só
`validarFichaCriatura` (`shared/regras/criatura`, `m4-02`) — nenhuma regra de criação duplicada
no backend. Invisível a jogadores por padrão — **não** é o campo `oculta` (que aqui só nasce
`false` e serve pra outra coisa, revelação manual futura de `m4-09`) quem garante isso, é a
própria condição de acesso: `listarVisiveisParaUsuario`/`recuperarFicha` só liberam o dono
(sempre o mestre) ou quem tem `usuario_ficha_acesso` — confirmado ao vivo na `m4-04` (jogador
sem concessão recebe lista vazia e 403 direto na criatura). A criação **não** transmite
`ficha:criada` na sala `campanha:<id>` (diferente de jogador) — esse evento vazaria nome/vida da
criatura a todo membro antes de qualquer revelação deliberada, contradizendo a regra de
invisibilidade; a edição segue transmitindo `ficha:alterada`, seguro porque a sala `ficha:<id>`
já exige a mesma permissão de visualização para entrar. DTOs de operação próprios
(`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`) — ver seção 6. Listagem de criaturas
por campanha (mini-cards, sem abrir a ficha completa) ganhou a subseção "Criaturas" do painel do
mestre no `m4-04b` — ver o parágrafo do `CampanhaDetalhe` acima; revelação/visibilidade seletiva
continua em aberto para `m4-09`.

**Assistente de criação** (`frontend/src/app/modules/ficha/paginas/criar-criatura/`,
`CriaturaCriar`) — rota `/painel/:campanhaId/criatura/nova`, guardada por
`mestreCampanhaGuard` (`frontend/core/guards/`, novo: consulta `CampanhaService.listarMembros`
e redireciona a `/acesso-negado` quem não é mestre daquela campanha — mesmo espírito de UX do
`adminGuard`, mas escopado à campanha em vez do tipo global). Trilha vertical + resumo
operacional progressivo, mesma filosofia visual do guia de jogador (`FichaCriar`), mas
componente e roteiro totalmente separados — 12 passos fixos (Identidade → Ameaça → Atributos →
Modificadores → Saúde → Defesa → Resistências → Regeneração → Porte e Deslocamento → Ataques →
Habilidades → Revisão), sem passos condicionais (o roteiro do "Guia de Criação de Ameaças" não
varia por escolha, diferente do de agente). Todo cálculo vem de `shared/regras/criatura`
(`m4-02`) via `computed`; nenhuma fórmula reimplementada. O passo // Revisão chama
`validarFichaCriatura` (a mesma função que o backend chama antes de persistir) para decidir se
o botão "Registrar criatura" habilita — em vez de replicar cada regra de coerência como trava de
passo separada. Sem rascunho persistido (decisão de abertura: a task não pede retomada, e
diferente da ficha de jogador o risco de perda é baixo — o mestre não perde a própria ficha).
`nome` da ficha (nível DTO) é sempre a `designacao` da Ficha de Identidade — sem campo
duplicado. Verificado ao vivo (Postgres+backend+frontend reais, dois usuários — mestre e
jogador): reproduz "A Estátua" ponta a ponta com os mesmos valores do documento (Vida Máxima
1.050, Defesa 30, custo de resistências 52/60, Atributo Efetivo de cada linha), persiste
corretamente e o jogador sem concessão não a vê (§14). Pendência registrada — ver seção 7.

**Visualização/edição** (`frontend/src/app/modules/ficha/componentes/criatura-visualizacao/`,
`CriaturaVisualizacao` + página `paginas/visualizar-criatura/`) — rota
`/painel/:campanhaId/criatura/:id`, mesma guarda de mestre da rota `nova`; resolve a pendência da
`m4-04` com tela dedicada (não um `modo` novo em `FichaVisualizacao`). Barra superior própria do
componente (`criatura__topo`, rótulo + régua + `chip-classificacao` `FICHA-CRT-{id zero-padded}`,
igual estrutura de `ficha-visao__topo` do jogador — não fica na página) seguida de dashboard de 3
colunas — Identidade (avatar com cor de identidade via `<input type="color">`, upload de imagem e
seletor de enquadramento — ver adiante —, designação, chips de classificação Origem/Porte/
Comportamento, NA em destaque, VD/Tenacidade/Defesa, Vida, Resistências em grade compacta,
Fraquezas em grade de **2 colunas**, divergência deliberada do mockup — que mostra 1) · Atributos
(grade Físicos/Mentais de cards "sigla + valor + Atributo Efetivo + rolar"; o seletor de Modificador
de 4 barras não fica no card — só dentro do modo de edição) · Status com **4 abas** (`AbaCriatura =
'geral' | 'descricao' | 'ataques' | 'habilidades'`, também divergência deliberada do mockup — que
mostra 2): Geral (Cadência + Bônus de Iniciativa + Deslocamento na mesma linha — deslocamento é um
terceiro item de `.criatura__stats--info`, não card próprio — e Regeneração opcional abaixo),
Descrição (Conceito/Gancho/Motivação, Natureza Física/Tema de Horror, Anotações), Ataques e
Habilidades (cada uma sua própria aba, grades de cards, Ataque com botões Teste e Dano) — mesmo
shell/padrões de `FichaVisualizacao` (jogador) e dos blocos canônicos de
`docs/design/tema/_componentes.scss`, alvo de fidelidade
`docs/design/examples/ficha-de-criatura.html`. Abas sempre ocupam 100% da barra (`flex: 1 1 0` em
cada `.criatura__aba` — divergência deliberada do `.abas` canônico, que é do tamanho do conteúdo).
Edição no próprio lugar campo a campo, igual liberdade da ficha de jogador; `FichaEdicaoCriaturaService`
faz o mesmo papel de `FichaEdicaoService` (debounce + `PUT` em lote). Nas listas de item
(`criatura-ataque-lista`/`criatura-habilidade-lista`/`criatura-resistencia-lista`, esta última
reusada por Resistências e Fraquezas) editar/remover por item só aparecem depois de um clique no
botão "Editar"/"Concluir" do cabeçalho da lista (`modoEdicao`, local a cada lista) — "Adicionar"
continua sempre visível, só as ações destrutivas/por-item exigem entrar no modo. Dois blocos fogem
do "edita direto no valor" e usam lápis de seção, como o lápis de Atributos da ficha de jogador:
**Classificação** (os quatro chips viram selects rotulados de uma vez, porque trocar um chip por um
select fazia a linha saltar) e **Atributos**, este com **rascunho + Salvar/Cancelar** — a
distribuição de Modificadores é cota fixa (2 Forte / 3 Médio / 3 Fraco / 2 Frágil,
`shared/regras/criatura`), então emitir a cada clique deixava a ficha inválida e o backend recusava
a gravação; o Salvar só libera quando `validarFichaCriatura` não acusa mais violação de modificador.
No editor de Ataques, a primeira linha é Custo de ação/Nome/Atinge área; Teste/Dano/Dano crítico
dividem a linha seguinte em três colunas iguais e Efeito adicional é um `textarea` inteiro. No
editor compartilhado de Resistências/Fraquezas, Tipo/Subtipo/Valor dividem uma linha única; os dois
desenhos foram confirmados em `1920×1080` e `360×800` sem overflow.
Dois cuidados que valem pra qualquer tela: `<select>` de edição usa `[selected]` na `<option>` (com
`[value]` no `<select>` as opções do `@for` ainda não existem e o controle abre na 1ª), e `.botao`
precisa ser copiado pro SCSS de cada componente (a definição da página não atravessa o
encapsulamento). O refinamento mobile mais amplo de criatura/NPC permanece em `m4-10`, no backlog.

**Enquadramento do avatar (pan/zoom) — jogador e criatura.** Retomada do que `m3-62` tinha deixado
fora de escopo ("crop/editor de imagem no client"), sem processamento de imagem no servidor: só um
metadado (`FichaImagemFocoDto { x, y, escala }`, percentual + zoom, coluna `imagem_foco` JSONB) se
soma a `imagemUrl`, aplicado no avatar via `object-position` + `transform: scale()`. Componente
reusável `AjusteEnquadramentoImagem` (`frontend/.../componentes/ajuste-enquadramento-imagem/`) —
arraste nativo (`pointerdown/move/up`, sem lib) + slider de zoom — renderiza como painel sobreposto
abaixo do avatar nos dois componentes (`FichaVisualizacao`/`CriaturaVisualizacao`). Selecionar um
arquivo novo abre o seletor automaticamente antes do upload; um selo dedicado (canto livre do
avatar) reabre o seletor pra reajustar uma imagem já salva, sem reenviar arquivo. `imagemFoco`
viaja pelo `PUT /ficha/:id` genérico (como `cor`), não pelo endpoint multipart de imagem — são só
números. O rodapé do seletor é `Cancelar` (secundário) → `Confirmar` (primário), ambos no degrau
`medio` de `app-botao`; no mobile o painel se centraliza sob o avatar e mantém dois alvos de 44px
sem corte. Remover a imagem zera o enquadramento junto (sem metadado órfão). Ícone de rolagem
**d20** (não d6) em todo gatilho da ficha de jogador — o sistema só tem testes `Nd20kh1±mod`, então
a troca de `nome="dado"` → `nome="d20"` (`app-icone`) foi total, sem glifo de d6 sobrando em lugar
nenhum.

**Polimento de UI — `m4-04b`:** passo // Identidade ganhou upload de imagem de registro (mesmo
padrão de avatar do guia de jogador, `FichaService.alterarImagem`, segundo request em sequência
após criar a ficha — layout `.guia__campos--base`, caixa à esquerda + Designação/Origem à
direita); revisão de espaçamento entre campos consecutivos fora de um `.guia__campos` (regra
`.campo + .campo` que faltava — campos ficavam colados sem gap) e entre um grid de cards
(Resistências/Fraquezas/Ataques/Habilidades) e o botão "+ Adicionar" logo abaixo.

**Polimento de UI — `m4-04c`:** passo // Atributos trocou o bloco único "Base do VD" (texto
corrido, cortava o stepper no mobile por `.atributo` não ajustar `grid-template-columns` nesse
breakpoint) por 3 cards `.stat` — Base e Limite estáticos, Pontos de Ajuste com um contador real
`gasto/total` (`pontosAjuste()`, mesma fórmula soma-acima-da-Base de
`validarDistribuicaoAtributos` do guia de agente) que trava `passoValido()` em saldo 0, mesmo
padrão do "Saldo de distribuição" do guia de jogador. Dois ajustes decorrentes: os dez atributos
agora nascem na Base ao definir o VD (`mudarVd()`, só na primeira visita ao passo — não apaga uma
distribuição já feita ao voltar e reajustar o VD) em vez de ficarem fixos em `1`; e o piso da
Realocação por atributo passou de `0` para `max(0, Base − 3)`, respeitando o teto de "até 3 pontos"
do documento (sem efeito para VD ≤ 40, onde `Base − 3` já é negativo).

### Guia de criação de ficha — `frontend/src/app/modules/ficha/paginas/criar/`

Rota `/painel/:campanhaId/ficha/nova` (`m3-57`/`m3-58`/`m3-59`) — mesmo componente `FichaCriar`
montado de novo, sem `campanhaId`, em `/fichas/nova` (acervo, m3-28: ficha avulsa, sem campanha).
`FichaCriarDialog` (o formulário único antigo) **não existe mais no código**: era a última
consumidora quem faltava migrar. Tela única por passos — trilha vertical + resumo operacional
progressivo que nunca antecipa classe/Nível/dinheiro antes da escolha real —, rodando sobre
`shared/regras` sem nenhuma chamada ao backend até o "Criar ficha" final. Sem `campanhaId`
(`null`), o guia pula `listarMembros`/`listarFichas` (sem esquadrão, sem seletor de dono no passo
01) e o passo 03 solicita Nível e Prestígio exatos; em campanha, as médias calculadas continuam
como padrão e podem ser sobrescritas manualmente. Ao final, `POST /ficha` sai sem a chave
`campanhaId` quando a ficha é avulsa e
o guia termina em `/fichas/:id`, não em `/painel/.../ficha/:id`. Passos: **01 Base** (dono, só
mestre — não aparece sem campanha —, + codinome + cor de identidade, `m3-61`, + avatar opcional,
`m3-62`: o `File` fica só num signal local até "Criar ficha" — nunca no rascunho salvo em
`localStorage` — e sobe num segundo request, em sequência, logo após o `POST /ficha`) · **02 Classe** (classe/arquétipo, bônus fixo de
atributos, Habilidade Inicial, Saúde base sem Nível/atributos ainda) · **03 Novo agente** (motivo
de entrada + médias de Nível/Prestígio pré-calculadas da campanha, `calcularNovoAgente`, memorial
de cálculo e sobrescrita exata; sem campanha, valores exatos informados diretamente)
· **04 Atributos** (orçamento de 4 pontos de criação,
`calcularOrcamentoAtributos`/`validarDistribuicaoAtributos`) · **05 Habilidades** (só existe com
classe escolhida; vem **antes** de Identidade na trilha — só depois de escolher habilidades o guia
sabe se um Experimento vai ter Peculiaridade, e portanto não vai ter Origem; sempre presente: pacote
inicial obrigatório de 4 Gerais, 2 Gerais + 1 de Classe/Arquétipo ou 2 de Classe/Arquétipo; Civil
escolhe 3 Civis; compõe ainda as vagas de `calcularProgressaoAcumulada`, sem duplicatas —
Experimento não ganha vaga extra, escolhe Peculiaridade pelo mesmo pacote de qualquer outra classe)
· **06 Identidade** (Personalidade + Origem com catálogo de Formações e `Outra`, imutáveis para o
dono após a criação; desde `m3-75`, `criar()` trima as pontas de todo campo de texto livre —
`personalidade`, `origem.nome/.descricao/.saberDeCampo`, cada `formacao[].texto/.parametro` e
`especialidade.gatilho/.efeito` — só na montagem persistida, nunca durante a digitação; desde
`m3-78`, a Habilidade de Personalidade também vive aqui, logo abaixo do campo "Traço de
personalidade" — 3 blocos sempre visíveis, Base/1ª/2ª Fortificação (níveis 7/14), cada um com
descrição e custo em Energia próprios; a Base é sempre exigida para avançar deste passo, cada
Fortificação só quando o Nível de criação já a desbloqueou, sem bypass de "modo livre" — mesmo
padrão sem-bypass da palavra de Personalidade e da Origem; implementada primeiro no passo
Habilidades, movida para cá no mesmo dia por pedido do autor; `identidade.habilidade` guarda os 3,
só o estágio mais alto desbloqueado é materializado em `dados.habilidades`) · **07 Recursos** (rolagem única e definitiva de `1000 + 4D4×250` +
Bônus Monetário — ou, desde `m3-74`, ignorar a rolagem por um botão dedicado ao lado de "Rolar
dados": ficha final com `$0` de dinheiro base, mesma trava de escolha única, sem gerar entrada de
rolagem) · **08 Equipamento inicial** (kit da loja, orçamento **à parte** do dinheiro —
nunca descontado —, teto $2500/peso 5 do documento — mesma regra para toda classe, inclusive Civil
—, sem modificação; componente próprio `GuiaEquipamentoLoja`, catálogo + carrinho sobre
`CATALOGO_ITENS`/`calcularTotaisCarrinho` de `shared/regras/compras`; pulável, kit vazio é válido;
abas de categoria com `app-icone`/`ICONES_CATEGORIA` local — mesmo padrão de `FichaInventario` —,
busca acima das abas e cruzando todas as categorias, não só a ativa) ·
**09 Revisão** (resumo completo + `POST /ficha`, erro do backend não perde o estado do guia). Os
passos 04/05/08 têm **trava dura** por padrão (não avança com saldo/vaga/orçamento em aberto) com
um "modo livre" que ignora as travas (sempre disponível ao mestre) — regra só do guia, client-side;
o passo 06 (Identidade) também tem trava dura própria (personalidade, Habilidade de Personalidade,
Origem), mas sem bypass de "modo livre" — mesmo padrão de todo campo de identidade obrigatório;
o backend segue com a liberdade de edição da `m3-10`. Rascunho (`GuiaCriacaoRascunhoService`)
serializa o estado em `localStorage` por campanha, oferece "retomar"/"começar do zero" ao reabrir e
some ao concluir; sair do guia usa um `<dialog>` nativo (não `confirm()` nem `beforeunload`, que não
permite UI customizada), com aviso de que o progresso está salvo. Mobile: trilha vira barra de
progresso no topo, resumo operacional vira bottom sheet aberto por um botão dedicado no cabeçalho.

### Encontro de Combate — `backend/encontro`, `frontend/src/app/modules/encontro`

Tela única (`PainelEncontro`, rota `/painel/:campanhaId/iniciativa`, `:encontroId` opcional para
histórico) que bifurca por `ehMestre()`: o jogador é espectador, rola a própria iniciativa e só
pode avançar/encerrar o turno da própria ficha (o backend confirma que o combatente do slot atual
pertence à ficha do usuário ativo). O mestre mantém todos os controles de condução.

Um combatente **avulso** (sem ficha) só existe dentro do encontro: cor obrigatória + imagem
opcional persistidas em `encontro_combatente` (`cor_avulso`/`imagem_url_avulso`); o modo "Editar
combatentes" troca cor, substitui e remove imagem. `EncontroCombatenteResumoDto` expõe a forma
unificada `corFicha`/`imagemUrl` (ficha ou avulso, conforme a origem) para o cartão não duplicar
apresentação. O mestre tem um atalho de rolagem livre por avulso (expressão de dados livre,
sempre iniciada como oculta; revelar pede a mesma confirmação usada por criaturas); sem ficha,
`PROF`/`NIV` são rejeitados na expressão.

Identidade "de carteirinha": um agente de ficha **não oculta** mostra avatar, dono e
classe/arquétipo para qualquer membro, mesmo sem `usuario_ficha_acesso` — essa concessão protege
só os **números** (vida, defesas, condições, Destreza), nunca a identidade de quem está na mesa;
sem a concessão, o cartão simplesmente não desenha a linha de recursos. Criatura/NPC e um agente
com a própria ficha `oculta` continuam sem vazar nada, imagem inclusive. A ordem de turno em si é
sempre pública.

"Receber dano" (`ReceberDanoDialog`, reusado no cartão do combatente e no rótulo "Vida" da ficha
de agente/criatura) aplica `calcularDanoRecebido` (`shared/regras/encontro`): os quatro tipos
bloqueáveis reduzem por resistência de ficha + custom (piso 0), a resistência **Geral** reduz a
soma dos residuais uma única vez, e o dano **Geral** é irredutível; o delta é sempre clampado para
nunca levar a Vida abaixo de 0 (o backend rejeita Vida negativa, nunca clampa sozinho).

O log (`log-encontro`) é um componente burro: renderiza só o que `EncontroRecuperadoDto.eventos`
já traz recortado pela revelação (§14) — nunca filtra de novo. Qualquer evento novo que carregue
estado de combatente precisa do mesmo cuidado: `emitirEncontroAlterado` é **por usuário**, não por
sala, porque o payload varia conforme o que cada um pode ver.

Mobile (padrão de referência para telas novas): nenhum componente lê `matchMedia` diretamente — um
sinal de intenção (`ajustando`, `aberto`, `acoesAbertas`) é consumido só pelo CSS do breakpoint;
rótulos alternativos (`Energia`/`En`) ficam os dois no DOM, escondidos por `display: none` (também
some da árvore de acessibilidade, sem leitura duplicada). Em 360px: cabeçalho condensado, steppers
atrás de "Ajustar", ações secundárias atrás de "Mais ações", log atrás do próprio gatilho, e
"Avançar turno" fixo no rodapé — mesma receita do rodapé do guia de criação de ficha. No desktop,
abrir uma ficha pela Iniciativa limita a janela a `1100×600` (mestre) ou geometria compacta
(jogador); o jogador com combatente próprio tem o atalho "Minha ficha" fixo, ausente no desktop.

### Tempo real — `backend/core/gateway`

Gateway Socket.IO **broadcast-only**: toda mutação passa por REST, o gateway nunca recebe escrita.
Handshake autenticado pelo mesmo `JwtService` do Passport. Salas `ficha:<id>` e `campanha:<id>`,
reusando a permissão §14 das services. Eventos: `ficha:criada`, `ficha:alterada`, `membro:entrou`,
`rolagem:registrada`, `campanha:estado-alterado`, `campanha:inventario-alterado` e
`encontro:alterado` (por usuário — ver "Encontro de Combate" abaixo). Os eventos de
inventário/estado sinalizam o frontend para reler a fonte de verdade por REST.

`CampanhaGateway.emitirFichaAlterada` também aciona `EncontroService.sincronizarFichaAlterada` após
todo `ficha:alterada` (correção pós-`m7-17`, ver topo do arquivo): se a ficha alterada for
combatente de um encontro aberto da mesma campanha, o encontro é remontado e `encontro:alterado` é
retransmitido — sem isso, qualquer edição de Vida/Energia/Condição feita **fora** do
`EncontroService` (ficha flutuante do próprio Encontro, ou a ficha "solta" de um combatente ativo)
persistia corretamente mas nunca atualizava os cartões da Iniciativa em tempo real. `GatewayModule`
importa `EncontroModule` (`forwardRef`, mesmo padrão de `FichaModule`/`CampanhaModule`); a direção
inversa (`Ficha` → `Encontro`) continua proibida.

`emitirRolagemRegistrada` (m3-27/`m3-77`) usa **duas salas mutuamente exclusivas**, nunca as duas:
com campanha, só `campanha:<id>` (como sempre); ficha solta (`campanhaId === null`, m3-28), só
`ficha:<id>` — a única sala que ela tem. Emitir nas duas ao mesmo tempo duplicaria o evento pra quem
está nas duas salas simultaneamente (`campanha/detalhe`, que ingressa o mesmo socket em
`campanha:<id>` e em `ficha:<id>` de cada ficha visível). `visualizar.page.ts`/
`visualizar-criatura.page.ts` (a ficha numa tela só) assinam `rolagemRegistrada$` desde a `m3-77`:
entram também em `campanha:<id>` quando a ficha pertence a uma, prependam o histórico local e chamam
`BandejaDadosService.mostrar()` — uma rolagem feita por outro caminho (outra aba do dono, o mestre
rolando pela ficha, o Encontro) aparece sem F5. Dedupe contra o eco do broadcast pra quem acabou de
rolar tem duas camadas: histórico por `id` (topo do array, qualquer ordem de chegada) e bandeja por
"rolagem local em voo" (`FichaRolagemRegistroService.enviando$`/`finalizada$`, um contador na página)
— **não** dá pra deduplicar a bandeja só por `id` porque o eco do socket pode chegar **antes** da
resposta HTTP do próprio POST (confirmado ao vivo com clique real), quando o `id` real ainda não
existe no histórico local.

### Simulação pública — `frontend/src/app/modules/simulacao`

Seis abas públicas e 100% client-side (consomem `shared/regras` direto, sem backend): `agente`,
`dt`, `novo-agente`, `patente`, `descanso`, `compras` (com modo Vender). Paridade com a calculadora
antiga confirmada. A aba `descanso` também recebe Medicina, Vontade e as opções Segundo Fôlego e
Metabolismo Acelerado; faixa, fórmula e rolagem vêm integralmente de `shared/regras/descanso`.
Módulo renomeado de "Calculadora" (M1) para "Simulação" (rota `/simulacao`, topbar "Simulação") —
o nome antigo colidia com a calculadora aritmética real da ficha
(`shared/calculadora-flutuante/`, botão "Abrir calculadora"), que não muda de nome nem de escopo.

### Documentos de regras — `frontend/shared/leitor-documentos`

Sistema e Guia do Mestre são públicos e acessíveis globalmente pelo mesmo leitor. O shell do sistema
controla documento, abertura, recolhimento e geometria; o PDF fica em um `iframe` e usa o viewer
nativo do navegador para nitidez, busca, seleção, páginas e zoom. O leitor próprio baseado em PDF.js
foi removido após a validação visual revelar baixa nitidez e texto duplicado. Os PDFs canônicos vivem
somente em `docs/core/` e o build os publica em `/documentos/`.

### Biblioteca de componentes própria — `frontend/src/app/shared/ui/`

Camada de primitivos criada pela `ui-01` para acabar com o bloco BEM copiado (`P-034`). **`app-botao`**
(seletor de atributo — `<button app-botao variante="primario">`, com a fresta
`--botao-opacidade-desabilitado` para a tela que ainda diverge do 0.55 canônico) e **`app-campo`**
(invólucro de campo com rótulo, dica e erro em volta do controle projetado, `[tamanho]` em
`compacto`/`padrao`/`amplo`). Ambos consumidos por `login` e `registro`, que perderam suas cópias
locais. A `ui-04` adotou os primitivos por todos os módulos e eliminou os seletores-base locais;
o `CampoRotulado` permite migrar formulários densos existentes com `<label app-campo>` sem criar
um nó intermediário. O `app-campo` é invólucro, **não** `ControlValueAccessor`: o consumidor continua
escrevendo o controle nativo com `formControlName`, e ele tem de ficar filho DIRETO do `<label>`,
senão a regra global de asterisco obrigatório (`styles/tema/_base.scss`) para de casar — contrato
travado em `campo.component.spec.ts`. `Stat` ganhou a densidade `compacto` e `StepInput` as
variações `compacto`/`mini`, para preservar os guias de criação e a loja sem cópia local.

A `ui-08` adicionou **`app-botao-icone`** ao mesmo diretório: um seletor de atributo aplicado ao
`<button>` nativo para ações unitárias sem rótulo visual. O consumidor informa obrigatoriamente
`aria-label` e `appTooltip`; o primitivo concentra borda, cor, hover, foco e desabilitado, com
`[tamanho]="compacto"` (26 px) ou `padrao` (32 px), ambos promovidos para o alvo de toque de 44 px
no mobile. Senha visível, copiar convite, lápis de edição, ações do caderno e fechar modal usam esse
contrato. Keypads, `app-step-input`, abas, backdrop do modal e controles de domínio compostos ficam
fora dele.

A `ui-09` estendeu a adoção à ficha e à Simulação: ações rotuladas de Inventário, Compras/Vendas e
cartões da ficha usam `app-botao`; confirmações, remoções e ações unitárias por ícone usam
`app-botao-icone`; os três seletores de quantidade em modal do inventário usam `app-step-input`.
Classes `ficha-inv__btn`, `compras-btn` e `ficha-cartao__acao` sobrevivem apenas como ganchos de
layout ou animação de feedback. Incrementos e edições derivadas que são controles de domínio
permanecem fora da API de botão, conforme `I-025`/`I-026`.

A `ui-12` (2026-09-01) separou semântica de estado do accent trocável pelo usuário: `--erro`
referencia o vermelho fixo de `--vida` e é usado por erro de campo e `app-botao
variante="perigo"`, sem depender do accent; `--accent-text` é obrigatório em qualquer
preenchimento de accent (abas ativas, tecla `=` da calculadora); `TemaService` calcula
`--accent-press` para o estado pressionado de botões preenchidos e de contorno, com inversão
controlada nos extremos branco/preto para os três estados não colapsarem.

A `ui-01b` completou a API de `app-botao` com **8 severidades** (`primario`, `secundario`,
`positivo`, `info`, `aviso`, `perigo`, `ajuda`, `contraste`) × **4 estilos** (`preenchido`,
`contorno`, `texto`, `link`, com um padrão por severidade), mais `[tamanho]`, `[posicaoIcone]`,
`[fluido]` e `[carregando]`. Tudo o que a `ui-01` não tinha é **opt-in**: sem `[tamanho]` o
primitivo continua sem definir dimensão, e a base segue exatamente como estava — é o que mantém
`login`/`registro` sem mover um pixel. Ficaram deliberadamente de fora `rounded` e `raised`
(contrariam o raio máximo e a regra de sombra do `DESIGN.md`) e `badge` (é outro componente, não
uma variante). As cores `--help` e `--contrast` nasceram aqui e são as duas únicas da paleta sem
papel de domínio.

A `ui-02` (2026-08-28) acrescentou **`app-modal`** e **`Notificacao`**/`app-notificacoes`.
`app-modal` é elemento (não atributo, como o `Botao`) sobre o
`<dialog>` nativo — `[aberto]`/`[titulo]` obrigatórios, `[largura]` opcional (CSS livre) e
`(fechou)` unificando Escape, clique no `::backdrop` e o "×". O top layer do `<dialog>` elimina o
`P-025` (overlay preso a `position: static` num container rolável) e qualquer `z-index` só para
vencer CSS de terceiro — inclusive o de `GuiaFormula`, que virou consumidor do primitivo e perdeu
o overlay próprio. Três armadilhas relevantes para o próximo primitivo a construir sobre
`<dialog>` (ver `HISTORY.md` do dia para o relato completo): (1) `.modal { display: flex }` puro
perde para `dialog:not([open]) { display: none }` do UA stylesheet **só depois** que a
encapsulação de view do Angular acrescenta `[_ngcontent-xxx]` — o `display` tem que morar em
`&[open] { ... }`; (2) `[largura]` nunca deve virar `[style.max-width]` inline — um `style` inline
vence qualquer media query de responsividade; vira `[style.--modal-largura]` consumida via `var()`
no SCSS; (3) o `<dialog>` só ganha caixa se **nenhum ancestral** tiver `display: none` — `showModal()`
resolve empilhamento (top layer), não geração de caixa —, então um modal cujo gatilho vive numa
aba/rota diferente de onde o modal está fisicamente declarado precisa morar fora de qualquer
container de aba, como `app-receber-dano-dialog` já fazia. `Notificacao` segue o mesmo padrão de
fila em Signals de `BandejaDadosService` (sem RxJS); a severidade `erro` usa `--vida` (fixo), não
`--accent`, para não repetir o `I-024`.

A `ui-03` (2026-08-29) fechou o conjunto de composição visual: **`app-cartao`** (`[titulo]`
opcional — sem ele é só a caixa; índice do cabeçalho por projeção `[cartaoIndice]`, cobre texto e
ícone com um mecanismo só), **`app-stat`** (`[rotulo]`/`[valor]`/`variante` em
`vida`/`energia`/`positivo` — só exibição pura; um campo editável com rolagem de dado é outro
primitivo, ainda não construído, `IDEAS.md` `I-025`), **`app-chip`** (`variante` `padrao`/`sutil`
para rótulo; `severidade` `primario`/`secundario`/`aviso`/`perigo` + `tom` `sutil`/`contorno` para
estado, com slot opcional de `app-icone` — a `ui-13`, 2026-09-01, migrou as cinco cópias locais da
mesma receita para esse modo)
e **`app-abas`**/**`app-aba`**/**`AbaPainel`** (tablist/tab/tabpanel — só para troca de painel no
lugar, não navegação de rota; setas/Home/End com ativação automática, recuperado de um algoritmo
que já existia **escrito e correto** mas nunca ligado a nenhum template em
`ficha-visualizacao.component.ts`, m3-11). O `StepInput` (`app-step-input`) foi promovido de
`modules/simulacao/componentes/step-input/` para `shared/ui/stepper/` com o contrato intocado —
mesmo seletor, sem piloto novo (as 4 cópias locais restantes têm obstáculo real: duas mostram um
valor **derivado** — atributo + bônus — que digitação direta editaria errado, duas outras
precisam de um `[tamanho]` compacto que o primitivo ainda não tem, `IDEAS.md` `I-026`).
Dois bugs só apareceram na verificação ao vivo, nenhum pego por teste unitário isolado: a
navegação por teclado usava o sinal `ativa()` do consumidor (atualiza só no próximo ciclo do
Angular) em vez do foco real de DOM, perdendo passos em setas rápidas; e `.abas__rotulo`, sendo
conteúdo **projetado** pelo consumidor, precisa de `:host ::ng-deep` para o colapso mobile
alcançá-lo — um seletor simples no `.scss` do `Aba` nunca bate no `<span>` de fora (encapsulamento
de view aplica o atributo do TEMPLATE DO CONSUMIDOR, não o do componente).

### Tema — `frontend/tema`

"Terminal de Contenção" dark-first com **troca em runtime** (`TemaService`: presets + color picker
com trava de contraste). Tokens CSS + Tailwind apontam para as CSS custom properties, única fonte
de verdade em runtime; o serviço aplica também `color-scheme` no `<html>` para controles nativos
acompanharem a base clara/escura. Botão preenchido sobre `--accent` usa `--accent-text`: o serviço
escolhe dinamicamente branco ou preto pelo maior contraste, e `--accent-hover` ajusta o fundo na
mesma direção para preservar WCAG AA no hover sem restringir presets ou cores customizadas.
`--cor-ficha` (`m3-61`) é um token **separado**, por personagem, não por usuário — nunca ganha
valor fixo em `_tokens.scss`, sempre `[style.--cor-ficha]` inline por instância; ver "Ficha de
jogador" acima e `docs/design/DESIGN.md`.

### Infraestrutura

14 migrations (`0001`…`0014`), Knex + Docker Compose local, CI de lint+testes em PR, deploy nativo.
O ambiente local é descartável e reproduzível por `npm run db:reset:dev`: o comando trava o alvo em
`development`/localhost/`contratados_rpg`/`postgres`/armazenamento local, remove o volume sem backup,
reaplica migrations e semeia 4 usuários, 2 campanhas, 8 vínculos e 8 fichas coloridas. Cada
usuário possui uma ficha diferente em cada campanha. O seed
transacional isolado é `npm run db:seed:dev`; cenário e credenciais estão em `docs/DEVELOPMENT.md`.

---

## 5. Decisões Vigentes

Decisões que **continuam governando código novo**. Não as re-litigue sem falar com o autor.

- **DTOs são `interface readonly`, não classes** — o projeto não instala `class-validator` e o
  backend **não liga o `ValidationPipe`**. A validação estrutural fica documentada campo a campo na
  spec; a validação real é de regra de negócio, no service. Não converter DTOs em classes nem
  instalar `class-validator` sem pedir.
- **Deploy nativo, não Actions** — o autor prefere Cloud Build/Cloudflare puxando do Git a
  pipelines de deploy no GitHub Actions. O Actions fica só com o CI.
- **Busca de anotações e documentos começa no PostgreSQL** — usar full-text search nativo
  (`tsvector`/`websearch_to_tsquery`) com índice GIN, respeitando sempre o recorte de permissões no
  backend. Elasticsearch não entra na infraestrutura atual; fica como evolução opcional, com
  PostgreSQL preservado como fonte de verdade e o índice externo reconstruível.
- **Cadernos de campanha são privados por autor** — cada membro tem conceitualmente um caderno por
  campanha, composto por páginas Markdown. O autor administra as próprias páginas; o mestre apenas
  lê e pesquisa páginas dos jogadores; jogadores nunca acessam cadernos entre si. A busca unifica
  cadernos e anotações de ficha com fontes combináveis conforme o papel. O Caderno é um utilitário
  flutuante junto de Calculadora e Documentos; contrato e decisões em
  `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`.
- **Edição no próprio lugar** — toggle inline na mesma tela, nunca uma página de formulário
  separada. Vale para ficha, campanha e perfil.
- **Enum de coluna relacional é tabela `tipo_*`** (SYSTEM.SPEC §10.2.12, proibição #24). A exceção
  "enum só em `shared/`" vale **apenas** para conteúdo dentro do JSONB `ficha.dados` (classes,
  patentes, categorias de item). Enum que vira coluna ganha tabela de referência — foi assim com
  `tipo_rolagem_visibilidade` na `m3-27`.
- **Rolagem `PRIVADA` nunca trafega por WebSocket** — o gateway só emite `rolagem:registrada` para
  rolagens públicas. A privada só chega por REST, a quem tem permissão.
- **A UI é de componentes próprios** (decisão do autor, 2026-08-28). A auditoria
  mediu o uso real: `p-dialog` (13 tags reais em 5 arquivos — a spec original contava 14 por
  incluir uma menção em comentário), `p-toast`/`MessageService` e o preset de tema — nenhum
  `pButton`, `p-select`, `p-inputtext`, `p-table`, `p-tabs`, `p-tooltip`. Os controles são nativos
  (723 `<button>`, 219 `<input>`, 71 `<select>`, 31 `<textarea>`) estilizados à mão. A biblioteca
  própria passa a existir como **código** em `frontend/src/app/shared/ui/`, não como blocos
  copiados de `_componentes.scss` (`P-034`). Série `ui-01`…`ui-05`; `ui-01`…`ui-04`
  fecharam (ver acima). A `ui-05` removeu a última dependência de biblioteca de componentes e o
  tema segue exclusivamente pelas CSS custom properties.
  Decisão associada: **não** migrar para React — o estudo de esforço (6–9 meses-dev) está no
  `HISTORY.md` de 2026-08-28 e concluiu que o problema real é o design system, não o framework.
- **Na biblioteca própria, o primitivo é dono da identidade e o consumidor é dono do tamanho**
  (`ui-01`, 2026-08-28). O primitivo carrega cor, raio, fonte, transição e estado; padding,
  `font-size`/`weight`, `min-height` e alvo de toque continuam na classe BEM do consumidor,
  aplicada no **mesmo elemento**. Por isso o `Botao` é componente de **seletor de atributo**
  (`<button app-botao variante="primario">`, no padrão do `<button matButton>`): o host é o
  próprio `<button>`/`<a>`, sem nó novo em container flex/grid e sem perder a classe-companheira
  que dimensiona. `@angular-eslint/component-selector` aceita `['element', 'attribute']` por causa
  disso; o prefixo `app` continua obrigatório. Invólucros que acrescentam DOM (`app-campo`)
  seguem sendo elemento. Não inventar `[tamanho]` sem duplicação medida atrás.
- **A ficha aposentou o sistema de abas de página inteira da `m3-11`** (substituído pelas 3 colunas
  da `m3-38`). `AbaFicha`/`ABAS_FICHA`/`ehAbaFicha` ainda existem no código mas estão **fora do
  template** — não estenda esse sistema, mesmo que uma spec antiga peça.
- **`docs/specs/active/m3-38-*.spec.md` é uma spec deliberadamente permanente** — ela documenta
  retroativamente o redesenho da tela de ficha e novos ajustes dessa mesma frente entram nela em vez
  de virar spec solta. É a **exceção** consciente ao "active/ = task da sessão atual".
- **A ficha permite estado incoerente de propósito** — a validação do backend só checa **teto**
  (Vida ≤ máximo, Nível no intervalo da classe). Condições (Morrendo/Machucado/Inconsciente) são
  alternadas à mão e nunca validadas; exceder o Inventário máximo é **aviso**, não trava.
- **Gate de qualidade é definição de pronto** — toda tarefa exige evidência contra a spec e as
  convenções, revisão do diff e verificação proporcional. UI exige verificação ao vivo conforme
  `verify`; item sem uma verificação obrigatória permanece aberto. **Qualidade acima de velocidade**
  é decisão expressa do autor: nenhuma pressa, delegação ou limite de execução autoriza atalhos. UI
  exige análogo aprovado e inspeção pessoal do agente principal em 1920×1080 e 360×800; build,
  testes, tokens e relato de subagente não substituem a comparação visual. O checklist canônico está
  em `AGENTS.md` e `CLAUDE.md` “Gate obrigatório de qualidade e conclusão”; os
  dois arquivos devem permanecer cópias integrais.

---

## 6. Sempre Lembrar

Armadilhas que já custaram retrabalho neste repositório. Cada uma tem um episódio no `HISTORY.md`.

**CSS / layout**

- **`overflow-x: clip` + `overflow-y: visible`** é a combinação usada em `html` (`styles.scss`) e
  `.conteudo` (`layout.component.scss`). Trocar qualquer um desses `clip` por `hidden`/`auto`
  **mata todo `position: sticky` da tela em silêncio** — é a tentação natural de quem está caçando
  overflow horizontal. Está comentado no SCSS; leia antes de mexer.
- **`@extend` + media query:** o seletor é injetado no media query, mas uma declaração **posterior**
  no arquivo com a **mesma especificidade** vence lá dentro. Foi assim que um `width: 18px` anulou
  um alvo de toque de 44px que "parecia" corrigido.
- **Especificidade anula media query:** `.bloco--modificador` (0,2,0) vence uma regra de media query
  em `.bloco` (0,1,0), e a regra simplesmente nunca roda. A correção é repetir o media query
  **dentro** do bloco do modificador, empatando a especificidade.
- **Nunca hardcodar hex/fonte/raio** (proibição #29) — sempre `var(--token)`. O tema troca em
  runtime; um hex solto não acompanha.
- **Base fixa + `min-width` num flex row transborda em silêncio.** `flex: 0 0 500px` numa coluna e
  `min-width: 260px` na irmã pedem 776px; numa linha de 644px o flexbox **não** encolhe nenhuma das
  duas — a segunda simplesmente sai por baixo do que estiver à direita, sem barra de rolagem e sem
  erro. Achado na `m2-21` (o card de Status do painel do jogador ficava por baixo da coluna lateral
  desde a m2-20). Em duas colunas que dividem uma linha de largura desconhecida, use `flex: 1 1
  <base>` + `min-width: 0` nas duas e trave o teto com `max-width`, nunca o piso.

**Angular**

- **Ler `input.required()` no corpo do construtor causa `NG0950` em runtime** e os testes **não
  pegam** (o TestBed injeta o input antes do primeiro change detection). Envolva em `effect()`.

**Backend / SQL**

- Todo SELECT precisa de `WHERE [tabela].is_deleted = false`; parâmetros nomeados (`:nome`), nunca
  posicionais nem interpolação; INSERT via `INSERT ... SELECT ... RETURNING`, nunca `VALUES`;
  nenhuma coluna com `DEFAULT`; soft delete sempre, `DELETE` físico nunca.
- **`COUNT(*)` do Postgres é `bigint`, e o driver `pg` devolve `bigint` como `string`** (evita
  perda de precisão) — um `COUNT(*)` sem `::int` explícito quebra silenciosamente qualquer DTO
  tipado `number` (TypeScript não pega; só aparece numa soma/comparação estranha em runtime).
  Sempre `COUNT(*)::int` quando o resultado alimenta um campo `number`. Achado na `m2-18`.
- **Controller é burro** — sem lógica, sem `try/catch`, sem `if`. A única micro-inteligência aceita
  é fundir id de `@Param`/`@Query` no DTO.

**Regras de jogo**

- **Amplificadores e Modificações escalam por COMPRA, não por stack bruto** — a 1ª compra em ■■
  (Flexível/Resistente/Potente/Conservador/Veloz) **não** dobra o bônus; a penalidade continua no
  bruto.
- Se código e `docs/core/sistema-v4.1.0.md` divergirem, **o documento vence** (proibição #27).
- **`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" tem duas divergências
  internas entre a fórmula geral e o exemplo "A Estátua"**: o modificador Fraco em VD 30 (fórmula
  dá +5, o exemplo mostra "+6") e o mínimo de Fraqueza (fórmula exige 26 — metade da soma de
  resistências 52 —, o exemplo declara 20). Quando o próprio documento se contradiz entre regra
  geral e exemplo pontual, a **fórmula geral vence** (decisão de abertura da `m4-02`) — o exemplo é
  mais sujeito a erro de transcrição. Ver `shared/src/regras/criatura/modificadores.ts` e
  `a-estatua.spec.ts`. Relevante para `m4-06` (`shared/regras/npc`) se a Biblioteca de Referência
  tiver o mesmo tipo de inconsistência.
- **Criatura tem DTOs de operação próprios, não união com jogador (decisão de abertura da
  `m4-03`)** — `FichaCriaturaCriarDto`/`*CriadaDto`/`*RecuperadaDto`/`*AlteradaDto`
  (`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`), espelhando a decisão de "dois
  contratos, não um" já fechada em `m4-01` para o documento de jogo. `FichaRepository`
  continua único e sem duplicação (`criarFicha`/`recuperarPorId`/`alterarFicha` são SQL
  agnóstico da forma do JSONB); a ponte de tipos entre os dois contratos acontece só dentro de
  `FichaService`, num cast documentado (`paraCriaturaCriada`/`*Recuperada`/`*Alterada`). Mesma
  decisão vale de referência para `m4-07` (NPC).

**Processo**

- **Antes de qualquer UI**, ler `docs/design/DESIGN.md` e consumir `docs/design/tema/`. Isso já foi
  esquecido uma vez (`m0-05`) e a tela nasceu com preset Aura base + hex hardcoded.
- **Sessões concorrentes na mesma branch acontecem** — reconferir `git status`/`HEAD` antes de
  commitar ou revisar um diff.

---

## 7. Decisões Pendentes

Nenhuma decisão de rumo em aberto no momento.

A única que existia — **identidade visual do site** — está **resolvida**: tema "Terminal de
Contenção", handoff completo em `docs/design/`, com troca em runtime entregue na `m1-13`.

**Resolvida na `m4-04b`:** a pendência registrada na `m4-04` (`FichaVisualizacao`, a tela de ficha
de jogador, não sabia ler `ficha.dados` no formato de criatura — abrir uma criatura recém-criada
por `/painel/:campanhaId/ficha/:id` lançava `TypeError`) foi fechada com a opção prevista pela
própria spec: **tela dedicada** (`CriaturaVisualizacao`, `/painel/:campanhaId/criatura/:id`), não
um `modo`/tipo novo em `FichaVisualizacao` — ver seção 4, parágrafo "Visualização/edição".
`FichaVisualizacao` continua sem entender o formato de criatura, mas não precisa mais: a navegação
pós-criação e o card de criatura no painel do mestre (`m4-04b`) já levam à tela certa.

Questões que precisam de resposta do autor mas não são decisões de rumo estão marcadas com **⚠** na
seção 1 e em [`PROBLEMS.md`](PROBLEMS.md).
