---
name: sql-migrations
description: >
  Escrever migration, decidir onde um dado novo vive (coluna, tabela tipo_* ou JSONB dados) e
  escrever SQL de repositório. Use ao tocar schema, criar/alterar tabela ou coluna, adicionar
  enum, ou escrever/revisar qualquer query em backend/src/modules/*/*.repository.ts — mesmo sem a
  palavra "migration" aparecer. Erro aqui é a única categoria irreversível em produção do projeto.
---

# Migrations e SQL — ContratadosRPG

> A regra vive em `docs/CONVENTIONS.md` ("SQL"/"Enums"/"Migrations"), `docs/SYSTEM.SPEC.md` §10.7
> e `docs/SCHEMA.md`; em conflito com esta skill, o documento vence. `docs/CONVENTIONS.md:209`
> ainda diz "Próxima migration: `0009`" com o diretório em `0025` — **nunca confie num número
> escrito em doc**, só no comando abaixo.

## 1. Onde o dado vive

- **Identidade/posse/permissão** da ficha (dono, campanha, visibilidade) → coluna relacional de
  `ficha`.
- **Conteúdo de jogo** (atributos, inventário, habilidades...) → JSONB `ficha.dados`, contrato em
  `shared/` + `docs/SCHEMA.md`.
- **Enum de coluna** (participa de `WHERE`/`JOIN`/FK) → tabela `tipo_<tabela>_<complemento?>`
  (`BaseEntity` + `codigo` + `descricao`), coluna de negócio `INTEGER FK`. Repositório traduz
  `codigo ↔ id` — DTO/service/frontend nunca veem o id (exemplo real abaixo).
- **Enum de conteúdo de jogo** dentro do JSONB (`ClasseEnum`, categorias de item...) → continua
  enum TS em `shared/src/enums/`, **nunca** vira tabela.

## 2. Escrever a migration

`.sql` puro em `backend/src/database/migrations/`, nome `NNNN - Nome descritivo.sql` (4 dígitos +
`" - "` + frase em português). Descubra o próximo número pelo diretório, sempre:

```bash
ls backend/src/database/migrations/ | sort | tail -1
```

- `-- UP` obrigatório, `-- DOWN` obrigatório (salvo justificativa em comentário no arquivo).
- **Nunca** `BEGIN`/`COMMIT`/`ROLLBACK` — o Knex abre a transação por migration. Instrução que não
  roda em transação (`CREATE INDEX CONCURRENTLY`) sinaliza com `-- NO TRANSACTION` logo após o
  marcador.
- **Nunca** arquivo `.ts` com `up`/`down`.
- `BaseEntity` sempre explícita nas colunas (`created_date`/`updated_date`/`is_deleted`/
  `deleted_date`), nunca com `DEFAULT`.

**Exemplo real — coluna nova:** `0025 - Fórmula customizada de Iniciativa do combatente.sql`
(`ALTER TABLE` + `ADD COLUMN`/`DROP COLUMN`, dois blocos, nada mais — o caso mais comum).
**Exemplo real — tabela nova:** `0021 - Tabelas encontro, encontro_combatente e
encontro_evento.sql` (`pk_`/`fk_`/`ix_`/`uix_`, trigger `updated_date`, `DOWN` na ordem inversa do
`UP`). **Armadilha ao copiar esse arquivo:** o `CHECK` histórico usa
`ck_encontro_combatente_origem`, prefixo que já foi corrigido no schema pela migration `0027`.
Não reescreva a migration aplicada; em CHECK novo, use sempre `chk_` conforme a tabela abaixo.

## 3. Nomes e prefixos

Tabela singular português snake_case; coluna de negócio snake_case português, `BaseEntity`
snake_case inglês. Data genérica `_date` (`timestamptz`), data de negócio `_data` (`timestamptz`
para instante, `date` para calendário puro) — nunca `_at`/`_em`/`data_<contexto>`.

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_ficha` |
| Foreign key | `fk_` | `fk_ficha_campanha` |
| Unique index | `uix_` | `uix_usuario_login_ativo` |
| Index | `ix_` | `ix_ficha_campanha` |
| Check constraint | `chk_` | `chk_campanha_membro_papel_valido` |
| Trigger | `trg_` | `trg_ficha_updated_date` |
| Function | `fn_` | `fn_set_updated_date` |

## 4. SQL de repositório

Só SQL, estendendo `BaseRepository` (`backend/src/core/base/base.repository.ts`):
`executarConsulta<T>()` (SELECT), `executarComando()` (INSERT/UPDATE), `executarSoftDelete(id)`
(nunca DELETE físico). `:nomeParametro` sempre — nunca `?`, nunca interpolação. `INSERT ...
SELECT :campo ... RETURNING` — nunca `VALUES`, nunca `DEFAULT` em coluna. Todo `SELECT` filtra
`is_deleted = false`. Alias descritivo (nunca abreviado). DTO interno no parâmetro, nunca
primitivo solto nem `Partial<Model>`. Query do módulo A nunca no repositório do módulo B.

**Tradução `codigo ↔ id` real** (`backend/src/modules/encontro/encontro.repository.ts`): leitura
resolve com `JOIN tipo_encontro_status ON tipo_encontro_status.id = encontro.tipo_encontro_status_id`
selecionando `tipo_encontro_status.codigo AS status`; escrita resolve com subquery
`(SELECT id FROM tipo_encontro_status WHERE codigo = :status AND is_deleted = false)` no lugar do
FK — a service só vê `codigo` (o enum TS), nunca o id.

**Única exceção a `:nomeParametro`:** dentro de `migrations/`, valores constantes são literais SQL
(escapando `'` como `''`) — migration não recebe input de usuário. O runtime (repositório)
continua 100% parametrizado, sem afrouxamento.

## 5. Rodar, reverter, produção

```bash
npm run db:migrate --workspace=backend    # aplica pendentes
npm run db:rollback --workspace=backend   # desfaz a última
npm run db:reset:dev --workspace=backend  # zera e reaplica tudo + seed (dev only)
npm run db:seed:dev --workspace=backend   # só reconcilia fixtures
```

Detalhes de ambiente em `docs/DEVELOPMENT.md`. Em produção, `render.yaml` roda `db:migrate`
automaticamente a cada deploy — mas **migration commitada e deployada não é migration aplicada**
(`P-017`, resolvido: a `0012` ficou semanas sem rodar porque, antes desse pipeline, o passo era
manual e foi esquecido). Confirmar que ela rodou no ambiente de destino continua sendo o hábito
certo, principalmente em qualquer deploy fora desse pipeline. Ver `docs/DEPLOY.md`.

## Checklist pré-commit

Número livre (conferido pelo comando, não por memória) → nome descritivo → `-- UP` e `-- DOWN`
presentes → prefixos corretos (`chk_`, não `ck_`) → `BaseEntity` completa e explícita, sem
`DEFAULT` → rollback testado de verdade: `db:migrate` → `db:rollback` → `db:migrate` sem erro.
