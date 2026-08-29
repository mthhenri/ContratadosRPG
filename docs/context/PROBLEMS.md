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

### P-039 — Caderno do Esquadrão sem presença nem cursores remotos · `ABERTO` · frontend/pagina-caderno

- **Sintoma:** `caderno-esquadrao-colaborativo.spec.md` (entregável 2) pede sincronização Yjs "incluindo
  reconexão, presença e cursores remotos no editor Milkdown". A reconexão/sincronização de conteúdo
  funciona (confirmado ao vivo, dois usuários editando a mesma página simultaneamente e reconectando
  sem perder texto), mas não existe em lugar nenhum do repositório nenhum uso de `y-protocols/awareness`
  nem qualquer indicador visual de "quem mais está editando" ou cursor remoto — busca por
  `awareness`/`presença`/`cursorRemoto` em `frontend/src` e `backend/src` não encontra nada.
- **Causa:** a implementação (commits `a7304ec`…`ca37bdd`) cobriu a persistência CRDT, o broadcast
  Socket.IO pós-gravação e o terceiro modo do Caderno, mas nunca chegou a implementar o protocolo de
  `awareness` do Yjs; o trabalho nunca foi registrado em `HISTORY.md`, então esse recorte pendente
  também nunca tinha sido escrito em lugar nenhum.
- **Contorno:** edição concorrente funciona e mescla corretamente sem indicador de presença — o
  usuário só não vê, em tempo real, quem mais está na mesma página nem onde está o cursor de outro
  colaborador.
- **Correção:** implementar `y-protocols/awareness` sobre o mesmo `Y.Doc`/canal Socket.IO já
  existente e um indicador visual no editor Milkdown (o plugin `@milkdown/plugin-collab` já expõe
  binding para isso).
- **Desde:** `caderno-esquadrao-colaborativo.spec.md`, entregável nunca fechado — achado ao
  verificar a spec ao vivo em 2026-08-29 antes de movê-la para `done/` (ela permanece em `active/`
  por causa deste item).

### P-038 — Suíte do frontend tem expectativas anteriores à UI-04 e um foco assíncrono órfão · `ABERTO` · frontend/testes

- **Sintoma:** a suíte completa termina com 3 falhas em 2 arquivos: dois casos de
  `campanha/paginas/detalhe` esperam dados que não aparecem no fixture atual, e
  `painel-encontro.page.spec.ts` espera que o modal não exista no DOM. Há ainda um erro não
  tratado de `leitor-documentos.component.ts:206` tentando chamar `focus()` depois do teardown.
- **Causa:** os doubles/assertivas dos recortes de campanha e encontro não acompanharam a adoção
  dos primitivos da UI-04; o timeout do leitor de documentos não verifica a existência do alvo.
- **Contorno:** build, lint e os testes focados continuam utilizáveis; a suíte ampla fica vermelha
  até os três recortes receberem fixtures/assertivas e cleanup atualizados.
- **Correção:** atualizar os doubles de `CampanhaDetalhe` e a expectativa do modal no
  `PainelEncontro`; cancelar ou proteger o timeout de foco em `LeitorDocumentos`.
- **Desde:** reencontrado no gate da `ui-05`, em 2026-08-29.

### P-036 — `var(--danger)` não existe em nenhum token — badge "Privada" da bandeja de dados sem cor · `ABERTO` · frontend/tema

- **Sintoma:** `bandeja-dados.component.scss` (`&__visibilidade--privada`) usa `var(--danger)` em
  três declarações (`color`, `border-color` via `color-mix`, `background` via `color-mix`) — mas
  `--danger` não é definido em `_tokens.scss` nem em nenhum outro parcial do tema. O valor
  computado é inválido; o navegador ignora as três declarações e o badge "Privada" fica sem o
  destaque vermelho pretendido, herdando `color`/`background` do contexto (`--text-mute`/
  `transparent`) e o `border-color` genérico já presente logo acima na cascata.
- **Causa:** não investigada — provavelmente um token planejado (`--danger`) que nunca chegou a
  ser criado em `_tokens.scss`; o projeto usa `--vida` (vermelho fixo) para esse mesmo papel em
  outros lugares (ver `IDEAS.md` `I-024`).
- **Contorno:** nenhum — o badge continua funcional (o ícone e o texto "Privada" identificam a
  rolagem), só sem o destaque de cor.
- **Correção:** trocar as três ocorrências de `var(--danger)` por `var(--vida)` (mesmo papel
  semântico de vermelho fixo, independente do accent) — mudança de uma linha, fora do escopo desta
  task por não tocar `bandeja-dados`.
- **Desde:** achado ao pesquisar tokens de cor fixa para a severidade `erro` de `Notificacao`
  (ui-02, 2026-08-28) — não investigado há quanto tempo o token está quebrado.

### P-035 — Botão preenchido com o accent fica abaixo de 4,5:1 para texto normal · `ABERTO` · frontend/acessibilidade

- **Sintoma:** medido no DOM real em 2026-08-28, durante o gate visual da `ui-01b`: o botão
  `variante="primario"` preenchido dá **4,00:1** entre o fundo (`--accent` `#d53030`, base padrão)
  e o texto (`--bg`). O rótulo desses botões é texto normal (12–13px), para o qual o WCAG AA pede
  **4,5:1**. As demais severidades preenchidas passam com folga — `positivo` 5,90, `info` 5,62,
  `ajuda` 5,59, `aviso` 8,71, `secundario` 13,63, `contraste` 18,08. `perigo` empata com
  `primario` porque usa o mesmo `--accent`.
- **Causa:** a trava de contraste do `TemaService` (`CONTRASTE_MINIMO = 3`, em
  `frontend/src/app/core/services/tema.service.ts`) é deliberadamente o piso de 3:1 do AA para
  **componentes de interface e texto grande**, e valida o accent contra a **superfície** — não o
  caso "texto de `--bg` sobre preenchimento de accent", que é o do botão primário. O accent também
  é trocável em runtime, então o número varia por usuário; 4,00 é o da base padrão.
- **Contorno:** nenhum. O botão é legível na prática (falha por 0,5 ponto, não por ordem de
  grandeza), só não atinge o piso de texto normal.
- **Correção:** decidir entre escurecer o texto do botão preenchido, clarear o accent da base
  padrão, ou subir `CONTRASTE_MINIMO` para 4,5 com uma segunda checagem no par accent×`--bg`. É
  decisão de identidade visual, não de implementação — precisa passar pelo autor e por
  `docs/design/`.
- **Desde:** existe desde o botão primário original; medido e registrado na `ui-01b` (2026-08-28).

### P-033 — Expectativa de modal em `PainelEncontro` não acompanha o primitivo nativo · `ABERTO` · frontend/testes

- **Sintoma:** o caso de visão do jogador em
  `painel-encontro.page.spec.ts:654` espera não encontrar `[role="dialog"]`, mas o `app-modal`
  nativo permanece no DOM fechado.
- **Causa:** a asserção foi escrita para o ciclo do dialog anterior, no qual o overlay não existia
  quando fechado; o primitivo atual preserva a semântica nativa de `<dialog>`.
- **Contorno:** validar o recorte por build e pelos testes focados enquanto a asserção não é
  atualizada.
- **Correção:** trocar a expectativa de ausência pela de modal fechado (`open = false`) e rodar a
  suíte do frontend.
- **Desde:** reencontrado ao validar a `ui-05`, em 2026-08-29.

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
