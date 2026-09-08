---
name: sql-migrations
description: >
  Escrever migration, decidir onde um dado novo vive (coluna, tabela de referência ou campo de
  documento) e escrever SQL de repositório. Use ao tocar schema, criar/alterar tabela ou coluna,
  adicionar enum, ou escrever/revisar qualquer query em repository — mesmo sem a palavra
  "migration" aparecer. Erro aqui costuma ser a única categoria irreversível em produção.
---

# Migrations e SQL

> A regra vive em `docs/CONVENTIONS.md` ("SQL"/"Enums"/"Migrations") e `docs/ARCHITECTURE.md`
> §10; em conflito com esta skill, o documento vence. **Nunca confie num número de migration
> escrito em doc** — só no comando que lista o diretório real.

## 1. Onde o dado vive

- **Identidade/posse/permissão** de uma entidade → coluna relacional.
- **Conteúdo de domínio** que muda de forma junto com regras de negócio (se o projeto usa campo
  de documento) → campo JSON/JSONB, contrato tipado no pacote compartilhado.
- **Enum de coluna** (participa de `WHERE`/`JOIN`/FK) → decida entre tabela de referência
  (`tipo_<tabela>`, com `codigo` + `descricao`, coluna de negócio `INTEGER FK`) e tipo enum nativo
  do banco; documente a escolha em `ARCHITECTURE.md` §10.2 e aplique sem exceção. Se optar por
  tabela de referência, o repositório traduz `codigo ↔ id` — DTO/service/frontend nunca veem o id.
- **Enum de conteúdo de domínio** dentro de um campo de documento → continua enum de código no
  pacote compartilhado, **nunca** vira tabela.

## 2. Escrever a migration

`.sql` puro (ou o formato de migration da ferramenta escolhida) em `<caminho/migrations/>`, nome
`NNNN - Descrição.sql` (dígitos sequenciais + separador + frase legível). Descubra o próximo
número pelo diretório, sempre:

```bash
ls <caminho/migrations/> | sort | tail -1
```

- `-- UP` obrigatório, `-- DOWN` obrigatório (salvo justificativa em comentário no arquivo).
- **Nunca** `BEGIN`/`COMMIT`/`ROLLBACK` manual, se a ferramenta de orquestração já abre uma
  transação por migration. Instrução que não roda em transação (ex.: `CREATE INDEX CONCURRENTLY`)
  precisa do sinalizador que a ferramenta usar para desabilitar a transação só naquele arquivo.
- Campos da entidade base sempre explícitos nas colunas (`created_date`/`updated_date`/
  `is_deleted`/`deleted_date`, se adotados), nunca com `DEFAULT`, se essa for a convenção do
  projeto (ver `ARCHITECTURE.md` §10.1).

## 3. Nomes e prefixos

Nomenclatura de tabela/coluna conforme a decisão registrada em `CONVENTIONS.md`. Campo de data
com sufixo consistente — nunca dois padrões (`_date` e `_at`) convivendo.

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_<tabela>` |
| Foreign key | `fk_` | `fk_<tabela>_<tabela-referenciada>` |
| Unique index | `uix_` | `uix_<tabela>_<coluna>` |
| Index | `ix_` | `ix_<tabela>_<coluna>` |
| Check constraint | `chk_` | `chk_<tabela>_<regra>` |
| Trigger | `trg_` | `trg_<tabela>_<evento>` |
| Function | `fn_` | `fn_<acao>` |

> Nota de adoção: se o projeto herdar migrations antigas com prefixo diferente do padrão atual
> (ex.: `ck_` em vez de `chk_`), **não reescreva a migration aplicada** — só use o prefixo correto
> em toda constraint nova, e registre a inconsistência histórica em `PROBLEMS.md` se valer a pena.

## 4. SQL de repositório

Só SQL, estendendo o repositório base do projeto. Parâmetro nomeado sempre — nunca posicional,
nunca interpolação. `INSERT ... SELECT :campo ... RETURNING` no lugar de `VALUES`, se essa for a
convenção adotada (evita que um `DEFAULT` de coluna produza valor implícito não visível no código).
Todo `SELECT` filtra a exclusão lógica, se o projeto usa soft delete. Alias descritivo (nunca
abreviado). DTO interno no parâmetro, nunca primitivo solto nem objeto parcial genérico. Query do
módulo A nunca no repositório do módulo B.

**Tradução `codigo ↔ id`**, se o projeto usa tabela de referência para enum de coluna: leitura
resolve com `JOIN tipo_<entidade> ON tipo_<entidade>.id = <tabela>.tipo_<entidade>_id` selecionando
`tipo_<entidade>.codigo AS <campo>`; escrita resolve com subquery
`(SELECT id FROM tipo_<entidade> WHERE codigo = :valor AND is_deleted = false)` no lugar do FK — a
service só vê `codigo` (o enum de código), nunca o id.

**Única exceção a parâmetro nomeado, se o projeto adotar:** dentro do diretório de migrations,
valores constantes podem ser literais SQL (escapando aspas), porque migration não recebe input de
usuário. O runtime (repositório) continua 100% parametrizado, sem afrouxamento.

## 5. Rodar, reverter, produção

```bash
<comando de aplicar migrations pendentes>
<comando de reverter a última>
<comando de reset + seed, dev only>
```

Em produção, confirmar que a migration **rodou** no ambiente de destino nunca é dispensável —
migration commitada e deployada não é migration aplicada, principalmente em qualquer pipeline de
deploy que não gatilhe a migration automaticamente.

## Checklist pré-commit

Número livre (conferido pelo comando, não por memória) → nome descritivo → `-- UP` e `-- DOWN`
presentes → prefixos corretos → colunas de entidade base completas e explícitas, sem `DEFAULT`
implícito (se essa for a convenção) → rollback testado de verdade: aplicar → reverter → aplicar
de novo, sem erro.
