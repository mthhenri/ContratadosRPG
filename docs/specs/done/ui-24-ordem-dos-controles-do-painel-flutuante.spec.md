# UI-24 — Ordem dos controles do painel flutuante

> Ajuste pontual pedido pelo autor no chrome compartilhado de `app-painel-flutuante`.

## Objetivo

Padronizar a leitura dos controles do cabeçalho das ferramentas flutuantes: minimizar,
maximizar/restaurar quando existir, e fechar.

## Entregáveis

1. Projetar `[painelAcoesExtras]` depois do controle fixo de minimizar e antes de fechar, sem
   alterar os comportamentos ou os rótulos acessíveis já delegados pelos consumidores.
2. Cobrir em teste a ordem de leitura dos botões quando um consumidor projeta a ação de maximizar.

## Critérios de Aceite

- Um painel com maximização exibe os controles na ordem `Minimizar`, `Maximizar/Restaurar`,
  `Fechar`, tanto visualmente quanto na ordem de foco do DOM.
- Os testes focados do `PainelFlutuante` passam e a janela real é observada em 1920×1080 e 360×800.

## Fora de Escopo

Redesenhar ícones, alterar os comportamentos de minimizar/maximizar/fechar, ou mudar tamanho e
espaçamento dos controles.

## Dependências

`docs/design/DESIGN.md` (UI-17) e `shared/ui/painel-flutuante`.
