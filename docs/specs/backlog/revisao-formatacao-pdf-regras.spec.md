# revisao-formatacao-pdf-regras.spec.md

> Pedido do autor em 08/10/2026 após avaliar a M10-10. Origem: P-108.

## Objetivo

Revisar substancialmente a formatação dos PDFs de Regras. A geração funciona,
mas a apresentação entregue foi considerada estranha pelo autor; os gates
técnicos da M10-10 não significam aprovação editorial do PDF.

## Entregáveis

1. Avaliar Sistema e Guia página a página com o autor, identificar problemas de
   hierarquia, densidade, espaçamento e paginação e propor um corte representativo.
2. Ajustar a impressão nativa conforme a direção visual aprovada, preservando
   conteúdo, cores, tarjas e limites nativos. Não adotar Paged.js unilateralmente.
3. Reativar a exportação do Sistema somente após a revisão visual aprovada.

## Critérios de Aceite

PDFs dos dois livros gerados no Chrome/Edge e inspecionados pessoalmente página
a página, comparados ao corte aprovado. Autor aprova a apresentação e a retomada
da exportação do Sistema. Build, testes e gates de UI/documentação proporcionais.

## Fora de Escopo

Alterar regras ou conteúdo dos livros, refazer o parser, substituir a impressão
nativa, restaurar PDFs antigos. Esta spec registra trabalho futuro, não executado.

## Dependências

M10-10, `docs/design/DESIGN.md` e decisão visual do autor. Sistema permanece com
exportação desativada na página/painel/gaveta; Guia permanece disponível.
