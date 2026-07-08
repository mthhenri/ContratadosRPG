# m2-13-frontend-gestao-membros-campanha.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-09) — task `m2-13`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

UI de **gestão de membros** na tela de detalhe da campanha — **remover um jogador** e
**transferir o papel de mestre** —, para o mestre. Consome os endpoints da `m2-10`.

## Entregáveis

1. Na **lista de membros** do detalhe (`/painel/:id`), para o mestre:
   - **remover** um jogador (com **confirmação**) → `removerMembro`; o membro some da lista;
   - **transferir mestre** — promover um jogador, com **confirmação clara** de que **ele
     mesmo passará a jogador** → `transferirMestre`.
2. Após **transferir**, a própria UI reflete a perda do papel na hora: recarrega os membros,
   `ehMestre` é recomputado e as ações de mestre (editar/excluir/gestão/convite) desaparecem.
   Após **remover**, o membro some da lista.
3. **`CampanhaService`** (frontend) ganha `removerMembro` e `transferirMestre` (DTOs do shared).
4. A UI respeita a permissão (só o mestre vê as ações); a autoridade é o backend (§14).
5. Estado em **Signals**, standalone, `.scss`/BEM com os tokens do tema.

## Critérios de Aceite

- Mestre remove um jogador (com confirmação) e ele some da lista.
- Mestre transfere o papel; **imediatamente** perde as ações de gestão na UI (passou a
  jogador), e o novo mestre passa a tê-las.
- Jogador comum não vê nenhuma ação de gestão de membros.
- Padrões do front respeitados (proibições #16/#17/#18/#29).

## Fora de Escopo

- Backend (`m2-10`).
- Edição/exclusão da campanha (`m2-12`) e refino visual geral (`m2-15`).

## Dependências

- `m2-10` (endpoints de remover membro / transferir mestre).
- `m2-07` (tela de detalhe e `CampanhaService`).
