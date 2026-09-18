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

### P-070 — Card de Status estica pra bater com a coluna Identidade+Atributos, sobra vão em branco em aba curta · `ACEITO` · frontend

- **Sintoma:** nas fichas completas de jogador/criatura (linha com Identidade+Atributos de um lado
  e Status — Informações/Inventário/Habilidades/Rolagens/Extras/História — do outro), o card de
  Status sempre estica até a altura de Identidade+Atributos. Numa ficha com identidade "alta"
  (retrato, mais atributos) e uma aba de conteúdo curto (ex.: Habilidades com só 1-2 itens), sobra
  um vão em branco grande dentro do card, abaixo do conteúdo real. Achado ao vivo pelo autor em
  duas fichas (uma sintética e a própria "Sentinela Matheus", print da aba Habilidades com ~650px
  de vão).
- **Causa:** `.ficha-visao__coluna-agente` (Identidade+Atributos) e `.ficha-visao__coluna--status`
  são os dois itens de `.ficha-visao__linha-colunas` (`display:flex; align-items:stretch`,
  `ficha-visualizacao.component.scss`) — a altura de Status é sempre igual à de agente, e o
  conteúdo interno (`.ficha-cartao--status`/`.ficha-status__conteudo`, ambos `flex:1`) preenche
  essa altura mesmo quando o conteúdo real é muito menor.
- **Contorno:** nenhum.
- **Correção:** opções levantadas com o autor (2026-09-18) — (a) `align-items: flex-start` pra
  Status encolher pro próprio conteúdo (efeito colateral: uma aba muito longa, ex.: inventário
  grande, passa a rolar a página inteira em vez de só o card por dentro, perdendo o
  `contain:size`/`overflow:hidden` que hoje limita isso); (b) um teto de altura fixo (ex.: relativo
  à viewport) em vez de copiar a coluna vizinha, reduzindo o vão sem eliminá-lo por completo. O
  autor optou por manter o comportamento atual por ora.
- **Desde:** existe desde o redesenho "comparação visual" das 3 colunas (buscar por esse termo em
  `ficha-visualizacao.component.scss`); relatado pelo autor em 2026-09-18.

### P-068 — Teste "abre a dialog de duplicar" de `CampanhaDetalheMestre` quebrou (jogador) · `ABERTO` · frontend/teste

- **Sintoma:** `detalhe-mestre.page.spec.ts` — `abre a dialog de duplicar e chama
  FichaService.duplicarFicha ao confirmar` (cartão de **jogador**) falha com
  `TypeError: Cannot read properties of undefined (reading 'click')` ao tentar clicar em
  "Confirmar duplicação" — o `app-modal` de duplicar não abre depois do clique no item do menu.
- **Causa:** não investigada. Confirmado pré-existente (roda isolado e falha do mesmo jeito no
  commit `75271c7c` — "registro (SCP) editável na criatura e ícones de olho diferenciados",
  concorrente nesta mesma branch — antes de qualquer mudança da `criatura-card-esquadrao-mestre`
  tocar o arquivo). Suspeita, não confirmada: a técnica nova de ícone "base + selo" desse commit
  mudou a estrutura interna de `app-icone` nos 5 lugares que ele lista, um dos quais é o próprio
  menu "⋯" do cartão do Esquadrão.
- **Contorno:** nenhum — o teste falha isolado (`--filter="duplicar"`), não é efeito de ordem com
  outros testes.
- **Correção:** não investigada.
- **Desde:** commit `75271c7c` (2026-09-14), achado durante `criatura-card-esquadrao-mestre`
  (2026-09-15) ao rodar a suíte focada de `detalhe-mestre.page.spec.ts`.

### P-069 — `!== undefined` não cobre `null` vindo do SQL em campos opcionais do mini-card · `ABERTO` · frontend

- **Sintoma:** um campo opcional de `FichaResumoDto` (ex.: `defesa`/`esquiva`/`bloqueio`/
  `contraAtaque`) que a SQL devolve como `NULL` (coluna ausente no JSONB) chega ao cliente como
  `null` via JSON, não como `undefined` — um guard de template `@if (campo !== undefined)` (o
  padrão usado em `EspectadorFichaCard.espectador-ficha__reacoes`) não esconde a linha, e o rótulo
  aparece sem valor (ex.: "Def" sem número). Achado ao vivo em `CriaturaEsquadraoCard` (corrigido
  ali para `!= null`) — `EspectadorFichaCard` tem o mesmo padrão para os 4 campos e não foi
  corrigido (fora do escopo da task que achou o problema).
- **Causa:** `FichaResumoDto` tipa os campos como `?: number` (opcional), mas o valor real que
  atravessa a fronteira HTTP pode ser `null` — a assinatura TypeScript não distingue os dois, e o
  guard foi escrito pensando só em "propriedade ausente do objeto JS", não em "SQL NULL
  serializado".
- **Contorno:** nenhum — o card de jogador com classe sem Defesa/Esquiva/Bloqueio (Civil) pode
  estar mostrando rótulos vazios hoje; não verificado ao vivo para confirmar o alcance.
- **Correção:** trocar `!== undefined` por `!= null` nos 4 guards de
  `espectador-ficha-card.component.html`, ou (mais robusto) tipar `FichaResumoDto` como
  `number | null` nesses campos para o TypeScript forçar o guard certo em todo consumidor.
- **Desde:** provavelmente desde a criação de `EspectadorFichaCard` (m8-07); achado em
  `criatura-card-esquadrao-mestre` (2026-09-15).

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

### P-018 — Guia de criação não respeita as regras específicas do Civil · `ABERTO` · frontend

- **Sintoma:** o dono reportou que o guia de criação de personagem não respeita a mecânica de Civil.
  Um caso concreto encontrado: o passo // Novo agente (nível inicial "arredonda a média da campanha
  − 1", teto de 20, mais o Prestígio) roda **igual pra Civil** — o rótulo, o range do campo manual
  (`min=0 max=20` em "Nível inicial exato") e o resumo mostram "Nível"/"Prestígio" pro Civil também,
  mas `docs/core/sistema-v4.1.0.md` só define Treinamento 0–5 pra Civil (sem noção de Prestígio;
  `dadosCivil` — `shared/src/regras/dados/progressao-civil.dados.ts` — só tem entradas de 0 a 5). Um
  Civil que herda uma média de campanha acima de 5 vira um "Nível" fora da tabela, e
  `calcularProgressaoAcumulada`/`calcularBeneficiosNivel` devolvem lista vazia pra qualquer
  Treinamento > 5, sem avisar o jogador.
- **Causa:** não investigada por completo — o pipeline de "Novo agente"/progressão do guia
  (`criar.page.ts`: `novoAgente`, `nivelInicial`, `prestigioInicial`) não tem nenhum branch pra
  Civil; trata todas as classes com a mesma fórmula/teto/rótulo. Pode haver mais pontos do guia com
  o mesmo problema (o dono não detalhou todos) — escopo completo a confirmar com ele.
- **Contorno:** nenhum.
- **Correção:** escopo mapeado e specado em `docs/specs/backlog/civil-guia-criacao.spec.md`
  (2026-08-24) — cobre // Novo agente (Nível/Prestígio → Treinamento), // Atributos (base e
  orçamento de criação do Civil) e // Equipamento inicial (orçamento fixo, categorias vetadas).
  A spec depende de 4 decisões do dono antes de virar código; ver o arquivo. Outras divergências
  de Civil levantadas na mesma investigação (passo // Recursos, progressão pós-criação) ficaram
  fora do escopo escolhido pelo dono, registradas em "Fora de Escopo" da spec.
- **Desde:** reportado pelo dono em 2026-08-11.

### P-019 — `painel-flutuante.component.spec.ts` falha por ordem quando a suíte completa roda · `ABERTO` · frontend

- **Sintoma:** o teste "ao abrir, limita uma posição persistida que ficou fora do viewport e
  salva a correção" falha (`900px` em vez do `1280px` esperado) quando `npm run test
  --workspace=frontend` roda a suíte inteira, mas passa 18/18 quando rodado isolado
  (`--include=.../painel-flutuante.component.spec.ts`).
- **Causa:** não investigada — cheiro de vazamento de estado global entre specs (viewport,
  `localStorage` ou mock não resetado por outro arquivo que roda antes na mesma suíte), não do
  próprio teste ou do componente.
- **Contorno:** rodar o arquivo isolado quando for preciso confiar no resultado deste caso.
- **Correção:** isolar a causa do vazamento (bisseção de specs até achar o vizinho que deixa
  estado sujo).
- **Desde:** achado no gate de testes da `montador-rolagem-ajustes` (2026-09-17). O arquivo em si
  não foi tocado por esta task; não confirmado se já falhava assim antes dela.

### P-020 — `inventario-esquadrao.component.spec.ts` falha (busca do catálogo devolve 2 cards em vez de 1) · `ABERTO` · frontend

- **Sintoma:** o teste "filtra os itens do catálogo pela busca sem decorar o nome com ícone"
  espera `1` card (`.inventario-esquadrao__catalogo-item`) depois de buscar "Energético
  Concentrado", mas recebe `2`. Reproduz isolado (`--include=.../inventario-esquadrao.component.spec.ts`),
  não é sensível à ordem da suíte.
- **Causa:** não investigada.
- **Contorno:** nenhum.
- **Correção:** depurar o filtro de busca do catálogo do componente ou, se o catálogo de fixture do
  teste mudou, atualizar a expectativa.
- **Desde:** achado no gate de testes do fecho da `montador-rolagem-ajustes` (2026-09-17,
  `npm run test --workspace=frontend` completo). Sem relação com o arquivo alterado nesta task
  (`montador-rolagem/`); não confirmado se já falhava antes dela.

### P-022 — `montador-rolagem__tile--extra` (PROF/NIV) sem a cor apagada pedida no SCSS · `ABERTO` · frontend

- **Sintoma:** `montador-rolagem.component.scss` declara `.montador-rolagem__tile--extra { color:
  var(--text-dim); }` pros botões PROF/NIV (seção Atributo), mas na tela eles saem na cor accent
  (vermelha), não apagada — a regra nunca tem efeito.
- **Causa:** especificidade CSS. Esses botões usam `app-botao[variante="primario"][estilo="contorno"]`;
  a regra de severidade de `botao.component.scss` é `:host(.botao--primario.botao--estilo-contorno)`
  (duas classes dentro de `:host()`), mais específica que uma classe só vinda do SCSS do componente
  pai (`.montador-rolagem__tile--extra`) — sempre vence, goste ou não a cor coincidir. Mesmo
  mecanismo corrigido nos botões de "Tipo de dano" nesta mesma data (ver `HISTORY.md`), que resolveu
  omitindo `[variante]`/`[estilo]` do `app-botao` (padrão `ui-29d`) — não aplicado aqui porque
  PROF/NIV não foi pedido pelo autor desta vez.
- **Contorno:** nenhum — visualmente já "funciona" hoje porque a cor de `primario` (accent) é a que
  aparece, só não é a `--text-dim` que o comentário do SCSS promete.
- **Correção:** mesma receita do `--dano-*`: omitir `[variante]`/`[estilo]` nos botões PROF/NIV e
  declarar `border`/`background`/hover próprios em `&--extra`, se o autor confirmar que quer a cor
  apagada de fato (o SCSS já supõe que sim, mas nunca foi validado visualmente até agora).
- **Desde:** achado ao investigar por que `--dano-*` não pintava (2026-09-17) — não corrigido por
  estar fora do pedido da task, que era só os botões de tipo de dano.

### P-021 — `detalhe-mestre.page.spec.ts` falha ao confirmar duplicação de ficha (`Cannot read properties of undefined (reading 'click')`) · `ABERTO` · frontend

- **Sintoma:** o teste "abre a dialog de duplicar e chama FichaService.duplicarFicha ao confirmar"
  procura um botão com texto "Confirmar duplicação" na dialog e recebe `undefined` — o `.click()`
  seguinte lança `TypeError`. Reproduz isolado, não é sensível à ordem da suíte.
- **Causa:** não investigada — cheiro de rótulo do botão da dialog de confirmação ter mudado (ou a
  dialog não estar abrindo a tempo do teste procurar o botão).
- **Contorno:** nenhum.
- **Correção:** depurar a dialog de duplicação de `CampanhaDetalheMestre` — confirmar o rótulo
  atual do botão de confirmação e se o `fixture.detectChanges()`/espera antes da busca é
  suficiente.
- **Desde:** achado no gate de testes do fecho da `montador-rolagem-ajustes` (2026-09-17,
  `npm run test --workspace=frontend` completo). Sem relação com o arquivo alterado nesta task
  (`montador-rolagem/`); não confirmado se já falhava antes dela.

