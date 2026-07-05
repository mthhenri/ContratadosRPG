# CONTEXT.md — Estado Atual do Projeto

> Atualizado após cada sessão de implementação. Última atualização: 2026-07-05 (m0-04).

---

## Estado Geral

**Fase:** M0 em andamento. O esqueleto do monorepo npm workspaces está de pé
(`shared/`, `backend/`, `frontend/`) com os pacotes se importando corretamente. A
infraestrutura de banco local está pronta: PostgreSQL 16 via Docker Compose e Knex
configurado com migrations. O `core/` do backend está implementado (`ConfigService`,
`BaseEntity`, `BaseRepository`, exceções, filtro global e interceptor de resposta), com o
Nest app subindo de ponta a ponta sem erros. A API já expõe seu primeiro endpoint real,
`GET /health` (público, `StandardResponse`), validando o `core/` de ponta a ponta. Ainda
sem módulo de negócio nem shell visual — esses nascem nas tasks seguintes do M0/M2+.

## Status dos Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, core/, pipelines) | **em andamento** |
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
| frontend (shell) | **esqueleto Angular 21 + PrimeNG 21** (sem shell visual — nasce na m0-05) |
| frontend/calculadora | não iniciado |
| frontend/campanha | não iniciado |
| frontend/ficha | não iniciado |
| Infra — banco local (Docker + Knex) | **pronto** (Postgres 16 + migrations) |
| Infra — CI, deploy | não iniciado |

## Próxima Task

`m0-05-frontend-shell.spec.md` (layout mínimo topbar + `router-outlet`, interceptors
`error-handler` e `loading`, proxy de dev para o backend, home consumindo `GET /health`).
Mover de `docs/specs/backlog/` para `docs/specs/active/` e implementar. As tasks `m0-06`
(CI lint+teste) e `m0-07` (CD deploy) seguem em ordem.

## Implementado

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

- **Identidade visual do site** — a definir em conversa própria antes/durante o M1.
  A paridade do M1 é funcional; até a definição, tema base PrimeNG.

## Referências

- Design original (brainstorming de 2026-07-01) no repo antigo:
  `contratados-calculadora/docs/superpowers/specs/2026-07-01-contratados-rpg-design.md`
- Código a migrar no M1: `contratados-calculadora/src/script.js` (regras) — o repo antigo
  permanece disponível até o M1 ser concluído, e então será arquivado.
