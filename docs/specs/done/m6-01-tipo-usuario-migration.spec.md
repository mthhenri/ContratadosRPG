# m6-01-tipo-usuario-migration.spec.md

> Task 1/7 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Modelo de dados do **tipo de usuário global** e da **versão de token** — a base sobre a qual
todo o resto do M6 (autorização, gestão admin, mecânica de tester) é construído. Sem regra de
negócio nova: só schema, seed, backfill e o ajuste mínimo no `INSERT` de registro para não
quebrar quando a coluna virar `NOT NULL`.

## Entregáveis

1. **Migration** `NNNN - Tipo de usuário e controle de sessão.sql` (próximo prefixo sequencial
   disponível em `backend/src/database/migrations/` — hoje `0015`, conferir no momento da
   implementação), com `-- UP`/`-- DOWN`:
   - `CREATE TABLE tipo_usuario` (BaseEntity + `codigo` + `descricao`, padrão de
     `tipo_campanha_membro_papel`/`tipo_ficha` — §10.2.12), com
     `uix_tipo_usuario_codigo_ativo` (`codigo`, `WHERE is_deleted = false`).
   - **Seed** (literal SQL — exceção do §10.7, só migration) das 3 linhas: `NORMAL` /
     "Normal", `ADMIN` / "Administrador", `TESTER` / "Testador".
   - `ALTER TABLE usuario ADD COLUMN tipo_usuario_id INTEGER` (sem `NOT NULL` ainda — a coluna
     não pode nascer `NOT NULL` sem `DEFAULT` numa tabela com linhas existentes, e `DEFAULT` é
     proibido em qualquer coluna — §10.2.5/Proibição #7) e `fk_usuario_tipo_usuario`.
   - `ALTER TABLE usuario ADD COLUMN token_versao INTEGER` (mesma restrição).
   - **Backfill**, na mesma migration, antes de travar `NOT NULL`: `UPDATE usuario SET
     tipo_usuario_id = (SELECT id FROM tipo_usuario WHERE codigo = 'ADMIN'), token_versao = 1
     WHERE login = 'senhor.contratados'`; e `UPDATE usuario SET tipo_usuario_id = (SELECT id
     FROM tipo_usuario WHERE codigo = 'NORMAL'), token_versao = 1 WHERE tipo_usuario_id IS
     NULL`.
   - `ALTER TABLE usuario ALTER COLUMN tipo_usuario_id SET NOT NULL, ALTER COLUMN token_versao
     SET NOT NULL` — só depois do backfill cobrir 100% das linhas.
   - `-- DOWN` reverte na ordem inversa: dropa as duas colunas de `usuario` (com a FK) e depois
     `tipo_usuario`.
2. **`TipoUsuarioEnum`** em `shared/src/enums/tipo-usuario.enum.ts` (string enum,
   `NORMAL | ADMIN | TESTER`, valores `SCREAMING_SNAKE_CASE` iguais aos nomes — Proibição #1),
   exportado em `shared/src/enums/index.ts`.
3. **Compat do registro público (m2-02)**: `UsuarioInternoCriarDto`
   (`shared/src/dtos/usuario/usuario.dtos.ts`) ganha o campo `tipo: TipoUsuarioEnum`.
   `AutenticacaoService.registrar` passa `tipo: TipoUsuarioEnum.NORMAL` explicitamente (nunca
   vindo do `UsuarioCriarDto` público — o cliente não escolhe o próprio tipo). `token_versao`
   nasce em `1`, fixo no repositório (não é parâmetro do DTO).
4. **`UsuarioRepository.criarUsuario`**: o `INSERT ... SELECT ... RETURNING` (nunca `VALUES` —
   Proibição #6) passa a resolver `tipo_usuario_id` por um `FROM tipo_usuario WHERE codigo =
   :tipo AND is_deleted = false` (tradução `codigo ↔ id` no repositório — §10.2.12) e grava
   `token_versao = 1` literal na `SELECT`.
5. **`docs/SCHEMA.md`** atualizado: nova seção `tipo_usuario (M6)` (mesmo formato de
   `tipo_campanha_membro_papel`) e a definição de `usuario` ganha `tipo_usuario_id` +
   `token_versao`.

## Critérios de Aceite

- Migration roda limpo (`up`) e reverte (`down`) sem erro num banco com dados existentes.
- Após a migration: `tipo_usuario` tem as 3 linhas; `senhor.contratados` está `ADMIN`; todas as
  demais contas existentes estão `NORMAL`; toda linha de `usuario` tem `token_versao = 1`.
- `usuario.tipo_usuario_id` e `usuario.token_versao` são `NOT NULL`, sem `DEFAULT`.
- O fluxo de registro público (`POST /autenticacao/registro`) continua funcionando após a
  coluna virar `NOT NULL`, gravando sempre `NORMAL`.
- SQL segue todas as regras de §10.2/§10.7/§16 (parâmetros nomeados, sem `VALUES`/`DEFAULT`,
  constraints nomeadas, `is_deleted = false` em todo SELECT).

## Fora de Escopo

- Qualquer leitura de sessão, guard ou decorator de autorização (`m6-02`).
- Gestão de usuários pelo admin (`m6-03`/`m6-04`).
- Alterar `UsuarioCriadoDto`/resposta do registro para expor o `tipo` — não é pedido pelo
  critério de aceite deste milestone.

## Dependências

- `m2-01` (tabela `usuario`), `m2-02` (módulo `autenticacao`, `criarUsuario`).
