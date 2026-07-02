# m0-fundacao.spec.md

> **Milestone M0 — Fundação.** Já quebrado nas tasks numeradas abaixo — implementar uma de
> cada vez, na ordem, movendo cada spec para `active/` e depois `done/` conforme
> `CLAUDE.md`. Este arquivo permanece como referência do milestone completo.
>
> 1. `m0-01-workspaces-npm.spec.md`
> 2. `m0-02-docker-banco.spec.md`
> 3. `m0-03-backend-core.spec.md`
> 4. `m0-04-healthcheck-endpoint.spec.md`
> 5. `m0-05-frontend-shell.spec.md`
> 6. `m0-06-ci-lint-teste.spec.md`
> 7. `m0-07-cd-deploy.spec.md`

## Objetivo

"Hello world" de ponta a ponta em produção: monorepo funcionando, padrões de código
implantados, banco local via Docker, pipelines de CI/deploy ativos, frontend na Cloudflare
consumindo um healthcheck da API no Render.

## Entregáveis

1. **Workspaces npm**: `shared/`, `backend/` (NestJS novo), `frontend/` (Angular 21 +
   PrimeNG 21) esqueletados; imports `@contratados-rpg/shared` funcionando nos dois lados.
2. **Docker + migrations**: `docker-compose.yml` (Postgres 16); Knex configurado com
   scripts `db:up` / `db:down` / `db:migrate` / `db:rollback`; migration inicial de
   infraestrutura (`fn_set_updated_date`).
3. **`core/` do backend**: `BaseEntity`, `BaseRepository` (executarConsulta,
   executarComando, executarSoftDelete, paginação), exceções (`BusinessException`,
   `ResourceNotFoundException`, `UnauthorizedAccessException`),
   `global-exception.filter`, `response-format.interceptor` (`StandardResponse<T>`),
   `ConfigService` (nunca `process.env` direto).
4. **Endpoint `GET /health`** (`@Public()` — o guard global entra no M2, mas o decorator
   já nasce) retornando `StandardResponse`.
5. **Frontend shell**: layout mínimo (topbar + router-outlet), interceptors `error-handler`
   e `loading` registrados, proxy de dev para o backend, página inicial consumindo `/health`.
6. **CI/CD**: GitHub Actions — lint + testes em todo PR; no merge para master, deploy
   automático do front (Cloudflare) e do back (Render); banco de produção no Supabase
   com connection string via env do Render.

## Critérios de Aceite

- `npm install` na raiz instala os três workspaces
- `npm run db:up && npm run db:migrate --workspace=backend` sobe banco e migra sem erro
- `backend:dev` + `frontend:dev` rodando: a home local exibe a resposta do `/health`
- Pipeline verde no PR; após merge, a URL de produção do front exibe o `/health` do Render
- Estrutura de pastas e nomenclaturas conforme SYSTEM.SPEC §3–§5

## Fora de Escopo

- Autenticação (M2 — só o decorator `@Public()` e a infra de config nascem aqui)
- Qualquer regra de jogo, tabela de negócio ou tela real
- WebSocket (infra nasce no M3)

## Dependências

Nenhuma — primeiro milestone.
