# Correção — coluna de vitalidade da ficha

> Task avulsa a partir do relato visual do autor: na coluna de Identidade, o controle `+` de Energia ultrapassa a borda do cartão quando a ficha é renderizada em uma largura intermediária.

## Objetivo

Fazer a dupla Vida/Energia refluir conforme a largura real da coluna que a hospeda, mantendo todos os controles dentro do cartão.

## Entregáveis

1. Ajustar a grade `.ficha-vitalidade` de `FichaVisualizacao` para conservar duas barras apenas quando ambas couberem integralmente; caso contrário, empilhar Vida e Energia.
2. Preservar o primitivo `app-barra-recurso`, os steppers, a edição direta e os estilos semânticos existentes.

## Critérios de Aceite

- Em uma coluna estreita, nenhum trecho da barra, valor ou botão de Energia ultrapassa horizontalmente o cartão.
- Em `1920x1080` e `360x800`, a ficha mantém leitura, hierarquia e alvos de toque sem overflow horizontal.
- Build, lint e teste focado do frontend passam.

## Fora de Escopo

Redesenhar a barra de recurso, alterar regras de Vida/Energia, ou ajustar outras colunas da ficha.

## Dependências

`docs/design/DESIGN.md`, `docs/design/examples/ficha-de-jogador.html`, `ui-16-barra-de-recurso-e-cartao-de-combatente`.
