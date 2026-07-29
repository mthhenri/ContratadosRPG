# m3-27-historico-rolagem.spec.md

> Task 27 do milestone `m3-ficha-jogador.spec.md`. Fecha o pacote **Rolagem** (`m3-16`…`m3-22`)
> dando **persistência** ao que hoje só pisca na bandeja: as rolagens passam a ser **gravadas** e
> ganham **histórico por ficha** + **feed em tempo real na campanha**.
> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Testes" / "Dano". **O documento vence**
> (proibição #27). **Antes de qualquer UI:** `docs/design/DESIGN.md` + tokens de
> `docs/design/tema/` (proibição #29).
> **Independe do `m3-28`:** grava com `campanha_id` nulo (ficha solta) ou preenchido.

## Objetivo

Hoje o motor `shared/regras/rolagem` roda **100% no cliente** e o resultado só aparece na
**bandeja flutuante** (`BandejaDadosService`, ~7s, teto 5 entradas) — **nada persiste**. Não há
tabela, módulo nem endpoint de rolagem no backend.

Esta task cria a persistência: uma tabela **`rolagem`** com o resultado em **JSONB**, relacionada
à **ficha**, à **campanha** e ao **usuário autor**. **Toda rolagem disparada a partir de uma
ficha** (teste de atributo na Visão Geral; passos de preset) é gravada automaticamente. O
histórico aparece numa **aba "Histórico"** da ficha e num **feed da campanha** (no detalhe), com
atualização em **tempo real**. Cada rolagem carrega uma **visibilidade**: `PUBLICA` (todos os
membros da campanha veem) ou `PRIVADA` (só o **autor + o mestre** — o mesmo mecanismo cobre o
mestre rolando "só para si", pois aí autor = mestre).

## Entregáveis

1. **Migration `0010 - Tabela rolagem.sql`** (padrão de `0007`/`0008`; BaseEntity spelled-out, sem
   `DEFAULT`, constraints nomeadas):
   - Colunas: BaseEntity (`id SERIAL`, `created_date`, `updated_date`, `is_deleted`,
     `deleted_date`) + `ficha_id INTEGER NOT NULL` + `campanha_id INTEGER` (**nullable** — rolagem
     em ficha sem campanha) + `usuario_id INTEGER NOT NULL` (autor) + `rotulo VARCHAR NOT NULL` +
     `modo VARCHAR` (nullable = `SOMA` legado) + `visibilidade VARCHAR NOT NULL` +
     `resultado JSONB NOT NULL`.
   - Constraints/índices: `pk_rolagem`, `fk_rolagem_ficha`, `fk_rolagem_campanha`,
     `fk_rolagem_usuario`, `ix_rolagem_ficha`, `ix_rolagem_campanha`, trigger
     `trg_rolagem_updated_date` → `fn_set_updated_date()`.
   - `modo` e `visibilidade` são **enums de conteúdo/jogo** → gravados como VARCHAR do valor do
     enum TS, **sem tabela `tipo_*`** (SYSTEM.SPEC §10.3, coerente com os demais enums de rolagem).

2. **Contrato (shared)** — novo `shared/src/dtos/rolagem/` (espelha `shared/src/dtos/ficha/`):
   - `RolagemRegistrarDto { rotulo; modo?: RolagemModoEnum; visibilidade: RolagemVisibilidadeEnum;
     resultado: ResultadoRolagemDto }` — o `fichaId` vem da rota (fundido no controller).
   - `RolagemResumoDto { id; fichaId; campanhaId: number | null; usuarioId; nomeAutor; nomeFicha;
     rotulo; modo?; visibilidade; resultado: ResultadoRolagemDto; createdDate }` — item de
     listagem/feed.
   - `RolagemInternoRegistrarDto` — service → repo, já com `usuarioId`/`campanhaId` resolvidos da
     ficha.
   - **Novo enum `RolagemVisibilidadeEnum { PUBLICA, PRIVADA }`** em `shared/src/enums/`
     (SCREAMING_SNAKE, value == name). Semântica: `PRIVADA` = **autor + mestre**.
   - O `resultado` **reusa `ResultadoRolagemDto`** de
     `shared/src/regras/rolagem/rolagem.dtos.ts` — **nenhum tipo novo de resultado**.
   - `SCHEMA.md`: adicionar a tabela `rolagem` + a forma do JSONB `resultado`.

3. **Backend — novo módulo `backend/src/modules/rolagem/`** (controller/service/repository/module,
   registrado em `app.module.ts`, importando `FichaModule` p/ reuso de permissão + `GatewayModule`):
   - `POST /ficha/:id/rolagem` → `registrarRolagem`: controller funde `{ ...dto, fichaId: id }`;
     o service **reusa `FichaService.validarPermissaoVisualizacao`** (quem pode **ver** a ficha
     pode rolar), resolve `campanha_id`/`usuario_id` a partir da ficha, insere
     (`INSERT INTO rolagem (...) SELECT :fichaId, :campanhaId, :usuarioId, :resultado::jsonb, ...
     RETURNING ...`), então `campanhaGateway.emitirRolagemRegistrada(...)`.
   - `GET /ficha/:id/rolagem` → histórico da ficha (dono/mestre/acesso; `ORDER BY created_date
     DESC`, paginado via `executarConsultaPaginada`).
   - `GET /campanha/:id/rolagem` → feed da campanha, **filtrado por visibilidade conforme o
     solicitante**: `PUBLICA` para todos os membros; `PRIVADA` só se `usuario_id == solicitante`
     **ou** o solicitante é **mestre** da campanha. Gate de membro como `FichaService.listarFichas`.
   - **Gateway** (`backend/src/core/gateway/campanha.gateway.ts`): novo `emitirRolagemRegistrada`
     espelhando `emitirFichaCriada` → evento `rolagem:registrada` na sala `campanha:<id>`.
     **Decisão de design (v1):** só rolagens `PUBLICA` são broadcastadas em tempo real (evita
     vazar privadas pela rede sem emissão direcionada); rolagens `PRIVADA` aparecem para autor/
     mestre via REST no próximo carregamento/refresh do feed. Guardar o emit quando `campanha_id`
     for `null` (ficha solta, sem sala).

4. **Frontend:**
   - **Persistir nos dois pontos que chamam `bandeja.mostrar`:**
     - `ficha-visualizacao.component.ts` `rolarTesteAtributo` (já expõe `fichaId`) → após
       `mostrar`, chama `RolagemService.registrar(...)`.
     - `ficha-rolagens.component.ts` `rolarPassoDoPreset` (**não** recebe `fichaId` hoje) →
       seguir o padrão **controlado** do componente: novo output `rolagemFeita`; quem persiste é a
       `visualizar.page` (dona da persistência, como já faz com `rolagensMudou`/`energiaGasta`).
     - Gravação **otimista**, fire-and-forget.
   - **Controle de visibilidade:** toggle "rolagem oculta" na área de rolagem (default `PUBLICA`);
     o mesmo toggle serve ao mestre para rolar só-para-si.
   - **Aba "Histórico" na ficha:** estender a union `AbaFicha` + a lista `ABAS_FICHA` (novo id
     `historico`, atualizar `ehAbaFicha`) em `ficha-visualizacao.component.ts`; painel
     `@if (abaAtiva() === 'historico')` no HTML; novo componente **`FichaHistorico`** que lista via
     `RolagemService.listarPorFicha` e **reusa a renderização da carta da bandeja** para o
     resultado; assina o evento tempo-real para dar prepend.
   - **Feed no detalhe da campanha:** `campanha/paginas/detalhe/detalhe.page.ts` **ganha wiring de
     socket** (hoje não tem nenhum) — `TempoRealService.conectar()` + `entrarSalaCampanha(id)` +
     assinatura de `rolagem:registrada` — e lista via `RolagemService.listarPorCampanha`. Todos os
     membros veem; privadas já vêm filtradas do servidor.
   - **`TempoRealService`** (`core/services/tempo-real.service.ts`): novo par Subject/Observable
     `rolagemRegistrada$` (espelha `fichaCriada$`), wired em `conectar()` + `reingressarSalas()`.
   - **Novo `RolagemService`** (frontend): `registrar(fichaId, dto)`, `listarPorFicha(fichaId)`,
     `listarPorCampanha(campanhaId)`; strip de `StandardResponse.dados` como o `FichaService`.
   - Standalone, Signals, `.scss`/BEM só com tokens do tema (proibição #29).

## Critérios de Aceite

- Rolar um teste de atributo (Visão Geral) ou um passo de preset numa ficha **grava** a rolagem;
  recarregar a ficha mostra o **histórico** em ordem decrescente.
- O **feed da campanha** (detalhe) atualiza em **tempo real** para rolagens `PUBLICA`.
- Uma rolagem `PRIVADA` **não** aparece para os outros jogadores, mas aparece para o **autor** e
  para o **mestre**.
- Rolagem numa **ficha sem campanha** grava normalmente (aba Histórico da ficha), sem alimentar
  nenhum feed de campanha.
- Nenhuma regra de jogo nova; `resultado` persiste 1:1 com `ResultadoRolagemDto`.

## Fora de Escopo

- Emissão **direcionada** de rolagens privadas por socket (v1 entrega privadas via REST no
  refresh).
- Crítico automático e dados físicos 3D (features futuras, já fora do escopo em `m3-22`).
- Persistir rolagens **anônimas** da calculadora pública (não têm ficha/usuário).
- Editar/excluir itens do histórico pela UI (só o soft-delete de infraestrutura existe).

## Dependências

- `m3-16`…`m3-22` (motor de rolagem + bandeja + presets/runner).
- `m3-05`/`m3-08` (gateway broadcast-only + `TempoRealService`).
- `m3-03`/`m3-04` (ficha CRUD + permissão de visualização/acesso, reusada aqui).