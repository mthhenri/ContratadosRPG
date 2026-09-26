# m7-22-backend-cena.spec.md

> Segunda task do milestone `m7-cenas.spec.md` — backend + tempo real. Constrói sobre o schema de
> `m7-21`.

## Objetivo

CRUD de cena (criar/abrir/encerrar/reordenar/listar/recuperar), a trava que impede uma cena
`PLANEJADA` de vazar aos jogadores, e o "Encerrar" do encontro passando a encerrar a cena-mãe junto.

## Estado atual

- `EncontroController`/`EncontroService` (`backend/src/modules/encontro/`) seguem o padrão
  `controller fino → service (permissão + regra + emissão) → repository (SQL bruto)`.
  `EncontroService.criarEncontro` chama `this.validarMestre(campanhaId, usuarioAtivo)` antes de
  qualquer mutação, e `this.validarMembro(campanhaId, usuarioAtivo)` para leitura
  (`encontro.service.ts:89`, `:121`, `:131`).
- `EncontroService` emite estado via `this.campanhaGateway.emitirEncontroAlterado(campanhaId,
  callback)` (`encontro.service.ts:681`, `:1150`) — a service chama isso **depois** de persistir,
  nunca o gateway aceita escrita (§9, broadcast-only).
- Hoje, `EncontroController.encerrar` (`encontro.controller.ts:132-138`) chama
  `encontroService.encerrarEncontro({ id }, usuarioAtivo)` e isso é o fim do ciclo de vida do
  encontro. Depois desta task, esse mesmo botão deve encerrar a **cena** dona daquele encontro, não
  só o encontro isoladamente.
- A invariante "no máximo um X não-encerrado por campanha" hoje mora em `EncontroService` via
  `encontroRepositorio.recuperarAbertoPorCampanha` (ver `m7-21`, "Estado atual"). Ela migra para
  `CenaService` — `encontro` deixa de ser o dono dessa regra.

## Entregáveis

1. **`CenaRepository`** (`backend/src/modules/cena/cena.repository.ts`, estende `BaseRepository`):
   `criarCena`, `recuperarPorId`, `recuperarAtivaPorCampanha`, `listarPorCampanha`, `alterarStatus`,
   `alterarOrdem` — só SQL, parâmetros nomeados, `is_deleted = false`, `INSERT ... SELECT ...
   RETURNING`.
2. **`CenaService`** (`backend/src/modules/cena/cena.service.ts`):
   - `criarCena(dto, usuarioAtivo)`: `validarMestre`; se `dto.ativarImediatamente`, encerra a cena
     ativa atual da campanha (se houver) **na mesma transação** antes de criar a nova já `ATIVA` —
     nunca duas cenas ativas simultâneas nem uma janela intermediária sem nenhuma. Cria o `encontro`
     junto quando `cenaTemIniciativa(dto.tipo)` for `true` (reaproveita
     `EncontroRepository.criarEncontro`, chamado pela `CenaService`, não duplicado).
   - `abrirCena({ id }, usuarioAtivo)`: `PLANEJADA → ATIVA`, mesma regra de encerrar a ativa atual
     acima.
   - `encerrarCena({ id }, usuarioAtivo)`: `→ ENCERRADA`; se a cena tem um encontro não-encerrado,
     chama `EncontroService.encerrarEncontro` internamente antes/junto (decisão #5 do milestone:
     nunca existe cena `ENCERRADA` com encontro `ATIVO`/`MONTAGEM`).
   - `reordenarCenas(dto, usuarioAtivo)`: atualiza `ordem` das cenas `PLANEJADA` da campanha.
   - `recuperarCena({ id }, usuarioAtivo)`: **recusa acesso** (não apenas omite dados) a quem não é
     mestre da campanha quando a cena está `PLANEJADA` — 403/404, não um payload vazio.
   - `listarPorCampanha(dto, usuarioAtivo)`: mestre recebe todas; jogador/espectador recebe só
     `ATIVA`/`ENCERRADA` (ponto em aberto do milestone sobre histórico do jogador — decidir aqui e
     documentar a escolha nesta task, atualizando `m7-cenas.spec.md` se divergir do rascunho).
3. **`EncontroService` para de arbitrar a invariante de "um por campanha"** — remove a checagem de
   `recuperarAbertoPorCampanha` de `criarEncontro` (a `CenaService` já garante isso antes de pedir
   o encontro) ou mantém como validação defensiva redundante, documentando a escolha.
4. **Trava anti-vazamento**: `EncontroService.emitirEstado`/`recuperarEncontro` passam a consultar a
   cena-mãe (`encontro.cena_id`) e **não emitem** `encontro:alterado` nem respondem `GET
   encontro/:id` a não-mestre enquanto essa cena estiver `PLANEJADA`. Testado explicitamente: mestre
   adiciona combatentes a um encontro de uma cena planejada — nenhum evento chega a um jogador
   conectado na mesma sala.
5. **Endpoints novos** (`CenaController`, mesmo padrão fino do `EncontroController`):
   `POST campanha/:id/cena`, `GET campanha/:id/cena`, `GET cena/:id`, `POST cena/:id/abrir`,
   `POST cena/:id/encerrar`, `PUT campanha/:id/cena/ordem`.
6. **Evento `cena:alterada`** (`CampanhaGateway.emitirCenaAlterada`, mesmo molde de
   `emitirEncontroAlterado`), emitido pela `CenaService` depois de cada mutação persistida, na sala
   `campanha:<id>` — exceto quando a cena está `PLANEJADA` (trava do item 4, mesma regra).
7. **`NOT NULL` de `encontro.cena_id`** (adiado da `m7-21` por decisão do autor — ver a seção
   "Decisões tomadas na implementação" de `docs/specs/done/m7-21-contrato-migration-cena.spec.md`):
   migration nova (próximo número livre) que cria uma cena `COMBATE` equivalente para todo encontro
   com `cena_id` nulo — os criados pelo `POST` de encontro entre a `m7-21` e esta task, mesmo
   mapeamento de status da `0032` — e aplica o `NOT NULL`. A partir daqui o encontro só nasce
   dentro da `CenaService`, **na mesma transação da cena** (o `DOWN` da `0032` depende disso para
   distinguir as cenas do backfill: cena de aplicação tem `created_date` igual ao do seu encontro).
   O `POST campanha/:id/encontro` atual deixa de criar encontro solto: ou passa a criar a cena
   `COMBATE` junto, ou é substituído pelo `POST campanha/:id/cena` — decidir e documentar aqui.
8. DTOs restantes em `shared/src/dtos/cena/`: `CenaAbrirDto`/`CenaEncerrarDto` (`{ id }`),
   `CenaReordenarDto { campanhaId, ordem: readonly number[] }`, `CenaResumoDto` (item de listagem:
   id, nome, tipo, status, `temEncontro: boolean`), `CenaRecuperadaDto` (estado completo — inclui o
   `EncontroRecuperadoDto` quando `temEncontro`), `CenaAlteradaDto` (payload do broadcast).

## Critérios de Aceite

- Criar uma cena `ATIVA` de tipo `COMBATE` enquanto outra já está ativa encerra a antiga e ativa a
  nova numa única chamada — nunca duas `ATIVA` ao mesmo tempo, verificável consultando o banco
  imediatamente depois.
- Uma cena `PLANEJADA`: `GET cena/:id` por um jogador da campanha devolve erro de acesso, não um
  payload; nenhum evento de socket relativo a ela (nem `cena:alterada`, nem `encontro:alterado` do
  encontro dela) chega a uma conexão de jogador.
- Abrir a cena a torna visível: o próximo `GET`/evento por um jogador já funciona.
- Encerrar uma cena com encontro `ATIVO` deixa **os dois** em estado encerrado — nunca um sem o
  outro.
- Reordenar cenas planejadas persiste a nova ordem e o `listarPorCampanha` reflete imediatamente.
- Todos os endpoints de mutação recusam quem não é mestre da campanha (403), inclusive chamada
  direta sem passar pela UI.
- `npm run test -w shared` e `-w backend` verdes, com testes novos cobrindo a trava anti-vazamento
  e a invariante de cena única ativa.

## Fora de Escopo

- Qualquer tela nova (`m7-23`).
- Painel de Investigação e vínculo com documentos (`m7-25`, depende da M9).
- Migrar a invariante de `encontro` para índice parcial único no banco — continua arbitrada na
  service (mesma decisão de `m7-01`, agora na `CenaService`).

## Dependências

`m7-21` (schema e `cenaTemIniciativa`), `m7-03`/`m7-04` (`EncontroService`/`EncontroRepository`
reaproveitados), `CampanhaGateway` (broadcast-only, §9).

## Decisões tomadas na implementação (2026-09-26)

1. **Transação em runtime.** O backend não tinha transação fora das migrations. Nasceu o
   `TransacaoService` (`backend/src/database/transacao.service.ts`, exportado pelo `DatabaseModule`
   global): a service envolve as escritas num callback e o `BaseRepository` usa a transação corrente
   (via `AsyncLocalStorage`) sem receber `trx` — o SQL continua no repositório dono de cada tabela,
   e a `CenaService` reaproveita `EncontroRepository.criarEncontro` como a spec pede. Chamada
   aninhada reaproveita a transação aberta. Emissões saem só depois do commit. Convenção registrada
   em `docs/CONVENTIONS.md` ("Escrita atômica").
2. **Item 3 — `EncontroService.criarEncontro` foi removido**, não mantido como validação redundante:
   o encontro só nasce dentro da `CenaService`, que arbitra a invariante nova (uma cena `ATIVA` por
   campanha). A invariante antiga ("um encontro não-encerrado por campanha") deixou de valer — cada
   cena planejada pode ter o seu encontro em `MONTAGEM`. `recuperarAbertoPorCampanha` virou
   `recuperarAbertoDaCenaAtiva` (espectador/prévia) e `listarAbertosPorCampanha` (ressincronização
   de ficha, agora percorrendo todos os abertos).
3. **Item 7 — destino das rotas antigas.** `POST campanha/:id/encontro` e `POST encontro/:id/encerrar`
   **mantêm a URL** (o frontend atual continua funcionando até a `m7-23`), mas passaram para o
   `CenaController`: a primeira cria uma cena `COMBATE` já `ATIVA` com o encontro e devolve o
   `EncontroCriadoDto`, recusando se já houver cena em andamento (como a rota fazia antes); a segunda
   encerra a cena-mãe e, com ela, o encontro. `EncontroService.encerrarEncontro` virou
   `encerrarEncontroDaCena` (sem validação de papel nem emissão — quem chama é a `CenaService`,
   dentro da transação).
4. **Só a cena `ATIVA` encerra.** `encerrarCena` recusa `PLANEJADA`: assim uma `ENCERRADA` é sempre
   uma cena que a mesa já viu e o histórico do jogador nunca expõe um preparo descartado. Descartar
   uma cena planejada fica para uma exclusão futura (não prevista nesta task).
5. **Histórico do jogador (ponto em aberto do milestone).** `listarPorCampanha`: mestre recebe todas;
   jogador e espectador recebem `ATIVA` + `ENCERRADA` (o rascunho do milestone). Registrado em
   `m7-cenas.spec.md`.
6. **Trava estendida além do mínimo da spec**, pelo mesmo motivo da decisão #7 do milestone: a
   listagem `GET campanha/:id/encontro` omite encontros de cena planejada para quem não é mestre;
   jogador não atribui iniciativa nem avança turno nela; `pedirIniciativa` e `iniciarEncontro` são
   recusados enquanto a cena está planejada (o chamado vai à sala inteira; rodar o combate é da
   mesa — encontro `ATIVO` só existe em cena `ATIVA`). A emissão de `encontro:alterado` usa o recorte
   por usuário que já existia: o de jogador/espectador estoura 403 e o gateway descarta o socket.
   `cena:alterada` de cena planejada vai só a `campanha:<id>:mestre`.
7. **`0033` também reconcilia status.** No dev, um encontro de backfill (`MONTAGEM` → cena
   `PLANEJADA`) foi encerrado pelo endpoint antigo depois da `0032`, deixando cena `PLANEJADA` com
   encontro `ENCERRADO`. A `0033` realinha a cena pelo mapeamento da `0032` para encontros
   `ATIVO`/`ENCERRADO` (os únicos que o intervalo pode ter feito avançar), além do backfill dos
   `cena_id` nulos e do `NOT NULL`.
8. **Nota de deploy — `m7-22` e `m7-23` sobem juntas.** Os encontros de backfill em `MONTAGEM`
   estão em cenas `PLANEJADA` (decisão #6 do milestone): com esta task só o mestre os vê, e iniciar,
   pedir iniciativa e encerrar exigem abrir a cena — o que, até o hub da `m7-23`, só é possível pela
   API (`POST cena/:id/abrir`). No dev há 10 assim.
