# revisao-formatacao-pdf-regras.spec.md

> Pedido do autor em 08/10/2026 após avaliar a M10-10. Origem: P-108.
> Revisada em 25/11/2026: o autor escolheu **gerar o PDF por código** (método do Ars Arcana) no lugar
> da impressão nativa. [Desenho aprovado](revisao-formatacao-pdf-regras/design.md).

## Objetivo

Substituir o PDF das Regras por um **livro de sistema**: conciso, organizado, de aparência
profissional e com controle total da paginação. A geração atual funciona, mas a apresentação foi
rejeitada pelo autor; os gates técnicos da M10-10 não significam aprovação editorial.

## Entregáveis

1. **Corte de aprovação:** base do gerador próprio e uma amostra com capa, sumário numerado,
   Introdução, uma classe com os arquétipos e uma categoria de equipamento com modificações. O autor
   aprova o visual antes de seguir.
2. Demais blocos do Sistema.
3. Guia de Mestre.
Ajustes pedidos pelo autor após ver os livros completos (25/11/2026), antes do entregável 4:

- texto corrido justificado, como no leitor;
- parágrafo não se parte entre páginas, e o texto que anuncia algo ("…como:") vai junto com o anunciado;
- habilidades de classe e arquétipos reorganizados para não sobrar continuação solta;
- ícones de classes, arquétipos e recursos como os do site;
- o PDF segue o tema de quem exporta: base clara ou escura e a cor de destaque em uso.

4. Botão "Exportar PDF" gerando e baixando o arquivo, Sistema reativado, impressão antiga removida e
   `P-108` encerrado.

Página, densidade, quebras, arquitetura, dependências e crédito de licença: como no
[desenho](revisao-formatacao-pdf-regras/design.md).

## Critérios de Aceite

- Os dois livros gerados e **todas** as páginas inspecionadas; o autor aprova a apresentação e a
  retomada da exportação do Sistema.
- Os seis problemas corrigidos: capa, sumário, arquétipos, títulos repetidos ou órfãos, tabelas e
  quadros cortados, texto miúdo e claro demais.
- Nenhum texto do livro some: teste de cobertura e despacho exaustivo por tipo de bloco.
- Botão conferido em `1920×1080` e `360×800`; geração conferida no Chrome, Edge e Firefox.
- Build, testes, lint e gates de UI/documentação proporcionais.

## Fora de Escopo

Alterar regras ou conteúdo dos livros, refazer o parser, mudar o leitor do site, geração no servidor,
restaurar PDFs antigos.

## Dependências

M10-10, `docs/design/DESIGN.md`. Até o entregável 4 o Sistema permanece com a exportação desativada na
página/painel/gaveta; o Guia segue com a impressão atual.

## Resultado

Concluída em 26/11/2026. [Verificação e limites](revisao-formatacao-pdf-regras/verificacao.md).
