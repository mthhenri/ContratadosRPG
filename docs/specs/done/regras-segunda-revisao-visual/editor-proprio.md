# Preparação dos livros para o editor próprio

09/10/2026. Levantamento da segunda revisão visual, sem implementar o editor nem
reescrever as regras autorais. O contrato da [M10](../../done/m10-regras.spec.md)
define que o editor futuro grava a árvore tipada; se o backend passar a consumi-la,
normalizador e tipos devem mudar juntos para `shared/`.

## O que esta revisão já organiza

- Categorias de equipamentos e modificações deixam de ser títulos invisíveis dentro de
  tabelas: são seções explícitas, com nível, título e destino. `origemTabela` identifica
  a origem do título sem duplicá-lo no oráculo de preservação do texto.
- Notas de custo/peso ganham campo apresentável, sem exigir que um editor as esconda em
  uma célula vazia. O conteúdo original continua preservado em `cabecalho`/`linhas`.
- Roteiros distinguem as etapas de sua introdução/conclusão. Os `filhos` originais ficam
  para auditoria; a leitura não renderiza duas cópias da mesma etapa.
- Classes/subclasses têm destinos próprios desde a correção anterior, sem depender de
  títulos externos ao dossiê.

## Preparação a especificar antes de permitir edição

| Recorte | Evidência atual | Preparação recomendada |
|---|---|---|
| Identidade dos nós | Âncoras são slugs do título com sufixo para colisão | ID persistente separado do título/slug; preservar links antigos ao renomear |
| Versão do formato | `versao` identifica a edição do livro | Versão de schema e migração separadas da versão editorial |
| Proveniência | Avisos registram linha, mas nem todo campo tem sua localização | Origem por nó/campo para corrigir a fonte e diagnosticar importação |
| Conteúdo editável | Blocos ricos e células/filhos originais convivem | Uma representação editável; cópia original somente como auditoria da importação, sem permitir divergência silenciosa |
| Estrutura editorial | Cabeçalhos de tabela carregam títulos e notas; 11 tabelas viram `grade` | Títulos, notas, listas e tabelas como nós próprios; classificar cada grade antes de convertê-la, mantendo fallback seguro |
| Validação da apresentação | Preservação integral do JSON não detectou notas/títulos invisíveis e roteiros duplicados | Validar também o conteúdo apresentado, seus destinos e ausência de duplicação |
| Publicação | Assets são gerados de Markdown no build | Especificar rascunho, publicação, permissão e versões antigas somente para leitura antes da escrita pelo site |
| Regra e apresentação | Leitor não calcula fórmulas | Manter regras puras em `shared/regras`; edição de texto não altera o motor automaticamente |

## Recortes concretos para limpeza editorial

Sistema: nove cabeçalhos de categoria, sete subtítulos de modificações e três notas
excepcionais aparecem nas linhas 974–1182 do Markdown vigente. São os primeiros
candidatos a conteúdo estrutural explícito no editor. As 11 grades restantes precisam
de classificação por significado; esta revisão não inventa tipos nem conteúdo para elas.

Guia: os roteiros de Ameaças/NPCs têm 13/15 etapas. Preservar a ordem e os textos
suplementares; o parágrafo de NPC que junta Defesa/DT e a última linha de Conduta de
Combate têm formatação irregular da exportação. Uma importação futura deve apresentar
diagnóstico para revisão, em vez de corrigir a regra automaticamente.

O asterisco literal da abertura do Sistema continua em P-110 e deve ser corrigido na
fonte autoral. A nota de versão já está em 4.1.4 por alteração preexistente do autor.
O arquivo de origem não foi reescrito nesta tarefa. A próxima tarefa do editor deve
transformar este levantamento em contrato de escrita/migração com decisão do autor.
