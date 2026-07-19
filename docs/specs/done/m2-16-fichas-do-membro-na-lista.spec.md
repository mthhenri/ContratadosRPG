# m2-16-fichas-do-membro-na-lista.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-15) — task `m2-16`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Fazer da **lista de membros** do detalhe da campanha (`/painel/:id`) o **lar das fichas**:
cada membro passa a mostrar as **suas próprias fichas** ali mesmo, sem precisar sair para uma
lista plana separada. Hoje as fichas só são alcançadas por um botão campanha-wide **"Fichas"**
que navega para `FichaLista` (uma lista plana de todas as fichas, com um chip de "dono") — o
autor considera esse caminho ruim. Esta task troca o modelo: fichas vivem **junto do membro** e
a página de lista plana é **aposentada**.

> **Escopo (decisão do autor): mudança estrutural/de conteúdo, não só CSS.** O redesenho visual
> amplo das telas de campanha é a **m2-17** — aqui a estilização é mínima, só o necessário para a
> nova estrutura existir e ser usável.

## Entregáveis

1. Na lista de membros do detalhe, cada membro exibe **as fichas dele inline** — **híbrido por
   largura**: no **desktop** as fichas ficam **sempre abertas** logo abaixo do nome; no **mobile**
   viram um disclosure `N fichas ⌄` **expansível** (poupa rolagem). Cada ficha é um **mini-card
   clicável** (nome · classe · nível) que abre `/painel/:campanhaId/ficha/:fichaId`.
2. O front **junta** `campanhaService.listarMembros` + `fichaService.listarFichas(campanhaId)` no
   detalhe (mesmo join `usuarioId → nome` que a `FichaLista` já fazia para o chip de dono), agora
   agrupando por dono. **Permissões inalteradas:** o backend decide o fatiamento visível de fichas
   (§14 — dono/mestre/acesso concedido); o front **só apresenta** o que vier.
3. **Aposentar a página de lista plana de fichas** (`FichaLista` + rota
   `/painel/:campanhaId/ficha`): mover a **criação** (`FichaCriarDialog`, botão **"Nova ficha"**)
   para o detalhe da campanha e **corrigir o link stale** `.../ficha/nova` (rota inexistente hoje).
   A página da **ficha individual** (`/painel/:campanhaId/ficha/:id`, `FichaVisualizar`)
   **permanece** — é o destino dos mini-cards.
4. Trazer o **resync em tempo real** que vivia na `FichaLista` (`ficha:criada`, `membro:entrou`;
   ver m3-05/m3-08) para o detalhe, de modo que as fichas inline (e a entrada de novos membros)
   **atualizem ao vivo** sem recarregar.
5. Usar o recurso de **fade topo/base** (`appOverflowFade`, `src/app/shared/overflow-fade/`, o
   mesmo das listas da calculadora e do editor de habilidades) nas listas que rolam (membros e/ou
   fichas por membro), com a máscara em gradiente no SCSS do consumidor.
6. Estado em **Signals**, componentes standalone, `.scss`/BEM consumindo **só os tokens do tema**
   (proibições #16/#17/#18/#29).

## Critérios de Aceite

- No detalhe, **cada membro mostra as suas fichas** (desktop aberto / mobile expansível); clicar
  numa ficha abre a ficha daquele jogador.
- **Não existe mais** o botão campanha-wide "Fichas" nem a rota da lista plana; **criar ficha** se
  faz pelo detalhe (o link stale `.../ficha/nova` sumiu/foi corrigido).
- Fichas inline (e novos membros) **atualizam em tempo real**.
- A permissão é respeitada (o front só apresenta o que o backend liberou); jogador comum não vê
  ação de gestão de membros (herdado da m2-13).
- **Fade topo/base** presente nas listas roláveis (`appOverflowFade`).
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.

## Fora de Escopo

- **Redesenho visual amplo** das telas de campanha (é a **m2-17**) — aqui, só a estrutura nova.
- Qualquer **backend/schema novo** (a matriz de fichas visíveis já vem da m3-03/§14).
- **Gestão de acesso de visualização** (conceder/revogar) — segue na página da ficha (m3-04),
  não migra para o detalhe.

## Dependências

- `m2-07` (tela de detalhe + `CampanhaService`) e `m2-13` (ações de membro já na lista).
- `m3-03`/`m3-07` (fichas: `FichaService.listarFichas`, `FichaResumoDto`, `FichaCriarDialog`).
- `m3-05`/`m3-08` (gateway de tempo real e os eventos `ficha:criada`/`membro:entrou`).
- `appOverflowFade` (`src/app/shared/overflow-fade/overflow-fade.directive.ts`).
