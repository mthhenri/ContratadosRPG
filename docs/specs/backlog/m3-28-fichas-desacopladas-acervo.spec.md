# m3-28-fichas-desacopladas-acervo.spec.md

> Task 28 do milestone `m3-ficha-jogador.spec.md`. Desacopla a **ficha** da **campanha**: ela
> deixa de ser filha obrigatória e ganha um **acervo próprio** do usuário.
> **Antes de qualquer UI:** `docs/design/DESIGN.md` + tokens de `docs/design/tema/` (proibição #29).
> **Convive com `m3-26`:** as rotas de ficha **em campanha** continuam por ora; a tela de fichas
> dentro da campanha será removida no `m3-26`.

## Objetivo

Hoje `ficha.campanha_id` é `NOT NULL` e **toda** a UI de ficha mora sob
`/painel/:campanhaId/ficha` — não existe ficha sem campanha, nem uma visão "todas as minhas
fichas". Esta task torna `campanha_id` **nullable** (cardinalidade **1:N** — no máximo **uma**
campanha por vez; reatribuir **move**) e cria uma área **"Fichas"** no topo (ao lado de
"Campanhas"): o **acervo** do usuário, onde ele vê todas as suas fichas em bloquinhos, **cria
ficha solta** (sem atrelamento) e depois **atribui / desatribui** uma ficha a uma campanha.

As rotas campanha-scoped atuais (`/painel/:campanhaId/ficha/*`) **permanecem** — a duplicação é
temporária e some no `m3-26` (que remove a tela de fichas dentro da campanha).

## Entregáveis

1. **Migration `0009 - Ficha campanha opcional.sql`:**
   - `-- UP`: `ALTER TABLE ficha ALTER COLUMN campanha_id DROP NOT NULL;`
   - `-- DOWN`: `ALTER TABLE ficha ALTER COLUMN campanha_id SET NOT NULL;`
   - A FK `fk_ficha_campanha` e o índice `ix_ficha_campanha` já toleram `NULL` — mantidos.

2. **Contrato (shared)** — `shared/src/dtos/ficha/ficha-operacao.dtos.ts`:
   - `campanhaId` passa a `number | null` em `FichaCriadaDto`, `FichaRecuperadaDto`,
     `FichaAlteradaDto`, `FichaResumoDto`; em `FichaCriarDto` vira **opcional**
     (`campanhaId?: number`).
   - Novo `FichaAtribuirCampanhaDto { campanhaId: number | null }`.
   - `SCHEMA.md`: documentar `ficha.campanha_id` como **nullable** + nota do acervo.

3. **Backend — `backend/src/modules/ficha/*`:**
   - `criarFicha`: se `campanhaId` ausente/null → **pula `validarMembro`** e insere
     `campanha_id NULL`, dono = usuário ativo; se presente → mantém `validarMembro`.
   - **Permissões:** em `validarPermissaoVisualizacao`/`validarPermissaoEdicao`, quando
     `ficha.campanhaId === null`, **curto-circuitar para dono-apenas** — guardar o ramo "mestre"
     atrás de `campanhaId != null` (não chamar `recuperarMembro` com `null`). Grants de
     `usuario_ficha_acesso` continuam valendo (são ficha-scoped).
   - **Repo:** nova query `listarPorUsuario` — todas as fichas do dono, **com e sem campanha**,
     para o acervo (`WHERE usuario_id = :usuarioId AND is_deleted = false`, trazendo `campanha_id`
     e o nome da campanha para o chip). Endpoint `GET /ficha/minhas`.
   - **Atribuir:** `PUT /ficha/:id/campanha` → `atribuirCampanha` (service: valida edição = dono;
     se alvo **não-null**, valida que o dono é **membro** da campanha; atualiza `campanha_id`;
     emite no gateway). `campanhaId: null` = **desatribuir** (volta ao acervo).
   - **Gateway** (`backend/src/core/gateway/campanha.gateway.ts`): guardar `emitirFichaCriada`
     quando `campanha_id === null` (sem sala). Ao **atribuir**, emitir `ficha:criada` (resumo) na
     nova sala de campanha; ao **desatribuir**, `ficha:removida` (opcional) na sala anterior.
   - **Controller:** novos endpoints dumb (`minhas`, `:id/campanha`), fundindo o id na DTO.

4. **Frontend:**
   - **Nav:** item **"Fichas"** no `topbar__nav` (`shared/layout/layout.component.html`, ao lado
     de "Painel/Campanhas"), rota `/fichas`, ícone existente do conjunto `app-icone`.
   - **Rota nova top-level `/fichas`** (fora de `:campanhaId`): acervo (lista + criação) e a
     visualização campanha-agnóstica `/fichas/:id` — lê `campanhaId` do **payload** da ficha, não
     da URL. As rotas `/painel/:campanhaId/ficha/*` **continuam** (morrem no `m3-26`).
   - **Acervo (`FichaAcervo`):** grid de bloquinhos de **todas** as fichas do usuário
     (`FichaService.listarMinhasFichas`), cada card com **chip da campanha** (ou "Sem campanha");
     botão **criar** reusando `FichaCriarDialog` (que já não conhece campanha) →
     `criarFicha({ nome, dados })` **sem** `campanhaId` → navega a `/fichas/:id`. Ações
     **"Atribuir a campanha"** (dropdown das campanhas do usuário) e **"Remover da campanha"**.
   - **`FichaService`:** `criarFicha` aceita `campanhaId` opcional; `listarMinhasFichas()`;
     `atribuirCampanha(id, campanhaId | null)`.
   - Standalone, Signals, `.scss`/BEM só com tokens do tema (proibição #29).

## Critérios de Aceite

- Criar uma ficha **sem campanha** pelo acervo; ela abre em `/fichas/:id` e é editável no próprio
  lugar (mesmo comportamento de `m3-10`).
- O acervo lista **todas** as fichas do usuário com o **chip** da campanha (ou "Sem campanha").
- **Atribuir** move a ficha para a campanha — ela passa a aparecer na lista da campanha em tempo
  real e o mestre passa a ver/editar; **desatribuir** devolve ao acervo.
- Ficha **sem campanha** só é vista/editada pelo **dono** (mais grants explícitos de
  `usuario_ficha_acesso`).
- Ficha **em campanha** mantém 100% do comportamento atual (mestre vê/edita).

## Fora de Escopo

- Remoção da tela de fichas **dentro** da campanha (`m3-26`).
- Unificar as duas rotas de visualização num único componente (dívida assumida até `m3-26`).
- **N:N** (várias campanhas ao mesmo tempo) e **cópia/snapshot** ao atribuir.

## Dependências

- `m3-03`/`m3-04` (ficha CRUD + acesso/permissão).
- `m3-06`/`m3-10` (criação e edição inline da ficha).
- `m3-07` (lista de fichas — o acervo reaproveita o card/estilo).
- `m2-07` (campanhas — dropdown de atribuição).