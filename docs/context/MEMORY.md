# MEMORY.md — Mapa do Sistema

Mapa de consumidores REST/WS de ficha oculta, achados e retomada:
[auditoria](../specs/done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md),
[spec investigativa arquivada em done](../specs/done/auditoria-ficha-oculta-todos-consumidores.spec.md).

> **O que este arquivo é:** um índice de **localização**. Ele responde *"onde fica X?"* e
> *"o que eu preciso ler antes de mexer em Y?"*.
>
> **O que este arquivo NÃO é:** ele **nunca copia a regra em si**. Se a regra aparecer aqui e na
> fonte, as duas divergem no primeiro dia em que uma mudar — e a cópia errada é pior que nenhuma.
> Aqui só entram ponteiros. Para *o que é verdade agora*, veja [`CONTEXT.md`](CONTEXT.md).

---

## 1. Onde estão as regras

Preparação do editor próprio dos livros: [levantamento da segunda revisão visual](../specs/done/regras-segunda-revisao-visual/editor-proprio.md);
contrato vigente na [M10](../specs/done/m10-regras.spec.md).

Estas são as fontes da verdade. Em conflito entre código e documento, **o documento vence**.

| Assunto | Fonte | Ler antes de |
|---|---|---|
| Ícones de identidade (M10-03) | `frontend/src/app/shared/icone/` (`IconeNome`/SVGs/testes); família em `docs/design/DESIGN.md`, decisões em `docs/specs/done/m10-regras/m10-regras-exemplao.html` (`ICO`, `dec`); [verificação](../specs/done/m10-03-icones-identidade/m10-03-verificacao.md) | consumir as classes, arquétipos, subclasses, Civil e NPC no leitor de Regras |
| Normalizador e formato canônico das Regras (M10-01/02) | `frontend/scripts/normalizar-regras.mjs` e `regras-{personagens,equipamentos,guia,termos}.mjs`; `frontend/src/app/modules/regras/regras.model.ts`; fixtures em `scripts/fixtures/regras/` e `regras-explicitos/`, testes nos respectivos `.test.mjs`; [núcleo](../specs/done/m10-01-normalizador-nucleo/m10-01-verificacao.md), [casos explícitos](../specs/done/m10-02-normalizador-casos-explicitos/m10-02-verificacao.md) | alterar o parser ou consumir os assets `public/regras/` no leitor |
| Constituição do projeto — precede tudo | [`docs/SYSTEM.SPEC.md`](../SYSTEM.SPEC.md) | qualquer implementação |
| Convenções de código (referência rápida) | [`docs/CONVENTIONS.md`](../CONVENTIONS.md) | escrever qualquer arquivo |
| **Regras do jogo — jogador** | [`docs/core/sistema-v4.1.4.md`](../core/sistema-v4.1.4.md) | tocar em **qualquer** fórmula, tabela de progressão ou regra de domínio |
| **Regras do jogo — ameaças/criaturas** | [`docs/core/guia_de_mestre-v4.2.0.md`](../core/guia_de_mestre-v4.2.0.md) | criar ou alterar criatura/NPC (M4) |
| **Criatura — distribuição inicial e DT (P-101)** | `shared/src/dtos/ficha/ficha-criatura-calculo.dtos.ts`; `shared/src/regras/criatura/atributos.ts`/`modificadores.ts`; [`verificação integrada`](../specs/done/p-101-criaturas-guia-v4.2.0/p-101-verificacao.md) | consultar distribuição/validação de criação e DT contextual; localizar matriz de consumidores, provas REST/visuais e propostas editoriais |
| **Ponteiros dos livros correntes (P-102)** | [`verificação documental`](../specs/done/p-102-referencias-documentos-vigentes/p-102-verificacao.md); [`inventário de referências`](../../.artifacts/p-102/referencias.json) | conferir correspondência das fontes, exceções históricas e integridade da publicação do JSON das Regras |
| Página pública de Regras (M10-06) | `frontend/src/app/modules/regras/`: `regras.routes.ts`, `regras.service.ts`, `regras.page.*`, `regras-sumario.ts`, `regras-navegacao.ts` e `blocos/`; [verificação](../specs/done/m10-06-pagina-regras/m10-06-verificacao.md); contrato visual em `docs/design/DESIGN.md` | alterar leitura dos livros, cache, sumário/âncoras, blocos básicos ou entrada Regras da topbar |
| Blocos ricos (M10-07) | `frontend/src/app/modules/regras/blocos/regras-{classe,arquetipos,origens,equipamentos,modificacoes,modulos,roteiro,identidade,atributos,ficha-criatura,niveis-ameaca}.*`; [verificação](../specs/done/m10-07-blocos-ricos/m10-07-verificacao.md) | alterar apresentação tipada e integração dos dossiês, equipamentos e Guia |
| Trio Vida/Energia/Defesa | `frontend/src/app/shared/icone/`; `docs/design/DESIGN.md`; [spec ativa](../specs/active/icones-recursos-sistema.spec.md) e [entrega 1](../specs/active/icones-recursos-sistema/entrega-1-verificacao.md) | consumir o trio preenchido ou continuar adoção ampla/levantamento |
| Painel e leitor compartilhado (M10-08) | `frontend/src/app/modules/regras/regras-leitor.component.*`, `regras-leitor-contexto.ts`, `regras-flutuante.component.*`, `regras-consulta.service.ts`, `regras-leitura.store.ts`; entrada global em `shared/layout/` e ficha flutuante; [verificação](../specs/done/m10-08-painel-flutuante-e-celular/m10-08-verificacao.md) | alterar painel/gaveta mobile, rolagem local, IDs de leitores simultâneos ou memória por livro |
| Pesquisa das Regras (M10-09) | `frontend/src/app/modules/regras/regras-pesquisa.ts` (função pura), `regras-pesquisa-dom.ts` (projeção/marcas), `regras-pesquisa.controller.ts`, `regras-pesquisa.component.*`, `regras-pesquisa-projecao.component.ts` (outro livro isolado); memória em `regras-leitura.store.ts`; [verificação](../specs/done/m10-09-pesquisa-regras/m10-09-verificacao.md) | alterar normalização, trechos, tarjas, navegação de ocorrências ou contagem do outro livro |
| Exportação nativa das Regras (M10-10) | `frontend/src/app/modules/regras/regras-impressao.component.*`, `regras-impressao.service.ts`; tokens `--papel-*` em `docs/design/tema/_tokens.scss`; [verificação](../specs/done/m10-10-exportar-pdf/verificacao.md) | alterar PDF, capa, sumário, paginação, papel ou ciclo de impressão |
| Fontes e publicação das Regras (M10-11) | `docs/core/*.md`; `frontend/scripts/normalizar-regras.mjs`, `verificar-regras-publicadas.mjs`; `frontend/public/regras/{sistema,guia}.json`; [verificação](../specs/done/m10-11-remocao-pdf-antigo/verificacao.md) | conferir versão e fidelidade dos livros publicados à fonte canônica |
| Descrições canônicas das condições e tooltips | `frontend/scripts/regras-condicoes.mjs` → `frontend/src/app/shared/condicoes/condicoes.dados.ts`, gerado no preparo das Regras; `condicoes.ts` consulta/separa termos; `modules/ficha/condicoes-ficha.ts` fornece descritores; [cobertura e gates abertos](../specs/active/usabilidade-classes-condicoes-2026-10-09/verificacao.md) | explicar uma condição sem manter uma segunda descrição manual ou reinterpretar sua regra |
| **Identidade visual** — guia e mapa de tokens | [`docs/design/DESIGN.md`](../design/DESIGN.md) | **qualquer** trabalho de frontend/UI/estilo |
| **NPC — contrato visual na M4** | [`docs/design/FICHA-NPC.md`](../design/FICHA-NPC.md); `m4-08`/`m4-08b` em `docs/specs/done/`; `docs/specs/done/m4-08b-frontend-visualizacao-npc/m4-08b-verificacao.md`; `m4-09` em `done/`, `docs/specs/done/m4-09-frontend-listagem-revelacao-mestre/m4-09-verificacao.md`; `m4-10` em `done/`, `docs/specs/done/m4-10-refinamento-mobile-criatura-npc/m4-10-verificacao.md` | manter criação e ficha de consulta/edição, listagem/revelação e responsividade; regras/JSONB continuam no guia de mestre e `SCHEMA.md` |
| **Ficha — estado de acesso por seleção (m4-09)** | `frontend/src/app/modules/ficha/ficha-acesso-estado.service.ts` e `.spec.ts`; `docs/specs/done/m4-09-frontend-listagem-revelacao-mestre.spec.md` | integrar o diálogo de concessão/revogação por ficha com o cliente HTTP existente; consumidor em `modules/campanha/componentes/campanha-fichas-especiais/`; gates no relatório M4-09 |
| **NPC — contrato e motor shared (m4-05/m4-06)** | `shared/src/dtos/ficha/ficha-npc.dtos.ts` + `ficha-npc-calculo.dtos.ts`; enums `categoria-npc`/`habilidade-tipo-npc`; `shared/src/regras/npc/` (`@contratados-rpg/shared/regras/npc`) | integrar criação/validação de NPC; tabelas e fórmulas canônicas em "Guia de Criação de NPCs" do guia de mestre; casos completos em `biblioteca-referencia.spec.ts` |
| **NPC — Competências e testes privados (M4-19)** | `shared/src/regras/npc/testes.ts`/`testes.spec.ts`; `frontend/src/app/modules/ficha/npc-rolagem.service.ts`, `componentes/npc-visualizacao/npc-competencias.component.*`; `backend/src/modules/rolagem/rolagem.service.ts`; [verificação](../specs/done/m4-19-npc-testes-de-atributo-regra-e-rolagem/m4-19-verificacao.md) | localizar composição/validação/execução, configuração e permissões; SCHEMA define persistência, Guia de Mestre define regra |
| **NPC — operações, validação REST e integração de combate (m4-07)** | `shared/src/dtos/ficha/ficha-npc-operacao.dtos.ts`, `ficha-npc-condicao.dtos.ts`; `backend/src/modules/ficha/ficha-npc-validacao.util.ts`, `FichaService`, `FichaController`, `FichaRepository`; `shared/src/regras/npc/condicoes.ts` e `backend/src/modules/encontro/encontro-combatente.mapper.ts` | consumir criação/leitura/edição e vitalidade; representação de Morrendo em `SCHEMA.md`; evidência REST/Socket.IO em `HISTORY.md` |
| **NPC — assistente de criação (m4-08)** | `frontend/src/app/modules/ficha/paginas/criar-npc/`, `npc.routes.ts`, `npc-criacao.guard.ts`; `shared/src/regras/npc/criacao.ts`/`referencia.ts` e `ficha-npc-referencia.dtos.ts` | manter as cinco etapas, orçamento inicial e referências do guia; gates e comparação com jogador/criatura registrados em `HISTORY.md` |
| **NPC — ficha de consulta e edição (m4-08b, m4-16, m4-18)** | `frontend/src/app/modules/ficha/paginas/visualizar-npc/`, `componentes/npc-visualizacao/`, `ficha-edicao-npc.service.ts`, `npc-edicao-formulario.service.ts`, `npc-visualizacao.guard.ts`, `npc-acervo.ts`; `modules/campanha/componentes/campanha-fichas-especiais/`; `docs/specs/done/m4-08b-frontend-visualizacao-npc/m4-08b-verificacao.md` | edição por valor avulso ou bloco, um de cada vez (`m4-16`; ações em `npc-bloco-acoes.component.*`); cartão Identidade em `npc-identidade.component.*` (`m4-17`: foto 175, `app-stat` fino, Cooperação em `app-barra-escala`); cartão Atributos em `npc-atributos.component.*` (`m4-18`: mesmo `app-atributo-ficha` do Jogador; `m4-21`: Competência no ladrilho); Biblioteca de Referência do Guia em `shared/regras/npc/biblioteca.ts` (`m4-21`); troca de Categoria em `aplicarCategoriaNpc`/`iniciarTrocaCategoria` (`npc-edicao-formulario.service.ts`); manter snapshots, leitura concedida e eventos/refetch; transportar Categoria pelo `FichaResumoDto` sem nova coluna/migration |
| Gate visual e qualidade acima de velocidade | [`AGENTS.md`](../../AGENTS.md) “Gate obrigatório de qualidade e conclusão” + [`SYSTEM.SPEC.md`](../SYSTEM.SPEC.md) §8/§16.31 — execução dos seis passos e o checklist acionável na skill `design-fidelity` | planejar, implementar ou concluir **qualquer** UI/estilo |
| Tokens CSS (fonte da verdade em runtime) | [`docs/design/tema/_tokens.scss`](../design/tema/_tokens.scss) | escolher cor, fonte, raio ou espaçamento |
| Primitivos de UI (código, não cópia) | [`frontend/src/app/shared/ui/`](../../frontend/src/app/shared/ui/) — `app-botao`/`app-campo` (`ui-01`; `[icone]` dentro do controle desde a `m9-05`), `app-modal`/`Notificacao` sobre `<dialog>` nativo (`ui-02`), `app-atributo-ficha` (`m4-18`, `shared/ui/atributo-ficha/` — ladrilho do Jogador/NPC, cinco linhas opcionais e controles projetados; sem cálculo de domínio), `app-cartao`/`app-stat`/`app-chip`/`app-abas`+`app-aba`+`AbaPainel`/`app-step-input` (`ui-03`, `stepper/` promovido de `modules/simulacao`), `app-estado-vazio`/`app-esqueleto` (`ui-14`, estados de lista vazio/carregando), `app-barra-recurso` (`ui-16`, recurso com máximo — Vida/Energia; absorve o HUD da ficha, o bloco de vitalidade e o cartão de combatente), `app-barra-escala` (`m4-17`, `shared/ui/barra-escala/` — posição numa escala fechada com faixas, degradê de tokens e marcador em losango; editável como slider nativo que confirma uma vez ao soltar/Enter; primeiro consumidor: Cooperação do NPC), `app-painel-flutuante` (`ui-17`, `shared/ui/painel-flutuante/` — arraste, posição persistida, empilhamento de z-index, minimizar e fechar de uma janela flutuante não modal; `CalculadoraFlutuante`/`CadernoFlutuante`/`LeitorDocumentos`/`FichaFlutuante` delegam a ele e só cuidam do próprio conteúdo, redimensionar e maximizar), `app-valor-editavel` (`P-057`, `shared/ui/valor-editavel/` — "valor da ficha que vira `<input>`/`<select>`/`<textarea>` ao clicar"; não genereciza o tipo do campo, só a máquina de estado exibição↔edição e a identidade visual via `app-botao[estilo="texto"]` interno), `app-coluna-acoes`+`app-coluna-acoes-item` (`campanha-detalhe-mestre-coluna-acoes`, `shared/ui/coluna-acoes/` — coluna lateral expansível/retrátil que participa do fluxo do layout, nunca sobrepõe; estado persistido por `[id]`; vira barra inferior no mobile; só a visão de mestre da campanha usa por ora), `app-editor-markdown` (`editor-markdown-campos-texto-livre`, `shared/ui/editor-markdown/` — Milkdown atrás do token `EDITOR_MARKDOWN_FACTORY`, promovido de `modules/pagina-caderno/`; `[valor]`/`(valorChange)` direto **ou** `ControlValueAccessor`/`formControlName`, `[somenteLeitura]`, `[compacto]` para campo de formulário curto, `[rotulo]` para o nome acessível; `[documentoColaborativo]`/`[awareness]` só fazem sentido no Caderno) | pôr um botão, campo, modal, notificação, cartão, caixa de estatística, selo, barra de abas, stepper, estado vazio, esqueleto de carregamento, barra de recurso com máximo, escala/slider com faixas, janela flutuante arrastável, valor clicável que vira campo de edição, coluna de ações lateral na tela, ou edição/leitura de texto em Markdown fora do Caderno |
| Padrões BEM canônicos ainda sem primitivo | [`docs/design/tema/_componentes.scss`](../design/tema/_componentes.scss) — **catálogo para copiar**, fora do build; o bloco já promovido está marcado "→ PRIMITIVO" e não se copia mais. Migração em `ui-03`/`ui-04` ([`ui-biblioteca-componentes.spec.md`](../specs/backlog/ui-biblioteca-componentes.spec.md), `PROBLEMS.md` `P-034`) | criar um card, stat, stepper, chip… |
| Protótipos aprovados (fidelidade 1:1) | [`docs/design/examples/`](../design/examples/) | montar uma tela nova |
| Marcas e cores de ameaça (M10-04) | [`MARCAS.md`](../design/MARCAS.md); `frontend/public/marcas/` (SVGs/licença); `frontend/src/app/shared/icone/`; tokens em `docs/design/tema/_tokens.scss`; [verificação](../specs/done/m10-04-svg-scp-definitivo/m10-04-verificacao.md) | consumir SCP oficial em Criatura, marca própria em Regras/níveis e crédito no rodapé |
| Propostas e corpus de tarefa | [`docs/specs/README.md`](../specs/README.md); anexos de `m7-27` e `m10-04` em `done/`, `montador-rolagem-experimento` em `active/` e `m10-regras` em `done/` | localizar propostas junto da spec proprietária, sem outro ciclo documental |
| Schema SQL + forma dos documentos JSONB | [`docs/SCHEMA.md`](../SCHEMA.md) | escrever migration ou mexer em `ficha.dados` |
| Nomenclatura de DTO | skill `dto-conventions` + `SYSTEM.SPEC.md` | nomear qualquer classe de entrada/saída |
| Skills de agente — onde vivem e o contrato que cumprem | [`CLAUDE.md`](../../CLAUDE.md) "Sincronização com CLAUDE.md"/"Contrato comum a toda skill do projeto" — skills ficam em `.claude/skills/<nome>/SKILL.md`, cópia idêntica em `.agents/skills/<nome>/SKILL.md` | criar, corrigir ou revisar qualquer skill; escolher qual skill ler antes de um tipo de trabalho (hoje: `dto-conventions` antes de nomear DTO, `verify` antes de declarar uma UI pronta, `task-flow` antes de abrir/implementar/fechar qualquer task, `sql-migrations` antes de tocar schema/migration/SQL de repositório, `design-fidelity` antes de criar/ajustar qualquer UI — contra o que comparar, não como rodar o app, `regras-do-jogo` antes de tocar fórmula e `tempo-real` antes de alterar/diagnosticar WebSocket, salas ou consumidores sincronizados) |
| Orquestração multiagente (delegar a subagente Claude, Codex ou, do Codex, ao Claude) | [`CLAUDE.md`](../../CLAUDE.md) "Orquestração multiagente" + skill `orquestracao` (`references/configuracao.md`: modelos, liga/desliga, remoção); subagentes em `.claude/agents/`; wrappers em `scripts/agentes/`; registro local em `.agentes/` (ignorado); mod opcional de painel em `.claude/mods/painel-orquestracao/` | decidir se delega, chamar o Codex/Claude de forma não interativa, trocar modelo, desligar ou remover a integração |
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
| Montador de rolagem em experimento (só TESTER/ADMIN; I-041) | `frontend/src/app/shared/montador-rolagem-experimental/` — gate único `montador-acesso.ts` (`podeUsarMontador`; liberar = trocar o corpo), versões e preferência (`montador-versao*.ts`, `localStorage` `contratados-rpg.montador-rolagem.versao`), seletor, casca (`montador-rolagem-experimental.component`), modelo (`montador-modelo.ts`), Completo/Essencial (`montador-pecas.ts` + `montador-editor-pecas.component`), Blocos (`montador-blocos.ts` + `montador-editor-blocos.component`), leitura/faixa/média (`montador-leitura.ts`); consumidor único: `rolagem-rapida.component`. Apagar as versões perdedoras = apagar arquivos desta pasta |
| Fórmula de rolagem em peças (montador-exp-01; o que o montador edita) | `shared/src/regras/rolagem/rolagem.pecas.ts` (`tokenizarFormula`/`montarFormula`, autoverificação contra `interpretarFormula`); DTOs `PecaFormulaDto`/`FormulaTokenizadaDto` em `rolagem.dtos.ts`; leitura comum com o motor em `rolagem.leitura.ts` (interno); corpus em `rolagem.pecas.spec.ts` |
| Conta aritmética das fórmulas de rolagem (quantidade de dados e bônus fixo; I-041) | `shared/src/regras/rolagem/rolagem.conta.ts` (`analisarConta`/`avaliarConta`, frações exatas, piso no fim); a gramática e o crítico por parcela em `rolagem.ts` (`interpretarSegmento`, `rolarTermo`, `rolarInterpretada`); regressão em `rolagem.conta.spec.ts` + `rolagem/fixtures/rolagem-corpus.snapshot.json` (gerado com o motor anterior); regra de uso no `guia-formula` do frontend |
| DTOs (contratos entre camadas) | `shared/src/dtos/` |
| Contratos, fontes e limites de cadernos/busca | `shared/src/dtos/pagina-caderno/`, `shared/src/enums/busca-campanha-*.enum.ts`, `shared/src/validators/pagina-caderno.validators.ts` |
| Enums (string, valor = nome, SCREAMING_SNAKE_CASE) | `shared/src/enums/` |
| `StandardResponse`, `PaginatedResult` | `shared/src/interfaces/` |
| Validadores (constantes puras) | `shared/src/validators/` |
| Versão do sistema (`VERSAO_SISTEMA`) e contrato/limites dos patchnotes | `shared/src/versao.ts` (**gerado** por `scripts/sincronizar-versao.mjs` — não edite), `shared/src/dtos/patchnote/`, `shared/src/validators/patchnote.validators.ts` |

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
| **Armazenamento de blob** (avatar da ficha, local/R2) | `backend/src/core/armazenamento/` — `ArmazenamentoProvedor`, `ArmazenamentoLocalProvedor`/`ArmazenamentoR2Provedor`, toggle via `ConfigService.obterConfiguracaoArmazenamento()`; `tools/armazenamento/faxinar-imagens.ts` (faxina de órfãs); formatos de imagem em `shared/src/validators/imagem.validators.ts` |
| Patchnotes públicos (`GET /patchnote[/:versao]`, cache 24 h) e o formato do arquivo `.md`/`indice.json` | `backend/src/modules/patchnote/` (`patchnote-formato.util.ts` é compartilhado com o script); leitura/gravação de texto em `ArmazenamentoProvedor.lerTexto`/`salvarTexto` |
| Publicar patchnotes no armazenamento (R2/local) | `backend/tools/patchnotes/publicar.ts` — `npm run patchnotes:publicar`; fluxo completo na skill `publicar-versao` |
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
| Recorte de revelação do encontro (números, carteirinha, agente oculto de terceiro removido com ordem/turno reposicionados) | `backend/src/modules/encontro/encontro-revelacao.ts` (`ocultarNaoRevelados`), aplicado por `EncontroService.montarEstadoParaUsuario`/`recuperarEncontroAbertoRedigido` em GET, socket por usuário e prévias; contagem da listagem em `EncontroRepository.listarPorCampanha` |
| Resistência a dano por tipo do cartão da Iniciativa (`EncontroCombatenteResumoDto.resistencias`) | calculada em `backend/src/modules/encontro/encontro-combatente.mapper.ts` (`resolverResistencias` — `montarResistencias` pro agente, `somarResistenciasCriaturaPorTipo` pra criatura, `shared/src/regras/criatura/resistencia.ts`), zerada em `encontro-revelacao.ts` junto das demais defesas |
| Premissa de leitura da Biblioteca após M10-11 | [atualização da M9](../specs/done/m9-documentos-campanha/atualizacao-m10-11.md); `IDEAS.md` I-058 | reconsiderar suporte a outro formato sem depender do leitor removido |
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
| Leitura e seleção de documentos na Investigação | `frontend/src/app/modules/cena/cena-documento-leitura.service.ts`; foco e listagem em `EncontroPainelDadosService`; limpeza transacional em `backend/src/modules/cena/cena-documento.service.ts` e `cena-documento.repository.ts`; evidências em `docs/specs/done/fix-documentos-investigacao-selecao-e-leitura/VERIFICACAO.md` |
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
| Documentos da Investigação do espectador e prévia | `frontend/src/app/modules/cena/componentes/documentos-cena-espectador/`; endpoints `campanha/:id/painel-espectador/cena/:cenaId/documento` em `backend/src/modules/campanha-projecao/`; recorte em `CenaDocumentoService` e `DocumentoService.recuperarDocumentoRevelado`. Evidências em `docs/specs/done/espectador-documentos-cena/RELATORIO.md` |
| Real-time onde o mesmo evento carrega recorte diferente por identidade real do socket (ex.: `encontro:alterado`, m7-06) consumido por uma tela que pode estar sendo vista "como outra pessoa" (Painel do espectador em prévia de mestre, Prévia de jogador) | nunca ler o payload do evento direto — usá-lo só como sinal para um refetch REST (que sempre redige pela identidade certa, nunca a de quem está de fato conectado); ver `espectador.page.ts`/`campanha-previa-jogador-dados.service.ts`, assinatura de `tempoRealService.encontroAlterado$` (m8-05) |
| Controle que dispara HTTP/socket **por dentro do próprio componente** (não por `@Output`) | `podeRolar` de `FichaVisualizacao`/`FichaCampanhaCard`/`FichaRolagensPainel` (injeta `FichaRolagemRegistroService` direto) e `InventarioEsquadrao.somenteLeitura` (chama `CampanhaService`/`FichaService` direto) — qualquer tela somente-leitura que os reuse (ex.: Prévia de jogador, m8-04) precisa travar esses dois no valor mais restrito, nunca espelhar a permissão real de quem está sendo visualizado; outputs comuns (`ajusteVitalidade` etc.) bastam ficar desconectados |
| `--piso-flutuante` (piso que `<app-ficha-campanha-card>` reserva no mobile pra própria barra fixa) | precisa ser **definida** (não só consumida) no container de cada página nova que hospeda a ficha compacta — não há cascata global; ver `.detalhe`/`.visualizar` |
| Conteúdo novo dentro de uma aba da coluna Status (`ficha-visualizacao`) mais alto que a coluna Identidade/Atributos | a coluna Status trava a própria altura (`contain: size; overflow: hidden`, acima de `bp.$bp-tablet` — comentário em `ficha-visualizacao.component.scss` `&--status`); conteúdo mais alto que isso **some cortado sem barra de rolagem nenhuma**, não estoura visível. Precisa de teto + `overflow-y: auto` + `appOverflowFade` **próprios** (achado ao vivo na `ui-35`, mesmo padrão de `.ficha-rol__lista`/`.ficha-extras__painel`) |
| **Tokens e tema em runtime** | `frontend/src/styles/tema/` — `_tokens.scss`, `_base.scss`, `_breakpoints.scss`, `_glow.scss` (mixins `simples`/`duplo` do realce por `text-shadow`, ui-22) |
| Rotas raiz | `frontend/src/app/app.routes.ts` · config em `app.config.ts` |
| Página pública de patchnotes (`/patchnotes[/:versao]`) | `frontend/src/app/modules/patchnotes/` — `matcher` único em `patchnotes.routes.ts` |
| Versão exibida e ponto de "versão nova" | `frontend/src/app/core/services/versao.service.ts`; chip e item do menu em `frontend/src/app/shared/layout/` |
| Documento de contenção (Acesso negado, 404/503 dos patchnotes) | `frontend/src/app/shared/documento-contencao/` — `ViewEncapsulation.None`, classes `contencao__*` |
| Rota nova da API no dev-server (proxy) | `frontend/proxy.conf.json` — rota de app **plural** exige regex de fronteira (`^/patchnote(?:$|[/?])`) |

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
    <estado>/<tarefa>/ planos, designs pontuais, propostas e relatórios da spec dona
```

O contrato funcional do caderno está em
`docs/specs/done/registro-cadernos-privados-e-busca/2026-08-12-cadernos-campanha-busca-design.md`; o plano executado está em
`docs/specs/done/registro-cadernos-privados-e-busca/2026-08-14-cadernos-campanha-busca.md`.

---

## 4. Comandos

Organização e artefatos: `docs/SYSTEM.SPEC.md` §3.1;
`docs/specs/README.md`; skill `task-flow`; `scripts/verificar-organizacao.mjs`
(`npm run repo:verificar`, modo `--staged` para o índice); saídas locais em `.artifacts/`.

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
| Alinhar a versão do sistema após mudar o `version` da raiz | `npm run versao:sincronizar` |
| Publicar uma versão (número, nota, tag, R2) | skill `publicar-versao`; comando `npm run patchnotes:publicar -- [--dry-run] <arquivo.md>` |
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
