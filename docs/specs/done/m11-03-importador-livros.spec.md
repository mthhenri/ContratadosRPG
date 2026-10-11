# m11-03-importador-livros.spec.md

> Task 3/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Importação
> única dos `.md` vigentes para o banco; a ponte entre o fluxo antigo e a Oficina.

## Objetivo

Transformar a saída do normalizador atual (Sistema 4.1.4 e Guia 4.2.0) em linhas de `regra_peca`
com `identificador` estável, e publicar a primeira fotografia `PUBLICADA` de cada livro.

## Entregáveis

1. **Conversor puro** árvore normalizada → árvore de peças (`m11-01`), reutilizando o
   normalizador existente (`frontend/scripts/normalizar-regras.mjs` e módulos `regras-*.mjs`) como
   etapa de leitura. Decisão de onde mora (script de `tools/` do backend que importa o
   normalizador, ou parte do normalizador) fica na spec de implementação, sem duplicar o parser.
2. **Identificadores determinísticos na importação.** UUID gerado uma vez e gravado; a
   importação é **não repetível por engano**: se o livro já tem peças, aborta (flag explícita para
   refazer em ambiente de desenvolvimento).
3. **Links internos** do texto rico convertidos de âncora para `identificador`; âncora de cada peça
   preservada como está hoje, para que as URLs publicadas continuem valendo.
4. **Comando** `npm run regras:importar --workspace=backend` que popula `livro` (`sistema`, `guia`),
   `regra_peca` e cria a primeira `livro_versao` `PUBLICADA` de cada livro (`numero` extraído do
   nome do arquivo: `4.1.4`, `4.2.0`; `formato` do contrato atual).
5. **Diagnóstico revisado com o autor**: relatório (`m11-03-importador-livros/diagnostico.md`)
   com as 11 grades e os avisos restantes do normalizador, cada um com a decisão (vira peça tipada,
   fica como peça genérica editável, ou é ajustado no `.md`). Nenhuma decisão tomada sozinha.
6. **Prova de ida e volta**: teste que renderiza a fotografia importada pelo leitor atual e compara
   com o JSON gerado hoje pelo normalizador (`sistema.json`/`guia.json`), campo a campo, com lista
   explícita de diferenças aceitas pelo autor.

## Critérios de Aceite

- Importar em banco limpo cria árvore sem peça órfã, `identificador` único, `ancora` única por
  livro; reexecutar sem flag aborta sem alterar nada.
- Teste de ida e volta (item 6) passa para os dois livros; toda diferença remanescente está
  listada e aprovada no diagnóstico.
- Nenhum link interno aponta para identificador inexistente (`validarArvoreLivro` da `m11-01`
  devolve zero problemas nas duas árvores).
- `npm run test --workspace=backend`, `npm run test --workspace=shared` e
  `npm run test:regras --workspace=frontend` verdes.

## Fora de Escopo

API de leitura e papéis (`m11-04`); editar peças; importar versões anteriores à 4.1.4 (decisão
sobre alguma entrar como fotografia só de leitura é tomada aqui, no diagnóstico, e fica registrada,
sem implementar nada além da primeira `PUBLICADA` de cada livro); `.docx`.

## Dependências

`m11-01` e `m11-02` em `done/`. Documentos `docs/core/sistema-v4.1.4.md` e
`docs/core/guia_de_mestre-v4.2.0.md` (fonte; o documento vence a importação).

## Riscos e Mitigação

- **Perda silenciosa de conteúdo na conversão.** A prova de ida e volta é o gate; sem ela, a task
  fica aberta.
- **Identificadores gerados na importação e perdidos.** O banco é a única fonte deles; fazer
  backup/exportar a fotografia antes de qualquer reimportação em ambiente real.

## Resultado (10/10/2026)

- **Onde mora o conversor:** `backend/src/modules/livro/importador/`. Lê o normalizador existente por
  `import()` nativo (`ler-fontes-regras.ts`), sem duplicar o parser; `converterRegrasEmPecas` é puro.
  `projetarPecasEmRegras` faz o caminho inverso (peças → formato do leitor) e sustenta a prova de ida e
  volta; a `m11-04` o reutiliza como ponte para o leitor atual.
- **Comando:** `npm run regras:importar --workspace=backend -- --usuario=<id> [--simular] [--refazer]`.
  Valida os dois livros antes de abrir a transação e grava ambos numa só. `--refazer` exige o guard do
  `db:reset:dev` e também descarta as fotografias anteriores.
- **Diagnóstico:** [`diagnostico.md`](m11-03-importador-livros/diagnostico.md), com as quatro decisões do
  autor. Contrato ajustado: `LivroAberturaDadosDto.selo?`.
- **Ida e volta:** `importador.spec.ts`, com a lista de diferenças aceitas no próprio teste e no
  diagnóstico; a revisão independente confirmou que a redução não esconde perda além delas.
- **Limite:** o comando não foi executado no banco de desenvolvimento do autor (exige `--usuario`);
  a importação real foi exercitada só em transação revertida (`TESTAR_POSTGRES_LIVRO=1`).
