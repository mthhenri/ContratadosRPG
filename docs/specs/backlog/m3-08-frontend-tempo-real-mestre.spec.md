# m3-08-frontend-tempo-real-mestre.spec.md

> Task 8/9 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

> **Impacto do `m3-10`:** a tela de ficha virou **editável no próprio lugar** (não mais read-only).
> O `ficha:alterada` recebido por WebSocket precisa **reconciliar com edição local em andamento** —
> não sobrescrever campos que o usuário está editando (ex.: preservar o formulário aberto, aplicar o
> patch remoto só ao sair da edição, ou sinalizar conflito). Registrar essa regra ao integrar o
> live-update com a tela única de `m3-07`/`m3-10`.

## Objetivo

**Cliente Socket.IO** e a **tela do mestre** com as fichas da campanha atualizando em tempo
real; ressincronização ao reconectar (o Render free tier dorme e derruba conexões — §9).
Consome o gateway da `m3-05`.

## Entregáveis

1. **Cliente Socket.IO** (`core/`) — conecta com o JWT da sessão (m2-06), entra nas salas
   `ficha:<id>` / `campanha:<id>`, escuta `ficha:alterada`, `ficha:criada` e `membro:entrou`;
   estado em **Signals**. Nunca emite mutação (só REST muta — proibição #25).
2. **Ressincronização ao reconectar** — refetch da ficha aberta / da lista ao restabelecer a
   conexão (resiliência §9).
3. **Tela do mestre** — painel com as fichas da campanha atualizando ao vivo: o mestre com
   uma ficha aberta vê a alteração do jogador **sem recarregar** (critério de aceite do
   milestone).
4. Integração com a lista/visualização da `m3-07` — o evento recebido atualiza o estado
   local (Signals), sem refetch desnecessário fora da reconexão.

## Critérios de Aceite

- Mestre com a ficha aberta vê as alterações do jogador em tempo real, sem recarregar.
- A reconexão ressincroniza a ficha aberta / a lista.
- Nenhuma escrita via WebSocket — toda mutação continua por REST.

## Fora de Escopo

- Refinamento mobile dedicado (`m3-09`).
- Qualquer regra de negócio/permissão nova (o gateway/service é o árbitro — `m3-05`).

## Dependências

- `m3-05` (gateway, salas e eventos).
- `m3-06` / `m3-07` (`FichaService`, telas e componente de exibição a atualizar ao vivo).
