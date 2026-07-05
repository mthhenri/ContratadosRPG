# m0-04-healthcheck-endpoint.spec.md

> Task 4/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Expor `GET /health`, primeiro endpoint real da API, validando de ponta a ponta o `core/`
implementado na task anterior.

## Entregáveis

1. Decorator `@Public()` (`backend/src/core/`): marca rotas sem autenticação. Nasce aqui
   porque é o primeiro consumidor, mas o guard global que o interpreta só entra no M2 —
   por ora o decorator existe sem efeito de bloqueio (nenhuma rota está protegida ainda).
2. `HealthController` (`GET /health`, `@Public()`), sem service/repository próprios (não
   há regra de negócio nem persistência — só confirma que a API está de pé).
3. Resposta no formato `StandardResponse<T>` (via `response-format.interceptor` da task
   `m0-03`).

## Critérios de Aceite

- `GET /health` responde `StandardResponse` com `sucesso: true`
- Controller não contém lógica além de repassar (proibição #2 do `SYSTEM.SPEC.md`) — não
  há service/repository para este endpoint por não haver regra de negócio nem persistência

## Fora de Escopo

- Guard global de autenticação — M2
- Qualquer verificação real de saúde (conexão com banco, etc.) além de confirmar que o
  processo Nest está respondendo

## Dependências

- `m0-03-backend-core.spec.md` (usa `global-exception.filter` e
  `response-format.interceptor`)
