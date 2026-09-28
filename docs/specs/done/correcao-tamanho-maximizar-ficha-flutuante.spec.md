# correcao-tamanho-maximizar-ficha-flutuante.spec.md

> Correção pontual solicitada pelo autor para o cabeçalho da ficha flutuante.

## Objetivo

Fazer o botão de maximizar da ficha flutuante ter a mesma geometria dos botões vizinhos de
minimizar e fechar, sem alterar o comportamento ou os demais painéis flutuantes.

## Entregáveis

1. Remover a sobrescrita local que aumenta somente o botão de maximizar da ficha flutuante.
2. Cobrir por teste a igualdade de tamanho entre as três ações do cabeçalho.

## Critérios de Aceite

- O teste focado reproduz a diferença antes da correção e passa depois dela.
- Na aplicação real, os três controles têm a mesma caixa em `1920×1080`, `1366×768`,
  `960×1080` e, no estado mobile aplicável, `360×800`, sem overflow.
- Build, lint e suíte frontend passam, ou qualquer falha preexistente é registrada separadamente.

## Fora de Escopo

Redesenhar o cabeçalho, trocar ícones, alterar maximização/redimensionamento ou modificar outros
consumidores de `app-painel-flutuante`.

## Dependências

- `docs/design/DESIGN.md`.
- `app-painel-flutuante` e `app-botao-icone` como análogos aprovados.
