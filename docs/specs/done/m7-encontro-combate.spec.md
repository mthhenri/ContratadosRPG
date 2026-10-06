# m7-encontro-combate.spec.md

> **Milestone M7 (número sugerido, não decisão de roadmap) — Encontro de Combate.**
> Rastreador de combate ao vivo do mestre: monta o encontro, ordena a iniciativa com a Cadência
> das criaturas intercalada, conduz rodada a rodada e acompanha vida/condições dos combatentes —
> tudo espelhado em tempo real para os jogadores. Design mecânico ancorado em
> `docs/core/sistema-v4.1.0.md` (capítulo "⬥ Combate", "Condições") e
> `docs/core/guia_de_mestre-v4.0.0.md` ("Guia de Criação de Ameaças" > "Cadência" >
> "Iniciativa"/"Intercalação na Iniciativa"). Este spec fixa o escopo acordado com o autor.
> Quebrar em tasks numeradas (`m7-01…`) quando o milestone começar.

> **Intenção.** É o **primeiro tijolo mecânico do combate**, não o tabletop. Dá ao mestre uma mesa
> de combate: quem age, em que ordem, em qual rodada, com quanta vida e sob quais condições. A
> representação espacial (mapa, tokens, posição) é a `I-016` (tabletop virtual, sugerido M11) e fica
> **fora**; este módulo é desenhado para **não conflitar** com ela — o encontro é a camada de ordem
> e estado de turno, sobre a qual um tabletop futuro poderia se apoiar.

## Decisões-chave (fechadas com o autor)

> **Fonte única = a ficha.** Vida e condições de um combatente **com ficha** (jogador, criatura ou
> NPC) são as da própria ficha: dano/cura no encontro operam sobre `vidaAtual` da ficha reusando o
> DTO de operação existente (`ficha-operacao.dtos.ts`), e as três condições derivadas
> (`morrendo`/`machucado`/`inconsciente`) continuam vindo de `vidaAtual` (filosofia `m3-10`). Nunca
> há um segundo `vidaAtual` para quem tem ficha. **Só o avulso** (combatente sem ficha) guarda vida
> local no próprio registro do encontro.

> **Cada jogador rola a própria iniciativa** pelo sistema de rolagem que já existe (teste de Destreza
> `XD6` + bônus de Iniciativa da ficha). O encontro monta a ordem a partir dessas rolagens. O mestre
> rola pelas criaturas/NPCs e pelos avulsos, e pode **sobrescrever** qualquer valor manualmente
> (fallback para jogador ausente). Nenhuma regra de iniciativa é reimplementada — reusa o motor.

> **Broadcast-only (SYSTEM.SPEC §9, proibição #25).** Toda mutação do encontro entra por **REST**
> (guards + validação), e a service emite o evento **após** salvar. Jogadores são **espectadores ao
> vivo**: veem a ordem, o turno atual, a rodada e o estado dos combatentes; **quem controla é o
> mestre**. Nada de escrita via WebSocket.

## Escopo Acordado

- **Rastreador completo**: ordem de iniciativa + contador de **rodadas** + **turno atual** +
  avançar/voltar turno + virada de rodada + **vida atual** e **condições** por combatente.
- **Três tipos de combatente**:
  - **Ficha de jogador** — agente da campanha; iniciativa rolada pelo próprio jogador; vida/condições
    são as da ficha.
  - **Criatura/NPC (M4)** — ficha do mestre; traz a **Cadência** (`CadenciaEnum`) e o
    `iniciativaBonus` já existentes na `FichaCriaturaDadosDto`; vida/condições são as da ficha.
  - **Avulso** — inimigo improvisado sem ficha: mestre digita nome, iniciativa, cadência e
    vida máxima/atual; estado guardado local no encontro.
- **Cadência com intercalação** — turnos múltiplos por rodada (Singular/Dupla/Tríplice/Frenética)
  distribuídos pela regra "o turno extra cai no próximo slot disponível abaixo da posição atual".
  Algoritmo **novo**, como função pura em `shared/regras/encontro/` (a `shared/regras/criatura`
  hoje só mapeia `CadenciaEnum → turnos`, não intercala).
- **Tempo real** — o estado do encontro e cada mutação transmitidos para todos os membros da
  campanha, reusando o `CampanhaGateway` e a sala `campanha:<id>`; mudanças de vida de ficha já
  propagam pelo `ficha:alterada` existente.
- **Um encontro ativo por campanha** por vez (montagem/ativo); encontros encerrados ficam no
  histórico. Soft delete em tudo.
- **Log do encontro** (mockup) — trilha de eventos legível por rodada/turno: início de rodada, dano
  sofrido, gasto de Energia, condição aplicada/expirada, mudança de estado ("ficou Morrendo").
  Persistido e transmitido junto com o estado.
- **Condições com duração em rodadas** (mockup) — um marcador pode durar N rodadas e **expira
  sozinho** na virada; `Inconsciente · perde o turno` é o marcador que consome o próximo turno.
- **`Rolar tudo`** (mockup) — atalho do mestre que preenche de uma vez a iniciativa de **todos os
  combatentes ainda sem valor** (criaturas, NPCs, avulsos e jogadores ausentes), sem sobrescrever a
  iniciativa que um jogador já rolou.

## Contrato visual (mockups do autor)

Fonte visual: `docs/design/examples/iniciativa-desktop.html` e
`docs/design/examples/iniciativa-mobile.html` (tema "Terminal de Contenção", `docs/design/`).
O rótulo da tela é **"Iniciativa"** (`Iniciativa · <nome do encontro>`); "Encontro" é o nome do
**domínio** (módulo, tabela, DTO), não o texto de UI.

**Shell (desktop).** Cabeçalho com `Rodada N`, `Turno N/total`, faixa "Age agora — <combatente>"
e os controles do mestre: `Voltar`, `Avançar`, `Rolar tudo`, `Encerrar`. Corpo = lista de cartões
de combatente. Painel lateral com o **Log da rodada**.

**Cartão de combatente.** Valor de iniciativa em destaque + rótulo `inic`; etiqueta de estado
(`Age agora`, `Já agiu`) ou de natureza (`Ameaça · NA <n>`, `Aliado NPC`, `Avulso`, `Morrendo`);
linha de origem (`<jogador> · Agente · Cadência <n>`, `Criatura da campanha`, `Adicionado pelo
mestre`, `Digitado nesta sessão`); nome do combatente; **steppers `−`/`+`** para Vida e (quando
existe) Energia; faixa de defesas; e **chips de condição** com duração (`Sangramento · 2 rodadas`,
`Inconsciente · perde o turno`, `Machucado`).

**Mobile.** Mesma informação condensada: cabeçalho `R3 · T3/6`, cartões enxutos
(`Vida x/y · En x/y`, `Def · Esq · Blo · Con` em linha) e uma ação primária `Avançar turno`.

> **Divergência mockup × regras — a regra vence (§16 #27).** O cartão de Ameaça no mockup exibe
> `Esquiva` e `Contra`, mas criatura **não tem** Esquiva/Bloqueio/Contra-Ataque:
> `FichaCriaturaDadosDto` tem apenas `defesa`, e o guia trata a criatura como quem **não reage** a
> ataques. A implementação mostra **só Defesa** para criatura (Esquiva/Bloqueio/Contra são de agente
> e NPC). Nenhum campo ou fórmula é fabricado para preencher o mockup.

## Ciclo de vida do encontro

`MONTAGEM` → `ATIVO` → `ENCERRADO` (`tipo_encontro_status`, tabela de referência).

1. **Montagem** — mestre cria o encontro e adiciona combatentes. Cada combatente precisa de um
   valor de iniciativa:
   - Mestre dispara um **pedido de iniciativa** (broadcast aos jogadores da campanha). O jogador vê
     o pedido e rola a iniciativa da própria ficha pelo fluxo de rolagem normal; o resultado é
     registrado como a iniciativa daquele combatente. O mestre rola por criaturas/NPCs/avulsos e
     pode sobrescrever qualquer valor.
2. **Ativo** — com as iniciativas definidas, o mestre inicia o combate. O sistema calcula a
   **ordem de turnos da rodada** (ordenação + intercalação de Cadência). O mestre **avança** e
   **volta** o turno; ao passar do último turno da rodada, a rodada incrementa e a ordem é
   **recalculada** a partir dos combatentes/iniciativas atuais (entradas/saídas e ajustes de
   iniciativa valem a partir da próxima rodada). Durante o combate: aplicar dano/cura, marcar/limpar
   condições, adicionar/remover combatente.
3. **Encerrado** — mestre encerra; o encontro vira histórico read-only. As fichas ficam com a
   vida/condições em que pararam (fonte única — sem "reverter").

## Mecânica de iniciativa e intercalação

- **Ordenação base**: combatentes por iniciativa **decrescente**. Empate: maior **Destreza efetiva**;
  persistindo, o mestre decide a ordem relativa (a regra do sistema não fixa desempate).
- **Turnos por rodada**: derivado da Cadência do combatente (Singular=1, Dupla=2, Tríplice=3,
  Frenética=4+). Jogador e NPC são **Singular** por padrão (Cadência é conceito de criatura); o
  avulso recebe a cadência que o mestre escolher.
- **Intercalação** (regra do guia): o k-ésimo turno de um combatente (k ≥ 2) é colocado **um slot
  abaixo** de onde caiu o seu turno anterior. Os turnos extras cascateiam para baixo, nunca se
  acumulam em sequência.
  - **Caso de teste canônico** (exemplo do guia, `guia_de_mestre-v4.0.0.md`): Criatura Cadência
    Dupla `[18]`, Agente A `[17]`, Agente B `[3]` → ordem **Criatura → Agente A → Criatura (2º) →
    Agente B**. A função pura reproduz exatamente essa sequência.

## Vida e condições

- **Combatente com ficha**: dano/cura mutam `vidaAtual` da **ficha** (reuso do DTO de operação de
  ficha); as condições `morrendo`/`machucado`/`inconsciente` continuam **derivadas** da vida. A
  mudança propaga pela ficha (mini-card, `ficha:alterada`) e pelo estado do encontro.
- **Combatente avulso**: `vidaMaxima`/`vidaAtual` locais no registro do encontro.
- **Marcadores de condição** (ex.: Insolação `−5` na iniciativa e perde o próximo turno): lista de
  marcadores por combatente no encontro, **fora** das três condições derivadas. O MVP honra
  mecanicamente apenas os marcadores que **mexem em turno** (modificador de iniciativa; pular o
  próximo turno); o restante fica como rótulo textual. O **catálogo completo de condições** do
  sistema não é modelado no MVP (ver "Fora de escopo").

## Modelo de dados (esboço — fechar em `SCHEMA.md` na primeira task)

- **`tipo_encontro_status`** — tabela de referência (`MONTAGEM | ATIVO | ENCERRADO`), BaseEntity +
  `codigo` + `descricao`, seed na migration.
- **`encontro`** — BaseEntity + `campanha_id` (fk), `nome`, `tipo_encontro_status_id` (fk),
  `rodada_atual` (INTEGER), `turno_indice` (INTEGER). Índice por `campanha_id`. Invariante: no
  máximo **um** encontro não-encerrado por campanha (índice parcial único).
- **`encontro_combatente`** — BaseEntity + `encontro_id` (fk), `ficha_id` (fk, **nullable** — nulo =
  avulso), `nome_avulso`/`iniciativa`/`cadencia`/`ordem` e, **só para avulso**,
  `vida_maxima_avulso`/`vida_atual_avulso`. Marcadores de condição em JSONB (`marcadores`) — inline,
  sem tabela `tipo_*`, como as condições de ficha já são tratadas.

## DTOs (`shared/src/dtos/encontro/` — seguindo `dto-conventions`)

- Encontro (modelo inteiro): `EncontroCriarDto`/`EncontroCriadoDto`,
  `EncontroRecuperarDto { id }`/`EncontroRecuperadoDto` (estado completo: status, rodada, turno,
  combatentes, ordem calculada), `EncontroAlteradoDto` (payload de broadcast),
  `EncontroIniciarDto`, `EncontroEncerrarDto`.
- Combatente (sub-aspecto): `EncontroCombatenteAdicionarDto`/`…AdicionadoDto`,
  `EncontroCombatenteRemoverDto`,
  `EncontroCombatenteIniciativaAtribuirDto`/`…AtribuidaDto` (registro da rolagem do jogador ou
  override do mestre), `EncontroCombatenteCondicaoAtribuirDto`/`…RemoverDto`.
- Turno (sub-aspecto): `EncontroTurnoAvancarDto`, `EncontroTurnoVoltarDto`.
- Iniciativa (pedido): `EncontroIniciativaPedidoDto` (broadcast do pedido aos jogadores).
- Value-objects: `EncontroCombatenteResumoDto` (item de estado/listagem), `OrdemTurnoDto`
  (`{ combatenteId, ocorrencia }` — um slot da sequência de turnos da rodada).

## Regras puras (`shared/regras/encontro/` — funções puras, zero dependências)

- `ordenarIniciativa` — ordenação base decrescente com o desempate por Destreza efetiva.
- `intercalarCadencia` — recebe combatentes ordenados + turnos por rodada, devolve `OrdemTurnoDto[]`
  da rodada. Testado contra o exemplo canônico do guia (Criatura Dupla `[18]` + A `[17]` + B `[3]`)
  e casos de Tríplice/Frenética.

## Tempo real

- Reusa `CampanhaGateway` (broadcast-only). Novos emissores: `emitirEncontroAlterado`,
  `emitirEncontroIniciativaPedido` — chamados pela `EncontroService` **após** a mutação, na sala
  `campanha:<id>`. Mudanças de vida de combatente com ficha continuam propagando via `ficha:alterada`.
- Sem novos handlers de escrita no gateway.

## Backend / Frontend (esboço)

- **Backend** `backend/src/modules/encontro`: controller (repasse puro), service (regra + emissão),
  repository (SQL bruto `knex.raw`, parâmetros nomeados, `is_deleted = false`, soft delete).
  Criação/condução restritas ao **mestre** da campanha; leitura para membros. Iniciativa de ficha de
  jogador entra pela rolagem do próprio jogador.
- **Frontend** `frontend/src/app/modules/encontro`: painel de combate do mestre (adicionar
  combatentes, pedir iniciativa, iniciar, avançar/voltar, aplicar dano/cura, marcar condições) e a
  visão **espectador** do jogador (ordem, turno atual, rodada, estado dos combatentes — sem
  controles), ambos ao vivo. Consumir o mesmo motor de `shared/regras/encontro`. Passe responsivo
  mobile (~360px, sem scroll horizontal) como task dedicada ao fim do milestone, reusando os tokens
  de `m1-15`.

## Critérios de Aceite (mínimos)

- Mestre monta um encontro com fichas de jogador, uma criatura de Cadência Dupla e um avulso; cada
  jogador rola a própria iniciativa; a ordem calculada reproduz o exemplo do guia (criatura
  intercalada).
- Avançar o turno percorre a sequência intercalada; ao fim da rodada, a rodada incrementa e a ordem
  é recalculada a partir do estado atual.
- Dano aplicado a um combatente com ficha reflete na `vidaAtual` da ficha e nas condições derivadas,
  ao vivo, para todos os membros; dano em avulso altera só o estado local do encontro.
- Jogador vê ordem/turno/rodada/estado ao vivo, sem qualquer controle de condução.
- Nenhuma regra de iniciativa, cadência ou vida duplicada fora de `shared/regras` (motor único).
- Painel do mestre e visão do jogador usáveis no mobile (~360px) sem scroll horizontal.

## Fora de escopo (MVP)

- **Mapa / tokens / posição** — é a `I-016` (tabletop virtual). O encontro é desenhado para não
  conflitar, mas não desenha nada espacial.
- **Catálogo completo de condições** do sistema — o MVP honra mecanicamente só as que mexem em turno
  (modificador de iniciativa; pular turno) e trata o resto como marcador textual.
- **Automação de ataque/dano rolado** — o mestre aplica o resultado; o encontro registra o efeito na
  vida. A rolagem de ataque segue no fluxo de rolagem existente.
- **Múltiplos encontros ativos simultâneos** por campanha.

## Dependências

- **M3** — módulo de ficha (vida atual, condições derivadas, DTO de operação), sistema de rolagem
  e infraestrutura de tempo real (`CampanhaGateway`).
- **M4** — fichas de criatura/NPC com `CadenciaEnum` e `iniciativaBonus` (já implementadas).
