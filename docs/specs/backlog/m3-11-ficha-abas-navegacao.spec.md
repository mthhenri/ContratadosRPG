# m3-11-ficha-abas-navegacao.spec.md

> Task 11 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> O protótipo `docs/design/examples/ficha-de-jogador.html` (barra de abas Identidade / Combate /
> Habilidades / Sanidade) é o alvo de fidelidade.

## Objetivo

Dar à ficha a **navegação por abas** do protótipo, para organizar a densidade (uma ficha completa
tem identidade, combate, inventário, habilidades, sanidade e presets de rolagem). Esta task entrega o
**scaffold navegável das abas** — todas visíveis desde já, cada uma com seu conteúdo (o da "Visão
Geral" já existe em `m3-10`; as demais podem começar com um **placeholder** enquanto seus editores
(`m3-12`…`m3-15`) não chegam). O autor quer **ver as abas existirem** na ficha, mesmo que o conteúdo
venha depois.

## Entregáveis

1. **Barra de abas** no `FichaVisualizacao` (a tela única de `m3-10`), mono/uppercase, aba ativa com
   accent + borda (padrão de estado ativo do tema). Conjunto: **Visão Geral · Combate · Inventário ·
   Habilidades · Sanidade · Rolagens**.
2. **Roteamento leve por aba** — a aba ativa é estado local (Signal) ou `queryParam` (`?aba=combate`)
   para deep-link/refresh; sem nova rota de página.
3. **Conteúdo por aba:**
   - **Visão Geral** — o que já existe (identidade, vitalidade, atributos, informações extras
     editáveis) de `m3-10`.
   - **Combate** — os `derivados` de combate (Defesa/Esquiva/Bloqueio, Dano C.a.C./Furtivo,
     Deslocamento, Proficiência, DT), reusando os editáveis de `m3-10`; organiza, não recalcula.
   - **Inventário / Habilidades / Sanidade / Rolagens** — **placeholder** ("em construção",
     contagem de itens quando houver) até `m3-12`…`m3-15`; já lendo as listas do `dados` para
     mostrar contagem/resumo read-only.
4. Standalone, Signals, `.scss`/BEM com tokens; acessível (roles `tablist`/`tab`/`tabpanel`, navegação
   por teclado); responsivo (abas rolam horizontalmente no mobile, sem quebrar o body).

## Critérios de Aceite

- As seis abas aparecem na ficha; trocar de aba troca o painel sem recarregar nem navegar de página.
- "Visão Geral" e "Combate" mostram os editáveis de `m3-10`; as demais mostram placeholder + resumo
  read-only das listas do `dados`.
- Deep-link/refresh preserva a aba ativa.
- Padrões do front e tokens do tema (proibições #16/#17/#18/#29).

## Fora de Escopo

- Os **editores** das sub-coleções (Sanidade `m3-12`, Habilidades `m3-13`, Inventário `m3-14`,
  Rolagens `m3-15`) — aqui só o scaffold + resumo read-only.
- Refino mobile dedicado (`m3-09`).

## Dependências

- `m3-10` (tela única editável + `derivados`). PrimeNG (Tabs) ou implementação própria por tokens.
