# PROBLEMS.md — Problemas Conhecidos

> **O que entra aqui:** o que está **quebrado, degradado ou aceito como dívida agora**. Um item
> existe aqui enquanto o problema existe. Quando o problema é resolvido, o item **sai deste
> arquivo** — o relato da correção vive em [`HISTORY.md`](HISTORY.md), não aqui.
>
> **O que NÃO entra aqui:** feature que falta (isso é spec no `docs/specs/backlog/`), ideia
> (isso é [`IDEAS.md`](IDEAS.md)), e decisão consciente de design que está funcionando como
> desejado (isso é `CONTEXT.md` §5).
>
> **Estados:** `ABERTO` (dói e não tem contorno) · `CONTORNADO` (dói, mas existe um jeito de
> conviver — o contorno está descrito) · `ACEITO` (não vai ser corrigido; fica registrado para
> ninguém "descobrir" de novo).
>
> **Formato de entrada** — copie o bloco abaixo, numere sequencialmente e **não reaproveite
> número de item removido**:
>
> ```markdown
> ### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

### P-001 — Teste de "apelido de equipamento" quebrado em `master` · `ABERTO` · frontend/testes

- **Sintoma:** a suíte do frontend fecha em **592/593**. A falha está em
  [ficha-inventario.component.spec.ts:594](../../frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.spec.ts#L594),
  `describe('apelido de equipamento (m3-33)')`.
- **Causa:** apontada nos registros como `ResizeObserver` no ambiente de teste — **não
  investigada a fundo**.
- **Contorno:** a falha é estável e isolada. Toda task desde a `m3-33` confirma que continua
  quebrada em `master` (via `git diff` vazio no arquivo) e reporta `N-1/N` sem tratar como
  regressão.
- **Correção:** desconhecida — precisa de uma investigação dedicada.
- **Desde:** `m3-33` (o teste nasceu junto com a feature e nunca passou em CI verde).
- **Custo real:** ele envenena o sinal. Uma suíte que nunca fecha verde faz toda task gastar
  tempo provando que *a falha dela* não é nova.

### P-002 — `HISTORY.md` sem registro desde a `m3-27` · `ABERTO` · processo

- **Sintoma:** o último bloco registrado é a `m3-27` (2026-07-29), mas **11 commits de trabalho
  real** entraram depois e não estão em lugar nenhum da documentação: histórico de rolagens virou
  barra lateral, ícone d20 (SVG + icosaedro facetado), gatilhos flutuantes na ficha, remoção do
  chip de campanha da topbar, mini-card do painel compactado com Patente/Defesa/Origem, "Remover da
  campanha" no menu de ações, skeletons do painel e da tela de Fichas, cálculo de **sobrecarregado**
  migrado de aproximação em SQL para o motor de compras, e o z-index da calculadora flutuante.
- **Causa:** o trabalho veio de branches `claude/*` mergeadas por PR (#7…#11), fora do fluxo
  spec-driven que atualiza a documentação no fecho da task.
- **Contorno:** `git log --no-merges --since=2026-07-29` recupera a lista.
- **Correção:** escrever o bloco retroativo desses 11 commits no `HISTORY.md`, ou aceitar
  explicitamente que trabalho vindo por PR não é registrado.
- **Desde:** 2026-07-29.

### P-003 — Backend não valida a estrutura do corpo das requisições · `ACEITO` · backend

- **Sintoma:** nenhum `ValidationPipe` está registrado. Um corpo malformado (campo ausente, tipo
  errado) chega **cru** no service.
- **Causa:** decisão consciente — DTOs são `interface readonly`, e o projeto não instala
  `class-validator` (ver `CONTEXT.md` §5). Sem classe não há decorator para o pipe ler.
- **Contorno:** as services validam regra de negócio e o TypeScript cobre o caminho do frontend
  próprio. O risco real é um cliente de terceiros ou uma chamada manual à API.
- **Correção:** ligar o `ValidationPipe` exigiria converter DTOs em classes — **não fazer sem
  pedir ao autor**, é reversão de decisão registrada.
- **Desde:** `m3-01`, quando a validação estrutural foi explicitamente adiada.

### P-004 — Budget do bundle vem sendo elevado em vez do bundle reduzido · `CONTORNADO` · frontend

- **Sintoma:** o bundle inicial de produção anda colado no teto. O budget do `angular.json` já foi
  elevado pelo menos quatro vezes (575kB → 580kB → 610kB inicial; 34kB → 35kB
  `anyComponentStyle`), sempre para acomodar o que entrou.
- **Causa:** cada task nova soma alguns kB e a saída mais barata é subir o número.
- **Contorno:** subir o budget de novo — é o que vem sendo feito.
- **Correção:** um passe de redução de verdade (auditar o que está no chunk inicial e empurrar para
  lazy). Nunca foi feito.
- **Desde:** `m1-06`, agravando desde então.

### P-005 — Barra de abas da ficha corta o "A" de "HISTÓRIA" no desktop · `ABERTO` · frontend/CSS

- **Sintoma:** a 1440px, a barra de abas tem `scrollWidth` de 575px contra `clientWidth` de 418px,
  cortando visualmente a última letra de "HISTÓRIA".
- **Causa:** o corte acontece num ancestral — a barra em si não tem `overflow-x` próprio, e o
  `overflow-x: clip` do `html` absorve sem gerar scroll do body.
- **Contorno:** nenhum. É cosmético e só no desktop.
- **Correção:** não determinada.
- **Desde:** medido durante a `m3-60`, declarado fora de escopo daquela spec e registrado para não
  se perder.

### P-006 — Dois passos operacionais do M1 nunca foram executados · `ABERTO` · operação

- **Sintoma:** o M1 está "concluído no código" mas dois itens de plataforma continuam
  desmarcados em [docs/PARIDADE-M1.md:83](../PARIDADE-M1.md#L83): (a) conectar o projeto
  **Cloudflare Pages** ao Git com a branch de produção correta e (b) marcar o repositório antigo
  `contratados-calculadora` como *Archived* no GitHub.
- **Causa:** são cliques em painel de plataforma, fora do que uma task de código fecha.
- **Contorno:** nenhum necessário — não bloqueia desenvolvimento.
- **Correção:** executar os dois passos e marcar os checkboxes.
- **Desde:** `m1-14`.

### P-007 — Cloudflare e Render publicam de branches diferentes · `CONTORNADO` · deploy

- **Sintoma:** sintomas fantasma em produção. O caso real: "Vida/Energia aparecendo em branco" —
  não havia bug de código nenhum.
- **Causa:** a Cloudflare Pages publica **preview de toda branch**, enquanto o Render só faz
  auto-deploy do `master`. Um frontend novo conversando com um backend velho produz telas
  incoerentes que parecem bug.
- **Contorno:** antes de investigar qualquer sintoma "só em produção", conferir se o `master` foi
  mergeado e se o Render já reimplantou.
- **Correção:** alinhar as branches de publicação das duas plataformas.
- **Desde:** diagnosticado durante a `m2-16d`.

### P-008 — Aba "Extras" e a Origem estão no lugar errado para um humano · `ACEITO` · UX

- **Sintoma:** na auditoria ao vivo da `m3-60`, a tarefa "o mestre perguntou da minha origem" leva
  a pessoa à aba **História** (ícone de documento) — e a Origem não está lá, está em **Extras**.
  Some-se que o ícone que nomeia "Extras" é o `mais` (`+`), o mesmo dos botões "Adicionar" do app
  inteiro.
- **Causa:** "Extras" nasceu como posição vazia reservada no redesenho da `m3-38` e foi preenchida
  pela `m3-49` sem revisitar o nome.
- **Contorno:** nenhum.
- **Correção:** renomear a aba e/ou mover a Origem para História.
- **Desde:** `m3-60` — **adiado por decisão explícita do dono**, registrado como dívida de
  nomenclatura.

### P-009 — `npm run lint` não fecha limpo em `frontend`/`backend` · `ABERTO` · processo/CI

- **Sintoma:** `npm run lint --workspace=frontend` falha com 3 erros (`autofocus` proibido em
  [ficha-inventario.component.html:58](../../frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html#L58),
  variável não usada em
  [ficha-visualizacao.component.spec.ts:1380](../../frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts#L1380)
  e em `acervo.page.spec.ts`); `npm run lint --workspace=backend` falha com 1 erro (variável não
  usada em
  [ficha.service.spec.ts:914](../../backend/src/modules/ficha/ficha.service.spec.ts#L914)).
- **Causa:** pré-existente em `master` — confirmado via `git stash` contra o HEAD comitado antes
  de qualquer mudança desta task. Não investigada a fundo (de qual commit veio, por que o CI não
  bloqueou o PR que introduziu).
- **Contorno:** nenhum. Os 4 arquivos não têm relação com nenhuma task em andamento no momento em
  que isto foi descoberto.
- **Correção:** remover o `autofocus`/trocar por foco programático; apagar as 3 variáveis não
  usadas (ou prefixar `_` se forem intencionais). Trivial, mas não é escopo de nenhuma task atual.
- **Desde:** descoberto durante a `m2-18` (2026-08-01); a raiz é anterior, não determinada.

### P-010 — Teste do link "Voltar" quebrado em `visualizar.page.spec.ts` · `ABERTO` · frontend/testes

- **Sintoma:** `FichaVisualizar > sob /fichas/:id ... > o link "Voltar" aponta pro acervo (/fichas)
  quando a ficha está solta` falha com `expected '' to contain 'Voltar ao acervo'` — o
  `.ficha-pagina__voltar` renderiza vazio.
- **Causa:** não investigada. Falha isolada (`ng test --include='**/visualizar.page.spec.ts'`, sem
  nenhuma outra spec no worker) contra o `HEAD` anterior à `m3-63` — nenhuma linha de
  `visualizar.page.*` foi tocada por essa nem por nenhuma task recente.
- **Contorno:** a falha é estável e isolada, mesmo padrão do `P-001`. Toda task que rodar a suíte
  cheia do frontend deve reportar como preexistente, não como regressão.
- **Correção:** desconhecida — precisa de investigação dedicada.
- **Desde:** descoberto durante a `m3-63` (2026-08-03); a raiz é anterior, não determinada.

### P-011 — Suíte de `shared` coleta specs compiladas de `dist` · `ABERTO` · shared/testes

- **Sintoma:** `npm test` no monorepo executa os **520** testes fonte de `shared` com sucesso, mas
  também descobre 29 arquivos `shared/dist/**/*.spec.js`. Esses artefatos CommonJS falham ao carregar
  o Vitest (`Vitest cannot be imported in a CommonJS module using require()`), encerrando a suíte com
  erro apesar de nenhum teste fonte falhar.
- **Causa:** a configuração do Vitest de `shared` não exclui `dist/`; o output da compilação contém
  cópias dos arquivos de teste e entra no padrão de descoberta.
- **Contorno:** executar a suíte somente sobre os fontes ou excluir `dist/**` na invocação local.
- **Correção:** excluir `dist/**` da descoberta padrão do Vitest de `shared` (preferencialmente no
  arquivo de configuração, para que `npm test` volte a ser confiável).
- **Desde:** descoberto na verificação final do ajuste da barra de filtros do inventário (2026-08-05).

## Resolvidos

Itens resolvidos **saem daqui**. O relato da correção fica no [`HISTORY.md`](HISTORY.md), junto da
task que a fez.

*(Nenhum item foi resolvido desde a criação deste arquivo em 2026-08-01.)*
