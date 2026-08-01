# m2-19-painel-campanha-detalhe-mestre-esquadrao.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-18) — task `m2-19`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Redesenhar a visão de **mestre** do detalhe `/painel/:id` (`CampanhaDetalhe`) — hoje um card
"Identidade" (nome/descrição/convite/ações) ao lado de um card "Membros" com fichas aninhadas
por dono — para: banner de alerta quando há ficha crítica, tira de estatísticas (Membros /
Fichas / Convite / Alertas), tira horizontal de rolagens recentes, e duas colunas — **Membros**
(lista simples de gestão, sem fichas dentro) e **Esquadrão** (grid de mini-cards de ficha de
toda a campanha). Escolhido entre três direções comparadas em protótipo (A · Reforço Enxuto,
**B · Esquadrão em Destaque** — a aprovada, com o ajuste de grid abaixo —, C · Abas do Painel).
Esta task cobre só a visão do **mestre**; a visão do **jogador** é a `m2-20`.

**Só apresentação** — todo dado consumido aqui (`membros`, `fichas`, `rolagensFeed`) já é
buscado por `CampanhaDetalhe` hoje; nenhum endpoint novo, nenhuma regra de negócio nova.

## Entregáveis

1. **Banner de alerta** no topo, condicional: aparece só quando existe ficha com
   `vidaAtual <= 0` na campanha (mestre vê todas, `fichas()` já traz esse dado), com o nome da
   ficha e um link "Ver ficha →"; some quando não há nenhuma.
2. **Tira de estatísticas** (Membros / Fichas / Convite / Alertas) substituindo os blocos hoje
   espalhados (contagem no cabeçalho de "Membros", código de convite dentro do card
   "Identidade"): `membros().length`, `fichas().length`, `campanha.codigoConvite` com o botão de
   copiar já existente (`copiarConvite()`), e a contagem de fichas em `vidaAtual <= 0`.
3. **Tira horizontal de rolagens recentes** (`rolagem-pill`, scroll horizontal): as 3-4 mais
   recentes de `rolagensFeed()` (já buscado, m3-27), cada pill com fórmula/rótulo + autor +
   tempo relativo. Botão "Ver tudo" abre o `<app-historico-rolagens-sidebar>` já existente no
   cabeçalho — **não duplica** a lista completa, só resume o topo do feed.
4. **Coluna "Membros"** simplificada: nome + `chip-papel` + ações de gestão já existentes
   (transferir mestre / remover, via `podeGerenciarMembro`) — as fichas saem desta coluna.
5. **Coluna "Esquadrão"**: grid de `ficha-mini` com todas as fichas da campanha (mesmo dado de
   `fichasPorMembro()`/`fichas()`, sem mudança de escopo) — cada card com nome do dono, nome da
   ficha, condições, meta (classe/nível), Vida/Energia com os steppers de hoje
   (`ajustarVitalidade`/`podeAjustarFicha`, inalterados), reações (Defesa/Esquiva/Bloqueio) e o
   kebab de ações já existente (duplicar/remover da campanha/excluir, m3-52).
   **Grid fixo de 2 colunas** (`grid-template-columns: repeat(2, minmax(0, 1fr))`) — o protótipo
   testava `repeat(auto-fill, minmax(220px, 1fr))`, que rendia 3–4 colunas no desktop; a decisão
   do autor foi fixar em 2. Colapsa para 1 coluna abaixo do breakpoint mobile (`$bp-mobile`).
6. **Ações de campanha** (editar nome/descrição, excluir) precisam de um novo lugar: este
   layout não tem mais o card "Identidade" que as hospedava. Movê-las para um menu kebab no
   cabeçalho da página (ao lado do nome da campanha) — mesmo padrão de dropdown/confirmação
   inline já usado no kebab de ficha (m3-52), preservando o formulário de edição inline e a
   confirmação de exclusão inline já implementados (`editando`/`confirmandoExclusao`, sem
   reescrever a lógica, só o gatilho visual).
7. **`max-width: 80vw`** no container principal (`detalhe.page.scss:6`, hoje `1160px` fixo) —
   mesmo padrão de `visualizar.page.scss:27`.
8. Mobile: as duas colunas empilham (Membros acima, Esquadrão abaixo) abaixo do breakpoint de
   tablet; o grid do Esquadrão vira 1 coluna no breakpoint mobile.

## Critérios de Aceite

- Banner crítico aparece só quando há ficha com Vida ≤ 0 na campanha; some quando não há.
- Esquadrão renderiza em exatamente 2 colunas no desktop; 1 coluna no mobile.
- Toda ação hoje existente continua funcionando, só reposicionada: ajustar Vida/Energia,
  duplicar/remover-da-campanha/excluir ficha, criar ficha, transferir mestre, remover membro,
  editar/excluir campanha, regenerar e copiar convite.
- Tira de rolagens mostra as mais recentes do feed já existente; "Ver tudo" abre a sidebar de
  histórico sem duplicar dado.
- `max-width: 80vw`; fade topo/base nas listas que rolam; mobile ~360px sem scroll horizontal,
  alvos de toque ≥ 44px.
- Nenhum dado novo no backend — diferente da `m2-18`, aqui `membros`/`fichas`/`rolagensFeed`
  já vêm completos do que `CampanhaDetalhe` já busca hoje.
- `lint`/`test`/`build` do frontend verdes; verificação ao vivo cobrindo cada entregável.

## Fora de Escopo

- Qualquer mudança de regra de negócio ou permissão — só reposicionamento/reestilização visual.
- Expandir a tira de rolagens em algo além de um teaser do feed (a lista completa continua só
  na sidebar de histórico).
- A visão de **jogador** deste mesmo detalhe — é a `m2-20`, spec separado.

## Dependências

- `m2-18` (redesenho da lista — mesma rodada visual, mesmo `max-width`).
- `m2-17` (redesenho anterior deste detalhe, substituído por este).
- `m2-16`/`m3-52` (fichas por membro, mini-card e kebab de ações — reaproveitados sem mudança).
- `m3-27` (histórico de rolagem / feed / `HistoricoRolagensSidebar` — reaproveitado sem mudança).
