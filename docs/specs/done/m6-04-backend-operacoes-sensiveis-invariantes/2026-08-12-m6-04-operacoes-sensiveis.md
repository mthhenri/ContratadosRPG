# M6-04 Operacoes Sensiveis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proteger a gestao de usuarios com troca de tipo, reset administrativo de senha e invariantes de seguranca.

**Architecture:** DTOs permanecem no `shared`; controllers apenas montam DTOs e repassam o usuario ativo; `UsuarioService` concentra invariantes e orquestracao; cada repository conserva a propriedade das suas queries SQL. A implementacao segue ciclos RED-GREEN focados antes dos gates completos.

**Tech Stack:** TypeScript, NestJS, Vitest, Knex/PostgreSQL, bcrypt.

## Global Constraints

- Nunca deixar o sistema sem ao menos um `ADMIN` ativo.
- Operacoes administrativas de tipo e senha incrementam `token_versao`.
- Exclusoes sao soft delete e SQL usa parametros nomeados.
- `CampanhaRepository` e o unico dono da consulta de mestre ativo.
- Frontend permanece fora do escopo.

---

### Task 1: Contratos e comportamento da service

**Files:**
- Modify: `shared/src/dtos/usuario/usuario.dtos.ts`
- Modify: `backend/src/modules/usuario/usuario.service.spec.ts`
- Modify: `backend/src/modules/usuario/usuario.service.ts`

**Interfaces:**
- Produces: `UsuarioTipoAlterarDto`, `UsuarioTipoAlteradoDto`, `UsuarioSenhaResetarDto`, `UsuarioSenhaResetadaDto`; `alterarTipo`, `resetarSenha`; exclusoes protegidas.

- [x] Escrever testes falhando para ultimo admin, auto-acao, mestre ativo e bump de token.
- [x] Executar a spec focada e confirmar falha pela ausencia do comportamento.
- [x] Implementar a menor orquestracao que satisfaz as invariantes.
- [x] Executar novamente a spec focada e confirmar sucesso.

### Task 2: Persistencia das operacoes sensiveis

**Files:**
- Modify: `backend/src/modules/usuario/usuario.repository.spec.ts`
- Modify: `backend/src/modules/usuario/usuario.repository.ts`
- Modify: `backend/src/modules/campanha/campanha.repository.ts`

**Interfaces:**
- Produces: `alterarTipo`, `incrementarTokenVersao`, `contarAdminsAtivos`, `contarCampanhasComoMestre`.

- [x] Escrever testes SQL falhando para traducao de tipo, bump e contagem de admins.
- [x] Executar a spec focada e confirmar falha pela ausencia dos metodos.
- [x] Implementar SQL parametrizado conforme as convencoes.
- [x] Executar novamente a spec focada e confirmar sucesso.

### Task 3: Rotas, integracao e documentacao

**Files:**
- Modify: `backend/src/modules/usuario/usuario.controller.ts`
- Modify: `backend/src/modules/usuario/usuario.controller.spec.ts`
- Modify: `backend/src/modules/usuario/usuario.module.ts`
- Move: `docs/specs/active/m6-04-backend-operacoes-sensiveis-invariantes.spec.md` to `docs/specs/done/`
- Modify: `docs/context/CONTEXT.md`
- Modify: `docs/context/HISTORY.md`

**Interfaces:**
- Produces: `PATCH usuario/admin/:id/tipo` e `PATCH usuario/admin/:id/senha` protegidos por ADMIN.

- [x] Escrever teste falhando para repasse de `ActiveUser` na exclusao administrativa e novas rotas.
- [x] Implementar endpoints finos e importar `CampanhaModule` no modulo de usuario.
- [x] Rodar testes focados; depois testes, lint e build de shared/backend.
- [x] Revisar o diff contra todos os criterios da spec, mover a spec para done e atualizar contexto.
