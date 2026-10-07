# m10-10-exportar-pdf.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-07`. Fonte visual: exemplão, aba
> *Protótipo*, modo PDF. **Impressão nativa** do navegador (decisão do autor, 2026-10-06); Paged.js
> é expansão futura (`IDEAS`).

## Objetivo

Exportar o Sistema e o Guia para PDF a partir da nossa visualização, substituindo o PDF do Docs.

## Entregáveis

1. Botão de ícone **Exportar PDF** no cabeçalho do trilho, ao lado de "Sistema · v4.1.3"
   (`app-botao-icone` com `appTooltip`). Abre a impressão do documento inteiro (não só da seção).
2. **CSS de impressão** (`@media print` + `@page`): papel claro independente do tema; capa com
   tarjas e só a versão (sem data); sumário; cabeçalho corrido e número de página no rodapé via
   margens de `@page`; cada ⬢ em página nova; blocos sem quebra no meio (`break-inside: avoid`);
   abas de arquétipo impressas em sequência; topbar, trilho, gaveta e controles ocultos.
3. **Limites conhecidos** (impressão nativa): sumário sem número de página; link interno impresso
   como nome da seção, sem "p. N".

## Verificação

Gerar o PDF dos dois documentos no Chrome/Edge e conferir página a página: capa, sumário, quebra
de capítulo, blocos inteiros, abas em sequência, tabelas, níveis de ameaça coloridos, tarjas.
Registrar os PDFs gerados no fecho (não versionar).

## Fora de escopo

Remover o PDF antigo (`m10-11`); Paged.js.
