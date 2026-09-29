# MEMORY.md — Mapa do Sistema

Mapa de consumidores REST/WS de ficha oculta, achados e retomada:
[auditoria](../auditorias/ficha-oculta-todos-consumidores.md),
[spec investigativa ativa](../specs/active/auditoria-ficha-oculta-todos-consumidores.spec.md).

> **O que este arquivo é:** um índice de **localização**. Ele responde *"onde fica X?"* e
> *"o que eu preciso ler antes de mexer em Y?"*.
>
> **O que este arquivo NÃO é:** ele **nunca copia a regra em si**. Se a regra aparecer aqui e na
> fonte, as duas divergem no primeiro dia em que uma mudar — e a cópia errada é pior que nenhuma.
> Aqui só entram ponteiros. Para *o que é verdade agora*, veja [`CONTEXT.md`](CONTEXT.md).

---

## 1. Onde estão as regras

Estas são as fontes da verdade. Em conflito entre código e documento, **o documento vence**.

| Assunto | Fonte | Ler antes de |
|---|---|---|
| Constituição do projeto — precede tudo | [`docs/SYSTEM.SPEC.md`](../SYSTEM.SPEC.md) | qualquer implementação |
| Convenções de código (referência rápida) | [`docs/CONVENTIONS.md`](../CONVENTIONS.md) | escrever qualquer arquivo |
| **Regras do jogo — jogador** | [`docs/core/sistema-v4.1.0.md`](../core/sistema-v4.1.0.md) | tocar em **qualquer** fórmula, tabela de progressão ou regra de domínio |
| **Regras do jogo — ameaças/criaturas** | [`docs/core/guia_de_mestre-v4.0.0.md`](../core/guia_de_mestre-v4.0.0.md) | criar ou alterar criatura/NPC (M4) |
| Leitor global e publicação dos PDFs de regras | [`docs/specs/done/m3-72-leitor-global-documentos-regras.spec.md`](../specs/done/m3-72-leitor-global-documentos-regras.spec.md) + `frontend/src/app/shared/leitor-documentos/` (iframe nativo no desktop) + `frontend/src/app/shared/leitor-documentos/leitor-pdf-mobile/` (leitor próprio via `pdfjs-dist`, só mobile — ajuste avulso 2026-08-25, Edge mobile não incorpora PDF em iframe) | alterar acesso, viewer ou publicação dos documentos |
| **Identidade visual** — guia e mapa de tokens | [`docs/design/DESIGN.md`](../design/DESIGN.md) | **qualquer** trabalho de frontend/UI/estilo |
| Gate visual e qualidade acima de velocidade | [`AGENTS.md`](../../AGENTS.md) “Gate obrigatório de qualidade e conclusão” + [`SYSTEM.SPEC.md`](../SYSTEM.SPEC.md) §8/§16.31 — execução dos seis passos e o checklist acionável na skill `design-fidelity` | planejar, implementar ou concluir **qualquer** UI/estilo |
| Tokens CSS (fonte da verdade em runtime) | [`docs/design/tema/_tokens.scss`](../design/tema/_tokens.scss) | escolher cor, fonte, raio ou espaçamento |
| Primitivos de UI (código, não cópia) | [`frontend/src/app/shared/ui/`](../../frontend/src/app/shared/ui/) — `app-botao`/`app-campo` (`ui-01`; `[icone]` dentro do controle desde a `m9-05`), `app-modal`/`Notificacao` sobre `<dialog>` nativo (`ui-02`), `app-cartao`/`app-stat`/`app-chip`/`app-abas`+`app-aba`+`AbaPainel`/`app-step-input` (`ui-03`, `stepper/` promovido de `modules/simulacao`), `app-estado-vazio`/`app-esqueleto` (`ui-14`, estados de lista vazio/carregando), `app-barra-recurso` (`ui-16`, recurso com máximo — Vida/Energia; absorve o HUD da ficha, o bloco de vitalidade e o cartão de combatente), `app-painel-flutuante` (`ui-17`, `shared/ui/painel-flutuante/` — arraste, posição persistida, empilhamento de z-index, minimizar e fechar de uma janela flutuante não modal; `CalculadoraFlutuante`/`CadernoFlutuante`/`LeitorDocumentos`/`FichaFlutuante` delegam a ele e só cuidam do próprio conteúdo, redimensionar e maximizar), `app-valor-editavel` (`P-057`, `shared/ui/valor-editavel/` — "valor da ficha que vira `<input>`/`<select>`/`<textarea>` ao clicar"; não genereciza o tipo do campo, só a máquina de estado exibição↔edição e a identidade visual via `app-botao[estilo="texto"]` interno), `app-coluna-acoes`+`app-coluna-acoes-item` (`campanha-detalhe-mestre-coluna-acoes`, `shared/ui/coluna-acoes/` — coluna lateral expansível/retrátil que participa do fluxo do layout, nunca sobrepõe; estado persistido por `[id]`; vira barra inferior no mobile; só a visão de mestre da campanha usa por ora), `app-editor-markdown` (`editor-markdown-campos-texto-livre`, `shared/ui/editor-markdown/` — Milkdown atrás do token `EDITOR_MARKDOWN_FACTORY`, promovido de `modules/pagina-caderno/`; `[valor]`/`(valorChange)` direto **ou** `ControlValueAccessor`/`formControlName`, `[somenteLeitura]`, `[compacto]` para campo de formulário curto, `[rotulo]` para o nome acessível; `[documentoColaborativo]`/`[awareness]` só fazem sentido no Caderno) | pôr um botão, campo, modal, notificação, cartão, caixa de estatística, selo, barra de abas, stepper, estado vazio, esqueleto de carregamento, barra de recurso com máximo, janela flutuante arrastável, valor clicável que vira campo de edição, coluna de ações lateral na tela, ou edição/leitura de texto em Markdown fora do Caderno |
| Padrões BEM canônicos ainda sem primitivo | [`docs/design/tema/_componentes.scss`](../design/tema/_componentes.scss) — **catálogo para copiar**, fora do build; o bloco já promovido está marcado "→ PRIMITIVO" e não se copia mais. Migração em `ui-03`/`ui-04` ([`ui-biblioteca-componentes.spec.md`](../specs/backlog/ui-biblioteca-componentes.spec.md), `PROBLEMS.md` `P-034`) | criar um card, stat, stepper, chip… |
| Protótipos aprovados (fidelidade 1:1) | [`docs/design/examples/`](../design/examples/) | montar uma tela nova |
| Schema SQL + forma dos documentos JSONB | [`docs/SCHEMA.md`](../SCHEMA.md) | escrever migration ou mexer em `ficha.dados` |
| Nomenclatura de DTO | skill `dto-conventions` + `SYSTEM.SPEC.md` | nomear qualquer classe de entrada/saída |
| Skills de agente — onde vivem e o contrato que cumprem | [`CLAUDE.md`](../../CLAUDE.md) "Sincronização com CLAUDE.md"/"Contrato comum a toda skill do projeto" — skills ficam em `.claude/skills/<nome>/SKILL.md`, cópia idêntica em `.agents/skills/<nome>/SKILL.md` | criar, corrigir ou revisar qualquer skill; escolher qual skill ler antes de um tipo de trabalho (hoje: `dto-conventions` antes de nomear DTO, `verify` antes de declarar uma UI pronta, `task-flow` antes de abrir/implementar/fechar qualquer task, `sql-migrations` antes de tocar schema/migration/SQL de repositório, `design-fidelity` antes de criar/ajustar qualquer UI — contra o que comparar, não como rodar o app, `regras-do-jogo` antes de tocar fórmula e `tempo-real` antes de alterar/diagnosticar WebSocket, salas ou consumidores sincronizados) |
| Runbook de deploy | [`docs/DEPLOY.md`](../DEPLOY.md) | mexer em produção |
| Banco local, reset, fixtures e credenciais dev | [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) + `backend/tools/database/` | recriar ou popular o ambiente local |
| Pendências operacionais do M1 | [`docs/PARIDADE-M1.md`](../PARIDADE-M1.md) | fechar o M1 de fato |

**Ordem de leitura no início de sessão** (definida no `CLAUDE.md`): `SYSTEM.SPEC.md` →
`CONVENTIONS.md` → `docs/context/CONTEXT.md`. Se a task for de UI, some `docs/design/DESIGN.md` +
`docs/design/tema/`.

---

## 2. Mapa do código

### `shared/` — `@contratados-rpg/shared`

| Quero mexer em | Fica em |
|---|---|
| **Motor de regras do jogo** (funções puras) | `shared/src/regras/` — `agente/`, `compras/`, `dados/`, `descanso/`, `dt/`, `identidade/`, `novo-agente/`, `patente/`, `rolagem/` |
| DTOs (contratos entre camadas) | `shared/src/dtos/` |
| Contratos, fontes e limites de cadernos/busca | `shared/src/dtos/pagina-caderno/`, `shared/src/enums/busca-campanha-*.enum.ts`, `shared/src/validators/pagina-caderno.validators.ts` |
| Enums (string, valor = nome, SCREAMING_SNAKE_CASE) | `shared/src/enums/` |
| `StandardResponse`, `PaginatedResult` | `shared/src/interfaces/` |
| Validadores (constantes puras) | `shared/src/validators/` |

`regras/` é a **única** exceção sancionada ao "sem lógica de negócio no shared". Frontend e backend
consomem os dois o mesmo motor — nunca reimplemente uma fórmula de um lado só.

### `backend/` — NestJS

| Quero mexer em | Fica em |
|---|---|
| Módulos de domínio | `backend/src/modules/` — `autenticacao/`, `campanha/`, `campanha-projecao/`, `ficha/`, `pagina-caderno/`, `rolagem/`, `usuario/` |
| Cadernos privados e busca textual da campanha | `backend/src/modules/pagina-caderno/` + `backend/src/database/migrations/0018 - Caderno de campanha e busca textual.sql` |
| Predicados de papel de campanha (`ehMestre`/`ehJogador`/`ehEspectador`) e `validarMembro` (devolve o vínculo) | `CampanhaService` (m8-02) — `ficha`/`rolagem`/`pagina-caderno` reusam, nunca comparam `papel === TipoCampanhaMembroPapelEnum.X` por conta própria |
| Painel do espectador e prévia de jogador (projeções de leitura só-GET) | `backend/src/modules/campanha-projecao/` (m8-02) — módulo próprio pra não criar ciclo entre `campanha`/`ficha`/`rolagem` (os dois últimos já importam `campanha`) |
| Registrar um controller novo para a geração de contratos OpenAPI | `@DocumentarController(...)` (runtime) **não** basta — `backend/tools/gerar-openapi-contratos.ts` tem seu próprio mapa estático `TAGS_POR_CONTROLLER`; controller ausente dele é silenciosamente pulado pelo gerador |
| `BaseEntity`, `BaseRepository` | `backend/src/core/base/` |
| `@Public()`, `@ActiveUser()` | `backend/src/core/decorators/` |
| Exceções de negócio | `backend/src/core/exceptions/` — `BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException` |
| Filtro global + interceptor de resposta | `backend/src/core/filters/`, `backend/src/core/interceptors/` |
| Documentação REST OpenAPI/Swagger | `backend/src/core/openapi/` — `openapi.document.ts` registra `/api/docs` e `/api/docs-json`; `contratos-gerados.ts` é produzido por `backend/tools/gerar-openapi-contratos.ts` a partir de DTOs públicos e controllers |
| **Gateway WebSocket** (broadcast-only) | `backend/src/core/gateway/` — `CampanhaGateway`, `WsIoAdapter` |
| Resincronização da Iniciativa quando a ficha muda fora do `EncontroService` (ficha flutuante etc.) | `CampanhaGateway.emitirFichaAlterada` chama `EncontroService.sincronizarFichaAlterada` |
| **Armazenamento de blob** (avatar da ficha, local/R2) | `backend/src/core/armazenamento/` — `ArmazenamentoProvedor`, `ArmazenamentoLocalProvedor`/`ArmazenamentoR2Provedor`, toggle via `ConfigService.obterConfiguracaoArmazenamento()` |
| Conexão Knex em runtime | `backend/src/database/` |
| Reset e seed de desenvolvimento | `backend/tools/database/` + [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) |
| **Migrations** | `backend/src/database/migrations/` — `0001`…`0018`, nome numerado |
| Benchmark da busca textual | `backend/tools/database/explain-busca-campanha.sql` |
| Leitura de env (nunca `process.env` direto) | `backend/src/config/` — `ConfigService`; `.env` resolvido pelo diretório de execução para funcionar em `src` e `dist` |

Fluxo obrigatório: **controller (burro) → service (regra) → repository (só SQL)**.

### `frontend/` — Angular 21

| Quero mexer em | Fica em |
|---|---|
| Módulos de tela | `frontend/src/app/modules/` — `autenticacao/`, `simulacao/`, `campanha/`, `ficha/`, `pagina-caderno/`, `usuario/` |
| Janela, estado e transporte do caderno | `frontend/src/app/modules/pagina-caderno/` — `caderno-flutuante.*` (casca do painel e estado), `caderno-conteudo.*` (corpo: escopo, busca, lista, editor e importação — o mesmo no painel e na janela externa), `caderno-salvamento.*` (selo de salvamento), `caderno-janela.service.ts` + `paginas/caderno-janela/` (janela externa `/janela/campanha/:id/caderno`, I-027), `importar-markdown.ts` (título derivado do arquivo; normalização e validação comuns à Biblioteca em `frontend/src/app/shared/markdown/importar-markdown.ts`, m9-08), `pagina-caderno.service.ts` (REST). O editor Markdown em si (`EditorMarkdown`, Milkdown, presets `commonmark` + `gfm`) mora em `shared/ui/editor-markdown/` desde `editor-markdown-campos-texto-livre` — é primitivo compartilhado, não mais exclusivo do Caderno; `caderno-conteudo.component.ts` só importa dali. `markdown-seguro.ts` está **órfão** desde a migração para o Milkdown: só o próprio `.spec.ts` o chama — vale como registro da regra "caderno sem imagens nem HTML", não como caminho de código |
| Componentes da ficha | `frontend/src/app/modules/ficha/componentes/` — `ficha-visualizacao/` (ficha completa), `ficha-campanha-card/` (card de equipe — bifurcado de `ficha-visualizacao/`, `ficha-separar-completa-e-campanha-card`, não compartilham mais arquivo), `ficha-reacoes/`/`ficha-resistencias/` (blocos Defesa-Esquiva-Bloqueio-Contra-ataque / 5 tipos de dano, extraídos dos dois acima em `I-029`; `[compacto]` reproduz a densidade da carteirinha, cada um com seu próprio estado de edição — bloco de Identidade ainda duplicado, não extraído), `ficha-inventario/`, `ficha-habilidades/`, `ficha-sanidade/`, `ficha-rolagens/`, `ficha-rolagens-painel/`, `rolagem-rapida/` (barra "Rolagem rápida" — visor + `MontadorRolagem` + "Rolar" — extraída de `ficha-rolagens/` pra ser reusada por `criatura-visualizacao/`), `ficha-combos/`, `ficha-habilidade-seletor/`, `guia-equipamento-loja/`, `guia-formula/` |
| Ficha flutuante da Iniciativa e atalho mobile **Minha ficha** | `frontend/src/app/modules/encontro/componentes/ficha-flutuante/` e `frontend/src/app/modules/encontro/paginas/painel-mestre/`/`painel-jogador/` (a casca e o serviço de dados em `paginas/painel/`); no mobile, `ficha-flutuante__corpo` é a rolagem vertical única e passa `rolagemExterna` à ficha de jogador |
| Composables de página da ficha (uma instância por página, `providers: []`) | `frontend/src/app/modules/ficha/` — `ficha-edicao.service.ts` (handlers `ajustar*`), `ficha-rolagem-registro.service.ts` (flag "Rolagem oculta" + registro do histórico) |
| Componentes reutilizáveis | `frontend/src/app/shared/` — `layout/`, `icone/`, `bandeja-dados/`, `historico-rolagens-sidebar/`, `janela-externa/` (`JanelaExternaService`: janelas `/janela/...` abertas por `window.open`, uma por contexto, com detecção de fechamento — histórico, anotações e Caderno usam por fachada; I-027), `cartao-rolagem/` (card único de rolagem + lixeira ADMIN, `rolagem-excluir-admin`; `autoria-rolagem.util.ts` é a fonte única da linha de autoria — `autor · ficha` / `autor · Mestre`, P-076), `calculadora-flutuante/`, `montador-rolagem/` (caixa flutuante de tokens da "Rolagem rápida", `ui-35`/`ui-36` — mesmo `app-painel-flutuante` da calculadora, gatilho + rodapé próprios em BEM, não `app-botao`; `montador-rolagem.util.ts` tem `incrementarUltimoDado`, a lógica de "clicar o dado de novo soma quantidade"; só escreve na `FormControl` que já existe, nenhuma regra de dados aqui), `tempo-real/`, `tooltip/`, `preview-avatar/` (`appPreviewAvatar`: foto ampliada 300×300 em hover sustentado de mouse, portal no `<body>`; hoje só a trilha de turnos usa — Esquadrão do jogador/mestre e Acervo ainda têm cópia local do mesmo comportamento), `overflow-fade/`, `hold-repeat/`, `marca/`, `receber-dano/` (dialog "Receber dano", m7-17)… |
| "Receber dano" — regra de resistência × dano por tipo (assimetria da camada Geral) | `shared/src/regras/encontro/receber-dano.ts` (`calcularDanoRecebido`) — consumida só por `frontend/src/app/shared/receber-dano/` |
| Resistência a dano por tipo do cartão da Iniciativa (`EncontroCombatenteResumoDto.resistencias`) | calculada em `backend/src/modules/encontro/encontro-combatente.mapper.ts` (`resolverResistencias` — `montarResistencias` pro agente, `somarResistenciasCriaturaPorTipo` pra criatura, `shared/src/regras/criatura/resistencia.ts`), zerada em `encontro-revelacao.ts` junto das demais defesas |
| Documento de campanha ("Biblioteca", M9) — contrato e schema | enum `shared/src/enums/tipo-documento.enum.ts`; limites `shared/src/validators/documento.validators.ts`; DTOs `shared/src/dtos/documento/`; schema `tipo_documento`/`documento` na migration 0034 e em `docs/SCHEMA.md` ("documento") |
| Biblioteca de documentos (M9, m9-02) — permissão, recorte do revelado e trava anti-vazamento | `backend/src/modules/documento/` (`DocumentoService.podeLerNaoReveladas` é o recorte único); `documento:alterado` em `CampanhaGateway.emitirDocumentoAlterado`; pasta de imagem por `ArmazenamentoPastaEnum` (`backend/src/core/armazenamento/armazenamento-chave.util.ts`); busca textual recortada pelo papel (m9-03) em `DocumentoRepository.buscarDocumentos` — plano do `EXPLAIN` com 10 000 documentos no `HISTORY.md` (m9-03) |
| Presença de leitura da Biblioteca (m9-09) — quem está com cada documento aberto, só para o mestre | estado em memória em `backend/src/modules/documento/documento-leitura.service.ts` (`DocumentoLeituraService`: retrato, limpeza, emissão só quando muda); permissão em `DocumentoService.informarLeitura`; `documento:leitura` (entrada), `documento:leitores` (só `campanha:<id>:mestre`) e a limpeza em `handleDisconnect`/`campanha:sair`/`recalibrarSalasCampanhaUsuario` no `CampanhaGateway`; envio em `TempoRealService.informarLeitura` + `biblioteca-leitura.store.ts`; tela do mestre (m9-10) em `frontend/src/app/modules/documento/biblioteca-leitores.store.ts` (retrato → nomes, `TempoRealService.documentoLeitores$`) + `documento-leitores.ts` (tipos/descrição) + chip no `documento-cartao` e "Lendo agora" no `biblioteca-layout` |
| Biblioteca de documentos (M9, m9-04/m9-05) — telas do mestre, do jogador e do espectador, busca e leitor | `frontend/src/app/modules/documento/` (`paginas/biblioteca/` casca por papel, `paginas/biblioteca-mestre/`, `paginas/biblioteca-jogador/`, `paginas/biblioteca-espectador/` na rota `campanhas/:id/espectador/documentos`; estrutura comum em `componentes/biblioteca-layout/` (casca) + `componentes/biblioteca-corpo/` (lista | documento, m9-11), `lista-documentos/`, `documento-cartao/`; painel flutuante em `componentes/biblioteca-flutuante/` (m9-11); edição no próprio lugar — página e painel — em `componentes/documento-edicao/` (m9-13); Revelar/Ocultar em `documento-revelacao.service.ts`; busca em `componentes/busca-documentos/` + `trecho-destacado.ts`; estado da mesa em `biblioteca-leitura.store.ts`; `componentes/leitor-documento/` reusado pela `m7-25`; `rascunho-documento.guard.ts` — guarda da página e, para o painel, `RascunhoDocumentoRegistro` + `rascunhoDocumentoPainelGuard` nas rotas das telas hospedeiras, m9-13); composição visual em `docs/design/DESIGN.md` ("Biblioteca de documentos") |
| Erro HTTP mostrado no controle em vez de toast | `ERROS_TRATADOS_NA_TELA` em `frontend/src/app/core/interceptors/error-handler.interceptor.ts` (`HttpContext` com a lista de status) |
| Cena (raiz tipada da mesa, m7-21) — "este tipo de cena tem iniciativa?" | `shared/src/regras/cena/cena-tem-iniciativa.ts` (fonte única); enums `shared/src/enums/cena-tipo.enum.ts`/`cena-status.enum.ts`; DTOs `shared/src/dtos/cena/`; schema `cena`/`encontro.cena_id` nas migrations 0031/0032/0033 e em `docs/SCHEMA.md` ("cena") |
| Ciclo de vida da cena (criar/abrir/encerrar/reordenar), invariante de uma `ATIVA` por campanha e trava anti-vazamento de cena `PLANEJADA` (m7-22) | `backend/src/modules/cena/` (`CenaService` cria e encerra o encontro dela); política de quais cenas cada papel lê (jogador só a `ATIVA`) em `backend/src/modules/cena/cena-visibilidade.ts`, consumida por `CenaService`, `CenaDocumentoService` e `EncontroService` (inclusive `montarEstadoParaUsuario`); `cena:alterada` em `CampanhaGateway.emitirCenaAlterada`. As rotas `POST campanha/:id/encontro` e `POST encontro/:id/encerrar` vivem no `CenaController` |
| Escrita atômica em runtime (transação fora das migrations, m7-22) | `backend/src/database/transacao.service.ts` (`TransacaoService.executar` + `contextoTransacao`, lido por `BaseRepository.obterExecutor`); convenção em `docs/CONVENTIONS.md` ("Escrita atômica") |
| Hub de cenas, dialog "Nova cena", casca do painel de uma cena (bifurca por `cenaTemIniciativa` e papel) e redirects das URLs de `/iniciativa` (m7-23) | `frontend/src/app/modules/cena/` (`HubCenas`, `CenaCriarDialog`, `PainelCenaShell`, `cena.routes.ts`, `redirecionar-encontro-para-cena.ts`, `rotulos-cena.ts`); o painel de Iniciativa em si continua em `modules/encontro/`, carregado pela cena via `EncontroPainelDadosService` |
| Painel de cena sem iniciativa (Resistência/Investigação, m7-24) e as salas `ficha:<id>` da grade de agentes | `frontend/src/app/modules/cena/paginas/painel-sem-iniciativa-mestre/` e `painel-sem-iniciativa-jogador/`; salas e `ficha:alterada` em `EncontroPainelDadosService` (só com `semIniciativa()`) |
| Expressão de dados customizada de Iniciativa por combatente/encontro (m7-19, `iniciativaFormulaCustom`) | coluna `encontro_combatente.iniciativa_formula_custom` (migration 0025); `EncontroService.alterarFormulaIniciativa` (mestre-only, valida com `validarFormula` de `shared/regras/rolagem`); consumida em `rolarTudo()` (`painel-mestre.page.ts`) e `rolarMinhaIniciativa()` (`painel-jogador.page.ts`, helper `concluirRolagemDeIniciativa`), com prioridade total sobre a fórmula padrão |
| Leitura e seleção de documentos na Investigação | `frontend/src/app/modules/cena/cena-documento-leitura.service.ts`; foco e listagem em `EncontroPainelDadosService`; limpeza transacional em `backend/src/modules/cena/cena-documento.service.ts` e `cena-documento.repository.ts`; evidências em `docs/reviews/fix-documentos-investigacao/VERIFICACAO.md` |
| Services, guards, interceptors | `frontend/src/app/core/` |
| Painel do espectador ao vivo (`/campanhas/:id/espectador`, m8-03) | `frontend/src/app/modules/campanha/paginas/espectador/` — página própria (não máscara sobre mestre/jogador); `campanha-projecao.service.ts` no mesmo nível de `campanha.service.ts` consome `GET campanha/:id/painel-espectador` |
| Painel de jogadores dentro do Painel do espectador (grade de cartões, m8-07) | `EspectadorFichaCard` (`frontend/src/app/modules/campanha/componentes/espectador-ficha-card/`), montado em `espectador.page.ts` via `agruparFichasPorMembro`/`ordenarMembros`. Backend: `FichaService.listarFichasParaEspectador` (`backend/src/modules/ficha/ficha.service.ts`) — lista todo agente `JOGADOR` não oculto de uma campanha **sem** depender de dono/concessão (diferente de `listarFichas`/`listarFichasParaAlvo`); campo interno `FichaResumoInternoDto.oculta` (nunca no `FichaResumoDto` público) só para esse filtro |
| Grade "Criaturas" da visão de mestre (`/campanhas/:id`) | `CriaturaEsquadraoCard` (`frontend/src/app/modules/campanha/componentes/criatura-esquadrao-card/`) — mesma receita visual de `EspectadorFichaCard`, avatar em 100×100 (não 128×128), sem Energia/Esquiva/Bloqueio/Contra-ataque; montado em `detalhe-mestre.page.ts` (`criaturasEsquadrao()`, traduz `porte`/`comportamento`/`na` via `rotulos-criatura.ts`). O menu "⋯" reusa o mesmo dropdown/`menuFichaAberto` do cartão de jogador (`tipo`/`donoNome` opcional). `registro`/`porte`/`comportamento` em `FichaResumoDto` (shared) + `colunasResumo()` (backend) — antes só existiam no documento completo `FichaCriaturaDadosDto` |
| Guard de rota que precisa aceitar `ESPECTADOR` | não use `listarMembros`/`recuperarCampanha` como autoridade (recusam `ESPECTADOR` desde o m8-02) — use a rota que o próprio papel pode chamar; `espectadorCampanhaGuard` (`frontend/src/app/core/guards/`) faz isso chamando a projeção do painel |
| Prévia de jogador (`/campanhas/:id/previa/:usuarioAlvoId`, m8-04) | `frontend/src/app/modules/campanha/paginas/previa-jogador/` — casca que monta a própria `CampanhaDetalheJogador` trocando a fonte de dados por `CampanhaPreviaJogadorDadosService` (projeção do alvo); a tela fica somente leitura por `CampanhaDetalheDadosService.previa()` (`previa-jogador-visao-real`); `previaJogadorCampanhaGuard` (`frontend/src/app/core/guards/`) mesmo racional de `espectadorCampanhaGuard`. Backend: `FichaService.recuperarFichaParaAlvo`/`avaliarVisibilidadePara` (`backend/src/modules/ficha/ficha.service.ts`), `CampanhaProjecaoService.recuperarFichaPreviaJogador` |
| Agrupamento "Equipe"/`fichasPorMembro`/`membrosOrdenados` (view-model puro, reusado por `CampanhaDetalheDadosService`/`CampanhaDetalheJogador` e pela Prévia de jogador) | `frontend/src/app/modules/campanha/campanha-equipe.util.ts` (m8-04) |
| Machucado automático pela Vida (I-032) | regra pura `resolverMachucadoPelaVida` em `shared/src/regras/agente/machucado.ts`; aplicada em `FichaService.alterarVitalidade` (backend) e `FichaEdicaoService.ajustarVitalidade` (frontend) |
| Condições dos colegas na carteirinha sem acesso completo (I-031) e invalidação seletiva das listas da ficha (P-085) | `morrendo`/`machucado`/`inconsciente` em `CampanhaMembroFichaResumoDto` (`CampanhaRepository.listarMembros`); comparação das projeções antes/depois em `FichaService.emitirRecortesAlterados`; transporte por `ficha:recortes-alterados` (`CampanhaGateway.emitirFichaRecortesAlterados` → `TempoRealService.fichaRecortesAlterados$`); agrupamento e corrida de GET em `CampanhaDetalheDadosService.configurarInvalidacoesListas`/`invalidarFichas`/`invalidarMembros` |
| `/campanhas/:id` — casca + dado/tempo real compartilhado + as duas visões | `frontend/src/app/modules/campanha/paginas/detalhe/detalhe-shell.page.ts` (`CampanhaDetalheShell`, monta o papel), `campanha-detalhe-dados.service.ts` (`CampanhaDetalheDadosService`, fetch/socket compartilhado), `paginas/detalhe-mestre/` (`CampanhaDetalheMestre`, redesenho — `app-coluna-acoes`, dialogs Membros/Convites, painel fixo Rolagens/Inventário), `paginas/detalhe-jogador/` (`CampanhaDetalheJogador`; lateral em painel segmentado de 3 abas — Rolagens/Esquadrão/Inv. Esquadrão, `ui-33` — o resto reproduz o comportamento antigo) — o `CampanhaDetalhe` monolítico antigo não existe mais |
| Reconciliação por id de um feed de rolagens ao reconectar (P-084 — evita ressuscitar item excluído durante a queda, sem duplicar um chegado por socket durante o próprio GET) | `frontend/src/app/shared/rolagem-feed.util.ts` (`mesclarFeedRolagens`, função pura); consumida por `CampanhaDetalheDadosService.recarregarRolagensFeed` e `EncontroPainelDadosService.recarregarRolagensFeed` — a fonte de "extras" precisa ser uma assinatura escopada ao tempo de vida do próprio GET (nunca o array atual do signal, que pode carregar itens de antes da queda) |
| Visão read-only de Iniciativa (gatilho "Ver Iniciativa" na Prévia de jogador, m8-05) | `IniciativaLeitura` (`frontend/src/app/modules/encontro/componentes/iniciativa-leitura/`) — reusa `CartaoCombatente`/`LogEncontro` sem outputs conectados. Derivação de apresentação (`ordemRodada` → cartões visuais, "de quem é a vez", colunas da grade) em `frontend/src/app/modules/encontro/encontro-leitura.util.ts`, consumida também por `encontro-painel-dados.service.ts` e pelas páginas do mestre/jogador — nunca duplicada. Backend: `EncontroService.recuperarEncontroAtivoParaEspectador`/`recuperarEncontroAtivoParaAlvo`, embutidos em `CampanhaPainelEspectadorDto.encontroAtivo`/`CampanhaPreviaJogadorDto.encontroAtivo` — nenhuma rota REST nova. O Painel do espectador **não usa mais este modal** desde a task abaixo — ganhou tela própria |
| Cena atual do espectador (`/campanhas/:id/espectador/iniciativa`, rota compatível) | `PainelEncontroEspectador` (`frontend/src/app/modules/encontro/paginas/painel-espectador/`), `campanha-projecao.service.ts`; backend `CampanhaProjecaoService` e `CenaService.recuperarCenaAtivaParaEspectador`; iniciativa deriva de `shared/regras/cena`. Resolver em `core/guards/espectador-campanha.guard.ts` |
| Documentos da Investigação do espectador e prévia | `frontend/src/app/modules/cena/componentes/documentos-cena-espectador/`; endpoints `campanha/:id/painel-espectador/cena/:cenaId/documento` em `backend/src/modules/campanha-projecao/`; recorte em `CenaDocumentoService` e `DocumentoService.recuperarDocumentoRevelado`. Evidências em `docs/reviews/espectador-documentos-cena/RELATORIO.md` |
| Real-time onde o mesmo evento carrega recorte diferente por identidade real do socket (ex.: `encontro:alterado`, m7-06) consumido por uma tela que pode estar sendo vista "como outra pessoa" (Painel do espectador em prévia de mestre, Prévia de jogador) | nunca ler o payload do evento direto — usá-lo só como sinal para um refetch REST (que sempre redige pela identidade certa, nunca a de quem está de fato conectado); ver `espectador.page.ts`/`campanha-previa-jogador-dados.service.ts`, assinatura de `tempoRealService.encontroAlterado$` (m8-05) |
| Controle que dispara HTTP/socket **por dentro do próprio componente** (não por `@Output`) | `podeRolar` de `FichaVisualizacao`/`FichaCampanhaCard`/`FichaRolagensPainel` (injeta `FichaRolagemRegistroService` direto) e `InventarioEsquadrao.somenteLeitura` (chama `CampanhaService`/`FichaService` direto) — qualquer tela somente-leitura que os reuse (ex.: Prévia de jogador, m8-04) precisa travar esses dois no valor mais restrito, nunca espelhar a permissão real de quem está sendo visualizado; outputs comuns (`ajusteVitalidade` etc.) bastam ficar desconectados |
| `--piso-flutuante` (piso que `<app-ficha-campanha-card>` reserva no mobile pra própria barra fixa) | precisa ser **definida** (não só consumida) no container de cada página nova que hospeda a ficha compacta — não há cascata global; ver `.detalhe`/`.visualizar` |
| Conteúdo novo dentro de uma aba da coluna Status (`ficha-visualizacao`) mais alto que a coluna Identidade/Atributos | a coluna Status trava a própria altura (`contain: size; overflow: hidden`, acima de `bp.$bp-tablet` — comentário em `ficha-visualizacao.component.scss` `&--status`); conteúdo mais alto que isso **some cortado sem barra de rolagem nenhuma**, não estoura visível. Precisa de teto + `overflow-y: auto` + `appOverflowFade` **próprios** (achado ao vivo na `ui-35`, mesmo padrão de `.ficha-rol__lista`/`.ficha-extras__painel`) |
| **Tokens e tema em runtime** | `frontend/src/styles/tema/` — `_tokens.scss`, `_base.scss`, `_breakpoints.scss`, `_glow.scss` (mixins `simples`/`duplo` do realce por `text-shadow`, ui-22) |
| Rotas raiz | `frontend/src/app/app.routes.ts` · config em `app.config.ts` |

O espelho canônico do tema é `docs/design/tema/`; `frontend/src/styles/tema/` é a cópia viva. Ao
mudar um token, mantenha os dois alinhados.

---

## 3. Mapa da documentação

```
docs/
  SYSTEM.SPEC.md      constituição — precede tudo
  CONVENTIONS.md      convenções de código
  SCHEMA.md           schema SQL + forma do JSONB
  DEPLOY.md           runbook de produção
  PARIDADE-M1.md      checklist operacional do M1
  context/            ← estado do projeto (este diretório)
    CONTEXT.md        o que é verdade agora        (reescrito, teto ~400 linhas)
    HISTORY.md        o que aconteceu e por quê    (acumula, nunca reescrito)
    PROBLEMS.md       o que está quebrado agora    (item sai ao ser resolvido)
    MEMORY.md         onde fica o quê              (este arquivo)
    IDEAS.md          o que ainda não é sistema    (item sai ao virar spec)
  core/               regras do jogo (fonte da verdade)
  design/             identidade visual (fonte da verdade)
    DESIGN.md · tema/ · examples/
  specs/
    backlog/          tasks a implementar
    active/           task em andamento
    done/             tasks concluídas (histórico — não reescrever)
  superpowers/        specs e planos de brainstorming
```

O contrato funcional do caderno está em
`docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`; o plano executado está em
`docs/superpowers/plans/2026-08-14-cadernos-campanha-busca.md`.

---

## 4. Comandos

A lista completa está no [`CLAUDE.md`](../../CLAUDE.md) ("Development Commands") e no
[`README.md`](../../README.md). Os que mais importam:

| Fazer | Comando |
|---|---|
| Subir o banco | `npm run db:up` |
| Rodar migration | `npm run db:migrate --workspace=backend` |
| Apagar e recriar o banco local com fixtures | `npm run db:reset:dev` |
| Reconciliar apenas as fixtures locais | `npm run db:seed:dev` |
| API (`:3100`) | `npm run backend:dev` |
| Gerar contrato OpenAPI após mudar DTO/endpoint público | `npm run openapi:gerar-contratos --workspace=backend` |
| SPA (`:4300`) | `npm run frontend:dev` |
| **Testar o motor de regras** — antes de tocar em qualquer fórmula | `npm run test --workspace=shared` |

Para levantar o stack real e **dirigir a aplicação de verdade** (inclusive tempo real com dois
usuários), use a skill `verify` do projeto.

---

## 5. Fluxo de uma task

Definido no [`CLAUDE.md`](../../CLAUDE.md) ("Fluxo orientado por especificação" e "Gate
obrigatório de qualidade e conclusão") — a ordem de execução e os formatos copiáveis de
`docs/context/` estão reunidos na skill `task-flow`; use-a para abrir, implementar e fechar
qualquer task, em vez de reler o `CLAUDE.md` inteiro toda vez. Em uma linha: mover a spec de
`backlog/` para `active/` (spec nova: partir de `docs/specs/TEMPLATE.spec.md`) → implementar
**exatamente** o que a spec define, sem extrapolar → mover a spec para `done/` → registrar em
`docs/context/` (relato em `HISTORY.md`, estado em `CONTEXT.md`).
