# ui-41-cenas-icone-por-tipo.spec.md

> Spec avulsa. Pedido do autor em 2026-10-14: para os jogadores, o botão "Cenas" da coluna lateral
> da campanha troca de ícone de acordo com a cena atual — o que exige definir um ícone por tipo de cena.

## Objetivo

1. Cada tipo de cena (`CenaTipoEnum`: Investigação, Combate, Furtiva, Perseguição, Resistência) ganha
   um ícone próprio, num mapa de domínio único.
2. Na campanha do **jogador**, o item "Cenas" mostra o ícone do tipo da cena **ativa**; sem cena ativa,
   mostra o ícone genérico de Cenas.

## Situação atual (levantada em 2026-10-14)

- `detalhe-jogador.page.html`: item `app-coluna-acoes-item icone="combate"` fixo ("Cenas"), e o mesmo
  `combate` no menu do cabeçalho mobile (`detalhe__cabecalho-menu-item`). O mestre
  (`detalhe-mestre.page.html`) usa o mesmo item fixo.
- Para o jogador, `CenaService.listarPorCampanha` só devolve a cena `ATIVA` (ver `hub-cenas.page.ts`);
  o tempo real já emite `emitirCenaAlterada` (`backend/src/core/gateway/campanha.gateway.ts`).
- Ícones existentes que servem de candidatos: `combate`, `busca`. Furtiva, Perseguição e Resistência
  não têm glifo. Rótulos dos tipos em `modules/cena/rotulos-cena.ts`.

## Entregáveis

1. **Prancha de ícones para votação do autor** (anexo em `docs/specs/<estado>/ui-41-cenas-icone-por-tipo/`,
   no formato das pranchas de `icones-recursos-sistema`): ao menos duas opções por tipo, traço de
   contorno da família atual (Tabler/MIT ou desenho próprio), mais a decisão do **ícone genérico** de
   "Cenas" (manter `combate` ou um novo). Nada é implementado antes do voto.
2. Glifos aprovados em `app-icone` (`IconeNome` + `@case`), com crédito/licença no comentário, e um mapa
   `ICONE_TIPO_CENA: Record<CenaTipoEnum, IconeNome>` em `shared/icone/icones-dominio.ts` (mesmo molde de
   `ICONE_TIPO_DANO`). Aplicar `gerenciamento-de-impacto` (`npm run impacto -- --icone combate`) se o
   genérico mudar.
3. Campanha do jogador: o item "Cenas" (coluna e menu mobile) usa o ícone do tipo da cena ativa e o
   tooltip passa a dizer o tipo (ex.: "Cenas — Investigação em andamento"); sem cena ativa, genérico e
   "Cenas". Atualiza em tempo real quando o mestre abre/encerra uma cena (skill `tempo-real`: quem emite,
   quem escuta, reconexão).
4. Prévia do mestre (`somenteLeitura`): segue o que o jogador-alvo veria (projeção já usada pela prévia).
5. Onde mais o tipo de cena aparece em texto (hub de cenas, cabeçalho do painel, seletor de "Nova cena")
   — **levar ao autor** se o ícone acompanha; não aplicar sem resposta.

## Critérios de Aceite

- Mapa coberto por teste (todo `CenaTipoEnum` tem ícone; `icones-dominio.spec.ts`).
- Teste da página do jogador: ícone muda com a cena ativa e volta ao genérico sem cena.
- Ao vivo com dois usuários (`verify`): mestre abre uma Investigação → o botão do jogador troca sem
  recarregar; mestre encerra → volta ao genérico; reconexão converge.
- Gate visual em `1920×1080` e `360×800` (coluna e menu mobile), análogo: o próprio item da coluna de
  ações. Lint, testes e build; `npm run repo:verificar`.

## Fora de Escopo

Mudar o botão do mestre (salvo decisão no entregável 5), redesenhar o hub de cenas, novo tipo de cena.

## Decisões do autor — 2026-10-17

- Investigação: B — Pista no dossiê; Combate: A — Lâminas cruzadas;
  Perseguição: B — Trajetória; Resistência: B — Pilar; Cenas genérico: B — Claquete.
- Furtiva: desenho próprio de **homem encapuzado**, pedido expressamente pelo autor
  em resposta à escolha pendente; substitui as duas propostas iniciais da prancha.
- Aplicar também no hub, nos cabeçalhos e no seletor de nova cena, incluindo as
  respectivas visões de mestre. No seletor nativo, o primitivo `Campo` apresenta
  o ícone do tipo selecionado, sem criar um dropdown próprio.
- Preservar o glifo legado `combate` nos usos que não representam navegação/tipo
  de cena. Usar nomes próprios e um mapa único para os novos desenhos.
