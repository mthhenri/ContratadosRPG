# m3-02-migrations-ficha-acesso.spec.md

> Task 2/9 do milestone `m3-ficha-jogador.spec.md`.

## Objetivo

Fundação de dados do M3 — as tabelas `tipo_ficha`, `ficha` e `usuario_ficha_acesso` via
migrations `.sql`, mais o enum espelho `TipoFichaEnum`. Sem lógica de negócio, sem service,
sem endpoint.

## Entregáveis

1. **Enum espelho** `TipoFichaEnum` (`JOGADOR | CRIATURA | NPC`) em `shared/src/enums/`:
   string enum, valor igual ao nome, SCREAMING_SNAKE_CASE. É enum de **coluna** → tem tabela
   de referência `tipo_ficha` (§10.2.12), ao contrário dos enums de conteúdo de jogo do JSONB
   (§10.3).
2. **Migrations `.sql`** em `backend/src/database/migrations/` a partir de `0006` (próxima
   sequência — conferir CONVENTIONS "Próxima migration"), na **ordem de dependência de FK**:
   `tipo_ficha` (com seed) → `ficha` → `usuario_ficha_acesso`. Cada tabela conforme
   `SCHEMA.md`, com:
   - BaseEntity completa (`id`, `created_date`, `updated_date`, `is_deleted`,
     `deleted_date`), **sem DEFAULT** (§10.1);
   - trigger `trg_<tabela>_updated_date` usando `fn_set_updated_date()` (M0);
   - constraints/índices **sempre nomeados** com prefixo (§10.2.11): `fk_ficha_campanha`,
     `fk_ficha_usuario`, `fk_ficha_tipo_ficha`, `ix_ficha_campanha`, `ix_ficha_usuario`,
     `fk_usuario_ficha_acesso_ficha`, `fk_usuario_ficha_acesso_usuario`, e o índice único
     **parcial** `uix_usuario_ficha_acesso_ficha_usuario_ativo` (`(ficha_id, usuario_id)
     WHERE is_deleted = false`) e `uix_tipo_ficha_codigo_ativo`;
   - `ficha.dados JSONB NOT NULL` (conteúdo de jogo — forma fechada em `m3-01`);
   - seções `-- UP` e `-- DOWN` (ambas obrigatórias), sem `BEGIN/COMMIT/ROLLBACK` (o Knex
     gerencia a transação — §10.7).
3. **Seed da tabela de referência** `tipo_ficha` (`JOGADOR`, `CRIATURA`, `NPC`) na própria
   migration, via **literais SQL** (a exceção sancionada a parâmetros nomeados vale só dentro
   de `migrations/` — §10.7).
4. **`SCHEMA.md` sincronizado** (se a forma final divergir do rascunho) e **CONVENTIONS**
   "Próxima migration" atualizado para o próximo número livre.

## Critérios de Aceite

- `npm run db:migrate --workspace=backend` sobe as 3 tabelas; `npm run db:rollback` desfaz
  cada migration de forma limpa (idempotente no `-- DOWN`).
- Tabelas, colunas, tipos, constraints e índices batem com `SCHEMA.md`.
- Reference rows `JOGADOR`/`CRIATURA`/`NPC` presentes após o migrate.
- **Nenhum** service, controller, repository de negócio, DTO de operação ou frontend nesta
  task.

## Fora de Escopo

- Qualquer CRUD, permissão ou validação (`m3-03`+).
- `FichaJogadorDadosDto` — forma do JSONB (`m3-01`).
- Frontend.

## Dependências

- `m3-01` (a forma final de `dados` informa a coluna JSONB — não bloqueia a estrutura da
  tabela, mas alinha o marco).
- M2 (`m2-01`): tabelas `campanha` e `usuario` para as FKs `fk_ficha_campanha` /
  `fk_ficha_usuario`.
- M0: Knex + `SqlMigrationSource` e `fn_set_updated_date()` já existem.
