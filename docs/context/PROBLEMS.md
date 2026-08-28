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

### P-034 — Biblioteca de componentes existe como catálogo copiado, não como código · `ABERTO` · frontend/design system

- **Sintoma:** o mesmo bloco visual é declarado em dezenas de lugares. Medido em 2026-08-28:
  `.botao` em **20** arquivos `.scss` (24 telas), `.campo` em 17 componentes (uma versão cada),
  `.stat` em 5 (13 telas), `.card` em 5, `.stepper` em 4, `.chip-classificacao` em 3. O frontend
  tem **32.393 linhas de SCSS para 21.681 de template** — mais estilo do que marcação. Vinte
  implementações de botão só coincidem enquanto ninguém mexer, e o gate visual da proibição #31
  precisa provar à mão, tela a tela, o que deveria ser garantido por construção.
- **Causa:** a convenção manda copiar. `docs/design/tema/_componentes.scss` (292 linhas, 8 blocos)
  **não entra no build** — `styles.scss` importa `tokens`, `base`, `breakpoints`,
  `utilitario-flutuante` e o Tailwind —, e `DESIGN.md`/`CONVENTIONS.md` instruem "copie o bloco
  BEM necessário para o `.scss` scoped do componente". O catálogo é fonte de cópia, não código.
  A biblioteca de fato do projeto (`shared/`, 18 componentes + 6 diretivas) é a camada **composta**;
  a camada de primitivos nunca foi construída.
- **Contorno:** nenhum. Convive-se copiando o bloco onde ainda não há primitivo, e conferindo a
  olho no gate visual.
- **Correção:** a série `ui-01`…`ui-05` (`docs/specs/backlog/ui-biblioteca-componentes.spec.md`):
  criar `frontend/src/app/shared/ui/`, adotar os primitivos módulo a módulo e remover o PrimeNG,
  que hoje entrega só `p-dialog` (14 tags), `p-toast`/`MessageService` e o preset de tema.
  **`ui-01` fechou em 2026-08-28**: `shared/ui/` existe com `app-botao` e `app-campo`, adotados
  em `autenticacao`; a auditoria corrigiu dois números do Sintoma acima — os blocos `.campo` de
  topo são **4** (o "17" contava ocorrências do texto, não declarações), e a duplicação do campo
  vive sob nomes locais (40 blocos `&__rotulo`). Falta o resto: `ui-02`…`ui-05`.
- **Desde:** desde sempre — a instrução de copiar está no handoff de design original. Medido e
  registrado na auditoria de 2026-08-28.

### P-033 — Suíte de `PainelEncontro` não monta o serviço colaborativo recém-injetado · `ABERTO` · frontend/testes

- **Sintoma:** os 53 casos de `frontend/src/app/modules/encontro/paginas/painel/painel-encontro.page.spec.ts` falham antes das asserções ao montar o componente.
- **Causa:** o `CadernoEsquadraoColaborativoService`, transitivamente criado por `CadernoFlutuante`, lê `TempoRealService.paginaEsquadraoAtualizada$`, mas o double de `TempoRealService` desse spec não fornece os novos observables de página de esquadrão; o construtor lança `TypeError: Cannot read properties of undefined (reading 'pipe')`.
- **Contorno:** validar os recortes afetados por outros testes/build enquanto o spec do Encontro não receber o double atualizado.
- **Correção:** estender o mock de `TempoRealService` do spec com `paginaEsquadraoAtualizada$` e `paginaEsquadraoExcluida$` (observables) e rodar a suíte do frontend.
- **Desde:** reencontrado ao validar `renomear-painel-para-campanhas` em 2026-08-28.

### P-032 — Convenção `alterar`/`alterado` ainda violada em identificadores existentes · `ABERTO` · compartilhado/frontend

- **Sintoma:** identificadores de produção ainda usam `atualizar`/`atualizado`, contrariando a proibição explícita de `CONVENTIONS.md`. O passe de `skills-08` reencontrou ao menos `shared/src/dtos/campanha/campanha.dtos.ts:67` (`atualizadoEm`) e `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts:110` (`atualizarDados`); a auditoria também mostra outros pontos, portanto não é defeito isolado.
- **Causa:** não investigada; não havia passe mecânico de convenções no fecho das tasks.
- **Contorno:** consumir os contratos/métodos atuais como estão; novos identificadores devem usar `alterar`/`alterado`.
- **Correção:** especificar e executar uma migração de nomenclatura com todos os chamadores, testes e possível contrato público mapeados — não renomear de passagem.
- **Desde:** anterior a `skills-08` (reencontrado em 2026-08-27).

### P-031 — Quatro migrations usam `ck_` em vez de `chk_` em CHECK constraint · `ABERTO` · backend/schema

- **Sintoma:** `docs/CONVENTIONS.md` documenta o prefixo `chk_` para CHECK constraint, e
  `0018 - Caderno de campanha e busca textual.sql` segue isso (`chk_pagina_caderno_titulo`,
  `chk_pagina_caderno_conteudo`). Mas `0021 - Tabelas encontro, encontro_combatente e
  encontro_evento.sql`, `0022`, `0023` e `0024` usam `ck_` (`ck_encontro_combatente_origem`,
  `ck_encontro_combatente_turnos_por_rodada`, `ck_rolagem_origem`) — prefixo errado e
  inconsistente com o resto do schema.
- **Causa:** não investigada — as quatro migrations são da mesma leva (M7, encontro de combate),
  provavelmente copiaram o prefixo umas das outras sem conferir contra `CONVENTIONS.md`.
- **Contorno:** nenhum — o prefixo errado já está aplicado em produção; renomear a constraint é
  uma migration nova (`ALTER TABLE ... RENAME CONSTRAINT ...`), não um problema de leitura.
- **Correção:** migration `ALTER TABLE ... RENAME CONSTRAINT ck_x TO chk_x` para as quatro
  constraints, quando alguém for mexer nessa área de qualquer forma (renomear constraint isolada
  não vale task própria).
- **Desde:** achado durante `skills-05` (criação da skill `sql-migrations`, 2026-08-27) ao
  conferir se `0021` exemplifica bem os prefixos do `CONVENTIONS.md` antes de citá-la como
  referência.

### P-030 — Vida/Energia/Defesa/Esquiva/Bloqueio divergem entre a ficha e o painel do mestre · `ABERTO` · backend/ficha/encontro

- **Sintoma:** o mini-card do Esquadrão (painel do mestre, `campanha/detalhe`) e o cartão de
  combatente da Iniciativa mostram números menores de Vida máxima e Esquiva (e, pela mesma causa,
  potencialmente Energia máxima/Defesa/Bloqueio) do que a ficha do mesmo agente aberta ao lado —
  exemplo real do autor: `128`/`24` no painel contra `135`/`32` na ficha.
- **Causa:** esses stats têm um valor **stored/calculado** persistido no JSONB (`dados.derivados`/
  `dados.estado`) e um valor **efetivo** que a ficha soma por cima só na leitura (bônus de
  amplificadores portados e de itens de Proteção equipados, nunca persistido de volta — filosofia
  intencional, m3-10/m3-43). `FichaService.paraResumoPublico` e o mapper do Encontro
  (`encontro-combatente.mapper.ts`) leem só o stored, sem aplicar esse "por cima" — mesma lacuna que
  `contraAtaque` já teve parcialmente corrigida (`calcularContraAtaqueAoVivo`, m3-39), mas para um
  problema diferente e sem cobrir amplificador/equipamento.
- **Contorno:** nenhum — reabrir a ficha do agente mostra o valor correto; o painel do mestre e a
  Iniciativa continuam desatualizados até a correção.
- **Correção:** executar `docs/specs/backlog/ficha-resumo-stats-efetivos.spec.md`, que centraliza o
  cálculo "efetivo" numa função pura compartilhada e a aplica nos dois consumidores de backend.
- **Desde:** reportado pelo autor em 2026-08-27.

### P-029 — Bônus de Maestria de Vigor e Tanque alcançam resistência criada por modificação · `ABERTO` · regras/inventário

- **Sintoma:** em uma Proteção com tipo de resistência criado por modificação — por exemplo,
  Armadura Pesada + Hazmat — o cálculo atual soma indevidamente a Maestria de Vigor e Tanque ao
  novo tipo Químico, embora ele não exista na Proteção-base da loja.
- **Causa:** `montarResistencias` e a formatação do Inventário aplicam os bônus sobre o stat final
  já fundido com modificações, sem distinguir os tipos de dano nativos da Proteção.
- **Contorno:** não aplicar Hazmat, Antibombas ou uma modificação `RESISTENCIA` que crie tipo novo
  enquanto a ficha tiver Maestria de Vigor ou Tanque, caso se queira evitar o valor incorreto.
- **Correção:** executar `docs/specs/backlog/resistencia-protecao-base-bonus.spec.md`, aplicando os
  dois bônus somente aos tipos da resistência-base da Proteção e mantendo o mesmo recorte na ficha,
  no catálogo e no Encontro.
- **Desde:** refinamento solicitado pelo autor em 2026-08-26, após `maestrias-efeitos.spec.md`.

### P-028 — Maestria de Vigor sem verificação visual ao vivo · `CONTORNADO` · processo/frontend

- **Sintoma:** o commit `0e439b0` aplica a Maestria de Vigor às resistências das Proteções, no
  Inventário, no catálogo "Adicionar itens" e no Encontro, mas ainda não há evidência visual na
  aplicação real de que `3 [Balístico]` vira `9 [Balístico]` com Vigor 6, sem overflow nem
  regressão de responsividade.
- **Causa:** a implementação foi commitada antes da sessão autenticada necessária para observar a
  ficha real e o catálogo nos dois viewports obrigatórios.
- **Contorno:** testes unitários focados, lint e builds estão verdes; eles cobrem o cálculo e a
  renderização estrutural, mas não substituem a inspeção ao vivo.
- **Correção:** iniciar a aplicação local, entrar com o cenário de desenvolvimento, ativar Maestria
  de Vigor numa ficha com uma Proteção e conferir Inventário + "Adicionar itens" em `1920×1080` e
  `360×800`; então remover este item, mover a spec para `done/` e registrar o fecho em
  `HISTORY.md`/`CONTEXT.md`.
- **Desde:** `maestrias-efeitos.spec.md` / commit `0e439b0` (2026-08-25).

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
