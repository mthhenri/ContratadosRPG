# ui-02-modal-e-notificacao.spec.md

> Task 2/5 do guarda-chuva `ui-biblioteca-componentes.spec.md`. Substitui os dois únicos
> componentes PrimeNG em uso. Origem: `PROBLEMS.md` `P-034`; contexto de `P-025` (já fechado).

## Objetivo

Entregar `Modal` (sobre o `<dialog>` nativo) e `Notificacao` (toaster próprio, com serviço de fila
em Signals), migrar os **14 `<p-dialog>`** e o **`<p-toast>`/`MessageService`** para eles, e deixar
o PrimeNG sem nenhum consumidor fora do tema.

## Motivação técnica

A superfície do `p-dialog` em uso é pequena e uniforme — `[visible]`, `[modal]="true"`,
`[draggable]="false"`, `[resizable]="false"`, `[dismissableMask]="true"`, `[appendTo]="'body'"`,
`[style]="{ width }"`, `[breakpoints]`, `header`, `styleClass`, `(onHide)`. Metade disso existe só
para **desligar** recurso do PrimeNG que o projeto não usa.

O `<dialog>` nativo com `showModal()` entrega de graça o que custou dois defeitos ao projeto:

- **Top layer.** O `P-025` (`<p-dialog>` invisível no mobile sem `[appendTo]="'body'"`, porque o
  overlay renderizava preso à árvore do componente dentro de um contexto de empilhamento rolável)
  deixa de ser possível: o top layer não depende de `position`, `z-index` nem de contexto de
  empilhamento. Isso importa agora — **3 dos 14 `p-dialog` ainda não têm `[appendTo]`**
  (`ficha-inventario.component.html`, linhas 579, 841 e 856) e só não reproduzem o defeito porque
  hoje não estão dentro de um container rolável. É a mesma classe de bug esperando o próximo
  reparente.
- **Foco e `inert`.** Armadilha de foco, `Escape` e inertização do resto da página são nativos —
  hoje dependem da implementação do PrimeNG.
- **Sem `::ng-deep`.** O `z-index: 1200` de `guia-formula.component.scss` ("acima do p-dialog do
  PrimeNG (modal em 1100)") e o `:host ::ng-deep .p-dialog-content { overflow-y: visible }` de
  `ficha-inventario` existem só para vencer o CSS de terceiro. Saem os dois.

## Entregáveis

1. **`shared/ui/modal/`** — `app-modal` sobre `<dialog>` + `showModal()`/`close()`. API mínima,
   derivada dos 14 usos: `[aberto]`, `[titulo]`, `[largura]`, `(fechou)`. Fechar por `Escape`
   (evento `cancel` do `<dialog>`), por clique no `::backdrop` e pelo botão de fechar — os três
   caem no mesmo `(fechou)`, que é o destino atual dos `(onHide)`. Sem `draggable`, sem
   `resizable`, sem `appendTo`, sem `[breakpoints]`: a largura vem de `[largura]` e o colapso
   mobile do próprio SCSS do primitivo, via `@include bp.mobile` (`tema/_breakpoints.scss`).
2. **Comportamento do conteúdo, explicitamente:** conteúdo rola **dentro** do modal só quando
   excede a altura disponível; overlay filho (dropdown, tooltip, guia de fórmula) nunca é clipado.
   É o comportamento que o `:host ::ng-deep .p-dialog-content { overflow-y: visible }` de
   `ficha-inventario` teve que forçar — aqui é o padrão. Travar a rolagem do `<body>` enquanto
   houver modal aberto.
3. **`shared/ui/notificacao/`** — `NotificacaoService` (fila em Signals, sem RxJS) + `app-notificacoes`
   montado no `layout` na posição atual (`bottom-center`). Cobrir as 4 severidades em uso
   (`success`, `info`, `warn`, `error`), `summary` + `detail`, auto-dispensa com tempo por
   severidade, dispensa manual, empilhamento, `aria-live` e largura mobile correta **por CSS
   próprio** — a regra `.p-toast { width: calc(100vw - 32px) !important }` do `styles.scss` sai
   junto, com o comentário de `m3-56` migrado para o primitivo.
4. **Migração dos 14 `p-dialog`** nos 5 arquivos: `ficha-inventario` (6), `ficha-visualizacao`,
   `ficha-sanidade`, `ficha-rolagens`, `receber-dano-dialog`. Remover junto o `z-index: 1200` de
   `guia-formula.component.scss` e o `::ng-deep` de `ficha-inventario` se o `Modal` os tornar
   desnecessários — se não tornar, é sinal de que o entregável 2 não está pronto.
5. **Migração dos 12 `messageService.add()`** (4 arquivos de página/componente + o
   `error-handler.interceptor`) para o `NotificacaoService`, e do `<p-toast>` do `layout` para o
   `app-notificacoes`. Remover `MessageService` de `app.config.ts`.
6. **Specs**: `Modal` (abre/fecha pelas três vias, foco entra e volta ao gatilho, `Escape`,
   `body` travado); `NotificacaoService` (fila, auto-dispensa por tempo, dispensa manual);
   atualizar os specs que hoje espionam `MessageService` — entre eles `visualizar.page.spec.ts`.

## Critérios de Aceite

- `grep -rn "p-dialog\|p-toast\|MessageService" frontend/src` retorna vazio.
- `grep -rn "ng-deep" frontend/src` continua vazio (é proibição de fato hoje) e nenhum `z-index`
  novo aparece só para vencer CSS de biblioteca.
- Suíte do frontend e `npm run lint` (raiz) sem erro novo; `P-033` relatado à parte.
- **Gate visual (proibição #31)** nas 5 telas que hospedam os diálogos e em pelo menos uma
  notificação de cada severidade, em `1920×1080` e `360×800`. Estados obrigatórios: modal aberto
  sobre conteúdo rolável, modal com `<select>` aberto perto da borda inferior (o caso que gerou o
  `overflow-y: visible`), modal no mobile ocupando a largura correta, `Escape` e clique no
  backdrop, toast em `360px` inteiramente dentro do viewport e clicável.
- **O caso do `P-025` reproduzido de propósito:** abrir o editor de Origem e o de Habilidade de
  Personalidade no mobile (`360×800`), que só funcionavam com `[appendTo]="'body'"`, e confirmar
  que abrem sem nenhum equivalente do atributo.

## Fora de Escopo

- Desinstalar `primeng`/`@primeuix/themes` e mexer no `TemaService` — é a `ui-05`. Esta task só
  deixa a dependência sem consumidor.
- Os demais primitivos (`ui-01`, `ui-03`) e a adoção por módulo (`ui-04`).
- Redesenhar qualquer diálogo. Título, largura, ordem dos botões e conteúdo permanecem; só muda
  quem implementa a caixa.
- Corrigir a rolagem interna herdada de algum diálogo específico, se ela **não** for consequência
  do PrimeNG. Registrar em `PROBLEMS.md`.

## Dependências

- `ui-01` em `done/` — o `Modal` usa `Botao` no rodapé e o `Campo` aparece dentro dos diálogos de
  edição; construir antes força uma segunda passada.

## Riscos e Mitigação

- **`<dialog>` e a rolagem do `body`.** O nativo não trava a rolagem de fundo sozinho; sem isso o
  mobile "vaza" atrás do modal. Está no entregável 2 justamente para não ser esquecido — e é item
  do gate visual.
- **Animação de entrada.** O PrimeNG anima por CSS próprio e há registro em `HISTORY.md` de teste
  que dependia desse tempo. Ao trocar, conferir os specs que esperam o diálogo aparecer; se algum
  depender de `waitForTimeout`, ajustar o teste, nunca acrescentar animação para agradar o teste.
- **12 chamadas, 4 severidades, um serviço novo.** O `error-handler.interceptor` é o consumidor
  mais crítico (todo erro HTTP do app). Migrá-lo por último, depois que as 11 chamadas de tela
  estiverem provadas.
