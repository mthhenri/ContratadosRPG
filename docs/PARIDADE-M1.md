# PARIDADE-M1.md — Verificação de Paridade da Calculadora

> Fecha o milestone **M1 — Calculadora com paridade** (task `m1-14`). Registra a
> verificação lado a lado das 6 abas, a checagem de "sem duplicação de regra" e o estado
> de deploy/arquivamento (e, na §6, o refinamento mobile — task `m1-15`).
Última atualização: 2026-07-06.

## Método de verificação

O repositório antigo (`contratados-calculadora`, SPA vanilla — `src/script.js`, ~2.200
linhas) **não está neste monorepo nem no histórico do Git** (confirmado por
`find`/`git log` nesta sessão): é projeto à parte, publicado em
<https://github.com/mthhenri/contratados-calculadora>. Uma comparação binária lado a lado
com o arquivo antigo, portanto, não é possível a partir deste repositório.

A paridade é verificada, como a própria milestone autoriza, contra a **fonte da verdade das
regras** — `docs/core/sistema-v4.1.0.md` — que **vence sobre o código antigo** em qualquer
conflito (`m1-calculadora-paridade.spec.md` → "Fonte de Migração"; SYSTEM.SPEC §1.1). Cada
domínio de `shared/regras` foi extraído e conferido contra o documento nas tasks `m1-02` a
`m1-05`, com os exemplos numéricos do documento replicados em teste unitário. As divergências
encontradas contra o `script.js` estão resolvidas a favor do documento e listadas abaixo.

## 1. Checklist de paridade por aba

| Aba | Rota | Domínio de regras | Página | Status |
|---|---|---|---|---|
| Agente | `/calculadora/agente` | `shared/regras/agente` (m1-02) | `AgentePage` (m1-07) | ✅ paridade |
| DT | `/calculadora/dt` | `shared/regras/dt` (m1-03) | `DtPage` (m1-08) | ✅ paridade |
| Novo Agente | `/calculadora/novo-agente` | `shared/regras/novo-agente` (m1-03) | `NovoAgentePage` (m1-08) | ✅ paridade |
| Patente | `/calculadora/patente` | `shared/regras/patente` (m1-03) | `PatentePage` (m1-08) | ✅ paridade |
| Descanso | `/calculadora/descanso` | `shared/regras/descanso` (m1-04) | `DescansoPage` (m1-09) | ✅ paridade (inclui rolagem animada) |
| Compras | `/calculadora/compras` | `shared/regras/compras` (m1-05) | `ComprasPage` (m1-10/11) | ✅ paridade (inclui persistência + export/import) |

Extras de paridade funcional (entregável 4 da milestone): persistência do carrinho em
`localStorage` e export/import por código (m1-11); conteúdo de ajuda por aba (m1-12); sistema
de temas em runtime — presets, claro/escuro e color picker com trava de contraste (m1-13).

## 2. Divergências encontradas — resolvidas a favor do documento

| # | Aba | Divergência (site antigo × documento) | Resolução |
|---|---|---|---|
| 1 | Agente | **Limite de Energia** era `(Vigor + Destreza) × 2` no `script.js`; o documento define `Destreza × 2` (agente) / `Destreza` (civil) | Implementado conforme o documento (m1-02). Único stat que **intencionalmente** diverge do site antigo — o front nunca reintroduz a fórmula antiga |
| 2 | Compras | Modificações de **Armazenamento** somavam peso `0,2`/stack no site; o documento diz que "não agregam nenhum peso" | `peso: 0` nessas mods (m1-05) |
| 3 | Compras | Formato de **export/import** de carrinho do site antigo não pôde ser inspecionado (repo ausente) | Formato próprio `CRPG-COMPRAS-V1:<base64>`, incompatível por construção; a UI de importação avisa a quebra (m1-11) |
| 4 | Todas | Texto de **ajuda** (`HELP_CONTENT`) do site antigo indisponível | Reescrito como guia de "como usar cada página" a partir do comportamento implementado e conferido contra o documento; sem regra de jogo nova (m1-12) |

Divergências 3 e 4 são quebras de paridade **textual/serialização** documentadas (impostas
pela ausência do repo antigo), não divergências de regra de jogo. Nenhuma outra divergência
numérica vs. `script.js` foi encontrada nas extrações.

## 3. Verificação de "sem duplicação de regra"

**Resultado: aprovado.** Nenhuma regra de jogo vive no frontend ou no backend — tudo em
`shared/regras`.

- As 6 páginas importam suas fórmulas de `@contratados-rpg/shared/regras/<domínio>` e apenas
  orquestram estado (Signals) e formatação de UI. O backend não importa `shared/regras`
  (ainda sem módulo de negócio).
- **Achado corrigido nesta task:** `compras.page.ts` recalculava o custo do amplificador
  (`3000 + (stacks−1)×1000`) e a penalidade de Vontade (`(stacks−1)×2`) com constantes de
  regra embutidas. Passou a consumir `calcularCustoAmplificador()` e
  `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras` — zero constante de regra
  no front.
- Aritmética remanescente nas páginas é de UI (clamp/arredondamento do `StepInput`, `Math.min`
  de teto de empilhamento para habilitar botões, memória de cálculo exibindo subtração de
  valores já entregues pelo motor) — não reimplementa fórmula nem tabela do documento.

**100% das fórmulas testadas:** `npm run test --workspace=shared` → **143/143 verde** (17
arquivos de teste, um por domínio, com os exemplos do documento replicados). Frontend:
**54/54 verde** (ligação motor→DOM por página).

## 4. Offline do backend

A calculadora é 100% client-side: 6 rotas públicas `lazy`, sem guard, sem chamada HTTP à API.
O Render dormindo (free tier) não afeta nenhuma aba. `npm run build --workspace=frontend`
gera o bundle estático (inicial 532,49 kB < budget 560 kB, sem avisos), servível pela
Cloudflare Pages sem backend.

## 5. Deploy de produção e arquivamento — passos operacionais

Estes dois itens dependem de ação nas plataformas (fora do que o código controla):

- [ ] **Cloudflare Pages no ar:** conectar o projeto Pages ao Git com **branch de produção
  `master`** (Auto-Deploy). No push para `master`, o build estático é publicado
  automaticamente. Runbook em [DEPLOY.md](DEPLOY.md). Validar a calculadora no ar **com o
  Render dormindo** (deve funcionar).
- [ ] **Arquivar `contratados-calculadora`:** marcar o repositório antigo como *Archived* no
  GitHub. As referências na documentação deste repo (`README.md`, `docs/CONTEXT.md`) já
  descrevem o repo antigo como arquivado após o M1.

Enquanto esses dois passos de plataforma não forem executados pelo autor, o M1 está
**completo no código** (paridade funcional das 6 abas, regras extraídas e testadas, sem
duplicação); resta apenas a publicação e o toggle de arquivamento.

## 6. Refinamento mobile (task `m1-15`) — verificação responsiva

Task de refinamento adicionada após o fechamento da paridade: otimização da UI/UX **mobile**
das 6 abas, do shell e dos painéis (ajuda/tema/carrinho), sem tocar em regra de jogo
(`shared/regras` intocado). **Fonte única de breakpoint:** `frontend/src/styles/tema/_breakpoints.scss`
(`$bp-mobile: 560px` + mixin `mobile` + `$alvo-toque: 44px`) — media queries são resolvidas
em tempo de compilação e não leem CSS custom properties, por isso o breakpoint é token Sass,
não `var(--…)`; nenhuma largura mágica é repetida por arquivo. A densidade mobile vem de
**override de token** (`--pad-card`/`--gap-grid` reduzidos em `@media` no `styles.scss`),
refluindo todos os cards/grids de uma vez. Trava de scroll horizontal: `overflow-x: clip` em
`html`/`.conteudo`; conteúdo largo (tabelas de DT/Patente, textarea de código) já rola no
próprio container (`overflow-x: auto`).

**Método:** verificação analítica do layout compilado nas larguras de referência (o layout é
dirigido por grids `auto-fit`/`auto-fill minmax`, cujo nº de colunas é determinístico), somada
à evidência de `lint`/`test`/`build` verdes. Não foram capturados screenshots de dispositivo.

Colunas por grade nas larguras de referência (corpo → conteúdo −24px de padding → card −30px):

| Grade (aba) | `minmax` | 360px | 390px | 430px |
|---|---|---|---|---|
| Config (todas) | 220–240px | 1 | 1 | 1 |
| Atributos (agente) | 120px | 2 | 2 | 2 |
| Hero Vida/Energia (agente) | 140px | 2 | 2 | 2 |
| Stats secundárias (agente) | 150px | 1 | 2 | 2 |
| Stats (novo-agente/patente) | 150px | 1 | 2 | 2 |
| Faixa (descanso) | 180px | 1 | 1 | 2 |
| Resumo/catálogo/mods (compras) | 160–220px | 1 | 1–2 | 2 |

Nenhuma grade excede a largura do container em ~360px → **zero scroll horizontal do body**.
Alvos de toque de 44px aplicados no mobile: botões −/+ do `StepInput`, abas do shell (que no
mobile viram uma **barra flutuante fixa no rodapé** — ícone sobre rótulo, 6 itens distribuídos
por igual, deep-link por rota preservado, respeitando a área segura do iOS e reservando espaço
no fim do conteúdo para não sobrepor), chips de categoria e mini-botões do carrinho,
opções/swatches/color-picker do painel de tema. Os três modais (ajuda, tema, exportar/importar)
ganham `max-height: calc(100dvh - 32px)` + `overflow-y: auto` e largura fluida dentro do overlay
de 16px, ficando operáveis com o polegar. Identidade preservada (dark base + IBM Plex + grid +
cards), tudo via tokens (nenhum hex/fonte/raio solto).

**Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **54/54**; `test
--workspace=shared` **143/143**; `build --workspace=frontend` verde, inicial **533,27 kB** <
560 kB, sem avisos de budget (o `anyComponentStyle` `maximumWarning` subiu 8→**10 kB**, erro
mantido em 12 kB, para acomodar o SCSS responsivo da aba `compras` — a mais pesada; mesmo
precedente das elevações de budget em `m1-10`/`m1-13`).
