# DEPLOY.md — Subindo o contratados-rpg para produção

Guia de deploy com **frontend na Cloudflare Pages**, **backend no Render** e **banco no
Supabase**. Os três no plano gratuito. O deploy é **nativo**: cada plataforma puxa do Git e
reimplanta sozinha no push para `master` — **sem GitHub Actions no caminho do deploy**.

```
Cloudflare Pages           Render (Web Service)          Supabase
┌──────────────┐  HTTPS   ┌────────────────────┐   SSL  ┌─────────────┐
│ Angular SPA  │ ───────▶ │ NestJS API         │ ─────▶ │ PostgreSQL  │
│ *.pages.dev  │  + CORS  │ *.onrender.com     │  (M2)  │  (pooler)   │
└──────────────┘          └────────────────────┘        └─────────────┘
```

> **Ordem obrigatória:** há dependência circular de URLs (o front precisa da URL do back; o
> back precisa da origem do front no CORS — e **não sobe sem `APP_FRONTEND_ORIGEM`**). A URL
> das Pages é determinística (`https://<projeto>.pages.dev`), o que quebra a circularidade:
> **escolha o nome do projeto Pages → 1. Supabase → 2. Render (já com `APP_FRONTEND_ORIGEM` =
> `https://<projeto>.pages.dev`) → 3. Cloudflare Pages com esse nome e branch de produção `master`.**

---

## Como o deploy funciona (entenda antes)

- **Deploy nativo, sem Actions.** O Render (Web Service conectado ao Git) e a Cloudflare Pages
  (projeto conectado ao Git) reimplantam automaticamente a cada push em `master`. O único
  workflow do GitHub que resta é a **CI** (`.github/workflows/ci.yml`) — lint + testes em PR;
  ela **não** dispara nem bloqueia deploy.
- **Backend compilado.** O `shared` é compilado no `postinstall` (`npm install`), e o backend
  roda `nest build` → `node dist/main` (`npm run start:prod`). Nada de `ts-node` em produção.
- **URL da API fixa no build.** A Cloudflare builda o Angular direto do Git, então a URL do
  Render fica commitada em `frontend/src/environments/environment.production.ts` (`apiBase`) —
  não é segredo. O `fileReplacements` do `angular.json` a injeta no build de produção.
- **CORS por variável de ambiente.** O backend libera a origem da Cloudflare via
  `APP_FRONTEND_ORIGEM` (`main.ts`) — mudar essa var é só reinício, sem rebuild. Além da origem
  de produção, o `main.ts` libera automaticamente qualquer subdomínio do mesmo projeto Pages
  (`https://<hash-ou-branch>.<projeto>.pages.dev`), então os deploys de **preview** (PRs e
  branches que não são `master`) também conseguem chamar a API sem precisar mexer em env var.

---

## 1. Banco — Supabase

1. Crie um projeto em <https://supabase.com> (região próxima; guarde a senha do banco).
2. **Project Settings → Database → Connection info** (ou a Connection string do **Session
   pooler**, compatível com o pool do Knex). Extraia os campos para as variáveis do Render
   (passo 2):

   | Variável     | Valor                                    |
   |--------------|------------------------------------------|
   | `DB_HOST`    | `...pooler.supabase.com` (ou o host direto) |
   | `DB_PORT`    | `5432`                                   |
   | `DB_NOME`    | `postgres`                               |
   | `DB_USUARIO` | `postgres` / `postgres.<ref>`            |
   | `DB_SENHA`   | a senha do banco                         |

> **Escopo M0:** o banco só precisa **existir e estar acessível** — sem tabelas de negócio. O
> `/health` não consulta o banco e o Knex conecta sob demanda, então o backend sobe mesmo sem
> nenhuma query.
>
> **Heads-up M2:** quando as primeiras queries entrarem (M2), o Postgres do Supabase exige
> **SSL** e as **migrations** passam a rodar no deploy — isso entra no M2 (config de SSL no
> Knex + migration no build), não agora.

---

## 2. Backend — Render

Duas formas: **Blueprint** (lê o `render.yaml` da raiz) ou **Web Service manual**. Qualquer uma
conecta ao Git e reimplanta no push.

1. <https://render.com> → **New → Blueprint** (aponta pro repo; usa o `render.yaml`) — ou
   **New → Web Service → Connect a repository** e configure manualmente:

   | Campo              | Valor                                                    |
   |--------------------|----------------------------------------------------------|
   | **Root Directory** | *(vazio — raiz do repo; o symlink do workspace `shared` depende disso)* |
   | **Runtime**        | Node                                                     |
   | **Build Command**  | `npm install && npm run build --workspace=backend`       |
   | **Start Command**  | `npm run start:prod --workspace=backend`                 |
   | **Auto-Deploy**    | **On** (reimplanta no push à `master`)                   |
   | **Health Check Path** | `/health`                                             |

2. **Environment Variables** (Settings → Environment) — espelham `SYSTEM.SPEC §10.6`:

   | Variável                      | Valor                                                    |
   |-------------------------------|----------------------------------------------------------|
   | `DB_HOST` … `DB_SENHA`        | do passo 1                                               |
   | `JWT_SECRETO`                 | **valor forte e único** (ex.: `openssl rand -hex 32`) — diferente do `.env.example` |
   | `JWT_EXPIRACAO`               | `8h`                                                     |
   | `APP_PORTA`                   | `10000` — precisa casar com a porta que o Render expõe (`PORT`, default `10000`); o backend lê `APP_PORTA` via `ConfigService` |
   | `APP_AMBIENTE`                | `production`                                             |
   | `APP_FRONTEND_ORIGEM`         | `https://<projeto>.pages.dev` — **obrigatória no boot**; use já a URL determinística das Pages (passo 3) |

   > **Não** defina `NODE_ENV=production`: o `nest build` precisa das devDependencies
   > (`@nestjs/cli`, `typescript`) na fase de build, e `NODE_ENV=production` faria o
   > `npm install` pulá-las. Use `APP_AMBIENTE=production` para o ambiente lógico.
   >
   > **`APP_FRONTEND_ORIGEM` é lida no boot** (`obterConfiguracaoAplicacao`, obrigatória): o
   > backend **não sobe sem ela**. Como a URL das Pages é determinística, já dá para preencher
   > com o valor final antes mesmo de criar as Pages.

3. Deploy. Anote a URL: `https://<seu-servico>.onrender.com`. Valide `GET .../health`.
   Se o nome do serviço não for `contratados-rpg-api`, ajuste `apiBase` em
   `frontend/src/environments/environment.production.ts` para a URL real e commite.

> **Free tier:** o serviço hiberna após ~15 min sem tráfego; o primeiro request depois disso
> demora ~50s ("cold start"). Durante o cold start o Render pode devolver 502/503 **sem** header
> de CORS — o navegador reporta como "erro de CORS", mas é só o backend acordando.

---

## 3. Frontend — Cloudflare Pages

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git**
   (conecte o repositório). *Se você já tinha um projeto por Direct Upload, recrie-o conectado
   ao Git — só a integração Git reimplanta no push.*
2. Configure o build:

   | Campo                       | Valor                                              |
   |-----------------------------|----------------------------------------------------|
   | **Production branch**       | **`master`** — nossa branch de produção (o padrão da Cloudflare é `main`; se não trocar, o deploy vira *preview* e a URL principal fica com o placeholder) |
   | **Build command**           | `npm install && npm run build --workspace=frontend` |
   | **Build output directory**  | `frontend/dist/frontend/browser`                   |
   | **Root directory**          | *(vazio — raiz do repo)*                            |

3. Deploy. Anote a URL: `https://<seu-projeto>.pages.dev`. O `frontend/public/_redirects`
   (`/* /index.html 200`, copiado para a raiz do build pelo `assets` glob) garante o fallback
   de SPA do Angular.
4. **Feche o CORS:** confirme que `APP_FRONTEND_ORIGEM` no Render é exatamente essa URL
   (`https://<seu-projeto>.pages.dev`, sem barra no fim). Se ajustar, o Render reinicia sozinho.

---

## 4. Pós-deploy

- Abra `https://<seu-projeto>.pages.dev`: a home consome `GET {apiBase}/health` no Render e
  exibe o status `ok` — provando a cadeia **Cloudflare → Render → Supabase**.
- A partir daqui, todo push para `master` reimplanta as duas plataformas automaticamente.

---

## Checklist rápido

- [ ] Supabase criado; credenciais do banco copiadas para as `DB_*`
- [ ] Render: Build `npm install && npm run build --workspace=backend`, Start `start:prod`, Auto-Deploy On, Health `/health`
- [ ] Render: envs preenchidas; `JWT_SECRETO` forte; **sem** `NODE_ENV=production`; `APP_FRONTEND_ORIGEM` = URL das Pages
- [ ] `environment.production.ts` com o `apiBase` da URL do Render (commitado)
- [ ] Cloudflare Pages conectado ao Git; **Production branch = `master`**; output `frontend/dist/frontend/browser`
- [ ] URL das Pages abre a home exibindo o `/health` (sem erro de CORS)
