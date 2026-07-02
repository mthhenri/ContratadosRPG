# CONTEXT.md — Estado Atual do Projeto

> Atualizado após cada sessão de implementação. Última atualização: 2026-07-02 (bootstrap).

---

## Estado Geral

**Fase:** pré-M0. O repositório contém apenas a base documental (constituição + specs de
milestone). Nenhum código foi escrito ainda.

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
| shared (estrutura) | não iniciado |
| shared/regras | não iniciado |
| backend/core | não iniciado |
| backend/autenticacao | não iniciado |
| backend/usuario | não iniciado |
| backend/campanha | não iniciado |
| backend/ficha | não iniciado |
| frontend (shell) | não iniciado |
| frontend/calculadora | não iniciado |
| frontend/campanha | não iniciado |
| frontend/ficha | não iniciado |
| Infra (Docker, CI, deploy) | não iniciado |

## Próxima Task

Quebrar `docs/specs/backlog/m0-fundacao.spec.md` em tasks numeradas
(`m0-01-*.spec.md`, `m0-02-*.spec.md`, …) e iniciar a implementação pela primeira.

## Decisões Pendentes

- **Identidade visual do site** — a definir em conversa própria antes/durante o M1.
  A paridade do M1 é funcional; até a definição, tema base PrimeNG.

## Referências

- Design original (brainstorming de 2026-07-01) no repo antigo:
  `contratados-calculadora/docs/superpowers/specs/2026-07-01-contratados-rpg-design.md`
- Código a migrar no M1: `contratados-calculadora/src/script.js` (regras) — o repo antigo
  permanece disponível até o M1 ser concluído, e então será arquivado.
