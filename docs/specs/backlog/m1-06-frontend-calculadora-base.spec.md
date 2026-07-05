# m1-06-frontend-calculadora-base.spec.md

> Task 6/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Montar a fundação do frontend da calculadora — Tailwind, o módulo `modules/calculadora/`
com as 6 rotas públicas lazy, a navegação de abas e o input numérico reutilizável — como
esqueleto sobre o qual as páginas de cada aba são construídas. Sem lógica de cálculo por aba.

**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir o handoff de `docs/design/tema/`.**

## Entregáveis

1. **Tailwind instalado e integrado** ao build do frontend (pendência registrada no
   `docs/CONTEXT.md`), a partir do `docs/design/tema/tailwind.config.ts`, coexistindo com
   SCSS + tokens do tema (proibições #17/#29 continuam valendo — utilitário para layout, nada
   de hex/fonte/raio solto).
2. **`modules/calculadora/`** com 6 rotas standalone **lazy** (`loadComponent`), públicas
   (sem guard): `agente`, `dt`, `novo-agente`, `patente`, `descanso`, `compras` — como stubs.
3. **Navegação de abas** + deep-link por rota, em paridade com o roteamento por hash do site
   antigo (`switchTab`, `VALID_TABS`).
4. **Componente de stepper / input numérico reutilizável** (`stepInput`/`stepInputFloat` do
   site antigo), em **Reactive Forms** (sem `ngModel`), consumindo o padrão BEM de stepper de
   `docs/design/tema/_componentes.scss` e os tokens do tema.

## Critérios de Aceite

- `frontend:dev` serve as 6 rotas (stubs) com a navegação de abas funcionando; Tailwind
  ativo no build.
- Sem NgModule, sem `.css`, sem `style=""` inline, sem seletor de ID, sem hex/fonte/raio
  solto (proibições #16–18, #29); tudo consome os tokens de `docs/design/tema/`.
- As páginas continuam funcionais sem backend (100% client-side).

## Fora de Escopo

- Lógica/cálculo de cada aba (m1-07 a m1-10).
- Conteúdo de ajuda (m1-12) e troca de tema em runtime (m1-13).

## Dependências

- `m0-05-frontend-shell.spec.md` (shell + tema base). Independente da camada de regras —
  pode correr em paralelo com m1-02..m1-05.
