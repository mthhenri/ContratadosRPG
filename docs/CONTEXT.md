# CONTEXT.md — Estado Atual do Projeto

> Atualizado após cada sessão de implementação. Última atualização: 2026-07-05 (m0-07).

---

## Estado Geral

**Fase:** M0 concluído (implementação em repositório). O esqueleto do monorepo npm workspaces está de pé
(`shared/`, `backend/`, `frontend/`) com os pacotes se importando corretamente. A
infraestrutura de banco local está pronta: PostgreSQL 16 via Docker Compose e Knex
configurado com migrations. O `core/` do backend está implementado (`ConfigService`,
`BaseEntity`, `BaseRepository`, exceções, filtro global e interceptor de resposta), com o
Nest app subindo de ponta a ponta sem erros. A API já expõe seu primeiro endpoint real,
`GET /health` (público, `StandardResponse`), validando o `core/` de ponta a ponta. O
frontend agora tem shell mínimo de pé: topbar + `router-outlet`, interceptors `loading` e
`error-handler`, proxy de dev para o backend e uma home que consome `GET /health` — a
integração HTTP frontend → backend → `StandardResponse` está provada de ponta a ponta. O
shell já usa o tema "Terminal de Contenção" (dark-first) a partir do handoff em
`docs/design/` — tokens, base e preset PrimeNG `ContencaoPreset` ligados. A integração
contínua está ativa: um workflow do GitHub Actions (`.github/workflows/ci.yml`) roda lint +
testes nos três workspaces em todo Pull Request — lint configurado nos três (backend já
tinha; shared e frontend ganharam eslint agora), testes via `--if-present` (só o frontend
tem testes antes do M1). A entrega contínua fecha o M0: `.github/workflows/cd.yml` dispara no
merge para `master`, roda lint+testes como gate e — só se passarem — implanta o backend no Render
(deploy hook, blueprint `render.yaml`) e o frontend na Cloudflare Pages (`wrangler pages deploy`),
com banco de produção no Supabase. A ligação frontend→backend em produção é cross-origin: o
backend habilita CORS a partir de `APP_FRONTEND_ORIGEM` (`main.ts`) e o frontend chama a URL
absoluta do Render via `environment.apiBase` (dev fica vazio → chamada relativa pelo proxy;
produção é injetada no build). O provisionamento das plataformas e os segredos são setup manual
único, documentados em `docs/DEPLOY.md`. Ainda sem módulo de negócio — esses nascem a partir do M1.

## Status dos Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, core/, pipelines, CD) | **concluído** (infra em repo; go-live manual via `docs/DEPLOY.md`) |
| M1 | Calculadora com paridade | backlog |
| M2 | Auth + Campanhas | backlog |
| M3 | Ficha de Jogador | backlog |
| M4 | Ficha de Criatura/NPC | backlog |
| M5 | Guia de Missão | backlog |

## Status dos Módulos

| Módulo | Status |
|---|---|
| shared (estrutura) | **`interfaces/` com `StandardResponse`/`PaginatedResult`**; demais pastas ainda esqueleto |
| shared/regras | não iniciado |
| backend/core | **pronto** (`BaseEntity`, `BaseRepository`, exceções, filtro, interceptor) |
| backend/config | **pronto** (`ConfigService`/`ConfigModule`, lê `DB_*`/`JWT_*`/`APP_*`) |
| backend/database | **pronto** (`DatabaseModule`/`database.provider.ts` — conexão Knex em runtime via DI) |
| backend/health | **pronto** (`HealthController` `GET /health` público; sem service/repository) |
| backend/core/decorators | **`@Public()`** (metadado `isPublic`; guard interpretador nasce no M2) |
| backend/autenticacao | não iniciado |
| backend/usuario | não iniciado |
| backend/campanha | não iniciado |
| backend/ficha | não iniciado |
| frontend (shell) | **pronto** (topbar + `router-outlet` via `shared/layout`, home consumindo `/health`, tema "Terminal de Contenção" dark-first via `docs/design`) |
| frontend/tema | **pronto** (tokens + base + `ContencaoPreset` PrimeNG em `src/styles/tema/`; troca de accent em runtime é M1) |
| frontend/core (interceptors + services) | **pronto** (`loading`/`error-handler` interceptors, `LoadingService`, `HealthService`) |
| frontend/calculadora | não iniciado |
| frontend/campanha | não iniciado |
| frontend/ficha | não iniciado |
| Infra — banco local (Docker + Knex) | **pronto** (Postgres 16 + migrations) |
| Infra — CI (lint + testes em PR) | **pronto** (GitHub Actions; lint nos 3 workspaces, testes via `--if-present`) |
| Infra — CD (deploy) | **pronto (repo)** (`cd.yml` gated em lint+testes → Render + Cloudflare Pages; `render.yaml`; CORS + `apiBase`. Provisionamento das plataformas é manual — `docs/DEPLOY.md`) |

## Próxima Task

**M1 — Calculadora com paridade** (primeiro milestone de produto). Antes de implementar, quebrar
`docs/specs/backlog/m1-calculadora-paridade.spec.md` em tasks numeradas (`m1-01-<nome>.spec.md`…)
no backlog. O M1 extrai as regras do jogo do site antigo (`contratados-calculadora/src/script.js`)
para `shared/regras` (com testes validados contra `docs/core/sistema-v4.1.0.md`) e entrega as 6
páginas públicas client-side da calculadora, além do sistema de troca de tema em runtime (presets +
color picker) e a instalação/merge do Tailwind.

> **Pendência operacional do M0 (não bloqueia o M1):** o go-live de produção exige o setup manual
> único das plataformas descrito em `docs/DEPLOY.md` (Supabase + Render + Cloudflare + segredos do
> GitHub). O código/infra em repositório já está pronto; falta só provisionar e preencher segredos.

## Implementado

- **m0-07-cd-deploy** (2026-07-05): entrega contínua no merge para `master` — última task do M0.
  `.github/workflows/cd.yml` dispara em `push` para `master` (+ `workflow_dispatch`): job `verificar`
  roda `npm install` + `npm run lint` + `npm run test` (mesmo gate da CI) e **os dois jobs de deploy
  dependem dele** (`needs: verificar`) — deploy só ocorre depois de lint/testes passarem (critério de
  aceite). `deploy-backend` faz `POST` no **Render deploy hook** (`secrets.RENDER_DEPLOY_HOOK_URL`);
  `deploy-frontend` injeta a URL da API (`vars.RENDER_API_URL`) em `environment.production.ts`, roda
  `ng build` (produção) e publica via `cloudflare/wrangler-action` (`pages deploy
  frontend/dist/frontend/browser --project-name=${vars.CLOUDFLARE_PAGES_PROJECT} --branch=master`,
  `secrets.CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`). Blueprint IaC do backend em `render.yaml`
  (web service `contratados-rpg-api`, build `npm install && npm run build --workspace=backend`, start
  `npm run start:prod --workspace=backend`, `healthCheckPath: /health`, `autoDeploy: false` para que o
  único gatilho de produção seja a CD já após o gate; `APP_PORTA=10000`/`APP_AMBIENTE=production`/
  `JWT_EXPIRACAO=8h` no blueprint, `DB_*`/`JWT_SECRETO`/`APP_FRONTEND_ORIGEM` como `sync: false`).
  **Ligação frontend→backend em produção (opção CORS + URL absoluta):** `backend/src/main.ts` agora
  chama `app.enableCors({ origin: frontendOrigem })` lendo `APP_FRONTEND_ORIGEM` do `ConfigService`
  (campo já existia p/ "CORS + Socket.IO", SYSTEM.SPEC §10.6); criados `frontend/src/environments/`
  (`environment.ts` dev `apiBase:''` → chamada relativa pelo proxy; `environment.production.ts` com
  `apiBase` injetado no build via `RENDER_API_URL`) com `fileReplacements` no `angular.json`
  (produção); `HealthService.verificar()` passou de `/health` para `` `${environment.apiBase}/health` ``.
  `frontend/public/_redirects` (`/* /index.html 200`) dá o fallback de SPA na Cloudflare Pages (o
  `assets` glob copia p/ a raiz do build). Runbook do provisionamento manual (Supabase → Render →
  Cloudflare → segredos do GitHub, com a ordem que resolve a dependência circular de URLs e o
  heads-up de SSL do Supabase p/ o M2) em `docs/DEPLOY.md`, linkado no `README.md`. Validado local:
  `npm run build` verde em backend e frontend (produção — bundle em `dist/frontend/browser` com
  `_redirects` e `index.html`); `npm run lint` verde nos 3 workspaces; `CI=true npm run test
  --workspace=frontend` 2/2 verde. O deploy de produção em si depende do setup manual das plataformas
  (não exercitável localmente).
- **m0-06-ci-lint-teste** (2026-07-05): integração contínua ativa via GitHub Actions.
  `.github/workflows/ci.yml` dispara em todo `pull_request` (+ `workflow_dispatch` manual),
  em `ubuntu-latest` com Node 22 (`actions/setup-node` + cache npm): `npm install` (o
  `postinstall` compila o shared), depois `npm run lint` e `npm run test`. Lint agora
  configurado nos **três** workspaces (deliverable 2): o backend já tinha `eslint.config.mjs`
  (typescript-eslint `recommendedTypeChecked`); **shared** ganhou `eslint.config.mjs` espelhando
  o do backend (CommonJS, `globals.node`) + devDeps (`eslint`, `typescript-eslint`, `@eslint/js`,
  `globals`); **frontend** ganhou `eslint.config.mjs` com `angular-eslint` (flat config: TS
  `recommended` + `angular.configs.tsRecommended` com regras de seletor prefixo `app`; HTML
  `templateRecommended` + `templateAccessibility`) + devDeps (`angular-eslint`,
  `typescript-eslint`, `@eslint/js`, `eslint`). O `lint` do backend perdeu o `--fix` (rodar com
  `--fix` na CI mascararia violações auto-corrigíveis, ferindo o critério "sem etapa mascarando
  falha"); cada workspace tem `lint` (checagem, CI-safe) e `lint:fix` (dev). Scripts agregados na
  raiz: `lint` = `npm run lint --workspaces` (roda os 3; qualquer falha → exit ≠ 0), `test` =
  `npm run test --workspaces --if-present` (só o frontend tem teste por ora — shared/backend são
  pulados, não mascarados). Validado: `npm run lint` verde nos 3; `CI=true npm run test` roda o
  vitest do frontend uma vez (sem watch) → 2/2 verde; sonda de erro de lint confirmou `exit 1`
  agregado na raiz (pipeline quebra). Testes de regra de jogo (`shared/regras`) nascem no M1;
  deploy é a `m0-07`.
- **m0-05-frontend-shell** (2026-07-05): shell mínimo do frontend e prova de integração
  ponta a ponta com o backend. `shared/layout/layout.component.ts` (standalone `Layout`,
  seletor `app-layout`) é o shell: topbar institucional, indicador de carregamento global
  (lê `LoadingService.isLoading()`), `<p-toast/>` e o `<router-outlet/>`; o root `App` só
  renderiza `<app-layout/>`. `core/interceptors/` traz dois interceptors funcionais
  registrados em `app.config.ts` via `withInterceptors`: `loading.interceptor` (conta
  requisições em voo no `LoadingService` — signal `isLoading`) e `error-handler.interceptor`
  (exibe toast PrimeNG com a `StandardResponse.mensagem` do backend e reencaminha o erro).
  `core/services/health.service.ts` (`HealthService.verificar()`) consome `GET /health`
  tipado como `StandardResponse<{ status: string }>` (sem DTO de negócio — payload inline,
  conforme m0-04). `pages/home/home.page.ts` (standalone `Home`, lazy via `loadComponent`
  na rota `''`) chama o health no `ngOnInit`, guarda o resultado em signals e exibe o status
  (`ok`) + mensagem — prova visual do pipeline HTTP frontend → backend → `StandardResponse`.
  `proxy.conf.json` encaminha `/health` para `http://localhost:3100` e foi ligado ao
  `serve.options.proxyConfig` do `angular.json` (dev-server em `:4300`). PrimeNG configurado
  com `providePrimeNG` + `MessageService` no root; **sem `@angular/animations`** — o PrimeNG 21
  usa animações CSS próprias, então `provideAnimationsAsync()` foi descartado (o pacote nem
  está instalado). **Tema "Terminal de Contenção" aplicado** a partir do handoff em
  `docs/design/` (revisão pós-implementação): `src/styles/tema/` recebeu `_tokens.scss`
  (CSS custom properties — fonte da verdade em runtime), `_base.scss` (reset, corpo dark,
  grid de textura) e `contencao.preset.ts` (preset PrimeNG base Aura; único ajuste ao repo:
  imports `@primeng/themes` → `@primeuix/themes`). `styles.scss` importa tokens + base nessa
  ordem; `index.html` é dark-first (`<html lang="pt-BR" class="dark">`) e carrega IBM Plex
  Mono/Sans via `<link>` do Google Fonts (Opção B do handoff — `@fontsource` fica p/ quando
  quiserem offline). `app.config.ts` usa `providePrimeNG({ theme: { preset: ContencaoPreset,
  options: { darkModeSelector: '.dark' } } })`. Topbar e home consomem os tokens (`--surface`,
  `--border`, `--accent`, `--font-mono`, `--positive`…) e a home reusa o padrão canônico de
  card + cabeçalho de seção (índice em badge mono + título UPPERCASE + régua) de
  `_componentes.scss`. Tailwind ainda não está instalado, então utilitários Tailwind ficam
  para depois — SCSS + BEM + tokens cobrem o shell. `app.spec.ts` atualizado (provê
  `provideRouter([])` + `MessageService`; verifica a marca da topbar). Validado:
  `npm run build --workspace=frontend` e `--workspace=backend` passam; `npm run test
  --workspace=frontend` 2/2 verde; com backend (`node dist/main.js`) + `frontend:dev` no ar,
  `curl http://localhost:4300/health` (via proxy) retorna
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`
  e `:4300/` serve o `index.html` do SPA.
- **m0-04-healthcheck-endpoint** (2026-07-05): primeiro endpoint real da API.
  `backend/src/core/decorators/public.decorator.ts` traz o decorator `@Public()` (grava o
  metadado `IS_PUBLIC_KEY = 'isPublic'` via `SetMetadata`) com barrel `index.ts` no padrão
  da pasta `exceptions/` — sem efeito de bloqueio ainda, pois o guard global que o
  interpreta só nasce no M2 (nenhuma rota está protegida). `backend/src/health/health.controller.ts`
  expõe `GET /health` (`@Public()`, método `verificar()`), sem service/repository próprios
  (não há regra de negócio nem persistência — só confirma que o processo Nest responde);
  retorna o literal `{ status: 'ok' }`, que o `response-format.interceptor` da m0-03
  embrulha em `StandardResponse<T>`. Health é conceito operacional genérico → sem DTO de
  negócio no `shared/` (payload inline). `HealthController` registrado direto no array
  `controllers` do `AppModule` (não há módulo de negócio para ele). `npm run build --workspace=backend`
  passa; endpoint validado de ponta a ponta com `node dist/main.js` + `curl` →
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`.
- **m0-03-backend-core** (2026-07-04): `core/` do backend completo.
  `shared/src/interfaces/` ganhou `StandardResponse<TData>` (interface — envelope de
  sucesso/erro) e `PaginatedResult<TItem>` (classe — herdada por DTOs de listagem), com
  subpath `@contratados-rpg/shared/interfaces` adicionado ao `exports` do
  `shared/package.json`. Em `backend/src/core/`: `BaseEntity` (campos de infraestrutura);
  `base/base.repository.ts` com `executarConsulta<T>()`/`executarComando()`/
  `executarSoftDelete(id)`/`executarConsultaPaginada<T>()` (SQL bruto via `knex.raw`,
  paginação com `allRows` conforme §10.5 — nota: `ordenarPor` chega como identificador de
  coluna interpolado diretamente na query, então a service chamadora deve validá-lo contra
  uma lista permitida antes de repassar, já que identificador não aceita parâmetro
  nomeado); `exceptions/` com `BusinessException` (400), `ResourceNotFoundException` (404)
  e `UnauthorizedAccessException` (403); `filters/global-exception.filter.ts` e
  `interceptors/response-format.interceptor.ts`, ambos registrados globalmente via
  `APP_FILTER`/`APP_INTERCEPTOR` em `app.module.ts`. Novo `backend/src/config/` expõe
  `ConfigService` (carrega o `.env` da raiz via `dotenv` — movido de devDependencies para
  dependencies do `backend/package.json` — e expõe getters tipados
  `obterConfiguracaoBanco()`/`obterConfiguracaoJwt()`/`obterConfiguracaoAplicacao()`; nenhum
  `process.env` direto fora dele) num `ConfigModule` global. Novo
  `backend/src/database/database.provider.ts`/`database.module.ts` registra a conexão Knex
  de runtime (token `KNEX_CONNECTION`) lendo a config via `ConfigService` — o `knexfile.ts`
  continua a única exceção autorizada a ler `process.env` direto, por ser ferramenta de CLI
  fora do ciclo do Nest. `main.ts` agora lê a porta via `ConfigService` em vez do antigo
  placeholder `process.env.PORT`. Extensibilidade do `BaseRepository` validada com um
  repositório descartável (compilou e foi removido — nenhum módulo de negócio o reaproveita
  ainda, já que a `m0-04` não usa repository). `npm run build` passa em `shared` e
  `backend`; app sobe com `node dist/main.js` sem erros de DI mesmo sem o Postgres local
  ativo (Knex conecta sob demanda).
- **m0-02-docker-banco** (2026-07-04): PostgreSQL 16 local via `docker-compose.yml` na raiz
  (variáveis interpoladas do `.env`, ver `.env.example` / SYSTEM.SPEC §10.6) e Knex
  configurado em `backend/knexfile.ts` (client `pg`). Scripts de banco funcionais: `db:up` /
  `db:down` na raiz e `db:migrate` / `db:rollback --workspace=backend`. Migrations seguem a
  convenção §10.7: arquivos `.sql` puros em `backend/src/database/migrations/`
  (`NNNN - Nome descritivo.sql`, seções `-- UP` / `-- DOWN`), carregados por um
  `SqlMigrationSource` customizado (`backend/src/database/sql-migration-source.ts`) — a
  tabela de controle continua sendo a `knex_migrations` do Knex, que abre uma transação por
  migration (salvo `-- NO TRANSACTION`). A migration `0001 - Função fn_set_updated_date.sql`
  cria a function genérica `fn_set_updated_date()` (function de trigger reutilizável para
  manter `updated_date`; os triggers `trg_<tabela>_updated_date` nascem junto de cada tabela,
  M2+). Nenhuma tabela de negócio criada. O knexfile lê `process.env` por ser ferramenta de
  CLI fora do NestJS — o código da aplicação usará `ConfigService` (m0-03). O knexfile e o
  `SqlMigrationSource` rodam via `ts-node` (bloco `ts-node` no `backend/tsconfig.json`,
  compilando como CommonJS); o registro do source no runtime (`database.provider.ts`) vem no
  m0-03.
- **m0-01-workspaces-npm** (2026-07-04): monorepo npm workspaces com `shared/`, `backend/`
  (NestJS 11) e `frontend/` (Angular 21 + PrimeNG 21). `npm install` na raiz instala os três
  workspaces; `postinstall` compila `shared` para `dist/`. Import de `@contratados-rpg/shared`
  validado nos dois lados — backend via referência de workspace (dist), frontend via path
  mapping do `tsconfig` para a fonte. `npm run build` passa em backend e frontend.
  Constante trivial `SHARED_PACKAGE_NAME` valida a ligação (será substituída por conteúdo
  real nas tasks seguintes).

## Decisões Pendentes

- **Identidade visual do site** — **definida**: tema "Terminal de Contenção" (dark-first,
  IBM Plex), com handoff completo em `docs/design/` (tokens, base, preset PrimeNG, exemplos,
  trecho Tailwind). Aplicado ao shell na m0-05. Resta para o M1: sistema de troca de tema em
  runtime (presets + color picker com trava de contraste) e a instalação/merge do Tailwind.
  Nota: na 1ª rodada da m0-05 o `docs/design/` passou batido (não estava no Session Start) e o
  shell nasceu com preset Aura base + hex hardcoded, corrigido na revisão. Documentação já
  ajustada para não repetir: `CLAUDE.md` agora manda ler `docs/design/DESIGN.md` antes de UI e
  ganhou a seção "Visual Design Source of Truth"; SYSTEM.SPEC §3/§8/§15 e a proibição #29
  (nunca hardcodar cor/fonte) + CONVENTIONS (Estilos e tabela) reforçam o consumo dos tokens.

## Referências

- Design original (brainstorming de 2026-07-01) no repo antigo:
  `contratados-calculadora/docs/superpowers/specs/2026-07-01-contratados-rpg-design.md`
- Código a migrar no M1: `contratados-calculadora/src/script.js` (regras) — o repo antigo
  permanece disponível até o M1 ser concluído, e então será arquivado.
