# M10-09 — Pesquisa do leitor

M10-08 commitada em `95cdfad6`, gate staged e coautoria conferidos.

Análogos: campo de busca da Biblioteca M9-05 (`app-campo`, ícone busca,
`campo__controle` e Reactive Forms), resultados com caminho/trecho como a Biblioteca
e `trecho-destacado.ts` (texto seguro e `mark`). Shell, densidade, cartões,
segmentado, gaveta e responsividade preservam o leitor M10-08.

Pesquisa permanece frontend e separada do componente extenso do leitor: função
pura de normalização/intervalos/trechos; adaptador de projeção dos textos do
formato canônico renderizado; controlador de pesquisa por leitor; componente
do campo/resultados. Reutilizar a projeção canônica evita indexar tabelas-fonte
auxiliares ou metadados não apresentados, sem duplicar 23 receitas de blocos.
Livro alternativo é carregado pelo cache existente somente ao iniciar pesquisa,
projetado oculto/inert para contagem com a mesma normalização. Tarjas são barreiras,
nunca texto pesquisável. Abas ocultas permanecem pesquisáveis; navegar revela a
aba correspondente antes de medir. Nenhum HTML de consulta é interpolado.

Busca de pelo menos dois caracteres, como o exemplão; campo informa esse mínimo.
Mesmo termo conservado entre livros e entre painel/página na sessão de consulta.
Resultados substituem sumário; contador/setas ficam no texto, inclusive com gaveta
fechada. Esc limpa antes do fechamento padrão da gaveta; Enter/Shift+Enter navegam.
Verificar ambos livros, tarjas, acentos, termos através de negrito, abas e sem
resultado; UI real nos quatro viewports do projeto e nas duas bases.
