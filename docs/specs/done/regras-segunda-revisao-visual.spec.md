# regras-segunda-revisao-visual.spec.md

> Task solicitada pelo autor em 09/10/2026 após a correção do sumário de classes/subclasses.

## Objetivo

Revisar visualmente o Sistema e o Guia de Mestre inteiros, conferindo sumário e conteúdo;
melhorar navegação e pesquisa conforme os pedidos do autor. Levantar preparação dos textos
para futuro editor próprio sem antecipar sua implementação.

## Entregáveis

1. Auditoria dos dois livros: cobertura integral da leitura desktop e mobile, blocos ricos
   e abas, ordem/hierarquia do sumário, títulos e destinos, inconsistências com evidências.
   Corrigir defeitos de apresentação confirmados no leitor; questões de regra/editoriais
   da fonte ficam explicitamente registradas, sem inventar conteúdo.
   Defeitos confirmados: nove categorias e sete subtítulos de modificações nas tabelas
   precisam virar títulos/destinos; três notas de custo/peso precisam aparecer; os dois
   roteiros do Guia devem apresentar cada etapa uma vez, preservando introdução/conclusão.
   Tabelas de dados no mobile conservam colunas legíveis com rolagem horizontal local,
   em vez de comprimir cada frase em colunas muito estreitas (análogo: RegrasTabela existente).
2. Voltar ao topo acessível na página e no painel, com rolagem no hospedeiro correto,
   movimento reduzido respeitado e foco/URL/memória coerentes. Análogo: botão canônico de
   Patchnotes (`app-botao-icone`, ícone `chevron` girado).
3. Resultados de pesquisa com separadores e respiro, mantendo `app-botao` e a hierarquia
   de caminho/trecho existentes. Destaques na cor do tema do usuário e ocorrência atual
   diferenciada, legíveis em claro/escuro; sem amarelo nativo de `mark`.
4. Campo de pesquisa com botão “×” ao final usando `app-botao-icone`, limpeza imediata,
   foco no input, e debounce de 300 ms para a digitação, cancelado ao limpar/destruir.
   Enter processa o termo pendente; Esc limpa mesmo antes de chegar ao debounce.
5. Relatório de auditoria/verificação e levantamento para o editor em
   `regras-segunda-revisao-visual/`. Capturas/logs em `.artifacts/regras-segunda-revisao-visual/`.

## Critérios de Aceite

- Inspeção pessoal da aplicação real dos dois livros em 1920×1080 e 360×800, cobertura
  integral do conteúdo escuro; 960×1080, 1366×768 e base clara nos blocos representativos.
  Percorrer os nove arquétipos e demais estados condicionais; registrar cobertura e limites.
- Confirmar cobertura do sumário contra a fonte e todos os destinos renderizados.
- Pesquisa: múltiplos resultados e nenhum resultado, troca de livro, painel e mobile,
  teclado, limpeza durante espera, termo pendente, troca de tema sem refazer pesquisa.
- Voltar ao topo funciona no fim da página/painel sem mover a tela de fundo.
- Testes proporcionais (incluindo debounce), lint e build passam; formatação dos templates/
  estilos, `npm run repo:verificar` e revisão do diff aprovados.

## Fora de Escopo

Implementar o editor próprio, mudar arquitetura dos livros ou regras de jogo,
reescrever o Markdown autoral, ampliar primitivos sem decisão do autor, publicar/commitar,
revisar PDF ou investigar a falha nativa do cache P-111. Mudanças já existentes preservadas.

## Dependências

M10 e revisão anterior; docs/SYSTEM.SPEC.md, CONVENTIONS.md, docs/design/DESIGN.md,
handoff docs/design/tema e livros canônicos em docs/core. Análogo do sumário/resultados:
próprio RegrasLeitor aprovado, com separadores já usados no catálogo do produto.
