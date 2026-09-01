# UI-16 — Barra de recurso e recuo do cartão de combatente

> Filha da auditoria visual (seções Cartão de combatente e Componentes novos). A lista abaixo
> corrige três pontos do rascunho original verificados no código: (1) Sanidade não é um recurso
> numérico — `sistema-v4.1.0.md` §Sanidade diz textualmente "sua sanidade não é uma 'barra' de
> valor convencional", e o app já a trata assim (`ficha-sanidade`, listas de Sequelas/Traumas/
> Lesões, sem `atual`/`máximo`); (2) "painel do mestre" não tem marcação própria de recurso para
> migrar — `painel-encontro.page.html` só instancia `<app-cartao-combatente>` e repassa
> `vidaAjustada`/`energiaAjustada`, então adotar o primitivo no cartão já cobre o painel inteiro;
> (3) `app-chip` (ui-13) não tem severidade `info` — `ChipSeveridade` é
> `'primario' | 'secundario' | 'aviso' | 'perigo'` (`chip.component.ts`). Ver Entregável 5.
> Mexe em tela de jogo: pede uma rodada de mesa antes de fechar.

## Objetivo

Criar o primitivo de recurso (Vida, Energia) que hoje tem pelo menos três desenhos concorrentes —
e um quarto lugar, o cartão de combatente, sem barra nenhuma — e corrigir o recuo do estado "já
agiu", que apaga justamente os números que o mestre precisa ler.

Hoje a mesma dupla atual/máximo com barra de progresso é remarcada em:
`ficha-hud__trilho` (HUD sticky mobile de `ficha-visualizacao.component.html`, trilho de 4px,
`--radius-tight`), `ficha-barra__trilho` (bloco de vitalidade da mesma ficha, desktop, trilho de
8px, `--radius-control`, steppers `ficha-passo` com `appHoldRepeat`) e `criatura__barra-vida`
(`criatura-visualizacao.component.html`, `role="progressbar"` próprio, steppers `criatura__passo`).
O cartão de combatente (`combatente__recurso`) não tem trilho algum: é `Vida {{atual}}/{{máximo}}`
em texto puro com um `−`/`+` de 18px em cada lado.

## Entregáveis

1. `app-barra-recurso`: par rótulo/valor com trilho, cor por recurso e limiar de alerta abaixo de
   25%. Tokens: `--vida`, `--energy`, `--warning`, `--surface-2` (trilho), `--radius-control`,
   rótulo 10px/600. Nenhuma das duas alturas de trilho hoje em uso (4px do HUD, 8px da ficha) é
   normativa — escolher uma só e apagar as outras duas.
2. Adotar em `ficha-visualizacao.component.html` (HUD **e** bloco de vitalidade — dois call sites
   na mesma tela, não um) e no `combatente__recurso` de `cartao-combatente.component.html`,
   apagando a marcação própria de cada um. Não existe terceiro call site: o painel do mestre
   (`painel-encontro.page.html`) só embrulha `app-cartao-combatente`, então herda o primitivo sem
   trabalho adicional. No cartão, Vida e Energia deixam de ser texto puro com steppers de 18px em
   volta — os controles sobem para o alvo mínimo. `criatura-visualizacao.component.html`
   (`criatura__barra-vida`) fica de fora — ver Fora de Escopo.
3. Trocar o recuo de `--agiu`: hoje é `opacity: 0.62` no `.combatente` inteiro
   (`cartao-combatente.component.scss`, regra `&--agiu`). Trocar por recuo pela moldura — retrato
   a 0,55, etiqueta "já agiu" em `--text-mute`, borda atenuada — mantendo números e barras em
   contraste cheio.
4. Fixar a precedência entre `--ativo`, `--agiu` e `--morrendo`. Hoje elas já produzem um
   resultado — mas por acidente de ordem de declaração no SCSS, não por decisão registrada:
   `&--ativo` (linha 25, fundo `--accent-dim`) vem antes de `&--morrendo` (linha 38, fundo
   `color-mix(accent 8%, surface)`), então um combatente que é a vez **e** está morrendo perde o
   destaque forte de "é agora" para o tom mais surdo de "morrendo" — sem ninguém ter decidido isso.
   `&--agiu` só mexe em `opacity` (linha 33), então empilha sobre qualquer uma das duas sem
   conflito; no template, `--agiu` já é mutuamente exclusivo de `--ativo`
   (`jaAgiu() && !ehTurnoAtual()`, `cartao-combatente.component.html:5`), mas não de `--morrendo`.
   As combinações reais são: nenhum, só um dos três, `ativo+morrendo` e `agiu+morrendo`. Decidir
   se `ativo+morrendo` deve continuar cedendo ao tom de morrendo ou se "é a vez dele" precisa
   vencer visualmente mesmo morrendo (a etiqueta de texto já resolve isso — `etiqueta()` em
   `cartao-combatente.component.ts` retorna "Morrendo" antes de checar o turno), e documentar a
   escolha no `DESIGN.md`.
5. Promover Cadência a chip. Correção: **não existe severidade `info`** em `app-chip` — as
   quatro são `primario`/`secundario`/`aviso`/`perigo` (`chip.component.ts`,
   `chip.component.scss`). Usar `severidade="secundario"` (cinza neutro, `--text-dim`/
   `--surface-2`/`--border-strong`), que já é o tom informativo do catálogo — não estender ui-13
   com uma quinta severidade para esta task. Também não é um recorte trivial de CSS: hoje a
   Cadência não é um nó isolado, é um sufixo concatenado dentro da string de `linhaOrigem()`
   (`cartao-combatente.component.ts:168-195`, ex. `"Criatura da campanha · Cadência 2"`), que cai
   inteira dentro de `.combatente__origem` (9px). Virar chip exige separar esse sufixo da string e
   projetá-lo como elemento próprio ao lado da linha de origem.

## Critérios de Aceite

- Uma criatura de Cadência 2 no estado "já agiu" mantém Vida, Defesa e selo de iniciativa
  legíveis; o recuo continua perceptível à distância de leitura da mesa.
- As quatro combinações de estado (nenhum, um dos três, `ativo+morrendo`, `agiu+morrendo`) têm
  resultado definido, documentado no `DESIGN.md` e reproduzível — sem soma de opacidades nem
  precedência decidida só pela ordem das regras no SCSS.
- Cadência aparece como `<app-chip severidade="secundario">` fora da string de `linhaOrigem()`.
  Hoje `sufixoCadencia` é uma variável só, concatenada nas seis ramificações dessa função
  (identidade visível, não revelado, avulso, criatura, jogador, padrão) — a extração vale para
  todas de uma vez, não é preciso repetir por tipo de combatente.
- Steppers de recurso no cartão têm alvo de 44px no mobile.
- Gate visual do encontro nos dois viewports, nos quatro estados e nas combinações.

## Fora de Escopo

`criatura-visualizacao.component.html` (`criatura__barra-vida`) — a ficha de criatura está em
refatoração manual (m4-04b) e o próprio `DESIGN.md` já a marca fora de escopo de revisões de
tema ("nenhum token, componente ou captura relacionado a criatura foi revisado ou alterado
aqui"); migrar seu recurso pertence a essa refatoração, não a esta task. Sanidade — não é
modelada como par atual/máximo (ver nota no topo); nada muda em `ficha-sanidade`. Regras de jogo
(valores, limites, cálculo de sobrecarga), reordenar a fila de iniciativa e redesenhar o retrato.

## Dependências

`ui-13` (chip com severidade — reutilizada como está, sem nova severidade), `tema/_tokens.scss`,
`docs/design/DESIGN.md`.

## Riscos e Mitigação

- Trocar o recuo pode deixar o "já agiu" fraco demais na mesa. Validar em sessão real antes de
  fechar a task; se necessário, somar um segundo sinal de moldura em vez de voltar à opacidade
  global.
- Fixar `ativo` acima de `morrendo` (ou o inverso) muda um comportamento que a mesa já viu, mesmo
  que por acidente. Validar as duas leituras em sessão real antes de travar a escolha no
  `DESIGN.md`.
