# Ajustes do Montador de Rolagens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o Montador de Rolagens gerar fórmulas válidas para vários dados, atributos multiplicados e tipos de dano agrupados, preservando-se aberto na visualização da ficha.

**Architecture:** A composição local fica em funções puras de `montador-rolagem.util.ts`, sem reproduzir a gramática no template. A interpretação e a execução das duas novas formas entram exclusivamente no motor compartilhado `shared/src/regras/rolagem/`; a ficha apenas hospeda uma única instância persistente do painel e encaminha seus eventos.

**Tech Stack:** Angular 21 com Signals, TypeScript, Jasmine/Karma, SCSS com tokens de tema, pacote `@contratados-rpg/shared`.

**Spec:** `docs/specs/active/montador-rolagem-ajustes.spec.md`

## Global Constraints

- Restringir a gramática nova a `(ATR*Y)dM` e `(termos-de-dado)[TIPO]`; não aceitar agrupamento aritmético genérico.
- Toda regra de interpretação e rolagem fica em `shared/src/regras/rolagem/`, sem cópia no frontend.
- O análogo visual é `CalculadoraFlutuante`, usando o primitivo `app-painel-flutuante` e os controles de `shared/ui/`.
- Usar tokens de `docs/design/tema/_tokens.scss`; não alterar a geometria de outros consumidores de painel flutuante.
- Validar na aplicação real em 1920×1080 e 360×800, inclusive com troca de aba da ficha.

---

## Arquivos e responsabilidades

- `frontend/src/app/shared/montador-rolagem/montador-rolagem.util.ts`: localizar o último dado elegível e compor tokens sem concatenação inválida.
- `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.ts`: aplicar as funções puras e expor a composição por atributo multiplicado.
- `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.html`: encaminhar operadores/tipo de dano às ações semânticas e usar controles canônicos.
- `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.scss`: afastamento específico do montador, somente via tokens e sem afetar o primitivo.
- `frontend/src/app/features/ficha/**`: elevar a instância persistente do montador acima do conteúdo das abas e manter o gatilho em Rolagens.
- `shared/src/regras/rolagem/rolagem.ts`: reconhecer, validar, interpretar e rolar as duas novas formas da gramática.
- Testes co-localizados cobrem cada comportamento antes da implementação.

## Task 1: Composição pura do montador

**Files:**
- Modify: `frontend/src/app/shared/montador-rolagem/montador-rolagem.util.ts`
- Test: `frontend/src/app/shared/montador-rolagem/montador-rolagem.util.spec.ts`

**Interfaces:**
- Produces: `adicionarDado(formulaAtual: string, faces: number): string`, `reposicionarOperadorPool(formulaAtual: string, operador: string): string`, `adicionarTipoDano(formulaAtual: string, tipo: string): string`.
- Consumed by: `MontadorRolagem.clicarDado`, `MontadorRolagem.inserirOperadorPool` e `MontadorRolagem.inserirTipoDano`.

- [ ] **Step 1: Write failing tests**

```ts
expect(adicionarDado('d20', 6)).toBe('d20+d6');
expect(reposicionarOperadorPool('d20kh+d6', 'kl')).toBe('d20+d6kl');
expect(reposicionarOperadorPool('', 'kh')).toBe('');
expect(adicionarTipoDano('(2d12+2d6)', 'F')).toBe('(2d12+2d6)[F]');
expect(adicionarTipoDano('FOR', 'F')).toBe('FOR');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test --workspace=frontend -- --include=src/app/shared/montador-rolagem/montador-rolagem.util.spec.ts`

Expected: FAIL because the new composition functions do not exist.

- [ ] **Step 3: Implement the minimal pure functions**

```ts
export function adicionarDado(formulaAtual: string, faces: number): string {
  return incrementarUltimoDado(formulaAtual, faces) ??
    formulaAtual + (formulaAtual && !/[+\\-(]$/.test(formulaAtual) ? '+' : '') + `d${faces}`;
}
```

Scan validated dice tokens from left to right, retain the last eligible token, remove only its prior `kh`, `kl` or `cmN`, then append the requested operator to that token. Only tag a final die, flat numeric term, or balanced parenthesized dice group.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test --workspace=frontend -- --include=src/app/shared/montador-rolagem/montador-rolagem.util.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/shared/montador-rolagem/montador-rolagem.util.ts frontend/src/app/shared/montador-rolagem/montador-rolagem.util.spec.ts
git commit -m "fix: compoe tokens validos no montador" -m "Co-authored-by: Codex <noreply@openai.com>"
```

## Task 2: Gramática e execução no motor compartilhado

**Files:**
- Modify: `shared/src/regras/rolagem/rolagem.ts`
- Test: `shared/src/regras/rolagem/rolagem.spec.ts`

**Interfaces:**
- Consumes: fórmulas `(ATR*Y)dM` e `(termos-de-dado)[TIPO]` emitidas pelo montador.
- Produces: `validarFormula(formula)` aceita as formas restritas; `rolarFormula` resolve quantidade de atributo e replica tipo em todos os pools internos.

- [ ] **Step 1: Write failing tests**

```ts
expect(validarFormula('(LUT*2)d20')).toBe(true);
expect(validarFormula('(2d12+2d6)[F]')).toBe(true);
expect(validarFormula('(2d12+2)[F]')).toBe(false);

const resultado = rolarFormula('(LUT*2)d20', { LUT: 3 }, geradorDeterministico);
expect(resultado.dados).toHaveLength(6);
expect(resultado.desvantagem).toBeFalse();
expect(rolarFormula('(2d12+2d6)[F]', {}, geradorDeterministico).dados.every((dado) => dado.tipoDano === 'F')).toBeTrue();
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test --workspace=shared -- src/regras/rolagem/rolagem.spec.ts`

Expected: FAIL because neither parenthesized multiplier quantities nor type-tagged groups are recognized.

- [ ] **Step 3: Implement the smallest grammar extension**

```ts
const dadoPorAtributoMultiplicado = /^\\(([A-Z]+)\\*(\\d+)\\)d(\\d+)(.*)$/;
const grupoTipado = /^\\(([^()]+)\\)\\[([A-Z])\\]$/;
```

Reuse the existing per-term interpreter for the group body, reject non-dice/flat-only-invalid bodies as the current grammar requires, assign the type after inner terms are interpreted, and calculate `atributo * multiplicador` with floor zero. Do not pass the multiplier form through the intrinsic-disadvantage branch.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test --workspace=shared -- src/regras/rolagem/rolagem.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/regras/rolagem/rolagem.ts shared/src/regras/rolagem/rolagem.spec.ts
git commit -m "feat: interpreta multiplicador e grupo tipado" -m "Co-authored-by: Codex <noreply@openai.com>"
```

## Task 3: Integração do montador e persistência entre abas

**Files:**
- Modify: `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.ts`
- Modify: `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.html`
- Modify: `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.scss`
- Modify: `frontend/src/app/features/ficha/**` (host da visualização e aba Rolagens identificados no código)
- Test: `frontend/src/app/shared/montador-rolagem/montador-rolagem.component.spec.ts`
- Test: teste co-localizado da visualização/abas da ficha

**Interfaces:**
- Consumes: funções puras de Task 1 e gramática de Task 2.
- Produces: `formulaChange` contínuo enquanto a única caixa fica montada e visível fora da aba Rolagens.

- [ ] **Step 1: Write failing component and integration tests**

```ts
clicarDado(20); clicarDado(6); inserirOperadorPool('kh');
expect(component.formula()).toBe('d20+d6kh');

inserirDadoPorAtributo(20, 'LUT', 2);
expect(component.formula()).toBe('(LUT*2)d20');

trocarAba('atributos');
expect(document.querySelector('app-painel-flutuante[aria-label="Montador de rolagem"]')).not.toBeNull();
```

Assert each damage/keep/critical action is a no-op without an eligible target, then assert the click flow produces valid formulas accepted by `validarFormula`.

- [ ] **Step 2: Run focused frontend tests to verify they fail**

Run: `npm run test --workspace=frontend -- --include=src/app/shared/montador-rolagem/montador-rolagem.component.spec.ts`

Expected: FAIL because direct concatenation, the adjustment-only action, and tab-owned lifecycle remain.

- [ ] **Step 3: Implement the integration**

```ts
clicarDado(faces: number): void {
  this.formula.set(adicionarDado(this.formula(), faces));
}

inserirDadoPorAtributo(faces: number): void {
  this.inserirComSinal(`(${this.atributoSelecionado()}*${this.multiplicador()})d${faces}`);
}
```

Replace only the touched controls with the existing shared button primitive and its established size/variant recipe. Move the panel component to the persistent ficha visualization host, keep its trigger projected or event-bound from the Rolls tab, preserve one formula state, and use a Montador-only position/floor or CSS wrapper spacing based on theme tokens without changing `PainelFlutuante` behavior for other consumers.

- [ ] **Step 4: Run focused frontend tests to verify they pass**

Run: `npm run test --workspace=frontend -- --include=src/app/shared/montador-rolagem/montador-rolagem.component.spec.ts`

Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npm run format:html-scss --workspace=frontend -- --write src/app/shared/montador-rolagem
git add frontend/src/app/shared/montador-rolagem frontend/src/app/features/ficha
git commit -m "feat: mantem montador aberto entre abas" -m "Co-authored-by: Codex <noreply@openai.com>"
```

## Task 4: Gates de integração, visual e documentação

**Files:**
- Modify: `docs/context/HISTORY.md`
- Modify: `docs/context/CONTEXT.md`
- Move: `docs/specs/active/montador-rolagem-ajustes.spec.md` → `docs/specs/done/montador-rolagem-ajustes.spec.md`

- [ ] **Step 1: Run automated gates**

Run: `npm run test --workspace=shared`, `npm run test --workspace=frontend`, `npm run lint`, and `npm run build --workspace=frontend`.

Expected: all commands succeed without regressions.

- [ ] **Step 2: Run the application and inspect the real UI**

Open a ficha at 1920×1080 and 360×800. In each viewport, open the Montador through Rolagens, compose `d20+d6kh`, type a formula, navigate to a different tab, verify the visible panel and unchanged formula, navigate back, use keyboard focus and scroll the footer.

Compare the result to `CalculadoraFlutuante`: elevated shell, control density, iconography, margins, no horizontal overflow, visible focus, contrast, and 44px mobile targets.

- [ ] **Step 3: Record closure and commit**

Move the spec to `done`, prepend `HISTORY.md` with the behavior, tests, analog and observed viewports, and revise only the affected current-state section in `CONTEXT.md`.

```bash
git add docs/specs docs/context
git commit -m "docs: fecha ajustes do montador de rolagem" -m "Co-authored-by: Codex <noreply@openai.com>"
```

## Self-review

- Spec coverage: Task 1 covers insertion, pool/critical repositioning and conditional damage tagging; Task 2 covers both bounded grammar extensions and their dice results; Task 3 covers repeated/multiplied attributes plus persistent panel behavior and desktop margin; Task 4 covers all required automated, visual, and documentation gates.
- Placeholder scan: no TBD/TODO or implicit test step remains.
- Interface consistency: Task 1 exports are consumed by Task 3; Task 2 keeps the public shared formula API unchanged; Task 3 emits through the existing formula binding.

