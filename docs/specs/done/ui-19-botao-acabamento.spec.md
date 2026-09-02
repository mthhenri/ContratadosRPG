# UI-19 — Botão: carregando acessível, opacidade única e degraus de tamanho

> Filha da auditoria visual (seção Botão). Fecha os três buracos do primitivo mais usado.

## Objetivo

O `app-botao` cobre 8 severidades × 4 estilos e 20 consumidores. Faltam a guarda de teclado no
estado carregando, uma única verdade para a opacidade de desabilitado e o degrau de tamanho.

## Entregáveis

1. `carregando` passa a emitir `aria-disabled` e a guardar o clique. Hoje só bloqueia o ponteiro
   (`pointer-events: none`) — pelo teclado o botão ainda ativa. A guarda fecha o buraco sem
   tomar o `disabled` do consumidor.
2. Escolher uma opacidade de desabilitado e apagar a outra: 0,55 no primitivo × 0,6 declarado por
   `--botao-opacidade-desabilitado` nas telas de autenticação e no "Carregar mais" do histórico.
3. Adicionar `[tamanho]` com os degraus que os consumidores já praticam, usando a escala da
   `ui-18`. Não define dimensão hoje — foi deliberado na migração, mas já não há motivo para novos
   usos nascerem sem degrau. Migrar os consumidores cujo padding coincide com um degrau; deixar os
   divergentes anotados.
4. Documentar no `DESIGN.md` os degraus e a regra de `carregando` × `disabled`.

## Critérios de Aceite

- Botão em `carregando`: `Enter` e `Espaço` não disparam a ação, e leitor de tela anuncia o
  estado.
- `--botao-opacidade-desabilitado` não existe mais em nenhum consumidor; um único valor no
  primitivo.
- Alvo de 44px no mobile em todos os degraus. Gate visual da matriz severidade × estilo × tamanho.

## Fora de Escopo

Reduzir o número de severidades, mexer no ícone/spinner e alterar o mapa de cor de `perigo`
(é da `ui-12`).

## Dependências

`ui-12`, `ui-18`, `shared/ui/botao`.
