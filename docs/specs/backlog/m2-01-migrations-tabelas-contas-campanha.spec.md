# m2-01-migrations-tabelas-contas-campanha.spec.md

> Task 1/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Estabelecer a **fundação de dados do M2** antes de qualquer módulo de negócio: as tabelas
de contas e campanha (`usuario`, `tipo_campanha_membro_papel`, `campanha`, `campanha_membro`)
via migrations `.sql`, mais o enum espelho da tabela de referência no shared. Sem lógica de
negócio, sem service, sem endpoint.

## Entregáveis

1. **Enum espelho** `TipoCampanhaMembroPapelEnum` em `shared/src/enums/`
   (`MESTRE | JOGADOR`): string enum, valor igual ao nome, SCREAMING_SNAKE_CASE (SYSTEM.SPEC
   §5; CONVENTIONS "Enums"). É enum de **coluna** → tem tabela de referência `tipo_*`
   (§10.2.12), ao contrário dos enums de conteúdo de jogo do JSONB.
2. **Migrations `.sql`** em `backend/src/database/migrations/` a partir de `0002` (próxima
   sequência — CONVENTIONS "Migrations"), na **ordem de dependência de FK**:
   `usuario` → `tipo_campanha_membro_papel` (com seed) → `campanha` → `campanha_membro`.
   Cada tabela conforme `SCHEMA.md`, com:
   - BaseEntity completa (`id`, `created_date`, `updated_date`, `is_deleted`, `deleted_date`),
     **sem DEFAULT** em nenhuma coluna (§10.1);
   - trigger `trg_<tabela>_updated_date` usando `fn_set_updated_date()` (já existente do M0);
   - constraints/índices **sempre nomeados** com prefixo (§10.2.11): `pk_`, `fk_`, `uix_`, `ix_`,
     incluindo os índices únicos **parciais** `WHERE is_deleted = false`
     (`uix_usuario_login_ativo`, `uix_tipo_campanha_membro_papel_codigo_ativo`,
     `uix_campanha_codigo_convite_ativo`, `uix_campanha_membro_campanha_usuario_ativo`,
     `ix_campanha_membro_usuario`);
   - seções `-- UP` e `-- DOWN` (ambas obrigatórias), sem `BEGIN/COMMIT/ROLLBACK` no arquivo
     (o Knex gerencia a transação — §10.7).
3. **Seed da tabela de referência** `tipo_campanha_membro_papel` (`MESTRE`, `JOGADOR`) na
   própria migration, via **literais SQL** (`'MESTRE'`, `'JOGADOR'`) — a exceção sancionada a
   parâmetros nomeados vale só dentro de `migrations/` (§10.7).
4. **`SCHEMA.md` sincronizado** (já descreve a forma alvo; conferir 1:1 e ajustar se divergir)
   e **`CONVENTIONS.md`** "Próxima migration" atualizado para o próximo número livre.

## Critérios de Aceite

- `npm run db:migrate --workspace=backend` sobe as 4 tabelas; `npm run db:rollback` desfaz
  cada migration de forma limpa (idempotente no `-- DOWN`).
- Tabelas, colunas, tipos, constraints e índices batem com `SCHEMA.md`.
- Reference rows `MESTRE`/`JOGADOR` presentes após o migrate.
- **Nenhum** service, controller, repository de negócio, DTO de operação ou frontend nesta task.

## Fora de Escopo

- Qualquer regra de negócio, autenticação, CRUD ou permissão (tasks m2-02+).
- Tabelas de ficha (`ficha`, `usuario_ficha_acesso`, `tipo_ficha`) — M3/M4.
- Frontend.

## Dependências

- M0 concluído: Knex + `SqlMigrationSource`, `fn_set_updated_date()` e a infra de BaseEntity
  já existem.
