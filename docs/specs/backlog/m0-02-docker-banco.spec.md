# m0-02-docker-banco.spec.md

> Task 2/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Subir PostgreSQL 16 local via Docker Compose e configurar o Knex com os scripts de banco
padrão do projeto, incluindo a migration inicial de infraestrutura.

## Entregáveis

1. `docker-compose.yml` na raiz: serviço Postgres 16, variáveis de conexão alinhadas com
   `docs/SYSTEM.SPEC.md` §10.6 (`DB_HOST`, `DB_PORT`, `DB_NOME`, `DB_USUARIO`, `DB_SENHA`).
2. Configuração do Knex em `backend/` (`knexfile` ou equivalente) lendo a conexão via
   `ConfigService` (a implementação do `ConfigService` em si nasce na task `m0-03` — aqui
   basta a configuração do Knex apontar para variáveis de ambiente compatíveis).
3. Scripts npm funcionais na raiz: `db:up`, `db:down`, `db:migrate --workspace=backend`,
   `db:rollback --workspace=backend`.
4. Migration inicial de infraestrutura: function `fn_set_updated_date()` (trigger genérico
   para manter `updated_date` em qualquer tabela que a use), nomeada conforme convenção de
   prefixo `fn_` (`docs/CONVENTIONS.md`).

## Critérios de Aceite

- `npm run db:up` sobe o Postgres via Docker Compose sem erro
- `npm run db:migrate --workspace=backend` roda a migration inicial sem erro
- `npm run db:rollback --workspace=backend` desfaz a migration sem erro
- `npm run db:down` para o container
- Nenhuma tabela de negócio é criada aqui — só a function/trigger de infraestrutura

## Fora de Escopo

- Tabelas de negócio (`usuario`, `campanha`, `ficha`, etc.) — nascem nos milestones que as
  usam (M2+)
- `BaseRepository` e `ConfigService` (código TypeScript que consome essa configuração) —
  task `m0-03`
- Banco de produção (Supabase) — task `m0-07` (CD)

## Dependências

- `m0-01-workspaces-npm.spec.md` (workspace `backend/` precisa existir)
