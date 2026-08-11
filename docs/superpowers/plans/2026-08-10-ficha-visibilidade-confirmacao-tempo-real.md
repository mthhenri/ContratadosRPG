# Ficha Visibility Confirmation and Real-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragile visibility checkbox with a responsive confirmed action and propagate visibility changes to every open campaign panel without reload.

**Architecture:** The ficha component owns only the pending confirmation UI and emits the chosen boolean after confirmation. The existing edit service persists through REST. After a real `oculta` transition, the backend emits a payload-minimal `ficha:visibilidade-alterada` event to `campanha:<id>`; campaign clients invalidate and refetch the authorized list instead of trusting event data.

**Tech Stack:** Angular 21 standalone components and Signals, PrimeNG 21 `p-dialog`, NestJS, Socket.IO, Vitest, SCSS/BEM theme tokens.

## Global Constraints

- Move a numbered task spec from `docs/specs/backlog/` to `docs/specs/active/` before production edits and to `docs/specs/done/` only after every gate passes.
- Preserve the backend as the only authority for visibility and permissions; the WebSocket payload must not expose ficha data or final visibility.
- Use Portuguese for domain names and UI copy; generic software concepts remain in English.
- UI styles consume theme tokens and approved BEM patterns; no hardcoded colors, fonts, or radii.
- Use strict TDD: run each new behavior red before editing production code, then green.
- Verify the real application personally at `1920×1080` and `360×800`, including both dialog states and two-user real-time behavior.
- Every commit includes `Co-authored-by: Codex <noreply@openai.com>` and is checked with `git show`.

---

### Task 1: Activate the repository task specification

**Files:**
- Create: `docs/specs/backlog/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md`
- Move to active: `docs/specs/active/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md`

**Interfaces:**
- Consumes: approved design `docs/superpowers/specs/2026-08-10-ficha-visibilidade-confirmacao-tempo-real-design.md`.
- Produces: canonical active task spec used by every subsequent task.

- [ ] **Step 1: Write the task spec in backlog**

Copy the approved behavior verbatim into a concise project spec with these acceptance criteria:

```markdown
1. The editable full ficha shows a compact icon + `Ocultar`/`Exibir` button without overflow.
2. Each action opens its corresponding confirmation dialog; cancel/close emits nothing.
3. Confirming persists through the existing ficha edit flow.
4. A real `oculta` transition emits `ficha:visibilidade-alterada` with only `fichaId` and `campanhaId`.
5. Campaign detail refetches authorized members/fichas on the event, so hide and show need no reload.
6. Tests, build, lint, desktop/mobile and two-user live verification pass.
```

- [ ] **Step 2: Move the spec to active before production edits**

Run:

```powershell
Move-Item -LiteralPath docs/specs/backlog/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md -Destination docs/specs/active/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md
```

- [ ] **Step 3: Confirm scope and working tree**

Run: `git diff --check; git status --short`

Expected: only the new active spec and already-known user changes appear; no unrelated file is modified.

---

### Task 2: Add the minimal visibility event contract and backend emission

**Files:**
- Modify: `shared/src/dtos/ficha/ficha-operacao.dtos.ts`
- Modify: `shared/src/dtos/ficha/index.ts`
- Modify: `backend/src/core/gateway/campanha.gateway.spec.ts`
- Modify: `backend/src/core/gateway/campanha.gateway.ts`
- Modify: `backend/src/modules/ficha/ficha.service.spec.ts`
- Modify: `backend/src/modules/ficha/ficha.service.ts`

**Interfaces:**
- Consumes: persisted `FichaAlteradaDto`, pre-change `FichaRecuperadaDto`, and `CampanhaGateway.salaCampanha`.
- Produces: `FichaVisibilidadeAlteradaDto` and `CampanhaGateway.emitirFichaVisibilidadeAlterada(evento): void`.

- [ ] **Step 1: Write the shared DTO contract**

Add and export:

```ts
export class FichaVisibilidadeAlteradaDto {
  readonly fichaId!: number;
  readonly campanhaId!: number;
}
```

This is an event payload/value object, not an API input, and intentionally excludes `oculta`, name, owner, and `dados`.

- [ ] **Step 2: Write the failing gateway test**

Add a test proving the exact room, event name, and minimal literal payload:

```ts
it('emite ficha:visibilidade-alterada na sala da campanha com payload mínimo', () => {
  gateway.emitirFichaVisibilidadeAlterada({ fichaId: 5, campanhaId: 3 });

  expect(paraSala).toHaveBeenCalledWith('campanha:3');
  expect(emitir).toHaveBeenCalledWith('ficha:visibilidade-alterada', {
    fichaId: 5,
    campanhaId: 3,
  });
});
```

- [ ] **Step 3: Run the gateway test red**

Run: `npm run test --workspace=backend -- campanha.gateway.spec.ts`

Expected: FAIL because `emitirFichaVisibilidadeAlterada` does not exist.

- [ ] **Step 4: Implement the gateway method minimally**

```ts
emitirFichaVisibilidadeAlterada(evento: FichaVisibilidadeAlteradaDto): void {
  this.servidor
    .to(this.salaCampanha(evento.campanhaId))
    .emit('ficha:visibilidade-alterada', evento);
}
```

- [ ] **Step 5: Run the gateway test green**

Run: `npm run test --workspace=backend -- campanha.gateway.spec.ts`

Expected: PASS.

- [ ] **Step 6: Write failing service tests for changed and unchanged visibility**

Extend the existing `alterarFicha` tests with two cases:

```ts
it('emite visibilidade na campanha quando oculta realmente muda', async () => {
  fichaRepositorio.recuperarPorId.mockResolvedValue({ ...fichaPersistida, oculta: false });
  fichaRepositorio.alterarFicha.mockResolvedValue({ ...fichaPersistida, oculta: true });

  await service.alterarFicha(
    { id: 5, nome: fichaPersistida.nome, oculta: true, dados: criarDados() },
    usuarioDono,
  );

  expect(campanhaGateway.emitirFichaVisibilidadeAlterada).toHaveBeenCalledWith({
    fichaId: 5,
    campanhaId: fichaPersistida.campanhaId,
  });
});

it('não emite visibilidade quando oculta permanece igual', async () => {
  // arrange the recovered and altered ficha with oculta: false
  await service.alterarFicha(dtoSemMudancaDeVisibilidade, usuarioDono);
  expect(campanhaGateway.emitirFichaVisibilidadeAlterada).not.toHaveBeenCalled();
});
```

Also cover `campanhaId === null`: no campaign visibility event exists for an acervo-only ficha.

- [ ] **Step 7: Run the service tests red**

Run: `npm run test --workspace=backend -- ficha.service.spec.ts`

Expected: FAIL because the gateway stub/method is absent and the service never emits the event.

- [ ] **Step 8: Implement conditional emission after persistence**

Immediately after `emitirFichaAlterada`, compare the normalized booleans and emit only for campaign fichas:

```ts
if (
  fichaAlterada.campanhaId !== null &&
  fichaEncontrada.oculta !== fichaAlterada.oculta
) {
  this.campanhaGateway.emitirFichaVisibilidadeAlterada({
    fichaId: fichaAlterada.id,
    campanhaId: fichaAlterada.campanhaId,
  });
}
```

- [ ] **Step 9: Run backend focused tests green**

Run: `npm run test --workspace=backend -- campanha.gateway.spec.ts ficha.service.spec.ts`

Expected: all selected tests PASS with no warnings.

- [ ] **Step 10: Commit the backend slice**

```powershell
git add shared/src/dtos/ficha backend/src/core/gateway/campanha.gateway.ts backend/src/core/gateway/campanha.gateway.spec.ts backend/src/modules/ficha/ficha.service.ts backend/src/modules/ficha/ficha.service.spec.ts docs/specs/active/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md
git commit -m "feat(ficha): propaga mudança de visibilidade" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -1 --format=fuller --stat
```

---

### Task 3: Consume the visibility event in campaign clients

**Files:**
- Modify: `frontend/src/app/core/services/tempo-real.service.spec.ts`
- Modify: `frontend/src/app/core/services/tempo-real.service.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`

**Interfaces:**
- Consumes: `FichaVisibilidadeAlteradaDto` and Socket.IO event `ficha:visibilidade-alterada`.
- Produces: `TempoRealService.fichaVisibilidadeAlterada$`; campaign detail invalidation via `recarregarMembrosEFichas()`.

- [ ] **Step 1: Write the failing TempoRealService test**

Using the existing injected socket fake, subscribe to `fichaVisibilidadeAlterada$`, invoke the registered callback with `{ fichaId: 5, campanhaId: 3 }`, and expect that exact literal event once.

- [ ] **Step 2: Run the service test red**

Run: `npm run test --workspace=frontend -- tempo-real.service.spec.ts`

Expected: FAIL because `fichaVisibilidadeAlterada$` and the socket listener do not exist.

- [ ] **Step 3: Implement the typed subject, observable, and listener**

Add:

```ts
private readonly fichaVisibilidadeAlteradaSubject =
  new Subject<FichaVisibilidadeAlteradaDto>();

readonly fichaVisibilidadeAlterada$ =
  this.fichaVisibilidadeAlteradaSubject.asObservable();
```

Register:

```ts
this.socket.on(
  'ficha:visibilidade-alterada',
  (evento: FichaVisibilidadeAlteradaDto) =>
    this.fichaVisibilidadeAlteradaSubject.next(evento),
);
```

- [ ] **Step 4: Run the service test green**

Run: `npm run test --workspace=frontend -- tempo-real.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing campaign detail invalidation test**

Extend the test stub with a controlled `fichaVisibilidadeAlterada$` subject, complete initial loading, clear service calls, then:

```ts
fichaVisibilidadeAlterada$.next({ fichaId: 3, campanhaId: CAMPANHA_ID });

expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);
```

- [ ] **Step 6: Run the campaign test red**

Run: `npm run test --workspace=frontend -- detalhe.page.spec.ts`

Expected: FAIL because the event is not merged into the refetch stream.

- [ ] **Step 7: Add the event to the existing invalidation merge**

```ts
merge(
  this.tempoRealService.fichaCriada$,
  this.tempoRealService.membroEntrou$,
  this.tempoRealService.fichaAlterada$,
  this.tempoRealService.fichaVisibilidadeAlterada$,
)
```

Do not update cards directly from the event; the REST response decides whether each ficha exists in the viewer's list.

- [ ] **Step 8: Run focused frontend event tests green**

Run: `npm run test --workspace=frontend -- tempo-real.service.spec.ts detalhe.page.spec.ts`

Expected: PASS.

- [ ] **Step 9: Commit the client event slice**

```powershell
git add frontend/src/app/core/services/tempo-real.service.ts frontend/src/app/core/services/tempo-real.service.spec.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): atualiza visibilidade de fichas em tempo real" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -1 --format=fuller --stat
```

---

### Task 4: Replace the checkbox with the confirmed responsive action

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss`

**Interfaces:**
- Consumes: inputs `oculta()` and `ajustavelAmplo()`; existing `ajusteOculta` output.
- Produces: local pending-dialog state; output only after explicit confirmation.

- [ ] **Step 1: Write failing component tests for both button states**

Replace the checkbox assertions with tests that expect:

```ts
expect(botao.textContent).toContain('Ocultar');
expect(botao.getAttribute('aria-label')).toBe('Ocultar ficha de outros jogadores');
```

and with `oculta: true`:

```ts
expect(botao.textContent).toContain('Exibir');
expect(botao.getAttribute('aria-label')).toBe('Exibir ficha para outros jogadores');
```

Assert the icon component receives `olho-fechado` for Ocultar and `olho` for Exibir, matching the existing visibility vocabulary.

- [ ] **Step 2: Write failing interaction tests**

Cover four independent behaviors:

```ts
it('abre o aviso de ocultar sem emitir antes da confirmação', ...);
it('abre o aviso de exibir com a mensagem correspondente', ...);
it('cancelar ou fechar a dialog não emite ajusteOculta', ...);
it('confirmar emite exatamente o estado oposto e fecha a dialog', ...);
```

Use DOM clicks on the real component. Assert the exact approved titles/messages and output values `[true]`/`[false]`.

- [ ] **Step 3: Run component tests red**

Run: `npm run test --workspace=frontend -- ficha-visualizacao.component.spec.ts`

Expected: FAIL because the checkbox still mutates immediately and no dialog exists.

- [ ] **Step 4: Implement local confirmation state and methods**

Add a signal and focused methods:

```ts
protected readonly confirmandoVisibilidade = signal(false);

protected solicitarAlteracaoVisibilidade(): void {
  this.confirmandoVisibilidade.set(true);
}

protected cancelarAlteracaoVisibilidade(): void {
  this.confirmandoVisibilidade.set(false);
}

protected confirmarAlteracaoVisibilidade(): void {
  this.ajusteOculta.emit(!this.oculta());
  this.confirmandoVisibilidade.set(false);
}
```

- [ ] **Step 5: Implement the compact button and dialog**

Use a real button rather than a checkbox:

```html
<button
  type="button"
  class="ficha-ident__visibilidade"
  [attr.aria-label]="oculta() ? 'Exibir ficha para outros jogadores' : 'Ocultar ficha de outros jogadores'"
  [appTooltip]="oculta() ? 'Exibir ficha' : 'Ocultar ficha'"
  (click)="solicitarAlteracaoVisibilidade()"
>
  <app-icone [nome]="oculta() ? 'olho' : 'olho-fechado'" />
  <span>{{ oculta() ? 'Exibir' : 'Ocultar' }}</span>
</button>
```

Add one dynamic `p-dialog`, using the approved copy and the existing `ficha-cartao__acao` button pattern. `(onHide)` must call `cancelarAlteracaoVisibilidade()`.

- [ ] **Step 6: Style responsively from the approved analog**

Create `.ficha-ident__visibilidade` with theme tokens only, `inline-flex`, `white-space: nowrap`, compact mono label and visible focus inherited from the canonical button pattern. Keep it inside the avatar column on desktop so it cannot steal width from the identity text column. On mobile, hide this inline control and expose the same action in the page's kebab menu with a 44px touch target, forwarding to the component's single confirmation flow. Remove obsolete `.ficha-ident__oculta*` rules.

- [ ] **Step 7: Run component tests green**

Run: `npm run test --workspace=frontend -- ficha-visualizacao.component.spec.ts`

Expected: PASS.

- [ ] **Step 8: Run mutation checks mentally and add any missing assertion**

Confirm the tests fail for these realistic defects: wrong next boolean, direct emission on first click, wrong message branch, cancel emitting, and read-only mode displaying the button.

- [ ] **Step 9: Commit the UI slice**

```powershell
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao
git commit -m "feat(ficha): confirma ocultar e exibir ficha" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -1 --format=fuller --stat
```

---

### Task 5: Integrate, verify live behavior, and close documentation

**Files:**
- Move: `docs/specs/active/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md` → `docs/specs/done/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md`
- Modify: `docs/context/HISTORY.md`
- Modify: `docs/context/CONTEXT.md`
- Modify if applicable: `docs/context/PROBLEMS.md`

**Interfaces:**
- Consumes: completed backend, client event, and UI slices.
- Produces: fresh automated and live evidence; canonical project context.

- [ ] **Step 1: Review the complete diff against the active spec**

Run: `git diff HEAD~3 --check; git diff HEAD~3 --stat; git status --short`

Inspect every changed production line for payload leaks, duplicated permission logic, hardcoded visual values, accidental unrelated edits, and comments made stale by the new event.

- [ ] **Step 2: Run focused suites**

Run:

```powershell
npm run test --workspace=shared
npm run test --workspace=backend -- campanha.gateway.spec.ts ficha.service.spec.ts
npm run test --workspace=frontend -- tempo-real.service.spec.ts detalhe.page.spec.ts ficha-visualizacao.component.spec.ts
```

Expected: all PASS, zero failures.

- [ ] **Step 3: Run workspace-wide gates**

Run the package scripts present in the repository for frontend/backend/shared build, test, and lint. Record any pre-existing failure separately; do not mark the task complete with an unresolved required gate.

- [ ] **Step 4: Start or reuse the real stack using `.agents/skills/verify/SKILL.md`**

Ensure database migration state, backend on `3100`, and frontend on `4300`. Create or reuse a master and player in one campaign with one visible ficha owned by the player.

- [ ] **Step 5: Verify the full UI at `1920×1080`**

As an editable user, inspect visible and hidden states plus both dialogs. Confirm the control matches the "Rolagem oculta" density, the dialog matches existing ficha confirmation dialogs, labels stay on one line, no overflow exists, focus is visible, and cancellation changes nothing.

- [ ] **Step 6: Verify the full UI at `360×800`**

Repeat both states and dialogs. Confirm no horizontal overflow, the control does not collide with avatar actions or identity text, the label remains readable, the dialog fits the viewport, and every action target is at least 44×44 px.

- [ ] **Step 7: Verify two-user WebSocket behavior**

Keep the campaign detail open as the other player. In the owner/master session:

1. Confirm `Ocultar ficha`.
2. Verify the other player's card disappears without reload and the page sentinel remains intact.
3. Confirm `Exibir ficha`.
4. Verify the card reappears without reload, proving the campaign-room event covers clients not subscribed to the individual ficha room.
5. Verify owner and master retain the ficha in their authorized REST recut.

- [ ] **Step 8: Update persistent documentation**

Add one narrative entry at the top of `HISTORY.md` with design rationale, event privacy, tests, viewports/states, and live two-user evidence. Edit only the affected current-state section of `CONTEXT.md`; update `PROBLEMS.md` only if an existing item was resolved or a surviving defect was found.

- [ ] **Step 9: Move the active spec to done only after every gate passes**

Run:

```powershell
Move-Item -LiteralPath docs/specs/active/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md -Destination docs/specs/done/m3-65a-ficha-visibilidade-confirmacao-tempo-real.spec.md
```

- [ ] **Step 10: Commit closure and verify coauthorship**

```powershell
git add docs/specs docs/context
git commit -m "docs: conclui visibilidade da ficha em tempo real" -m "Co-authored-by: Codex <noreply@openai.com>"
git show -1 --format=fuller --stat
git status --short
```

Expected: commit contains the coauthor trailer and the working tree has no task-owned changes.
