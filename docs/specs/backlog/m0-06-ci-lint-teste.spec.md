# m0-06-ci-lint-teste.spec.md

> Task 6/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Ativar a integração contínua: lint e testes automáticos em todo Pull Request, cobrindo os
três workspaces.

## Entregáveis

1. Workflow do GitHub Actions (`.github/workflows/`) disparado em todo PR: instala
   dependências (`npm install` na raiz), roda lint e `npm run test --workspace=shared`,
   `--workspace=backend`, `--workspace=frontend` (o que já existir de teste até aqui —
   nenhum teste de regra de jogo existe antes do M1, então a etapa passa vazia/trivial).
2. Configuração de lint consistente com as convenções de `docs/CONVENTIONS.md` (nomes,
   sem abreviação, etc.) nos três workspaces, se ainda não configurada nas tasks
   anteriores.

## Critérios de Aceite

- Pipeline dispara e fica verde em um PR de teste
- Falha de lint ou teste em qualquer workspace quebra o pipeline (sem etapa opcional
  mascarando falha)

## Fora de Escopo

- Deploy (Cloudflare/Render/Supabase) — task `m0-07`
- Testes de regra de jogo (`shared/regras`) — nascem no M1 junto das fórmulas

## Dependências

- `m0-01-workspaces-npm.spec.md` até `m0-05-frontend-shell.spec.md` (o pipeline precisa
  ter os três workspaces e algo executável para rodar lint/teste)
