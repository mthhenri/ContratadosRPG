# m2-08-refinamento-mobile-auth-campanhas.spec.md

> Task 8/8 do milestone `m2-auth-campanhas.spec.md`.
>
> **Revisada em 2026-07-07** para refletir a m2-09 (revisão geral de estilização) e os ajustes
> pós-m2-09, entregues **antes** desta task. As telas que a m2-08 refina não são mais as da
> m2-06/m2-07 originais: a topbar foi reconstruída ("Barra de Comando"), auth virou split-panel
> marca+formulário e as telas de campanha ganharam avatares, esqueletos de carregamento, chips
> com ícone, botão de copiar e dropdown de perfil. **Parte do trabalho mobile já foi entregue
> pela m2-09** (topbar e auth já têm um primeiro passe responsivo) — esta task passa a ser um
> **passe de auditoria e acabamento**, não um refino do zero.

## Objetivo

Refinamento de UI/UX **mobile** das telas do M2 (auth + campanha) **como estão hoje** (pós-m2-09),
seguindo o mesmo padrão responsivo por tokens estabelecido em
`m1-15-refinamento-mobile-calculadora.spec.md` e a identidade "Terminal de Contenção"
(`docs/design/`). Fechar as lacunas mobile ainda abertas — principalmente as telas de campanha,
que não têm nenhuma regra de breakpoint — e **auditar** as superfícies novas que a m2-09 já
tratou parcialmente. Sem tocar em regra de jogo nem em regra de negócio — só apresentação.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o override
> de tokens de densidade (`--pad-card`/`--gap-grid`) já introduzidos na m1-15. Nada de largura
> mágica por arquivo nem hex/fonte/raio solto (proibição #29).

## Estado atual (ponto de partida, pós-m2-09)

- **Topbar (`shared/layout`)** — reconstruída na m2-09 **já com** `@include bp.mobile`: padding/gap
  reduzidos, nav central colapsa os rótulos (`span` some, fica só ícone), o chip de campanha ativa
  esconde o texto (nome/código), e separador/identidade somem. **Auditar**, não reescrever: dropdown
  de perfil (menu 200px, ancorado à direita — conferir que não vaza da viewport em ~360px), alvos de
  toque do gatilho de perfil e dos itens de nav, e o seletor de campanha reduzido.
- **Auth (`modules/autenticacao` login/registro)** — split-panel marca+formulário da m2-09, **já com**
  um passe mobile mínimo (`flex-wrap` empilha os painéis; o painel de marca troca `border-right` por
  `border-bottom`). **Auditar/ajustar:** densidade do painel de marca (padding 34px, marca d'água de
  220px, slogan 22px) em ~360px, alvos de toque dos campos/botão de enviar, e se faz sentido ocultar
  ou enxugar o painel de marca no mobile (hoje ele empilha inteiro acima do formulário).
- **Campanha (`modules/campanha` lista/criar/entrar/detalhe)** — **nenhuma regra de breakpoint** hoje
  (só `prefers-reduced-motion` dos esqueletos). É o **maior foco** desta task, mas o gap é mais estreito
  do que parece: as listas de campanhas e de membros já são `flex-direction: column` de uma coluna,
  centralizadas com `max-width: 680px`, e as ações/linha de convite já usam `flex-wrap` — então **não há
  grid para refluir** e o risco de scroll horizontal em ~360px é baixo. Os gaps concretos são: **alvos de
  toque abaixo de 44px** (botão de copiar convite `__copiar` 34×34px; `__regenerar` e `__acao`/`__ligacao`
  com padding curto), densidade dos cards/itens no mobile (via override de token) e um passe de conferência
  em nomes/códigos longos (`__nome`, `__descricao`, `__codigo`) para garantir wrap/ellipsis em vez de
  empurrar o body.

## Entregáveis

1. **Telas de campanha** (listar, criar, entrar por código, detalhe/membros) recebem o passe mobile
   por token (~360px): sem scroll horizontal do body, densidade via override de `--pad-card`/`--gap-grid`,
   listas (campanhas/membros) e formulários confortáveis no polegar. As listas já são de uma coluna —
   aqui o trabalho é densidade, alvos de toque (ver item 3) e wrap/ellipsis de nomes/códigos longos, não
   reflow de grid.
2. **Auditoria + acabamento das telas de auth e da topbar** já tratadas na m2-09: confirmar ausência de
   scroll horizontal em ~360px, ajustar densidade onde ficou apertado (painel de marca empilhado inteiro
   acima do formulário no login/registro; padding 34px + marca d'água de 220px) e cobrir o que passou
   batido. Confirmar que o dropdown de perfil (menu 200px, `right:0`) e o seletor de campanha continuam
   alcançáveis e dentro da viewport — pela geometria devem caber em 360px, então é conferência, não
   correção presumida.
3. **Alvos de toque** ≥ 44px nos controles interativos de todas as telas do M2 (campos, botões primário/
   secundário, gatilho e itens do dropdown de perfil, chip/seletor de campanha, botão de copiar convite,
   botão de regenerar, links de navegação entre telas), reusando `$alvo-toque` da m1-15.
4. **Sem scroll horizontal** do body em ~360px em todas as telas do M2; conteúdo largo (se houver — ex.:
   código de convite, nome longo de campanha) rola no próprio container (`overflow-x: auto`) ou trunca
   com ellipsis, nunca empurra o body.
5. Identidade preservada (dark base + IBM Plex + tokens); idealmente só SCSS (como na m1-15), sem mudança
   de DOM/TS que altere comportamento, mantendo os testes verdes (91/91). Se um ajuste exigir marcação
   (ex.: envolver algo num container rolável), manter mínimo e sem tocar em lógica.

## Critérios de Aceite

- Todas as telas do M2 (auth + campanha + topbar) usáveis no mobile (~360px) **sem scroll horizontal**
  (critério de aceite do milestone), incluindo os elementos introduzidos pela m2-09 (split-panel, chip de
  campanha, dropdown de perfil, avatares, esqueletos).
- Alvos de toque confortáveis (≥ 44px); densidade coerente com o padrão da m1-15.
- Dropdown de perfil e seletor de campanha da topbar permanecem dentro da viewport e alcançáveis em
  tela pequena (conferido, não presumido).
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.
- Verificação responsiva registrada (360/390/430px), na linha da §6 de `docs/PARIDADE-M1.md`.

## Fora de Escopo

- Novas features ou telas além das entregues em m2-06/m2-07/m2-09.
- Qualquer mudança de regra de negócio, permissão ou de domínio.
- Rework visual das telas (a estilização é a da m2-09 — aqui só se ajusta o comportamento responsivo).

## Dependências

- `m2-06` (auth: login/registro, sessão, guard) e `m2-07` (campanhas: lista/criar/entrar/detalhe) — as
  telas base.
- `m2-09` (revisão geral de estilização) — **redefine** as telas a refinar (topbar "Barra de Comando",
  split-panel de auth, avatares/esqueletos/chips/copiar/dropdown de campanha) e já entrega o primeiro
  passe mobile de topbar e auth. **Ponto de partida obrigatório desta task.**
- Ajustes pós-m2-09 (rota raiz → `/painel`, avatares decorativos, hover/foco brandados) — já no código;
  não bloqueiam, mas fazem parte do estado atual das telas.
