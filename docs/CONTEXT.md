# CONTEXT.md — Estado Atual do Projeto

> Atualizado após cada sessão de implementação. Última atualização: 2026-07-05 (m1-07 — página do agente).

---

## Estado Geral

**Fase:** M0 concluído (implementação em repositório). O esqueleto do monorepo npm workspaces está de pé
(`shared/`, `backend/`, `frontend/`) com os pacotes se importando corretamente. A
infraestrutura de banco local está pronta: PostgreSQL 16 via Docker Compose e Knex
configurado com migrations. O `core/` do backend está implementado (`ConfigService`,
`BaseEntity`, `BaseRepository`, exceções, filtro global e interceptor de resposta), com o
Nest app subindo de ponta a ponta sem erros. A API já expõe seu primeiro endpoint real,
`GET /health` (público, `StandardResponse`), validando o `core/` de ponta a ponta. O
frontend agora tem shell mínimo de pé: topbar + `router-outlet`, interceptors `loading` e
`error-handler`, proxy de dev para o backend e uma home que consome `GET /health` — a
integração HTTP frontend → backend → `StandardResponse` está provada de ponta a ponta. O
shell já usa o tema "Terminal de Contenção" (dark-first) a partir do handoff em
`docs/design/` — tokens, base e preset PrimeNG `ContencaoPreset` ligados. A integração
contínua está ativa: um workflow do GitHub Actions (`.github/workflows/ci.yml`) roda lint +
testes nos três workspaces em todo Pull Request — lint configurado nos três (backend já
tinha; shared e frontend ganharam eslint agora), testes via `--if-present` (só o frontend
tem testes antes do M1). O deploy fecha o M0 por **integração nativa das plataformas** (sem GitHub Actions no deploy):
no push para `master`, o Render (backend) e a Cloudflare Pages (frontend) puxam do Git e
reimplantam sozinhos, com banco de produção no Supabase. A ligação frontend→backend em produção
é cross-origin: o backend habilita CORS a partir de `APP_FRONTEND_ORIGEM` (`main.ts`) e o
frontend chama a URL absoluta do Render via `environment.apiBase` (dev fica vazio → chamada
relativa pelo proxy; produção fixa a URL do Render no `environment.production.ts`, embutida no
build). Provisionamento das plataformas em `docs/DEPLOY.md`. O backend em produção já responde
`/health` no Render; o frontend fica live quando as Pages forem conectadas ao Git com branch de
produção `master`. Ainda sem módulo de negócio — esses nascem a partir do M1.

## Status dos Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, core/, pipelines, deploy) | **concluído** (deploy nativo Render+Cloudflare; setup das plataformas em `docs/DEPLOY.md`) |
| M1 | Calculadora com paridade | **em andamento** (7/14 tasks — `m1-01` a `m1-07` concluídas) |
| M2 | Auth + Campanhas | backlog |
| M3 | Ficha de Jogador | backlog |
| M4 | Ficha de Criatura/NPC | backlog |
| M5 | Guia de Missão | backlog |

## Status dos Módulos

| Módulo | Status |
|---|---|
| shared (estrutura) | **`interfaces/`** (`StandardResponse`/`PaginatedResult`) + **`enums/`** (`ClasseEnum`, `PatenteEnum`, `ItemCategoriaEnum`, `TipoDescansoEnum`, `QualidadeDescansoEnum`, `MotivoEntradaAgenteEnum`); `dtos/`/`validators/` ainda esqueleto |
| shared/regras | **`agente/` completo** (m1-02): 15 fórmulas puras da aba agente com testes Vitest conferidos contra o sistema (vida, energia, limite de energia, defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo, dano furtivo, inventário, percepção, sanidade, limite hab./turno, benefícios por nível, progressão acumulada, limites por classe). **`dt/`, `novo-agente/`, `patente/` completos** (m1-03): DT de atributo (`10 + Nível + Atributo×2`); nível/prestígio iniciais + bônus monetário por motivo de entrada; lookup de patente por prestígio + recorte da aba, consumindo `PATENTES`. **`descanso/` completo** (m1-04): escada de dados (`ESCADA_DADOS` + `ajustarDado`/`elevarDado`/`descreverDado`), tabelas `DADOS_DESCANSO`/`QUALIDADE_MOD`, faixa de recuperação (`calcularDescanso`), interpretação de dados extras (`interpretarDadosExtras`), resultado a partir de valores rolados (`calcularResultadoDescanso`) + a utilidade de rolagem `rolarDados` (única brecha a `Math.random` — §6.6). **`compras/` completo** (m1-05): catálogo (`CATALOGO_CATEGORIAS`/`CATALOGO_ITENS`), modificações por categoria (`MODIFICACOES`) + custos (`CUSTO_MODIFICACAO`), amplificadores (`AMPLIFICADORES`) e limites por patente (`LIMITES_MODIFICACAO`); fórmulas `obterLimiteModificacoes`/`obterCustoModificacao`/`obterPesoModificacao`/`contarComprasModificacao`/`verificarConflitoModificacao`/`calcularStatItem` (reusa `elevarDado`)/`calcularCustoAmplificador`/`calcularTotaisCarrinho`/`calcularResumoCompras`, reusando `obterPatente` (m1-03). `dados/` com `dadosAgente`, `dadosCivil` e `PATENTES` (m1-01) |
| backend/core | **pronto** (`BaseEntity`, `BaseRepository`, exceções, filtro, interceptor) |
| backend/config | **pronto** (`ConfigService`/`ConfigModule`, lê `DB_*`/`JWT_*`/`APP_*`) |
| backend/database | **pronto** (`DatabaseModule`/`database.provider.ts` — conexão Knex em runtime via DI) |
| backend/health | **pronto** (`HealthController` `GET /health` público; sem service/repository) |
| backend/core/decorators | **`@Public()`** (metadado `isPublic`; guard interpretador nasce no M2) |
| backend/autenticacao | não iniciado |
| backend/usuario | não iniciado |
| backend/campanha | não iniciado |
| backend/ficha | não iniciado |
| frontend (shell) | **pronto** (topbar + `router-outlet` via `shared/layout`, home consumindo `/health`, tema "Terminal de Contenção" dark-first via `docs/design`) |
| frontend/tema | **pronto** (tokens + base + `ContencaoPreset` PrimeNG em `src/styles/tema/`; troca de accent em runtime é M1). **Tailwind instalado e integrado ao build** (m1-06): `frontend/tailwind.config.ts` mescla o `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) apontando cores/fontes/raios utilitários para as CSS custom properties dos tokens; diretivas `@tailwind` no fim de `styles.scss`, coexistindo com SCSS + tokens (preflight não sobrescreve a identidade — só reset) |
| frontend/core (interceptors + services) | **pronto** (`loading`/`error-handler` interceptors, `LoadingService`, `HealthService`) |
| frontend/calculadora | **fundação + aba `agente` prontas**. Fundação (m1-06): módulo `modules/calculadora/` com 6 rotas públicas **lazy** — `agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras` — sob o `CalculadoraShell` (navegação de abas + deep-link por rota via `routerLink`/`routerLinkActive`, paridade com o `switchTab`/`VALID_TABS` por hash do site antigo) e o `StepInput` (stepper/input numérico reutilizável, `ControlValueAccessor` + Reactive Forms, sem `ngModel`). **Aba `agente` (m1-07):** primeira página real — `AgentePage` (Reactive Forms + Signals) consumindo `shared/regras/agente` para **todas** as stats; abas `dt`/`novo-agente`/`patente`/`descanso`/`compras` seguem stubs (m1-08+) |
| frontend/campanha | não iniciado |
| frontend/ficha | não iniciado |
| Infra — banco local (Docker + Knex) | **pronto** (Postgres 16 + migrations) |
| Infra — CI (lint + testes em PR) | **pronto** (GitHub Actions; lint nos 3 workspaces, testes via `--if-present`) |
| Infra — Deploy (produção) | **pronto** (integração nativa: Render auto-deploy via `render.yaml` + Cloudflare Pages via Git; CORS + `apiBase` fixo. Sem GitHub Actions no deploy — `docs/DEPLOY.md`) |

## Próxima Task

**m1-08-pagina-dt-novo-agente-patente** (`docs/specs/backlog/m1-08-pagina-dt-novo-agente-patente.spec.md`).
As três páginas leves da calculadora, agrupadas por serem pequenas: **`dt`** (DT de atributo via
`shared/regras/dt`), **`novo-agente`** (nível/prestígio iniciais + bônus monetário + motivos via
`shared/regras/novo-agente`) e **`patente`** (lookup de patente por prestígio via `shared/regras/patente`).
Todas em Reactive Forms + Signals reusando o `StepInput` da m1-06 e os tokens/padrões BEM do tema
"Terminal de Contenção" — mesmo molde da `AgentePage` (m1-07). Zero regra de jogo no front; paridade com
as abas antigas; funcionam offline do backend. **Ler `docs/design/DESIGN.md` antes de qualquer UI.**
As camadas de regras já estão completas desde a m1-03. Milestone completo
(`docs/specs/backlog/m1-calculadora-paridade.spec.md`): extrai as regras do jogo do site antigo
(`contratados-calculadora/src/script.js`) para `shared/regras` e entrega as 6 páginas públicas client-side
da calculadora, além do sistema de troca de tema em runtime (presets + color picker).

> **Pendência operacional do M0 (não bloqueia o M1):** o backend em produção (Render) já responde
> `/health`. Falta o front ficar live: conectar a Cloudflare Pages ao Git com **branch de produção
> `master`** (e garantir o Auto-Deploy do Render ligado). Passo a passo em `docs/DEPLOY.md`.

## Implementado

- **m1-07-pagina-agente** (2026-07-05): primeira página real da calculadora — a aba `agente` (carro-chefe),
  com paridade funcional à `calc()` do site antigo consumindo `shared/regras/agente`. **Zero regra de jogo no
  front** — toda stat vem do motor (proibição de duplicar fórmula respeitada). `AgentePage`
  (`paginas/agente/`) é um **formulário reativo** (`FormGroup` tipado `nonNullable`: `classe` num `<select>`
  agrupado, os cinco atributos nos **steppers da m1-06** e o Nível num **slider** `<input type="range">`
  — fiel ao protótipo, com o valor atual em accent — todos via `[formControlName]`, sem `ngModel`)
  cujo **estado deriva em Signals**: `bruto` (`toSignal` do `valueChanges` + `getRawValue`) → `entrada`
  (`computed` que normaliza tudo por `aplicarLimitesPorClasse` antes de alimentar as fórmulas) → um `computed`
  por stat. Exibe **todas** as stats derivadas da spec: Vida/Energia (hero, com tons semânticos accent/energy),
  Defesa Base, Proficiência, e o grid secundário Esquiva/Bloqueio/Deslocamento/Inventário/Dano de Corpo/Dano
  Furtivo (verde `--positive`)/Limite de Energia (azul `--energy`)/Traumas/**Sequelas por Missão**/Hab. por
  Turno/Percepção, mais **Benefícios do Nível** e **Progressão Acumulada** (grid de ganhos > 0). Stats que a
  classe não possui (Civil sem defesa/proficiência/dano furtivo/traumas → `null` do motor) são mapeadas para
  `"N/A"` **no front** (formatação de UI, como previsto na m1-02). Ao trocar de classe, um `subscribe` a
  `classe.valueChanges` (`takeUntilDestroyed`) reclampa Nível e atributos via `aplicarLimitesPorClasse`
  (paridade com o clamp de input do site ao mudar de registro); os `[min]/[max]` dos steppers vêm de
  `obterLimitesClasse`. **Layout fiel ao protótipo** `docs/design/examples/calculadora-de-atributos.html`:
  cards numerados (índice mono + título UPPERCASE + régua), stat boxes e stepper adaptados dos padrões de
  `docs/design/tema/_componentes.scss`, consumindo **só tokens** do tema (nenhum hex/fonte/raio solto —
  proibição #29). O Nível usa o **slider** `<input type="range">` do protótipo (a pedido do autor), integrado a
  Reactive Forms pelo `RangeValueAccessor` nativo; os atributos usam os steppers da m1-06. **Adaptações
  conscientes (não divergem de regra):** o
  cabeçalho "Terminal de Agente" do protótipo não é repetido (o `CalculadoraShell` já dá o chrome da
  calculadora); Sequelas e Progressão Acumulada foram **acrescentadas** ao protótipo por serem entregáveis da
  spec; **Limite de Energia mostra `Destreza × 2` (agente) / `Destreza` (civil)** — o valor do motor, que
  corrige a fórmula `(Vig+Des)×2` do site antigo (divergência já registrada e resolvida na m1-02, documento
  vence), então este é o único stat que **intencionalmente** diverge do site (o front nunca reintroduz a
  fórmula antiga). Rótulos e títulos alternam Agente/Civil ("Nível"↔"Treinamentos", "Benefícios deste
  Nível"↔"Treinamento"). Os rótulos sobre os steppers de atributo são `<span>` (o nome acessível vem do
  `ariaRotulo`/`aria-label` do `StepInput`, componente custom sem controle nativo p/ associar); os controles
  nativos usam `<label for>` real (classe e o slider de Nível). `calculadora.routes.spec.ts` atualizado (a aba `agente` deixou de ser stub: agora checa
  `.agente` + aba ativa; as outras 5 seguem em `.stub-pagina__titulo`) e novo `agente.page.spec.ts` prova a
  ligação motor→DOM (Combatente Nível 3 → Vida **71**/Energia **43**; Civil → Defesa/Proficiência **N/A**).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **16/16** (os 14 anteriores + 2
  novos); `build --workspace=frontend` verde (chunk lazy `agente-page` carregando `shared/regras/agente`). As
  6 rotas continuam servidas client-side (funcionam sem backend).
- **m1-06-frontend-calculadora-base** (2026-07-05): fundação do frontend da calculadora — primeira task de
  UI do M1, esqueleto sobre o qual as páginas de cada aba são construídas (m1-07+). **Tailwind instalado e
  integrado** (`tailwindcss@^3` no workspace `frontend`): `frontend/tailwind.config.ts` mescla o
  `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) — cores/fontes/raios utilitários
  apontam para as **mesmas CSS custom properties** dos tokens (`--bg`, `--accent`, `--font-mono`, …), então
  utilitário Tailwind e SCSS/BEM nunca divergem (proibições #17/#29 preservadas — nenhum hex/fonte/raio
  solto). As diretivas `@tailwind base/components/utilities` entram **no fim** de `styles.scss` (o Sass
  exige `@use` — tokens/base — antes de qualquer regra CSS): o preflight carrega depois do `tema/base`, mas
  **não** sobrescreve a identidade (não toca em background/fonte/grid do `body`), só adiciona reset;
  confirmado `box-sizing:border-box` do preflight no CSS compilado. Angular 21 autodetecta o
  `tailwind.config.ts`. **Módulo `modules/calculadora/`** com 6 rotas públicas **lazy** (`loadComponent`,
  sem guard — client-side): `calculadora.routes.ts` monta o `CalculadoraShell` (path `''` com `children`,
  base redireciona para `agente`) e cada aba (`agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras`)
  carrega sua página stub em chunk próprio; `app.routes.ts` liga `calculadora` via `loadChildren`. **Shell +
  navegação de abas com deep-link por rota**: `CalculadoraShell` renderiza cabeçalho + `nav.abas`
  (`@for` sobre as abas, cada uma um `routerLink` relativo com `routerLinkActive="abas__item--ativo"`) + o
  `router-outlet` aninhado — paridade com o `switchTab`/`VALID_TABS` do site antigo, agora dirigido pela URL
  (`/calculadora/<aba>`) em vez do `#hash` (a aba `novo` do site vira a rota `novo-agente`, conforme a spec).
  **`StepInput`** (`componentes/step-input/`): stepper/input numérico reutilizável, **`ControlValueAccessor`**
  (integra a Reactive Forms via `[formControl]`/`formControlName`, **sem `ngModel`**) com botões − / +,
  clamp em `[min, max]`, `passo` configurável e arredondamento a 2 casas — unifica os antigos
  `stepInput` (inteiro, `passo=1`) e `stepInputFloat` (fracionário) num só componente; o valor central é um
  `<input type="number">` que também aceita digitação direta. **Estilos**: cada componente consome só os
  tokens do tema — o `.stepper` foi copiado de `docs/design/tema/_componentes.scss` (valor central adaptado
  de `<div>` para `<input>`), o estado ativo das abas reusa o padrão `.selecionavel--ativo`, e os 6 stubs
  compartilham o cartão via o parcial `paginas/_stub-pagina.scss` (`@use`), copiado do padrão `.card`. Tudo
  standalone, `.scss`, sem `style=""`/seletor de ID/hex solto (proibições #16–18/#29). **Decisões de
  representação:** sem emojis nos rótulos das abas (o site antigo usava `⚔ 🎯 🔄 🏅 💤 🛒` — o tema
  "Terminal de Contenção" proíbe emoji decorativo), rótulos em mono UPPERCASE; a página `home` do M0 ficou
  intocada (redesenho de home é fora do escopo desta task). **Verificado:** `build --workspace=frontend`
  verde (6 chunks lazy de página + shell + rotas); `test --workspace=frontend` 14/14 (7 do `StepInput` via
  host com `FormControl` — writeValue, incremento/decremento com clamp, passo fracionário, digitação; 7 de
  roteamento via `RouterTestingHarness` — redirect da base + navegação a cada uma das 6 rotas com a aba
  ativa correta, provando o carregamento lazy e o deep-link); `lint --workspace=frontend` limpo. As 6 rotas
  são servidas pelo `frontend:dev` (SPA client-side, funcionam sem backend).
- **m1-05-regras-compras** (2026-07-05): `shared/regras/compras/` completo — o domínio mais pesado da
  calculadora (aba `compras` do site antigo, `contratados-calculadora/src/script.js`) extraído e conferido
  contra `docs/core/sistema-v4.1.0.md` — "Equipamentos", "Prestígio e Patentes" e "Amplificadores"
  (34 testes novos; workspace shared 143/143 verde). **Dados** — `catalogo.dados.ts`: `CATALOGO_ITENS`
  (catálogo completo por categoria) + `ItemCatalogo`; `compras.dados.ts`: `CATALOGO_CATEGORIAS`,
  `CUSTO_MODIFICACAO` (exceções ao padrão $750: Explosivos/Munições $250, Armazenamento $300),
  `LIMITES_MODIFICACAO` (empilhamentos/mods por patente), `MODIFICACOES` (mods por categoria com
  `bloqueia`), `AMPLIFICADORES` e as constantes de regra (peso padrão 0,2; amp $3000/$1000; penalidade
  −2 Vontade/empilhamento; limite Vontade×3). Tudo indexado por `ItemCategoriaEnum`/`PatenteEnum` (não
  pelas strings de UI do site). **Fórmulas** (`compras.ts`): `obterLimiteModificacoes` (= antigo
  `getPatenteMod`, **reusa `obterPatente` da m1-03** para não duplicar as faixas de Prestígio),
  `obterCustoModificacao`/`obterPesoModificacao`/`contarComprasModificacao` (custo/peso/cobranças de mod,
  com empréstimo de categoria via "Faz Parte"/"Combativo" — `obterCategoriaEmprestada`/
  `listarModificacoesDisponiveis`), `verificarConflitoModificacao` (conflitos nas duas direções a partir
  da coluna "Bloqueia"), `calcularStatItem` (= antigo `computeItemStat`; **reusa `elevarDado` da m1-04**
  para o degrau da mod Pesada, teto D10), `interpretarBonusArmazenamento`, `calcularCustoAmplificador`,
  `calcularTotaisCarrinho` (= antigo `getCmpTotals`) e o orquestrador `calcularResumoCompras`
  (= `renderCmpSummary`). Exemplos do documento replicados em teste (limite Veterano 3/9; Pesada 3D8→3D10;
  amplificador 1º=$3000 / 3 empilh.=$5000; penalidade Vontade −2). **Divergência encontrada e corrigida
  (documento vence — proibição #27), documentada em JSDoc e teste:** as **modificações de Armazenamento
  não agregam peso** (doc — "não agregam nenhum peso ao item"), mas o site antigo somava o padrão 0,2/stack;
  implementado `peso: 0` nessas mods. Sem outras divergências numéricas vs `script.js`. **Decisões de
  representação (não são divergências de regra):** `calcularStatItem` devolve um value-object estruturado
  (`StatItemDto` com `dano`/`resistencia`/`bonusArmazenamento` em notação de jogo) em vez da string com
  ícone `⚔`/`🛡`/`📦` do site — o ícone/rótulo é formatação de UI (m1-10), como o `null`→"N/A" da m1-02;
  o antigo `PATENTES_MOD` (que duplicava as faixas de Prestígio) virou `LIMITES_MODIFICACAO` indexada por
  `PatenteEnum`, com a tradução Prestígio→patente delegada a `obterPatente` (mesma disciplina anti-duplicação
  da escada de dados na m1-04); estado do carrinho (adicionar/remover, `localStorage`, export/import) fica
  para m1-10/m1-11 — aqui só se calcula a partir de um estado dado. DTOs de entrada e value-objects de saída
  co-locados em `compras.dtos.ts` (dados tipados do motor — §6.6). Barrel `compras/` preenchido; o subpath
  `@contratados-rpg/shared/regras/compras` (pré-registrado na m1-01) agora resolve conteúdo real. Validado:
  `npm run test --workspace=shared` 143/143; `lint`/`typecheck`/`build` verdes; `build` não vaza `*.spec.js`
  para `dist/`.
- **m1-04-regras-descanso** (2026-07-05): `shared/regras/descanso/` completo — as regras da aba
  `descanso` do site antigo (`contratados-calculadora/src/script.js`) extraídas e conferidas contra
  `docs/core/sistema-v4.1.0.md` — "Descanso" (30 testes novos; workspace shared 109/109 verde).
  **Dados** (`descanso.dados.ts`): `ESCADA_DADOS` (escada de tipos de dado `[3,4,6,8,10,12,20]`),
  `DADOS_DESCANSO` (keyed por `TipoDescansoEnum` — Curto 1D4/—, Médio 1D6/1D4, Longo 1D8/1D6),
  `QUALIDADE_MOD` (Insalubre −1 / Adequado 0 / Confortável +1) e `REFEICAO_MOD` (+1). **Escada de
  dados** (`dado.ts`): `ajustarDado` (move na escada com trava nos dois extremos = antigo `tipoDado`),
  `elevarDado` (sobe com teto = antigo `_upgradeDie`, primitiva **compartilhada** que a aba compras
  m1-05 reusa para o dado de dano) e `descreverDado` (notação `"D8"`/`"—"` = antigo `descDado`).
  **Fórmulas** (`descanso.ts`): `calcularDescanso` (faixa mín/média/máx de Energia = Destreza dados e
  Vida = Vigor dados, fórmula `ATRIBUTO dados + Nível×2`, Curto sem Vida, interrupção = `⌊valor÷2⌋` =
  antigo `calcDescanso`), `interpretarDadosExtras` (parse puro de `NdM`/bônus fixo, sem rolar =
  `parseExtraDice` menos a rolagem), `calcularResultadoDescanso` (total a partir de valores **já
  rolados**, puro e determinístico = núcleo de `buildResult`) e `rolarDados` (utilidade de rolagem
  explícita — a única brecha a `Math.random` no motor, §6.6). O documento foi replicado em teste
  (Nível 3, Destreza 4, Curto insalubre → **4D3+6** de Energia — dado D4 reduzido a D3 pelo ambiente
  insalubre, confirmando o degrau D3 da escada). **Decisões de representação (não são divergências de
  regra):** parse e rolagem foram **separados** (o antigo `parseExtraDice` já rolava dentro; aqui o
  parse é puro e a rolagem fica em `rolarDados`) para manter `regras/` determinístico e testável — o
  `Math.random` do site antigo era testável só por faixa, e agora só `rolarDados` o usa (testado por
  limites, não por valor); `descreverDado(0)` devolve `"—"` (o ramo `faces === 0 → "0"` do site era
  código morto — o `if (!faces)` já capturava o 0), preservado por paridade; `media` é exposta (fórmula
  `enMed` que o site calculava mas não exibia) além do mín/máx; a escada `ESCADA_DADOS` vive no domínio
  descanso (por decisão da spec) como primitiva compartilhada — compras (m1-05) importará
  `elevarDado`/`ESCADA_DADOS` daqui, evitando duplicar a escada. DTOs de entrada
  (`<Conceito>CalcularDto`/`<Conceito>InterpretarDto`) e value-objects de saída co-locados em
  `descanso.dtos.ts` (dados tipados do motor — §6.6). Barrel `descanso/` preenchido; o subpath
  `@contratados-rpg/shared/regras/descanso` (pré-registrado na m1-01) agora resolve conteúdo real.
  Validado: `npm run test --workspace=shared` 109/109; `lint`/`typecheck`/`build` verdes; `build` não
  vaza `*.spec.js` para `dist/`.
- **m1-03-regras-dt-novo-agente-patente** (2026-07-05): três domínios leves de `shared/regras/`
  extraídos do site antigo (`contratados-calculadora/src/script.js`) e conferidos contra
  `docs/core/sistema-v4.1.0.md` (22 testes novos; workspace shared 79/79 verde). **`regras/dt/`**:
  `calcularDtAtributo` = `10 + Nível + Atributo×2` (doc "DTs de Atributos"; sem divergência vs
  `calcDT`). **`regras/patente/`**: `obterPatente({prestigio})` (faixa de `PATENTES` da m1-01; a
  última patente cobre 66+ via `prestigioMaximo` infinito) e `calcularPatente` (recorte da aba =
  `{patenteAtual, tabela}`). **`regras/novo-agente/`**: `calcularNivelInicial`
  (`max(0, round(médiaNível) − 1)`; `Math.round` arredonda 0,5 para cima = regra do doc para médias
  não-negativas), `calcularPrestigioInicial` (dedução `⌊média÷divisor⌋` e piso na patente do grupo —
  ou uma abaixo quando o motivo permite), `calcularBonusMonetario`
  (`Prestígio × (500 × multiplicador)`), e o orquestrador `calcularNovoAgente`. Todos os exemplos
  numéricos do documento replicados em teste (Morte ÷7 → 24; Aposentadoria ÷10 → 26; Contido/Exterminado
  sucessor convencional ÷5 → 24 e sucessor Experimento ÷3 → 20; bônus 24×(500×3)=36.000). **Novo enum
  de conteúdo de jogo** `MotivoEntradaAgenteEnum` em `shared/src/enums/` (input da calculadora, não é
  JSONB `ficha.dados` — §10.3; análogo a `TipoDescansoEnum`): 6 motivos que mapeiam os divisores do
  documento (o site antigo os chamava "Experimento/Contido → Regular/Experimento"). **Decisões de
  representação (não são divergências de regra):** os divisores ÷5 (sucessor convencional) e ÷3
  (sucessor Experimento) do documento vêm do capítulo "Aposentadoria" > "Contido ou Exterminado" — o
  documento defere esses valores àquele capítulo; a flag `recebeAmaldicoadoPeloPassado` é verdadeira só
  para os motivos de Contenção/Extermínio (doc + fidelidade ao site); `obterPatente` preserva o fallback
  do site (`find(...) ?? última patente`) para Prestígio fora do domínio (negativo), caminho não esperado
  — Prestígio válido é sempre ≥ 0. DTOs de entrada (`<Conceito>CalcularDto`) e value-objects de saída
  co-locados em `<domínio>.dtos.ts` (dados tipados do motor — §6.6). Barrels `dt/`, `novo-agente/`,
  `patente/` preenchidos; os subpaths `@contratados-rpg/shared/regras/{dt,novo-agente,patente}`
  (pré-registrados na m1-01) agora resolvem conteúdo real. Validado: `npm run test --workspace=shared`
  79/79; `lint`/`typecheck`/`build` verdes; `build` não vaza `*.spec.js` para `dist/`.
- **m1-02-regras-agente** (2026-07-05): `shared/regras/agente/` completo — as 15 fórmulas puras da
  aba `agente` do site antigo (`calc()` + auxiliares), com testes Vitest conferidos contra
  `docs/core/sistema-v4.1.0.md` (57 testes no workspace shared, todos verdes). Organização por arquivo
  coeso: `saude.ts` (`calcularVida`/`calcularEnergia`/`calcularLimiteEnergia`), `defesa.ts`
  (`calcularDefesa` → `{defesa,esquiva,bloqueio}` | `null` civil; `calcularProficiencia`),
  `movimento.ts` (`calcularDeslocamento` em metros), `dano.ts` (`calcularDanoCorpo` tabela de
  Pontuação Corporal; `calcularDanoFurtivo` marcos 3/6/9/12/15/18), `inventario.ts`, `percepcao.ts`,
  `sanidade.ts` (`calcularSanidade` → limite de traumas `VON+1` / `null` civil + sequelas por missão
  `VON`), `habilidades.ts` (`calcularLimiteHabilidadesPorTurno` base 4 + ganhos lidos de `dadosAgente`;
  civil 3), `progressao.ts` (`calcularBeneficiosNivel` + `calcularProgressaoAcumulada` categorizando
  ganhos), `limites.ts` (`obterLimitesClasse` + `aplicarLimitesPorClasse` — contraparte pura do clamp
  de DOM do script). DTOs de entrada (`<Conceito>CalcularDto`) e value-objects de saída co-locados em
  `agente.dtos.ts` (dados tipados do motor — SYSTEM.SPEC §6.6; não são DTOs de API, ficam no `regras/`,
  não em `dtos/`). Fórmulas keyed por `ClasseEnum` (não pela string de UI). **Divergência encontrada e
  corrigida (documento vence — proibição #27), documentada em JSDoc e no teste:** o **Limite de
  Energia** era `(Vigor + Destreza) × 2` no `script.js`, mas o documento
  (`sistema-v4.1.0.md` — "Limites de Energia" e "Jogando como um Civil") define **`Destreza × 2`**
  (agente) e **`Destreza`** (civil) — implementado conforme o documento. Sem outras divergências
  numéricas vs `script.js`. **Decisões de representação (não são divergências de regra):** stats que a
  calculadora exibia como "N/A" para civil viram `null` tipado (defesa, proficiência, dano furtivo,
  limite de traumas) — o UI (m1-07) mapeia `null`→"N/A"; deslocamento/percepção retornam número em
  metros (o "m" é formatação de UI); os bounds de atributo de `aplicarLimitesPorClasse` (−5 a 7; 8 p/
  Experimento Artificial; 3 p/ Civil) são clamps de input da calculadora, não fórmula do documento
  (o que o documento fixa é Nível 0–20 / civil 0–5). Barrel `regras/agente/index.ts` preenchido; o
  subpath `@contratados-rpg/shared/regras/agente` (pré-registrado na m1-01) agora resolve conteúdo
  real. Validado: `npm run test --workspace=shared` 57/57 verde; `npm run lint`/`typecheck`/`build`
  verdes; `build` não vaza `*.spec.js` para `dist/`.
- **m1-01-regras-fundacao-enums** (2026-07-05): fundação do motor de regras no `shared/`, antes de
  qualquer fórmula de domínio ou UI — primeira task do M1. **Harness de teste configurado** no
  workspace `shared`: a spec pedia Jest, mas trocado por **Vitest** na revisão (a pedido do autor)
  para não ter dois test runners no monorepo — o `frontend` já usa Vitest desde a m0-06. `vitest`
  como devDependency, `shared/vitest.config.ts` (`test.environment: 'node'`) e script
  `test: vitest run`; specs importam `describe`/`it`/`expect` explicitamente de `'vitest'` (sem
  globals ambíguos, diferente do `frontend`, que usa `vitest/globals`). Para não vazar `*.spec.ts`
  compilado para `dist/` (consumido por `backend`/`frontend`), o script `build` passou a rodar
  contra um novo `shared/tsconfig.build.json` (estende o `tsconfig.json` base excluindo
  `src/**/*.spec.ts`), enquanto `tsconfig.json`/`typecheck` continuam cobrindo tudo — mesmo padrão já
  usado em `backend/tsconfig.build.json` (essa parte independe do runner escolhido).
  **Estrutura `regras/`**
  conforme SYSTEM.SPEC §3: `agente/`, `dt/`, `novo-agente/`, `patente/`, `descanso/`, `compras/`
  nasceram como barrels vazios (`export {}` + comentário apontando a task que os preenche —
  m1-02 a m1-05); `criatura/` fica para o M4, fora desta task. **Enums de conteúdo de jogo** em
  `shared/src/enums/` (conteúdo de JSONB `ficha.dados`, sem tabela `tipo_*` — §10.3):
  `ClasseEnum`, `PatenteEnum`, `ItemCategoriaEnum`, `TipoDescansoEnum`, `QualidadeDescansoEnum`.
  **`regras/dados/`** com `dadosAgente`/`dadosCivil` (`BeneficiosPorNivel`, mapa nível→benefícios) e
  `PATENTES` (`PatenteDados[]`, com `prestigioMaximo: Number.POSITIVE_INFINITY` na última faixa),
  migrados de `contratados-calculadora/src/script.js` e conferidos contra
  `docs/core/sistema-v4.1.0.md` (documento vence — proibição #27). **Divergências encontradas e
  corrigidas** (documentadas em JSDoc no próprio arquivo de dados): (a) `dadosAgente` níveis 5, 10,
  15, 20 — o site antigo omitia a palavra "outro" em "outra classe/**outro** arquétipo da sua
  classe"; (b) níveis 7, 14 — o site antigo omitia "sua" em "Fortificação de **sua** Personalidade";
  (c) `PatenteEnum` usa os nomes completos do documento (`FORCA_TAREFA_ESPECIAL`,
  `OPERACOES_ESPECIAIS`) em vez das abreviações do site antigo ("FT Especial", "Op. Especiais") —
  sem divergência numérica em `PATENTES` (faixas de prestígio, salário e multiplicador batem com o
  documento e com o site antigo). `shared/package.json` ganhou os subpaths `./enums`,
  `./regras/dados` e, preventivamente, um subpath por domínio ainda vazio (`./regras/agente`,
  `./regras/dt`, `./regras/novo-agente`, `./regras/patente`, `./regras/descanso`,
  `./regras/compras` — todos já apontam para os barrels `export {}` que existem em `dist/`), mesmo
  padrão de `./interfaces` da m0-03. Registrar os seis já evita que uma task futura esqueça de
  adicionar o subpath ao preencher o domínio — o `backend` resolve `exports` estritamente
  (`moduleResolution: nodenext`) e falharia silenciosamente sem sinal de CI, enquanto o `frontend`
  (path-mapping curinga no tsconfig) não notaria o esquecimento.
  **Prova de harness**: `regras/dados/patente.dados.spec.ts` (2 testes triviais sobre `PATENTES`).
  Validado: `npm run test --workspace=shared` verde (2/2); `CI=true npm run test` (raiz) roda
  shared + frontend verde (backend segue sem testes, pulado por `--if-present`); `npm run lint`
  verde nos 3 workspaces; `npm run build --workspace=shared` não gera `.spec.js` em `dist/`.
- **m0-07-deploy** (2026-07-05): deploy de produção — última task do M0. **Decisão final:
  integração nativa das plataformas, sem GitHub Actions no deploy.** (A 1ª rodada chegou a montar
  um `.github/workflows/cd.yml` com gate de CI + Render deploy hook + `wrangler pages deploy`,
  validado verde de ponta a ponta em produção; foi revertido a pedido do autor por complexidade
  desnecessária — o `cd.yml` e os secrets/variables do GitHub que o serviam foram removidos. A CI
  em PR, `m0-06`, permanece.) Estado final: **Backend → Render** via blueprint `render.yaml` (web
  service `contratados-rpg-api`, `autoDeploy: true`, build `npm install && npm run build
  --workspace=backend`, start `npm run start:prod --workspace=backend` = `node dist/main`,
  `healthCheckPath: /health`; `APP_PORTA=10000`/`APP_AMBIENTE=production`/`JWT_EXPIRACAO=8h` no
  blueprint, `DB_*`/`JWT_SECRETO`/`APP_FRONTEND_ORIGEM` como `sync:false` no dashboard). **Frontend →
  Cloudflare Pages** conectado ao Git com **branch de produção `master`** (build `npm run build
  --workspace=frontend`, output `frontend/dist/frontend/browser`). **Ligação cross-origin:**
  `backend/src/main.ts` chama `app.enableCors({ origin: frontendOrigem })` lendo `APP_FRONTEND_ORIGEM`
  do `ConfigService` (§10.6); `frontend/src/environments/` (`environment.ts` dev `apiBase:''` →
  relativo pelo proxy; `environment.production.ts` com `apiBase` fixo
  `https://contratados-rpg-api.onrender.com` — não é segredo) via `fileReplacements` no `angular.json`;
  `HealthService.verificar()` usa `` `${environment.apiBase}/health` ``; `frontend/public/_redirects`
  (`/* /index.html 200`) dá o fallback de SPA. Runbook em `docs/DEPLOY.md` (no modelo do Project 2.0 do
  autor). Validado: backend `/health` em produção no Render responde `200 {"sucesso":true,...}`;
  `npm run build` verde em backend e frontend. **Gotchas aprendidos:** (a) `APP_FRONTEND_ORIGEM` é
  lida no boot (`obterConfiguracaoAplicacao`) → o backend não sobe sem ela; (b) na Cloudflare, a
  branch de produção precisa ser `master` (default é `main`), senão o deploy vira preview e a URL
  principal fica no placeholder; (c) SSL e migrations do Supabase são M2 (no M0 nada consulta o banco).
- **m0-06-ci-lint-teste** (2026-07-05): integração contínua ativa via GitHub Actions.
  `.github/workflows/ci.yml` dispara em todo `pull_request` (+ `workflow_dispatch` manual),
  em `ubuntu-latest` com Node 22 (`actions/setup-node` + cache npm): `npm install` (o
  `postinstall` compila o shared), depois `npm run lint` e `npm run test`. Lint agora
  configurado nos **três** workspaces (deliverable 2): o backend já tinha `eslint.config.mjs`
  (typescript-eslint `recommendedTypeChecked`); **shared** ganhou `eslint.config.mjs` espelhando
  o do backend (CommonJS, `globals.node`) + devDeps (`eslint`, `typescript-eslint`, `@eslint/js`,
  `globals`); **frontend** ganhou `eslint.config.mjs` com `angular-eslint` (flat config: TS
  `recommended` + `angular.configs.tsRecommended` com regras de seletor prefixo `app`; HTML
  `templateRecommended` + `templateAccessibility`) + devDeps (`angular-eslint`,
  `typescript-eslint`, `@eslint/js`, `eslint`). O `lint` do backend perdeu o `--fix` (rodar com
  `--fix` na CI mascararia violações auto-corrigíveis, ferindo o critério "sem etapa mascarando
  falha"); cada workspace tem `lint` (checagem, CI-safe) e `lint:fix` (dev). Scripts agregados na
  raiz: `lint` = `npm run lint --workspaces` (roda os 3; qualquer falha → exit ≠ 0), `test` =
  `npm run test --workspaces --if-present` (só o frontend tem teste por ora — shared/backend são
  pulados, não mascarados). Validado: `npm run lint` verde nos 3; `CI=true npm run test` roda o
  vitest do frontend uma vez (sem watch) → 2/2 verde; sonda de erro de lint confirmou `exit 1`
  agregado na raiz (pipeline quebra). Testes de regra de jogo (`shared/regras`) nascem no M1;
  deploy é a `m0-07`.
- **m0-05-frontend-shell** (2026-07-05): shell mínimo do frontend e prova de integração
  ponta a ponta com o backend. `shared/layout/layout.component.ts` (standalone `Layout`,
  seletor `app-layout`) é o shell: topbar institucional, indicador de carregamento global
  (lê `LoadingService.isLoading()`), `<p-toast/>` e o `<router-outlet/>`; o root `App` só
  renderiza `<app-layout/>`. `core/interceptors/` traz dois interceptors funcionais
  registrados em `app.config.ts` via `withInterceptors`: `loading.interceptor` (conta
  requisições em voo no `LoadingService` — signal `isLoading`) e `error-handler.interceptor`
  (exibe toast PrimeNG com a `StandardResponse.mensagem` do backend e reencaminha o erro).
  `core/services/health.service.ts` (`HealthService.verificar()`) consome `GET /health`
  tipado como `StandardResponse<{ status: string }>` (sem DTO de negócio — payload inline,
  conforme m0-04). `pages/home/home.page.ts` (standalone `Home`, lazy via `loadComponent`
  na rota `''`) chama o health no `ngOnInit`, guarda o resultado em signals e exibe o status
  (`ok`) + mensagem — prova visual do pipeline HTTP frontend → backend → `StandardResponse`.
  `proxy.conf.json` encaminha `/health` para `http://localhost:3100` e foi ligado ao
  `serve.options.proxyConfig` do `angular.json` (dev-server em `:4300`). PrimeNG configurado
  com `providePrimeNG` + `MessageService` no root; **sem `@angular/animations`** — o PrimeNG 21
  usa animações CSS próprias, então `provideAnimationsAsync()` foi descartado (o pacote nem
  está instalado). **Tema "Terminal de Contenção" aplicado** a partir do handoff em
  `docs/design/` (revisão pós-implementação): `src/styles/tema/` recebeu `_tokens.scss`
  (CSS custom properties — fonte da verdade em runtime), `_base.scss` (reset, corpo dark,
  grid de textura) e `contencao.preset.ts` (preset PrimeNG base Aura; único ajuste ao repo:
  imports `@primeng/themes` → `@primeuix/themes`). `styles.scss` importa tokens + base nessa
  ordem; `index.html` é dark-first (`<html lang="pt-BR" class="dark">`) e carrega IBM Plex
  Mono/Sans via `<link>` do Google Fonts (Opção B do handoff — `@fontsource` fica p/ quando
  quiserem offline). `app.config.ts` usa `providePrimeNG({ theme: { preset: ContencaoPreset,
  options: { darkModeSelector: '.dark' } } })`. Topbar e home consomem os tokens (`--surface`,
  `--border`, `--accent`, `--font-mono`, `--positive`…) e a home reusa o padrão canônico de
  card + cabeçalho de seção (índice em badge mono + título UPPERCASE + régua) de
  `_componentes.scss`. Tailwind ainda não está instalado, então utilitários Tailwind ficam
  para depois — SCSS + BEM + tokens cobrem o shell. `app.spec.ts` atualizado (provê
  `provideRouter([])` + `MessageService`; verifica a marca da topbar). Validado:
  `npm run build --workspace=frontend` e `--workspace=backend` passam; `npm run test
  --workspace=frontend` 2/2 verde; com backend (`node dist/main.js`) + `frontend:dev` no ar,
  `curl http://localhost:4300/health` (via proxy) retorna
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`
  e `:4300/` serve o `index.html` do SPA.
- **m0-04-healthcheck-endpoint** (2026-07-05): primeiro endpoint real da API.
  `backend/src/core/decorators/public.decorator.ts` traz o decorator `@Public()` (grava o
  metadado `IS_PUBLIC_KEY = 'isPublic'` via `SetMetadata`) com barrel `index.ts` no padrão
  da pasta `exceptions/` — sem efeito de bloqueio ainda, pois o guard global que o
  interpreta só nasce no M2 (nenhuma rota está protegida). `backend/src/health/health.controller.ts`
  expõe `GET /health` (`@Public()`, método `verificar()`), sem service/repository próprios
  (não há regra de negócio nem persistência — só confirma que o processo Nest responde);
  retorna o literal `{ status: 'ok' }`, que o `response-format.interceptor` da m0-03
  embrulha em `StandardResponse<T>`. Health é conceito operacional genérico → sem DTO de
  negócio no `shared/` (payload inline). `HealthController` registrado direto no array
  `controllers` do `AppModule` (não há módulo de negócio para ele). `npm run build --workspace=backend`
  passa; endpoint validado de ponta a ponta com `node dist/main.js` + `curl` →
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`.
- **m0-03-backend-core** (2026-07-04): `core/` do backend completo.
  `shared/src/interfaces/` ganhou `StandardResponse<TData>` (interface — envelope de
  sucesso/erro) e `PaginatedResult<TItem>` (classe — herdada por DTOs de listagem), com
  subpath `@contratados-rpg/shared/interfaces` adicionado ao `exports` do
  `shared/package.json`. Em `backend/src/core/`: `BaseEntity` (campos de infraestrutura);
  `base/base.repository.ts` com `executarConsulta<T>()`/`executarComando()`/
  `executarSoftDelete(id)`/`executarConsultaPaginada<T>()` (SQL bruto via `knex.raw`,
  paginação com `allRows` conforme §10.5 — nota: `ordenarPor` chega como identificador de
  coluna interpolado diretamente na query, então a service chamadora deve validá-lo contra
  uma lista permitida antes de repassar, já que identificador não aceita parâmetro
  nomeado); `exceptions/` com `BusinessException` (400), `ResourceNotFoundException` (404)
  e `UnauthorizedAccessException` (403); `filters/global-exception.filter.ts` e
  `interceptors/response-format.interceptor.ts`, ambos registrados globalmente via
  `APP_FILTER`/`APP_INTERCEPTOR` em `app.module.ts`. Novo `backend/src/config/` expõe
  `ConfigService` (carrega o `.env` da raiz via `dotenv` — movido de devDependencies para
  dependencies do `backend/package.json` — e expõe getters tipados
  `obterConfiguracaoBanco()`/`obterConfiguracaoJwt()`/`obterConfiguracaoAplicacao()`; nenhum
  `process.env` direto fora dele) num `ConfigModule` global. Novo
  `backend/src/database/database.provider.ts`/`database.module.ts` registra a conexão Knex
  de runtime (token `KNEX_CONNECTION`) lendo a config via `ConfigService` — o `knexfile.ts`
  continua a única exceção autorizada a ler `process.env` direto, por ser ferramenta de CLI
  fora do ciclo do Nest. `main.ts` agora lê a porta via `ConfigService` em vez do antigo
  placeholder `process.env.PORT`. Extensibilidade do `BaseRepository` validada com um
  repositório descartável (compilou e foi removido — nenhum módulo de negócio o reaproveita
  ainda, já que a `m0-04` não usa repository). `npm run build` passa em `shared` e
  `backend`; app sobe com `node dist/main.js` sem erros de DI mesmo sem o Postgres local
  ativo (Knex conecta sob demanda).
- **m0-02-docker-banco** (2026-07-04): PostgreSQL 16 local via `docker-compose.yml` na raiz
  (variáveis interpoladas do `.env`, ver `.env.example` / SYSTEM.SPEC §10.6) e Knex
  configurado em `backend/knexfile.ts` (client `pg`). Scripts de banco funcionais: `db:up` /
  `db:down` na raiz e `db:migrate` / `db:rollback --workspace=backend`. Migrations seguem a
  convenção §10.7: arquivos `.sql` puros em `backend/src/database/migrations/`
  (`NNNN - Nome descritivo.sql`, seções `-- UP` / `-- DOWN`), carregados por um
  `SqlMigrationSource` customizado (`backend/src/database/sql-migration-source.ts`) — a
  tabela de controle continua sendo a `knex_migrations` do Knex, que abre uma transação por
  migration (salvo `-- NO TRANSACTION`). A migration `0001 - Função fn_set_updated_date.sql`
  cria a function genérica `fn_set_updated_date()` (function de trigger reutilizável para
  manter `updated_date`; os triggers `trg_<tabela>_updated_date` nascem junto de cada tabela,
  M2+). Nenhuma tabela de negócio criada. O knexfile lê `process.env` por ser ferramenta de
  CLI fora do NestJS — o código da aplicação usará `ConfigService` (m0-03). O knexfile e o
  `SqlMigrationSource` rodam via `ts-node` (bloco `ts-node` no `backend/tsconfig.json`,
  compilando como CommonJS); o registro do source no runtime (`database.provider.ts`) vem no
  m0-03.
- **m0-01-workspaces-npm** (2026-07-04): monorepo npm workspaces com `shared/`, `backend/`
  (NestJS 11) e `frontend/` (Angular 21 + PrimeNG 21). `npm install` na raiz instala os três
  workspaces; `postinstall` compila `shared` para `dist/`. Import de `@contratados-rpg/shared`
  validado nos dois lados — backend via referência de workspace (dist), frontend via path
  mapping do `tsconfig` para a fonte. `npm run build` passa em backend e frontend.
  Constante trivial `SHARED_PACKAGE_NAME` valida a ligação (será substituída por conteúdo
  real nas tasks seguintes).

## Decisões Pendentes

- **Identidade visual do site** — **definida**: tema "Terminal de Contenção" (dark-first,
  IBM Plex), com handoff completo em `docs/design/` (tokens, base, preset PrimeNG, exemplos,
  trecho Tailwind). Aplicado ao shell na m0-05. Resta para o M1: sistema de troca de tema em
  runtime (presets + color picker com trava de contraste). A instalação/merge do Tailwind foi **concluída
  na m1-06** (config apontando para os tokens; ver "Implementado"). Nota: na 1ª rodada da m0-05 o
  `docs/design/` passou batido (não estava no Session Start) e o
  shell nasceu com preset Aura base + hex hardcoded, corrigido na revisão. Documentação já
  ajustada para não repetir: `CLAUDE.md` agora manda ler `docs/design/DESIGN.md` antes de UI e
  ganhou a seção "Visual Design Source of Truth"; SYSTEM.SPEC §3/§8/§15 e a proibição #29
  (nunca hardcodar cor/fonte) + CONVENTIONS (Estilos e tabela) reforçam o consumo dos tokens.

## Referências

- Design original (brainstorming de 2026-07-01) no repo antigo:
  `contratados-calculadora/docs/superpowers/specs/2026-07-01-contratados-rpg-design.md`
- Código a migrar no M1: `contratados-calculadora/src/script.js` (regras) — o repo antigo
  permanece disponível até o M1 ser concluído, e então será arquivado.
