# m6-02-backend-autorizacao-global.spec.md

> Task 2/4 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Construir a **infra de autorização global por tipo de usuário** — a peça reutilizável que
sustenta tanto o "só admin" (m6-03/m6-04) quanto a mecânica de "acesso limitado para testers".
Backend apenas. Não expõe nenhuma rota nova de negócio; entrega o mecanismo.

## Entregáveis

1. **Tipo no payload do JWT**: `JwtPayload` (`autenticacao/jwt-payload.interface.ts`) ganha
   `readonly tipo: TipoUsuarioEnum` (do shared). `AutenticacaoService.gerarToken` passa a incluir
   o tipo; `recuperarPorLogin` / `UsuarioInternoRecuperadoDto` passam a trazer o `codigo` do
   `tipo_usuario` (JOIN no repositório, tradução `id → codigo` — §10.2.12). O tipo do usuário
   autenticado fica disponível via `@ActiveUser()` sem consulta extra.
2. **Guard de autorização** `backend/src/modules/autenticacao/autorizacao.guard.ts` (comportamento
   de negócio → português, como o `autenticacao.guard.ts` existente): lê os tipos exigidos pela
   metadata da rota e o `tipo` do `request.user` (já validado pelo `JwtAuthGuard` global); se a
   rota não exige tipo nenhum, libera; se exige e o usuário não tem um dos tipos, lança
   `UnauthorizedAccessException`. Registrado como guard global **após** o `JwtAuthGuard` (via
   `APP_GUARD`) — ordem garante que `request.user` já existe.
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
6. **Testes** (Vitest, backend): guard libera admin em rota `@TiposPermitidos(ADMIN)`, barra
   `NORMAL`/`TESTER` (403); rota sem decorator passa para qualquer tipo; `@Public()` não é barrada;
   `@TiposPermitidos(ADMIN, TESTER)` aceita ambos e barra `NORMAL`. Ajuste dos testes de
   `autenticacao.service.spec` para o novo campo `tipo` no token.

## Critérios de Aceite

- Um método anotado `@TiposPermitidos(ADMIN)` responde 403 para não-admin e passa para admin.
- O tipo do usuário chega no `@ActiveUser()` sem query extra por request (vem do JWT).
- Rotas sem o decorator seguem funcionando para qualquer usuário autenticado; `@Public()` intactas.
- Decorator documentado com o fluxo de aplicar/remover para a fase de tester — sem travar módulo
  atual.
- `lint`/`build`/`test` do backend verdes.

## Fora de Escopo

- CRUD de usuários pelo admin e invariante de ≥1 admin (m6-03).
- Ler o tipo do banco a cada request (decisão: vem do JWT — ver spec mãe, decisão 2).
- Frontend / `adminGuard` (m6-04).
- Aplicar o acesso limitado em qualquer módulo real (feito caso a caso no futuro).

## Dependências

- `m6-01` (`TipoUsuarioEnum`, coluna `tipo_usuario_id`).
- M2 (`JwtAuthGuard` global, `@ActiveUser()`, `AutenticacaoService`, `UsuarioRepository`).
