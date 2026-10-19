# Contratados RPG

Site completo do RPG de mesa **Contratados** (SCP Foundation RPG v4): campanhas, fichas de
jogador, criatura e NPC com atualização em tempo real, encontros de combate, regras publicadas no
próprio site e calculadoras públicas — tudo apoiado por um motor de regras compartilhado entre
frontend e backend.

Sucessor da [contratados-calculadora](https://github.com/mthhenri/contratados-calculadora)
(arquivada após o milestone M1).

## O que o sistema faz

- **Campanhas** — mestre, jogadores e espectadores, com convites, papéis e painel de gestão.
- **Fichas** — jogador, criatura e NPC, com rolagens, guia de criação, inventário, habilidades,
  avatar e cor de identidade; o mestre controla o que cada membro vê.
- **Tempo real** — Socket.IO *broadcast-only*: o que um participante altera aparece para os outros
  sem recarregar.
- **Encontro de combate** — iniciativa, turnos, log da rodada e visões separadas de mestre e
  jogador.
- **Regras** — os livros do sistema (Sistema e Guia de Mestre) lidos no site, com sumário,
  pesquisa e painel de consulta.
- **Oficina das Regras** — editor dos livros no próprio site (só administradores): a fonte da
  verdade das regras é o **banco**, editado, comparado e publicado por ali.
- **Calculadoras públicas** — rodam no navegador, sem login, sobre `shared/regras`.
- **Biblioteca de documentos** e **patchnotes** por versão.

O estado detalhado e a próxima tarefa estão em [docs/context/CONTEXT.md](docs/context/CONTEXT.md).

## Arquitetura

Monorepo npm workspaces:

- **`shared/`** (`@contratados-rpg/shared`) — DTOs, enums, interfaces, validadores e o motor
  puro de regras do jogo (`regras/`), consumido por frontend e backend.
- **`backend/`** — NestJS + Knex (SQL bruto) + Socket.IO (*broadcast-only*) → Google Cloud Run.
  Fluxo `controller (fino) → service → repository`.
- **`frontend/`** — Angular 21 (standalone + Signals) com biblioteca de componentes própria em
  `frontend/src/app/shared/ui/` (ver [docs/design/DESIGN.md](docs/design/DESIGN.md)) → Cloudflare
  Pages.
- **Banco** — PostgreSQL 16 (local: Docker; produção: Supabase).

## Desenvolvimento

Pré-requisitos: Node.js, npm e Docker.

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
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) antes do primeiro uso.

```bash
npm run test                 # testes dos 3 workspaces
npm run lint                 # lint dos 3 workspaces
npm run repo:verificar       # confere a organização documental do repositório
npm run regras:exportar      # regenera docs/core/ a partir do banco publicado
```

### Variáveis de ambiente (backend)

```env
DB_HOST  DB_PORT  DB_NOME  DB_USUARIO  DB_SENHA
JWT_SECRETO  JWT_EXPIRACAO
APP_PORTA  APP_AMBIENTE  APP_FRONTEND_ORIGEM
```

### API REST (Swagger)

Com o backend em execução, a documentação navegável da API está em
[`/api/docs`](http://localhost:3100/api/docs) e o OpenAPI bruto em
[`/api/docs-json`](http://localhost:3100/api/docs-json). Ao criar, remover ou alterar endpoint ou
DTO público, rode `npm run openapi:gerar-contratos --workspace=backend` na mesma tarefa. O
Socket.IO fica fora do OpenAPI; seus eventos são documentados no gateway.

## Regras do jogo

A fonte da verdade das regras é o **banco**, editado na Oficina das Regras. Os arquivos em
`docs/core/` são a **cópia gerada** da versão publicada (`npm run regras:exportar`) — leia-os, mas
não os edite à mão:

- [docs/core/sistema-v4.1.5.md](docs/core/sistema-v4.1.5.md) — regras do jogo;
- [docs/core/guia_de_mestre-v4.2.0.md](docs/core/guia_de_mestre-v4.2.0.md) — criação de ameaças.

## Documentação

| Arquivo | Papel |
|---|---|
| [docs/SYSTEM.SPEC.md](docs/SYSTEM.SPEC.md) | Constituição do projeto — precede tudo |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Convenções de código |
| [docs/design/DESIGN.md](docs/design/DESIGN.md) | Identidade visual, tokens e componentes |
| [docs/context/CONTEXT.md](docs/context/CONTEXT.md) | Estado atual e próxima tarefa |
| [docs/context/HISTORY.md](docs/context/HISTORY.md) | Histórico — o que aconteceu e por quê |
| [docs/context/PROBLEMS.md](docs/context/PROBLEMS.md) | Problemas conhecidos |
| [docs/context/MEMORY.md](docs/context/MEMORY.md) | Mapa de onde cada coisa vive |
| [docs/context/IDEAS.md](docs/context/IDEAS.md) | Ideias que ainda não viraram spec |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Schema SQL e forma dos documentos JSONB |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Banco local, fixtures e credenciais de desenvolvimento |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Runbook de deploy — ainda descreve o Render; reescrita para Cloud Run pendente |
| [docs/specs/](docs/specs/) | Fluxo spec-driven: backlog → active → done |

Agentes de código seguem [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) (cópias idênticas).

## Deploy (produção)

Integração nativa das plataformas, sem GitHub Actions no deploy: no push para `master`, um
trigger do Cloud Build compila a imagem, roda as migrations e reimplanta o backend no Google Cloud
Run; a Cloudflare Pages puxa do Git e reimplanta o frontend (banco no Supabase). O GitHub Actions
roda apenas o CI (lint + testes). O backend migrou do Render para o Cloud Run em 2026-09-01.

## Licença

Código proprietário (`UNLICENSED`). As marcas em `frontend/public/marcas/` têm licença própria
em [LICENCA.md](frontend/public/marcas/LICENCA.md).
