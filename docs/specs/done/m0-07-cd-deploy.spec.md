# m0-07-cd-deploy.spec.md

> Task 7/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Ativar o deploy automático no merge para `master`: frontend na Cloudflare, backend no
Render, banco de produção no Supabase — fechando o "hello world de ponta a ponta em
produção" que é o objetivo do milestone M0.

## Entregáveis

1. Workflow do GitHub Actions (ou integração nativa da plataforma) disparado no merge
   para `master`: deploy do `frontend/` na Cloudflare (Pages) e do `backend/` no Render.
2. Banco de produção provisionado no Supabase (Postgres); connection string configurada
   via variáveis de ambiente do Render — nunca hardcoded, nunca `process.env` direto no
   código (o backend já lê tudo via `ConfigService`, task `m0-03`).
3. Variáveis de ambiente de produção configuradas nas plataformas (Render, Cloudflare)
   espelhando `docs/SYSTEM.SPEC.md` §10.6, com `JWT_SECRETO` de produção diferente do
   valor de exemplo do `.env`.

## Critérios de Aceite

- Pipeline de CI (`m0-06`) verde é pré-requisito do deploy — merge só dispara deploy após
  lint/testes passarem
- Após merge, a URL de produção do frontend exibe a resposta do `/health` do backend em
  produção (Render), provando a cadeia Cloudflare → Render → Supabase

## Fora de Escopo

- Qualquer regra de negócio, autenticação real ou tabela além da infraestrutura mínima —
  o banco de produção nesta task só precisa existir e estar acessível, sem tabelas de
  negócio (essas nascem a partir do M2, com suas próprias migrations rodando também em
  produção)
- Rollback automatizado de deploy — fora do escopo do v1

## Dependências

- `m0-06-ci-lint-teste.spec.md` (pipeline de CI já verde)
- `m0-04-healthcheck-endpoint.spec.md` (endpoint que prova o deploy funcionando)
