# skills-05-sql-migrations.spec.md

> Task 5/9 do guarda-chuva `skills-agentes.spec.md`. Skill nova: `sql-migrations`.

## Objetivo

Criar a skill `sql-migrations`, que cobre tudo que envolve tocar o banco: escrever migration,
decidir onde um dado novo vive (coluna, tabela `tipo_*` ou JSONB `dados`) e escrever SQL de
repositório dentro das regras do projeto.

## Motivação

É a área mais densa em regras do `CONVENTIONS.md` e a única cujo erro é **irreversível em
produção**. Dois sinais concretos de que a documentação solta não está segurando:

- `docs/CONVENTIONS.md:209` ainda anuncia "Próxima migration: `0009`" — o diretório
  `backend/src/database/migrations/` está em `0025 - Fórmula customizada de Iniciativa do
  combatente.sql`. A instrução operacional envelheceu 16 migrations sem ninguém notar.
- `P-017` (resolvido) foi exatamente uma migration — a `0012`, coluna `cor` — que **nunca rodou
  em produção**.

Some-se que a decisão "isso vira coluna, tabela `tipo_*` ou campo do JSONB `dados`?" aparece em
quase toda task de backend e está espalhada entre `CONVENTIONS.md`, `SYSTEM.SPEC.md` §10.7 e
`docs/SCHEMA.md`.

## Entregáveis

1. **`sql-migrations/SKILL.md`** nas duas pastas, em ordem de decisão:
   - **Onde o dado vive** — árvore de decisão curta: identidade/posse/permissão → coluna de
     `ficha`; conteúdo de jogo → JSONB `dados` (contrato em `shared/` + `docs/SCHEMA.md`); enum
     de **coluna** → tabela de referência `tipo_<tabela>_<complemento?>` com `BaseEntity` +
     `codigo` + `descricao` e FK INTEGER, com o repositório traduzindo `codigo ↔ id` (DTO,
     service e frontend nunca veem o id); enum de **conteúdo de jogo** dentro do JSONB →
     continua enum TS em `shared/src/enums/`, nunca tabela.
   - **Escrever a migration** — `.sql` puro em `backend/src/database/migrations/`, nome
     `NNNN - Nome descritivo.sql`; `-- UP` obrigatório e `-- DOWN` obrigatório salvo
     justificativa no próprio arquivo; nada de `BEGIN`/`COMMIT`/`ROLLBACK` (o Knex abre a
     transação por migration); nada de arquivo `.ts` com `up`/`down`.
   - **Como descobrir o próximo número** pelo diretório, com o comando — **nunca** por um número
     escrito na documentação. A skill deve dizer isso explicitamente, citando o caso de
     `CONVENTIONS.md:209` como o motivo.
   - **Nomes** — tabelas singulares em português snake_case; colunas de negócio snake_case
     português e `BaseEntity` em inglês; prefixos obrigatórios `pk_`/`fk_`/`uix_`/`ix_`/`chk_`/
     `trg_`/`fn_`, sempre nomeados; datas `_date` (genérica, inglês) vs `_data` (negócio,
     português), nunca `_at`, `_em` ou `data_<contexto>`; `timestamptz` para instante e `date`
     para calendário puro.
   - **SQL de repositório** — só SQL, estendendo `BaseRepository`, com `executarConsulta<T>()`,
     `executarComando()` e `executarSoftDelete(id)`; `:nomeParametro` sempre (nunca `?`, nunca
     interpolação); `INSERT ... SELECT ... RETURNING` (nunca `VALUES`, nunca `DEFAULT` em
     coluna); todo `SELECT` filtrando `is_deleted = false`; nenhum DELETE físico; alias
     descritivo; DTO interno em vez de primitivo ou `Partial<Model>`; query do módulo A jamais no
     repositório do módulo B.
   - **A exceção sancionada**: dentro de `migrations/`, valores constantes são literais SQL
     (escapando `'` como `''`) — migration não tem input de usuário. O runtime continua 100%
     parametrizado.
   - **Rodar e reverter** — `npm run db:migrate --workspace=backend`, `db:rollback`,
     `db:reset:dev`, `db:seed:dev`, com ponteiro para `docs/DEVELOPMENT.md`.
   - **Produção** — ponteiro para `docs/DEPLOY.md` e a lição do `P-017`: migration escrita e
     mergeada não é migration aplicada; conferir que rodou no ambiente de destino.
2. **Exemplo real citado, não inventado**: apontar 1–2 migrations existentes como modelo de
   estrutura (por exemplo `0021 - Tabelas encontro, encontro_combatente e encontro_evento.sql`
   para tabela nova e `0025 - Fórmula customizada de Iniciativa do combatente.sql` para coluna
   nova), conferindo antes que elas realmente exemplificam bem o padrão.
3. **Checklist de conferência pré-commit** da migration: número livre, nome descritivo, `-- UP` e
   `-- DOWN`, prefixos, `BaseEntity` completa e explícita, sem `DEFAULT`, rollback testado de
   verdade (`db:migrate` → `db:rollback` → `db:migrate`).
4. **Ponteiros** para `docs/CONVENTIONS.md` (SQL, Migrations, Enums), `docs/SYSTEM.SPEC.md` §10.7
   e `docs/SCHEMA.md` — a skill executa, o documento define.
5. **`description` como gatilho**: migration, coluna, tabela, schema, SQL, repositório, banco,
   enum de coluna, JSONB `dados`.
6. **Corte de tamanho**: se passar de ~150 linhas, mover a árvore de decisão de onde o dado vive
   para `sql-migrations/references/onde-o-dado-vive.md` nas duas pastas.

## Critérios de Aceite

- A skill não cita nenhum "próximo número" fixo — só o comando que descobre.
- Todo prefixo, nome de script e caminho citado confere com o repositório de hoje.
- As migrations citadas como exemplo existem e ilustram o que a skill diz que ilustram.
- **Validação por uso:** escrever (sem commitar no diff da task) uma migration hipotética curta
  seguindo apenas a skill, e conferir contra a `0025` que estrutura, nome e seções batem.
  Registrar o exercício no fecho.
- `diff -r .claude/skills .agents/skills` vazio.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- **Corrigir `CONVENTIONS.md:209`** ("Próxima migration: `0009`"). É uma linha de documentação
  desatualizada, achada durante o levantamento; corrigi-la aqui misturaria mudança de fonte da
  verdade com criação de skill. Registrar em `PROBLEMS.md` como dívida de documentação, ou
  corrigir em spec avulsa própria — decisão do autor no fecho.
- Escrever migration real, alterar schema ou tocar qualquer repositório.
- `P-003` (ausência de `ValidationPipe`) — decisão registrada e `ACEITO`; a skill pode citar que
  a validação estrutural não existe, mas não propor revertê-la.
- Ferramenta de lint de SQL.

## Dependências

- `skills-01` (contrato). Recomendável depois de `skills-04` (template de spec).

## Riscos e Mitigação

- **Duplicar a tabela de proibições do `CONVENTIONS.md`.** Mitigado pelo contrato: a skill traz o
  checklist operacional e o caminho de decisão; a regra fica na fonte, com ponteiro. Onde a
  duplicação for inevitável (prefixos e formato do nome do arquivo, consultados a cada
  migration), duplicar o mínimo e citar a fonte na mesma linha.
- **Envelhecer como a linha do `CONVENTIONS.md`.** Mitigado por não escrever nenhum número nem
  contagem no arquivo — só comandos que leem o estado real.
