# espectador-coluna-acoes-e-iniciativa.spec.md

> Task solta, aprovada pelo autor via mockup interativo (artifact "Central do Espectador") nesta
> conversa. Corrige `P-073` (`docs/context/PROBLEMS.md`) e revisa uma decisão de UI do módulo
> `m8-espectadores-campanha.spec.md` (`m8-03`/`m8-07`), sem reabrir aquele arquivo.

## Objetivo

Padronizar o Painel do espectador no molde visual já usado por mestre/jogador (coluna de ações,
cabeçalho "shell", toggle de descrição da campanha) e dar ao espectador uma tela de Iniciativa
própria e somente-leitura, eliminando o modal atual e a dependência da rota de Iniciativa que hoje
reusa — e trava para — a visão do mestre.

## Entregáveis

1. `espectador.page` ganha `app-coluna-acoes` (mesmo primitivo de `detalhe-mestre`/
   `detalhe-jogador`), categoria "Espectador", dois itens:
   - **"Iniciativa"** (`app-coluna-acoes-item`, `routerLink` para a rota nova do entregável 6) —
     **sempre visível**, não condicionado a `encontroAtivo()`, no mesmo padrão de mestre/jogador
     (`detalhe-mestre.page.html`: o item de Iniciativa nunca é escondido; quem mostra "sem
     combate" é a própria tela de destino).
   - **"Rolagens"** — toggle local (`pressionado` reflete se a coluna "Rolagens públicas" está
     visível), sem navegação.
2. Cabeçalho de `espectador.page.html` reescrito no molde "shell" (índice `//` + título + chip +
   régua, igual a `detalhe-mestre__cabecalho`/`_casca-iniciativa.scss`): remove o botão "Ver
   Iniciativa" (migrado para o item 1) e acrescenta o ícone "i" que alterna `descricaoAberta`
   (mesmo padrão de `detalhe-jogador.page.html`: `[attr.aria-pressed]`, `appTooltip` dinâmico
   "Mostrar/Ocultar a missão", `<p>` de descrição condicional abaixo do cabeçalho).
3. Grade de fichas ganha uma variante de largura cheia (`repeat(auto-fill, minmax(280px,1fr))`),
   ativa só quando a coluna "Rolagens públicas" está oculta pelo item 1.
4. Remove o modal "Ver Iniciativa" de `espectador.page` (`app-modal` + `app-iniciativa-leitura`,
   sinal `iniciativaAberta`) — vira navegação real pela rota do entregável 6.
5. Página nova e **separada** — arquivo próprio, nunca misturado com `PainelEncontroMestre`/
   `PainelEncontroJogador` (mesma separação de arquivo que já existe entre os dois) — em
   `frontend/src/app/modules/encontro/paginas/painel-espectador/`, usando o mesmo parcial
   `_casca-iniciativa.scss` (bloco BEM próprio, ex. `iniciativa-espectador`):
   - Cabeçalho (índice `//`, título "Iniciativa", nome da campanha, chips de Rodada/Turno como em
     `iniciativa-leitura`), trilha de turnos (`app-trilha-turnos`, **sem** `[comAcao]` projetado),
     `HistoricoRolagensSidebar` (rolagens públicas da campanha) e palco (`grade--palco` de
     `app-cartao-combatente`, **sem** `[ehMestre]`/`[podeAjustar]` — cai no default somente-leitura,
     mesma composição que `app-iniciativa-leitura` já usa hoje no modal).
   - **Sem** `app-coluna-acoes` (espectador não tem gestão de combate nem Calculadora/Caderno) e
     **sem** `app-conducao-turno` nem qualquer controle de condução/ajuste.
   - Estado vazio (mesmo texto/ícone de `&__vazio`, `ui-38`) quando não há encontro ativo.
6. Rota nova `campanhas/:id/espectador/iniciativa` em `app.routes.ts`, reaproveitando
   `espectadorCampanhaResolver` (mesma resolução/guarda do painel — sem guard novo).
7. Testes: `espectador.page.spec.ts` atualizado (coluna de ações, toggle de Rolagens/descrição,
   ausência do modal); spec novo cobrindo a página do entregável 5 — estado vazio, grade de
   combatentes, ausência de qualquer controle de condução/ajuste no DOM.

## Critérios de Aceite

- `npm run test --workspace=frontend` completo sem novas falhas; build/lint dos arquivos tocados
  sem erros novos.
- Verificação ao vivo (`verify`) em `1920×1080` e `360×800`:
  - Painel do espectador: coluna de ações, reflow da grade de fichas ao ocultar Rolagens, toggle
    da descrição da campanha.
  - Tela de Iniciativa nova: estado vazio (sem combate) e com um combate ativo (trilha, rolagens,
    palco) — comparada lado a lado com `PainelEncontroMestre`/`PainelEncontroJogador` como análogo
    aprovado (mesma densidade, hierarquia e comportamento responsivo).
- Acessar `/campanhas/:id/iniciativa` (rota de mestre/jogador) como `ESPECTADOR` continua recusado
  exatamente como hoje — nenhuma mudança de permissão do lado de mestre/jogador.
- Acessar `/campanhas/:id/espectador/iniciativa` funciona sem nenhum toast de erro e sem depender
  de `listarMembros`/`GET /ficha?campanhaId`/`GET /campanha/:id` (os três endpoints que hoje
  causam o `P-073`).
- `P-073` sai da lista de Ativos de `docs/context/PROBLEMS.md` — a causa raiz deixa de existir
  porque a tela do espectador nunca mais reusa a do mestre.

## Fora de Escopo

- Qualquer mudança na visão de Iniciativa de mestre ou jogador (`PainelEncontroMestre`/
  `PainelEncontroJogador`, `_casca-iniciativa.scss`) além de consumir o parcial existente sem
  alteração.
- Qualquer mudança de permissão ou de backend — a task usa só os endpoints/DTOs já existentes
  (`GET /campanha/:id/painel-espectador`, `GET /campanha/:id/painel-espectador/encontro-ativo`,
  `GET /campanha/:id/rolagem`); nenhuma migration, nenhum service novo.
- A barra "Modo prévia" do mestre (`ehMestrePreview`) continua igual — só herda o novo cabeçalho/
  coluna por composição, sem mudança de comportamento.
- Regra de revelação de NPC/criatura (`revelado()`) — herdada sem alteração de `app-cartao-combatente`.

## Dependências

- `m8-espectadores-campanha.spec.md` (`docs/specs/backlog/`) e `P-073`
  (`docs/context/PROBLEMS.md`) — contexto e causa raiz.
- `_casca-iniciativa.scss` (`frontend/src/app/modules/encontro/paginas/`) — parcial compartilhado,
  consumido sem alteração.
- `app-coluna-acoes`, `app-trilha-turnos`, `HistoricoRolagensSidebar`, `app-cartao-combatente` —
  primitivos existentes, sem alteração de API.
- Mockup aprovado nesta conversa (artifact "Central do Espectador") — referência visual do
  análogo/gate de fidelidade exigido pelo `CLAUDE.md`.

## Riscos e Mitigação

- Reaproveitar `espectadorCampanhaResolver` na rota nova traz o payload inteiro do painel
  (fichas + rolagens paginadas) só para ler `campanha`/`encontroAtivo` — aceito por simplicidade
  (mesmo padrão de um resolver por guard já usado no resto do módulo); revisitar só se um motivo
  de performance real aparecer depois.
- Confirmar, antes de implementar, que os valores **default** dos `@Input()` de `TrilhaTurnos`
  (sem projeção em `[trilhaAcao]`) e `CartaoCombatente` (`ehMestre`/`podeAjustar` ausentes) já
  produzem a composição somente-leitura — evita precisar tocar a API desses componentes.
