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
| [docs/CONTEXT.md](docs/CONTEXT.md) | Estado atual e próxima task |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Schema SQL alvo + forma dos documentos JSONB |
| [docs/core/sistema-v4.1.0.md](docs/core/sistema-v4.1.0.md) | Fonte da verdade das regras do jogo |
| [docs/core/guia_de_mestre-v4.0.0.md](docs/core/guia_de_mestre-v4.0.0.md) | Fonte da verdade de criação de ameaças |
| [docs/specs/](docs/specs/) | Workflow spec-driven: backlog → active → done |

## Arquitetura

Monorepo npm workspaces:

- **`shared/`** (`@contratados-rpg/shared`) — DTOs, enums, interfaces, validators e o
  motor de regras do jogo (`regras/`)
- **`backend/`** — NestJS + Knex (SQL bruto) + Socket.IO (broadcast-only) → Render
- **`frontend/`** — Angular 21 + PrimeNG 21 (standalone + Signals) → Cloudflare
- **Banco** — PostgreSQL 16 (local: Docker; produção: Supabase)

## Desenvolvimento

> Disponível após o milestone M0 (fundação).

```bash
npm install                              # instala os 3 workspaces
npm run db:up                            # Postgres via Docker Compose
npm run db:migrate --workspace=backend   # migrations
npm run backend:dev                      # API em http://localhost:3100
npm run frontend:dev                     # SPA em http://localhost:4300
```

### Variáveis de ambiente (backend)

```env
DB_HOST  DB_PORT  DB_NOME  DB_USUARIO  DB_SENHA
JWT_SECRETO  JWT_EXPIRACAO
APP_PORTA  APP_AMBIENTE  APP_FRONTEND_ORIGEM
```
