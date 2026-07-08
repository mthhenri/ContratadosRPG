# m6-03-backend-gestao-usuarios-admin.spec.md

> Task 3/4 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Backend da **gestão de usuários pelo admin** com o conjunto completo de ações sobre qualquer
conta: listar (com busca/filtro), criar, alterar (nome/login), **resetar senha**, **trocar o
tipo**, excluir (soft delete) e **reativar** (desfazer o soft delete). Estende o módulo `usuario`.
Protegido por `@TiposPermitidos(ADMIN)` (m6-02). Sem frontend.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/` (CONVENTIONS / skill `dto-conventions`) — complemento
   inteiro **antes** do verbo:
   - `UsuarioAdminCriarDto` (`{ login, senha, nome, tipo: TipoUsuarioEnum }`) /
     `UsuarioAdminCriadoDto` (`{ id, login, nome, tipo }` — **sem** senha).
   - `UsuarioAdminListarDto` (paginação `pagina`/`itensPorPagina`/`ordenarPor`/`direcao`,
     opcional `allRows?`; **filtros** `busca?: string` (login/nome) e `tipo?: TipoUsuarioEnum`;
     `incluirExcluidos?: boolean` para a lixeira) / `UsuarioResumoDto`
     (`{ id, login, nome, tipo, isDeleted }`).
   - `UsuarioAdminAlterarDto` (`{ nome, login }`) / `UsuarioAdminAlteradoDto`
     (`{ id, login, nome, tipo }`). *(Troca de tipo e reset de senha são operações próprias.)*
   - `UsuarioTipoAlterarDto` (`{ tipo: TipoUsuarioEnum }`) / `UsuarioTipoAlteradoDto`
     (`{ id, login, nome, tipo }`) — complemento `Tipo` + verbo.
   - `UsuarioSenhaResetarDto` (`{ senha }`) / `UsuarioSenhaResetadaDto` (`{ id, login }` — **sem**
     senha) — reset **pelo admin** (distinto do `UsuarioSenhaAlterarDto` da m2-03, que exige
     `senhaAtual`; o admin não conhece a senha atual, então redefine direto).
   - `UsuarioReativarDto` / `UsuarioReativadoDto` (`{ id, login, nome, tipo }`).
   - Internos com `id` embutido (`UsuarioAdminInternoCriarDto`, `UsuarioTipoInternoAlterarDto`
     `{ id, tipo }`, `UsuarioSenhaInternoResetarDto` `{ id, senha }`, `UsuarioReativarDto { id }`)
     — regra "id no DTO, nunca solto". `UsuarioExcluirDto` reutilizado da m2-11.
   - **Não** redefinir DTOs já existentes; distinguir do self-service (`UsuarioPerfil*`/
     `UsuarioSenha*` da m2-11/m2-03) — estes são operações **de admin sobre terceiros**.
2. **Repository** (`usuario`, dono das queries — proibição #23):
   - `listarUsuarios` (paginado, JOIN `tipo_usuario` trazendo `codigo` como `tipo`, com `WHERE`
     de busca `login ILIKE`/`nome ILIKE` e filtro por `tipo`); por padrão só ativos
     (`is_deleted = false`).
   - `listarUsuariosExcluidos` (a lixeira — `WHERE is_deleted = true`; exceção consciente e
     documentada à proibição #4, ver spec mãe decisão 4) para o modo `incluirExcluidos`.
   - `criarUsuario` de admin (INSERT incluindo `tipo_usuario_id` via subconsulta por `codigo` e
     `token_versao = 1`), `alterarUsuario` (nome/login), `alterarTipoUsuario`
     (`UPDATE tipo_usuario_id = (SELECT ... WHERE codigo = :tipo) ...`), `resetarSenha`
     (`UPDATE senha = :senha ...`), `reativarUsuario`
     (`UPDATE is_deleted = false, deleted_date = null WHERE id = :id AND is_deleted = true`),
     `incrementarTokenVersao` (`UPDATE token_versao = token_versao + 1 ...` — invalida a sessão),
     `contarAdminsAtivos` (para a invariante), exclusão via `executarSoftDelete`.
   - Todo SQL segue §10.2/§16 (nomeado, `is_deleted = false` salvo a lixeira, `INSERT ... SELECT
     ... RETURNING`).
3. **Service** — toda a regra (recebe o `@ActiveUser()` para as invariantes):
   - `criarUsuarioComoAdmin`: valida login único (reusa `recuperarPorLogin`), encripta a senha
     (bcrypt, mesmo custo do registro), persiste com o `tipo` informado.
   - `listarUsuariosComoAdmin` (aplica busca/filtro/lixeira), `alterarUsuarioComoAdmin` (login
     duplicado → `BusinessException`), `alterarTipoUsuario`, `resetarSenhaComoAdmin`,
     `excluirUsuarioComoAdmin`, `reativarUsuarioComoAdmin`.
   - **Invariante de ≥1 admin ativo** (espelha "exatamente um mestre" da m2-10): não permitir
     **excluir** nem **rebaixar** o último `ADMIN` ativo → `BusinessException` orientando promover
     outro antes.
   - **Proteções de auto-ação**: o admin **não** pode excluir a própria conta nem rebaixar o
     próprio tipo por estas rotas (evita lockout; o self-service da m2-11/m2-14 cuida da própria
     conta) → `BusinessException`.
   - **Invalidação de sessão**: `resetarSenhaComoAdmin`, `alterarTipoUsuario` e
     `excluirUsuarioComoAdmin` chamam `incrementarTokenVersao` do alvo — a sessão dele cai no
     request seguinte (guard da m6-02). Reativar **não** precisa bumpar (a conta estava sem sessão).
   - **Exclusão de um usuário que é mestre de campanha**: antes de excluir, checar (via
     `CampanhaRepository` — importar `CampanhaModule`, sem duplicar regra) se o alvo é `MESTRE` de
     alguma campanha ativa; se for → `BusinessException` orientando transferir o mestre (m2-10) ou
     excluir a campanha antes. Evita campanha órfã (edge conhecido da m2-11).
   - Senha **nunca** volta ao cliente em resposta alguma.
4. **Controller** burra (`@TiposPermitidos(TipoUsuarioEnum.ADMIN)` na classe): `GET /usuario`
   (listar, com query de busca/filtro/`incluirExcluidos`), `POST /usuario` (criar),
   `PUT /usuario/:id` (alterar nome/login), `PATCH /usuario/:id/tipo` (trocar tipo),
   `PATCH /usuario/:id/senha` (resetar senha), `DELETE /usuario/:id` (excluir),
   `POST /usuario/:id/reativar` (reativar) — id do `@Param` injetado no DTO. **Atenção à rota**: o
   self-service usa `DELETE /usuario` (própria conta, m2-11) e `PATCH /usuario/perfil`/
   `PATCH /usuario/senha` (m2-11/m2-03); as rotas de admin operam sobre `/:id` — não colidem, mas
   documentar a distinção (e garantir que a ordem de rotas não deixe `/:id` capturar `/perfil`).
5. **Testes de service** (Vitest): criação com tipo, login duplicado barrado, listagem com
   busca/filtro e com lixeira, troca de tipo, reset de senha (com bump de versão), exclusão soft
   delete (com bump), reativação, **invariante de ≥1 admin** (bloqueia excluir/rebaixar o último
   admin), **proteções de auto-ação** (admin não se auto-exclui/rebaixa), e **bloqueio de exclusão
   de mestre** de campanha.

## Critérios de Aceite

- Admin cria usuário com tipo definido; senha nunca retorna; login duplicado é barrado.
- Admin altera nome/login, troca o tipo, **reseta a senha** e **reativa** qualquer conta.
- Listagem suporta **busca** (login/nome) e **filtro** por tipo; modo lixeira lista os excluídos.
- Exclusão é **soft delete** (proibição #14); reativação desfaz o soft delete.
- Reset de senha, troca de tipo e exclusão **invalidam a sessão do alvo** (bump de `token_versao`).
- Não é possível excluir/rebaixar o **último `ADMIN` ativo**, nem o admin se **auto-excluir/
  rebaixar**, nem excluir um usuário que é **mestre** de campanha ativa → `BusinessException`.
- Todas as rotas de admin retornam 403 para não-admin (guard da m6-02).
- SQL segue §10.2/§16; DTOs seguem CONVENTIONS.

## Fora de Escopo

- Frontend (m6-04).
- Suspender/bloquear conta sem excluir, "último acesso" e auditoria de ações — não escolhidos para
  o M6 (candidatos a milestone futuro).
- Fechar/abrir o registro público (decisão 1 da spec mãe — mantido aberto por padrão).
- Mecânica de tester aplicada a módulos (infra já entregue na m6-02).

## Dependências

- `m6-01` (colunas/tabela de tipo e `token_versao`), `m6-02` (`@TiposPermitidos`, guard com
  validade de sessão, `recuperarSessao`, tipo/versão no JWT).
- M2 (módulo `usuario`, `UsuarioRepository`, `CampanhaRepository` para a checagem de mestre,
  padrão self-service da m2-11/m2-03).
