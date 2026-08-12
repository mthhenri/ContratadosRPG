# m6-02-backend-autorizacao-global.spec.md

> Task 2/7 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Infra de **autorização por tipo de usuário** + **invalidação imediata de sessão**, reutilizável
por qualquer rota atual ou futura. É a peça única que serve tanto "só admin" (`m6-03`/`m6-04`)
quanto "acesso limitado a testers" (`m6-06`) — sem aplicar restrição em nenhum módulo existente
nesta task.

## Entregáveis

1. **`JwtPayload`** (`backend/src/modules/autenticacao/jwt-payload.interface.ts`) ganha `tipo:
   TipoUsuarioEnum` e `tokenVersao: number`. `AutenticacaoService.gerarToken` passa a assinar os
   dois campos (lidos do `UsuarioInternoRecuperadoDto`, que precisa carregar `tipo`/
   `token_versao` — ajustar `UsuarioRepository.recuperarPorLogin`/`recuperarPorId` para
   trazê-los via `JOIN tipo_usuario`, traduzindo para `codigo` no SQL — §10.2.12). São
   **conveniência** para `@ActiveUser()` e para a sessão do frontend; nunca a autoridade da
   decisão de acesso (item 3).
2. **`UsuarioRepository.recuperarSessao`** — leitura leve por PK (`id`): `SELECT
   tipo_usuario.codigo AS tipo, usuario.token_versao, usuario.is_deleted FROM usuario JOIN
   tipo_usuario ON ... WHERE usuario.id = :id` (**sem** filtrar `usuario.is_deleted = false` no
   `WHERE` — é a única leitura que precisa enxergar uma conta já excluída, para poder derrubar a
   sessão dela; `is_deleted` vem no `SELECT` para a decisão, não no filtro). Alimenta
   `UsuarioService.recuperarSessao` (novo método, repassa ao guard).
3. **`@TiposPermitidos(...tipos: TipoUsuarioEnum[])`** (`backend/src/core/decorators/
   tipos-permitidos.decorator.ts`, ao lado de `@Public()`/`@ActiveUser()` — decorator genérico e
   arquitetural, mesmo que o conceito "tipo de usuário" seja de negócio): `SetMetadata` com uma
   chave própria (`TIPOS_PERMITIDOS_KEY`), lida pelo guard do item 4.
4. **`AutorizacaoGuard`** (`backend/src/modules/usuario/autorizacao.guard.ts` — mora no módulo
   dono do dado que consulta, `usuario`, mesmo padrão de `JwtAuthGuard` morar em `autenticacao`;
   Proibição #23 não se aplica a guards, só a queries) registrado como **segundo** `APP_GUARD`
   global (depois do `JwtAuthGuard`, no `app.module.ts`), via `Reflector`:
   - Pula rotas `@Public()` (mesmo `IS_PUBLIC_KEY` do `JwtAuthGuard`).
   - Em toda outra rota (já autenticada pelo `JwtAuthGuard`): chama `recuperarSessao({ id:
     payload.sub })`. Se a linha não existir, `isDeleted === true` ou `tokenVersao !==
     payload.tokenVersao` → `UnauthorizedException` do Nest (**401** — mesmo código que
     `JwtAuthGuard` usa para "sem autenticação válida"; o `error-handler.interceptor` do
     frontend já reage a 401 encerrando a sessão, m2-06 — nenhuma mudança de frontend
     necessária para este efeito).
   - Se a rota tiver `@TiposPermitidos(...)`: compara o `tipo` **fresco** (lido agora do banco,
     não o do JWT) contra a lista exigida. Fora da lista → `UnauthorizedAccessException`
     (**403** — já mapeada pelo `global-exception.filter`).
   - Sem `@TiposPermitidos`: a rota só passa pela checagem de sessão/versão do passo anterior.
5. **Guia de uso do tester** (comentário JSDoc no decorator + trecho no `AGENTS.md` ou
   `docs/context/CONTEXT.md`, o que fizer mais sentido na implementação): como anotar
   `@TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER)` num controller para
   restringir um módulo novo, e como remover a anotação para abrir a todos.
6. **Testes** do guard (unitário, mockando `UsuarioRepository`): rota `@Public()` passa sem
   payload; sessão com `tokenVersao` divergente → 401; conta com `is_deleted = true` → 401;
   `@TiposPermitidos(ADMIN)` com usuário `NORMAL` → 403; com `ADMIN` → passa.

## Critérios de Aceite

- Toda rota protegida (não-`@Public()`) exige uma sessão com `tokenVersao` batendo a do banco;
  divergência (após reset de senha/troca de tipo/exclusão) derruba a sessão no **request
  seguinte**, sem esperar o token expirar.
- Rota anotada `@TiposPermitidos(ADMIN)` responde 403 para não-admin e 200 para admin.
- Nenhuma rota existente (M0-M5) ganha `@TiposPermitidos` nesta task — só a infra.
- `tipo`/`tokenVersao` no JWT são consultados apenas como conveniência (ex.: exibição no
  frontend); a decisão de acesso sempre lê a linha fresca do banco.

## Fora de Escopo

- Aplicar `@TiposPermitidos` em qualquer rota real (`m6-03`/`m6-04` para admin;
  documentação/guia apenas para tester — nenhum módulo M0-M5 trava nesta entrega).
- `tipoGuard` do frontend e a tela de "acesso negado" (`m6-06`).
- CRUD de gestão de usuários (`m6-03`).

## Dependências

- `m6-01` (`tipo_usuario`, `usuario.tipo_usuario_id`/`token_versao`, `TipoUsuarioEnum`).
- `m2-02` (`JwtAuthGuard`, `@Public()`, `@ActiveUser()`, `JwtStrategy`).
