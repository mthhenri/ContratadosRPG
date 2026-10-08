# Acesso Negado Isolado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolar `/acesso-negado` da topbar e reforçar sua apresentação institucional com logo, censura textual variável e retorno evidente.

**Architecture:** O `Layout` deriva um signal booleano dos eventos finais do Angular Router e condiciona o shell global. A página mantém um catálogo imutável de mensagens e escolhe uma única variação por instância, enquanto template e SCSS cuidam exclusivamente da apresentação.

**Tech Stack:** Angular 21 standalone, Signals, Angular Router, SCSS e Vitest.

## Global Constraints

- Usar apenas tokens visuais existentes; sem cor, fonte ou raio hardcoded.
- Preservar guards e comportamento de autorização existentes.
- Usar o componente `app-marca` como logo institucional.
- Verificar em 1920×1080 e 360×800 com a skill `verify`.

---

### Task 1: Shell isolado da rota

**Files:**
- Modify: `frontend/src/app/shared/layout/layout.component.ts`
- Modify: `frontend/src/app/shared/layout/layout.component.html`
- Test: `frontend/src/app/shared/layout/layout.component.spec.ts`

**Interfaces:**
- Produces: `rotaIsolada: Signal<boolean>` verdadeiro somente quando `router.url === '/acesso-negado'`.

- [ ] Escrever teste que navega para `/acesso-negado` e espera ausência de `.topbar`.
- [ ] Rodar o teste focado e confirmar falha.
- [ ] Derivar a rota final com `NavigationEnd`, `toSignal` e `computed`; condicionar shell no template.
- [ ] Confirmar que uma rota comum continua renderizando a topbar.
- [ ] Rodar o teste focado até passar.

### Task 2: Documento censurado variável

**Files:**
- Modify: `frontend/src/app/modules/acesso-negado/acesso-negado.page.ts`
- Modify: `frontend/src/app/modules/acesso-negado/acesso-negado.page.html`
- Modify: `frontend/src/app/modules/acesso-negado/acesso-negado.page.scss`
- Create: `frontend/src/app/modules/acesso-negado/acesso-negado.page.spec.ts`

**Interfaces:**
- Produces: `mensagemSelecionada` estável por instância e catálogo com pelo menos 12 mensagens.

- [ ] Escrever teste que comprova logo, caracteres `█`, retorno e mensagem estável.
- [ ] Rodar o teste focado e confirmar falha.
- [ ] Importar `Marca`, criar catálogo imutável e escolher uma mensagem no construtor da página.
- [ ] Reestruturar o documento para selo de marca, blocos censurados e botão primário destacado.
- [ ] Ajustar tamanho, densidade e responsividade usando tokens e `_breakpoints.scss`.
- [ ] Rodar testes focados de página e layout até passarem.

### Task 3: Gates e inspeção real

**Files:**
- Modify: `docs/context/HISTORY.md`
- Modify: `docs/context/CONTEXT.md` somente se o estado atual da tarefa mudar.

- [ ] Rodar `npm.cmd run lint --workspace=frontend`.
- [ ] Rodar `npm.cmd test --workspace=frontend`.
- [ ] Rodar `npm.cmd run build --workspace=frontend`.
- [ ] Subir frontend isolado e inspecionar `/acesso-negado` em 1920×1080 e 360×800.
- [ ] Confirmar ausência de topbar/overflow, logo correto, censura `█`, mensagem e botão ≥44 px.
- [ ] Registrar o resultado no histórico e revisar `git diff --check`.
