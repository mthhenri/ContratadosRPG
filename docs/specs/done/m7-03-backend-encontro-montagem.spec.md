# m7-03-backend-encontro-montagem.spec.md

> Task 3/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Persistência e API da **montagem** do encontro: migrations, repository, service e controller para
criar o encontro, adicionar/remover combatentes e atribuir iniciativa. A **condução** (turnos,
vida, condições, log) é a `m7-04`.

## Entregáveis

1. **Migrations** (numeradas na sequência existente de `backend/src/database/migrations/`, SQL
   bruto, BaseEntity em toda tabela, sem `DEFAULT`, sem `VALUES`):
   - `tipo_encontro_status` — tabela de referência + seed (`MONTAGEM`/`ATIVO`/`ENCERRADO`) na mesma
     migration, com `uix_tipo_encontro_status_codigo_ativo`.
   - `encontro` — `campanha_id`, `nome`, `tipo_encontro_status_id`, `rodada_atual`, `turno_indice`.
     Índice `ix_encontro_campanha` + índice **parcial único** garantindo no máximo um encontro
     não-encerrado por campanha.
   - `encontro_combatente` — `encontro_id`, `ficha_id` (nullable = avulso), `nome_avulso`,
     `iniciativa` (nullable até ser rolada), `cadencia`, `ordem`, `vida_maxima_avulso`,
     `vida_atual_avulso`, `condicoes` (JSONB).
   - `encontro_evento` — `encontro_id`, `encontro_combatente_id` (nullable), `tipo`, `rodada`,
     `turno`, `texto`. (Tabela criada aqui; alimentada na `m7-04`.)
2. **`EncontroRepository`** estendendo `BaseRepository`: só SQL, `knex.raw()` com parâmetros
   nomeados `:nome`, `is_deleted = false` em todo `SELECT`, `INSERT ... SELECT :campo RETURNING`,
   soft delete via `executarSoftDelete()`.
3. **`EncontroService`**: criar encontro (status `MONTAGEM`), adicionar combatente (ficha ou
   avulso), remover combatente, atribuir iniciativa (rolagem do jogador **ou** override do mestre),
   `Rolar tudo` (preenche só quem está sem iniciativa, **sem** sobrescrever valor já definido) e
   recuperar o estado completo. Permissões: **criar/alterar só o mestre** da campanha; **ler**
   qualquer membro. Validações: combatente com ficha precisa de ficha da mesma campanha; avulso
   precisa de nome e vida; recusa segundo encontro não-encerrado na campanha.
4. **`EncontroController`** fina: sem regra, sem `if`, sem `try/catch`; só mescla ids de
   `@Param`/`@Query` no DTO (`service.alterar({ ...dto, id })`).
5. **Reuso obrigatório**: iniciativa de ficha de jogador vem do módulo de **rolagem** existente e do
   bônus já calculado pelo motor — nenhuma fórmula de iniciativa reimplementada aqui.
6. **Testes** de service (padrão `*.service.spec.ts` com repositório dublado): permissão de mestre,
   invariante de encontro único, avulso sem ficha, `Rolar tudo` não sobrescrevendo.

## Critérios de Aceite

- Migrations sobem limpas do zero; seed do `tipo_encontro_status` presente
- Nenhuma proibição de SQL violada (§16 #3–#9, #14)
- `npm run test -w backend` verde; `npm run lint -w backend` limpo
- Jogador não cria nem altera encontro (403); membro lê

## Dependências

- `m7-01` (DTOs/enums), `m7-02` (motor, para a ordem no estado recuperado)
