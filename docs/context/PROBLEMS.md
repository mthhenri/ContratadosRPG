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
- **Correção:** não determinada — depende de mapear com o dono todas as regras de Civil que o guia
  hoje ignora (a começar pelo Treinamento 0–5 no lugar de Nível/Prestígio) antes de desenhar a
  correção.
- **Desde:** reportado pelo dono em 2026-08-11.

### P-019 — Seletor de Classe não segue o padrão de dois passos (base → arquétipo/subclasse) · `ABERTO` · frontend/UX

- **Sintoma:** o `<select>` único do passo // Classe
  ([criar.page.html:172](../../frontend/src/app/modules/ficha/paginas/criar/criar.page.html#L172))
  mistura, nos mesmos `<optgroup>`, as três classes-base, as três subclasses de Experimento e Civil
  — todas como opções de primeiro nível (`GRUPOS_CLASSE` —
  [opcoes-ficha.ts:22](../../frontend/src/app/modules/ficha/opcoes-ficha.ts#L22)). O dono quer um
  fluxo em dois passos: primeiro escolher a classe-base (Combatente/Especialista/Suporte) ou Civil;
  só então, se não for Civil, um segundo `<select>` escolhe entre os arquétipos regulares **e** a
  subclasse de Experimento daquela classe-base.
- **Causa:** o modelo de dados atual já trata Experimento como uma `ClasseEnum` própria e paralela
  (`EXPERIMENTO_BESTIAL`/`ARTIFICIAL`/`HIBRIDO`), não como "Combatente + subclasse Experimento" — é
  esse desenho que faz o `<select>` de Classe ter que listar Experimento junto das bases, em vez de
  como uma opção dentro do segundo seletor.
- **Contorno:** nenhum — hoje dá pra escolher tudo, só não no fluxo de dois passos pedido.
- **Correção:** não determinada — muda a experiência de seleção (dois `<select>` em cascata) e
  possivelmente como Experimento se relaciona com a classe-base no modelo; desenhar com o dono antes
  de mexer.
- **Desde:** reportado pelo dono em 2026-08-11.

## Resolvidos

Itens resolvidos **saem daqui**. O relato da correção fica no [`HISTORY.md`](HISTORY.md), junto da
task que a fez.

- **P-017** — migration `0012` (coluna `cor`) nunca rodou em produção. Resolvido em 2026-08-09,
  ver `HISTORY.md`.
- **P-013** — habilidade "Anomalia" não dobrava custo/efeito de Fragmentos. Resolvido em
  2026-08-10, ver `HISTORY.md`.
- **P-001** — teste de "apelido de equipamento" quebrado em `master`. Já corrigido pelo commit
  `0aa92c2` (2026-08-08), que só nunca chegou a ser refletido aqui; achado e fechado em 2026-08-11,
  ver `HISTORY.md`.
- **P-010** — teste do link "Voltar" quebrado em `visualizar.page.spec.ts`. Mesma causa e mesmo
  commit de correção do `P-001` (`0aa92c2`, 2026-08-08); achado e fechado em 2026-08-11, ver
  `HISTORY.md`.
- **P-011** — suíte de `shared` coletava specs compiladas de `dist/`. Já corrigido pelo
  `shared/tsconfig.build.json` (`8e3b757`, 2026-08-08), que passou a excluir `src/**/*.spec.ts` da
  build; nunca chegou a ser refletido aqui; achado e fechado em 2026-08-11, ver `HISTORY.md`.
- **P-009** — `npm run lint` não fechava limpo em `frontend`/`backend` (8 erros: `autofocus`,
  variáveis não usadas em specs, acessibilidade de clique em `criar.page.html`). Corrigido em
  2026-08-11, ver `HISTORY.md`.
- **P-012** — descrição de habilidade cortava sem aviso no seletor (`-webkit-line-clamp: 2` sem
  `text-overflow: ellipsis`). Corrigido em 2026-08-11, ver `HISTORY.md`.
- **P-015** — fragmento consumido sumia da Afinidade (e da redução de Energia que ela dá).
  Corrigido em 2026-08-11, ver `HISTORY.md`.
- **P-016** — fragmento Potencializador solto no inventário drenava Energia sem estar aplicado;
  revisão de regra autorizada pelo dono. Corrigido em 2026-08-11, ver `HISTORY.md`.
- **P-014** — rótulo "Arquétipo" ficava fixo (seletor de habilidades, resumo da aba Habilidades,
  guia de criação) mesmo numa ficha de subclasse de Experimento. Corrigido em 2026-08-11, ver
  `HISTORY.md`.
