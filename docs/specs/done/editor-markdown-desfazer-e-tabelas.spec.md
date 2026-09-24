# editor-markdown-desfazer-e-tabelas.spec.md

> Task solta, parte 1 de 2 da revisão do editor Markdown pedida pelo autor em 2026-09-23
> (reclamação de usuários nos cadernos: Ctrl+Z/Ctrl+Y inconsistentes, remover linha/coluna
> "não funcional completamente", tabelas confusas, mobile ruim). Esta parte só corrige
> comportamento quebrado; o redesenho da barra (parte 2) depende de decisão visual do autor.

## Objetivo

Fazer desfazer/refazer e remover linha/coluna de tabela funcionarem de forma previsível em
todos os usos de `app-editor-markdown` (caderno privado, caderno do esquadrão, campos de
ficha/criatura), sem mudar o visual da barra.

## Entregáveis

1. **Histórico fora do modo colaborativo.** Sem `documentoColaborativo`, o editor usa o plugin
   de histórico do Milkdown (`@milkdown/kit/plugin/history`): `Ctrl+Z` desfaz, `Ctrl+Y` e
   `Ctrl+Shift+Z` refazem. No modo colaborativo continua valendo só o `yUndoPlugin` do
   `@milkdown/plugin-collab` (que já liga os mesmos atalhos); os dois nunca coexistem, senão o
   histórico local desfaria alterações remotas.
2. **Troca de conteúdo externa zera o histórico.** `definirMarkdown` (troca de página do
   caderno, `writeValue` de formulário) recria o estado (`replaceAll(markdown, true)`), para que
   `Ctrl+Z` logo após a troca não traga de volta o texto da página anterior.
3. **Remover linha sem quebrar a tabela.**
   - Linha comum: remove a linha do cursor.
   - Linha de cabeçalho: a primeira linha do corpo sobe e vira o novo cabeçalho (GFM exige
     cabeçalho); o cursor fica na mesma coluna do novo cabeçalho.
   - Tabela com só cabeçalho + 1 linha: remover qualquer uma das duas apaga a tabela inteira
     (o schema GFM do Milkdown não representa tabela de uma linha só) — mesmo comportamento que
     já existe ao remover a única coluna.
4. **Remover coluna:** remove a coluna do cursor, inclusive estando no cabeçalho; a única
   coluna apaga a tabela.
5. **Estado "em tabela" acompanha o cursor de verdade.** Os botões de linha/coluna habilitam
   a partir do estado do ProseMirror (plugin de view), não de `click`/`keyup` no host — cobre
   seleção por toque, navegação por teclado e alteração remota.
6. Testes com o **Milkdown real** (sem substituir a fábrica) para os itens 1–4, além dos
   testes de componente existentes ajustados.

## Critérios de Aceite

- `npm run test --workspace=frontend -- --include=src/app/shared/ui/editor-markdown` verde,
  com casos de: desfazer/refazer por atalho; histórico zerado após `definirMarkdown`; remover
  linha comum, de cabeçalho, em tabela 2 linhas; remover coluna comum e única.
- Suíte completa do frontend e `npm run lint --workspace=frontend` sem falhas novas.
- Markdown serializado depois de cada remoção é uma tabela GFM válida (ou nenhuma tabela).

## Fora de Escopo

- Qualquer mudança visual na barra (botões de desfazer/refazer, barra contextual de tabela,
  estado ativo, alvos de toque de 44px, primitivos de `shared/ui/`) — parte 2, aguardando
  decisão do autor.
- Novas ações de tabela (inserir acima/à esquerda, apagar tabela, sair da tabela).
- Layout mobile do caderno.

## Dependências

Nenhuma.

## Riscos e Mitigação

- `replaceAll(..., true)` recria o `EditorState`: precisa manter `editable` (somente leitura)
  e não disparar `valorChange` — coberto pelos testes existentes de sincronização.
