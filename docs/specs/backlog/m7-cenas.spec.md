# m7-cenas.spec.md

> **Milestone M7 (número sugerido, não decisão de roadmap) — Cenas.** Amplia o Encontro de Combate
> (`m7-01`…`m7-20`, `docs/specs/done/`) para um módulo de **Cenas**: a mesa ganha uma tipagem oficial
> (`docs/core/sistema-v4.1.0.md`, "⬡ Cenas") — Combate, Investigação, Furtiva, Perseguição,
> Resistência — em vez de só "Encontro". Nasce do pedido do autor em 2026-09-21: diferenciar as
> cenas na criação e abrir caminho para uma cena de Investigação, que organiza documentos e as
> fichas dos jogadores numa mesma tela. Este arquivo é guarda-chuva: implementar somente pelas
> tasks `m7-21`…`m7-26` abaixo, quebradas quando o milestone começar.

## Objetivo

Trocar "Encontro de Combate" por "Cena": uma raiz tipada que o mestre cria, prepara com
antecedência e abre para a mesa, da qual o combate com iniciativa (Combate/Furtiva/Perseguição) é
**uma estrutura que uma cena pode ter**, não o único tipo de cena que existe. A cena de
Investigação — a motivação concreta do pedido — ganha um painel próprio, com documentos
apresentados ao lado das fichas dos agentes.

## Decisões de produto fechadas

1. **`cena` é a raiz nova; `encontro` continua existindo, dono da iniciativa.** `encontro` ganha
   `cena_id` (FK, um-para-um: no máximo um encontro por cena). Nenhum código de iniciativa,
   Cadência, rodada/turno é renomeado ou movido — só passa a pendurar numa cena-mãe. Isso evita
   renomear ~50 arquivos e ~2000 testes existentes por uma mudança de nome sem ganho funcional (a
   opção "renomear tudo para Cena" foi considerada e descartada com o autor).
2. **`CenaTipoEnum`** (`shared/src/enums/`, enum de coluna, tabela de referência `tipo_cena`, mesmo
   molde de `tipo_encontro_status`): `COMBATE | INVESTIGACAO | FURTIVA | PERSEGUICAO | RESISTENCIA`
   — os cinco tipos do capítulo "⬡ Cenas" do sistema (`sistema-v4.1.0.md:2234`).
3. **Só alguns tipos têm iniciativa.** Uma função pura nova em `shared/regras/cena/`
   (`cenaTemIniciativa(tipo: CenaTipoEnum): boolean`) devolve `true` para `COMBATE`, `FURTIVA` e
   `PERSEGUICAO` e `false` para `INVESTIGACAO` e `RESISTENCIA`. Backend e frontend consultam essa
   função — nenhum `if (tipo === ...)` duplicado decide sozinho se uma cena cria/exige um
   `encontro`.
4. **Ciclo de vida da cena, com preparo.** `PLANEJADA → ATIVA → ENCERRADA`
   (`tipo_cena_status`, mesmo molde de `tipo_encontro_status`).
   - `PLANEJADA`: só o mestre a vê e a edita (anexar documentos, pré-montar combatentes). Podem
     existir **várias** cenas planejadas ao mesmo tempo, em uma ordem manual (`ordem`) que o mestre
     ajusta — é o "preparar antes da sessão" pedido pelo autor.
   - `ATIVA`: visível aos jogadores. **No máximo uma cena ativa por campanha** — o índice parcial
     único que hoje trava `encontro` (`m7-01`) migra para `cena`.
   - `ENCERRADA`: histórico, somente leitura, como o encontro encerrado hoje.
   Abrir uma cena planejada enquanto outra está ativa pede confirmação e encerra a ativa **na
   mesma operação** (nunca duas cenas ativas simultâneas, nem uma janela intermediária).
5. **Encerrar a cena encerra o encontro junto (para os tipos que têm um).** O botão "Encerrar" do
   painel de combate passa a encerrar a cena-mãe; não existe mais um encontro `ENCERRADO` dentro de
   uma cena `ATIVA`, nem o inverso.
6. **Migration de dados: cada encontro existente ganha uma cena `COMBATE` equivalente**, no mesmo
   status (`MONTAGEM`/`ATIVO` viram `PLANEJADA`/`ATIVA`; `ENCERRADO` vira `ENCERRADA`). Nenhum
   histórico de combate é perdido ou refeito.
7. **Anti-vazamento de spoiler (§9/§14).** Uma cena `PLANEJADA` é exclusiva do mestre: o `GET` dela
   nega acesso a quem não é mestre da campanha, e nenhum evento de tempo real relativo a ela
   (`cena:alterada`, `encontro:alterado` de um encontro cuja cena-mãe está `PLANEJADA`) é emitido
   para a sala `campanha:<id>` — só depois que a cena vira `ATIVA`. Sem essa trava, pré-montar um
   combate ou anexar um documento de investigação denunciaria a cena aos jogadores antes da hora.
8. **Navegação.** Nasce `/campanhas/:id/cenas` (hub: cena ativa em destaque, planejadas em ordem
   manual, encerradas como histórico — cada uma com um `app-chip` do tipo) e
   `/campanhas/:id/cenas/:cenaId`. As rotas atuais `/iniciativa` e `/iniciativa/:encontroId`
   (`m7-12`) passam a redirecionar para o hub e para a cena dona daquele encontro, respectivamente —
   nenhum link/favorito existente quebra. O item "Iniciativa" da coluna de ações
   (`app-coluna-acoes`) passa a se chamar "Cenas".
9. **A casca escolhe o painel pelo tipo, reaproveitando o que já existe.** `PainelEncontroShell`
   (`ui-39`) vira `PainelCenaShell`: resolve papel **e** tipo. `cenaTemIniciativa(tipo)` verdadeiro
   → painel de Iniciativa de hoje (`PainelEncontroMestre`/`PainelEncontroJogador`), intacto.
   `INVESTIGACAO` → painel próprio (`m7-25`, ver "Painel de Investigação" abaixo).
   `RESISTENCIA` → o mesmo painel de Investigação **sem** a coluna de documentos (cabeçalho, grade
   de cards dos agentes, Rolagens, Encerrar) — cobre o tipo sem iniciativa mecânica própria sem
   duplicar componente.
10. **Furtiva e Perseguição usam o painel de Iniciativa tal como está.** Suas mecânicas específicas
    do guia — Nível de Alerta e Limiar de Detecção (Furtiva); Condição de Perseguição e inversão de
    perseguidor (Perseguição) — **não** são implementadas nesta leva. Ficam etiquetadas
    corretamente (o mestre já consegue criar e nomear a cena certa) e registradas como upgrade
    futuro em `docs/context/IDEAS.md`.

## Painel de Investigação (`m7-25`, depende da `m9-documentos-campanha`)

Mesma casca "coluna de ações | coluna | Rolagens | palco" da Iniciativa (`ui-37`/`ui-39`,
`docs/design/DESIGN.md`), com o conteúdo trocado:

- **Coluna de ações:** Ferramentas (Calculadora, Caderno) + categoria "Cena" (anexar documento da
  biblioteca da M9, reordenar, encerrar).
- **Coluna Documentos**, no lugar da trilha de turnos: os documentos vinculados a esta cena
  (`cena_documento`: cena, documento, ordem, em foco), cada um com o estado Oculto/Apresentado.
  Clicar um documento o abre no palco.
- **Palco:** o documento em foco (leitor de documento da M9) acima da grade de cards dos agentes da
  campanha — os mesmos cards do Esquadrão, sem lista de participantes própria da cena. Clicar um
  card abre a `app-ficha-flutuante`, como já acontece hoje.
- **Rolagens:** o mesmo `app-historico-rolagens-sidebar` de hoje — os jogadores rolam Vasculhar,
  Examinar etc. pelo fluxo de rolagem normal, fora deste módulo.
- **"Apresentar" um documento = revelar (M9) + destaque discreto.** A cena nunca guarda uma segunda
  cópia do estado de visibilidade — quem sabe se um documento está revelado é a `DocumentoService`
  (M9), fonte única, mesmo princípio de `vidaAtual` no M7 (`m7-01`). O backend da cena chama esse
  serviço, nunca o repository dele. Ao apresentar, o jogador recebe o documento na própria
  biblioteca **e** um cartão "Documento apresentado" aparece no painel dele (evento
  `documento:alterado` da M9 + estado local da cena) — sem abrir nada automaticamente, para não
  interromper quem está rolando dado ou lendo a ficha. O documento revelado continua acessível na
  biblioteca do jogador depois que a cena encerra.
- **Visão do jogador:** casca do `ui-39` — a própria ficha no palco — mais a lista dos documentos
  já **apresentados** nesta cena. O que segue oculto nunca chega a essa tela, nem por REST nem por
  socket.
- **Fora do MVP**, por não terem mecânica fechada no documento oficial além do texto descritivo, ou
  por dependerem de módulos que ainda não existem: pistas da equipe (quem encontrou o quê),
  Eventos do Mestre, Nível de Cooperação de NPC e contador de turnos de investigação. Registrar como
  upgrades em `docs/context/IDEAS.md` ao fechar `m7-25`, não implementar sem nova decisão do autor.

## Quebra em tasks

| Task | Camada | Conteúdo | Depende de |
|---|---|---|---|
| `m7-21` | shared + banco | `CenaTipoEnum`, `tipo_cena`/`tipo_cena_status`, tabela `cena`, `encontro.cena_id`, migration de backfill, `cenaTemIniciativa`. | — |
| `m7-22` | backend + tempo real | CRUD de cena (criar/abrir/encerrar/reordenar), `cena:alterada`, trava anti-vazamento de `PLANEJADA` (decisão #7), "Encerrar" do encontro passa a encerrar a cena. | `m7-21` |
| `m7-23` | frontend | Hub de cenas, "Nova cena" com seletor de tipo, chips por tipo, redirects de `/iniciativa`, renomeação da coluna de ações. **Entrega o pedido imediato do autor** (tipagem na criação). | `m7-22` |
| `m7-24` | frontend | Painel de cena sem iniciativa (Resistência: cabeçalho, grade de cards, Rolagens, Encerrar) e visão do jogador equivalente. | `m7-23` |
| `m7-25` | backend + frontend | Painel de Investigação completo (coluna Documentos, apresentar, palco com documento + fichas). | `m7-24`, `m9-documentos-campanha` (ao menos a task de backend + revelar/ocultar) |
| `m7-26` | responsivo | Passe mobile (~360px, sem scroll horizontal) do hub e dos painéis novos, reusando os tokens de `m1-15`. | `m7-23`, `m7-24`, `m7-25` |

**Ordem:** `m7-21 → m7-22 → m7-23` entregam a tipagem na criação e podem fechar sozinhas, sem
esperar a M9. `m7-24` segue direto depois. `m7-25` só começa quando a M9 tiver, no mínimo, backend
de documento + revelar/ocultar prontos. `m7-26` fecha o milestone.

## Critérios de aceite do módulo

- Criar uma cena exige escolher um dos cinco tipos; o hub mostra esse tipo como chip em toda cena
  listada (planejada, ativa ou encerrada).
- O mestre planeja duas cenas com antecedência (ex.: uma Investigação e um Combate), anexa
  documentos/combatentes em cada uma sem que os jogadores vejam nada, depois abre uma delas — só
  essa fica visível aos jogadores, e abrir a segunda encerra a primeira automaticamente.
- Uma cena de Combate/Furtiva/Perseguição continua se comportando exatamente como o Encontro de
  hoje (ordem intercalada, rodada/turno, vida/condições, tempo real) — nenhuma regressão no que já
  está em `docs/specs/done/m7-*`.
- Uma cena de Investigação ativa mostra ao mestre os documentos anexados e a grade de agentes;
  apresentar um documento o revela na biblioteca do jogador com um aviso discreto, sem interromper
  a tela dele.
- Uma cena de Resistência ativa mostra cabeçalho, grade de agentes e Rolagens, sem trilha de turnos
  nem coluna de documentos.
- Encerrar uma cena com encontro encerra o encontro junto; não existe estado misto.
- Migration de dados preserva 100% dos encontros existentes como cenas `COMBATE` no status
  equivalente, sem perda de histórico.
- `npm run test -w shared`, `-w backend` e `-w frontend` verdes.
- Verificação pela skill `verify` em `1920×1080` e `360×800`: hub, criação com os cinco tipos,
  Investigação e Resistência ativas, painel de Combate sem regressão.

## Fora de escopo

- Mecânicas próprias de Furtiva (Nível de Alerta, Limiar de Detecção) e Perseguição (Condição de
  Perseguição, inversão de perseguidor) — ver decisão #10.
- Pistas da equipe, Eventos do Mestre, Nível de Cooperação de NPC e turnos formais de investigação
  — ver "Fora do MVP" acima.
- Revelação de documento por jogador específico (a M9 é binária: revelado para a campanha inteira
  ou oculto) — upgrade da M9, não deste milestone.
- Mapa/tokens/posição espacial de cena — continua escopo da `I-016` (tabletop virtual).
- Renomear o domínio `encontro` (tabelas, DTOs, rotas, eventos de socket) para `cena` — decisão #1.

## Pontos em aberto (registrar a decisão ao implementar, não silenciosamente)

- **Histórico de cenas encerradas para o jogador:** hoje o jogador não tem o menu "N encerrados" do
  mestre (`ui-37`) — confirmar se uma cena `ENCERRADA` continua listada para ele no hub, e com que
  recorte, antes de `m7-23`.
- **Visão do Espectador (`m8`) numa cena:** `m8-05` deu ao espectador a mesma visão read-only do
  jogador para o Encontro. Confirmar se isso se estende a todos os tipos de cena (em especial
  Investigação, cujos documentos podem ter sensibilidade diferente) antes de `m7-25`.

## Dependências

- **M3** — ficha (vida atual, condições derivadas), sistema de rolagem, tempo real
  (`CampanhaGateway`).
- **M4** — fichas de criatura/NPC.
- **`m7-01`…`m7-20`** (`docs/specs/done/`) — o Encontro de Combate que este milestone amplia; nada
  aqui reabre essas tasks, só as pendura sob uma cena-mãe.
- **`m9-documentos-campanha.spec.md`** — biblioteca de documentos que `m7-25` consome (documento,
  revelar/ocultar, leitor, evento `documento:alterado`).
- `docs/design/DESIGN.md` ("Iniciativa — visão do mestre"/"visão do jogador") para a composição que
  os novos painéis reaproveitam.
