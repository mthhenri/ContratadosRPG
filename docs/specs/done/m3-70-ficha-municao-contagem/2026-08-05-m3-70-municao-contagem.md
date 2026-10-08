# Munição com contagem persistida Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir e apresentar o saldo atual/máximo de cenas ou disparos de cada munição.

**Architecture:** O `shared/regras/compras` passa a declarar duração tipada e helpers puros para criar e alterar a contagem. O componente de inventário usa esses helpers ao criar, modificar e consumir itens, enquanto backend valida o contrato persistido e a UI exibe os controles responsivamente.

**Tech Stack:** TypeScript, Vitest, Angular 21 Signals/Reactive Forms, NestJS, SCSS/BEM.

## Global Constraints

- O estado persistido é absoluto: `atual`, `maxima`, `unidade`; não recalcular ao renderizar.
- Munição Extra altera +1 somente em unidade `CENA` e uma única vez pela compra de três stacks.
- Desktop e mobile usam `bp.mobile` (560px), `bp.$alvo-toque` (44px) e tokens do tema.
- Nenhuma automação de cena, disparo ou Munição Eficiente.

---

### Task 1: Contrato e motor de contagem no shared

**Files:**
- Modify: `shared/src/regras/compras/catalogo.dados.ts`
- Modify: `shared/src/regras/compras/compras.dtos.ts`
- Modify: `shared/src/regras/compras/compras.ts`
- Test: `shared/src/regras/compras/compras.spec.ts`

- [ ] Escrever testes para duração base de 9mm/Míssil, criação cheia, consumo limitado a zero, edição limitada ao máximo e soma/remoção de Munição Extra.
- [ ] Executar `npm run test --workspace=shared -- compras.spec.ts` e confirmar falha pelos helpers ausentes.
- [ ] Adicionar `MunicaoContagemDto`, duração ao catálogo e helpers puros `criarContagemMunicao`, `ajustarContagemMunicao` e `alterarContagemPorModificacao`.
- [ ] Executar o teste alvo e confirmar aprovação.

### Task 2: Validação server-side do documento

**Files:**
- Modify: `backend/src/modules/ficha/ficha.service.ts`
- Test: `backend/src/modules/ficha/ficha.service.spec.ts`

- [ ] Escrever testes que rejeitam contagem fracionária, negativa, acima do máximo, unidade inválida e contagem em item não elegível.
- [ ] Executar `npm run test --workspace=backend -- ficha.service.spec.ts` e confirmar falha pela validação ausente.
- [ ] Implementar a validação em `validarDadosContraRegras`, aceitando somente Munições e Construtor com categoria emprestada Munições.
- [ ] Executar o teste alvo e confirmar aprovação.

### Task 3: Mutações e view-model do inventário

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.spec.ts`

- [ ] Escrever testes para adquirir 9mm cheia, consumir, editar Atual/Máxima, criar Construtor-Munição e aplicar/remover Munição Extra.
- [ ] Executar o spec alvo e confirmar falha pelos campos/métodos ausentes.
- [ ] Integrar os helpers do shared em criação, modificação e view-model; itens legados recebem visualização cheia até a primeira mutação.
- [ ] Executar o spec alvo e confirmar aprovação.

### Task 4: Interface responsiva e acessível

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.scss`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.spec.ts`

- [ ] Escrever testes de DOM para indicador, botão de consumo, selo Vazia e ausência de ações quando somente leitura.
- [ ] Executar o spec alvo e confirmar falha pelos elementos ausentes.
- [ ] Renderizar indicador e steppers; aplicar BEM/tokens e regra `bp.mobile` para faixa própria, controles empilhados e toque de 44px.
- [ ] Executar o spec alvo e confirmar aprovação.

### Task 5: Verificação e documentação de conclusão

**Files:**
- Move: `docs/specs/backlog/m3-70-ficha-municao-contagem.spec.md` → `docs/specs/done/m3-70-ficha-municao-contagem.spec.md`
- Modify: `docs/context/CONTEXT.md`
- Modify: `docs/context/HISTORY.md`

- [ ] Executar testes compartilhados, backend e frontend, além de build/lint proporcional.
- [ ] Fazer verificação manual responsiva se o ambiente local estiver disponível.
- [ ] Mover a spec concluída e registrar a narrativa em português no contexto/histórico.
