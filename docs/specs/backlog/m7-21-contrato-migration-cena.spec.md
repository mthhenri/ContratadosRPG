# m7-21-contrato-migration-cena.spec.md

> Primeira task do milestone `m7-cenas.spec.md` — shared + banco. Sem esta base, nenhuma outra
> task do milestone tem onde pendurar dado.

## Objetivo

Criar o contrato e o schema da entidade `cena`, sem tocar em nenhum endpoint ou tela ainda: enum,
DTOs mínimos, tabelas de referência e migration de backfill dos encontros existentes.

## Estado atual

- `EncontroStatusEnum` (`shared/src/enums/encontro-status.enum.ts`) e a tabela
  `tipo_encontro_status` (`backend/src/database/migrations/0020 - Tabela de referência
  tipo_encontro_status.sql`) são o molde a seguir para um enum de coluna: BaseEntity + `codigo` +
  `descricao`, seed via `INSERT ... SELECT` com `UNION ALL`, `UNIQUE INDEX ... WHERE is_deleted =
  false`.
- `encontro` (`backend/src/database/migrations/0021 - Tabelas encontro, encontro_combatente e
  encontro_evento.sql:13-44`) hoje é a raiz: `campanha_id`, `tipo_encontro_status_id`, `nome`,
  `rodada_atual`, `turno_indice`. A invariante "no máximo um não-encerrado por campanha" **não** é
  um índice parcial único (comentário nas linhas 36-40 explica por quê) — é arbitrada pela
  `EncontroService.criarEncontro` (`encontro.service.ts:85-113`), que consulta
  `encontroRepositorio.recuperarAbertoPorCampanha` antes de criar.
- Última migration: `0029 - Papel ESPECTADOR e convite de espectador.sql`. Esta task usa `0030` e
  `0031` (uma para o schema novo, outra para o backfill — nunca a mesma migration cria estrutura e
  faz `UPDATE`/`INSERT` de dados de produção juntos, para o `DOWN` poder reverter cada parte
  isoladamente).

## Entregáveis

1. **`CenaTipoEnum`** (`shared/src/enums/cena-tipo.enum.ts`, export em `shared/src/enums/index.ts`):
   `COMBATE | INVESTIGACAO | FURTIVA | PERSEGUICAO | RESISTENCIA`. Comentário aponta o capítulo
   "⬡ Cenas" (`docs/core/sistema-v4.1.0.md:2234`).
2. **`CenaStatusEnum`** (mesmo arquivo/pasta): `PLANEJADA | ATIVA | ENCERRADA`.
3. Migration `0030` — `tipo_cena` e `tipo_cena_status` (tabelas de referência, molde de
   `tipo_encontro_status`), e a tabela `cena`: BaseEntity + `campanha_id` (fk), `tipo_cena_id` (fk),
   `tipo_cena_status_id` (fk), `nome`, `ordem` (INTEGER). Índice por `campanha_id`. `encontro` ganha
   `cena_id INTEGER` (fk, nullable só durante a migration de backfill — depois de `0031` populá-la,
   uma constraint `NOT NULL` fecha o contrato: todo encontro passa a pertencer a uma cena).
4. Migration `0031` — backfill: para cada `encontro` existente, criar uma `cena` do tipo `COMBATE`
   com o `nome` do encontro e o status equivalente (`MONTAGEM`→`PLANEJADA`, `ATIVO`→`ATIVA`,
   `ENCERRADO`→`ENCERRADA`), depois preencher `encontro.cena_id` e aplicar o `NOT NULL`. `DOWN`
   reverte a constraint e apaga as cenas criadas por esta migration (não todas — só as que o `UP`
   gerou, identificáveis por terem sido criadas nesta migration específica; usar uma forma segura de
   distingui-las, como fazer o backfill em uma transação e não depender de heurística por nome).
5. **Função pura `cenaTemIniciativa`** (`shared/src/regras/cena/cena-tem-iniciativa.ts`, exportada
   por `shared/src/regras/cena/index.ts`): `(tipo: CenaTipoEnum) => boolean`, `true` para
   `COMBATE`/`FURTIVA`/`PERSEGUICAO`, `false` para `INVESTIGACAO`/`RESISTENCIA`. Zero dependências,
   testada para os cinco valores do enum.
6. DTOs mínimos em `shared/src/dtos/cena/` (`dto-conventions`): `CenaCriarDto { nome, tipo:
   CenaTipoEnum, ativarImediatamente: boolean }`, `CenaCriadaDto { id, campanhaId, nome, tipo,
   status }`. Os demais DTOs de condução (abrir/encerrar/reordenar/resumo) ficam para `m7-22`, que é
   quem os consome primeiro — não declarar contrato sem um consumidor na mesma task.

## Critérios de Aceite

- `npm run test -w shared` cobre `cenaTemIniciativa` para os cinco tipos.
- Rodar a migration `0030`+`0031` sobre um banco com encontros existentes (dev/seed) preserva todos
  eles, cada um agora com `cena_id` preenchido apontando para uma cena `COMBATE` no status
  equivalente; nenhum dado de `encontro`/`encontro_combatente`/`encontro_evento` é alterado.
- `DOWN` das duas migrations é simétrico: reverter `0031` depois `0030` deixa o schema idêntico ao
  estado anterior a esta task.
- Nenhum endpoint, service ou componente de frontend muda de comportamento nesta task — é só
  contrato e schema.
- `npm run test -w shared` e `-w backend` verdes (backend só para garantir que nada quebrou com o
  novo `cena_id` obrigatório em `encontro`).

## Fora de Escopo

- Qualquer endpoint de `cena` (criar/abrir/encerrar/listar) — `m7-22`.
- Qualquer tela — `m7-23`.
- Migrar o índice parcial único de "no máximo um não-encerrado" de `encontro` para `cena` — `m7-22`
  arbitra essa invariante na service, como `encontro` já faz hoje (ver "Estado atual").

## Dependências

`m7-01`/`m7-03` (`encontro` e `tipo_encontro_status` existentes, molde a seguir).
