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

### P-019 — Barra de tempo da bandeja de dados não honra `prefers-reduced-motion` · `ABERTO` · frontend

- **Sintoma:** `bandeja-dados.component.scss` tem `@media (prefers-reduced-motion: reduce)` para a
  animação de entrada (`bandeja-entra`) e para a transição de saída, mas não para
  `&__barra { animation: bandeja-esvazia 7s linear forwards; }` — com a preferência ligada, a barra
  de tempo continua esvaziando animada.
- **Causa:** a barra de tempo (`m3-22`) nasceu antes da `ui-20`, que introduziu o mesmo padrão em
  `Notificacoes` e — lá, sim — com o `@media` correspondente na própria `&__barra`. O gap na
  bandeja não foi visto até a comparação lado a lado.
- **Contorno:** nenhum.
- **Correção:** replicar em `bandeja-dados.component.scss` o mesmo bloco
  `@media (prefers-reduced-motion: reduce) { animation: none; }` dentro de `&__barra` que
  `notificacao.component.scss` já tem.
- **Desde:** encontrado durante a `ui-20` (2026-09-02), fora do recorte da task (arquivo não
  tocado pela spec).

### P-044 — Itens da topbar se sobrepõem em telas por volta de 960px de largura · `ABERTO` · frontend

- **Sintoma:** em `~960px` de largura (o viewport de "tela dividida" da verificação visual), o
  item de navegação "Documentos" e o seletor de usuário (nome + avatar) do `LayoutComponent`
  sobrepõem texto um do outro — sem relação com nenhum painel lateral aberto, reproduz igual com
  Histórico/Inventário fechados.
- **Causa:** não investigada. A faixa de navegação (`Campanhas · Fichas · Simulação ·
  Documentos`) mais o seletor de usuário parecem não ter um breakpoint entre o desktop cheio e o
  colapso mobile (`bp.mobile`, 560px) — 960px cai nesse vão.
- **Contorno:** nenhum.
- **Correção:** dar à faixa de navegação da topbar um tratamento intermediário (esconder rótulos,
  virar menu, ou truncar) antes de `bp.mobile`, ou reavaliar o breakpoint de tablet (`1080px`) da
  topbar especificamente.
- **Desde:** encontrado ao verificar `painéis laterais: fecha de verdade a exclusão mútua e para
  de espremer a rota` (2026-09-02) — fora do recorte da task, `LayoutComponent` não foi tocado.

### P-046 — `GET /campanha/:id` devolve os dois códigos de convite a qualquer JOGADOR · `ACEITO` · backend

- **Sintoma:** `CampanhaRecuperadaDto.codigoConvite`/`codigoConviteEspectador` chegam sempre
  preenchidos nessa consulta, mesmo para um `JOGADOR` — só o mestre gerou os códigos, mas qualquer
  membro que chame `recuperarCampanha` (ou a tela que consome esse endpoint) os vê. Diferente de
  `CampanhaResumoDto` (usado na listagem), que já gateia por `CASE WHEN papel = MESTRE` desde antes
  do m8.
- **Causa:** recorte pré-existente ao papel `ESPECTADOR` (m8-01/m8-02) — `m8-01` já registrou o gap
  para `codigoConvite`, e `codigoConviteEspectador` nasceu com o mesmo recorte para não abrir uma
  inconsistência entre os dois campos. O `m8-02` fechou a parte que lhe cabia (`ESPECTADOR` agora é
  rejeitado neste endpoint inteiro, `UnauthorizedAccessException` — usa a projeção dedicada do
  painel), mas decidiu não estender o fechamento ao recorte `JOGADOR`, que é comportamento em
  produção anterior ao módulo M8 e fora do objetivo das duas specs.
- **Contorno:** nenhum — não é urgente (um jogador já está dentro da campanha; o código de convite
  não é um segredo capaz de dano fora dela).
- **Correção:** gatear os dois campos por `this.ehMestre(papel)` em `recuperarCampanha`
  (`CampanhaService`), devolvendo `null` para `JOGADOR` — mesma forma de `CampanhaResumoDto`. Exige
  decidir se algum consumidor do frontend depende do valor não-nulo para não-mestre antes de mudar
  o contrato.
- **Desde:** comportamento anterior ao M8; registrado explicitamente em `m8-01` (2026-09-03) e
  reafirmado como decisão consciente de escopo em `m8-02` (2026-09-03).

### P-048 — Botões de ícone soltos sem passar por `app-botao-icone` · `ABERTO` · frontend

- **Sintoma:** alguns controles clicáveis do app são `<button>`/`<a>` com classe BEM local e
  estilo próprio em vez do primitivo `shared/ui/botao-icone` (ou `app-botao` quando o alvo é
  `<a>`) — por exemplo `.detalhe__membro-acao` (ações "Transferir mestre"/"Alternar
  papel"/"Remover" na lista de membros de `detalhe.page.html`), `.detalhe__cabecalho-voltar` e
  `.espectador__voltar` (links de "voltar" com ícone), `.detalhe__cabecalho-menu-botao`/`⋯` (menu
  de ações), `.rolagem-pill__d20`. Funcionam e usam tokens de design corretamente, mas não passam
  pela biblioteca — cada um reimplementa hover/foco/tamanho na mão.
- **Causa:** convenção antiga do projeto (a maioria desses controles é anterior à `shared/ui/`
  atual) nunca revisitada; a `m8-03` seguiu o padrão já existente ao adicionar "Alternar papel"
  ao invés de o corrigir, por estar fora do recorte da task.
- **Contorno:** nenhum — o comportamento visual está correto hoje, é dívida de arquitetura/reuso,
  não defeito visível.
- **Correção:** decisão do autor pendente (2026-09-03): a intenção é que **todo** controle
  clicável do app passe a usar o primitivo correspondente (ver "Biblioteca de componentes é
  obrigatória" em `CLAUDE.md`/`AGENTS.md`) — inclusive os que hoje são exceção histórica. Exige um
  levantamento completo de todos os controles fora do padrão (não só os listados acima, que foram
  os encontrados durante a auditoria da `m8-03`) e provavelmente uma spec própria, já que
  `app-botao-icone` só suporta `button` — controles que hoje são `<a>` (`.detalhe__cabecalho-voltar`,
  `.espectador__voltar`) podem exigir ampliar o primitivo para aceitar âncora, o que é decisão do
  autor por si só (ver a mesma seção do `CLAUDE.md`/`AGENTS.md`).
- **Desde:** dívida pré-existente; nomeada e registrada explicitamente a pedido do autor após a
  auditoria de conformidade da `m8-03` com a nova regra de biblioteca de componentes (2026-09-03).

