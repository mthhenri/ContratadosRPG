# M10-08 — Plano e referência visual

08/10/2026. M10-07 commitada em `348f76f2`, gate staged e coautoria conferidos.

Análogo aprovado: Biblioteca flutuante M9-11/M9-12, componentes em
`modules/documento/componentes/biblioteca-flutuante/`; mesmo cabeçalho, superfície,
densidade, comandos minimizar/maximizar/abrir página. Corpo preserva o leitor M10-07:
mono/sans, filetes, cartões, chips e estados. Sumário confinado usa `app-gaveta`
M10-05, mantendo texto visível por trás. Controles canônicos com API completa.

Arquitetura: extrair o leitor de `RegrasPage` para um corpo reutilizável; wrapper de
rota conserva fragmento/URL e painel só emite navegação interna. Memória por livro
em store root, sem duplicar HTTP (cache existente). Rolagem observada na janela ou
no corpo do painel conforme hospedeiro. Mobile usa gaveta na página e painel;
maximizado em desktop usa dois trilhos. Novo painel único no layout, aberto também
pela ficha flutuante via service, sem painel duplicado por ficha.

Recortes: principal extrai leitor/rolagem/gaveta/memória e testes; subagente assume
casca flutuante e pontos de entrada. Sem alteração de primitivos, parser, regras,
assets ou pesquisa. Inspeção pessoal pelo principal nos quatro viewports do projeto
mais 768×1024 da spec, claro/escuro, painel/gaveta/↗/teclado/links/troca de livro.

Estado: concluída, com gates e limites em `m10-08-verificacao.md` nesta pasta.
