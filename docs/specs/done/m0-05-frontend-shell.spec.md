# m0-05-frontend-shell.spec.md

> Task 5/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Montar o shell mínimo do frontend e provar a integração ponta a ponta com o backend,
consumindo o `/health` da task anterior.

## Entregáveis

1. Layout mínimo: topbar + `router-outlet`, componentes standalone, sem NgModule.
2. Interceptors registrados: `error-handler` (toast PrimeNG em erro de requisição) e
   `loading` (indicador de carregamento). `auth-token` (JWT) nasce no M2.
3. Proxy de desenvolvimento (`proxy.conf.json` ou equivalente) apontando `frontend:dev`
   para o backend local.
4. Página inicial consumindo `GET /health` e exibindo o resultado (prova visual de que o
   pipeline HTTP frontend → backend → `StandardResponse` funciona).

## Critérios de Aceite

- `frontend:dev` + `backend:dev` rodando simultaneamente: a home local exibe a resposta do
  `/health`
- Nenhum componente usa NgModule, `.css` ou `style=""` inline (proibições #16–18 do
  `SYSTEM.SPEC.md`)
- Sem `ngModel` — o consumo de `/health` não envolve formulário nesta task, mas qualquer
  interação já nasce em Reactive Forms se necessário

## Fora de Escopo

- Identidade visual definitiva (tema PrimeNG base até decisão em `docs/CONTEXT.md`)
- Módulos de negócio (`calculadora`, `campanha`, `ficha`) — a partir do M1
- `auth-token.interceptor` — M2

## Dependências

- `m0-01-workspaces-npm.spec.md` (workspace `frontend/` precisa existir)
- `m0-04-healthcheck-endpoint.spec.md` (precisa do endpoint para consumir)
