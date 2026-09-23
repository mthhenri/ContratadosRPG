# I-027 — Rolagens em Janela por Contexto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir em janela externa os históricos de ficha e campanha em todas as visões desktop, preservando o recorte de permissões.

**Architecture:** `HistoricoRolagensSidebar` recebe um destino tipado de janela e concentra o único gatilho de ícone. Uma página isolada para campanha reusa `RolagemService.listarPorCampanha` e a sala websocket existente; cada página consumidora só fornece `campanhaId` e origem de retorno.

**Tech Stack:** Angular 21 standalone, Signals, RxJS, Socket.IO, Vitest e SCSS tokens.

**Spec:** `docs/specs/active/i-027-rolagens-janela-contextos.spec.md`

## Global Constraints

- Usar `app-botao-icone` com `tamanho`, `aria-label` e `appTooltip`.
- Não mostrar o gatilho em `bp.mobile`.
- Não duplicar nem ampliar permissões; espectador usa o feed existente da campanha.

## Review Focus

- Um destino de ficha não pode gerar URL de campanha e vice-versa.
- Colunas fixas da iniciativa também precisam renderizar o gatilho no desktop.
- A janela da campanha deve remover e inserir rolagens por websocket sem duplicar.
- O espectador não pode receber uma privada ao atualizar ao vivo.
- O controle deve estar ausente, não apenas sem texto, no mobile.

### Task 1: Destino compartilhado e gatilho canônico

**Files:**
- Modify: `frontend/src/app/shared/historico-rolagens-sidebar/*`
- Test: `frontend/src/app/shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component.spec.ts`

- [ ] Escrever testes que esperam URL de ficha, URL de campanha e botão `app-botao-icone` quando há destino.
- [ ] Rodar o spec e observar falha pelos inputs/markup ausentes.
- [ ] Implementar o destino tipado, URL segura e botão de ícone; ocultar a classe em `bp.mobile`.
- [ ] Rodar o spec e observar aprovação.

### Task 2: Janela isolada de campanha

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Create: `frontend/src/app/modules/campanha/paginas/historico-rolagens-janela/*`
- Test: `frontend/src/app/modules/campanha/paginas/historico-rolagens-janela/*.spec.ts`

- [ ] Escrever testes para carregar o feed da campanha, ouvir inserção/remoção e usar o retorno do espectador.
- [ ] Rodar o spec e observar falha por rota/página ausente.
- [ ] Implementar a página isolada, rota autenticada, consulta e sala websocket.
- [ ] Rodar o spec e observar aprovação.

### Task 3: Cobertura dos consumidores

**Files:**
- Modify: templates/specs de `modules/campanha/paginas/{detalhe-mestre,detalhe-jogador,espectador,previa-jogador}`
- Modify: templates/specs de `modules/encontro/paginas/{painel-mestre,painel-jogador,painel-espectador}`

- [ ] Escrever asserts de destino de campanha nos históricos/headers de feed existentes.
- [ ] Rodar specs focados e observar falha por input ausente.
- [ ] Passar o destino a cada histórico e incluir o botão nos headers de feed que ainda renderizam lista local.
- [ ] Rodar specs focados e observar aprovação.

### Task 4: Integração e fecho

**Files:**
- Modify: `docs/context/{CONTEXT,HISTORY,IDEAS}.md`
- Move: `docs/specs/active/i-027-rolagens-janela-contextos.spec.md` → `docs/specs/done/`

- [ ] Formatar HTML/SCSS tocados; rodar build, suíte frontend, lint e revisão de convenções.
- [ ] Verificar manualmente a janela de ficha/campanha em 1920×1080 e a ausência dos gatilhos em 360×800.
- [ ] Registrar resultado e fechar a spec.

### Task 5: Ciclo de vida da janela do histórico

**Files:**
- Create: `frontend/src/app/shared/historico-rolagens-sidebar/historico-rolagens-janela.service.ts`
- Create: `frontend/src/app/shared/historico-rolagens-sidebar/historico-rolagens-janela.service.spec.ts`
- Modify: `frontend/src/app/shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component.ts`

- [ ] Escrever testes para abertura bem-sucedida, bloqueio, foco da janela existente e restauração ao fechar.
- [ ] Ver os testes falharem, implementar o serviço de ciclo de vida e rodá-los novamente.
- [ ] Integrar o gatilho compartilhado ao serviço sem perder `opener` seguro nem a rota isolada.

### Task 6: Recolher e restaurar o histórico em cada layout

**Files:**
- Modify: páginas/estilos/testes de ficha completa, campanha e iniciativa que exibem histórico.

- [ ] Escrever testes das áreas que somem e reaparecem nas oito visões, preservando a rolagem rápida na campanha.
- [ ] Ver falhar, ligar as páginas ao estado compartilhado e fazer os testes passarem.
- [ ] Verificar visualmente antes/depois em 1920×1080 e 360×800, sem coluna vazia; depois executar os gates da Task 4.
