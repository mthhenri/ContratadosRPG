# P-031 — Corrigir prefixos de CHECK constraints já aplicadas

> Task solta originada de `docs/context/PROBLEMS.md` P-031.

## Objetivo

Restaurar a convenção `chk_` nas CHECK constraints de Encontro e Rolagem já
aplicadas, sem reescrever migrations históricas nem alterar a semântica das
regras de integridade.

## Entregáveis

1. Uma migration nova que renomeie as três constraints atuais com prefixo
   `ck_` para seus nomes equivalentes com `chk_`.
2. Rollback da migration que restaure exatamente os nomes `ck_`, permitindo
   desfazer e reaplicar a mudança sem modificar constraints anteriores.
3. Remoção de P-031 de `PROBLEMS.md` e registro auditável da correção no
   contexto do projeto.

## Critérios de Aceite

1. A nova migration possui `-- UP` e `-- DOWN` e usa somente `ALTER TABLE ...
   RENAME CONSTRAINT`.
2. `npm run db:migrate --workspace=backend`, `npm run db:rollback
   --workspace=backend` e uma nova execução de `db:migrate` terminam sem erro
   no banco local.
3. Após a última aplicação, a consulta ao catálogo PostgreSQL não encontra
   nenhuma das três constraints afetadas com prefixo `ck_` e encontra as três
   equivalentes com `chk_`.

## Fora de Escopo

- Reescrever ou renumerar as migrations `0021` a `0024`.
- Renomear outros objetos do schema ou investigar P-032 e demais problemas.
- Alterar a lógica, as colunas ou as expressões das CHECK constraints.

## Dependências

- `docs/CONVENTIONS.md` (prefixo `chk_`).
- `docs/SCHEMA.md` (convenções de constraints).

## Riscos e Mitigação

As migrations históricas posteriores ainda referem-se a `ck_` em seus blocos
de rollback. A migration corretiva é adicionada depois delas e seu `DOWN`
restaura os nomes antigos antes que qualquer rollback histórico os use.
