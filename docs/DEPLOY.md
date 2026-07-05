# DEPLOY.md — Entrega contínua (produção)

> Runbook da task `m0-07-cd-deploy`. Fecha o "hello world de ponta a ponta em produção" do
> milestone M0: **frontend na Cloudflare Pages → backend no Render → banco no Supabase**.

A automação em repositório já está pronta:

| Arquivo | Papel |
|---|---|
| [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) | No merge para `master`: roda lint+testes (gate) e, se passarem, dispara os deploys |
| [`render.yaml`](../render.yaml) | Blueprint do web service do backend no Render (build/start, healthcheck, env vars) |
| `frontend/src/environments/` | `apiBase` por ambiente; produção injetada no build a partir de `RENDER_API_URL` |
| `frontend/public/_redirects` | Fallback de SPA da Cloudflare Pages |

O que **não** dá para automatizar por código e você precisa fazer uma vez nas plataformas está
abaixo. Depois disso, todo merge para `master` implanta sozinho.

---

## Como a cadeia se liga

```
navegador ──► Cloudflare Pages (frontend Angular)
                  │  environment.apiBase = URL do Render
                  ▼
             Render (backend NestJS)  ── CORS: APP_FRONTEND_ORIGEM = URL da Cloudflare
                  │  DB_* (Supabase)
                  ▼
             Supabase (PostgreSQL)
```

O frontend chama `GET {apiBase}/health` **cross-origin** direto no Render; o backend libera a
origem da Cloudflare via `APP_FRONTEND_ORIGEM` (CORS, `main.ts`). Não há proxy em produção — em
desenvolvimento a chamada é relativa (`apiBase` vazio) e passa pelo `proxy.conf.json`.

Há uma dependência circular de URLs (o frontend precisa da URL do Render; o Render precisa da URL
da Cloudflare para o CORS — e **o backend não sobe sem `APP_FRONTEND_ORIGEM`**). A URL da Cloudflare
Pages é determinística (`https://<nome-do-projeto>.pages.dev`), então quebra a circularidade:
**escolha o nome do projeto Pages primeiro → Supabase → Render (já com `APP_FRONTEND_ORIGEM` =
`https://<nome>.pages.dev`) → Cloudflare Pages com esse nome**.

---

## 1. Supabase (banco de produção)

1. Crie um projeto em [supabase.com](https://supabase.com) (região próxima; guarde a senha do
   banco).
2. Em **Project Settings → Database → Connection info**, anote host, porta, database, usuário e
   senha. Use estes valores nas variáveis `DB_*` do Render (passo 2).
3. Nesta task o banco só precisa **existir e estar acessível** — sem tabelas de negócio. O
   `/health` não consulta o banco, e o Knex conecta sob demanda, então o backend sobe mesmo sem
   nenhuma query. As migrations de negócio começam no M2.

> **Heads-up para o M2:** o Postgres do Supabase exige SSL. Quando as primeiras queries entrarem
> (M2), a conexão Knex precisará de SSL habilitado — hoje isso não é exercido e fica fora do
> escopo da m0-07.

---

## 2. Render (backend)

1. Em [render.com](https://render.com), **New → Blueprint** e aponte para este repositório. O
   Render lê o [`render.yaml`](../render.yaml) e cria o web service `contratados-rpg-api`
   (build `npm install && npm run build --workspace=backend`, start `npm run start:prod
   --workspace=backend`, healthcheck `/health`).
2. Preencha as env vars marcadas `sync: false` no dashboard do serviço:
   - `DB_HOST`, `DB_PORT`, `DB_NOME`, `DB_USUARIO`, `DB_SENHA` — do Supabase (passo 1).
   - `JWT_SECRETO` — **valor de produção, diferente** do `troque-em-producao` do `.env.example`
     (entregável 3 da spec). Gere um segredo forte.
   - `APP_FRONTEND_ORIGEM` — **preencha já** (não deixe em branco): o backend lê essa var no
     boot (`obterConfiguracaoAplicacao`, obrigatória — SYSTEM.SPEC §10.6) e **não sobe sem ela**.
     A URL da Cloudflare Pages é determinística a partir do nome do projeto que você escolher no
     passo 3 (`https://<nome-do-projeto>.pages.dev`), então já dá para colocar o valor final. Se
     ainda não decidiu o nome, use um placeholder (ex.: `https://placeholder.pages.dev`) só para
     subir e ajuste depois — o CORS só vale de verdade quando bater com a origem real do frontend.
   - `APP_PORTA` (`10000`), `APP_AMBIENTE` (`production`) e `JWT_EXPIRACAO` (`8h`) já vêm do
     blueprint.
3. Copie a **URL pública** do serviço (ex.: `https://contratados-rpg-api.onrender.com`) e o
   **Deploy Hook** (Settings → Deploy Hook). Vão para as variáveis/segredos do GitHub (passo 4).

> **Porta:** o Render expõe a porta em `PORT` (default `10000`). O backend lê `APP_PORTA` via
> `ConfigService` (nunca `process.env` direto — Proibição #10), então `APP_PORTA` **deve** casar
> com essa porta. Mantendo o default do Render, `APP_PORTA=10000` (já no blueprint) resolve. Se o
> Render atribuir outra porta, ajuste `APP_PORTA` para o mesmo valor.

> **`autoDeploy: false`** no blueprint é intencional: o único gatilho de deploy de produção é o
> workflow de CD, **depois** do gate lint/testes. Deixar o Render implantar no push cru burlaria
> esse gate (critério de aceite da m0-07).

---

## 3. Cloudflare Pages (frontend)

1. Em [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages**,
   crie um projeto (ex.: `contratados-rpg`). Pode criar via **Direct Upload** — o deploy real vem
   do workflow (`wrangler pages deploy`), não da integração Git nativa (que implantaria no push
   sem passar pelo gate de CI).
2. Anote o **nome do projeto** e a **URL pública** (ex.: `https://contratados-rpg.pages.dev`).
3. Crie um **API Token** (Cloudflare → My Profile → API Tokens) com permissão de editar Cloudflare
   Pages, e anote o **Account ID**. Vão para os segredos do GitHub (passo 4).
4. **Volte ao Render** (passo 2) e preencha `APP_FRONTEND_ORIGEM` com a URL da Cloudflare — é a
   origem liberada no CORS.

---

## 4. Segredos e variáveis do GitHub

Em **Settings → Secrets and variables → Actions** do repositório, configure o que o
[`cd.yml`](../.github/workflows/cd.yml) consome:

**Secrets** (valores sensíveis):

| Nome | Origem |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Deploy Hook do serviço no Render (passo 2) |
| `CLOUDFLARE_API_TOKEN` | API Token da Cloudflare (passo 3) |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID da Cloudflare (passo 3) |

**Variables** (não sensíveis):

| Nome | Valor |
|---|---|
| `RENDER_API_URL` | URL pública do backend no Render (ex.: `https://contratados-rpg-api.onrender.com`) — injetada como `apiBase` no build do frontend |
| `CLOUDFLARE_PAGES_PROJECT` | Nome do projeto Pages (ex.: `contratados-rpg`) |

---

## 5. Verificação (critérios de aceite)

1. **Gate de CI:** abra um PR — a [CI](../.github/workflows/ci.yml) roda lint+testes. Não há
   deploy em PR.
2. **Deploy no merge:** faça merge para `master`. O `cd.yml` roda o job `verificar` (lint+testes)
   e, **só se passar**, dispara `deploy-backend` (hook do Render) e `deploy-frontend` (Cloudflare).
   Se o lint/teste falhar, nenhum deploy ocorre.
3. **Cadeia ponta a ponta:** abra a URL de produção do frontend (Cloudflare). A home consome
   `GET {apiBase}/health` no Render e exibe `ok` — provando **Cloudflare → Render → Supabase**
   (o backend só sobe com as `DB_*` do Supabase configuradas).

> Primeiro acesso no plano free do Render pode demorar (o serviço "dorme" ocioso e acorda na
> primeira requisição).
