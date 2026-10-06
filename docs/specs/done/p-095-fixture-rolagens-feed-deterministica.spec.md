# p-095-fixture-rolagens-feed-deterministica.spec.md

> Task avulsa de `PROBLEMS.md` P-095. Preparada em 2026-10-06 por pedido do autor;
> execução autorizada pelo autor em 2026-10-06. Correção restrita a testes e documentação.

## Objetivo

Eliminar a intermitência do teste de reconexão do feed causada por datas geradas com o
relógio real. Manter a prova de que uma rolagem feita durante a queda aparece antes da
rolagem anterior após a reconexão, sem alterar a ordenação do produto.

## Entregáveis

1. Tornar determinística a fixture `rolagem()` em
   `frontend/src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.spec.ts`.
   Usar uma data fixa como padrão e preservar `sobrescritas.createdDate`. Cenários que
   dependem de ordem cronológica fornecem datas fixas distintas explicitamente.
2. No caso “reconexao$ traz uma rolagem feita durante a queda para o feed”, declarar
   a rolagem id 1 anterior à id 2 e reutilizar a data da id 1 nas respostas posteriores.
   Preservar a expectativa `[2, 1]`: a ordem comprova a recuperação correta.
3. Conferir os demais casos desse arquivo que reutilizam a fixture, sobretudo exclusão
   durante GET e chegada de rolagem por socket. Ajustar somente suas datas quando
   necessário para expressar a cronologia que o próprio cenário exige.
4. Registrar o resultado em `HISTORY.md` e retirar P-095 de Ativos somente depois dos
   gates; mover esta spec para `done/` apenas no fecho da implementação.

## Critérios de Aceite

- A fixture não consulta o relógio real para preencher `createdDate`.
- Datas das rolagens 1/2 do cenário de reconexão são estáveis e estritamente crescentes.
- Expectativa `[2, 1]` permanece; nenhuma asserção de ordem é removida ou afrouxada.
- Os casos de reconexão, exclusão e socket do arquivo continuam passando.
- Rodar `npm run test --workspace=frontend -- --include=src/app/modules/campanha/paginas/detalhe/campanha-detalhe-dados.service.spec.ts`.
- No gate de integração, suíte completa de frontend e lint. Se implementada junto de
  P-096, consolidar o gate amplo dos workspaces conforme `task-flow`, sem repeti-lo.
- Diff restrito a testes e documentação; nenhuma mudança de UI ou código de produção.

## Fora de Escopo

- Alterar `mesclarFeedRolagens`, desempatar datas por id ou mudar a ordem do produto.
- Adicionar espera artificial para o relógio avançar, retries ou omitir `createdDate`.
- Refatoração de fixtures de outros arquivos; correção de P-096/P-097 ou regra de NPC.

## Dependências

- Nenhuma dependência de regra do jogo ou da m4-19.
- `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, skill `task-flow` e registro P-095.
- Referência de comportamento: `frontend/src/app/shared/rolagem-feed.util.ts`
  (`mesclarFeedRolagens`, ordenação por `createdDate` decrescente).

## Riscos e Mitigação

- Fixar a mesma data para tudo mantém o empate. Datas distintas são obrigatórias onde
  o cenário verifica cronologia; não inferir “id maior = rolagem mais recente”.
- Relaxar a expectativa esconderia uma regressão de reconexão. Manter `[2, 1]` e as
  provas existentes de preservação/exclusão de registros.

## Fecho — 2026-10-06

- Fixture com data fixa e sobrescritas preservadas; reconexão reutiliza a rolagem anterior
  e declara data posterior para a rolagem feita durante a queda. Expectativa `[2, 1]` intacta.
- Teste focado: 38/38. Gate amplo: shared 1089, backend 959 + 1 ignorado, frontend 3001;
  todos passando. Lint dos três workspaces sem erros, com avisos preexistentes.
- Compilação de testes Angular e revisão de diff/convenções aprovadas. Somente testes e
  documentação alterados; UI e ordenação do produto preservadas. Sem gate visual aplicável.
- P-095 retirado de Ativos; contexto e fila consolidada alinhados. Comandos, limitação
  inicial do isolamento e resultados completos registrados em `docs/context/HISTORY.md`.
- Sem pendências da P-095. P-096 e m4-19 continuam em suas frentes próprias.
