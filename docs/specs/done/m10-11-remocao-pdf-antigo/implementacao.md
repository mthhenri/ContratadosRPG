# M10-11 — Remoção do legado

Autor autorizou o momento da remoção em 08/10/2026, mesmo com PDF do Sistema
temporariamente suspenso (P-108). M10-10 commitada em `af475bec`.

Análogo visual: leitor M10-10, topbar/painel M10-08. Só retirar download antigo;
conservar shell, densidade, pesquisa, controles canônicos e responsividade.
Gate `design-fidelity`/`verify` nos quatro viewports, claro/escuro, página/painel.

Remover leitor antigo, dependência/worker, scripts de cópia, assets/configuração
e PDFs fonte. Guardar histórico no Git. Testes dos utilitários deixam de importar
o componente removido; demais utilitários continuam cobertos. Publicação passa
a verificar JSON gerado, sem restaurar arquivo antigo.

Ponteiros operacionais apontam para Markdown vigente (Sistema v4.1.4/Guia v4.2.0)
e `public/regras/*.json`; não alterar conteúdo/regras. Alinhar referências do
pipeline/testes aos arquivos correntes, parte necessária do build limpo após a
remoção. Specs históricas preservadas; atualização posterior da M9 fica em anexo
e `IDEAS`, sem reescrever decisões antigas.

Espelhar AGENTS/CLAUDE e ambas as skills `regras-do-jogo`, verificar igualdade.
Registrar revisão editorial pendente separadamente; encerrar esta tarefa não
equivale a aprovar a formatação do PDF.
