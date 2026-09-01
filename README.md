# contratados-rpg

Site completo do RPG **Contratados** (SCP Foundation RPG v4): calculadora de stats,
campanhas, fichas de jogador/criatura/NPC com atualização em tempo real e guia de missão.

Sucessor da [contratados-calculadora](https://github.com/mthhenri/contratados-calculadora)
(arquivada após o milestone M1).

## Documentação

| Arquivo | Papel |
|---|---|
| [docs/SYSTEM.SPEC.md](docs/SYSTEM.SPEC.md) | Constituição do projeto — precede tudo |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Referência rápida de convenções de código |
| [docs/design/DESIGN.md](docs/design/DESIGN.md) | Identidade visual, tokens e biblioteca de componentes (`frontend/src/app/shared/ui/`) |
| [docs/context/CONTEXT.md](docs/context/CONTEXT.md) | Estado atual e próxima task |
| [docs/context/HISTORY.md](docs/context/HISTORY.md) | Histórico completo — o que aconteceu e por quê |
| [docs/context/PROBLEMS.md](docs/context/PROBLEMS.md) | Problemas conhecidos do sistema |
| [docs/context/MEMORY.md](docs/context/MEMORY.md) | Mapa: onde fica o quê e onde estão as regras |
| [docs/context/IDEAS.md](docs/context/IDEAS.md) | Ideias levantadas que ainda não viraram spec |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Schema SQL alvo + forma dos documentos JSONB |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Runbook de deploy em produção — ainda descreve o Render; reescrita para Cloud Run pendente (ver `docs/context/CONTEXT.md`) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Banco local reproduzível, fixtures e credenciais de desenvolvimento |
| [docs/PARIDADE-M1.md](docs/PARIDADE-M1.md) | Verificação de paridade da calculadora (fecha o M1) |
| [docs/core/sistema-v4.1.0.md](docs/core/sistema-v4.1.0.md) | Fonte da verdade das regras do jogo |
| [docs/core/guia_de_mestre-v4.0.0.md](docs/core/guia_de_mestre-v4.0.0.md) | Fonte da verdade de criação de ameaças |
| [docs/specs/](docs/specs/) | Workflow spec-driven: backlog → active → done |

## Arquitetura

Monorepo npm workspaces:

- **`shared/`** (`@contratados-rpg/shared`) — DTOs, enums, interfaces, validators e o
  motor de regras do jogo (`regras/`)
- **`backend/`** — NestJS + Knex (SQL bruto) + Socket.IO (broadcast-only) → Google Cloud Run
- **`frontend/`** — Angular 21 (standalone + Signals), biblioteca de componentes própria em
  `frontend/src/app/shared/ui/` (sem PrimeNG desde `ui-05`, ver `docs/design/DESIGN.md`) →
  Cloudflare
- **Banco** — PostgreSQL 16 (local: Docker; produção: Supabase)

## Desenvolvimento

```bash
npm install                              # instala os 3 workspaces
npm run db:up                            # Postgres via Docker Compose
npm run db:migrate --workspace=backend   # migrations
npm run db:reset:dev                     # apaga/recria o banco local e aplica fixtures
npm run dev                              # backend + frontend juntos (predev sobe o banco)
```

`dev` roda `backend:dev` (API em http://localhost:3100) e `frontend:dev` (SPA em
http://localhost:4300) em paralelo; rode-os separados se preferir consoles isolados.

O reset é destrutivo e exclusivo do ambiente local. Consulte
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) antes do primeiro uso.

### Variáveis de ambiente (backend)

```env
DB_HOST  DB_PORT  DB_NOME  DB_USUARIO  DB_SENHA
JWT_SECRETO  JWT_EXPIRACAO
APP_PORTA  APP_AMBIENTE  APP_FRONTEND_ORIGEM
```

## Deploy (produção)

Deploy por integração nativa das plataformas: no push para `master`, um trigger do Cloud Build
compila a imagem, roda as migrations e reimplanta o backend no Google Cloud Run, enquanto a
Cloudflare Pages puxa do Git e reimplanta o frontend sozinha (banco no Supabase) — sem GitHub
Actions no deploy. O backend migrou do Render para o Cloud Run em 2026-09-01 (ver
`docs/context/HISTORY.md`); o runbook [docs/DEPLOY.md](docs/DEPLOY.md) ainda descreve o fluxo
antigo do Render e está pendente de reescrita.
