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

### P-040 — Inventário do Esquadrão depende de `var(--danger)` inexistente · `ABERTO` · frontend/inventario-esquadrao

- **Sintoma:** cinco declarações de cor em
  `inventario-esquadrao.component.scss` (ações de remover e quantidade negativa)
  usam `var(--danger)`, token que não é declarado em nenhum parcial do tema.
  Como no antigo badge de rolagem privada, o navegador descarta essas
  declarações e o estado perde o destaque vermelho pretendido.
- **Causa:** o mesmo token planejado, mas nunca definido, que causava `P-036`;
  o inventário ficou fora do recorte daquela correção.
- **Contorno:** as ações continuam disponíveis e identificadas por ícone/texto,
  mas não recebem a cor de severidade.
- **Correção:** abrir uma spec própria e substituir os usos pelo token semântico
  apropriado, provavelmente `--vida` para as ações destrutivas, após conferir os
  estados do Inventário do Esquadrão ao vivo.
- **Desde:** encontrado durante a investigação de `P-036`, em 2026-08-29.

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
