# i-027-anotacoes-janela-externa.spec.md

> Task avulsa. Origem: `IDEAS.md` `I-027`, 2ª das três fatias (Histórico → **Anotações** → Caderno).
> Reaproveita a rota isolada `/janela/`, o `JanelaExternaCabecalho` e o comportamento de
> recolher/restaurar entregues em `rolagens-janela-externa` e `i-027-rolagens-janela-contextos`.

## Estado de fechamento · 2026-09-24

- **Entregue e verificado ao vivo** (stack do autor, Playwright, `jogador.stub.1` na ficha 7,
  `codex.dev` na criatura 11, `jogador.stub.2` e `espectador.stub` para o acesso negado), em
  `1920×1080` e `360×800`, com a janela real capturada como popup.
- **Achados na verificação, corrigidos nesta tarefa:** (1) em `480×720` a janela ficava abaixo do
  breakpoint mobile e a barra de ferramentas do editor, presa no rodapé com foco, cobria
  Salvar/Cancelar — a janela passou a nascer com `640×720`; (2) `P-080`: o broadcast
  `ficha:alterada` omite `anotacoes`/`historia` e uma segunda aba que absorvia o eco e depois
  salvava apagava esses campos no banco (reproduzido sem a janela, com mestre e dono na mesma
  ficha). Corrigido por decisão do autor no entregável 7.
- **Fora desta tarefa, registrado:** `P-081` (clicar Salvar logo após digitar perde o texto — o
  editor Markdown só emite a mudança com ~200ms de atraso) e a janela de 1 RTT do `m3-17`
  (dois PUTs simultâneos do documento inteiro: o último vence).

## Objetivo

Permitir abrir as anotações de uma ficha de jogador ou criatura numa janela separada do navegador,
editável por quem já pode editá-las, sincronizada em tempo real com a aba principal. Enquanto a
janela existe, o painel flutuante local de anotações sai da tela; ao fechar a janela, ele volta.

## Entregáveis

1. **Mecanismo de janela genérico.** O controle hoje interno a `HistoricoRolagensJanelaService`
   (mapa contexto → `Window`, `about:blank` + `opener = null` + `location.replace`, verificação de
   fechamento por intervalo/`focus`/`visibilitychange`) é extraído para
   `shared/janela-externa/janela-externa.service.ts` (`JanelaExternaService`: `abrir(contexto, url,
   dimensoes?)`, `estaAberta(contexto)`). `HistoricoRolagensJanelaService` passa a delegar a ele sem
   mudar a própria API. Uma fachada `AnotacoesJanelaService` (`modules/ficha/`) expõe
   `abrir(fichaId, tipo)` e `estaAberta(fichaId)` com contexto `anotacoes:<fichaId>`, janela
   `640×720` — acima do breakpoint mobile (560px), onde o editor markdown prende a barra de
   ferramentas no rodapé com foco e cobriria Salvar/Cancelar numa janela de desktop (achado na
   verificação ao vivo, que começou com `480×720`).
2. **Editor de anotações extraído.** O bloco hoje duplicado no painel de `FichaVisualizacao` e de
   `CriaturaVisualizacao` (botão "Editar anotações" → `app-editor-markdown` + Salvar/Cancelar;
   leitura em markdown somente leitura; vazio) vira `AnotacoesFichaEditor`
   (`modules/ficha/componentes/anotacoes-ficha-editor/`): `valor` (input), `editando` (model),
   `salvar` (output, só quando o texto mudou). O vazio passa a usar `app-estado-vazio` compacto.
   Os dois painéis e a janela consomem esse componente — a janela seria a terceira cópia.
3. **Gatilho "Abrir em janela"** no cabeçalho do painel de anotações (`painelAcoesExtras` do
   `app-painel-flutuante`), nas fichas de jogador e criatura: `app-botao-icone` com ícone
   `abrir-externo`, `aria-label` e tooltip "Abrir em janela", mesmo controle do histórico. Não é
   renderizado no mobile (painel em folha cheia) nem enquanto as anotações estão em edição (evita
   perder o rascunho local). O componente emite um output; a página chama a fachada.
4. **Recolher e restaurar.** Nas páginas `visualizar` e `visualizar-criatura`, o painel local fica
   fechado enquanto `AnotacoesJanelaService.estaAberta(fichaId)`; o item "Anotações" da coluna de
   ações (e do menu "⋯" mobile da ficha de jogador) deixa de aparecer pressionado e, clicado, foca a
   janela existente em vez de abrir o painel. Fechar a janela devolve o painel ao estado anterior
   (aberto, se estava aberto). Reabrir não cria segunda janela para a mesma ficha.
5. **Rota isolada** `janela/ficha/:fichaId/anotacoes` (`?tipo=criatura` para criatura), guardada
   por `autenticacaoGuard`, sob o prefixo `/janela/` que o `Layout` já isola.
6. **Página `AnotacoesJanela`** (`modules/ficha/paginas/anotacoes-janela/`): carrega a ficha
   (`recuperarFicha` ou `recuperarFichaCriatura`) e, havendo campanha, os membros, para decidir
   dono/mestre com a mesma regra de apresentação das páginas (`podeGerenciar`); cabeçalho
   `JanelaExternaCabecalho` com contexto "Anotações de <nome>" e "Voltar à ficha"
   (`/fichas/:id` ou `/fichas/criatura/:id`). Persiste pela instância própria de
   `FichaEdicaoService`/`FichaEdicaoCriaturaService` (documento inteiro, debounce existente) e
   entra na sala `ficha:<id>`, absorvendo `ficha:alterada` e o refetch de reconexão pelo mesmo
   merge de três vias das páginas (`mesclarFicha`/`mesclarDocumento`), para que salvar anotações na
   janela nunca sobrescreva edição concorrente feita na aba principal (e vice-versa). Sem
   permissão de edição, ou com o REST negado, mostra estado vazio de acesso negado — nenhum dado.
   Como o save é debounced, fechar a janela com save pendente ou rascunho aberto dispara a
   confirmação nativa do navegador (`beforeunload`).

7. **`P-080` (decisão do autor em 2026-09-24).** `FichaService.alterarFicha` e
   `alterarFichaCriatura` preservam `CAMPOS_PRIVADOS_FICHA` gravados quando o documento enviado
   chega **sem a chave** (`preservarCamposPrivados`, `ficha-campos-privados.util.ts`); string vazia
   continua apagando. No frontend, dono/mestre buscam o documento completo pelo REST ao receber
   `ficha:alterada` (janela, `FichaVisualizar` e `CriaturaVisualizar`), em vez de absorver o
   payload reduzido — contrato que o próprio gateway já documentava. Visualizador só-acesso
   continua absorvendo o payload.

## Critérios de Aceite

1. Em desktop, o painel de anotações das fichas de jogador e criatura tem um único botão de ícone
   "Abrir em janela" que abre `/janela/ficha/:id/anotacoes` (com `?tipo=criatura` na criatura); o
   painel local sai da tela e o item da coluna deixa de estar pressionado.
2. Em 360×800, o botão não aparece; durante a edição, também não.
3. Salvar anotações na janela aparece na aba principal sem recarregar; alterar outro campo na aba
   principal (ex.: Vida) e depois salvar anotações na janela preserva os dois valores no banco.
4. Fechar a janela devolve o painel na aba principal sem recarregar; clicar "Anotações" com a
   janela aberta a foca, sem segunda janela.
5. Usuário sem permissão de edição (visualizador com concessão, espectador) recebe estado de
   acesso negado na rota da janela, sem conteúdo da ficha.
6. Testes focados (fachada/serviço genérico, editor extraído, página da janela, páginas
   consumidoras), suíte frontend, lint e build sem erro novo.
7. Gate visual (`CLAUDE.md`): análogos — `HistoricoRolagensJanela` para o casco da janela e o
   painel de anotações atual para o corpo. `verify` em `1920×1080` e `360×800` (janela) e
   verificação dos painéis locais após a extração: estados leitura, edição e vazio; sem overflow;
   scroll só no corpo da janela.

## Fora de Escopo

- Caderno da campanha em janela (3ª fatia da I-027).
- Anotações dentro de `FichaCampanhaCard`/aba História e peek de anotações no card de campanha —
  não passam pelo painel flutuante.
- Mudar quem pode ver/editar anotações, o contrato de `dados.anotacoes` ou criar endpoint parcial.
- Edição colaborativa simultânea do mesmo texto (duas pessoas editando anotações ao mesmo tempo
  continua "último a salvar vence", como hoje no painel).
- Item "Anotações" que aparece na coluna mesmo para quem não pode editar (comportamento atual).

## Dependências

- `docs/specs/done/rolagens-janela-externa.spec.md` e
  `docs/specs/done/i-027-rolagens-janela-contextos.spec.md`.
- `docs/design/DESIGN.md` e `docs/design/tema/`.

## Riscos e Mitigação

- **PUT do documento inteiro a partir da janela**: sem absorver `ficha:alterada`, a janela
  sobrescreveria com uma cópia velha o que a aba principal alterou. Mitigação: base + merge de três
  vias, igual às páginas; critério 3 prova com dado real. Continua valendo a janela de 1 RTT do
  `m3-17` (dois saves disparados na mesma fração de segundo: o último vence).
- **Rascunho perdido**: abrir a janela durante a edição esconderia o painel com o rascunho. O botão
  some durante a edição.
- **Pop-up bloqueado**: `window.open` síncrono no `(click)`; se bloqueado, o painel continua.
