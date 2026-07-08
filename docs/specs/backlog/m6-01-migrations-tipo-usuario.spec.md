# m6-01-migrations-tipo-usuario.spec.md

> Task 1/4 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Fundação de dados do M6: introduzir o **tipo de usuário global** como enum de coluna. Pura
camada de banco + shared — **sem** service, controller, repository de operação, DTO de operação
ou frontend.

## Entregáveis

1. **Enum espelho** `TipoUsuarioEnum` em `shared/src/enums/tipo-usuario.enum.ts`
   (`NORMAL | ADMIN | TESTER`): string enum, valor igual ao nome, SCREAMING_SNAKE_CASE
   (SYSTEM.SPEC §5; CONVENTIONS "Enums"). Exportado no `shared/src/enums/index.ts`. É enum de
   **coluna** → tem tabela de referência `tipo_*` (§10.2.12), ao contrário dos enums de conteúdo
   de jogo do JSONB.
2. **Migration `.sql`** em `backend/src/database/migrations/`, número `0009` (próxima sequência —
   CONVENTIONS "Migrations"), com `-- UP` e `-- DOWN` (ambas obrigatórias), sem
   `BEGIN/COMMIT/ROLLBACK` (o Knex gerencia a transação — §10.7):
   - **Cria `tipo_usuario`**: tabela `tipo_*` com BaseEntity completa **sem DEFAULT** (§10.1),
     `codigo VARCHAR NOT NULL` + `descricao VARCHAR NOT NULL`, índice único **parcial**
     `uix_tipo_usuario_codigo_ativo (codigo) WHERE is_deleted = false`, trigger
     `trg_tipo_usuario_updated_date` usando `fn_set_updated_date()`.
   - **Seed** de `tipo_usuario` (`NORMAL`, `ADMIN`, `TESTER`) na própria migration via **literais
     SQL** (`'NORMAL'`…) — exceção sancionada a parâmetros nomeados vale só em `migrations/`
     (§10.7). `descricao` legível em português.
   - **Adiciona a coluna** `usuario.tipo_usuario_id INTEGER` com FK
     `fk_usuario_tipo_usuario` e índice `ix_usuario_tipo_usuario`. Como §10.1 proíbe `DEFAULT`,
     adicionar a coluna **nullable**, executar o backfill (abaixo), e só então aplicar
     `SET NOT NULL` — tudo dentro da mesma migration (o Knex mantém atômico).
   - **Adiciona a coluna** `usuario.token_versao INTEGER` (contador de invalidação de sessão,
     usado pelo guard da m6-02). Mesmo padrão sem `DEFAULT`: adicionar nullable, **backfill = 1**
     em todas as contas, depois `SET NOT NULL`. Nome de negócio em português (§10.2.3); não é
     data, então **não** leva sufixo `_data`.
   - **Backfill** (literais SQL): `usuario.tipo_usuario_id` = id do `ADMIN` **onde**
     `login = 'senhor.contratados'`; = id do `NORMAL` para **todas as demais** contas
     (`is_deleted = false` respeitado onde aplicável). Referenciar o id via subconsulta em
     `tipo_usuario` pelo `codigo` (tradução `codigo → id`, §10.2.12) — nunca id mágico.
   - `-- DOWN` idempotente (`DROP ... IF EXISTS`): remove FK/índice/coluna `tipo_usuario_id` e a
     coluna `token_versao` de `usuario`, e dropa `tipo_usuario`.
3. **`SCHEMA.md` sincronizado**: seção `usuario` ganha `tipo_usuario_id` e `token_versao`; nova
   seção `tipo_usuario (M6)` documentando a tabela de referência e o backfill; nota do enum de coluna.
4. **`CONVENTIONS.md`** "Próxima migration" atualizado `0009` → `0010`.

## Critérios de Aceite

- `npm run db:migrate --workspace=backend` cria `tipo_usuario`, semeia os 3 códigos, adiciona a
  coluna/FK em `usuario` e a deixa `NOT NULL` após o backfill; `npm run db:rollback` desfaz de
  forma limpa (idempotente no `-- DOWN`), e re-migrate volta ao estado.
- `senhor.contratados` fica com `tipo_usuario_id` = `ADMIN`; toda outra conta = `NORMAL`
  (verificar por `SELECT` com JOIN em `tipo_usuario`).
- Toda conta fica com `token_versao = 1` (coluna `NOT NULL` após o backfill).
- Tabela, colunas, tipos, constraints, índices parciais e trigger batem com `SCHEMA.md`.
- `build`/`test` do shared verdes (o enum não emite runtime além dos 3 membros).
- **Nenhum** service, controller, repository de negócio, DTO de operação ou frontend nesta task.

## Fora de Escopo

- Qualquer autorização, guard, CRUD de usuário pelo admin ou mecânica de tester (m6-02+).
- Colocar o tipo no payload do JWT (m6-02).
- Frontend (m6-04).

## Dependências

- M2 (`usuario` já existe com o seed `senhor.contratados`; `fn_set_updated_date()` do M0).
