# M10-10 — Impressão nativa

M10-09 commitada em `251455ad`, gate staged/coautoria conferidos.
Análogo: leitor M10-09 e capa/modo PDF do exemplão M10. Botão de ícone compacto
com tooltip ao lado do título/versão, alvo mobile canônico.

Projeção Angular criada sob demanda no body e destruída ao finalizar/cancelar
impressão. Reutiliza renderer canônico, IDs próprios e sumário puro. Não clona
marcas, controles ou abas selecionadas. Sem dependência/Paged.js/backend.
CSS restrito à exportação: papel claro por tokens, A4/margens, cabeçalho de livro/
versão e contador, capítulos em nova página, caixas individuais sem quebra.
Containers longos fragmentam; tabelas repetem cabeçalhos/preservam linhas;
arquétipos aparecem em sequência com seu nome. Abertura da fonte vira capa;
nota histórica de versão é substituída pela versão do asset, sem alterar o JSON.
Definições técnicas de imagens embutidas do Markdown são omitidas apenas da
projeção impressa; prosa e regras continuam presentes. Arquétipos começam em
páginas próprias e verbetes curtos evitam fragmentação.

Verificar Chrome/Edge, ambos livros, página a página, PDFs/capturas ignorados em
.artifacts/m10-10-exportar-pdf. UI nos quatro viewports, claro/escuro, página/
painel/mobile, cancelar/repetir e isolamento da consulta. Limites: sumário sem
páginas e referências sem p. N. Fontes técnicas consultadas:
[Chrome](https://developer.chrome.com/blog/print-margins?hl=en) e
[Angular](https://angular.dev/api/core/createComponent).
