# Inventário de Esquadrão (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a interface do inventário compartilhado da campanha, incluindo estado Na Base/Em Missão, operações de itens e transferências com a ficha.

**Architecture:** `CampanhaService` recebe o contrato REST já entregue pelo backend; `TempoRealService` expõe os dois broadcasts para a tela buscar novamente o estado autorizado. Um `InventarioEsquadrao` apresentacional e reutilizável atende tanto o drawer do Mestre quanto a lateral do Jogador. A página de detalhe preserva a decisão de visibilidade e coordena a ficha escolhida para transferências.

**Tech Stack:** Angular 21 standalone, Signals, Reactive Forms, RxJS, PrimeNG/SCSS BEM e DTOs de `@contratados-rpg/shared`.

## Global Constraints

- O backend existente é a autoridade para permissões, estado Na Base/Em Missão e validação de transferência; o frontend apenas representa o estado e encaminha ações REST.
- DTOs vêm exclusivamente de `shared/`; não criar modelos paralelos no frontend.
- UI segue Terminal de Contenção: tokens CSS, BEM e o padrão de drawer de `HistoricoRolagensSidebar`; sem cores, fontes ou raios hardcoded.
- O análogo obrigatório é `frontend/src/app/shared/historico-rolagens-sidebar/`: mesmo gatilho, fundo, painel fixo, foco automático, Escape e semântica de diálogo no drawer do Mestre.
- A transferência para/de ficha usa os endpoints já publicados: `POST /ficha/:id/inventario/item/pegar` e `POST /ficha/:id/inventario/item/mandar-para-base`.
- Antes de concluir, validar a aplicação real com a skill `verify` em 1920×1080 e 360×800, nos estados Mestre/Jogador, Na Base/Em Missão, vazio e item com quantidade maior que um.

---

### Task 1: Transporte HTTP e tempo real do contrato já entregue

**Files:**
- Modify: `frontend/src/app/modules/campanha/campanha.service.ts`
- Modify: `frontend/src/app/modules/campanha/campanha.service.spec.ts`
- Modify: `frontend/src/app/core/services/tempo-real.service.ts`
- Modify: `frontend/src/app/core/services/tempo-real.service.spec.ts`

**Interfaces:**
- Consumes: `CampanhaEstadoAlterarDto`, `CampanhaEstadoAlteradaDto`, `CampanhaInventarioDto`, `CampanhaInventarioItemAdicionarDto`, `CampanhaInventarioItemQuantidadeAjustarDto` e `CampanhaInventarioAlteradoDto` de `shared/dtos/campanha`.
- Produces: métodos tipados `alterarEstado`, `recuperarInventario`, `adicionarItemInventario`, `removerItemInventario`, `ajustarQuantidadeItemInventario`; observables `estadoAlterado$` e `inventarioAlterado$`.

- [ ] Escrever specs HTTP que verifiquem verbo, rota, corpo e extração de `StandardResponse.dados` para cada rota; escrever specs de socket que assegurem o encaminhamento de `campanha:estado-alterado` e `campanha:inventario-alterado`.
- [ ] Confirmar que as specs falham antes da implementação.
- [ ] Implementar os cinco métodos REST no serviço e registrar os dois listeners no socket, usando `Subject`s privados e `Observable`s públicos como os eventos existentes.
- [ ] Rodar as duas specs e o typecheck do frontend; confirmar que passam.
- [ ] Commit: `feat(campanha): cliente do inventário de esquadrão`.

### Task 2: Componente reutilizável de inventário e transferências

**Files:**
- Create: `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.ts`
- Create: `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.html`
- Create: `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.scss`
- Create: `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.spec.ts`
- Modify: `frontend/src/app/modules/ficha/ficha.service.ts`
- Modify: `frontend/src/app/modules/ficha/ficha.service.spec.ts`

**Interfaces:**
- Consumes: lista de `CampanhaInventarioItemDto`, `readonly FichaResumoDto[]` elegíveis, `naBase`, `podeEditar` e o serviço de campanha.
- Produces: eventos de recarga após mutação e chamadas `FichaService.pegarItemInventario`/`mandarItemInventarioParaBase` com ficha e quantidade escolhidas.

- [ ] Escrever specs de componente: estado vazio; lista de item; adição; remover; stepper de quantidade; pegar integral/parcial; escolha de ficha quando houver mais de uma; bloqueio do jogador fora da Base.
- [ ] Confirmar falha inicial das specs.
- [ ] Adicionar ao `FichaService` os dois métodos REST já existentes no backend e as specs de rota/corpo.
- [ ] Implementar o componente como uma unidade focada: signals para carregamento/operação, formulário reativo para item manual e diálogo de quantidade; o catálogo é aberto pelo mesmo padrão e campos descritivos usados pelo editor de inventário da ficha, sem reimplementar regras de compras.
- [ ] Expor `atualizado` para o pai refazer a lista depois de qualquer mutação, inclusive após transferência.
- [ ] Rodar specs de componente/serviços e build do frontend.
- [ ] Commit: `feat(campanha): componente de inventário de esquadrão`.

### Task 3: Integração no detalhe de campanha e sincronização

**Files:**
- Create: `frontend/src/app/shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component.ts`
- Create: `frontend/src/app/shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component.html`
- Create: `frontend/src/app/shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component.scss`
- Create: `frontend/src/app/shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component.spec.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `CampanhaDetalhe.campanha`, `fichas`, `TempoRealService.estadoAlterado$`, `TempoRealService.inventarioAlterado$` e o componente da task 2.
- Produces: chip/controle de estado para o Mestre; drawer do Mestre; alternância da coluna lateral do Jogador; recarga autorizada após broadcasts.

- [ ] Escrever specs da tela: Mestre vê gatilho de drawer e alterna Na Base/Em Missão; Jogador vê botão na ficha e alterna a lateral; jogador em missão não pode abrir/invocar o inventário; broadcasts causam refetch; o drawer fecha por fundo/Escape.
- [ ] Confirmar que falham inicialmente.
- [ ] Implementar `InventarioEsquadraoSidebar` pela estrutura do `HistoricoRolagensSidebar` (gatilho, fundo, `aside` fixo, autofocus e Escape), delegando o conteúdo ao componente compartilhado.
- [ ] Na página de detalhe, carregar o inventário apenas quando necessário, manter a escolha de ficha própria para transferir e assinar eventos com `takeUntilDestroyed`; estado alterado atualiza a campanha por `recuperarCampanha`, inventário alterado refaz apenas `recuperarInventario`.
- [ ] Inserir o chip Na Base/Em Missão no cabeçalho: botão para Mestre, texto sem ação para Jogador. Integrar drawer ao cabeçalho do Mestre e troca integral da lateral do Jogador, preservando Equipe/Rolagens/Sessão ao fechar.
- [ ] Aplicar SCSS por tokens e BEM, reutilizando densidade e comportamento responsivo do análogo; revisar os alvos de toque e nenhum overflow na lateral móvel.
- [ ] Rodar as specs do drawer e detalhe, depois `npm run build --workspace=frontend`.
- [ ] Commit: `feat(campanha): interface do inventário de esquadrão`.

### Task 4: Gate integrado de qualidade

**Files:**
- Modify: `docs/context/CONTEXT.md` (seções afetadas)
- Modify: `docs/context/HISTORY.md` (novo registro no topo)

- [ ] Rodar `npm run test --workspace=frontend`, `npm run test --workspace=backend` e o build do frontend; distinguir qualquer falha preexistente.
- [ ] Subir o stack real e executar a verificação visual pessoal em 1920×1080 e 360×800: Mestre Na Base/Em Missão, drawer vazio/preenchido, Jogador Na Base/Em Missão, transferência total e parcial, atualização por evento.
- [ ] Comparar o drawer renderizado ao `HistoricoRolagensSidebar`: mesma hierarquia, densidade, controles, foco, contraste e comportamento responsivo.
- [ ] Atualizar `CONTEXT.md` e `HISTORY.md` em português com o contrato consumido, o análogo, estados/viewports testados e correções feitas.
- [ ] Revisar o diff contra este plano, conferir a ausência de hardcodes e commit de documentação: `docs(campanha): registra inventário de esquadrão no frontend`.

## Self-review

- Cobertura: transporte e eventos (Task 1), unidade reutilizável e transferências (Task 2), ambas as superfícies definidas no desenho — Mestre e Jogador — com gate de missão (Task 3), e validação técnica/visual/documental (Task 4).
- Não há placeholders de comportamento: o seletor de catálogo reutiliza o contrato descritivo do inventário da ficha, e todas as mutações têm rota e origem definidas.
- As assinaturas seguem os DTOs já entregues no backend; nenhuma regra de permissão ou inventário é duplicada no cliente.
