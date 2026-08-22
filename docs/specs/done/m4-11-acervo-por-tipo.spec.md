# m4-11-acervo-por-tipo.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md` (não é uma das 10 originais —
> `m4-05` a `m4-10` já estão reservadas para NPC, listagem/revelação e refinamento mobile).
> Pedido direto do autor: *"na tela de fichas ele lista todas as fichas da sua conta, seja em
> agentes, NPCs ou criaturas… tá tudo misturado e isso é ruim"*.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> Consumir os tokens do tema "Terminal de Contenção" — nada de hex/fonte/raio solto
> (proibição #29). **Análogo aprovado obrigatório:** o painel da campanha
> (`CampanhaDetalhe`, `frontend/src/app/modules/campanha/paginas/detalhe/`), que já resolve
> exatamente este problema — bloco "Esquadrão" (`JOGADOR`) × bloco "Criaturas" (`CRIATURA`)
> na mesma coluna, com cabeçalho de seção (`detalhe__secao`), grade rolável
> (`detalhe__esquadrao-grid` + `appOverflowFade`) e mini-cards com recorte por tipo. Mapear
> shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e comportamento
> responsivo dele — não só "usar os tokens".

## Objetivo

O acervo (`/fichas`, `m3-28`) lista **todas** as fichas do usuário sem distinguir tipo:
`FichaRepository.listarPorUsuario` filtra só por `usuario_id`, e o `FichaResumoDto` que sai
dali já carrega `tipo`/`na`/`vd`/`prestigio` — mas a tela ignora os três. O resultado é uma
lista única onde agente e criatura se misturam, com um card desenhado só para agente (Classe ·
Nível · Vida · Energia) e sem a Patente, que o mini-card do painel da campanha já exibe.

Esta task separa o acervo por tipo (filtro + blocos), acrescenta os pontos de criação por tipo
e ajusta o card para atender agente, criatura e — estruturalmente — NPC. Junto, destrava
**criar uma criatura fora da campanha e atribuí-la depois**, que hoje é impossível
(`FichaCriaturaCriarDto.campanhaId` é obrigatório por decisão explícita da `m4-03`: *"sem
'avulsa' nesta task"*).

Como o acervo **já** lista criaturas hoje, dois defeitos já estão vivos e alcançáveis pelos
controles desta mesma tela — a task os corrige, porque separar os tipos direito e corromper a
ficha no menu ao lado seria entregar meia coisa:

- `FichaService.duplicarFicha` delega para `criarFicha`, que fixa `tipo: TipoFichaEnum.JOGADOR`.
  Duplicar uma criatura pelo menu (⋯) do acervo cria hoje uma ficha **tipada como agente** com
  `dados` de criatura.
- Todo card do acervo aponta para `/fichas/:id`, que monta `FichaVisualizar` (agente). Clicar
  numa criatura do acervo leva para a tela errada — e não existe rota de criatura fora da
  campanha.

## Decisões de abertura

Tomadas com o autor antes da escrita, para não ficarem implícitas na implementação:

1. **Quem cria criatura/NPC solto:** só quem é **mestre de alguma campanha**. A trava do §14
   ("criar criatura/NPC: mestre irrestrito, demais nunca") continua perto da criação, sem virar
   uma regra nova de "qualquer um cria e a atribuição filtra". Consequência coerente: atribuir
   uma criatura/NPC a uma campanha exige que o dono seja **MESTRE** dela, não só membro.
2. **NPC:** estrutura pronta, opção desligada. A tela é escrita dirigida por `TipoFichaEnum`
   (sem `if` hardcoded por tipo), mas a opção "NPCs" do filtro e o botão "Criar NPC" só entram
   quando `m4-07`/`m4-08` existirem. Nada de botão inerte na tela principal.
3. **Altura dos blocos:** em "Todos", cada bloco trava em 2 linhas de card e rola por dentro;
   com um tipo filtrado, aquele bloco solta a trava e usa a altura toda.
4. **Card:** um componente único extraído (`CartaoFichaAcervo`) com recorte por tipo, não três
   componentes nem três ramos `@if` dentro de `acervo.page.html` — que já tem 11k de template
   e 15k de componente (`AGENTS.md`: avaliar extração antes de acrescentar responsabilidade a
   um componente já extenso).

## Entregáveis

### 1. `shared/` — criatura pode nascer solta

`shared/src/dtos/ficha/ficha-criatura-operacao.dtos.ts`:

- `FichaCriaturaCriarDto.campanhaId: number | null` (era `number`). Atualizar o comentário do
  DTO, que hoje declara `campanhaId` obrigatório e justifica com *"VD/NA são calibrados para o
  grupo daquela campanha; sem 'avulsa' nesta task"* — a justificativa cai com esta task, e o
  novo texto deve registrar a regra que a substitui (decisão 1 acima).
- `FichaCriaturaCriadaDto.campanhaId: number | null` (era `number`).

Nenhuma mudança em `shared/regras/` — o motor de criatura (`validarFichaCriatura`) nunca olhou
`campanhaId`.

### 2. `backend/` — permissão, tipo e o vazamento pela sala

`FichaRepository`:

- `recuperarPorId` passa a devolver `tipo` (`tipo_ficha.codigo`), via o **mesmo**
  `JOIN tipo_ficha` que `juncaoTipoResumo()` já declara — sem SQL novo inventado. `tipo` entra
  em `FichaRecuperadaDto` (`shared/src/dtos/ficha/ficha-operacao.dtos.ts`) como
  `TipoFichaEnum`. Sem isso nenhuma das ramificações abaixo é possível: hoje o service recupera
  a ficha e não sabe o tipo dela.

`FichaService.criarFichaCriatura`:

- `dto.campanhaId !== null` → regra atual, intocada (`recuperarMembro` + papel `MESTRE`
  daquela campanha).
- `dto.campanhaId === null` → exige
  `campanhaRepositorio.contarCampanhasComoMestre({ id: usuarioAtivo.sub }) > 0`; caso contrário
  `UnauthorizedAccessException`. O método **já existe** (`CampanhaRepository`, hoje consumido só
  pelo `UsuarioService`) — reusar sem duplicar a consulta (proibição #28).
- A ficha nasce com `campanha_id NULL`, dono = autenticado, `tipo = CRIATURA`. Nenhum evento
  WS (já é o comportamento atual e continua correto: sem campanha não há sala).

`FichaService.atribuirCampanha` — duas ramificações por tipo:

- Quando a ficha é `CRIATURA`/`NPC` e `dto.campanhaId !== null`, o dono precisa ser **MESTRE**
  da campanha-alvo. `validarMembroAlvo` (que só exige vínculo) continua valendo para `JOGADOR`;
  para os outros tipos a checagem sobe para o papel. Ficha `JOGADOR` mantém o comportamento
  atual sem qualquer alteração observável.
- Quando a ficha é `CRIATURA`/`NPC`, **não** emitir `campanhaGateway.emitirFichaCriada`. É a
  mesma razão já documentada em `criarFichaCriatura`: o evento monta o resumo na forma de
  jogador e transmite para a sala `campanha:<id>` **inteira**, sem checar permissão — atribuir
  uma criatura vazaria nome e vida dela para todo jogador da campanha antes de qualquer
  revelação deliberada, contradizendo "invisível por padrão" (§14). Aplicar o guard por tipo, ao
  lado do `if (campanhaId === null) return` que já existe ali por ausência de campanha.

`FichaService.duplicarFicha` — o clone herda o `tipo` da original:

- Hoje delega a `criarFicha`, que fixa `tipo: TipoFichaEnum.JOGADOR`. Duplicar uma criatura
  produz uma ficha tipada como agente com `dados` de criatura — quebra silenciosa, já viva.
- Ramificar por `fichaOriginal.tipo` (disponível após a mudança em `recuperarPorId`): `JOGADOR`
  segue o caminho atual; `CRIATURA`/`NPC` criam com o tipo correto. Um clone de criatura solta
  nasce solto; de criatura em campanha, na mesma campanha (mesma passagem direta de hoje).
  Reusar a permissão existente (`validarPermissaoEdicao`) — nenhuma regra nova de quem duplica.

`FichaController`: nenhuma rota nova. `POST /ficha/criatura` já é o endpoint; só o corpo aceita
`campanhaId: null`.

### 3. `frontend/` — rotas de criatura fora da campanha

`ficha-acervo.routes.ts` ganha, **antes** de `:id` (senão casam como id):

- `criatura/nova` → `CriaturaCriar`
- `criatura/:id` → `CriaturaVisualizar`

Os dois componentes são os **mesmos** das rotas campanha-scoped, com `campanhaId` opcional —
exatamente o padrão que `FichaCriar`/`FichaVisualizar` já usam sob `/fichas/nova` e `/fichas/:id`
(`criar.page.ts`, `campanhaIdRota`/`campanhaId: number | null`). Nada de página duplicada.

`CriaturaCriar` (`paginas/criar-criatura/criar-criatura.page.ts`):

- `campanhaId: number | null` lido da rota-pai (hoje `Number(lerParamRota(...))`, que vira `NaN`
  sem o parâmetro).
- `RascunhoGuiaService` já aceita `campanhaId: number | null` (a chave `null` cai em `acervo`) —
  reusar sem mudança.
- `criarFichaCriatura({ campanhaId, … })` passa `null` quando avulsa.
- Saída/cancelamento navega para `/fichas` quando `campanhaId === null` (hoje sempre
  `/painel/:campanhaId`); destino pós-criação `/fichas/criatura/:id`.

`CriaturaVisualizar` (`paginas/visualizar-criatura/visualizar-criatura.page.ts`):

- Hoje assume `campanhaId` sempre presente (leitura da rota, `listarMembros`, e as duas
  navegações de volta / pós-exclusão). Passa a cair no `campanhaId` do **payload da ficha**
  quando a rota não traz — mesma dívida e mesma solução já documentadas em `FichaVisualizar`
  para o acervo.
- Quando `campanhaId` resolvido é `null`: pular `listarMembros` (não há campanha, logo não há a
  quem conceder acesso — a seção de acesso de visualização não se aplica) e voltar para
  `/fichas`.

### 4. `frontend/` — a tela do acervo

`acervo.page.{ts,html,scss}`:

**Barra de ações** — `.acervo__acoes` vira dois grupos com `justify-content: space-between`,
mesmo padrão que a `m7-16` aplicou em `.iniciativa__acoes` (grupos que empilham em ordem fixa no
mobile, sem saltar de posição):

- Esquerda: `Criar ficha` · `Criar criatura` (· `Criar NPC`, quando `m4-08` existir).
- Direita: `<select>` de visão — **Todos** (padrão) / **Agentes** / **Criaturas**
  (/ **NPCs**, quando existir).

Os botões de criar criatura/NPC só renderizam quando o usuário é mestre de alguma campanha —
derivado de `campanhas()`, que a tela **já carrega** no `forkJoin` inicial
(`CampanhaResumoDto.papel === TipoCampanhaMembroPapelEnum.MESTRE`). Não é duplicação de regra:
o backend continua sendo a autoridade (entregável 2), a UI só evita oferecer o que seria
recusado.

O `<select>` usa `[selected]` na `<option>`, **não** `[value]` no `<select>` — armadilha
conhecida do projeto, e o `<select>` de campanha da dialog de atribuição já sofre dela hoje.

**Blocos** — cabeçalho no padrão já aprovado do análogo (`detalhe__secao`: título + régua +
contagem do bloco), um por tipo, na ordem Agentes → Criaturas → NPCs:

- Filtro **Todos**: os blocos aparecem empilhados; cada um trava em **2 linhas** de card e rola
  por dentro com o `appOverflowFade` que o acervo já usa. Bloco sem ficha é omitido (o estado
  vazio geral, "Nenhuma ficha ainda", continua aparecendo só quando não há ficha nenhuma).
- Filtro de um tipo: só aquele bloco, sem a trava de altura — usa a altura disponível e rola a
  página. Bloco vazio mostra estado vazio próprio ("Nenhuma criatura ainda.", no padrão
  `detalhe__estado`).
- A contagem do cabeçalho do card (`card__contagem`) permanece o total de fichas; a contagem por
  tipo é a do cabeçalho de cada bloco.

**Retrocompatibilidade:** ficha sem `tipo` (o campo é opcional no `FichaResumoDto` para não
obrigar fixtures pré-`m4-04`) conta como `JOGADOR` — mesmo tratamento que o resto do front já
dá.

**Menu (⋯) por tipo:** na dialog "Atribuir a campanha" de uma criatura/NPC, o `<select>` lista
somente campanhas onde o usuário é **MESTRE** (coerente com o entregável 2). Para agente, lista
todas, como hoje.

**Link do card por tipo:** `JOGADOR` → `/fichas/:id`; `CRIATURA` → `/fichas/criatura/:id`.
Sempre a rota do acervo (que resolve `campanhaId` pelo payload), inclusive para uma criatura já
atribuída a uma campanha — mesma escolha que o agente já faz hoje.

### 5. `CartaoFichaAcervo` — componente extraído

Novo standalone em `frontend/src/app/modules/ficha/componentes/cartao-ficha-acervo/`
(`.ts`/`.html`/`.scss`), consumido pelos três blocos.

Comum a todos os tipos (idêntico ao que o cartão do acervo já desenha): moldura, avatar com a
cor de identidade (`--cor-ficha`) e placeholder listrado, chip da campanha ("Sem campanha"
quando solta), régua e botão de menu (⋯).

Recorte por tipo — só a linha de meta e a de vitais mudam:

| Tipo | Meta | Vitais |
|---|---|---|
| `JOGADOR` | `rotuloClasseCompleto(classe, arquetipo)` · `Nível {nivel}` · `{Patente}` | `Vida {vidaAtual}/{vidaMaxima}` · `Energia {energiaAtual}/{energiaMaxima}` |
| `CRIATURA` | `Ameaça` · `NA {na}` · `VD {vd}` | `Vida {vidaAtual}/{vidaMaxima}` · `Defesa {defesa}` |
| `NPC` | recorte declarado no componente, não renderizado até `m4-07`/`m4-08` definirem os campos | idem |

- `rotuloClasseCompleto` (`modules/ficha/rotulos-ficha.ts`) já devolve classe **e**
  arquétipo/subclasse num rótulo só ("Combatente - Lutador"; "Civil" quando não há) — a meta do
  agente cobre, nesta ordem: classe, arquétipo ou subclasse, nível, **Patente**.
- A **Patente** é o que falta hoje no acervo: `rotuloPatente(prestigio ?? 0)`
  (`modules/ficha/status-derivado.ts`), derivada do Prestígio no cliente. `prestigio` já vem no
  `FichaResumoDto`, e a linha é a mesma que `CampanhaDetalhe` já monta. Nenhuma fórmula nova,
  nenhum campo novo no DTO.
- `Ameaça` / `NA` / `Defesa` espelham literalmente o card de criatura do análogo
  (`detalhe.page.html`, bloco "Criaturas"); `VD` entra a mais porque o acervo não tem o contexto
  da campanha para calibrar a leitura de NA sozinha — e `vd` já vem no `FichaResumoDto`.
- Campos ausentes caem em `—`, como o cartão já faz com `vidaMaxima`.

O menu (⋯) e o preview ampliado do avatar **continuam na raiz da página**: os dois são
`position: fixed` e o pai (`.acervo__lista`) tem `overflow-y` + `mask-image` via
`appOverflowFade`, que os cortaria na pintura — problema e correção já documentados no acervo e
em `CampanhaDetalhe` (`m3-52`). O componente apenas emite os eventos (abrir menu com o
`MouseEvent`, entrar/sair do avatar); não hospeda nem o menu nem o preview.

## Critérios de Aceite

- O acervo separa agentes, criaturas e NPCs em blocos com cabeçalho e contagem próprios; o
  `<select>` à direita alterna entre Todos e cada tipo.
- Em "Todos", cada bloco mostra 2 linhas e rola por dentro; com um tipo filtrado, o bloco usa a
  altura toda. Sem overflow horizontal em nenhum viewport.
- Um mestre cria uma criatura por "Criar criatura" no acervo, sem campanha; ela aparece no bloco
  Criaturas com o chip "Sem campanha", abre em `/fichas/criatura/:id` e é editável ali.
- Pelo menu (⋯), essa criatura é atribuída a uma campanha onde o usuário é mestre; campanhas em
  que ele é só jogador **não** aparecem no `<select>`, e o backend recusa a tentativa direta.
- Ao atribuir uma criatura a uma campanha, **nenhum** jogador conectado à sala vê a criatura
  aparecer sem revelação — verificado com um segundo usuário conectado (skill `verify`).
- Um usuário que não é mestre de campanha nenhuma não vê "Criar criatura", e a chamada direta ao
  endpoint com `campanhaId: null` é recusada com 403.
- Duplicar uma criatura pelo menu (⋯) produz outra **criatura**, não um agente.
- Clicar num card de criatura no acervo abre a ficha de criatura, nunca a tela de agente.
- O card de agente exibe classe, arquétipo/subclasse, nível e **Patente**; o de criatura exibe
  Ameaça, NA, VD, Vida e Defesa. Nenhum card mostra campo que não se aplica ao seu tipo.
- Ficha sem `tipo` (retrocompat) é listada no bloco Agentes, sem erro.
- Nenhuma regra de permissão duplicada no frontend; nenhuma fórmula (Patente, NA, VD)
  reimplementada fora de `shared/regras`/`status-derivado`.
- Comparação visual registrada contra o análogo `CampanhaDetalhe` — parece parte do mesmo
  produto, mesma densidade e hierarquia, mesmos controles/ícones/estados.

## Verificação exigida

- **Testes**: `shared` (nenhum novo esperado — confirmar que a mudança de tipo em
  `FichaCriaturaCriarDto` não quebra nada), `backend` (criar criatura solta como mestre-de-alguma
  × mestre-de-nenhuma; atribuir criatura com dono mestre do alvo × membro comum; ausência de
  `emitirFichaCriada` para criatura; duplicar criatura preservando o tipo; `recuperarPorId`
  devolvendo `tipo`), `frontend` (`acervo.page.spec.ts`: filtro, blocos, contagens, omissão de
  bloco vazio em "Todos", botões condicionais ao papel, link por tipo; `cartao-ficha-acervo`:
  recorte por tipo e a linha de Patente).
- **Gate visual obrigatório** (`AGENTS.md`, skill `verify`), em `1920×1080` **e** `360×800`,
  percorrendo os estados: Todos com os três blocos; cada filtro isolado; bloco vazio; scroll
  interno de um bloco; menu (⋯) aberto num card perto da borda inferior (o reposicionamento
  para cima já existe e precisa continuar correto dentro dos blocos); dialog "Atribuir a
  campanha" com a lista filtrada. Comparação com o análogo registrada no fecho.
- **Ao vivo com dois usuários** (mestre + jogador): atribuir criatura a uma campanha e confirmar
  que o jogador não a recebe pela sala.

## Fora de Escopo

- **NPC de verdade** — contrato, regras, backend e assistente são `m4-05`/`m4-06`/`m4-07`/
  `m4-08`. Aqui só entra a estrutura por tipo que os acolhe sem reescrita.
- **Listagem e revelação seletiva no painel do mestre** (`m4-09`) — tela diferente, campanha-
  scoped; esta task é o acervo pessoal.
- Refinamento mobile de criatura/NPC (`m4-10`). O gate de `360×800` desta tela continua
  obrigatório aqui, mas o polimento das telas de criatura/NPC é da `m4-10`.
- Persistir o filtro escolhido entre sessões — sem pedido, sem necessidade (YAGNI).
- Unificar as rotas duplicadas de ficha (`/painel/:campanhaId/…` × `/fichas/…`) — dívida
  assumida desde a `m3-28`, não ampliada nem resolvida aqui: esta task só replica para criatura
  o padrão que agente já segue.
- Qualquer mudança na regra de visibilidade de criatura/NPC (`usuario_ficha_acesso`, §14) além
  de impedir o vazamento pela sala descrito no entregável 2.
- Busca ou ordenação no acervo — a ordenação por nome (`ORDER BY ficha.nome`) permanece.

## Dependências

- `m4-01`/`m4-02`/`m4-03`/`m4-04`/`m4-04b` (`done`) — contrato, regras, endpoints e telas de
  criatura, que esta task passa a alcançar fora da campanha.
- `m3-28` (`done`) — o acervo, `listarMinhasFichas` e `atribuirCampanha`.
- `CampanhaRepository.contarCampanhasComoMestre` — já existe; reusado sem alteração.
- `m4-07`/`m4-08` (backlog) — desbloqueiam a opção "NPCs" do filtro e o botão "Criar NPC", que
  esta task deixa estruturalmente prontos.
