# ux-loading-indicador-conciso.spec.md

> **Task transversal (shell), não é feature de milestone.** O número/slot definitivo
> (`mN-NN`) fica **a critério do autor** na revisão de backlog — nasce aqui como refino de UX
> do shell, independente do M3.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

**Refinar visualmente o indicador de carregamento global** para que ele seja **conciso e não
quebre o layout** — tanto no **desktop** quanto no **mobile**. Hoje qualquer requisição HTTP
acende uma barrinha na topbar que **desloca/quebra o layout** da toolbar (no mobile, quebra
por completo). Só apresentação: **sem mudar o comportamento de contagem de requisições**.

## Estado atual (o que existe)

- `LoadingService` (`core/services/loading.service.ts`) conta requisições HTTP em andamento e
  expõe o signal `isLoading` (verdadeiro enquanto há ≥ 1 request).
- `loadingInterceptor` (`core/interceptors/loading.interceptor.ts`) chama `start()`/`finish()`
  em **toda** requisição (registrado em `app.config.ts`).
- O **shell** (`shared/layout/layout.component.html` / `.scss`) renderiza, **dentro de**
  `.topbar__acoes`, um `<span class="topbar__carregando">` — barra indeterminada de
  **6rem × 2px** (`@keyframes topbar-carregando`) quando `isLoading()`.

### Problema

- O indicador ocupa espaço **no fluxo** da topbar → ao acender/apagar, **empurra** os itens ao
  lado (deslocamento de layout / *layout shift*).
- No **mobile** (~360px), onde a topbar já é apertada, isso **quebra** a barra.
- Ele pisca em requisições muito rápidas (sem *debounce*), reforçando a sensação de instabilidade.

## Entregáveis

1. Reposicionar/reformular o indicador para que **não altere o layout** da topbar ao
   acender/apagar — desktop e mobile. Direção sugerida (decisão de implementação do autor):
   - tirá-lo do fluxo (ex.: linha fina fixa no topo do viewport, `position: fixed`, largura
     total, sem reservar espaço na topbar), **ou**
   - reservar o espaço dele de forma fixa na topbar (sem *reflow* ao alternar visibilidade).
2. Manter a **identidade** "Terminal de Contenção": traço fino, discreto, no `--accent`, só
   tokens do tema (proibição #29) — nada de spinner chamativo/gradiente.
3. Idealmente **SCSS-only** (como m1-15/m2-08/m2-15); se exigir marcação, mantê-la mínima no
   `layout.component` e **sem tocar na lógica** do `LoadingService`/interceptor.
4. Opcional (se ajudar a "conciso"): **debounce** curto para não piscar em requests
   instantâneos — mas **sem** mudar a semântica de contagem do `LoadingService`.
5. Preservar acessibilidade: manter `role="status"` + `aria-label="Carregando"`.

## Critérios de Aceite

- Acender/apagar o indicador **não desloca** nenhum item da topbar — verificado no **desktop**
  e no **mobile (~360px, sem scroll horizontal)**.
- Indicador discreto, coerente com o tema, **usando só tokens** do tema.
- Comportamento funcional do carregamento inalterado (contagem de requests, `isLoading`).
- Acessibilidade preservada (`role="status"`/`aria-label`).
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.

## Fora de Escopo

- Mudar a lógica de contagem do `LoadingService` ou o `loadingInterceptor` (só o **visual**).
- Loaders inline/por-componente (skeletons de página já existem — ex.: `detalhe.page`) — esta
  task é só o **indicador global** do shell.
- Qualquer feature funcional, dado ou endpoint novo.

## Dependências

- Shell: `shared/layout/layout.component.{html,scss}`.
- Tokens do tema em `docs/design/tema/` e exemplos em `docs/design/examples/`.
- Base responsiva mobile (m2-08) a **não regredir**.
