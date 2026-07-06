# m2-07-frontend-campanhas.spec.md

> Task 7/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Frontend de campanhas: criar campanha, entrar por código, listar as campanhas do usuário e ver
os membros (com o código de convite e a regeneração para o mestre). Fecha o fluxo ponta a ponta
do milestone na UI. Consome os endpoints das m2-04/m2-05.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Entregáveis

1. **Telas standalone lazy** (área privada, atrás do guard da m2-06): listar campanhas do
   usuário, criar campanha, entrar por código e detalhe da campanha com a lista de membros
   (nome + papel).
2. **Detalhe da campanha**: exibe o `codigo_convite` e o botão **regenerar** (só para o
   mestre); membros com o papel (`MESTRE`/`JOGADOR`). A UI respeita a permissão, mas a
   autoridade é sempre o backend (§14) — o front não duplica regra.
3. **Service HTTP** em `core/`/módulo, consumindo os endpoints de campanha via
   `auth-token`; DTOs **do shared**; estado das telas em **Signals**; **Reactive Forms** nos
   formulários.
4. Estilos `.scss` + Tailwind + BEM com os tokens do tema.

## Critérios de Aceite

- Fluxo completo do milestone validável na UI: **registrar → logar → criar campanha → outro
  usuário entra por código → mestre vê a lista de membros**.
- Só o mestre vê/regenera o código de convite e gerencia a campanha; a tentativa de um jogador
  é barrada pelo backend e tratada na UI.
- Padrões do front respeitados: standalone, Signals, Reactive Forms, `.scss`/BEM, tokens do
  tema (proibições #16/#17/#18/#29).

## Fora de Escopo

- Fichas de jogador/criatura/NPC — M3/M4.
- Tempo real (WebSocket) — M3+.
- Refinamento de UI/UX mobile dedicado (m2-08).

## Dependências

- `m2-05` (endpoints de convite/entrada/membros) e `m2-04` (CRUD).
- `m2-06` (sessão, guard, interceptor `auth-token`).
