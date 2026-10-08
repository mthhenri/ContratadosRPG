# M10-01 — Verificação do normalizador de núcleo

Data: 2026-10-07. Spec: `docs/specs/done/m10-01-normalizador-nucleo.spec.md`.

## Recorte entregue

`frontend/src/app/modules/regras/regras.model.ts` é o contrato da árvore; o script
`frontend/scripts/normalizar-regras.mjs` importa esses tipos por JSDoc, conferido por
TypeScript `checkJs` nos testes. O script seleciona a maior versão semântica disponível
em `docs/core/`, mantendo a versão do nome do arquivo, e gera `public/regras/sistema.json`
e `guia.json` em `prestart` e `prebuild`. Esses assets são derivados e ignorados pelo git.
O teste do núcleo integra o `test` do frontend, antes da suíte Angular.

Hierarquia, links, tarjas, habilidades, listas, notas, exemplos e tabelas de dados
foram conferidos nos livros vigentes. Na revisão, as Fortificações de Determinado
mostraram que uma habilidade pode começar na segunda linha de um parágrafo do Docs;
o separador de blocos foi corrigido e ganhou fixture literal e teste próprio.
Tabelas de layout e referências de imagens permanecem genéricas, incluindo o Markdown
original, sem interpretar as estruturas reservadas à m10-02. Nenhum valor do jogo é
calculado ou corrigido; a nota antiga de versão dentro do Sistema é preservada.

## Evidências

| Gate | Resultado |
|---|---|
| `npm run test:regras --workspace=frontend` | 20/20; 14 fixtures literais, cobertura dos dois livros, pontuação, unicidade de âncoras, links resolvidos ou avisados, publicação determinística e contrato TypeScript |
| `npm run prestart --workspace=frontend` | Publicação dos JSONs e preparação dos assets existentes executadas |
| `npm run build --workspace=frontend` | Build final de produção aprovado no workspace principal e no recorte isolado; PDFs/worker existentes preservados |
| `npm run test --workspace=shared` | 69 arquivos, 1.157 testes aprovados |
| `npm run test --workspace=backend` | 53 arquivos, 994 aprovados, 1 ignorado |
| `npm run test --workspace=frontend`, recorte isolado | 215 arquivos, 3.037 testes Angular aprovados, além dos 20 do núcleo |
| `npm run lint` | Três workspaces: zero erros; 27.102 avisos existentes na árvore no momento da execução |
| ESLint do novo `regras.model.ts` | Zero erros e zero avisos |
| Revisão do recorte | Spec × implementação, contrato, fixtures, pipeline e buscas de convenções; sem DTO/enum local, fórmula, SQL, UI ou alteração dos livros |

A cobertura usa um oráculo independente de leitura Markdown da entrada: compara toda
a sequência de texto, números, tarjas e pontuação com a árvore percorrida em ordem,
normalizando espaços, marcadores de formatação, glifos que viram dados e o separador
do custo. Exclui somente o sumário do Docs e substitui o texto dos links pelo título
de destino, como exige a spec. As células são lidas do Markdown bruto no oráculo,
evitando que um eventual descarte pelo tokenizer passe despercebido.

São 191 seções no Sistema e 103 no Guia, com âncoras únicas dentro de cada documento.
Os quatro links internos do corpo do Sistema foram resolvidos; o Guia não tem links
internos fora do sumário. Casos sem destino são exercitados por teste e viram texto
com aviso na linha correta.

Os arquivos em `public/regras/` foram comparados byte a byte com os assets dos builds
principal e isolado:

| Asset | Bytes | SHA-256 |
|---|---:|---|
| `sistema.json` | 1.955.657 | `5d16194c52243183196f16c15abc5fe695ed96507784f42fb8a7b9d59a9bd097` |
| `guia.json` | 479.963 | `1f7f37da88dc8451722a673b0d6316cf201afde68535d19ae6f64b8080e228ea` |

## Avisos do normalizador — 71 esperados

Todos foram conferidos; não há link sem destino nos documentos vigentes.

| Documento | Categoria | Quantidade | Linhas de origem |
|---|---|---:|---|
| Sistema | Tabelas de layout genéricas | 42 | 262, 276, 313, 457, 477, 484, 489, 496, 501, 508, 526, 531, 536, 764, 857, 974, 984, 1004, 1015, 1029, 1039, 1053, 1069, 1086, 1099, 1113, 1124, 1132, 1144, 1155, 1182, 1223, 1365, 1566, 1832, 1839, 1854, 1895, 1917, 1936, 1948, 1965 |
| Guia | Tabelas de layout genéricas | 5 | 356, 740, 798, 815, 1091 |
| Sistema | Colisões de âncoras, com sufixo estável | 7 | 854, 865, 868, 871, 1578, 1619, 1670 |
| Guia | Colisões de âncoras, com sufixo estável | 9 | 810, 872, 917, 956, 970, 1017, 1023, 1039, 1047 |
| Sistema | Definições Markdown de imagens preservadas como genérico | 8 | 2036, 2038, 2040, 2042, 2044, 2046, 2048, 2050 |

As 47 tabelas incluem atributos, maestrias, classes/arquétipos, origens, equipamentos,
módulos e ficha de referência; não são novas regras implementadas. Sua interpretação
rica é trabalho da m10-02. As oito definições são os dados embutidos das imagens
referenciadas pelo livro, preservados integralmente; a representação tipada desses
casos continua fora deste núcleo. As 16 colisões são títulos repetidos legítimos,
continuarão exigindo desambiguação mesmo depois dos casos ricos.

## Limites e alterações concorrentes

A primeira execução dentro do sandbox falhou por acesso às fontes públicas no build
e por `EPERM` nos arquivos temporários dos testes. Reexecuções autorizadas fora dessa
restrição permitiram os gates. Uma tentativa do compilador Angular encerrou com código
`3221225477`; o build final passou normalmente.

A árvore compartilhada recebeu alterações da m4-21 durante a task. Sua suíte Angular
teve 3.036 aprovados e uma falha em `npc-visualizacao.component.spec.ts:69`, cuja asserção
vetava `app-stat` no cartão de atributo, afetado pela alteração concorrente. Nenhum
arquivo dessa frente foi corrigido ou revertido pela m10-01. Para separar as evidências,
a regressão do frontend foi executada numa cópia de `HEAD`
`0aa39005b8142fe4901df1208bd80f2ad4b0aeb0` com somente o código da m10-01 e o corpus
versionado necessário aos testes: 3.037/3.037 aprovados. A cópia temporária foi removida
após registrar os resultados.

O aviso de budget inicial (557,18 kB contra aviso em 450 kB) já existe no produto;
nenhum budget foi alterado. O ambiente de testes também avisa sobre Canvas no jsdom,
sem falha na regressão isolada. Não houve mudança visual nesta task, portanto o gate
de inspeção visual não se aplica. Casos ricos, leitor e UI continuam nas próximas specs.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
