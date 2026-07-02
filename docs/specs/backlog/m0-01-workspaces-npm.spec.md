# m0-01-workspaces-npm.spec.md

> Task 1/7 do milestone `m0-fundacao.spec.md`.

## Objetivo

Esqueletar o monorepo npm workspaces (`shared/`, `backend/`, `frontend/`) com os pacotes
se importando corretamente entre si, conforme a estrutura definida em
`docs/SYSTEM.SPEC.md` §3.

## Entregáveis

1. `package.json` raiz com `workspaces: ["shared", "backend", "frontend"]` e scripts
   proxy (`backend:dev`, `frontend:dev`, `db:up`, `db:down`, `db:migrate`, `db:rollback` —
   os scripts de banco podem delegar para a task `m0-02`, mas devem existir aqui como
   pontos de entrada).
2. `shared/` (`@contratados-rpg/shared`): `package.json`, `tsconfig.json`, estrutura de
   pastas vazia conforme SYSTEM.SPEC §3 (`src/dtos/`, `src/enums/`, `src/interfaces/`,
   `src/validators/`, `src/regras/`) — sem conteúdo de negócio ainda, só a estrutura e um
   arquivo `index.ts` de barrel mínimo para validar o build.
3. `backend/` (NestJS novo, gerado via Nest CLI ou esqueleto manual equivalente):
   `package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts` mínimo. Pastas
   vazias `src/modules/`, `src/config/` (o conteúdo de `src/core/` nasce na task `m0-03`).
4. `frontend/` (Angular 21 + PrimeNG 21, standalone): esqueleto gerado via Angular CLI,
   `package.json`, pastas `src/app/modules/`, `src/app/core/`, `src/app/shared/` vazias
   (o shell visual nasce na task `m0-05`).
5. Import funcionando nos dois sentidos: `backend/` e `frontend/` conseguem importar
   `@contratados-rpg/shared` (path mapping via `tsconfig` + referência de workspace npm).

## Critérios de Aceite

- `npm install` na raiz instala os três workspaces sem erro
- Um import de teste de `@contratados-rpg/shared` compila tanto em `backend/` quanto em
  `frontend/` (pode ser um export trivial, ex. uma constante, só para validar a ligação —
  removido ou substituído por conteúdo real nas tasks seguintes)
- Estrutura de pastas confere com `docs/SYSTEM.SPEC.md` §3

## Fora de Escopo

- Conteúdo de negócio em `shared/` (DTOs, enums, regras reais) — nasce conforme os
  milestones que os consomem (M1+)
- `core/` do backend (BaseEntity, BaseRepository, exceptions, interceptors) — task `m0-03`
- Docker, Knex e migrations — task `m0-02`
- Layout, interceptors e páginas do frontend — task `m0-05`
- Qualquer regra de jogo, tabela de negócio ou tela real

## Dependências

Nenhuma — primeira task do milestone.
