# CONTEXT.md — Estado Atual do Projeto

> Atualizado após cada sessão de implementação. Última atualização: 2026-07-04 (m0-01).

---

## Estado Geral

**Fase:** M0 em andamento. O esqueleto do monorepo npm workspaces está de pé
(`shared/`, `backend/`, `frontend/`) com os pacotes se importando corretamente. Ainda sem
conteúdo de negócio, core do backend, Docker ou shell visual — esses nascem nas tasks
seguintes do M0.

## Status dos Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, core/, pipelines) | **backlog — próximo** |
| M1 | Calculadora com paridade | backlog |
| M2 | Auth + Campanhas | backlog |
| M3 | Ficha de Jogador | backlog |
| M4 | Ficha de Criatura/NPC | backlog |
| M5 | Guia de Missão | backlog |

## Status dos Módulos

| Módulo | Status |
|---|---|
| shared (estrutura) | **esqueleto pronto** (pastas + barrel `index.ts`; sem conteúdo de negócio) |
| shared/regras | não iniciado |
| backend/core | não iniciado |
| backend/autenticacao | não iniciado |
| backend/usuario | não iniciado |
| backend/campanha | não iniciado |
| backend/ficha | não iniciado |
| frontend (shell) | **esqueleto Angular 21 + PrimeNG 21** (sem shell visual — nasce na m0-05) |
| frontend/calculadora | não iniciado |
| frontend/campanha | não iniciado |
| frontend/ficha | não iniciado |
| Infra (Docker, CI, deploy) | não iniciado |

## Próxima Task

`m0-02-docker-banco.spec.md` (Docker Compose PostgreSQL 16 + Knex + migrations). Mover de
`docs/specs/backlog/` para `docs/specs/active/` e implementar. As tasks `m0-03` a `m0-07`
seguem em ordem.

## Implementado

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
