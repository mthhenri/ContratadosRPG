# UI-21 — Chrome da topbar: item ativo, contexto e painel de tema

> Filha da auditoria visual (seção Chrome de aplicação). Quatro ajustes na mesma barra de 52px.

## Objetivo

A topbar diz em que seção você está — de forma quase invisível — e nunca em qual campanha ou
ficha. Corrigir o sinal de ativo, dar lugar ao contexto e parar de manter um segundo modal.

## Entregáveis

1. Régua de 2px em accent no item ativo. Hoje `.topbar__item--ativo` muda o texto para `--text`
   e o fundo para `--surface-2` — a mesma cor de input, stat e stepper; sobre `--surface` a
   diferença é de 3% de luminância, e no mobile, quando só o ícone fica, é praticamente
   invisível. A régua resolve sem tocar no fundo.
2. Slot de contexto entre a marca e a nav: mono 11px, `--text-dim`, separador `//` em accent.
   Abaixo de 900px o wordmark e o nome do usuário somem, deixando só ícones; no desktop o espaço
   já está vazio.
3. Lugar fixo para o selo de tempo real offline, que existe mas hoje cada página posiciona por
   conta — na topbar ele nunca disputa espaço com o conteúdo.
4. Fechar o dropdown de perfil por `Escape`. Ele fecha só por ação, sem clique-fora e sem
   `Escape` (decisão registrada no SCSS); `Escape` é o que modal e painel de histórico já fazem e
   não conflita com a decisão de não fechar por clique-fora.
5. Migrar o painel de tema (`.config-modal`) para o `app-modal`: mesmo desenho, código separado,
   herdado do `.ajuda-modal`. A migração economiza um cabeçalho e ganha o `<dialog>` nativo.

## Critérios de Aceite

- Item ativo distinguível no mobile só-ícone, verificado nos onze presets de tema.
- Slot de contexto vazio não deixa buraco nem separador solto; preenchido, não empurra a nav
  abaixo de 900px.
- `Escape` fecha o dropdown e devolve o foco ao gatilho; clique-fora continua não fechando.
- `.config-modal` deixa de existir; painel de tema com foco preso e `Escape` do primitivo.
- Gate visual da topbar nos dois viewports, com e sem contexto, e do painel de tema.

## Fora de Escopo

Reorganizar os itens de navegação, busca global e mudanças no conteúdo do painel de tema.

## Dependências

`ui-07` (`app-modal`), `ui-12` (`--accent-text`), `shared/layout`, `shared/configuracoes-tema`.
