# Barra do filtro do inventário Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar a barra do filtro do inventário no desktop e evitar sua quebra de linha no mobile.

**Architecture:** O componente `FichaInventarioComponent` continuará sendo a única fonte da UI e estado do inventário. O template reagrupa controles já existentes, enquanto o SCSS responsivo escolhe o rótulo visível de cada filtro sem alterar a semântica acessível ou a lógica TypeScript.

**Tech Stack:** Angular 21 standalone, templates de controle de fluxo, SCSS/BEM e tokens CSS do tema.

## Global Constraints

- Usar `bp.mobile` para o comportamento mobile, cujo viewport de referência é 360×800.
- Consumir apenas tokens do tema; não introduzir cores, fontes ou raios fixos.
- Preservar `aria-pressed`, os rótulos acessíveis completos e as ações existentes.
- Verificar em 1920×1080 e 360×800 na aplicação real.

---

### Task 1: Agrupar e tornar responsiva a barra do filtro

**Files:**

- Modify: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.scss`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.spec.ts`

**Interfaces:**

- Consumes: `filtroInventario(): FiltroInventario` e `selecionarFiltroInventario(filtro)` existentes.
- Produces: mesma barra de filtro, agora adjacente aos botões de adição no desktop e com rótulos compactos no mobile.

- [x] **Step 1: Escrever o teste que define os dois rótulos de apresentação por filtro**

```typescript
expect(botaoFiltro(raiz, 'Equipamentos').querySelector('.ficha-inv__filtro-texto--mobile')?.textContent)
  .toBe('Equip.');
expect(botaoFiltro(raiz, 'Amplificadores').querySelector('.ficha-inv__filtro-texto--mobile')?.textContent)
  .toBe('Amplif.');
expect(botaoFiltro(raiz, 'Fragmentos').querySelector('.ficha-inv__filtro-texto--mobile')?.textContent)
  .toBe('Frag.');
```

- [x] **Step 2: Rodar o teste e confirmar a falha pelos rótulos abreviados ausentes**

Run: `npm run test --workspace=frontend -- --include='**/ficha-inventario.component.spec.ts'`

Expected: FAIL porque o template ainda não contém as variantes `.ficha-inv__filtro-texto--mobile`.

- [x] **Step 3: Reagrupar o filtro e adicionar rótulos desktop/mobile**

```html
<div class="ficha-inv__acoes">
  <!-- botões de adicionar existentes -->
  <div class="ficha-inv__filtro" role="group" aria-label="Filtrar o inventário">
    <button class="ficha-inv__filtro-item" aria-label="Equipamentos">
      <span class="ficha-inv__filtro-texto ficha-inv__filtro-texto--desktop">Equipamentos</span>
      <span class="ficha-inv__filtro-texto ficha-inv__filtro-texto--mobile">Equip.</span>
    </button>
  </div>
</div>
```

```scss
.ficha-inv__filtro-texto--mobile { display: none; }
@include bp.mobile {
  .ficha-inv__filtro { flex-wrap: nowrap; }
  .ficha-inv__filtro-texto--desktop { display: none; }
  .ficha-inv__filtro-texto--mobile { display: inline; }
}
```

- [x] **Step 4: Rodar o teste novamente e confirmar que passa**

Run: `npm run test --workspace=frontend -- --include='**/ficha-inventario.component.spec.ts'`

Expected: PASS, exceto falha pré-existente P-001 caso ela ainda ocorra.

- [x] **Step 5: Verificar a UI real**

Run: usar Playwright com viewports 1920×1080 e 360×800 na ficha editável.

Expected: no desktop o filtro segue os botões de adição; no mobile há duas linhas e os três filtros ficam integralmente na segunda, com os rótulos abreviados e sem overflow horizontal.

- [x] **Step 6: Atualizar o histórico e revisar o diff**

Run: `git diff --check` e `git diff -- frontend/src/app/modules/ficha/componentes/ficha-inventario docs/context/HISTORY.md`

Expected: sem whitespace error e somente a alteração responsiva/documentação descrita neste plano.
