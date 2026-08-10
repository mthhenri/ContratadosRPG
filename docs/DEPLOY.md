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
> **escolha o nome do projeto Pages → 1. Supabase → 2. Cloudflare R2 (avatar da ficha, sem
> dependência de URL — pode ficar em qualquer ordem) → 3. Render (já com `APP_FRONTEND_ORIGEM` =
> `https://<projeto>.pages.dev`) → 4. Cloudflare Pages com esse nome e branch de produção `master`.**

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
   (passo 3):

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
> **Migrations rodam no build (desde o `P-017`).** O `buildCommand` do Render encadeia
> `npm run db:migrate --workspace=backend` depois de compilar — toda migration pendente aplica
> sozinha a cada deploy, contra o Supabase de produção, com as mesmas `DB_*` do passo 3. Isso só
> é seguro porque a convenção de migration do projeto (proibição #7) proíbe `DEFAULT` e coluna
> `NOT NULL` sem valor: a versão do código **anterior** ao deploy continua rodando contra o schema
> **novo** por alguns segundos (build acontece antes do processo antigo ser substituído) sem
> quebrar. Antes do `P-017`, migration era um passo manual pós-deploy — foi esquecido na `m3-61`
> (`0012 - Ficha cor.sql`) e derrubou toda leitura/escrita de ficha em produção com `column "cor"
> does not exist` até ser corrigido.

---

## 2. Armazenamento de blob — Cloudflare R2 (avatar da ficha)

O avatar da ficha (m3-62) nunca entra no Postgres — só a URL persiste; o arquivo em si vive num
armazenamento externo, atrás de um toggle de ambiente (`ARMAZENAMENTO_PROVEDOR`). Em **dev** o
padrão é `local` (disco, sem credencial nenhuma); em **produção** é sempre `r2`.

1. <https://dash.cloudflare.com> → **R2 Object Storage → Create bucket** — dê um nome (ex.:
   `contratados-rpg-avatares`) e crie no plano gratuito.
2. **Habilite o acesso público** ao bucket — duas opções:
   - **Rápido:** aba **Settings** do bucket → **Public access → Allow Access** (domínio
     `pub-<hash>.r2.dev`);
   - **Domínio próprio:** aba **Settings → Custom Domains → Connect Domain** (requer o domínio já
     na Cloudflare).

   A URL pública resultante (com ou sem `https://`, sem barra no fim) é `ARMAZENAMENTO_R2_URL_PUBLICA`.
3. **Crie o token de API** — **R2 → Manage API tokens → Create API token**: permissão
   **Object Read & Write**, escopo restrito a **este bucket** (não "todos os buckets" da conta).
   Anote o **Access Key ID** e o **Secret Access Key** exibidos (o segredo só aparece uma vez).
4. **Account ID** — qualquer página do painel R2 mostra o ID da conta na barra lateral direita
   (`ARMAZENAMENTO_R2_ACCOUNT_ID`).
5. No Render (passo 3), preencha as seis variáveis:

   | Variável                          | Valor                                              |
   |------------------------------------|-----------------------------------------------------|
   | `ARMAZENAMENTO_PROVEDOR`           | `r2` (já fixo no `render.yaml`)                     |
   | `ARMAZENAMENTO_R2_ACCOUNT_ID`      | do passo 4                                          |
   | `ARMAZENAMENTO_R2_ACCESS_KEY_ID`   | do passo 3                                          |
   | `ARMAZENAMENTO_R2_SECRET_ACCESS_KEY` | do passo 3                                        |
   | `ARMAZENAMENTO_R2_BUCKET`          | nome do bucket do passo 1                           |
   | `ARMAZENAMENTO_R2_URL_PUBLICA`     | domínio público do passo 2                          |

> Sem nenhuma das cinco `ARMAZENAMENTO_R2_*`, o backend **não sobe** em produção
> (`ARMAZENAMENTO_PROVEDOR=r2` fixo no `render.yaml` exige todas via `obterVariavelObrigatoria`) —
> mesmo padrão de `DB_*`/`JWT_SECRETO`, que também travam o boot.

---

## 3. Backend — Render

Duas formas: **Blueprint** (lê o `render.yaml` da raiz) ou **Web Service manual**. Qualquer uma
conecta ao Git e reimplanta no push.

1. <https://render.com> → **New → Blueprint** (aponta pro repo; usa o `render.yaml`) — ou
   **New → Web Service → Connect a repository** e configure manualmente:

   | Campo              | Valor                                                    |
   |--------------------|----------------------------------------------------------|
   | **Root Directory** | *(vazio — raiz do repo; o symlink do workspace `shared` depende disso)* |
   | **Runtime**        | Node                                                     |
   | **Build Command**  | `npm install && npm run build --workspace=backend && npm run db:migrate --workspace=backend` |
   | **Start Command**  | `npm run start:prod --workspace=backend`                 |
   | **Auto-Deploy**    | **On** (reimplanta no push à `master`)                   |
   | **Health Check Path** | `/health`                                             |

2. **Environment Variables** (Settings → Environment) — espelham `SYSTEM.SPEC §10.6`:

   | Variável                      | Valor                                                    |
   |-------------------------------|----------------------------------------------------------|
   | `DB_HOST` … `DB_SENHA`        | do passo 1                                               |
   | `JWT_SECRETO`                 | **valor forte e único** (ex.: `openssl rand -hex 32`) — diferente do `.env.example` |
   | `JWT_EXPIRACAO`               | `7d`                                                     |
   | `APP_PORTA`                   | `10000` — precisa casar com a porta que o Render expõe (`PORT`, default `10000`); o backend lê `APP_PORTA` via `ConfigService` |
   | `APP_AMBIENTE`                | `production`                                             |
   | `APP_FRONTEND_ORIGEM`         | `https://<projeto>.pages.dev` — **obrigatória no boot**; use já a URL determinística das Pages (passo 4) |

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

## 4. Frontend — Cloudflare Pages

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

3. Deploy. Anote a URL: `https://<seu-projeto>.pages.dev`. O fallback de SPA usa a convenção
   nativa da Cloudflare Pages: o `npm run build` do frontend gera um `404.html` (cópia do
   `index.html`) no output — a Cloudflare serve esse arquivo (preservando a URL) para qualquer
   rota sem asset correspondente, sem precisar de `_redirects`. **Não** use `_redirects` com
   `/* /index.html 200` (ou qualquer variação `/*` → `*.html`/`/`/nome dedicado) para isso: já
   quebrou a produção duas vezes — (1) a Cloudflare rejeita `/index.html` como alvo no deploy
   como falso positivo de "infinite loop" (bug conhecido: cloudflare/workers-sdk#10992 e
   #11824); (2) mesmo contornando isso com outro alvo, o rewrite via `_redirects` intercepta
   também os assets estáticos reais (main-*.js, chunk-*.js, styles-*.css), servindo-os com
   Content-Type errado e quebrando o carregamento dos module scripts — a Cloudflare aplica a
   regra do `_redirects` antes de checar se o path bate com um asset real, então isso acontece
   com **qualquer** alvo de rewrite. O `404.html` nativo não tem esse problema porque só entra
   em ação quando nenhum asset real corresponde ao path.
4. **Feche o CORS:** confirme que `APP_FRONTEND_ORIGEM` no Render é exatamente essa URL
   (`https://<seu-projeto>.pages.dev`, sem barra no fim). Se ajustar, o Render reinicia sozinho.

---

## 5. Pós-deploy

- Abra `https://<seu-projeto>.pages.dev`: a rota raiz redireciona ao `/login` (destino padrão
  é o `/painel`, guardado). Registre uma conta de teste — completar sem erro de CORS prova a
  cadeia **Cloudflare → Render → Supabase**. Para checar só o backend, `GET
  https://<seu-servico>.onrender.com/health` deve responder `ok` isoladamente.
- A partir daqui, todo push para `master` reimplanta as duas plataformas automaticamente.

---

## Checklist rápido

- [ ] Supabase criado; credenciais do banco copiadas para as `DB_*`
- [ ] Bucket R2 criado, acesso público habilitado e API token (Object Read & Write, escopado ao bucket) gerado; as seis `ARMAZENAMENTO_*` anotadas
- [ ] Render: Build `npm install && npm run build --workspace=backend && npm run db:migrate --workspace=backend`, Start `start:prod`, Auto-Deploy On, Health `/health`
- [ ] Render: envs preenchidas (incluindo `ARMAZENAMENTO_*`); `JWT_SECRETO` forte; **sem** `NODE_ENV=production`; `APP_FRONTEND_ORIGEM` = URL das Pages
- [ ] `environment.production.ts` com o `apiBase` da URL do Render (commitado)
- [ ] Cloudflare Pages conectado ao Git; **Production branch = `master`**; output `frontend/dist/frontend/browser`
- [ ] URL das Pages redireciona a `/login` e um registro de teste completa sem erro de CORS
