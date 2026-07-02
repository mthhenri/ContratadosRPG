# m0-03-backend-core.spec.md

> Task 3/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Implementar o `core/` do backend: as classes e mecanismos genéricos que toda entidade e
todo módulo de negócio vão reutilizar a partir do M2 em diante.

## Entregáveis

1. `BaseEntity` (`backend/src/core/base/base.entity.ts`): campos `id`, `isDeleted`,
   `createdDate`, `updatedDate`, `deletedDate`, conforme `docs/SYSTEM.SPEC.md` §10.1.
2. `BaseRepository` (`backend/src/core/base/base.repository.ts`): `executarConsulta<T>()`,
   `executarComando()`, `executarSoftDelete(id)`, suporte a paginação padrão (`pagina`,
   `itensPorPagina`, `ordenarPor`, `direcao`, `allRows?`) conforme §10.5. Usa Knex raw —
   nunca ORM.
3. Exceções (`backend/src/core/exceptions/`): `BusinessException`,
   `ResourceNotFoundException`, `UnauthorizedAccessException`.
4. `global-exception.filter` (`backend/src/core/filters/`): padroniza toda resposta de
   erro no formato `{ sucesso: false, dados: null, mensagem, erros[] }`.
5. `response-format.interceptor` (`backend/src/core/interceptors/`): monta
   `StandardResponse<T>` (`sucesso`, `dados`, `mensagem`, `erros?`) em toda resposta de
   sucesso. A interface `StandardResponse<T>` em si vive em `shared/src/interfaces/`
   (consumida aqui, não redefinida).
6. `ConfigService` (`backend/src/config/`): injetável, lê todas as variáveis de ambiente
   listadas em `docs/SYSTEM.SPEC.md` §10.6 — nenhum acesso a `process.env` fora dele.

## Critérios de Aceite

- `BaseRepository` compila e é extensível por um repositório de teste mínimo (descartado
  ou reaproveitado pela task `m0-04`)
- `global-exception.filter` e `response-format.interceptor` registrados globalmente em
  `main.ts`/`app.module.ts`
- Nenhum `process.env` direto em qualquer arquivo de `backend/src/` — tudo via
  `ConfigService` injetado
- `StandardResponse<T>` é importado de `@contratados-rpg/shared/interfaces`, não
  redefinido em `backend/`

## Fora de Escopo

- Qualquer módulo de negócio (`autenticacao`, `usuario`, `campanha`, `ficha`) — nasce a
  partir do M2
- Guard global de autenticação (`JwtAuthGuard` via `APP_GUARD`) — nasce no M2; o decorator
  `@Public()` em si nasce na task `m0-04`, junto do endpoint que o usa
- Gateway WebSocket — nasce no M3

## Dependências

- `m0-01-workspaces-npm.spec.md` (workspace `backend/` precisa existir)
- `m0-02-docker-banco.spec.md` (`BaseRepository`/`ConfigService` assumem a configuração de
  conexão já existente)
