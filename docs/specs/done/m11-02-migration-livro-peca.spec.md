# m11-02-migration-livro-peca.spec.md

> **Concluída em 2026-10-10.** Revisão independente aplicada: FK composta pai/livro, pai ativo e
> sem ciclo no SQL, `removerPeca` com `revisao`, identificador único total, âncora antiga amarrada
> ao livro. Detalhes no `HISTORY.md`.

> Task 2/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Banco e
> repositórios da Oficina; sem API pública nem UI.

## Objetivo

Criar as tabelas `livro`, `tipo_regra_peca`, `regra_peca`, `regra_peca_ancora_antiga`,
`tipo_livro_versao_situacao` e `livro_versao`, com repositórios que só fazem SQL, conforme a
modelagem fechada da umbrella.

## Entregáveis

1. **Migration** `backend/src/database/migrations/0036 - Tabelas do livro e das pecas de regra.sql`
   (`-- UP` e `-- DOWN`, sem `BEGIN/COMMIT`), com BaseEntity, triggers `trg_*_updated_date`,
   constraints nomeadas e sem `DEFAULT`:
   - `livro` (`codigo`, `titulo`, `ordem`; `uix` em `codigo` entre não excluídos);
   - `tipo_regra_peca` e `tipo_livro_versao_situacao` (`codigo`, `descricao`), populadas com os
     códigos de `TipoRegraPecaEnum` (`m11-01`) e `RASCUNHO`/`PUBLICADA` como literais;
   - `regra_peca` (`livro_id`, `peca_pai_id` auto-FK, `tipo_regra_peca_id`, `identificador` UUID,
     `ancora`, `ordem`, `dados` JSONB, `revisao` INTEGER); `uix` de `identificador` e de
     `(livro_id, ancora)`; índice por `(livro_id, peca_pai_id, ordem)`;
   - `regra_peca_ancora_antiga` (`regra_peca_id`, `ancora`; `uix` por `ancora` dentro do livro);
   - `livro_versao` (`livro_id`, situação, `numero`, `formato`, `conteudo` JSONB, `publicacao_data`,
     `usuario_id`, `nota`); fotografia imutável: sem rota de alteração no repositório.
2. **Módulo** `backend/src/modules/livro/` com `livro.repository.ts`, `regra-peca.repository.ts`,
   `livro-versao.repository.ts` e `ancora-antiga` dentro do repositório de peça. Métodos
   `verbo + entidade`, todos recebendo DTO (criados em `shared/src/dtos/livro/` pela convenção da
   skill `dto-conventions`), JSDoc nos públicos. Operações mínimas: listar/recuperar livro; listar
   árvore de peças do livro; criar/alterar/mover/excluir (soft) peça com checagem de `revisao`
   (alteração só aplica se a revisão enviada é a do banco e a incrementa); registrar âncora
   antiga; criar fotografia; recuperar a mais recente por livro e situação; listar versões.
3. **Enum** de coluna da situação (`TipoLivroVersaoSituacaoEnum`) e DTOs internos necessários.
4. **Testes** no padrão dos módulos vizinhos: unitários com Knex simulado conferindo o SQL, e um
   spec contra o PostgreSQL local (`TESTAR_POSTGRES_LIVRO=1`, `describe.runIf`, cada caso em
   transação revertida).
5. **`SCHEMA.md`** atualizado com as tabelas novas e a forma de `dados`/`conteudo` (ponteiro para
   o contrato do `shared/`, sem copiá-lo).

## Critérios de Aceite

- `npm run db:migrate --workspace=backend` aplica, `db:rollback` desfaz e reaplica sem resíduo.
- Testes dos repositórios cobrem: árvore ordenada; `ancora` duplicada rejeitada no mesmo livro e
  aceita em livros distintos; alteração com `revisao` desatualizada não aplica; soft delete some da
  árvore; fotografia mais recente por situação; nenhuma consulta sem `is_deleted = false`.
- `npm run lint --workspace=backend` (inclui `tsc --noEmit`) e `npm run test --workspace=backend`
  verdes. Revisão independente (subagente `revisor`) do SQL, por ser a categoria irreversível em
  produção; relatar o resultado.

## Fora de Escopo

Controller, service, permissões e endpoints (`m11-04`); importar dados (`m11-03`); montar a
fotografia a partir da árvore (`m11-04`); popular `livro` com Sistema e Guia (`m11-03`).

## Dependências

`m11-01` em `done/` (enum de tipos e contrato de `dados`). Skills `sql-migrations` e
`dto-conventions`; `SYSTEM.SPEC.md` §10.

## Riscos e Mitigação

- **Migration irreversível em produção.** `-- DOWN` completo e ensaiado; a revisão independente é
  parte do aceite.
- **Árvore com auto-FK e soft delete.** Excluir pai deve excluir/rejeitar filhos de forma
  explícita; decidir no teste, não deixar peça órfã visível.
