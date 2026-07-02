# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory Session Start

Before any implementation, read these files in order:
1. `docs/SYSTEM.SPEC.md` — constitution of the project, takes precedence over everything
2. `docs/CONVENTIONS.md` — quick reference for code conventions
3. `docs/CONTEXT.md` — current project state and next task

## Game Rules Source of Truth

All game rules live in `docs/core/sistema-v4.1.0.md` (player-facing rules) and
`docs/core/guia_de_mestre-v4.0.0.md` (threat/creature creation). Consult them before changing
any formula, progression table, or domain rule. If code and document conflict, **the
document wins**.

## Development Commands

```bash
# Install dependencies (run from root)
npm install

# Database
npm run db:up               # start PostgreSQL via Docker Compose
npm run db:down             # stop PostgreSQL
npm run db:migrate --workspace=backend   # run pending migrations
npm run db:rollback --workspace=backend  # rollback last migration

# Development servers (run in separate terminals)
npm run backend:dev         # NestJS API on http://localhost:3000
npm run frontend:dev        # Angular SPA on http://localhost:4200 (with proxy to backend)

# Tests
npm run test --workspace=shared     # game rules engine — run before touching any formula
npm run test --workspace=backend
```

## Task Workflow (Spec-Driven Development)

```
1. Move spec: docs/specs/backlog/<task>.spec.md → docs/specs/active/
2. Implement exactly what the spec defines — do not extrapolate
3. Move spec: docs/specs/active/<task>.spec.md → docs/specs/done/
4. Update docs/CONTEXT.md (implemented items, module status, next task)
```

Milestone specs (`m0-*` … `m5-*`) live in the backlog and are broken down into numbered
task specs (`m1-01-<nome>.spec.md`) before implementation.

## Architecture Overview

Monorepo with three npm workspace packages:

- **`shared/`** (`@contratados-rpg/shared`) — DTOs, enums, generic interfaces, validators
  (pure constants) and **`regras/`: the game rules engine** (pure functions, zero
  dependencies — the ONE sanctioned exception to "no business logic in shared"; both
  frontend and backend consume it).
- **`backend/`** — NestJS REST API + Socket.IO gateway. Pattern:
  `controller (dumb) → service (business logic) → repository (raw SQL only)`.
  The WebSocket gateway is **broadcast-only**: every mutation goes through REST; the
  gateway never receives writes.
- **`frontend/`** — Angular 21 SPA with standalone components, Signals and PrimeNG 21.
  The calculator pages are public and 100% client-side (they use `shared/regras` directly).

DTOs and enums are **never** redefined inside `backend/` or `frontend/`.

## Language Rule

**Test:** "Would this concept exist in any software project?"
- **Yes → English** (folder names, generic classes, BaseEntity fields, exceptions, decorators)
- **No → Portuguese** (entity files, methods, variables, DTOs, enum values, table names, columns)

## Backend Constraints

**Controller** — dumb, no logic, no try/catch, no if. Only sanctioned micro-intelligence:
merging `@Param`/`@Query` ids into the DTO (`service.alterar({ ...dto, id })`).

**Repository** — SQL only, no business logic. Always extends `BaseRepository`:
- `executarConsulta<T>()` for SELECTs, `executarComando()` for fire-and-forget
- `executarSoftDelete(id)` — never physical DELETE

**Service** — all business rules, validations, permission checks, orchestration, and
WebSocket event emission after successful mutations. Throws `BusinessException`,
`ResourceNotFoundException`, or `UnauthorizedAccessException`.

## SQL Rules (All Mandatory)

- Every SELECT: `WHERE [table].is_deleted = false`
- Named parameters only: `:nomeParametro` with object — never `?` positional, never interpolation
- INSERT pattern: `INSERT INTO tabela (...) SELECT :campo1, :campo2 RETURNING ...` — never `VALUES`
- No `DEFAULT` on any column — application always provides all values explicitly
- No abbreviated aliases — full table name or descriptive alias
- Date fields: `[context]_date` (English/BaseEntity) or `[context]_data` (Portuguese/business)
- Tables: singular Portuguese snake_case (`usuario`, `campanha`, `ficha`)
- Column enums are reference tables `tipo_*` (`codigo` + `descricao`) with INTEGER FK —
  **but game-content enums living inside the `ficha.dados` JSONB (classes, patentes, item
  categories…) exist only as TS enums in `shared/` and do NOT get `tipo_*` tables**

## Ficha Data Model

Relational columns handle **identity, ownership and permission**; the `dados` JSONB column
holds **game content** (attributes, class, level, inventory, current HP…). The JSONB shape
is a typed contract in `shared/` (`FichaJogadorDadosDto`, `FichaCriaturaDadosDto`) and is
documented in `docs/SCHEMA.md`. Game fields never become columns — listings read
`dados->>'campo'`.

## Key Business Rules

- Permissions (enforced in services, same rules for REST and WebSocket):
  - Sheet owner: views and edits their own sheet
  - Campaign mestre: views and edits **any** sheet in their campaign
  - Other member: views only with a row in `usuario_ficha_acesso`; never edits
  - Creatures/NPCs are sheets owned by the mestre — hidden from players unless shared
- Backend validates saved sheets against `shared/regras` (e.g. HP cannot exceed the
  calculated maximum for class/level/attributes)
- Players join campaigns via `campanha.codigo_convite`; the mestre can regenerate it
- Soft delete everywhere — never physical DELETE

## Naming Conventions

**DTOs:** `Entidade + Complemento? + Verbo + Dto` — input infinitive (`FichaCriarDto`),
output past participle (`FichaCriadaDto`), listing item always `ResumoDto`.
**Methods:** `verbo + entidade` — `criarFicha()`, `listarCampanhas()`. Never `atualizar` — use `alterar`.
**Variables:** never abbreviated.
**Enums:** string enums, value equals name, SCREAMING_SNAKE_CASE — always in `shared/src/enums/`.

## Environment Variables

Backend reads all config via injected `ConfigService` — never `process.env` directly.
See `README.md` for the full list (`DB_*`, `JWT_*`, `APP_*`).
