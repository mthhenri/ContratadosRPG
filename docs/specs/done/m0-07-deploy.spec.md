# m0-07-deploy.spec.md

> Task 7/7 do milestone `m0-fundacao.spec.md`.
>
> **Revisado (2026-07-05):** o deploy passou a ser por **integração nativa das plataformas**
> (Render e Cloudflare Pages puxando do Git no push à `master`) em vez de um workflow de
> deploy no GitHub Actions. Simplificação a pedido do autor — menos peças, sem gate de CI no
> deploy. A CI de lint+testes em PR (`m0-06`) segue existindo, mas não dispara nem bloqueia o
> deploy.

## Objetivo

Ativar o deploy automático no push para `master`: frontend na Cloudflare Pages, backend no
Render, banco de produção no Supabase — fechando o "hello world de ponta a ponta em produção"
que é o objetivo do milestone M0.

## Entregáveis

1. **Deploy nativo no push para `master`**, sem GitHub Actions no caminho do deploy:
   - **Backend → Render**: Web Service conectado ao Git com auto-deploy (blueprint `render.yaml`
     na raiz, `autoDeploy: true`; build `npm install && npm run build --workspace=backend`,
     start `npm run start:prod --workspace=backend`, healthcheck `/health`).
   - **Frontend → Cloudflare Pages**: projeto conectado ao Git com **branch de produção `master`**,
     buildando o Angular (`npm run build --workspace=frontend`, output `frontend/dist/frontend/browser`).
2. Banco de produção provisionado no Supabase (Postgres); credenciais configuradas via
   variáveis de ambiente do Render — nunca hardcoded, nunca `process.env` direto no código
   (o backend lê tudo via `ConfigService`, task `m0-03`).
3. Variáveis de ambiente de produção configuradas nas plataformas espelhando
   `docs/SYSTEM.SPEC.md` §10.6, com `JWT_SECRETO` de produção diferente do valor de exemplo do
   `.env`. Ligação frontend→backend cross-origin via **CORS** (backend libera
   `APP_FRONTEND_ORIGEM` em `main.ts`) + **`apiBase` absoluto** fixado no
   `environment.production.ts` (a URL do Render não é segredo).

## Critérios de Aceite

- Após push/merge para `master`, Render e Cloudflare Pages reimplantam automaticamente.
- A URL de produção do frontend exibe a resposta do `/health` do backend em produção (Render),
  provando a cadeia Cloudflare → Render → Supabase.

## Fora de Escopo

- **Deploy via GitHub Actions e gate de CI no deploy** — decisão revisada: o deploy é a
  integração nativa das plataformas; a CI (`m0-06`) roda em PR mas não bloqueia o deploy.
- **Migrations e SSL do Supabase em produção** — o banco desta task só precisa existir e estar
  acessível, sem tabelas de negócio nem queries (o `/health` não toca o banco). SSL e migrations
  em produção entram a partir do M2, com suas próprias migrations.
- **Rollback automatizado de deploy** — fora do escopo do v1.

## Dependências

- `m0-04-healthcheck-endpoint.spec.md` (endpoint que prova o deploy funcionando)
- `m0-05-frontend-shell.spec.md` (home que consome o `/health`)
