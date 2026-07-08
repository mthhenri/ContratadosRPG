# m6-02-backend-autorizacao-global.spec.md

> Task 2/4 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Construir a **infra de autorização global por tipo de usuário** — a peça reutilizável que
sustenta tanto o "só admin" (m6-03/m6-04) quanto a mecânica de "acesso limitado para testers" —
e a **invalidação de sessão imediata** (versão de token). Backend apenas. Não expõe nenhuma rota
nova de negócio; entrega o mecanismo.

## Entregáveis

1. **Tipo no login e no payload do JWT**: `UsuarioAutenticadoDto` (login) passa a devolver o
   `tipo` (do shared) — é dele que o frontend monta a sessão (m6-04). `JwtPayload`
   (`autenticacao/jwt-payload.interface.ts`) ganha `readonly tipo: TipoUsuarioEnum` **e**
   `readonly tokenVersao: number`. `AutenticacaoService.gerarToken` inclui ambos;
   `recuperarPorLogin` / `UsuarioInternoRecuperadoDto` passam a trazer o `codigo` do
   `tipo_usuario` (JOIN, tradução `id → codigo` — §10.2.12) e o `token_versao`. O `tipo` no JWT é
   **conveniência** para `@ActiveUser()`; a **autoridade** é a linha lida no guard (item 2).
2. **Guard de autorização + validade de sessão** `backend/src/modules/autenticacao/autorizacao.guard.ts`
   (comportamento de negócio → português, como o `autenticacao.guard.ts` existente). Roda **após**
   o `JwtAuthGuard` global (via `APP_GUARD`), quando `request.user` (o payload) já existe. Faz uma
   **leitura leve de sessão** — uma consulta indexada por PK em `usuario` retornando
   `{ tipo (codigo), token_versao, is_deleted }` (novo `recuperarSessao` no `UsuarioRepository`,
   ver "Dependências"):
   - conta inexistente ou `is_deleted = true` → `UnauthorizedAccessException` (401);
   - `token_versao` do banco ≠ `tokenVersao` do JWT → `UnauthorizedAccessException` (sessão
     invalidada — reset de senha / rebaixamento / exclusão da m6-03);
   - se a rota exige tipos (`@TiposPermitidos`) e o `tipo` **fresco** do banco não está entre eles
     → `UnauthorizedAccessException`; caso contrário, libera.
   O tipo usado na autorização é sempre o do banco (troca de tipo vale na hora). *Trade-off e
   alternativa de cache*: ver spec mãe, decisão 2.
3. **Decorator** `@TiposPermitidos(...tipos: TipoUsuarioEnum[])`
   (`backend/src/core/decorators/tipos-permitidos.decorator.ts`) via `SetMetadata`, aplicável a
   método ou controller. Ex.: `@TiposPermitidos(TipoUsuarioEnum.ADMIN)` (só admin);
   `@TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER)` (acesso limitado a tester).
4. **Interação com `@Public()`**: rota pública ignora o guard de autorização (sem `request.user`
   para checar) — mesmo tratamento que o `autenticacao.guard.ts` já dá ao `@Public()`.
5. **Mecânica de "acesso limitado para testers" — documentação de uso** (bloco no topo do
   decorator + nota no `SYSTEM.SPEC.md §12`): para liberar um módulo novo só a testers durante o
   desenvolvimento, anota-se a controller com `@TiposPermitidos(ADMIN, TESTER)`; ao lançar para
   todos, **remove-se** o decorator (ou amplia-se a lista). **Nenhum módulo existente é anotado
   nesta task** — só a infra e o guia.
6. **`recuperarSessao` no `UsuarioRepository`**: `SELECT` por PK trazendo `tipo` (JOIN
   `tipo_usuario`, `codigo`), `token_versao` e `is_deleted` da conta — a query leve que o guard
   consome. SQL segue §10.2/§16.
7. **Testes** (Vitest, backend): guard libera admin em rota `@TiposPermitidos(ADMIN)`, barra
   `NORMAL`/`TESTER` (403); rota sem decorator passa para qualquer tipo autenticado; `@Public()`
   não é barrada; `@TiposPermitidos(ADMIN, TESTER)` aceita ambos e barra `NORMAL`; **conta
   excluída** é barrada (401); **`token_versao` divergente** é barrada (401); **tipo trocado no
   banco** vale na hora (autoriza pelo fresco, não pelo do JWT). Ajuste dos testes de
   `autenticacao.service.spec` para os novos campos `tipo`/`tokenVersao` no token e o `tipo` no
   `UsuarioAutenticadoDto`.

## Critérios de Aceite

- Um método anotado `@TiposPermitidos(ADMIN)` responde 403 para não-admin e passa para admin,
  usando o tipo **fresco** do banco (troca de tipo vale sem novo login).
- Conta excluída e `token_versao` divergente são barradas com 401 no request seguinte.
- O `tipo` chega no `@ActiveUser()` (do JWT) e no `UsuarioAutenticadoDto` (para o frontend).
- Rotas sem o decorator seguem funcionando para qualquer usuário autenticado; `@Public()` intactas.
- Decorator documentado com o fluxo de aplicar/remover para a fase de tester — sem travar módulo
  atual.
- `lint`/`build`/`test` do backend verdes.

## Fora de Escopo

- CRUD de usuários pelo admin, invariante de ≥1 admin e o **bump** de `token_versao` nas ações do
  admin (m6-03 — esta task só **lê e compara** a versão).
- Frontend / `adminGuard` (m6-04).
- Aplicar o acesso limitado em qualquer módulo real (feito caso a caso no futuro).
- Cache em memória da sessão (otimização futura — ver spec mãe, decisão 2).

## Dependências

- `m6-01` (`TipoUsuarioEnum`, colunas `tipo_usuario_id` e `token_versao`).
- M2 (`JwtAuthGuard` global, `@ActiveUser()`, `AutenticacaoService`, `UsuarioRepository`).
