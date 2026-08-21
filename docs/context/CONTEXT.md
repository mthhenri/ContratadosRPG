# CONTEXT.md — Painel do Projeto

> **Última revisão:** 2026-08-21 · **Última decisão registrada:** na Iniciativa desktop, a ficha
> flutuante aberta pelo mestre parte de `1100×600`, sempre limitada à viewport; jogador preserva a
> geometria compacta e mobile continua em tela cheia — ver seção 1.
>
> **Decisão anterior:** o recorte mobile do Encontro
> (`m7-08`, que fecha o M7) é feito **inteiramente pelo CSS do breakpoint** — os componentes só
> guardam um sinal de intenção (`ajustando`/`aberto`/`acoesAbertas`) e ninguém consulta
> `matchMedia`; onde o texto muda com a largura, os dois rótulos ficam no DOM e o `display: none`
> escolhe. A ação primária do mestre virou barra `position: fixed` no rodapé, e o que competia com
> ela (steppers, ações secundárias, log) ficou atrás de gatilho próprio — sem perder função — ver
> seção 1
>
> Este arquivo diz **o que é verdade agora**. Ele é **reescrito**, nunca acrescido — teto de
> ~400 linhas. O relato de *como se chegou aqui* está em [`HISTORY.md`](HISTORY.md).
>
> Vizinhos: [`PROBLEMS.md`](PROBLEMS.md) (o que está quebrado) ·
> [`MEMORY.md`](MEMORY.md) (onde fica o quê) · [`IDEAS.md`](IDEAS.md) (o que ainda não é sistema) ·
> [`HISTORY.md`](HISTORY.md) (o que aconteceu e por quê).

---

## 1. Próxima Task

O **M7 — Encontro de Combate** está **concluído**: as 8 tasks (`m7-01` contrato, `m7-02` motor
puro, `m7-03` backend de montagem, `m7-04` backend de condução + tempo real, `m7-05` painel do
mestre, `m7-06` visão do jogador, `m7-07` log da rodada, `m7-08` refinamento mobile) entregues. As
frentes abertas voltam a ser o **M4** (Ficha de Criatura/NPC — restam `m4-05`…`m4-10`) e o **M6**
(Gestão de Usuários — resta `m6-08`); a escolha da próxima é do autor. Os ajustes descobertos na
validação da Iniciativa foram quebrados em sete specs atômicas de pós-milestone no backlog:
`m7-09` (turno atual do jogador, **concluída**), `m7-10` (histórico de rolagens), `m7-11` (identidade dos cartões),
`m7-12` (layout desktop, **concluída**), `m7-13` (acesso pela campanha, **concluída**), `m7-14` (dialog de ficha,
**concluída**) e `m7-15` (ações mobile do jogador, **concluída**). As únicas ainda ativas desse
recorte são `m7-10` (histórico de rolagens) e `m7-11` (identidade dos cartões). Elas não reabrem o
escopo concluído de M7; são escolhidas uma a uma.

Na `m7-09`, `PainelEncontro` passou a derivar `ehMinhaVez` somente do estado de encontro já
recebido e da ficha do usuário ativo. A `m7-12` usa esse estado para exibir a única ação de condução
do jogador: **Avançar turno**, apenas na própria vez. O backend confirma que o combatente do slot
atual pertence à ficha do usuário; chamadas fora da própria vez são recusadas. O mestre preserva
todos os controles existentes.

Ainda na `m7-12`, o shell desktop permanece estritamente em `85vw`. Só a grade da visão dividida do
jogador usa cartões compactos em duas colunas; três linhas ficam inteiras antes da rolagem interna.
O bloco de controles não é renderizado quando não há ação disponível, eliminando a barra vazia. O
botão de abrir ficha também some desses cartões no desktop, pois a ficha já está aberta ao lado. O
breakpoint mobile restaura explicitamente a grade canônica de uma coluna e mantém esse acesso.

Na `m7-13`, o link **Iniciativa** da visão do jogador saiu do menu `⋯` de ações da ficha e passou
ao cabeçalho do card **Sessão**, junto do contexto em que é usado. O link mantém ícone, tooltip e
rota; o mestre conserva seu menu e o tile Combate, e nenhuma regra de encontro foi alterada.

Na `m7-14`, a ficha aberta pela Iniciativa ganhou o respiro lateral de `--pad-card`; em mobile,
`.ficha-flutuante__corpo` é a única superfície com rolagem vertical e reserva espaço para a navegação
fixa da ficha. A ficha de jogador recebe `rolagemExterna` apenas nesse hospedeiro, removendo o teto
do painel interno que de outro modo criaria uma segunda barra vertical. Cabeçalho, fechamento,
foco e navegação interna permanecem no mesmo componente.

Na `m7-15`, o jogador com combatente próprio ganhou o atalho mobile **Minha ficha**, fixo acima de
avisos e resultados transitórios e ausente no desktop. Ele reaproveita a abertura da ficha do cartão.
Dentro de `FichaFlutuante`, o destino mobile **Rolagens** mantém o painel interno quando esse
hospedeiro o disponibiliza; a execução e o registro seguem em `FichaRolagensPainel` e nos serviços
existentes. A ficha aberta por usuário apenas visualizador recebe `podeRolar = false`, portanto não
exibe rolagem rápida nem presets; não foram adicionados controles de condução.
Quando o mestre abre uma ficha a partir da Iniciativa no desktop, a mesma janela inicia limitada à
viewport em `1100×600`; jogador conserva a geometria compacta e o mobile continua em tela cheia.

O módulo de frontend é `frontend/src/app/modules/encontro`. A tela "Iniciativa" é **uma só**
(`PainelEncontro`, rota `/painel/:campanhaId/iniciativa`, com `:encontroId` opcional para o
histórico) e bifurca por `ehMestre()`; o jogador é espectador, escreve a própria iniciativa e pode
encerrar somente o turno da própria ficha.
Quem desenha o log é `componentes/log-encontro` — componente **burro**, alimentado pelo
`eventos` que já vem dentro do `EncontroRecuperadoDto`. Ele respeita a **revelação** por não fazer
nada: o log chega recortado do backend (`encontro-revelacao.ts` descarta evento preso a combatente
que o usuário não pode ver), e o painel **não** filtra de novo.

Atenção ao emitir eventos novos do encontro: `CampanhaGateway.emitirEncontroAlterado` é
**por socket**, não um `emit` de sala, porque o payload carrega o que o mestre ainda não revelou.
Qualquer evento novo que carregue estado de combatente precisa do mesmo cuidado.

**Como o recorte mobile do Encontro é feito (`m7-08`) — vale como padrão para telas novas.** Nenhum
componente consulta `matchMedia`: o que existe é um **sinal de intenção** (`ajustando` no cartão,
`aberto` no log, `acoesAbertas` na página) que **só o CSS do breakpoint mobile consome**. No
desktop as mesmas regras deixam tudo visível e o sinal fica inerte. Onde o texto muda com a
largura (`Energia`/`En`, `Defesa`/`Def`), **os dois rótulos ficam no DOM** e o `display: none`
escolhe — o escondido também sai da árvore de acessibilidade, então nada é lido duas vezes. Em
360px: cabeçalho condensado `R3 · T3/6`, cartão enxuto com os steppers atrás de `Ajustar`, ações
secundárias atrás de `Mais ações`, log recolhido atrás do próprio gatilho, e `Avançar turno`
(ou `Iniciar combate`) numa barra `position: fixed` no rodapé — mesma receita do rodapé do guia de
criação de ficha, inclusive o `z-index: 20`.

O gate visual obrigatório (skill `verify`, 1920×1080 e 360×800, **dois usuários simultâneos**) foi
cumprido em `m7-05`, `m7-06`, `m7-07` e `m7-08`, e vale para cada tela nova.

**Ambiente sem Docker.** O `npm run db:up` depende do daemon do Docker; onde ele não existe, dá para
subir o Postgres 16 local direto (`initdb`/`pg_ctl` como usuário `postgres`) e seguir com
`db:migrate` normalmente. Já o `npm run db:seed:dev` está **quebrado** desde a coluna
`usuario.tipo_usuario_id` do M6 (`P-023`) — para montar cenário de
verificação, use a API REST em vez do seed.

O M4 (Ficha de Criatura/NPC) foi **aberto** em sessão anterior: `m4-ficha-criatura-npc.spec.md`
(`docs/specs/backlog/`) foi dividido em **10 tasks numeradas** (`m4-01`…`m4-10`,
`docs/specs/backlog/`), seguindo o design já fechado em `SCHEMA.md` a partir do capítulo
"Guia de Criação de Ameaças"/"Guia de Criação de NPCs" (`docs/core/guia_de_mestre-v4.0.0.md`).
A frente de **criatura** vem primeiro (`m4-01`…`m4-04`), depois **NPC** (`m4-05`…`m4-08`), e as
duas últimas (`m4-09` listagem/revelação no painel do mestre, `m4-10` refinamento mobile) cobrem
os dois tipos juntos. `m4-01` (contrato `FichaCriaturaDadosDto`,
`shared/src/dtos/ficha/ficha-criatura.dtos.ts` + 11 enums novos de conteúdo de jogo), `m4-02`
(`shared/regras/criatura` — motor de regras puro do roteiro de criação de Ameaças, 10 módulos
de fórmula + `validarFichaCriatura` + caso de teste completo "A Estátua"), `m4-03`
(`backend/ficha` estendido para `CRIATURA`: criação restrita ao mestre, dono sempre o mestre,
sempre dentro de campanha, validação via `validarFichaCriatura`, mesmos mecanismos de
permissão/visibilidade/tempo real do M3) e `m4-04` (assistente de criação de criatura no
frontend, `/painel/:campanhaId/criatura/nova`) **concluídas**. Ao montar "A Estátua" como caso
de teste (`m4-02`), duas divergências internas do próprio documento entre a fórmula geral e os
números literais do exemplo foram identificadas (modificador Fraco em VD 30; mínimo de
Fraqueza) — resolvidas com a fórmula geral vencendo, documentadas em
`shared/src/regras/criatura/modificadores.ts` e `a-estatua.spec.ts` (ver seção 6). A `m4-03`
decidiu DTOs de operação **próprios** para criatura (`FichaCriaturaCriarDto`/`*CriadaDto`/
`*RecuperadaDto`/`*AlteradaDto`, `shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`) em
vez de unir com os contratos de jogador — mesma lógica de "dois contratos, não um" já fechada
em `m4-01` para o documento de jogo (ver seção 6). A `m4-04` verificou ao vivo que abrir a
ficha recém-criada em `/painel/:campanhaId/ficha/:id` (`FichaVisualizacao`, telas de jogador)
quebrava com `TypeError` — resolvido com uma tela dedicada, `CriaturaVisualizacao` (ver seção 7).
Entre a `m4-04` e a `m4-05`, várias sessões de **polimento de UI** fora da fila de specs (pedido
direto do autor, não tasks numeradas): `m4-04b` revisou o assistente de criação de criatura
(upload de imagem, espaçamento entre campos) e o painel do mestre (botões "Nova Criatura"/"Novo
Agente", tira de estatísticas reduzida a "Convite", coluna Esquadrão dividida com a subseção
"Criaturas" — exigiu expor `tipo`/`na` em `FichaResumoDto` e ajustar
`FichaRepository.colunasResumo` para os dois formatos de `dados`), construiu a tela dedicada
`CriaturaVisualizacao` citada acima e, em 2026-08-15, realinhou o layout dela a um mockup
reconstruído pelo autor (`docs/design/examples/ficha-de-criatura.html`) — de coluna única
numerada pra dashboard de 3 colunas com abas, mesmo shell de `FichaVisualizacao` (ver seção 4);
`m4-04c` trocou o bloco único "Base do VD" do passo // Atributos por 3 cards (Base/Limite/Pontos
de Ajuste), deu ao card de Pontos de Ajuste um contador real que trava o avanço em saldo 0 (mesmo
padrão do guia de jogador) e corrigiu o corte do botão "+" do stepper no mobile (ver seção 4).
Próxima da fila M4: **`m4-05`** (contrato `FichaNpcDadosDto`, início da frente de NPC).

O M6 também está aberto, em paralelo. A próxima task encadeada nessa frente é
`m6-08-impersonacao-administrativa.spec.md`, que adiciona impersonação administrativa auditável.
O trio do guia de criação
(`m3-57` base, `m3-58` melhorias de nível, `m3-59`
equipamento inicial), o complemento `m3-64`, a `m3-61` (cor de ficha) e a `m3-62` (avatar de ficha)
**concluíram** — as specs estão em `docs/specs/done/`; o que o guia faz hoje de ponta a ponta está
descrito na seção 4, em "Guia de criação de ficha". A `m3-64` resolveu o antigo `P-012`: o pacote
inicial agora é uma regra pura em `shared/regras/agente` e tem consumidor obrigatório no guia.

A `m3-72` também concluiu: Sistema e Guia do Mestre agora abrem pelo mesmo acesso global
**Documentos**, em janela flutuante no desktop e tela cheia no mobile.

`m2-18`/`m2-19`/`m2-20`/`m2-21` fecharam a frente de redesenho do painel de campanhas —
`/painel/:id` tem layout dedicado para mestre e para jogador. Fica **em aberto, por decisão do
autor**: um recorte de UI pensado especificamente para o **mobile** da visão do jogador (a `m2-21`
só adaptou o visual de desktop).

### Fila do backlog (`docs/specs/backlog/`)

| Spec | Frente | O que é |
|---|---|---|
| `m3-53` | ficha | exportar ficha em PDF fiel ao tema |
| `m4-05`…`m4-10` | criatura/NPC | 6 tasks restantes do M4 — ver seção 1 e `docs/specs/backlog/` |
| `m6-08` | usuários | impersonação administrativa auditável |

`m3-53` é a única frente de M3 ainda sem spec `done/`. Milestone ainda não aberto: `m5-guia-missao`.

---

## 2. Estado Geral

Monorepo npm workspaces (`shared/`, `backend/`, `frontend/`) rodando de ponta a ponta: Angular 21
SPA → NestJS 11 REST + Socket.IO → PostgreSQL 16. **M0, M1 e M2 concluídos; M3 (ficha de jogador)
em fase de refino avançado** — a ficha lê, edita, rola dados, persiste e sincroniza em tempo real.

Deploy em produção por **integração nativa das plataformas**, sem GitHub Actions no deploy: push em
`master` → Render (backend) e Cloudflare Pages (frontend) puxam do Git sozinhos; banco no Supabase.
O GitHub Actions só roda **CI** (lint + testes nos 3 workspaces em todo PR).

**Suítes (checadas na `m6-05`):** shared 601/601 · backend 275/275 · frontend
921/921 — os 3 workspaces fecham a suíte completa hoje (`npm run test`, sem `--watch`);
`P-001`/`P-010`/`P-011` descrevem falhas que só reproduzem isoladas (arquivo único), não na suíte
completa — ver [`PROBLEMS.md`](PROBLEMS.md). Na `m6-05`, lint e builds dos três workspaces
fecharam limpos. Ver `PROBLEMS.md` `P-009` para o histórico de
falhas isoladas/preexistentes.

---

## 3. Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, `core/`, CI, deploy) | **concluído** |
| M1 | Calculadora com paridade | **concluído no código** (`m1-01`…`m1-20`). Restam 2 passos **operacionais** de plataforma — ver `PROBLEMS.md` `P-006` |
| M2 | Auth + Campanhas | **concluído**, incluindo o redesenho do painel (`m2-01`…`m2-09` + extensões `m2-10`…`m2-17`; `m2-18` lista, `m2-19` detalhe/mestre, `m2-20` detalhe/jogador, `m2-21` abas + Rolagens na lateral + menu de ficha do jogador) |
| M3 | Ficha de Jogador | **em andamento** — CRUD, editores, tempo real e rolagens prontos; guia de criação completo (`m3-57`/`m3-58`/`m3-59` — base, melhorias de nível, equipamento inicial); cor (`m3-61`) e avatar (`m3-62`) de identidade por ficha prontos; falta só `m3-53` |
| M4 | Ficha de Criatura/NPC | **iniciado** — dividido em `m4-01`…`m4-10` (`docs/specs/backlog/`); `m4-01` (contrato), `m4-02` (`shared/regras/criatura`), `m4-03` (`backend/ficha` para `CRIATURA`) e `m4-04` (assistente de criação no frontend) concluídas; `m4-04b`/`m4-04c` (polimento de UI fora da fila) também concluídas. Próxima: `m4-05` (NPC) |
| M5 | Guia de Missão | não iniciado |
| M6 | Gestão de Usuários e Papéis | **em andamento** — `m6-01`…`m6-07` concluídas; próxima `m6-08`, com impersonação administrativa auditável |
| M7 | Encontro de Combate | **concluído** — 8 tasks: `m7-01` contrato, `m7-02` motor puro (ordem + intercalação de Cadência + condições), `m7-03` backend de montagem, `m7-04` backend de condução/tempo real, `m7-05` painel do mestre (tela "Iniciativa", `frontend/.../modules/encontro`), `m7-06` visão do jogador (mesma tela em modo espectador + recorte de revelação, com broadcast por socket), `m7-07` log da rodada e `m7-08` refinamento mobile. Numeração M7 é sugestão, não decisão de roadmap |

---

## 4. O Que o Sistema Faz Hoje

> Catálogo por capacidade. O detalhe task a task (o **porquê** de cada decisão) está no
> `HISTORY.md` — busque pelo código da task.

### Motor de regras — `shared/regras/` (funções puras, zero dependências)

Dez domínios implementados e testados: `agente/` (15 fórmulas — vida, energia,
defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo/furtivo, inventário),
`compras/` (catálogo, limites por patente, modificações, amplificadores, fragmentos, venda),
`dados/`, `descanso/`, `dt/`, `identidade/`, `novo-agente/`, `patente/`, `rolagem/` — todos
contra `docs/core/sistema-v4.1.0.md` — e `criatura/` (`m4-02`, 10 módulos de fórmula do "Guia
de Criação de Ameaças" — atributos, modificadores, saúde, defesa, resistências/fraquezas,
regeneração, deslocamento, cadência/iniciativa, ataques, `validarFichaCriatura` — contra
`docs/core/guia_de_mestre-v4.0.0.md`, caso de teste completo "A Estátua").

**Fonte única:** frontend e backend consomem o mesmo motor. Nenhuma regra de jogo é reimplementada
em nenhum dos dois lados.

### Autenticação e conta — `backend/autenticacao`, `backend/usuario`, `frontend/autenticacao`, `frontend/usuario`

Registro e login com JWT (bcrypt, guard global, `@Public()` para abrir rota, `@ActiveUser()` para o
payload). Telas `/login` e `/registro` (split-panel). Perfil self-service em `/perfil`: alterar
nome/login, trocar senha e excluir a própria conta. Desde a `m6-01`, toda conta tem tipo global
(`NORMAL`, `ADMIN` ou `TESTER`) e `token_versao`; a conta `senhor.contratados` foi promovida a
`ADMIN`, contas anteriores receberam `NORMAL` e o registro público sempre persiste `NORMAL`.
Desde a `m6-02`, todo request não público relê tipo, versão e exclusão da conta no banco: sessão
ausente, excluída ou com versão divergente recebe 401; `@TiposPermitidos(...)` usa o tipo fresco e
responde 403 quando ele não está autorizado. Para testar um módulo restrito, anote a controller com
`@TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER)`; remova o decorator para permitir
qualquer usuário autenticado.
Desde a `m6-03`, administradores podem listar contas ativas ou excluídas com busca, filtro de tipo,
ordenação e paginação; criar contas; alterar nome/login; fazer soft delete; e reativar uma
conta preservando seus dados públicos. A `m6-04` acrescentou troca de tipo e reset administrativo
de senha, ambos com incremento de `token_versao`; bloqueia auto-exclusão/auto-rebaixamento pela
gestão, preserva ao menos um `ADMIN` ativo inclusive no self-service e impede excluir mestre de
campanha ativa antes de transferir o papel ou excluir a campanha. As rotas ficam sob
`usuario/admin` e permanecem restritas a `ADMIN`.
Desde a `m6-05`, `/admin/usuarios` expõe essas operações em uma tela inline protegida por
`adminGuard`: busca única por nome/login com debounce, filtros reativos de tipo e situação,
criação com escolha de tipo, edição, reset de senha, troca de tipo com confirmação, exclusão e
reativação. O perfil identifica o tipo atual sem permitir editá-lo, e a topbar sinaliza contas
`ADMIN`/`TESTER`.
Desde a `m6-06`, módulos futuros podem restringir suas rotas com
`tipoGuard([TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER])`. Sem sessão, o guard preserva o
retorno no redirecionamento ao login; uma sessão sem tipo permitido segue para a página pública
`/acesso-negado`. Ao abrir o módulo para todo usuário autenticado, substitua-o por
`autenticacaoGuard`; nenhuma rota funcional existente foi restringida pela entrega.

### Campanhas — `backend/campanha`, `frontend/campanha`

CRUD de campanha com papéis (mestre/jogador), entrada por `codigo_convite` com regeneração pelo
mestre, listagem de membros, remoção de jogador e transferência de mestre. UI sob `/painel`
(guardada): lista de campanhas (`/painel`) é um **painel de controle** (m2-18) — linhas densas por
campanha com tira de 4 estatísticas agregadas no topo (Campanhas/Você mestra/Fichas em
campo/Alertas), alerta visual + nome da ficha crítica por linha, resumo da própria ficha
(Vida atual/máxima, jogador) e convite copiável direto na linha (mestre), sem abrir o detalhe. O
detalhe (`/painel/:id`) tem banner de alerta condicional no topo (ficha crítica, com link direto
pra ela), tira de estatísticas — só o tile **Convite** (só mestre; ajuste pós-m4-04b: Membros/
Fichas/Alertas saíram da tira — a contagem de cada um já aparece no cabeçalho da própria coluna, e
o alerta crítico já tem o banner acima) — e tira horizontal rolável de rolagens da última hora (sem limite fixo de itens — a lista completa/sem limite de
tempo só na sidebar de histórico, aberta pelo seu próprio gatilho D20; cada pill tem rótulo +
dadinho d20 lado a lado na mesma linha flex — hover/foco no d20 mostra o resultado completo na
bandeja de dados flutuante, `BandejaDados`, a mesma que exibe rolagens ao vivo, mas sem timer/
barra de auto-sumir — `semAutoSumir`, a prévia só fecha no `mouseleave`/`blur`) — compartilhados
pelos dois papéis. Abaixo disso, o corpo diverge por papel (`@if (ehMestre())`/`@else`):

- **Mestre** (m2-19) — duas colunas: **Membros** (450px no desktop; nome/papel/gestão, sem
  fichas; mestre sempre primeiro, depois jogadores em ordem alfabética) e **Esquadrão** (grid fixo
  de 2 colunas — 1 no mobile, e antes de Membros quando a grade empilha; segue a mesma ordem
  mestre→alfabética da coluna Membros — com as fichas de **jogador** (`tipo === JOGADOR`) da
  campanha achatadas, nome do dono em cada mini-card, Vida/Energia com ajuste rápido ± sem abrir a
  ficha (operação dedicada que só altera `dados.estado.vidaAtual`/`energiaAtual`, sem regravar
  identidade, cor, avatar ou visibilidade), reações
  (Defesa/Esquiva/Bloqueio/Contra-ataque, cada uma só aparece se a ficha tiver o valor — Contra-
  ataque recalculado ao vivo no backend quando o snapshot não foi persistido) e o kebab de ações da
  ficha — duplicar/remover-da-campanha/excluir). Cabeçalho da coluna tem dois botões — **Nova
  Criatura** (`/painel/:campanhaId/criatura/nova`) e **Novo Agente** (assistente de jogador,
  ex-"Nova ficha", m4-04b). Abaixo do grid, a mesma coluna se divide com a subseção **Criaturas**
  (m4-04b) — todas as fichas `tipo === CRIATURA` da campanha, cards enxutos (nome/imagem/cor/NA/
  Vida/Defesa, sem classe/energia/condições, que uma criatura não tem) e **sem link de navegação**:
  `FichaVisualizacao` ainda não sabe renderizar dados de criatura (pendência da `m4-04`, ver seção
  7) — abrir a ficha completa quebraria a tela. `FichaResumoDto` ganhou `tipo`/`na` (opcionais, para
  não quebrar fixtures de teste pré-m4-04) e a query de resumo (`FichaRepository.colunasResumo`)
  passou a resolver `vidaAtual`/`vidaMaxima`/`defesa` também no formato raiz que a criatura usa
  (`COALESCE` entre os dois formatos de `dados`), além de um `JOIN tipo_ficha` novo.
- **Jogador** (m2-20 + m2-21) — a ficha exibida na coluna principal (a própria, por padrão, ou a de
  um colega via "Ver ficha") como card embutido (`<app-ficha-visualizacao modo="compacto">`, o
  componente real da tela de ficha, não uma réplica): 2 colunas que **repartem a linha** —
  Identidade/Vitalidade/Reações/Resistências à esquerda, card de Status à direita com uma barra de
  **3 abas** (Informações · Inventário · Habilidades). **Informações** = Atributos (o mesmo bloco
  que o `modo="padrao"` põe na coluna própria, via `ng-template`) + glance de Combate só leitura
  (com os dadinhos de rolar dano) + Anotações editáveis inline; Sanidade, Extras, História e
  Prestígio ficam de fora, alcançáveis por "Abrir ficha completa" (link no cabeçalho do card +
  botão no rodapé) → `/painel/:campanhaId/ficha/:id` (`modo="padrao"`, sem corte). Inventário e
  Habilidades rolam por dentro com teto de 420px (subiu de 230/250px pós-m2-21, a pedido do autor —
  o teto antigo datava de quando Atributos ainda morava na coluna ao lado). Ao lado, uma coluna
  lateral de 450px com **três** cards: **Equipe** (roster compacto — Vida/Energia resumidas + um
  botão "Ver ficha" por ficha visível de cada colega, trocando a ficha exibida sem navegar),
  **Rolagens** (`<app-ficha-rolagens-painel>` — presets/rolagem avulsa + o toggle "Rolagem oculta";
  saiu do card na m2-21 pra ficar ao lado do histórico; **só rola** os presets existentes —
  `editavel` fixo em `false` aqui, criar/duplicar/editar/remover preset continua exclusivo da
  ficha completa) e **Sessão** (as mesmas rolagens da última hora, empilhadas em vez da tira
  horizontal, com teto de 3 pills — 179px — antes de rolar). O cabeçalho dá ao jogador um menu "⋯" próprio (mesmo
  lugar do kebab do mestre) com **Criar nova ficha** e **Vincular ficha existente** (`PUT
  /ficha/:id/campanha` da m3-28, só fichas com `campanhaId === null`); as duas ações também
  aparecem no estado vazio, e nenhuma delas tira o jogador da página. No mobile a barra inferior
  (`.ficha-nav`, m3-60) lista 5 destinos (Agente/Status/Inventário/Habilidades/Rolagens) — e
  `Rolagens` é o **único que não é uma aba**: rola a página até o card da lateral. Os handlers de
  edição (`ajustar*`) vêm de `FichaEdicaoService` e a flag/registro de rolagem de
  `FichaRolagemRegistroService`, os dois composables reusados com `VisualizarPage` — a ficha de um
  colega aparece só leitura (`ajustavel=false`) quando o usuário não é dono nem mestre. O cabeçalho
  também traz `<app-calculadora-flutuante>` ao lado do gatilho de histórico de rolagens, pros dois
  papéis.

O cabeçalho tem nome da campanha em linha própria (mais destaque no mobile) e, abaixo/ao lado,
indicador de tempo real, botão "Voltar às campanhas", gatilho de histórico de rolagens e (mestre)
o menu kebab de ações da campanha (editar nome/descrição, excluir). Também mostra o estado
operacional `Na Base`/`Em Missão`: o mestre pode alterná-lo e abrir o inventário compartilhado numa
sidebar; o jogador abre o inventário na coluna lateral somente quando está na base. O inventário de
esquadrão aceita itens do catálogo, ajustes de quantidade e transferência nos dois sentidos com
fichas próprias (`Pegar`/`Mandar pra base`). Durante uma missão, jogadores ainda podem consultar os
itens, mas não podem adicionar, ajustar quantidade, remover ou transferir; essas operações continuam
restritas à base. O atalho do jogador se chama
`Inventário do esquadrão`; `Na Base` usa a cor neutra adaptada à base clara/escura e `Em Missão`
usa o vermelho fixo de Vida. O catálogo repete busca, categorias com quebra de linha e densidade do
inventário da ficha, sem rolagem horizontal; adicionar preserva o catálogo aberto e sinaliza o card
acionado. A ação `Item custom` replica o formulário da ficha, com categoria iconográfica, quantidade,
descrição e campos mecânicos condicionais (`dano`, `informação`, `resistência` e `bônus`) limitados ao
contrato que o inventário coletivo já preserva. Usável em ~360px.
Operacionais e Medicinais com todos os campos descritivos idênticos compartilham um stack ao serem
adicionados; as demais categorias e qualquer variação descritiva permanecem em registros separados.
Remover um registro exige confirmação inline no próprio card. O suporte estruturado a itens
modificados no inventário de esquadrão ainda não faz parte do sistema e está registrado como
**I-020** em `IDEAS.md`.
No desktop, as sidebars compartilhadas de inventário de esquadrão e histórico de rolagens têm 500px;
o histórico usa a mesma largura na campanha e na ficha. A pilha de atalhos flutuantes (inventário,
histórico e calculadora, conforme a tela) fica a 24px do canto inferior esquerdo tanto na campanha
quanto na ficha. Em viewports mobile, esses controles continuam inline no cabeçalho com alvos de 44px
e as sidebars ocupam toda a largura disponível.

O **Caderno** também integra os utilitários da campanha. Cada membro possui um caderno privado por
campanha, formado por páginas com título e Markdown, sem imagens ou anexos. A página usa Milkdown
para edição visual direta: o conteúdo formatado é a própria superfície editável, com barra compacta
para títulos, ênfase, listas, citação e código, sem alternância entre fonte e prévia. O Markdown puro
continua sendo o formato persistido. O autor administra suas
páginas com salvamento automático e controle de versão; em conflito, o texto local permanece visível
até o usuário recarregar a versão persistida. O mestre alterna entre o próprio caderno editável e os
cadernos dos jogadores em modo estritamente somente leitura; jogadores não veem cadernos alheios.
Sincronizações internas do Milkdown — como a troca da página ativa — não são tratadas como digitação
e, portanto, não disparam autosave nem avançam indevidamente o controle otimista de versão. As datas
usadas como versão são devolvidas pelo backend com os seis dígitos de microssegundos do PostgreSQL,
evitando perda de precisão entre um salvamento e o seguinte. Os controles `Salvar agora` e `Excluir`
têm hover contextual, resposta de pressão ao clique e respeitam `prefers-reduced-motion`.
No desktop, a janela pode ser arrastada, redimensionada e minimizada e preserva sua geometria no
navegador. A lista de páginas pode ser recolhida e se recolhe ao criar uma página; em janelas de
640px ou menos ela se sobrepõe ao editor para não estreitá-lo, e a largura mínima da janela é 440px.
No mobile, o gatilho fica inline
ao lado de histórico e calculadora, ocupa a área útil ao abrir e alterna entre lista e editor.

A mesma janela oferece busca textual unificada com fontes combináveis conforme o papel: caderno do
mestre, cadernos dos jogadores e anotações das fichas. A autorização é aplicada no backend antes da
consulta; um resultado de página abre o caderno correspondente e um resultado de ficha navega para
a visualização completa em `#anotacoes`. A implementação usa full-text search português do
PostgreSQL (`websearch_to_tsquery`, `tsvector` e índices GIN); o banco continua autoritativo.

### Ficha de jogador — `backend/ficha`, `frontend/ficha`

CRUD completo com a matriz de permissões §14 arbitrada **só no service**, validação do documento
contra `shared/regras` antes de persistir, e concessão/revogação de acesso de visualização
(`usuario_ficha_acesso`).

A tela de visualização (`FichaVisualizacao`, componente reusável) é um **layout de três colunas**
(Identidade · Atributos · Status com abas internas), com **toda edição no próprio lugar** — nada
de página de formulário separada. Editores prontos: atributos e maestria (com modificador de teste
e ajuste manual de dados/`dadosTeste` por atributo, este último só afetando a contagem de dados
rolada, nunca o valor exibido nem os derivados; em edição, os atributos viram uma lista vertical —
nome completo + steppers — em vez da grade compacta do modo leitura), vitais, sanidade e
lesões, habilidades (com filtro e contador), inventário completo (itens, modificações,
amplificadores, fragmentos Potencializador — "Aplicar em..." num item (`m3-35`; cardápio "em um
item" com 4 destinos exclusivos — dano [`N× maior dado do alvo`, dano de verdade], teste, **efeito**
[`m3-68`: tipo `EFEITO` próprio, descritivo — reforça o efeito do item, ex.: "Em Chamas" de uma
granada, nunca soma no dano] e resistência; "uma única função" por item, checado por
`existeFragmentoNaMesmaFuncao`) ou "Consumir" pro bônus permanente do agente (teste/Defesa/dano do
Corpo, cardápio fechado por módulo, `m3-64`;
consumir sempre deixa um registro incondicional na aba Extras, acima da Afinidade — não depende da
sequela "Rejeição Biológica", que é evitável — e é **removível**: desfaz o bônus, a Energia Máxima e
devolve o item ao inventário, mas não mexe na sequela já gerada) — e fragmentos Construtor (nascem
com o bônus fixo do módulo já aplicado como modificação automática — Arma ganha dano/teste, Proteção
ganha resistência/Esquiva/Bloqueio/Defesa, `m3-65`; Munição não modifica item, tem a ação própria
"Recarregar" que debita Energia e concede dano por 1 cena, reset manual; modificações comuns
adicionadas a um Construtor custam o dobro e não pesam; `m3-69`: o form de item custom ganhou um
seletor "Base" — escolher uma arma/proteção real de `CATALOGO_ITENS[categoriaEmprestada]` trava
dano/informação/resistência com os valores daquele item e pré-preenche o peso, "Outra" continua livre
pra homebrew; `calcularStatItem` funde a Resistência de um Construtor Proteção com o bônus do módulo
desde essa task — antes só Proteções/Armazenamento eram elegíveis a esse bloco) —, sub-inventários,
custom), Limite mínimo
de Energia/Anomalia Biológica (`m3-67`: `(Vigor + Destreza) × 2` — abaixo dele, aviso não-bloqueante
na aquisição de fragmento e, na aba Extras, os efeitos calculados como texto informativo (−15
testes, −10 Defesa, teto de 10% da Vida Máxima) + atalho pra pré-preencher o trauma "Limiar da
Humanidade" na aba Sanidade, sem nunca disparar sozinho), identidade (origem,
personalidade, afinidade de fragmentos), história privada, anotações e dinheiro. Extras possui a
subnavegação persistente **Identidade / Fragmentos** (`m3-71`), com ícones canônicos e painel interno
rolável limitado à altura de Agente/Atributos no desktop e ao viewport em telas empilhadas.
Persistência **otimista + em lote**, com
merge de edição concorrente — a lógica (~18 handlers `ajustar*` + progressão) mora em
`FichaEdicaoService` (`@Injectable()` sem `providedIn: 'root'`, uma instância por página via
`providers: []`), reusado por `VisualizarPage` (`/painel/:campanhaId/ficha/:id` e `/fichas/:id`) e
por `CampanhaDetalhe` (m2-20, ficha embutida na visão do jogador). O mesmo padrão vale para
`FichaRolagemRegistroService` (m2-21): a flag "Rolagem oculta" e o registro do histórico (m3-27)
moram na página porque no painel do jogador o toggle está **fora** do card (coluna lateral)
enquanto o teste de atributo e o dano continuam sendo rolados de dentro dele.
O controle relacional de visibilidade da ficha completa pede confirmação antes de persistir: fica
compacto junto ao avatar no desktop e migra para o menu de ações no mobile. Mudanças reais de
`oculta` em ficha vinculada emitem `ficha:visibilidade-alterada` na sala da campanha; o detalhe
refaz o recorte REST autorizado, fazendo a ficha sumir ou reaparecer para jogadores sem F5.
Na visualização completa, o menu de dono/mestre oferece **Remover da campanha** somente para ficha
vinculada; a desatribuição é direta e retorna ao acervo após o backend confirmar.

Input `modo: 'padrao' | 'compacto'` no componente: `'compacto'` reduz as 3 colunas pra 2
(Identidade/Vitalidade/Reações/Resistências ao lado do card de Status) e corta a barra de abas ao
trio Informações/Inventário/Habilidades, some com Prestígio, Sanidade, Extras e História, e leva
Atributos + Combate pra aba Informações (uso de `CampanhaDetalhe`, coluna estreita numa tela larga
— ver seção "Painel de campanhas" acima). No mobile a tela vira **HUD fixo no topo + barra de
navegação no rodapé** (não empilhamento de colunas) — por breakpoint real de viewport, não pelo
`modo`; em `'compacto'` a barra some com os destinos que não existem nesse modo.

Rolagem de dados: gramática v4, presets, teste de atributo, dano de item, iniciativa automática,
calculadora flutuante e **histórico persistido** com visibilidade `PUBLICA`/`PRIVADA`. Cada ficha
tem uma **cor de identidade** própria (`m3-61`, coluna `ficha.cor`, swatch no cabeçalho —
`ajustavelAmplo()`), independente do `--accent` de tema por usuário: colore o total/crítico de toda
rolagem daquela ficha (bandeja de dados, histórico, feed "Rolagens Recentes" do painel de
campanha), via REST e WebSocket; sem cor definida, cai no `--accent` de quem visualiza. Cada ficha
também tem um **avatar** opcional (`m3-62`, coluna `ficha.imagem_url`): `<img>` real no lugar do
placeholder decorativo no cabeçalho (com selos de trocar/remover, `ajustavelAmplo()`) e no card do
acervo — upload/remoção via `POST`/`DELETE /ficha/:id/imagem` (multipart, endpoint dedicado fora do
`PUT` genérico), persistidos **imediatamente** (sem o debounce dos demais campos), com o arquivo
guardado em disco local (dev) ou Cloudflare R2 (produção) atrás de `ArmazenamentoProvedor`
(`backend/src/core/armazenamento/`), escolhido por `ARMAZENAMENTO_PROVEDOR`. O card do acervo
(`/fichas`, `FichaAcervo`) usa a mesma receita visual do card de ficha do Esquadrão
(`CampanhaDetalhe`, `m3-52`): borda + listras diagonais do avatar seguem `--cor-ficha`
(`color-mix` sobre `--border-strong` sem cor definida) e o hover sustentado sobre o avatar abre um
preview 200×200 sem recorte (`agendarPreviewAvatar`/`cancelarPreviewAvatar`) — o acervo lia
`imagemUrl` mas nunca `cor` nem tinha o preview; corrigido para consumir o mesmo recorte que
`FichaResumoDto` já expõe.

### Ficha de criatura — `backend/ficha` (`m4-03`) + assistente de criação (`m4-04`)

`POST /ficha/criatura` cria uma ameaça: só o **mestre** da campanha pode
(`UnauthorizedAccessException` para qualquer outro papel), dono é sempre o próprio mestre (sem
delegação como em jogador), sempre dentro de uma campanha (sem ficha avulsa — VD/NA são
calibrados para o grupo). `GET`/`PUT /ficha/criatura/:id` reusam as mesmas checagens de
permissão de `recuperarFicha`/`alterarFicha` (dono/mestre/concessão, §14); exclusão
(`DELETE /ficha/:id`) e concessão/revogação/listagem de acesso (`/ficha/:id/acesso*`) são 100%
agnósticos de tipo e reusam as rotas de jogador sem endpoint próprio. Validação de domínio é só
`validarFichaCriatura` (`shared/regras/criatura`, `m4-02`) — nenhuma regra de criação duplicada
no backend. Invisível a jogadores por padrão — **não** é o campo `oculta` (que aqui só nasce
`false` e serve pra outra coisa, revelação manual futura de `m4-09`) quem garante isso, é a
própria condição de acesso: `listarVisiveisParaUsuario`/`recuperarFicha` só liberam o dono
(sempre o mestre) ou quem tem `usuario_ficha_acesso` — confirmado ao vivo na `m4-04` (jogador
sem concessão recebe lista vazia e 403 direto na criatura). A criação **não** transmite
`ficha:criada` na sala `campanha:<id>` (diferente de jogador) — esse evento vazaria nome/vida da
criatura a todo membro antes de qualquer revelação deliberada, contradizendo a regra de
invisibilidade; a edição segue transmitindo `ficha:alterada`, seguro porque a sala `ficha:<id>`
já exige a mesma permissão de visualização para entrar. DTOs de operação próprios
(`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`) — ver seção 6. Listagem de criaturas
por campanha (mini-cards, sem abrir a ficha completa) ganhou a subseção "Criaturas" do painel do
mestre no `m4-04b` — ver o parágrafo do `CampanhaDetalhe` acima; revelação/visibilidade seletiva
continua em aberto para `m4-09`.

**Assistente de criação** (`frontend/src/app/modules/ficha/paginas/criar-criatura/`,
`CriaturaCriar`) — rota `/painel/:campanhaId/criatura/nova`, guardada por
`mestreCampanhaGuard` (`frontend/core/guards/`, novo: consulta `CampanhaService.listarMembros`
e redireciona a `/acesso-negado` quem não é mestre daquela campanha — mesmo espírito de UX do
`adminGuard`, mas escopado à campanha em vez do tipo global). Trilha vertical + resumo
operacional progressivo, mesma filosofia visual do guia de jogador (`FichaCriar`), mas
componente e roteiro totalmente separados — 12 passos fixos (Identidade → Ameaça → Atributos →
Modificadores → Saúde → Defesa → Resistências → Regeneração → Porte e Deslocamento → Ataques →
Habilidades → Revisão), sem passos condicionais (o roteiro do "Guia de Criação de Ameaças" não
varia por escolha, diferente do de agente). Todo cálculo vem de `shared/regras/criatura`
(`m4-02`) via `computed`; nenhuma fórmula reimplementada. O passo // Revisão chama
`validarFichaCriatura` (a mesma função que o backend chama antes de persistir) para decidir se
o botão "Registrar criatura" habilita — em vez de replicar cada regra de coerência como trava de
passo separada. Sem rascunho persistido (decisão de abertura: a task não pede retomada, e
diferente da ficha de jogador o risco de perda é baixo — o mestre não perde a própria ficha).
`nome` da ficha (nível DTO) é sempre a `designacao` da Ficha de Identidade — sem campo
duplicado. Verificado ao vivo (Postgres+backend+frontend reais, dois usuários — mestre e
jogador): reproduz "A Estátua" ponta a ponta com os mesmos valores do documento (Vida Máxima
1.050, Defesa 30, custo de resistências 52/60, Atributo Efetivo de cada linha), persiste
corretamente e o jogador sem concessão não a vê (§14). Pendência registrada — ver seção 7.

**Visualização/edição** (`frontend/src/app/modules/ficha/componentes/criatura-visualizacao/`,
`CriaturaVisualizacao` + página `paginas/visualizar-criatura/`) — rota
`/painel/:campanhaId/criatura/:id`, mesma guarda de mestre da rota `nova`; resolve a pendência da
`m4-04` com tela dedicada (não um `modo` novo em `FichaVisualizacao`). Barra superior própria do
componente (`criatura__topo`, rótulo + régua + `chip-classificacao` `FICHA-CRT-{id zero-padded}`,
igual estrutura de `ficha-visao__topo` do jogador — não fica na página) seguida de dashboard de 3
colunas — Identidade (avatar com cor de identidade via `<input type="color">`, upload de imagem e
seletor de enquadramento — ver adiante —, designação, chips de classificação Origem/Porte/
Comportamento, NA em destaque, VD/Tenacidade/Defesa, Vida, Resistências em grade compacta,
Fraquezas em grade de **2 colunas**, divergência deliberada do mockup — que mostra 1) · Atributos
(grade Físicos/Mentais de cards "sigla + valor + Atributo Efetivo + rolar"; o seletor de Modificador
de 4 barras não fica no card — só dentro do modo de edição) · Status com **4 abas** (`AbaCriatura =
'geral' | 'descricao' | 'ataques' | 'habilidades'`, também divergência deliberada do mockup — que
mostra 2): Geral (Cadência + Bônus de Iniciativa + Deslocamento na mesma linha — deslocamento é um
terceiro item de `.criatura__stats--info`, não card próprio — e Regeneração opcional abaixo),
Descrição (Conceito/Gancho/Motivação, Natureza Física/Tema de Horror, Anotações), Ataques e
Habilidades (cada uma sua própria aba, grades de cards, Ataque com botões Teste e Dano) — mesmo
shell/padrões de `FichaVisualizacao` (jogador) e dos blocos canônicos de
`docs/design/tema/_componentes.scss`, alvo de fidelidade
`docs/design/examples/ficha-de-criatura.html`. Abas sempre ocupam 100% da barra (`flex: 1 1 0` em
cada `.criatura__aba` — divergência deliberada do `.abas` canônico, que é do tamanho do conteúdo).
Edição no próprio lugar campo a campo, igual liberdade da ficha de jogador; `FichaEdicaoCriaturaService`
faz o mesmo papel de `FichaEdicaoService` (debounce + `PUT` em lote). Nas listas de item
(`criatura-ataque-lista`/`criatura-habilidade-lista`/`criatura-resistencia-lista`, esta última
reusada por Resistências e Fraquezas) editar/remover por item só aparecem depois de um clique no
botão "Editar"/"Concluir" do cabeçalho da lista (`modoEdicao`, local a cada lista) — "Adicionar"
continua sempre visível, só as ações destrutivas/por-item exigem entrar no modo. Dois blocos fogem
do "edita direto no valor" e usam lápis de seção, como o lápis de Atributos da ficha de jogador:
**Classificação** (os quatro chips viram selects rotulados de uma vez, porque trocar um chip por um
select fazia a linha saltar) e **Atributos**, este com **rascunho + Salvar/Cancelar** — a
distribuição de Modificadores é cota fixa (2 Forte / 3 Médio / 3 Fraco / 2 Frágil,
`shared/regras/criatura`), então emitir a cada clique deixava a ficha inválida e o backend recusava
a gravação; o Salvar só libera quando `validarFichaCriatura` não acusa mais violação de modificador.
Dois cuidados que valem pra qualquer tela: `<select>` de edição usa `[selected]` na `<option>` (com
`[value]` no `<select>` as opções do `@for` ainda não existem e o controle abre na 1ª), e `.botao`
precisa ser copiado pro SCSS de cada componente (a definição da página não atravessa o
encapsulamento). Só desktop por ora — refinamento mobile é `m4-10`, ainda no backlog.

**Enquadramento do avatar (pan/zoom) — jogador e criatura.** Retomada do que `m3-62` tinha deixado
fora de escopo ("crop/editor de imagem no client"), sem processamento de imagem no servidor: só um
metadado (`FichaImagemFocoDto { x, y, escala }`, percentual + zoom, coluna `imagem_foco` JSONB) se
soma a `imagemUrl`, aplicado no avatar via `object-position` + `transform: scale()`. Componente
reusável `AjusteEnquadramentoImagem` (`frontend/.../componentes/ajuste-enquadramento-imagem/`) —
arraste nativo (`pointerdown/move/up`, sem lib) + slider de zoom — renderiza como painel sobreposto
abaixo do avatar nos dois componentes (`FichaVisualizacao`/`CriaturaVisualizacao`). Selecionar um
arquivo novo abre o seletor automaticamente antes do upload; um selo dedicado (canto livre do
avatar) reabre o seletor pra reajustar uma imagem já salva, sem reenviar arquivo. `imagemFoco`
viaja pelo `PUT /ficha/:id` genérico (como `cor`), não pelo endpoint multipart de imagem — são só
números. Remover a imagem zera o enquadramento junto (sem metadado órfão). Ícone de rolagem
**d20** (não d6) em todo gatilho da ficha de jogador — o sistema só tem testes `Nd20kh1±mod`, então
a troca de `nome="dado"` → `nome="d20"` (`app-icone`) foi total, sem glifo de d6 sobrando em lugar
nenhum.

**Polimento de UI — `m4-04b`:** passo // Identidade ganhou upload de imagem de registro (mesmo
padrão de avatar do guia de jogador, `FichaService.alterarImagem`, segundo request em sequência
após criar a ficha — layout `.guia__campos--base`, caixa à esquerda + Designação/Origem à
direita); revisão de espaçamento entre campos consecutivos fora de um `.guia__campos` (regra
`.campo + .campo` que faltava — campos ficavam colados sem gap) e entre um grid de cards
(Resistências/Fraquezas/Ataques/Habilidades) e o botão "+ Adicionar" logo abaixo.

**Polimento de UI — `m4-04c`:** passo // Atributos trocou o bloco único "Base do VD" (texto
corrido, cortava o stepper no mobile por `.atributo` não ajustar `grid-template-columns` nesse
breakpoint) por 3 cards `.stat` — Base e Limite estáticos, Pontos de Ajuste com um contador real
`gasto/total` (`pontosAjuste()`, mesma fórmula soma-acima-da-Base de
`validarDistribuicaoAtributos` do guia de agente) que trava `passoValido()` em saldo 0, mesmo
padrão do "Saldo de distribuição" do guia de jogador. Dois ajustes decorrentes: os dez atributos
agora nascem na Base ao definir o VD (`mudarVd()`, só na primeira visita ao passo — não apaga uma
distribuição já feita ao voltar e reajustar o VD) em vez de ficarem fixos em `1`; e o piso da
Realocação por atributo passou de `0` para `max(0, Base − 3)`, respeitando o teto de "até 3 pontos"
do documento (sem efeito para VD ≤ 40, onde `Base − 3` já é negativo).

### Guia de criação de ficha — `frontend/src/app/modules/ficha/paginas/criar/`

Rota `/painel/:campanhaId/ficha/nova` (`m3-57`/`m3-58`/`m3-59`) — mesmo componente `FichaCriar`
montado de novo, sem `campanhaId`, em `/fichas/nova` (acervo, m3-28: ficha avulsa, sem campanha).
`FichaCriarDialog` (o formulário único antigo) **não existe mais no código**: era a última
consumidora quem faltava migrar. Tela única por passos — trilha vertical + resumo operacional
progressivo que nunca antecipa classe/Nível/dinheiro antes da escolha real —, rodando sobre
`shared/regras` sem nenhuma chamada ao backend até o "Criar ficha" final. Sem `campanhaId`
(`null`), o guia pula `listarMembros`/`listarFichas` (sem esquadrão, sem seletor de dono no passo
01) e o passo 03 solicita Nível e Prestígio exatos; em campanha, as médias calculadas continuam
como padrão e podem ser sobrescritas manualmente. Ao final, `POST /ficha` sai sem a chave
`campanhaId` quando a ficha é avulsa e
o guia termina em `/fichas/:id`, não em `/painel/.../ficha/:id`. Passos: **01 Base** (dono, só
mestre — não aparece sem campanha —, + codinome + cor de identidade, `m3-61`, + avatar opcional,
`m3-62`: o `File` fica só num signal local até "Criar ficha" — nunca no rascunho salvo em
`localStorage` — e sobe num segundo request, em sequência, logo após o `POST /ficha`) · **02 Classe** (classe/arquétipo, bônus fixo de
atributos, Habilidade Inicial, Saúde base sem Nível/atributos ainda) · **03 Novo agente** (motivo
de entrada + médias de Nível/Prestígio pré-calculadas da campanha, `calcularNovoAgente`, memorial
de cálculo e sobrescrita exata; sem campanha, valores exatos informados diretamente)
· **04 Atributos** (orçamento de 4 pontos de criação,
`calcularOrcamentoAtributos`/`validarDistribuicaoAtributos`) · **05 Identidade** (Personalidade +
Origem com catálogo de Formações e `Outra`, imutáveis para o dono após a criação) · **06
Habilidades** (sempre presente: pacote inicial obrigatório de 4 Gerais, 2 Gerais + 1 de
Classe/Arquétipo ou 2 de Classe/Arquétipo; Civil escolhe 3 Civis; compõe ainda as vagas de
`calcularProgressaoAcumulada`, sem duplicatas — Experimento não ganha vaga extra, escolhe
Peculiaridade pelo mesmo pacote de qualquer outra classe; Fortificações de
Personalidade nos níveis 7/14) · **07 Recursos** (rolagem única e definitiva de `1000 + 4D4×250` +
Bônus Monetário) · **08 Equipamento inicial** (kit da loja, orçamento **à parte** do dinheiro —
nunca descontado —, teto $2500/peso 5 do documento — mesma regra para toda classe, inclusive Civil
—, sem modificação; componente próprio `GuiaEquipamentoLoja`, catálogo + carrinho sobre
`CATALOGO_ITENS`/`calcularTotaisCarrinho` de `shared/regras/compras`; pulável, kit vazio é válido) ·
**09 Revisão** (resumo completo + `POST /ficha`, erro do backend não perde o estado do guia). Os
passos 04/06/08 têm **trava dura** por padrão (não avança com saldo/vaga/orçamento em aberto) com
um "modo livre" que ignora as travas (sempre disponível ao mestre) — regra só do guia, client-side;
o backend segue com a liberdade de edição da `m3-10`. Rascunho (`GuiaCriacaoRascunhoService`)
serializa o estado em `localStorage` por campanha, oferece "retomar"/"começar do zero" ao reabrir e
some ao concluir; sair do guia usa um `<dialog>` nativo (não `confirm()` nem `beforeunload`, que não
permite UI customizada), com aviso de que o progresso está salvo. Mobile: trilha vira barra de
progresso no topo, resumo operacional vira bottom sheet aberto por um botão dedicado no cabeçalho.

### Tempo real — `backend/core/gateway`

Gateway Socket.IO **broadcast-only**: toda mutação passa por REST, o gateway nunca recebe escrita.
Handshake autenticado pelo mesmo `JwtService` do Passport. Salas `ficha:<id>` e `campanha:<id>`,
reusando a permissão §14 das services. Eventos: `ficha:criada`, `ficha:alterada`, `membro:entrou`,
`rolagem:registrada`, `campanha:estado-alterado` e `campanha:inventario-alterado`. Os dois eventos de
inventário/estado sinalizam o frontend para reler a fonte de verdade por REST.

### Calculadoras públicas — `frontend/calculadora`

Seis abas públicas e 100% client-side (consomem `shared/regras` direto, sem backend): `agente`,
`dt`, `novo-agente`, `patente`, `descanso`, `compras` (com modo Vender). Paridade com a calculadora
antiga confirmada.

### Documentos de regras — `frontend/shared/leitor-documentos`

Sistema e Guia do Mestre são públicos e acessíveis globalmente pelo mesmo leitor. O shell do sistema
controla documento, abertura, recolhimento e geometria; o PDF fica em um `iframe` e usa o viewer
nativo do navegador para nitidez, busca, seleção, páginas e zoom. O leitor próprio baseado em PDF.js
foi removido após a validação visual revelar baixa nitidez e texto duplicado. Os PDFs canônicos vivem
somente em `docs/core/` e o build os publica em `/documentos/`.

### Tema — `frontend/tema`

"Terminal de Contenção" dark-first com **troca em runtime** (`TemaService`: presets + color picker
com trava de contraste). Tokens CSS + preset PrimeNG + Tailwind apontando para os tokens.
`--cor-ficha` (`m3-61`) é um token **separado**, por personagem, não por usuário — nunca ganha
valor fixo em `_tokens.scss`, sempre `[style.--cor-ficha]` inline por instância; ver "Ficha de
jogador" acima e `docs/design/DESIGN.md`.

### Infraestrutura

14 migrations (`0001`…`0014`), Knex + Docker Compose local, CI de lint+testes em PR, deploy nativo.
O ambiente local é descartável e reproduzível por `npm run db:reset:dev`: o comando trava o alvo em
`development`/localhost/`contratados_rpg`/`postgres`/armazenamento local, remove o volume sem backup,
reaplica migrations e semeia 4 usuários, 2 campanhas, 8 vínculos e 8 fichas coloridas. Cada
usuário possui uma ficha diferente em cada campanha. O seed
transacional isolado é `npm run db:seed:dev`; cenário e credenciais estão em `docs/DEVELOPMENT.md`.

---

## 5. Decisões Vigentes

Decisões que **continuam governando código novo**. Não as re-litigue sem falar com o autor.

- **DTOs são `interface readonly`, não classes** — o projeto não instala `class-validator` e o
  backend **não liga o `ValidationPipe`**. A validação estrutural fica documentada campo a campo na
  spec; a validação real é de regra de negócio, no service. Não converter DTOs em classes nem
  instalar `class-validator` sem pedir.
- **Deploy nativo, não Actions** — o autor prefere Render/Cloudflare puxando do Git a pipelines de
  deploy no GitHub Actions. O Actions fica só com o CI.
- **Busca de anotações e documentos começa no PostgreSQL** — usar full-text search nativo
  (`tsvector`/`websearch_to_tsquery`) com índice GIN, respeitando sempre o recorte de permissões no
  backend. Elasticsearch não entra na infraestrutura atual; fica como evolução opcional, com
  PostgreSQL preservado como fonte de verdade e o índice externo reconstruível.
- **Cadernos de campanha são privados por autor** — cada membro tem conceitualmente um caderno por
  campanha, composto por páginas Markdown. O autor administra as próprias páginas; o mestre apenas
  lê e pesquisa páginas dos jogadores; jogadores nunca acessam cadernos entre si. A busca unifica
  cadernos e anotações de ficha com fontes combináveis conforme o papel. O Caderno é um utilitário
  flutuante junto de Calculadora e Documentos; contrato e decisões em
  `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`.
- **Edição no próprio lugar** — toggle inline na mesma tela, nunca uma página de formulário
  separada. Vale para ficha, campanha e perfil.
- **Enum de coluna relacional é tabela `tipo_*`** (SYSTEM.SPEC §10.2.12, proibição #24). A exceção
  "enum só em `shared/`" vale **apenas** para conteúdo dentro do JSONB `ficha.dados` (classes,
  patentes, categorias de item). Enum que vira coluna ganha tabela de referência — foi assim com
  `tipo_rolagem_visibilidade` na `m3-27`.
- **Rolagem `PRIVADA` nunca trafega por WebSocket** — o gateway só emite `rolagem:registrada` para
  rolagens públicas. A privada só chega por REST, a quem tem permissão.
- **PrimeNG 21 sem `@angular/animations`** — o pacote não está instalado e o PrimeNG 21 usa
  animações CSS próprias. Não wirar `provideAnimationsAsync()`; o build quebra.
- **A ficha aposentou o sistema de abas de página inteira da `m3-11`** (substituído pelas 3 colunas
  da `m3-38`). `AbaFicha`/`ABAS_FICHA`/`ehAbaFicha` ainda existem no código mas estão **fora do
  template** — não estenda esse sistema, mesmo que uma spec antiga peça.
- **`docs/specs/active/m3-38-*.spec.md` é uma spec deliberadamente permanente** — ela documenta
  retroativamente o redesenho da tela de ficha e novos ajustes dessa mesma frente entram nela em vez
  de virar spec solta. É a **exceção** consciente ao "active/ = task da sessão atual".
- **A ficha permite estado incoerente de propósito** — a validação do backend só checa **teto**
  (Vida ≤ máximo, Nível no intervalo da classe). Condições (Morrendo/Machucado/Inconsciente) são
  alternadas à mão e nunca validadas; exceder o Inventário máximo é **aviso**, não trava.
- **Gate de qualidade é definição de pronto** — toda tarefa exige evidência contra a spec e as
  convenções, revisão do diff e verificação proporcional. UI exige verificação ao vivo conforme
  `verify`; item sem uma verificação obrigatória permanece aberto. **Qualidade acima de velocidade**
  é decisão expressa do autor: nenhuma pressa, delegação ou limite de execução autoriza atalhos. UI
  exige análogo aprovado e inspeção pessoal do agente principal em 1920×1080 e 360×800; build,
  testes, tokens e relato de subagente não substituem a comparação visual. O checklist canônico está
  em `AGENTS.md` e `CLAUDE.md` “Gate obrigatório de qualidade e conclusão”; os
  dois arquivos devem permanecer cópias integrais.

---

## 6. Sempre Lembrar

Armadilhas que já custaram retrabalho neste repositório. Cada uma tem um episódio no `HISTORY.md`.

**CSS / layout**

- **`overflow-x: clip` + `overflow-y: visible`** é a combinação usada em `html` (`styles.scss`) e
  `.conteudo` (`layout.component.scss`). Trocar qualquer um desses `clip` por `hidden`/`auto`
  **mata todo `position: sticky` da tela em silêncio** — é a tentação natural de quem está caçando
  overflow horizontal. Está comentado no SCSS; leia antes de mexer.
- **`@extend` + media query:** o seletor é injetado no media query, mas uma declaração **posterior**
  no arquivo com a **mesma especificidade** vence lá dentro. Foi assim que um `width: 18px` anulou
  um alvo de toque de 44px que "parecia" corrigido.
- **Especificidade anula media query:** `.bloco--modificador` (0,2,0) vence uma regra de media query
  em `.bloco` (0,1,0), e a regra simplesmente nunca roda. A correção é repetir o media query
  **dentro** do bloco do modificador, empatando a especificidade.
- **Nunca hardcodar hex/fonte/raio** (proibição #29) — sempre `var(--token)`. O tema troca em
  runtime; um hex solto não acompanha.
- **Base fixa + `min-width` num flex row transborda em silêncio.** `flex: 0 0 500px` numa coluna e
  `min-width: 260px` na irmã pedem 776px; numa linha de 644px o flexbox **não** encolhe nenhuma das
  duas — a segunda simplesmente sai por baixo do que estiver à direita, sem barra de rolagem e sem
  erro. Achado na `m2-21` (o card de Status do painel do jogador ficava por baixo da coluna lateral
  desde a m2-20). Em duas colunas que dividem uma linha de largura desconhecida, use `flex: 1 1
  <base>` + `min-width: 0` nas duas e trave o teto com `max-width`, nunca o piso.

**Angular**

- **Ler `input.required()` no corpo do construtor causa `NG0950` em runtime** e os testes **não
  pegam** (o TestBed injeta o input antes do primeiro change detection). Envolva em `effect()`.

**Backend / SQL**

- Todo SELECT precisa de `WHERE [tabela].is_deleted = false`; parâmetros nomeados (`:nome`), nunca
  posicionais nem interpolação; INSERT via `INSERT ... SELECT ... RETURNING`, nunca `VALUES`;
  nenhuma coluna com `DEFAULT`; soft delete sempre, `DELETE` físico nunca.
- **`COUNT(*)` do Postgres é `bigint`, e o driver `pg` devolve `bigint` como `string`** (evita
  perda de precisão) — um `COUNT(*)` sem `::int` explícito quebra silenciosamente qualquer DTO
  tipado `number` (TypeScript não pega; só aparece numa soma/comparação estranha em runtime).
  Sempre `COUNT(*)::int` quando o resultado alimenta um campo `number`. Achado na `m2-18`.
- **Controller é burro** — sem lógica, sem `try/catch`, sem `if`. A única micro-inteligência aceita
  é fundir id de `@Param`/`@Query` no DTO.

**Regras de jogo**

- **Amplificadores e Modificações escalam por COMPRA, não por stack bruto** — a 1ª compra em ■■
  (Flexível/Resistente/Potente/Conservador/Veloz) **não** dobra o bônus; a penalidade continua no
  bruto.
- Se código e `docs/core/sistema-v4.1.0.md` divergirem, **o documento vence** (proibição #27).
- **`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" tem duas divergências
  internas entre a fórmula geral e o exemplo "A Estátua"**: o modificador Fraco em VD 30 (fórmula
  dá +5, o exemplo mostra "+6") e o mínimo de Fraqueza (fórmula exige 26 — metade da soma de
  resistências 52 —, o exemplo declara 20). Quando o próprio documento se contradiz entre regra
  geral e exemplo pontual, a **fórmula geral vence** (decisão de abertura da `m4-02`) — o exemplo é
  mais sujeito a erro de transcrição. Ver `shared/src/regras/criatura/modificadores.ts` e
  `a-estatua.spec.ts`. Relevante para `m4-06` (`shared/regras/npc`) se a Biblioteca de Referência
  tiver o mesmo tipo de inconsistência.
- **Criatura tem DTOs de operação próprios, não união com jogador (decisão de abertura da
  `m4-03`)** — `FichaCriaturaCriarDto`/`*CriadaDto`/`*RecuperadaDto`/`*AlteradaDto`
  (`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`), espelhando a decisão de "dois
  contratos, não um" já fechada em `m4-01` para o documento de jogo. `FichaRepository`
  continua único e sem duplicação (`criarFicha`/`recuperarPorId`/`alterarFicha` são SQL
  agnóstico da forma do JSONB); a ponte de tipos entre os dois contratos acontece só dentro de
  `FichaService`, num cast documentado (`paraCriaturaCriada`/`*Recuperada`/`*Alterada`). Mesma
  decisão vale de referência para `m4-07` (NPC).

**Processo**

- **Antes de qualquer UI**, ler `docs/design/DESIGN.md` e consumir `docs/design/tema/`. Isso já foi
  esquecido uma vez (`m0-05`) e a tela nasceu com preset Aura base + hex hardcoded.
- **Sessões concorrentes na mesma branch acontecem** — reconferir `git status`/`HEAD` antes de
  commitar ou revisar um diff.

---

## 7. Decisões Pendentes

Nenhuma decisão de rumo em aberto no momento.

A única que existia — **identidade visual do site** — está **resolvida**: tema "Terminal de
Contenção", handoff completo em `docs/design/`, com troca em runtime entregue na `m1-13`.

**Resolvida na `m4-04b`:** a pendência registrada na `m4-04` (`FichaVisualizacao`, a tela de ficha
de jogador, não sabia ler `ficha.dados` no formato de criatura — abrir uma criatura recém-criada
por `/painel/:campanhaId/ficha/:id` lançava `TypeError`) foi fechada com a opção prevista pela
própria spec: **tela dedicada** (`CriaturaVisualizacao`, `/painel/:campanhaId/criatura/:id`), não
um `modo`/tipo novo em `FichaVisualizacao` — ver seção 4, parágrafo "Visualização/edição".
`FichaVisualizacao` continua sem entender o formato de criatura, mas não precisa mais: a navegação
pós-criação e o card de criatura no painel do mestre (`m4-04b`) já levam à tela certa.

Questões que precisam de resposta do autor mas não são decisões de rumo estão marcadas com **⚠** na
seção 1 e em [`PROBLEMS.md`](PROBLEMS.md).
