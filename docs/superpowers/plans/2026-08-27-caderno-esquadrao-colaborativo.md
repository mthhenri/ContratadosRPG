# Caderno do Esquadrão colaborativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um caderno por campanha em que todo membro ativo edita simultaneamente e só o mestre exclui páginas.

**Architecture:** O caderno de esquadrão grava um documento Yjs e uma projeção Markdown pesquisável. Atualizações entram pelo REST, são autorizadas e persistidas pelo NestJS, e só depois chegam aos membros pelo Socket.IO broadcast-only. Milkdown usa o plugin oficial de colaboração no modo Esquadrão; páginas privadas continuam no autosave otimista atual.

**Tech Stack:** Angular 21, Milkdown 7, Yjs/y-prosemirror, NestJS, Socket.IO, PostgreSQL/Knex.

**Spec:** `docs/superpowers/specs/2026-08-27-caderno-esquadrao-colaborativo-design.md`

## Global Constraints

- Abrir `docs/specs/active/caderno-esquadrao-colaborativo.spec.md` antes de editar código e movê-la para `done/` somente no fecho.
- Usar DTOs/enums readonly no shared, controller fino, service como árbitro de permissão e gateway sem escrita de cliente.
- Aplicar `sql-migrations`, `dto-conventions`, `tempo-real`, `design-fidelity` e `verify` no momento correspondente.
- Migration `0026`, SQL nomeado, `INSERT … SELECT`, `is_deleted = false` em SELECT e soft delete.
- Todo membro ativo cria, lista, abre, renomeia e edita; mestre sozinho exclui. Cadernos privado e de jogadores não mudam.
- Markdown sem HTML, imagens ou anexos, máximo de 100.000 caracteres; busca recebe `CADERNO_ESQUADRAO`.
- UI usa `CadernoFlutuante` como análogo e tokens existentes; gate real em 1920×1080 e 360×800.

---

### Task 1: Abrir a especificação e definir contratos colaborativos

**Files:**
- Create: `docs/specs/active/caderno-esquadrao-colaborativo.spec.md`
- Create: `shared/src/enums/tipo-pagina-caderno.enum.ts`
- Modify: `shared/src/enums/{index,busca-campanha-fonte}.ts`
- Modify: `shared/src/dtos/pagina-caderno/{pagina-caderno.dtos,pagina-caderno-interno.dtos,pagina-caderno.spec}.ts`
- Modify: `frontend/package.json`, `backend/package.json`, `package-lock.json`

**Interfaces:** Produz `TipoPaginaCadernoEnum.PRIVADA | ESQUADRAO`, `BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO`, `PaginaCadernoEsquadraoCriarDto`, `PaginaCadernoEsquadraoAtualizarDto { id; atualizacao }`, `PaginaCadernoEsquadraoEstadoDto { pagina; estado }` e `PaginaCadernoEsquadraoAtualizadaDto { campanhaId; paginaId; atualizacao; pagina }`.

- [ ] **Step 1: Escrever a spec ativa e o teste que falha**

Usar o template do repositório: incluir CRDT, permissões, busca e UI; excluir comentários, anexos, histórico de versões, colaboração em cadernos privados e permissões por página. No teste de contratos, acrescentar:

```ts
expect(Object.values(TipoPaginaCadernoEnum)).toEqual(['PRIVADA', 'ESQUADRAO']);
expect(Object.values(BuscaCampanhaFonteEnum)).toContain('CADERNO_ESQUADRAO');
```

- [ ] **Step 2: Confirmar a falha**

Run: `npm run test --workspace=shared -- pagina-caderno.spec.ts`

Expected: FAIL porque enum e fonte não existem.

- [ ] **Step 3: Implementar contratos e dependências**

Adicionar `@milkdown/plugin-collab`, `yjs`, `y-prosemirror`, `y-protocols` ao frontend; `yjs` e `y-prosemirror` ao backend. Atualizações binárias são base64 nos DTOs; `PaginaCadernoDto` ganha `tipo`, e a forma interna ganha `estadoColaborativo: Buffer | null`.

- [ ] **Step 4: Confirmar contratos**

Run: `npm run test --workspace=shared -- pagina-caderno.spec.ts && npm run build --workspace=shared`

Expected: PASS e `shared/dist` atualizado.

- [ ] **Step 5: Commit**

Run: `git add docs/specs/active shared frontend/package.json backend/package.json package-lock.json; git commit -m "feat: definir contratos do caderno de esquadrão" -m "Co-authored-by: Codex <noreply@openai.com>"`

### Task 2: Persistir o CRDT e a projeção para busca

**Files:**
- Create: `backend/src/database/migrations/0026 - Caderno do esquadrão colaborativo.sql`
- Modify: `backend/src/modules/pagina-caderno/{pagina-caderno.repository,pagina-caderno.repository.spec}.ts`

**Interfaces:** Consome contratos da Task 1; produz `criarPaginaEsquadrao`, `listarPaginasEsquadrao`, `recuperarEstadoEsquadrao`, `aplicarAtualizacaoEsquadrao` e `excluirPaginaEsquadrao` no repositório.

- [ ] **Step 1: Escrever os testes SQL que falham**

Verificar `tipo = 'ESQUADRAO'`, `estado_colaborativo = :estadoColaborativo`, `conteudo_markdown = :conteudoMarkdown`, parâmetros nomeados, `is_deleted = false`, soft delete e ramo de busca `CADERNO_ESQUADRAO`.

- [ ] **Step 2: Confirmar a falha**

Run: `npm run test --workspace=backend -- pagina-caderno.repository.spec.ts`

Expected: FAIL pelos métodos inexistentes.

- [ ] **Step 3: Implementar migration e SQL mínimo**

A migration adiciona `tipo VARCHAR(20) NOT NULL` e `estado_colaborativo BYTEA NULL`, atualiza as linhas existentes para `PRIVADA`, permite `usuario_autor_id` nulo somente para `ESQUADRAO`, cria check de coerência e índice parcial `(campanha_id, updated_date DESC)` para as compartilhadas. O trigger existente continua derivando `busca` de título/Markdown. O repositório usa `INSERT … SELECT`, armazena `Buffer`, atualiza snapshot + projeção em uma operação e não usa join de autor ao listar o Esquadrão.

- [ ] **Step 4: Validar migration e queries**

Run: `npm run test --workspace=backend -- pagina-caderno.repository.spec.ts && npm run db:migrate --workspace=backend`

Expected: PASS e migration `0026` aplicada sem modificar páginas privadas.

- [ ] **Step 5: Commit**

Run: `git add backend/src/database/migrations/0026* backend/src/modules/pagina-caderno/pagina-caderno.repository.*; git commit -m "feat: persistir caderno colaborativo de esquadrão" -m "Co-authored-by: Codex <noreply@openai.com>"`

### Task 3: Expor e autorizar os fluxos compartilhados no backend

**Files:**
- Modify: `backend/src/modules/pagina-caderno/{pagina-caderno.service,pagina-caderno.controller,pagina-caderno.module}.ts`
- Modify: `backend/src/modules/pagina-caderno/{pagina-caderno.service,pagina-caderno.controller}.spec.ts`
- Modify: `backend/src/core/gateway/{campanha.gateway,campanha.gateway.spec}.ts`

**Interfaces:** Produz `GET/POST /campanha/:campanhaId/caderno/esquadrao/paginas`, `GET /pagina-caderno/:id/esquadrao/estado`, `PUT /pagina-caderno/:id/esquadrao/atualizacoes`, `DELETE /pagina-caderno/:id/esquadrao`; eventos `caderno-esquadrao:pagina-criada`, `caderno-esquadrao:atualizado`, `caderno-esquadrao:pagina-excluida`.

- [ ] **Step 1: Escrever specs de permissão, merge e evento que falham**

Provar: membro/mestre podem listar, recuperar, criar e atualizar; não membro recebe 403; só mestre exclui; rota de Esquadrão recusa página privada; update base64 inválido recebe 400; duas atualizações Yjs em ordem diferente convergem. Provar que o gateway emite só após o repositório salvar e nunca adiciona `@SubscribeMessage` de escrita.

- [ ] **Step 2: Confirmar falha**

Run: `npm run test --workspace=backend -- pagina-caderno.service.spec.ts pagina-caderno.controller.spec.ts campanha.gateway.spec.ts`

Expected: FAIL por rotas, regra e eventos ausentes.

- [ ] **Step 3: Implementar service/controller/gateway**

Para toda operação, buscar página, confirmar `tipo === ESQUADRAO` e vínculo ativo antes do acesso. Em atualização: decodificar base64, aplicar `Y.applyUpdate` a `Y.Doc`, recusar bytes inválidos e estado acima do limite, derivar o Markdown/título do documento Y-ProseMirror, validar limites, persistir snapshot e só então emitir o DTO. `excluirPaginaEsquadrao` exige `MESTRE`; páginas privadas continuam com autoria e `updatedDate`. Controllers apenas mesclam parâmetros; gateway usa `servidor.to(salaCampanha(campanhaId)).emit(...)` depois da gravação.

- [ ] **Step 4: Validar backend**

Run: `npm run test --workspace=backend -- pagina-caderno.service.spec.ts pagina-caderno.controller.spec.ts campanha.gateway.spec.ts && npm run test --workspace=backend`

Expected: PASS, sem vazamento de snapshot/metadado para não membro.

- [ ] **Step 5: Commit**

Run: `git add backend/src/modules/pagina-caderno backend/src/core/gateway/campanha.gateway.*; git commit -m "feat: sincronizar caderno do esquadrão no backend" -m "Co-authored-by: Codex <noreply@openai.com>"`

### Task 4: Integrar Yjs, Milkdown e o tempo real no frontend

**Files:**
- Create: `frontend/src/app/modules/pagina-caderno/colaboracao-esquadrao.service.ts`
- Create: `frontend/src/app/modules/pagina-caderno/colaboracao-esquadrao.service.spec.ts`
- Modify: `frontend/src/app/core/services/{tempo-real.service,tempo-real.service.spec}.ts`
- Modify: `frontend/src/app/modules/pagina-caderno/{pagina-caderno.service,pagina-caderno.service.spec,editor-markdown.component,editor-markdown.component.spec}.ts`

**Interfaces:** Produz `ColaboracaoEsquadraoService.abrir(pagina): Observable<EditorMarkdownColaborativo>`, `fechar(): void` e `TempoRealService.cadernoEsquadraoAtualizado$`.

- [ ] **Step 1: Escrever testes de adaptador que falham**

Criar dois `Y.Doc` em memória, aplicar edições diferentes em ordens invertidas e comparar Markdown final. Cobrir update local enviado uma vez ao REST, update remoto aplicado sem reenvio, snapshot recuperado na reconexão e exclusão descartando doc/listeners. No editor, provar que o modo colaborativo usa `collabServiceCtx.bindDoc(doc).connect()` e não `replaceAll` para mudança remota.

- [ ] **Step 2: Confirmar falha**

Run: `npm run test --workspace=frontend -- --include=colaboracao-esquadrao.service.spec.ts --include=editor-markdown.component.spec.ts --include=tempo-real.service.spec.ts --include=pagina-caderno.service.spec.ts`

Expected: FAIL pelos serviços e eventos ausentes.

- [ ] **Step 3: Implementar transporte e adaptador**

O cliente HTTP serializa `Uint8Array` em base64 e expõe as rotas compartilhadas. `TempoRealService` registra os três eventos como Observables e continua emitindo apenas `*:entrar`. O adaptador mantém um `Y.Doc` por página, aplica snapshot antes de conectar Milkdown, enfileira apenas updates locais para REST, aplica eventos remotos com origem remota, busca snapshot e reenvia fila na reconexão, e destrói documento/awareness/listeners ao fechar ou trocar página.

- [ ] **Step 4: Validar frontend técnico**

Run: `npm run test --workspace=frontend -- --include=colaboracao-esquadrao.service.spec.ts --include=editor-markdown.component.spec.ts --include=tempo-real.service.spec.ts --include=pagina-caderno.service.spec.ts && npm run lint --workspace=frontend`

Expected: PASS; autosave privado continua coberto pelos specs existentes.

- [ ] **Step 5: Commit**

Run: `git add frontend/src/app/core/services/tempo-real.service.* frontend/src/app/modules/pagina-caderno; git commit -m "feat: conectar editor colaborativo do esquadrão" -m "Co-authored-by: Codex <noreply@openai.com>"`

### Task 5: Mostrar o terceiro modo, presença e busca na janela

**Files:**
- Modify: `frontend/src/app/modules/pagina-caderno/{caderno-flutuante.model,caderno-flutuante.store,caderno-flutuante.component,caderno-flutuante.component.spec,caderno-flutuante.store.spec}.ts`
- Modify: `frontend/src/app/modules/pagina-caderno/{caderno-flutuante.component.html,caderno-flutuante.component.scss}`

**Interfaces:** Consome Task 4; produz `ModoCaderno = 'MEU' | 'ESQUADRAO' | 'JOGADORES'` e estados `SINCRONIZANDO | SINCRONIZADO | DESCONECTADO`.

- [ ] **Step 1: Escrever specs de UI/store que falham**

Cobrir: membro vê Meu+Esquadrão, mestre vê três abas; ambos criam/renomeiam/editam Esquadrão; excluir aparece e funciona apenas ao mestre; busca `CADERNO_ESQUADRAO` abre a página no modo certo; troca de página/campanha/minimizar fecha a sessão sem descartar fila.

- [ ] **Step 2: Confirmar falha**

Run: `npm run test --workspace=frontend -- --include=caderno-flutuante.component.spec.ts --include=caderno-flutuante.store.spec.ts`

Expected: FAIL por ausência de Esquadrão e ações.

- [ ] **Step 3: Implementar a UI no padrão atual**

Estender `ModoCaderno`, carregar lista compartilhada e ligar adaptador na página selecionada. O editor/título no Esquadrão seguem o doc Yjs; criar e renomear ficam para membros, excluir só para `ehMestre()`. Exibir estado de sincronização e presença compacta abaixo do título, usando classes `caderno__*`, `--text-dim` e breakpoints existentes. Não permitir importação no modo Esquadrão. Evento de criação/exclusão atualiza listas abertas e fecha página removida. Incluir `CADERNO_ESQUADRAO` nas fontes padrão de todo membro.

- [ ] **Step 4: Validar UI compilada**

Run: `npm run test --workspace=frontend -- --include=caderno-flutuante.component.spec.ts --include=caderno-flutuante.store.spec.ts && npm run build --workspace=frontend`

Expected: PASS e build Angular sem erro.

- [ ] **Step 5: Commit**

Run: `git add frontend/src/app/modules/pagina-caderno/caderno-flutuante.*; git commit -m "feat: exibir caderno colaborativo do esquadrão" -m "Co-authored-by: Codex <noreply@openai.com>"`

### Task 6: Integrar, verificar visualmente e fechar a task

**Files:**
- Modify: `docs/context/CONTEXT.md`, `docs/context/HISTORY.md`
- Move: `docs/specs/active/caderno-esquadrao-colaborativo.spec.md` → `docs/specs/done/caderno-esquadrao-colaborativo.spec.md`

- [ ] **Step 1: Rodar o gate integrado**

Run: `npm run lint && npm run test --workspaces --if-present && npm run build --workspace=shared && npm run build --workspace=backend && npm run build --workspace=frontend`

Expected: lint, testes e builds verdes; falhas preexistentes relatadas separadamente.

- [ ] **Step 2: Exercitar dois membros na aplicação real**

Com `verify`, abrir mestre e jogador na mesma campanha e a mesma página: digitar trechos distintos, renomear, criar por jogador, negar exclusão ao jogador, excluir pelo mestre, buscar conteúdo, simular reconexão e confirmar merge, presença/cursor, fila e fechamento da página removida.

- [ ] **Step 3: Executar o gate visual pessoal**

Comparar com `CadernoFlutuante` em 1920×1080 e 360×800 nos estados fechado, aberto, minimizado, vazio, edição dupla, desconectado, reconectado, exclusão e busca. Corrigir overflow, contraste, foco e alvo de toque antes de continuar.

- [ ] **Step 4: Fechar documentação e commit**

Mover a spec para done; inserir no topo de HISTORY uma narrativa em português com decisões/testes/verificação visual; atualizar a seção Caderno do CONTEXT sem diário. Executar: `git add docs/context docs/specs/done/caderno-esquadrao-colaborativo.spec.md; git commit -m "docs: concluir caderno colaborativo do esquadrão" -m "Co-authored-by: Codex <noreply@openai.com>"; git log -1 --format=full`.

## Self-review

- A Task 1 abre a spec e estabelece contratos; Task 2 persiste CRDT e índice; Task 3 autoriza/restaura/emite; Task 4 sincroniza Milkdown/Yjs; Task 5 integra UI e busca; Task 6 verifica e documenta.
- Todas as decisões aprovadas são cobertas: edição concorrente sem perda, criação por membro, exclusão mestre-only, reconexão, presença, busca e preservação dos cadernos existentes.
- Os nomes de enum, DTO, endpoints e eventos são os mesmos nas tasks consumidoras.
- Não há itens pendentes, marcadores provisórios ou etapas sem teste/comando de confirmação.
