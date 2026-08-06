# Alinhamento dos filtros do inventário Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ancorar o grupo de filtros do inventário à direita da barra de adição no desktop, sem regressão no mobile.

**Architecture:** O componente permanece com o mesmo template, estado e controles. Um único ajuste no SCSS do grupo `.ficha-inv__filtro` usa a margem automática como separador flex no desktop; o breakpoint `bp.mobile` a anula para manter o fluxo atual de duas linhas.

**Tech Stack:** Angular 21 standalone, SCSS/BEM, mixin `bp.mobile` e Vitest.

## Global Constraints

- Não alterar `filtroInventario`, ações do inventário, rótulos, ícones ou acessibilidade.
- Fora de `bp.mobile`, os filtros ficam na ponta direita da mesma linha dos botões de adição.
- Em `bp.mobile`, preservar o fluxo atual, com filtros em uma linha própria e rótulos abreviados.
- Não introduzir cores, fontes ou raios fixos; usar as regras e tokens existentes.
- Verificar a aplicação real em 1920×1080 e 360×800.

---

### Task 1: Ancorar responsivamente o grupo de filtros

**Files:**

- Modify: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.scss:203-217`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.spec.ts:2300-2321`
- Modify: `docs/context/HISTORY.md`
- Modify: `docs/context/CONTEXT.md`

**Interfaces:**

- Consumes: a barra `.ficha-inv__acoes` flexível e o grupo `.ficha-inv__filtro` já existentes.
- Produces: margem inicial automática no desktop, removida no `bp.mobile`; nenhum contrato TypeScript é criado ou alterado.

- [ ] **Step 1: Escrever o teste de estilo para o filtro em desktop**

```typescript
it('ancora o grupo de filtros à direita da barra de adição no desktop', () => {
  const { raiz } = montar({ itens: [fragmentoAvulso()], amplificadores: [] });
  const filtro = raiz.querySelector('.ficha-inv__filtro') as HTMLElement;

  expect(getComputedStyle(filtro).marginInlineStart).toBe('auto');
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha sem a margem automática**

Run: `npm run test --workspace=frontend -- --include='**/ficha-inventario.component.spec.ts'`

Expected: o teste novo falha porque `marginInlineStart` ainda não é `auto`; a falha preexistente `P-001` pode continuar separadamente.

- [ ] **Step 3: Aplicar o alinhamento no SCSS**

```scss
&__filtro {
  margin-inline-start: auto;

  @include bp.mobile {
    margin-inline-start: 0;
    flex-wrap: nowrap;
    max-width: 100%;
  }
}
```

- [ ] **Step 4: Rodar o teste novamente e conferir o comportamento preservado**

Run: `npm run test --workspace=frontend -- --include='**/ficha-inventario.component.spec.ts'`

Expected: o novo teste passa, e a única falha possível da suíte segue sendo a preexistente `P-001`.

- [ ] **Step 5: Verificar a UI real nos dois viewports**

Run: abrir uma ficha editável em 1920×1080 e 360×800.

Expected: em desktop, os dois botões de adição ficam à esquerda e o grupo completo de filtros na ponta direita, na mesma linha; em mobile, os filtros continuam abaixo, à esquerda, em uma linha e abreviados.

- [ ] **Step 6: Registrar e revisar o resultado**

Run: `git diff --check`, `npm run build --workspace=frontend` e `git diff -- frontend/src/app/modules/ficha/componentes/ficha-inventario docs/context`.

Expected: sem erro de whitespace; build completo; apenas o SCSS, teste e documentação desta alteração no diff.
