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

1. **Listagem** (dentro de `/campanhas/:campanhaId`, mestre) de todas as fichas `CRIATURA`/
   `NPC` da campanha — reusa `listarFichas` (já retorna todas as fichas ao mestre, §14) com
   um recorte de exibição por tipo (nome + NA/VD para criatura, nome + Categoria/Nível para
   NPC).
2. **Revelação seletiva**: por ficha, o mestre concede/revoga acesso de visualização a
   jogadores específicos da campanha (`concederAcesso`/`revogarAcesso` de `m3-04`,
   reusados sem duplicar lógica) com indicação visual de quem já pode ver.
3. **Atalhos de criação**: da mesma tela, links para os assistentes `m4-04` (criatura) e
   `m4-08` (NPC).
4. Standalone; Signals; `.scss` + Tailwind + BEM com tokens do tema.
5. **Integrar a estrutura existente**, sem criar outro acervo: `CartaoFichaAcervo` já tem
   recorte por tipo na `m4-11`. Habilitar filtro/botão de NPC só quando criação e consulta
   estiverem funcionais (`m4-08`/`m4-08b`); mostrar Categoria/Nível, sem NA/VD ou Patente.
   Clique abre a ficha dedicada do tipo. Recorte visual em `docs/design/FICHA-NPC.md`.
6. **Acesso legível**: ação de concessão usa diálogo e controles canônicos já existentes;
   indicação de jogadores com acesso, vazio, carregamento, erro e envio ocupado. A
   concessão seletiva não é substituída por um botão de visibilidade global. Permissão do
   espectador permanece a do §14, sem aparecer como destinatário de ficha completa.

## Critérios de Aceite

- Jogador não vê criatura/NPC sem concessão; passa a ver após revelação, sem F5 (reusa
  `ficha:visibilidade-alterada` se aplicável, ou o padrão de resync já usado pela ficha de
  jogador) — critério de aceite do milestone.
- Assistentes de criação alcançáveis a partir desta tela.
- Padrões de frontend respeitados; nenhuma lógica de permissão duplicada no frontend (a
  UI só chama a API já autoritativa).
- Verificar pela skill `verify` em `1920×1080`, `1366×768`, `960×1080` e `360×800`: blocos
  vazios/cheios, nomes longos, filtro por tipo, acesso concedido/revogado e abertura das
  fichas. Comparar com acervo/painel atuais e conferir os inputs completos dos primitivos.

## Fora de Escopo

- Polimento mobile complementar (`m4-10`); a usabilidade básica e o gate de 360×800 já
  pertencem a esta task.
- Os assistentes de criação em si (`m4-04`/`m4-08`, já concluídos antes desta task na
  ordem do milestone).
- Implementação da ficha completa: criatura já entregue, NPC na dependência `m4-08b`.

## Dependências

- `m4-03`/`m4-07` (endpoints de criação de criatura/NPC).
- `m4-04`/`m4-08` (assistentes a linkar).
- `m3-04` (API de concessão/revogação de acesso, reusada sem mudança).
- `m4-08b` (consulta/edição de NPC) e `m4-11` (estrutura de acervo já entregue).

## Execução concluída — 2026-09-30

Listagem/revelação integrada, atalhos e filtro entregues. Análogos aprovados:
`CartaoFichaAcervo`, Esquadrão do mestre e diálogo de acesso da ficha NPC.
Estado de acesso separado do painel extenso; API e permissões existentes preservadas.
Evento existente de visibilidade emitido após concessão/revogação persistida.
Gates de código, quatro viewports e dois usuários sem F5 concluídos;
registro completo em `docs/reviews/m4-09-verificacao.md`. Próxima task: M4-10.
