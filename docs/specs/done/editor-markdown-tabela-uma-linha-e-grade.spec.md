# editor-markdown-tabela-uma-linha-e-grade.spec.md

> Task solta (2026-09-23), pedida pelo autor depois do commit `c92b7746`: a tabela sumia ao remover
> uma linha de uma tabela de duas, e os botões da faixa de tabela estavam desalinhados. O
> alinhamento foi escolhido sobre POC visual (proposta A, "grade", entre duas; depois vista em
> caderno largo, caderno estreito, campo curto e celular).

## Objetivo

Deixar a tabela existir com uma linha só e alinhar a faixa de ações de tabela em colunas.

## Entregáveis

1. **Tabela com uma linha.** `tabelaAdmiteSoCabecalho` (`tableSchema.extendSchema`, conteúdo
   `table_header_row table_row*`) entra depois do `gfm`. Remover linha numa tabela de duas deixa
   uma; remover o cabeçalho sobe a linha de baixo; só a última linha apaga a tabela. Markdown com
   tabela só de cabeçalho abre com uma linha (antes o Milkdown inventava uma linha vazia).
   "+ Linha acima" no cabeçalho pega os tipos do schema, não da 2ª linha.
2. **Grade na faixa de tabela (fora do celular).** 4 colunas × 2 linhas: linha em cima, coluna
   embaixo, espelhadas; "Texto abaixo" e "Apagar tabela" (grupos `lateral`) na 1ª coluna; todos
   os botões com 26px, a altura dos botões de ícone. Sem largura, a grade rola de lado com o
   degradê. No celular nada muda.
3. **Campo curto:** a barra é trazida para a vista quando aparece ou cresce, com folga
   (`scroll-margin-bottom`) para não ficar sob o degradê de listas que rolam (achado na POC).

## Critérios de Aceite

- Testes com o Milkdown real para 1; testes de componente para os grupos laterais e a rolagem só
  no campo curto; suíte do frontend e lint sem erros.
- `verify`: tabela 3 → 2 → 1 linha sem sumir; grade com colunas alinhadas (mesmo x nas duas
  linhas) e 26px; janela estreita rolando; campo curto com a barra visível sem rolagem manual.

## Fora de Escopo

Mudanças no celular; alinhamento de coluna (esquerda/centro/direita) do conteúdo da tabela.

## Dependências

`editor-markdown-espaco-para-escrever.spec.md` (done).
