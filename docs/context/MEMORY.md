# MEMORY.md — Mapa do Sistema

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
| Leitor global e publicação dos PDFs de regras | [`docs/specs/done/m3-72-leitor-global-documentos-regras.spec.md`](../specs/done/m3-72-leitor-global-documentos-regras.spec.md) + `frontend/src/app/shared/leitor-documentos/` | alterar acesso, viewer ou publicação dos documentos |
| **Identidade visual** — guia e mapa de tokens | [`docs/design/DESIGN.md`](../design/DESIGN.md) | **qualquer** trabalho de frontend/UI/estilo |
| Gate visual e qualidade acima de velocidade | [`AGENTS.md`](../../AGENTS.md) “Gate obrigatório de qualidade e conclusão” + [`SYSTEM.SPEC.md`](../SYSTEM.SPEC.md) §8/§16.31 | planejar, implementar ou concluir **qualquer** UI/estilo |
| Tokens CSS (fonte da verdade em runtime) | [`docs/design/tema/_tokens.scss`](../design/tema/_tokens.scss) | escolher cor, fonte, raio ou espaçamento |
| Padrões BEM canônicos de componente | [`docs/design/tema/_componentes.scss`](../design/tema/_componentes.scss) | criar um card, stat, stepper, chip… |
| Protótipos aprovados (fidelidade 1:1) | [`docs/design/examples/`](../design/examples/) | montar uma tela nova |
| Schema SQL + forma dos documentos JSONB | [`docs/SCHEMA.md`](../SCHEMA.md) | escrever migration ou mexer em `ficha.dados` |
| Nomenclatura de DTO | skill `dto-conventions` + `SYSTEM.SPEC.md` | nomear qualquer classe de entrada/saída |
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
| Módulos de domínio | `backend/src/modules/` — `autenticacao/`, `campanha/`, `ficha/`, `pagina-caderno/`, `rolagem/`, `usuario/` |
| Cadernos privados e busca textual da campanha | `backend/src/modules/pagina-caderno/` + `backend/src/database/migrations/0018 - Caderno de campanha e busca textual.sql` |
| `BaseEntity`, `BaseRepository` | `backend/src/core/base/` |
| `@Public()`, `@ActiveUser()` | `backend/src/core/decorators/` |
| Exceções de negócio | `backend/src/core/exceptions/` — `BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException` |
| Filtro global + interceptor de resposta | `backend/src/core/filters/`, `backend/src/core/interceptors/` |
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
| Módulos de tela | `frontend/src/app/modules/` — `autenticacao/`, `calculadora/`, `campanha/`, `ficha/`, `pagina-caderno/`, `usuario/` |
| Janela, estado, Markdown seguro e transporte do caderno | `frontend/src/app/modules/pagina-caderno/` |
| Componentes da ficha | `frontend/src/app/modules/ficha/componentes/` — `ficha-visualizacao/`, `ficha-inventario/`, `ficha-habilidades/`, `ficha-sanidade/`, `ficha-rolagens/`, `ficha-rolagens-painel/`, `ficha-combos/`, `ficha-habilidade-seletor/`, `guia-equipamento-loja/`, `guia-formula/` |
| Ficha flutuante da Iniciativa e atalho mobile **Minha ficha** | `frontend/src/app/modules/encontro/componentes/ficha-flutuante/` e `frontend/src/app/modules/encontro/paginas/painel/`; no mobile, `ficha-flutuante__corpo` é a rolagem vertical única e passa `rolagemExterna` à ficha de jogador |
| Composables de página da ficha (uma instância por página, `providers: []`) | `frontend/src/app/modules/ficha/` — `ficha-edicao.service.ts` (handlers `ajustar*`), `ficha-rolagem-registro.service.ts` (flag "Rolagem oculta" + registro do histórico) |
| Componentes reutilizáveis | `frontend/src/app/shared/` — `layout/`, `icone/`, `bandeja-dados/`, `historico-rolagens-sidebar/`, `calculadora-flutuante/`, `tempo-real/`, `tooltip/`, `overflow-fade/`, `hold-repeat/`, `marca/`, `receber-dano/` (dialog "Receber dano", m7-17)… |
| "Receber dano" — regra de resistência × dano por tipo (assimetria da camada Geral) | `shared/src/regras/encontro/receber-dano.ts` (`calcularDanoRecebido`) — consumida só por `frontend/src/app/shared/receber-dano/` |
| Resistência a dano por tipo do cartão da Iniciativa (`EncontroCombatenteResumoDto.resistencias`) | calculada em `backend/src/modules/encontro/encontro-combatente.mapper.ts` (`resolverResistencias` — `montarResistencias` pro agente, `somarResistenciasCriaturaPorTipo` pra criatura, `shared/src/regras/criatura/resistencia.ts`), zerada em `encontro-revelacao.ts` junto das demais defesas |
| Expressão de dados customizada de Iniciativa por combatente/encontro (m7-19, `iniciativaFormulaCustom`) | coluna `encontro_combatente.iniciativa_formula_custom` (migration 0025); `EncontroService.alterarFormulaIniciativa` (mestre-only, valida com `validarFormula` de `shared/regras/rolagem`); consumida em `rolarTudo()`/`rolarMinhaIniciativa()` (`painel-encontro.page.ts`, helper `concluirRolagemDeIniciativa`), com prioridade total sobre a fórmula padrão |
| Services, guards, interceptors | `frontend/src/app/core/` |
| **Tokens e tema em runtime** | `frontend/src/styles/tema/` — `_tokens.scss`, `_base.scss`, `_breakpoints.scss`, `contencao.preset.ts` |
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
| SPA (`:4300`) | `npm run frontend:dev` |
| **Testar o motor de regras** — antes de tocar em qualquer fórmula | `npm run test --workspace=shared` |

Para levantar o stack real e **dirigir a aplicação de verdade** (inclusive tempo real com dois
usuários), use a skill `verify` do projeto.

---

## 5. Fluxo de uma task

Definido no [`CLAUDE.md`](../../CLAUDE.md) ("Task Workflow"). Em uma linha: mover a spec de
`backlog/` para `active/` → implementar **exatamente** o que a spec define, sem extrapolar → mover a
spec para `done/` → registrar em `docs/context/` (relato em `HISTORY.md`, estado em `CONTEXT.md`).
