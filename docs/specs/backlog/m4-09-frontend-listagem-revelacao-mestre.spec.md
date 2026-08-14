# m4-09-frontend-listagem-revelacao-mestre.spec.md

> Task 9/10 do milestone `m4-ficha-criatura-npc.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`. Reusar padrões visuais já
> aprovados de listagem/card (acervo de fichas `FichaAcervo`, grid do Esquadrão em
> `CampanhaDetalhe`) em vez de inventar um novo padrão de card.

## Objetivo

Tela do mestre para listar as criaturas e NPCs de uma campanha (tipos ocultos por padrão a
jogadores) e revelar/ocultar seletivamente a jogadores específicos — a superfície de UI que
consome a API de concessão de acesso já existente (`usuario_ficha_acesso`, `m3-04`), sem
endpoint novo. Cobre **os dois tipos juntos** (a listagem/revelação não diverge por tipo,
diferente dos assistentes de criação).

## Entregáveis

1. **Listagem** (dentro de `/painel/:campanhaId`, mestre) de todas as fichas `CRIATURA`/
   `NPC` da campanha — reusa `listarFichas` (já retorna todas as fichas ao mestre, §14) com
   um recorte de exibição por tipo (nome + NA/VD para criatura, nome + Categoria/Nível para
   NPC).
2. **Revelação seletiva**: por ficha, o mestre concede/revoga acesso de visualização a
   jogadores específicos da campanha (`concederAcesso`/`revogarAcesso` de `m3-04`,
   reusados sem duplicar lógica) com indicação visual de quem já pode ver.
3. **Atalhos de criação**: da mesma tela, links para os assistentes `m4-04` (criatura) e
   `m4-08` (NPC).
4. Standalone; Signals; `.scss` + Tailwind + BEM com tokens do tema.

## Critérios de Aceite

- Jogador não vê criatura/NPC sem concessão; passa a ver após revelação, sem F5 (reusa
  `ficha:visibilidade-alterada` se aplicável, ou o padrão de resync já usado pela ficha de
  jogador) — critério de aceite do milestone.
- Assistentes de criação alcançáveis a partir desta tela.
- Padrões de frontend respeitados; nenhuma lógica de permissão duplicada no frontend (a
  UI só chama a API já autoritativa).

## Fora de Escopo

- Refinamento mobile (`m4-10`).
- Os assistentes de criação em si (`m4-04`/`m4-08`, já concluídos antes desta task na
  ordem do milestone).
- Tela de visualização/edição completa da ficha de criatura/NPC (se necessária além do que
  os assistentes cobrem, registrar como pendência ao fechar esta task).

## Dependências

- `m4-03`/`m4-07` (endpoints de criação de criatura/NPC).
- `m4-04`/`m4-08` (assistentes a linkar).
- `m3-04` (API de concessão/revogação de acesso, reusada sem mudança).
