# CONTEXT.md — Estado Atual do Projeto

> Atualizado após cada sessão de implementação. Última atualização: 2026-07-06 (m1-16 — refinamento do sistema de tema em runtime: slot de cor custom salvo/re-selecionável e persistente, inversão visual por incompatibilidade de base preservando a cor salva, e expansão da paleta de presets com cores principais adicionais — sem tocar em regra de jogo). Sessão anterior no mesmo dia: m1-15 — refinamento mobile das 6 abas + shell + painéis da calculadora, estratégia responsiva dirigida por token.

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
| M1 | Calculadora com paridade | **concluído no código** (15/15 tasks — `m1-01` a `m1-15`, incluindo o refinamento mobile). Restam 2 passos operacionais de plataforma: publicar a Cloudflare Pages e arquivar o repo antigo no GitHub (ver `docs/PARIDADE-M1.md`) |
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
| frontend (shell) | **pronto** (topbar + `router-outlet` via `shared/layout`, home consumindo `/health`, tema "Terminal de Contenção" dark-first via `docs/design`). Em **dev** a aba do navegador recebe sufixo "- DEV" (`provideAppInitializer` no `app.config.ts`, gated por `!environment.producao`; produção mantém o `<title>` do `index.html`) |
| frontend/tema | **pronto + troca em runtime (m1-13)** (tokens + base + `ContencaoPreset` PrimeNG em `src/styles/tema/`). **Sistema de tema em runtime (m1-13):** `TemaService` (`core/services/tema.service.ts`) é a contraparte em runtime de `_tokens.scss` para a parte trocável — escreve `--accent` (e overrides de base clara) em `<html>`, alterna a classe `.dark` e regenera a paleta primária do PrimeNG (`updatePrimaryPalette`/`palette`); 4 presets de accent (só cores da paleta do tema — vermelho/azul/verde/âmbar), base clara/escura e color picker custom com **trava de contraste WCAG** (`razaoContraste`/`luminanciaRelativa`, piso 3:1 vs superfície); persiste em `localStorage` e restaura no boot via `provideAppInitializer`. Painel `ConfiguracoesTema` (`shared/configuracoes-tema/`) na topbar (gatilho + modal, fecha por botão). **Refino m1-16:** (a) **slot de cor custom salvo** — `salvarAccentCustom`/`selecionarAccentSalvo`/`accentCustomSalvo` no `TemaService` + swatch "Salva" no painel: guarda **um** slot (sobrescreve o anterior), persistido em `accentCustomSalvo` (distinto do `accentCustom` ativo), re-selecionável com um clique sem reabrir o picker; (b) **inversão visual por incompatibilidade de base** — `accentAplicado`/`accentAdaptado` + `variantePorContraste` (complemento RGB → ajuste de luminância até cruzar `CONTRASTE_MINIMO`): quando a cor salva/ativa fica ilegível na base ativa, o `--accent` exibido é uma variante legível **preservando o valor salvo**; ao voltar à base compatível a cor original é reaplicada (substitui o descarte antigo em `definirBase`, que agora só troca **presets fixos** travados). Nota discreta no painel quando a cor está adaptada. Paleta de presets expandida de 4 p/ **9** (as 4 oficiais + roxo/rosa/dourado/turquesa/cinza, a pedido do autor), todas sujeitas à mesma trava de contraste por base. Budget inicial elevado p/ 560 kB (o motor de paleta do `@primeuix/themes` entra no bundle inicial). **Tailwind instalado e integrado ao build** (m1-06): `frontend/tailwind.config.ts` mescla o `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) apontando cores/fontes/raios utilitários para as CSS custom properties dos tokens; diretivas `@tailwind` no fim de `styles.scss`, coexistindo com SCSS + tokens (preflight não sobrescreve a identidade — só reset) |
| frontend/core (interceptors + services) | **pronto** (`loading`/`error-handler` interceptors, `LoadingService`, `HealthService`) |
| frontend/calculadora | **6 abas prontas (paridade da calculadora completa)**. Fundação (m1-06): módulo `modules/calculadora/` com 6 rotas públicas **lazy** — `agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras` — sob o `CalculadoraShell` (navegação de abas + deep-link por rota via `routerLink`/`routerLinkActive`, paridade com o `switchTab`/`VALID_TABS` por hash do site antigo) e o `StepInput` (stepper/input numérico reutilizável, `ControlValueAccessor` + Reactive Forms, sem `ngModel`). **Aba `agente` (m1-07):** carro-chefe — `AgentePage` (Reactive Forms + Signals) consumindo `shared/regras/agente` para **todas** as stats. **Abas leves `dt`/`novo-agente`/`patente` (m1-08):** três páginas Reactive Forms + Signals consumindo `shared/regras/{dt,novo-agente,patente}`, reusando o `StepInput` e os tokens/BEM do tema; rótulos de `PatenteEnum`/`MotivoEntradaAgenteEnum`→pt-BR em `modules/calculadora/rotulos.ts` (formatação de UI). **Aba `descanso` (m1-09):** `DescansoPage` (Reactive Forms + Signals) consumindo `shared/regras/descanso` — faixa determinística + **rolagem animada** (scramble via `requestAnimationFrame`, RNG por `rolarDados`). **Aba `compras` (m1-10):** `ComprasPage` — a mais pesada: configuração do agente (4 steppers), resumo de limites/gastos, catálogo com busca/categorias e o carrinho com itens, modificações (painel + empilhamentos) e amplificadores; estado em **Signals**, todos os números vindos de `shared/regras/compras` (`calcularResumoCompras`/`calcularStatItem`/custos). **Persistência e exportar/importar (m1-11):** `effect()` salva carrinho/amplificadores/recursos em `localStorage` a cada mudança e recarrega na construção da página; modais de exportar (código `CRPG-COMPRAS-V1:<base64>`) e importar, com aviso de incompatibilidade com códigos do site antigo. **Ajuda por aba (m1-12):** componente único `AjudaCalculadora` (`componentes/ajuda-calculadora/`) — gatilho "? Ajuda" + modal — embutido nas 6 páginas via input signal `aba`; o texto (guia de "como usar cada página") vive em `CONTEUDO_AJUDA`, keyed por aba, sem duplicação. Todas as 6 abas concluídas com paridade completa. **Verificação de paridade + "sem duplicação" (m1-14):** achado corrigido — `compras.page.ts` recalculava custo/penalidade de amplificador com constantes de regra embutidas (`3000/1000/2`) → passou a consumir `calcularCustoAmplificador` + `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras` (zero constante de regra no front). **Cor da stat Vida** (abas agente/descanso) desacoplada do `--accent` trocável: novo token fixo `--vida`/`--vida-border` (vermelho da identidade) em `_tokens.scss` (front + `docs/design/tema/`) — Vida permanece vermelha mesmo com accent trocado no tema em runtime. **Refinamento mobile (m1-15):** estratégia responsiva dirigida por token — `src/styles/tema/_breakpoints.scss` (`$bp-mobile: 560px` + mixin `mobile` + `$alvo-toque: 44px`, resolvido via `stylePreprocessorOptions.includePaths` em `angular.json`); a densidade mobile vem de **override dos tokens** `--pad-card`/`--gap-grid` num `@media` no `styles.scss` (reflui todos os cards/grids de uma vez, sem valor mágico por arquivo); trava de scroll horizontal via `overflow-x: clip` em `html`/`.conteudo`. Abas do shell viram **barra flutuante fixa no rodapé** no mobile (ícone sobre rótulo, 6 itens distribuídos, deep-link preservado, área segura do iOS + espaço reservado no conteúdo); alvos de toque de 44px no `StepInput`, chips de categoria, mini-botões e controles do painel de tema; os 3 modais (ajuda/tema/exportar-importar) ganham `max-height` + rolagem interna. As 6 grades já refluem por `auto-fit`/`auto-fill minmax`. Verificação responsiva (360/390/430px) na §6 de `docs/PARIDADE-M1.md`. **Sem regra de jogo** (`shared`/`shared/regras` intocados) |
| frontend/campanha | não iniciado |
| frontend/ficha | não iniciado |
| Infra — banco local (Docker + Knex) | **pronto** (Postgres 16 + migrations) |
| Infra — CI (lint + testes em PR) | **pronto** (GitHub Actions; lint nos 3 workspaces, testes via `--if-present`) |
| Infra — Deploy (produção) | **pronto** (integração nativa: Render auto-deploy via `render.yaml` + Cloudflare Pages via Git; CORS + `apiBase` fixo. Sem GitHub Actions no deploy — `docs/DEPLOY.md`) |

## Próxima Task

**M1 concluído no código** (paridade + refinamento mobile + refino do tema em runtime — 16 tasks).
Há uma nova task de refinamento no **backlog**, ainda não iniciada:
**`m1-17-singleton-estado-abas-calculadora.spec.md`** — singleton em memória (sem
`localStorage`) que preserva o estado do formulário de cada uma das 5 abas
(`agente`/`dt`/`novo-agente`/`patente`/`descanso`) ao trocar de aba na calculadora; um F5 continua
zerando essas 5 abas — só `compras` mantém sua peculiaridade de sobreviver a F5 (mecanismo próprio
de `localStorage` da m1-11, intocado). A próxima frente
maior é o **M2 — Auth + Campanhas** (`docs/specs/backlog/m2-auth-campanhas.spec.md`), ainda a
ser quebrado em tasks numeradas (`m2-01-*.spec.md`, …) antes da implementação — os milestones
M2–M5 já trazem uma task de refinamento mobile no escopo. Os specs de milestone concluídos
(`m0-fundacao`, `m1-calculadora-paridade`) e todas as tasks `m0-*`/`m1-*` já entregues estão em
`docs/specs/done/`.

> **Passos operacionais pendentes (plataforma, não bloqueiam código — ver `docs/PARIDADE-M1.md`):**
> 1. **Cloudflare Pages no ar:** conectar a Pages ao Git com **branch de produção `master`**
>    (Auto-Deploy) e validar a calculadora funcionando com o Render dormindo. Runbook em `docs/DEPLOY.md`.
> 2. **Arquivar `contratados-calculadora`:** marcar o repo antigo como *Archived* no GitHub
>    (a documentação deste repo já o descreve como arquivado após o M1).

## Implementado

- **m1-16-preset-cor-salvo-tema** (2026-07-06): refinamento do sistema de tema em runtime
  (m1-13), estendendo o `TemaService` e o painel `ConfiguracoesTema` — **sem regra de jogo**
  (`shared`/`shared/regras` intocados). **Entregável 1 — slot de cor custom salvo:** novo
  `_accentCustomSalvo` (persistido em `accentCustomSalvo`, distinto do `accentCustom` "ativo") +
  `salvarAccentCustom`/`selecionarAccentSalvo`/`accentCustomSalvo`/`salvoAtivo`; a cor do color
  picker vira um **swatch re-selecionável** ("S" no canto) ao lado dos presets, **único por vez**
  (novo salvamento sobrescreve o anterior), sobrevive a reload e reaplica com um clique sem
  reabrir o picker. **Entregável 2 — inversão visual por incompatibilidade de base:** `accentEfetivo`
  passou a ser o valor **selecionado** (lógico) e ganhou par `accentAplicado` (o que é escrito em
  `--accent`) + `accentAdaptado`; quando a cor selecionada/salva fica ilegível na base ativa, o
  `--accent` exibido é uma **variante legível** (`variantePorContraste`: complemento RGB → ajuste
  de luminância até cruzar `CONTRASTE_MINIMO`, com fallback ao preset seguro só em último caso),
  **preservando o valor salvo** — ao voltar à base compatível a cor original é reaplicada.
  `definirBase` deixou de **descartar** a cor custom (só troca **presets fixos** travados). Restauração
  no boot passou a restaurar o custom/salvo **sem** a trava (a legibilidade é resolvida por
  adaptação, não por descarte). A trava de contraste de `definirAccentCustom` (bloquear a
  **definição** de cores ilegíveis na base atual) segue intacta. **Entregável 3 — UI:** botão
  "Salvar cor" na seção de cor personalizada, o swatch salvo (estado selecionado quando ativo) e
  **nota discreta** (`text-mute`) quando a cor está sendo exibida adaptada; tudo **via tokens**
  (nenhum hex/fonte/raio solto — proibição #29). **A pedido do autor (mesma sessão):** (a) paleta
  de presets expandida de 4 → **9** (as 4 oficiais + Roxo/Rosa/Dourado/Turquesa/Cinza; cores
  principais com chroma/lightness próximos das oficiais, todas sujeitas à mesma trava por base);
  (b) o swatch salvo recebe um **nome aproximado** derivado do matiz/saturação/luminosidade da cor
  (`nomearCor` puro — faixas de matiz pt-BR + cinzas por baixa saturação + qualificador
  claro/escuro), exibido no lugar de um rótulo fixo. **Testes:** `tema.service.spec` ganhou o slot
  salvo (salvar/sobrescrever/re-selecionar ilegível→adaptado→voltar, persistência), `variantePorContraste`,
  `nomearCor` e a checagem das cores adicionais; `configuracoes-tema.component.spec` cobre o swatch
  salvo re-selecionável. **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend`
  **64/64** (54 anteriores + 10 novos); `test --workspace=shared` **143/143** (intocado);
  `build --workspace=frontend` verde (inicial **537,70 kB** < 560 kB, sem avisos de budget).
- **m1-15-refinamento-mobile-calculadora** (2026-07-06): task de refinamento do M1 —
  otimização da UI/UX **mobile** das 6 abas, do shell e dos painéis, sem tocar em regra de
  jogo (`shared`/`shared/regras` intocados; nenhuma mudança de DOM/TS, só SCSS + `angular.json`,
  então os 54 testes de front seguem verdes sem edição). **Estratégia responsiva de fonte
  única:** novo `frontend/src/styles/tema/_breakpoints.scss` (`$bp-mobile: 560px`, mixin
  `mobile`, `$alvo-toque: 44px`) — media queries são compile-time e não leem `var(--…)`, por
  isso o breakpoint é token **Sass**, não CSS custom property; resolvido por bare import
  (`@use 'tema/breakpoints'`) via `stylePreprocessorOptions.includePaths: ["src/styles"]`
  adicionado ao `angular.json`. Nenhuma largura mágica repetida por arquivo. **Densidade mobile
  por override de token:** um `@media (max-width: 560px)` no `styles.scss` reduz `--pad-card`
  15px e `--gap-grid` 12px no `:root` — como todos os cards/grids consomem esses tokens, o
  reflow acontece de uma vez, sem editar cada componente. **Zero scroll horizontal do body:**
  `overflow-x: clip` em `html` e `.conteudo` (conteúdo largo — tabelas de DT/Patente, textarea
  de código — já rola no próprio container via `overflow-x: auto`); `img/svg/video/canvas`
  com `max-width: 100%`. **Reflow das 6 abas:** as grades já eram `auto-fit`/`auto-fill minmax`,
  então colapsam para 1–2 colunas no mobile sem mudança estrutural (tabela de colunas por
  largura de referência na §6 de `docs/PARIDADE-M1.md`); a redução de padding/gap por token
  ajusta a densidade. **Alvos de toque (44px):** botões −/+ do `StepInput` (30px→44px só no
  mobile, desktop intacto), abas do shell (que no mobile viram uma **barra flutuante fixa no
  rodapé** — `position: fixed` destacada das bordas, ícone sobre rótulo, 6 itens `flex: 1`
  distribuídos, deep-link por rota preservado, `env(safe-area-inset-bottom)` do iOS +
  `padding-bottom` reservado no conteúdo; `z-index` abaixo dos modais, que a cobrem),
  chips de categoria e mini-botões −/+ do carrinho (aba `compras`), e opções/swatches/**color
  picker** do painel de tema. **Modais mobile-first:** ajuda (`AjudaCalculadora`), config de
  tema (`ConfiguracoesTema`) e exportar/importar do carrinho ganham `max-height:
  calc(100dvh - 32px)` + `overflow-y: auto`, permanecendo operáveis com o polegar. **Identidade
  preservada** (dark base + IBM Plex + grid + cards), **tudo via tokens** — nenhum hex/fonte/raio
  solto, nenhum `style=""`, nenhum `.css` (proibições #17/#18/#29). **Budget:** o SCSS responsivo
  da aba `compras` (a mais pesada) levou o `anyComponentStyle` a 8,28 kB; o `maximumWarning` subiu
  **8→10 kB** (erro mantido em 12 kB) em `angular.json`, mesmo precedente das elevações de budget
  em `m1-10`/`m1-13`. **Acabamentos pedidos na mesma sessão** (mobile + polimento): (1) a
  **categoria de equipamento selecionada** ganhou estado ativo com **glow** de accent — a classe
  `.selecionavel--ativo` era usada no template mas não existia no SCSS scoped da `compras` (só no
  shell), então a seleção não tinha destaque; agora `accent` + `accent-dim` + `box-shadow` suave;
  (2) os botões **Importar/Exportar/Esvaziar** do carrinho foram embrulhados em
  `.compras-carrinho-acoes` (desktop: agrupados à direita; mobile: caem para a própria linha em
  terços iguais, corrigindo a quebra visual); (3) botões de item/**amplificador** com alvo de
  toque ≥40px e `flex-wrap` no mobile; (4) na aba **DT**, o resultado da fórmula e os valores da
  tabela passaram de verde `--positive` para a **cor do tema** (`--accent` trocável em runtime).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **54/54**; `test
  --workspace=shared` **143/143**; `build --workspace=frontend` verde, inicial **533,27 kB** <
  560 kB, **sem avisos de budget**. Verificação responsiva registrada em `docs/PARIDADE-M1.md` §6.
- **m1-14-paridade-deploy-arquivamento** (2026-07-06): última task do M1 — verificação de
  paridade das 6 abas, checagem de "sem duplicação" e fechamento **de código** do milestone
  (o deploy Cloudflare e o toggle de arquivamento do repo antigo são passos operacionais de
  plataforma, documentados como pendências). Task de verificação + documentação, sem regra de
  jogo nova (`shared`/`shared/regras` intocados na lógica). **Método de paridade:** o repo antigo
  `contratados-calculadora` **não está neste monorepo nem no histórico Git** (confirmado por
  `find`/`git log`) — é projeto à parte. Como a milestone autoriza, a paridade é verificada
  contra a **fonte da verdade** `docs/core/sistema-v4.1.0.md` (que vence o código antigo), já
  conferida por domínio nas m1-02..m1-05 com os exemplos numéricos replicados em teste; as 4
  divergências resolvidas a favor do documento (Limite de Energia `Destreza×2`; peso 0 das mods
  de Armazenamento; quebra de formato do export/import; texto de ajuda reescrito) estão
  catalogadas no novo **`docs/PARIDADE-M1.md`** (checklist por aba + tabela de divergências +
  resultado da checagem de duplicação + estado de deploy/arquivamento). **Achado de duplicação
  corrigido:** `compras.page.ts` recalculava o custo do amplificador (`3000 + (stacks−1)×1000`)
  e a penalidade de Vontade (`(stacks−1)×2`) com constantes de regra embutidas — repontado para
  `calcularCustoAmplificador()` + `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras`,
  satisfazendo o critério "nenhuma regra de jogo duplicada no frontend". Confirmado: nenhuma outra
  fórmula/tabela do jogo vive no front/back (backend não importa `shared/regras`); aritmética
  remanescente nas páginas é de UI. **100% das fórmulas testadas:** shared **143/143**; frontend
  **54/54**; `build --workspace=frontend` verde (inicial 532,77 kB < 560 kB, sem avisos) — bundle
  estático servível offline do backend. **Ajustes de acabamento pedidos na mesma sessão** (fora do
  escopo estrito da spec, a pedido do autor): (1) aba do navegador com sufixo **"- DEV"** em
  desenvolvimento (`provideAppInitializer` gated por `!environment.producao`); (2) **stat Vida
  fixada em vermelho** nas abas agente/descanso via novo token `--vida`/`--vida-border` (identidade),
  desacoplada do `--accent` trocável do tema em runtime; (3) housekeeping — specs de milestone
  `m0-fundacao`/`m1-calculadora-paridade` movidos para `done/` e `.gitkeep` removidos das pastas
  que já têm conteúdo (`backend/src/config`, `docs/specs/done`, `frontend/src/app/modules`,
  `shared/src/interfaces`). **Validado:** `lint`/`test`/`build` do frontend verdes; `test` do shared verde.
- **m1-13-sistema-temas-runtime** (2026-07-05): entregável 4 do milestone e item adiado do M1
  (SYSTEM.SPEC §15) — **sistema de troca de tema em runtime** reconstruído sobre o
  `ContencaoPreset`/CSS vars do PrimeNG 21 e os tokens de `docs/design/tema/`. Identidade fixa
  preservada (dark base + IBM Plex); só o `--accent` e a base clara/escura são trocáveis (spec).
  **`TemaService`** (`core/services/tema.service.ts`) é a contraparte em runtime de `_tokens.scss`
  para a parte trocável — o único lugar (fora do SCSS de tokens) sancionado a conhecer valores de
  cor. Estado em Signals (`base`/`presetId`/`accentCustom` → `accentEfetivo`/`presetsExibicao`
  computados). `aplicar()` escreve o token `--accent` em `<html>` (dispara `--accent-dim`/
  `--accent-border` via `color-mix`), na base clara aplica overrides de superfície/texto (na
  escura os remove, deixando o `:root` de `_tokens.scss` valer — sem duplicar os hexes dark),
  alterna a classe `.dark` do PrimeNG e regenera a paleta primária do preset
  (`updatePrimaryPalette(palette(accent))`) para os componentes PrimeNG seguirem o accent.
  **Presets de accent (4):** só cores da paleta do tema (vermelho `--accent` / azul `--energy` /
  verde `--positive` / âmbar `--warning`) — "não inventar cores fora desta lista" (CLAUDE.md).
  **Trava de contraste (WCAG):** `luminanciaRelativa` (≈`relativeLuminance` do site antigo) +
  `razaoContraste` (≈`contrastRatio`) puras; `CONTRASTE_MINIMO = 3` (piso WCAG AA de UI, paridade
  do `SIMILAR_THRESHOLD`); `presetsExibicao` marca os travados p/ a base atual
  (≈`updateSwatchLocks`), `definirAccentCustom` bloqueia (retorna `false`) cores ilegíveis, e
  `definirBase` cai em `accentAlternativoParaBase` (≈`fallbackAccentForBase`) se o accent atual
  ficar travado na nova base. Ex. conferido em teste: **âmbar** trava na base clara (contraste
  ~2,25 vs branco) e libera na escura. **Persistência:** `salvar`/`restaurar` em `localStorage`
  (`contratados-rpg:tema`), restaurados no boot por **`provideAppInitializer`** (aplica antes da
  primeira renderização — sem flash). **UI:** painel `ConfiguracoesTema`
  (`shared/configuracoes-tema/`) — gatilho na topbar (`Layout` ganhou `.topbar__acoes`) + modal
  (base escuro/claro, swatches de preset com os travados desabilitados, `<input type="color">`
  via Reactive Forms — sem `ngModel` — com aviso de contraste bloqueado); **fecha só por botão**
  (padrão de acessibilidade dos modais de ajuda/compras). Consome **só tokens** do tema (nenhum
  hex/fonte/raio solto no SCSS/template — proibição #29; os valores de cor vivem no `TemaService`,
  a fonte em runtime, como no `_tokens.scss`). **Sem regra de jogo** (`shared`/`shared/regras`
  intocados). **Budget:** o motor de paleta do `@primeuix/themes` (`palette`/`updatePrimaryPalette`)
  entra no bundle inicial (~48 kB; import dinâmico não separa porque `@primeuix/themes` já é inicial
  via `contencao.preset.ts`) — o budget `initial` `maximumWarning` foi elevado de 500 kB para
  **560 kB** em `angular.json` (mantendo o erro em 1 MB; decisão do autor, mesmo precedente do
  budget de estilo elevado na m1-10). Novos `tema.service.spec.ts` (contraste WCAG; trava por
  base; aplicação das CSS vars em `<html>`; bloqueio do accent custom ilegível; fallback ao trocar
  de base; round-trip de persistência) e `configuracoes-tema.component.spec.ts` (gatilho abre o
  painel; 4 presets; base clara desabilita o âmbar; picker de baixo contraste sinaliza bloqueio).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **52/52** (36
  anteriores + 16 novos); `build --workspace=frontend` verde **sem avisos de budget** (inicial
  532,49 kB < 560 kB). A troca reflete em runtime em todas as páginas (as pages são token-driven).
- **m1-12-conteudo-ajuda** (2026-07-05): conteúdo de ajuda por aba — parte do entregável 4 do
  milestone (as 6 páginas ganham um modal de ajuda). **Componente único reutilizável**
  `AjudaCalculadora` (`modules/calculadora/componentes/ajuda-calculadora/`) consumido pelas **6
  páginas** (`agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras`): um gatilho "? Ajuda" + o
  modal com o guia de uso, parametrizado só pelo input signal `aba` — **um só componente, sem
  duplicação por aba** (critério de aceite). Estado de abertura em Signal; **fecha apenas por botão**
  ("×" do cabeçalho ou "Fechar"), sem clique-fora — mesmo padrão de acessibilidade dos modais de
  exportar/importar da m1-11 (não aciona `click-events-have-key-events`/`interactive-supports-focus`
  do lint). Modal adaptado do `.compras-modal`, consumindo **só tokens** do tema "Terminal de
  Contenção" (nenhum hex/fonte/raio solto — proibição #29); embutido como nó-raiz acima do `<form>`
  de cada página, com o host em flex alinhando o gatilho à direita. **Conteúdo** em
  `conteudo-ajuda.ts` (`CONTEUDO_AJUDA` keyed por `AbaAjuda` = equivalente ao `HELP_CONTENT` do site
  antigo): cada entrada tem título, resumo, passos e nota. **Origem do texto — quebra de paridade
  documentada (como na m1-11):** o `HELP_CONTENT` original não está neste repositório (a SPA
  `contratados-calculadora` é projeto à parte, arquivada só após o M1 — SYSTEM.SPEC §1; confirmado no
  git e no grep), então a paridade textual literal é impossível. A pedido do autor, cada entrada é um
  **guia de "como usar esta página"** (instruções de uso da aba), redigido a partir do comportamento
  já implementado (m1-07..m1-11) e conferido contra `docs/core/sistema-v4.1.0.md` — é texto de
  interface, **sem regra de jogo nova** (`shared/regras` e `shared` intocados). Novo
  `ajuda-calculadora.component.spec.ts` prova o componente (gatilho abre o modal; título e nº de
  passos batem com `CONTEUDO_AJUDA`; seleção de conteúdo por aba; fecha por botão); os specs das 6
  páginas seguem passando (o gatilho usa classes `.ajuda-*` próprias, não colide com as queries por
  classe dos testes existentes). **Validado:** `lint --workspace=frontend` limpo; `test
  --workspace=frontend` **36/36** (32 anteriores + 4 novos); `build --workspace=frontend` verde **sem
  avisos de budget**. As 6 abas seguem client-side (funcionam sem backend).
- **m1-11-compras-persistencia-carrinho** (2026-07-05): fecha a paridade da aba `compras` —
  persistência e exportar/importar por código, últimos entregáveis do milestone antes de
  `m1-12`/`m1-13`/`m1-14`. **Persistência em `localStorage`:** um `effect()` no construtor da
  `ComprasPage` observa `carrinho`/`amplificadores`/`recursos` (form) e grava o estado a cada
  mudança na chave `contratados-rpg:calculadora-compras`; o construtor tenta carregar esse
  estado antes de qualquer outra inicialização — o carrinho sobrevive a reload/reabertura sem
  nenhuma ação do usuário. **Exportar/importar por código compartilhável:** dois modais novos
  (`abrirModalExportarCodigo`/`abrirModalImportar`, fechados por botão — sem clique-fora, para
  não acionar `click-events-have-key-events`/`interactive-supports-focus` do lint de
  acessibilidade) — exportar serializa `{ versao: 1, recursos, carrinho, amplificadores }` em
  `JSON.stringify` → `encodeURIComponent` → `btoa`, prefixado `CRPG-COMPRAS-V1:`
  (`copiarCodigoCarrinho` usa `navigator.clipboard`); importar reverte a decodificação,
  valida a forma do objeto (`versao === 1` + tipos dos 4 campos de `recursos` + `carrinho`/
  `amplificadores` como array) e só então aplica via `aplicarEstado` (também usado pelo load
  do `localStorage`), recalculando `uidContador` a partir do maior `uid` importado para não
  colidir com itens adicionados depois. **Compatibilidade com códigos do site antigo —
  quebra documentada (critério de aceite cumprido pela via da exceção):** o
  `contratados-calculadora/src/script.js` não está neste repositório (não foi migrado nem
  está disponível para inspeção), então o formato de serialização original não pôde ser
  conferido nem replicado; o novo formato (`CRPG-COMPRAS-V1:`) é uma serialização própria,
  incompatível por construção, e a UI de importação avisa isso explicitamente no texto do
  modal ("Códigos do site antigo... não são compatíveis com este formato"). **Sem lógica de
  jogo nova** — só serialização de estado da página, fora do escopo de `shared/regras`
  (que continua intocado desde a m1-05/m1-10). `compras.page.spec.ts` ganhou 2 testes: um
  round-trip de persistência (adicionar item → remontar a página → item e gasto
  preservados) e um round-trip de exportar/importar (exportar em uma instância, limpar o
  `localStorage`, importar o código numa segunda instância, mesmo gasto/item reproduzidos);
  os testes existentes ganharam `beforeEach`/`afterEach` limpando o `localStorage` (evita
  vazamento de estado entre `it`s) e a função `montar()` ganhou `TestBed.resetTestingModule()`
  + `await fixture.whenStable()` (necessário porque agora há dois `montar()` no mesmo teste e
  porque o `effect()` de salvar é assíncrono — sem o `whenStable()` o segundo `montar()` podia
  ler o `localStorage` antes do `effect()` gravar). **Validado:** `lint --workspace=frontend`
  limpo; `test --workspace=frontend` **32/32** (30 anteriores + 2 novos); `build
  --workspace=frontend` verde sem avisos de budget de estilo (SCSS do modal ficou dentro do
  budget elevado de 8/12 kB definido na m1-10).
- **m1-10-pagina-compras** (2026-07-05): a aba `compras` da calculadora — **a mais pesada** — com paridade
  funcional à aba `compras` do site antigo (`renderCmpSummary`/`renderCmpCatalog`/`renderCmpCart`/
  `computeItemStat`/`getCmpTotals`). **Zero regra de jogo no front**: limites de patente, custo/peso de
  modificação, conflitos, stat computado de item, custo de amplificador e todos os totais vêm de
  `shared/regras/compras` (regras prontas desde a m1-05); a página só orquestra o estado do carrinho em
  Signals e traduz os value-objects do motor para a UI. Mesmo molde das abas anteriores (Reactive Forms +
  Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção"). `ComprasPage`
  (`paginas/compras/`) tem 4 cards: **(1) Configuração** — 4 steppers (Dinheiro passo 100, Prestígio,
  Inventário passo 0,5, Vontade 0–12); **(2) Resumo** — patente (via `ROTULOS_PATENTE`), dinheiro
  restante/gasto, inventário usado vs efetivo, amplificadores vs limite (Vontade×3), limite de mods e
  penalidade de Vontade, com cores semânticas (accent quando estoura, `--positive` quando sobra dinheiro),
  tudo de `calcularResumoCompras`; **(3) Catálogo** — busca (`<input type=search>`) + abas de categoria
  (`CATALOGO_CATEGORIAS`, texto mono sem os emojis do site — proibição de emoji decorativo do tema) e grade
  de cartões (item base com dano/resist/bônus/descrição, ou amplificadores com faixa de stack e info de
  limite); **(4) Carrinho** — itens com stat computado (`calcularStatItem`), toggle Guardada/Vestida para
  armazenamento, chips de mods ativas com −/+, painel de modificações (próprias + emprestadas via "Faz
  Parte"/"Combativo", com pontos de empilhamento, custo/stack, motivo de bloqueio e gate de adição) e
  seção de amplificadores (stacks, custo, penalidade). **Estado em Signals**: `carrinho`/`amplificadores`
  (arrays imutáveis atualizados por `signal.set`), `categoriaAtiva`, `busca`, `painelAbertos` (Set de uids
  abertos), `recursos` (`toSignal` do form) → um `computed` por recorte de UI (`resumo`, `itensCatalogo`,
  `amplificadoresCatalogo`, `itensCarrinho`, `amplificadoresCarrinho`) que remontam view-models a partir do
  motor. **Gate de adição de mod/amp na página** (habilitar/desabilitar botão + travar a mutação) lê os
  limites do motor (`obterLimiteModificacoes`, `verificarConflitoModificacao`, `empilhamentosIniciais`/
  `empilhamentoMaximo` das `ModificacaoDados`) — não reimplementa fórmula, só orquestra a UI (mesma
  disciplina da rolagem animada viver na `DescansoPage`). **Decisões de representação (não divergem de
  regra):** ícones de stat do site (`⚔`/`🛡`/`📦`) viram rótulos de texto ("Dano …"/"Resist. …"/"+N inv."),
  como previsto na m1-05; categorias sem emoji; patente exibida pelo nome pt-BR (`ROTULOS_PATENTE`, m1-08),
  não o código do enum. **Persistência (`localStorage`) e export/import por código ficam para a m1-11**
  (fora de escopo da spec). `calculadora.routes.spec.ts` atualizado (`compras` deixou de ser stub → agora
  checa `.calc` + aba ativa; **não há mais stub**) e novo `compras.page.spec.ts` prova a ligação motor→DOM
  (resumo padrão Prestígio 0 → **Agente** / **$1.000** / gasto **$0**; adicionar "Leve" → gasto/restante
  **$500** e stat **Dano 1D6+DES [Físico]**; aplicar "Balanceada" → gasto **$1.250** (+$750 do motor);
  adquirir amplificador "Defesa" → gasto **$3.000** e amps **1/3**). **Budget de estilo:** a página é grande
  e seu SCSS scoped compila **6,75 kB** (reduzido de 8,46 kB com herança de `--font-mono` no container e
  agrupamento dos padrões repetidos de caixa/controle); o budget global `anyComponentStyle` foi elevado de
  4/8 kB para **8/12 kB** (aviso/erro) em `angular.json` para acomodar a página mais pesada (decisão do
  autor — as demais páginas seguem folgadas). **Validado:** `lint --workspace=frontend` limpo; `test
  --workspace=frontend` **30/30** (26 anteriores + 4 novos); `build --workspace=frontend` verde **sem
  avisos de budget**. As 6 rotas seguem client-side (funcionam sem backend).
- **m1-09-pagina-descanso** (2026-07-05): a aba `descanso` da calculadora com paridade funcional à
  `calcDescanso`/`rollDescanso` do site antigo, **incluindo a rolagem animada** (entregável 5 do milestone).
  **Zero regra de jogo no front** — faixa de recuperação, interpretação dos dados extras, rolagem e resultado
  final vêm de `shared/regras/descanso` (regras prontas desde a m1-04). Mesmo molde das abas anteriores
  (Reactive Forms + Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção"). `DescansoPage`
  (`paginas/descanso/`) tem 3 cards: **(1) Configuração** — `<select>` de tipo/qualidade/refeição/interrupção +
  steppers Vigor/Destreza (0–12) e Nível (0–20); **(2) Resultado determinístico** — faixa mín–máx de Vida
  (accent) e Energia (`--energy`) + fórmula e notas contextuais, tudo de `calcularDescanso`; **(3) Rolar Dados** —
  dois campos de texto para dados extras (`interpretarDadosExtras`), botão de rolagem e o resultado por track
  com memória de cálculo. **Estado em Signals**: `bruto` (`toSignal` do `valueChanges`) → `entrada` (`computed`
  que normaliza os `<select>` Sim/Não em boolean) → um `computed` por saída. **Rolagem animada** (efeito
  scramble): `rolar()` embaralha números aleatórios por ~650ms via `requestAnimationFrame` antes de assentar no
  valor final (paridade com o `scramble` do site), com um pulso de escala via `Element.animate` (WAAPI —
  **sem `@angular/animations`**, que o projeto não instala); o **único não-determinismo vive na página** e usa a
  utilidade `rolarDados` do domínio (§6.6), delegando o total a `calcularResultadoDescanso`. Editar os dados
  extras re-rola sem animação se já houver resultado visível, e mudar a configuração esconde a rolagem antiga
  (paridade com `rollDescansoIfVisible`/`calcDescanso`). **Decisões de representação (não divergem de regra):**
  refeição e interrupção são `<select>` com valores string `'nao'`/`'sim'` (não boolean) porque o value accessor
  nativo do `<select>` escreve string — um controle boolean viraria a string `'sim'`, sempre truthy; a conversão
  para boolean acontece no `computed` `entrada`. `calculadora.routes.spec.ts` atualizado (`descanso` deixou de
  ser stub → agora checa `.calc` + aba ativa; só `compras` segue stub) e novo `descanso.page.spec.ts` prova a
  ligação motor→DOM (preset Curto/Adequado → Energia **1–4** / Vida "Não recupera"; Longo+Confortável+Refeição →
  Energia **1–12** / Vida **1–10**; rolagem Médio Nível 3 com `Math.random` fixo → **7** por track com breakdown
  `[1] + 6 = 7`). **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **26/26** (23
  anteriores + 3 novos); `build --workspace=frontend` verde **sem avisos de budget** (chunk lazy `descanso-page`).
  As 6 rotas seguem client-side (funcionam sem backend).
- **m1-08-pagina-dt-novo-agente-patente** (2026-07-05): as três páginas leves da calculadora, agrupadas por
  serem pequenas, cada uma consumindo seu domínio de `shared/regras` (regras prontas desde a m1-03) —
  **zero fórmula duplicada no front** (proibição de duplicar regra de jogo respeitada). Mesmo molde da
  `AgentePage` (Reactive Forms + Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção",
  layout fiel aos protótipos). **Aba `dt`** (`paginas/dt/`): `DtPage` — steppers Nível (0–20) e Atributo
  (0–12) → `calcularDtAtributo` (`10 + Nível + Atributo×2`) num resultado em destaque + a tabela de
  referência rápida (Atributo 1–6 × Nível 0/5/10/15/20, **cada célula também vinda do motor**, não recalculada
  no front). **Aba `novo-agente`** (`paginas/novo-agente/`): `NovoAgentePage` — `<select>` de motivo de
  entrada + steppers de média de Nível (passo 0,1) e média de Prestígio → `calcularNovoAgente` (Nível/Prestígio
  iniciais, patente resultante, memória de cálculo e aviso de Amaldiçoado pelo Passado). O card de bônus tem um
  campo de Prestígio **auto-preenchido** com o inicial calculado e **editável** (paridade com o `bonus-prest` do
  site antigo, via `merge` dos `valueChanges` da configuração re-sincronizando o campo), computando
  `calcularBonusMonetario`. O re-sync lê de `getRawValue()` (não do Signal `bruto`): como o `valueChanges` do
  controle-filho emite **antes** do form-pai, ler o Signal dentro do subscriber pegaria o valor defasado um passo
  — o modelo do form já está atualizado (bug pego na revisão, com teste de interação que o trava). **Aba `patente`** (`paginas/patente/`): `PatentePage` — stepper de Prestígio →
  `calcularPatente` (patente atual em destaque + tabela completa com a linha atual marcada); a faixa da última
  patente exibe `∞` (o motor entrega `prestigioMaximo` infinito). **Rótulos de UI** (`modules/calculadora/rotulos.ts`):
  `ROTULOS_PATENTE` (`PatenteEnum`→pt-BR, nomes completos do documento — "Força Tarefa Especial"/"Operações
  Especiais") e `ROTULOS_MOTIVO_ENTRADA` (`MotivoEntradaAgenteEnum`→pt-BR) — **formatação de UI**, como o
  `null`→"N/A" da m1-07; a fonte da verdade dos valores segue nos enums do `shared`. **Decisões de representação
  (não divergem de regra):** o cabeçalho de cada aba do protótipo não é repetido (o `CalculadoraShell` já dá o
  chrome); os textos do `<select>` de motivo usam "sucessor convencional / sucessor Experimento" (nomes do
  documento) no lugar de "Regular/Experimento" do site antigo; moeda formatada com `toLocaleString('pt-BR')` e
  prefixo `$` (paridade com o site). **O multiplicador monetário da patente foi omitido da UI** (a pedido do
  autor — confundia mais que ajudava): sai do stat box e da coluna "Mult." da aba `patente` e da linha de info do
  bônus; a fórmula do bônus segue usando-o por baixo (`calcularBonusMonetario`), só não o expõe. **Estilo:** cada página tem seu `.scss` **scoped auto-contido** copiando só
  os blocos BEM que usa (`.calc-cartao`/`.calc-stat`/`.calc-tabela`… de `docs/design/tema/_componentes.scss`) —
  mesmo padrão da `agente` (uma tentativa inicial de parcial `@use` compartilhado foi revertida por estourar o
  budget de 4kB de estilo por componente do Angular, que o `@use` inflava ao inlinar tudo em cada página).
  `calculadora.routes.spec.ts` atualizado (dt/novo-agente/patente deixaram de ser stubs → agora checam `.calc` +
  aba ativa; só `descanso`/`compras` seguem stub) e três novos specs provam a ligação motor→DOM (DT Nível 0/Atr 1
  → **12** + linha ATR 1 = 12/17/22/27/32; Novo Agente preset Morte média 5/10 → Nível **4**/Prestígio **9**/patente
  **Experiente**/bônus **$ 9.000**; Patente Prestígio 0 → **Agente** 0–2 e Prestígio 70 → **Líder Operacional** 66–∞).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **23/23** (16 anteriores + 7 novos,
  incluindo o teste de re-sync do bônus);
  `build --workspace=frontend` verde **sem avisos de budget** (chunks lazy `dt-page`/`novo-agente-page`/`patente-page`).
  As 6 rotas seguem client-side (funcionam sem backend).
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
