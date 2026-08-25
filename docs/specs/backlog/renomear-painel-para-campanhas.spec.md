# renomear-painel-para-campanhas.spec.md

> **Task avulsa (observação do autor usando a topbar, 2026-08-12; escopo ampliado em 2026-08-25
> pelo próprio autor para incluir a rota), não é feature de milestone.** O número/slot definitivo
> (`mN-NN`) fica a critério do autor na revisão de backlog. Nasce de `docs/context/IDEAS.md`
> `I-019`. Este arquivo substitui `topbar-renomear-painel-icone-fichas.spec.md` (mesma tarefa,
> renomeado e com escopo ampliado antes de qualquer implementação — a spec original nunca chegou a
> `active/`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff da topbar ("Barra de Comando",
> `m2-09`) em `docs/design/tema/`. O sistema de ícones do projeto é **todo SVG inline desenhado à
> mão** (`frontend/src/app/shared/icone/icone.component.ts`/`.html`, comentário de topo do
> componente) — sem lib externa, sem emoji cru (proibição #29). Um ícone novo é um traço novo no
> mesmo estilo monocromático `stroke: currentColor` dos demais, não uma importação.

> **Precedente direto:** `docs/specs/backlog/renomear-calculadora-para-simulacao.spec.md` fez o
> mesmo tipo de rename (`/calculadora` → `/simulacao`) na mesma sessão de backlog. Esta spec segue
> a mesma decisão de escopo — quebra limpa, sem redirect de compatibilidade da URL antiga — e a
> mesma disciplina de não confundir o nome da rota com usos genéricos, em português, da mesma
> palavra em outras partes do app.

## Objetivo

Renomear a rota privada hoje montada em **`/painel`** (listar/entrar/detalhe de campanhas,
`modules/campanha/`, e as rotas filhas de ficha/criatura/iniciativa penduradas nela) para
**`/campanhas`**, e resolver junto os três ajustes pontuais de topbar que motivaram a spec
original:

1. A rota (e toda referência de navegação a ela) passa de `/painel` para `/campanhas` — "Painel" é
   um nome genérico (poderia ser qualquer dashboard) que nunca descreveu bem essa área; o resto do
   app já a chama pelo nome certo (módulo `modules/campanha/`, classe BEM raiz `.campanhas` em
   `lista.page.html`, ícone `nome="campanhas"` já usado no item de nav).
2. O item de nav dessa rota mostra o rótulo **"Campanhas"** — consequência direta do rename da
   rota, não mais só uma troca de texto sobre a rota antiga `/painel`.
3. **Fichas** (`/fichas`) ganha um ícone `IconeNome` próprio, diferente do usado por **Perfil**.
4. Remove-se o link duplicado **"Campanhas"** de dentro do menu de perfil.

Assim como `calculadora`→`simulacao`, esta é uma troca de **identificador de rota e texto
visível**, não um redesenho: nenhuma tela, permissão ou comportamento muda de forma, só o caminho
pelo qual se chega até ela.

## Estado atual (o que existe)

**A rota, hoje `/painel` (`frontend/src/app/app.routes.ts`):**

- Linha 20: redirect da rota raiz (`path: ''`) para `/painel` — destino padrão pós-login.
- Linhas 39, 46, 56: rotas filhas `painel/:campanhaId/ficha`, `painel/:campanhaId/criatura`,
  `painel/:campanhaId/iniciativa` — precedem a rota genérica `painel` (linha 64) de propósito,
  pelo jeito como o Router casa prefixos (não voltaria à irmã depois de consumir só `painel`).
- Linha 64: a rota genérica `path: 'painel'`, guardada por `autenticacaoGuard`, carrega
  `modules/campanha/campanha.routes` (`campanhaRoutes`) — **o módulo já se chama `campanha`**, só
  o segmento de URL ficou com o nome antigo.
- Comentários nas linhas 16, 36, 44, 61, 70 citam `/painel` como texto, não como código — precisam
  de atualização de prosa junto.

**Toda referência de navegação à rota** (routerLink, `router.navigate`/`navigateByUrl`,
`redirectTo`, `createUrlTree`, fallback de `retorno` no login, asserts de teste) — cerca de 40
arquivos, nenhum deles exige mudança estrutural (nenhuma pasta, classe ou seletor se chama
`painel`; o módulo já é `campanha`, os componentes de página já são
`CampanhaLista`/`CampanhaDetalhe`, a classe BEM raiz já é `.campanhas`), só o literal de string da
URL:

- `frontend/src/app/app.routes.ts` (linhas acima) e `app.routes.spec.ts` (asserts de `urlFinal` em
  `/painel`, `/painel/1/ficha/nova`).
- `frontend/src/app/core/guards/autenticacao.guard.ts` (comentário) e `.spec.ts` (asserts de
  `executar('/painel')`, `queryParams['retorno']`).
- `frontend/src/app/core/guards/admin.guard.ts:14` (`createUrlTree(['/painel'])`, destino do
  usuário sem permissão de admin) e `.spec.ts`.
- `frontend/src/app/modules/autenticacao/paginas/login/login.page.ts:53` (fallback
  `queryParamMap.get('retorno') ?? '/painel'` quando não há `retorno` guardado) e comentário
  (linha 13).
- `frontend/src/app/modules/autenticacao/paginas/registro/registro.page.ts:82`
  (`navigateByUrl('/painel')` pós-cadastro) e comentário (linha 29).
- `frontend/src/app/modules/acesso-negado/acesso-negado.page.html:47` (botão "Voltar",
  `routerLink="/painel"`) e `.spec.ts` (assert de `href`).
- `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.ts:120`
  (`navigateByUrl('/painel')`) e `.spec.ts`.
- `frontend/src/app/shared/layout/layout.component.html:20,86` (item de nav e link duplicado do
  dropdown — ver Entregáveis 4 e 6) e o comentário de topo de `layout.component.ts:19`.
- `frontend/src/app/modules/campanha/campanha.routes.ts:4` (comentário "montadas sob `/painel`").
- `frontend/src/app/modules/campanha/paginas/lista/lista.page.ts` (comentários) e `.html:63,117`
  (`[routerLink]="['/painel', campanha.id]"`).
- `frontend/src/app/modules/campanha/paginas/criar/criar.page.ts` (comentários +
  `router.navigate(['/painel', ...])`) e `paginas/entrar/entrar.page.ts` (idem).
- `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts` (comentários + ~6 chamadas
  `router.navigate(['/painel', ...])`), `.page.html` (8 `routerLink`s para `/painel`,
  `/painel/:id/iniciativa`, `/painel/:id/ficha/:id`, `/painel/:id/criatura/:id`) e `.spec.ts`
  (~15 asserts de URL/`href`).
- `frontend/src/app/modules/ficha/{ficha.routes.ts, criatura.routes.ts, ficha-acervo.routes.ts,
  ler-param-rota.ts}` (comentários citando `/painel/:campanhaId/...` como âncora de onde a rota é
  montada).
- `frontend/src/app/modules/ficha/paginas/{criar, criar-criatura, visualizar,
  visualizar-criatura}/*.page.ts` (comentários + `router.navigate`/`routerLink` condicionais que
  bifurcam entre `/painel/:campanhaId/...` e `/fichas/...` conforme a ficha é de campanha ou
  avulsa) e os `.spec.ts` correspondentes.
- `frontend/src/app/modules/encontro/encontro.routes.ts:4` (comentário) e
  `paginas/painel/painel-encontro.page.ts:165,1131,1136` (comentário + 2 chamadas `navigate` de
  volta para `/painel/:campanhaId/iniciativa`) — **só essas linhas**; o resto do arquivo (nome de
  pasta/arquivo/classe `PainelEncontro`, todo o BEM `.painel__*` do template) é a palavra genérica
  "painel" no sentido de "dashboard de combate", não a rota — não muda (ver Fora de Escopo).
- `docs/DEPLOY.md:192` — passo de verificação pós-deploy cita `/painel` como destino padrão
  guardado; é doc operacional vigente, não histórico, então acompanha o rename.

**Uso genérico da palavra "painel" que NÃO é a rota (mesma disciplina da colisão
calculadora/simulação — não tocar):**

- `frontend/src/app/modules/encontro/paginas/painel/painel-encontro.page.{ts,html,scss,spec.ts}` —
  nome de arquivo/pasta/classe/seletor (`PainelEncontro`) e todo o BEM `.painel__bloco`,
  `.painel__contador` etc. do template: é "o painel de condução do combate", sem relação com a
  rota `/painel`.
- `frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/**` — nome de
  pasta/componente ("painel de rolagens"), não a rota.
- `.dialogo__painel` (BEM de diálogos em `campanha/paginas/{detalhe,entrar,criar}`),
  `viewChild<ElementRef>('painel')` em `rolagem-avulso.component.ts:53`,
  `painelFragmentoTemplate`/`painelModTemplate`/`painelConsumirFragmentoTemplate` em
  `ficha-inventario.component.html`, e os textos "painel 'Aplicar em...'"/"painel 'Consumir'" em
  `ficha-inventario.component.spec.ts` — todos "painel" no sentido de "caixa/bloco de UI", não a
  rota.
- Comentários soltos ("o painel de...", "botão/painel da aba", "painel de controle") em
  `ficha-visualizacao.component.ts`, `ficha-rolagem-registro.service.ts`,
  `campanha/paginas/lista/lista.page.spec.ts` — mesmo sentido genérico.
- `docs/specs/done/**`, `docs/context/HISTORY.md`, `docs/design/examples/**` — registro histórico
  imutável (regra do `AGENTS.md`/`CLAUDE.md`); não reescrever mesmo onde citam a rota `/painel`
  antiga.

## Entregáveis

1. **Rota (`app.routes.ts`).** `path: 'painel'` → `path: 'campanhas'`; `path:
   'painel/:campanhaId/ficha'` → `'campanhas/:campanhaId/ficha'`; idem para `.../criatura` e
   `.../iniciativa`; `redirectTo: '/painel'` (raiz) → `'/campanhas'`. Atualizar os comentários que
   citam `/painel` como texto (linhas 16, 36, 44, 61, 70) para `/campanhas`.
2. **Sem redirect de compatibilidade.** Mesma decisão da `renomear-calculadora-para-simulacao`:
   quebra limpa. Não adicionar rota `path: 'painel', redirectTo: '/campanhas'` nem qualquer shim —
   navegar para a URL antiga `/painel` deve resultar em rota não encontrada, não em redirect.
3. **Toda referência de navegação e teste listada em "Estado atual"** — trocar o literal de
   string `/painel`/`'painel'` por `/campanhas`/`'campanhas'` em cada arquivo citado (routerLink,
   `router.navigate`/`navigateByUrl`, `redirectTo`, `createUrlTree`, fallback de `retorno` no
   login, comentários de prosa, asserts de `.spec.ts`). Não tocar nenhuma ocorrência listada em
   "Uso genérico da palavra 'painel'".
4. **Nav "Campanhas" (`layout.component.html:20-23`).** Rótulo do item passa a **"Campanhas"**
   (consequência do entregável 1: a rota já é `/campanhas`), `routerLink="/campanhas"`. O ícone
   `nome="campanhas"` já usado nesse item continua fazendo sentido — não precisa trocar.
5. **Ícone próprio de Fichas.** Desenhar um novo valor de `IconeNome` (ex.: `ficha`) — um traço no
   mesmo estilo monocromático dos demais ícones (`stroke: currentColor`, sem preenchimento sólido
   nem cor hardcoded), sugestão temática "cartão/ficha de personagem" (ex.: retângulo vertical com
   uma ou duas linhas internas, evocando um cartão de identificação). Trocar `nome="agente"` por
   `nome="ficha"` só no item de nav `/fichas` (`layout.component.html:25`) — o ícone `agente`
   continua usado no item **Perfil** do dropdown e em qualquer outro lugar do app que já o usa.
6. **Remover duplicata do menu de perfil.** Apagar o `<a>` "Campanhas" do dropdown de perfil
   (`layout.component.html:84-92`, hoje `routerLink="/painel"`) — a navegação já está coberta pelo
   item de nav principal (entregável 4). O dropdown passa a ter só Perfil, o seletor de tema e
   Encerrar sessão.
7. **Comentário de topo do `Layout`** (`layout.component.ts:19`) — remover a menção a "Painel" e,
   se citar "Calculadora" e a task `renomear-calculadora-para-simulacao` já tiver rodado antes
   desta, refletir "Simulação" também (rótulos de nav vigentes no momento da implementação desta
   task, não necessariamente os citados aqui).
8. **`docs/DEPLOY.md:192`** — "destino padrão é o `/painel`" → "destino padrão é o `/campanhas`".

## Fora de Escopo

- Qualquer redesenho maior da topbar, do dropdown de perfil, ou das telas de campanha além do
  rename de rota e dos três ajustes de nav/ícone.
- Trocar o ícone do item Perfil — mantém `agente` (representa o usuário logado).
- Novos ícones para qualquer outro item da nav além de Fichas.
- Renomear pasta, classe, seletor ou arquivo do módulo `campanha` — já se chama `campanha`
  corretamente; só o segmento de URL (`path: 'painel'`) estava desalinhado.
- Qualquer ocorrência de "painel" listada em "Uso genérico da palavra 'painel'" acima —
  `PainelEncontro`, `ficha-rolagens-painel`, `.dialogo__painel`, os `viewChild`/template refs de
  `ficha-inventario`, e comentários soltos que usam a palavra no sentido de "bloco de UI".
- Redirect/shim de `/painel` para `/campanhas` — decisão do autor, quebra limpa (entregável 2).
- Reescrever `docs/specs/done/**`, `docs/context/HISTORY.md` ou `docs/design/examples/**` que
  citam `/painel` — registro histórico imutável.

## Critérios de Aceite

- `grep -rn "'painel'\|\"painel\"\|/painel" frontend/src` não retorna nenhuma ocorrência que seja
  a rota (podem sobrar, sem mudança, as ocorrências genéricas listadas em "Uso genérico da palavra
  'painel'" acima — `PainelEncontro`, `.painel__*` de `painel-encontro`, `ficha-rolagens-painel`,
  `.dialogo__painel`, `viewChild('painel')`, `painel*Template`).
- `npm run test --workspace=frontend`: suíte verde, incluindo `app.routes.spec.ts`,
  `autenticacao.guard.spec.ts`, `admin.guard.spec.ts`, `acesso-negado.page.spec.ts`,
  `gestao.page.spec.ts`, e todos os `.spec.ts` de `campanha/` e `ficha/` que hoje fixam URLs
  `/painel`.
- `npm run lint --workspace=frontend`: limpo.
- Build do frontend passa.
- O item de nav antes rotulado "Painel" aparece como **"Campanhas"**, apontando para
  `/campanhas`, mesmo destaque `routerLinkActive`.
- Login sem `retorno` guardado, cadastro novo, e o botão do `acesso-negado` levam a `/campanhas`.
  Usuário sem permissão de admin em `/admin` é redirecionado a `/campanhas`.
- Navegar para a URL antiga `/painel` (ou qualquer `/painel/:id/...`) não resolve mais para
  nenhuma tela — sem rota morta, sem redirect de compatibilidade.
- O item de nav **Fichas** usa um ícone **diferente** do item **Perfil** do dropdown — os dois não
  são mais visualmente idênticos.
- O dropdown de perfil não tem mais nenhum link para `/campanhas` (nem para `/painel`) — só
  Perfil, Tema e Encerrar sessão.
- Gate visual (skill `verify`, `1920×1080` e `360×800`): nav com rótulo e ícone novos sem
  overflow/quebra; lista de campanhas (`/campanhas`) e um detalhe (`/campanhas/:id`) abrem
  normalmente; dropdown de perfil sem o link removido — nos dois viewports.

## Dependências

- `frontend/src/app/app.routes.ts`/`.spec.ts`.
- `frontend/src/app/core/guards/{autenticacao,admin}.guard.ts`/`.spec.ts`.
- `frontend/src/app/shared/layout/layout.component.{html,ts}`.
- `frontend/src/app/shared/icone/icone.component.ts`/`.html` (novo valor de `IconeNome` + SVG).
- `frontend/src/app/modules/campanha/**` (rotas, comentários, `routerLink`/`navigate`).
- `frontend/src/app/modules/ficha/**` e `frontend/src/app/modules/encontro/**` (comentários e
  navegação condicional que referenciam `/painel/:campanhaId/...`).
- `frontend/src/app/modules/autenticacao/paginas/{login,registro}/*.page.ts`.
- `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.ts`.
- `frontend/src/app/modules/acesso-negado/acesso-negado.page.html`/`.spec.ts`.
- `docs/DEPLOY.md`.
- `docs/design/DESIGN.md`/`docs/design/tema/` para a identidade visual do ícone novo de Fichas.
