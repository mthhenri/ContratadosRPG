# m6-03-backend-gestao-usuarios-admin.spec.md

> Task 3/4 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Backend da **gestão de usuários pelo admin**: listar, criar, alterar, excluir (soft delete) e
**trocar o tipo** de qualquer usuário. Estende o módulo `usuario`. Protegido por
`@TiposPermitidos(ADMIN)` (m6-02). Sem frontend.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/` (CONVENTIONS / skill `dto-conventions`) — complemento
   inteiro **antes** do verbo:
   - `UsuarioAdminCriarDto` (`{ login, senha, nome, tipo: TipoUsuarioEnum }`) /
     `UsuarioAdminCriadoDto` (`{ id, login, nome, tipo }` — **sem** senha).
   - `UsuarioAdminListarDto` (filtro/paginação — `pagina`, `itensPorPagina`, `ordenarPor`,
     `direcao`, opcional `allRows?`) / `UsuarioResumoDto` (`{ id, login, nome, tipo }`).
   - `UsuarioAdminAlterarDto` (`{ nome, login }`) / `UsuarioAdminAlteradoDto`
     (`{ id, login, nome, tipo }`). *(Troca de tipo é operação própria — abaixo.)*
   - `UsuarioTipoAlterarDto` (`{ tipo: TipoUsuarioEnum }`) / `UsuarioTipoAlteradoDto`
     (`{ id, login, nome, tipo }`) — complemento `Tipo` + verbo.
   - `UsuarioExcluirDto` reutilizado da m2-11 (interno `{ id }`); internos
     `UsuarioAdminInternoCriarDto`/`UsuarioTipoInternoAlterarDto` (`{ id, tipo }`) conforme a
     regra "id no DTO, nunca solto".
   - **Não** redefinir DTOs já existentes; distinguir do self-service (`UsuarioPerfil*` da m2-11)
     — estes são operações **de admin sobre terceiros**.
2. **Repository** (`usuario`, dono das queries — proibição #23): `listarUsuarios` (paginado, com
   JOIN em `tipo_usuario` trazendo o `codigo` como `tipo`), `criarUsuario` de admin (reusa/estende
   o INSERT existente incluindo `tipo_usuario_id` via subconsulta por `codigo`), `alterarUsuario`
   (nome/login), `alterarTipoUsuario` (`UPDATE tipo_usuario_id = (SELECT ... WHERE codigo = :tipo)
   ...`), contagem `contarAdminsAtivos` (para a invariante), exclusão via `executarSoftDelete`.
   Todo SQL segue §10.2/§16 (nomeado, `is_deleted = false`, `INSERT ... SELECT ... RETURNING`).
3. **Service** — toda a regra:
   - `criarUsuarioComoAdmin`: valida login único (reusa `recuperarPorLogin`), encripta a senha
     (bcrypt, mesmo custo do registro), persiste com o `tipo` informado.
   - `listarUsuariosComoAdmin`, `alterarUsuarioComoAdmin`, `alterarTipoUsuario`,
     `excluirUsuarioComoAdmin` — todas exigindo `ADMIN` (via decorator na controller; o service
     recebe o `@ActiveUser()` para as invariantes abaixo).
   - **Invariante de ≥1 admin ativo** (espelha "exatamente um mestre" da m2-10): não permitir
     **excluir** o último `ADMIN` ativo nem **rebaixar** o último `ADMIN` para outro tipo →
     `BusinessException` orientando promover outro antes. Alterar login para um já usado por outra
     conta ativa → `BusinessException('Login já está em uso')` (§11).
   - Senha **nunca** volta ao cliente em resposta alguma.
4. **Controller** burra (`@TiposPermitidos(TipoUsuarioEnum.ADMIN)` na classe): `GET /usuario`
   (listar), `POST /usuario` (criar), `PUT /usuario/:id` (alterar nome/login),
   `PATCH /usuario/:id/tipo` (trocar tipo), `DELETE /usuario/:id` (excluir) — id do `@Param`
   injetado no DTO. **Atenção à rota**: o self-service da m2-11 usa `DELETE /usuario` (própria
   conta) e `PATCH /usuario/perfil`; as rotas de admin operam sobre `/:id` — não colidem, mas
   documentar a distinção.
5. **Testes de service** (Vitest): criação com tipo, login duplicado barrado, listagem paginada,
   troca de tipo, exclusão soft delete, e a **invariante de ≥1 admin** (bloqueia excluir/rebaixar
   o último admin).

## Critérios de Aceite

- Admin cria usuário com tipo definido; senha nunca retorna; login duplicado é barrado.
- Admin altera nome/login e troca o tipo de qualquer conta.
- Exclusão é **soft delete** (proibição #14).
- Não é possível excluir nem rebaixar o **último `ADMIN` ativo** → `BusinessException`.
- Todas as rotas de admin retornam 403 para não-admin (guard da m6-02).
- SQL segue §10.2/§16; DTOs seguem CONVENTIONS.

## Fora de Escopo

- Frontend (m6-04).
- Reset de senha de terceiros pelo admin — **decisão em aberto**: incluir um
  `PATCH /usuario/:id/senha` de admin só se desejado; por padrão fica de fora do v1 (admin recria
  a conta se necessário). Registrar se entrar.
- Fechar/abrir o registro público (decisão 1 da spec mãe — mantido aberto por padrão).
- Mecânica de tester aplicada a módulos (infra já entregue na m6-02).

## Dependências

- `m6-01` (coluna/tabela de tipo), `m6-02` (`@TiposPermitidos`, guard, tipo no JWT).
- M2 (módulo `usuario`, `UsuarioRepository`, padrão self-service da m2-11).
