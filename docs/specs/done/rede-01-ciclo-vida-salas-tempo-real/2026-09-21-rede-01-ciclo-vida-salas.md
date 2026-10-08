# Rede-01 — Ciclo de vida de salas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que sockets permaneçam somente nas salas autorizadas e ainda consumidas pela SPA.

**Architecture:** O cliente mantém referências por id e só envia join/leave nas transições de zero. O gateway recebe somente essas mensagens de infraestrutura e, após mutações REST já persistidas, recalibra sockets pelo `JwtPayload` armazenado, sem reimplementar autorização.

**Tech Stack:** Angular Signals, Socket.IO, NestJS, Vitest, DTOs TypeScript compartilhados.

**Spec:** `docs/specs/active/rede-01-ciclo-vida-salas-tempo-real.spec.md`

## Global Constraints

- WebSocket é broadcast-only: não recebe mutações de domínio.
- DTOs ficam em `shared/src/dtos/`, não usam primitivos nem herança de negócio.
- Permissões continuam nas services; gateway apenas aplica o resultado pós-save.
- Não alterar invalidadores/GETs, replay ou a matriz de permissões.

---

### Task 1: Referências de sala no cliente

**Files:**
- Modify: `frontend/src/app/core/services/tempo-real.service.ts`
- Test: `frontend/src/app/core/services/tempo-real.service.spec.ts`

**Interfaces:** Produz `entrarSalaFicha`, `sairSalaFicha`, `entrarSalaCampanha`, `sairSalaCampanha` com contagem positiva e eventos `ficha:entrar|sair`, `campanha:entrar|sair`.

- [ ] Escrever testes que pedem duas vezes a mesma sala, removem uma referência e depois a última; conferir um join e um leave.
- [ ] Rodar o spec e confirmar falha porque o Set perde a referência intermediária.
- [ ] Substituir Sets por `Map<number, number>`, emitir somente nas transições 0→1 e 1→0, limpar no disconnect e reingressar somente chaves positivas.
- [ ] Rodar `npm run test --workspace=frontend -- --include=src/app/core/services/tempo-real.service.spec.ts`.

### Task 2: Contratos e leaves do gateway

**Files:**
- Modify: `shared/src/dtos/ficha/ficha-operacao.dtos.ts`
- Modify: `shared/src/dtos/campanha/campanha.dtos.ts`
- Modify: `backend/src/core/gateway/campanha.gateway.ts`
- Test: `backend/src/core/gateway/campanha.gateway.spec.ts`

**Interfaces:** Produz `FichaSalaSairDto { id }`, `CampanhaSalaSairDto { id }`, handlers `ficha:sair` e `campanha:sair`.

- [ ] Escrever testes que exigem `leave('ficha:5')` e as três variantes de campanha sem consultar service/repository.
- [ ] Rodar o spec e confirmar falha por handlers ausentes.
- [ ] Adicionar DTOs e handlers que executam apenas `Socket.leave`.
- [ ] Rodar o spec focado do gateway.

### Task 3: Recalibração pós-mudança de acesso

**Files:**
- Modify: `backend/src/core/gateway/campanha.gateway.ts`
- Modify: `backend/src/modules/ficha/ficha.service.ts`
- Modify: `backend/src/modules/campanha/campanha.service.ts`
- Test: `backend/src/core/gateway/campanha.gateway.spec.ts`
- Test: `backend/src/modules/ficha/ficha.service.spec.ts`
- Test: `backend/src/modules/campanha/campanha.service.spec.ts`

**Interfaces:** Produz `expulsarUsuarioDaFicha`, `recalibrarSalasCampanhaUsuario` e chamadas pós-save de revogação, remoção, alteração de papel e transferência.

- [ ] Escrever testes de sockets por usuário para revogação, remoção, dois sentidos de papel e transferência.
- [ ] Rodar os specs e confirmar falha porque os sockets continuam em salas antigas.
- [ ] Implementar varredura por sala com `fetchSockets`, leave/join idempotentes; emitir aviso de revogação antes da expulsão.
- [ ] Rodar specs focados de gateway, ficha e campanha.

### Task 4: Sessão, integração e fecho

**Files:**
- Modify: `frontend/src/app/core/services/sessao.service.ts`
- Modify: `frontend/src/app/core/services/sessao.service.spec.ts`
- Modify: `docs/context/CONTEXT.md`
- Modify: `docs/context/HISTORY.md`
- Move: `docs/specs/active/rede-01-ciclo-vida-salas-tempo-real.spec.md` → `docs/specs/done/`

**Interfaces:** A transição central de sessão para nula chama `TempoRealService.desconectar()` sem circularidade de injeção.

- [ ] Escrever testes para logout manual e caminho 401 via `SessaoService.sair()` observando socket e contadores limpos.
- [ ] Rodar os specs e confirmar falha pela ausência da reação central.
- [ ] Implementar a reação sem duplicar chamadas em layout/interceptor.
- [ ] Rodar suites, lint e builds afetados; executar o roteiro de dois usuários da skill `verify`.
- [ ] Atualizar contexto, mover a spec concluída e criar commit com trailer de coautoria.
