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
7. DTOs restantes em `shared/src/dtos/cena/`: `CenaAbrirDto`/`CenaEncerrarDto` (`{ id }`),
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
