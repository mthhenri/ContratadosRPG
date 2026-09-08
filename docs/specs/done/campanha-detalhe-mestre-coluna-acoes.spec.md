# campanha-detalhe-mestre-coluna-acoes.spec.md

> Task avulsa (não pertence a um milestone `m*` aberto) — pedido direto do autor.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> Componente análogo aprovado desta task: `CampanhaEspectador`
> (`frontend/src/app/modules/campanha/paginas/espectador/`) — cabeçalho, grade de duas colunas
> com painel lateral sempre aberto, e `EspectadorFichaCard` (avatar quadrado) para os cards de
> ficha. Layout e proporções validados pelo autor num POC visual (HTML estático, fora do repo)
> antes da implementação; as decisões abaixo já incorporam os ajustes pedidos nessa rodada.

## Contexto

`CampanhaDetalhe` (`frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`, 1707
linhas TS + 1596 linhas HTML) hoje renderiza **mestre e jogador no mesmo componente**, alternando
por `@if (ehMestre())` em quase todo o template. Isso dificulta evoluir as duas visões
separadamente e deixa a visão de mestre com informação que o autor não considera necessária ver o
tempo todo (Membros sempre expandido, convites sempre visíveis como stat card, Rolagens Recentes
só como tira teaser).

Separadamente, o autor notou que os botões flutuantes de utilidade (Histórico de Rolagens,
Inventário do Esquadrão, Calculadora, Caderno) — hoje o primitivo `.utilitario-flutuante`
(`frontend/src/app/shared/utilitario-flutuante/_utilitario-flutuante.scss`), círculos
`position: fixed` empilhados no canto inferior esquerdo — ficam "soltos" e pouco integrados ao
resto do sistema. Esse primitivo é consumido por **6 telas fora do escopo desta task** (ficha,
iniciativa, jogador da campanha); esta spec introduz um substituto (`app-coluna-acoes`) e adota
**só na visão de mestre**, seguindo o mesmo padrão de rollout gradual já usado para
`app-botao-icone` (`ui-28` a `ui-32`, uma spec por módulo). A migração dos outros 6 consumidores
fica registrada como trabalho futuro (ver "Fora de Escopo").

## Objetivo

1. Separar `CampanhaDetalhe` em dois componentes de rota próprios — `CampanhaDetalheMestre` e
   `CampanhaDetalheJogador` — cada um com seu `.ts`/`.html`/`.scss`. A visão de **jogador** migra
   com comportamento **idêntico** ao atual (nenhuma mudança visual ou funcional nela — é
   reposicionamento de arquivo, não redesenho; o redesenho do jogador é uma spec futura).
2. Redesenhar a visão de **mestre** com foco em reduzir informação sempre visível: nova coluna de
   ações lateral (`app-coluna-acoes`, primitivo novo), painel de Rolagens/Inventário fixo (não
   mais overlay por toggle), dialog de Membros (em vez de coluna sempre aberta), Convites movidos
   para dentro do menu de ações, e Esquadrão com cards visuais (avatar quadrado, análogo
   `EspectadorFichaCard`) abrindo a ficha numa janela flutuante em vez de navegar.

## Entregáveis

### 1. Split de rota

`campanha.routes.ts:16-20` (`path: ':id'`) passa a montar um componente que resolve o papel do
usuário (mesma lógica de `ehMestre()` hoje — derivada de `membros()`) e decide entre
`CampanhaDetalheMestre` e `CampanhaDetalheJogador`. Dado compartilhado entre os dois (campanha,
membros, fichas, entrada nas salas de tempo real `campanha:<id>`/`ficha:<id>`) fica num único
lugar (serviço ou componente-casca, decisão de implementação) para não duplicar o fetch/
assinaturas de socket — a fronteira exata fica para o plano de execução, não esta spec. Estado e
lógica **específicos de um papel** (ex.: `fichaExibidaId`, `equipeExibicao`, edição inline de
nome/descrição, menu kebab do mestre) migram inteiros para o componente daquele papel.

`CampanhaDetalheJogador` reproduz **byte a byte** o comportamento hoje coberto pelo ramo
`@else` de `ehMestre()` no template atual (linhas ~1060–1596 de `detalhe.page.html`): Equipe ⇄
Inventário, Rolagens, Sessão, card de ficha embutido, menu "⋯" de ações de ficha. Nenhum
entregável desta spec altera essa visão — é regressão, não melhoria.

### 2. Primitivo `app-coluna-acoes` (`shared/ui/coluna-acoes/`)

Coluna vertical fixa **na borda esquerda da própria área de conteúdo da página** (não um cartão
com margem solto dentro dela — encosta onde o conteúdo da rota começa, altura cheia abaixo da
topbar, mesmo `--altura-topbar` que `HistoricoRolagensSidebar` já usa), expansível/retrátil por um
botão no topo da própria coluna:

- **Retraída** (padrão): só ícones, largura fixa (~56px), com `appTooltip` em cada item.
- **Expandida**: ícone + rótulo textual por item, largura maior (~200px); estado persistido em
  `localStorage` (mesmo padrão de `PainelFlutuante`, `[id]` por instância).
- Expandir/retrair **empurra o conteúdo** (a coluna participa do fluxo normal do layout — flex/
  grid — em vez de sobrepor por cima); o respiro entre a coluna e o início do conteúdo principal
  é constante nos dois estados, nunca zero nem variável.
- A área de conteúdo à direita da coluna não tem `max-width` artificial — usa toda a largura que
  sobrar do viewport (menos o respiro fixo acima), diferente do `90vw` centrado que as demais
  páginas do sistema usam.
- Cada item é um botão (`app-botao-icone`-like) com `[ativo]` opcional (item correspondente à
  rota atual, se aplicável) e `[contagem]` opcional (badge numérico, ex.: convites pendentes —
  usado ou não pelo consumidor).
- Mobile: vira uma barra inferior fixa (mesmo racional de `.ficha-nav`), com rótulo abaixo do
  ícone e sem o botão de expandir/retrair (decisão validada no POC visual).
- Só este primitivo nasce aqui; **não** substitui `.utilitario-flutuante` nos outros 6
  consumidores (fora de escopo, ver abaixo).

### 3. Redesenho de `CampanhaDetalheMestre`

Estrutura da página (desktop):

```
┌──────┬────────────────────────────────────────────────┬──────────────┐
│ col. │  cabeçalho (nome, estado Base/Missão)            │ painel fixo  │
│ ações│  Esquadrão + Criaturas — largura cheia,          │ Rolagens ⇆   │
│      │  grid de 3 colunas de cards visuais               │ Inventário   │
└──────┴────────────────────────────────────────────────┴──────────────┘
```

Sem o banner de alerta de ficha crítica (m2-19, entregável 1): esta redesign o **remove** — o
sinal de crítico continua só pelo próprio card do Esquadrão (fundo/borda `--vida`, já existente em
`detalhe__ficha-card--critico`), decisão do autor validada no POC visual. Sem coluna "Membros"
lado a lado do Esquadrão: com Membros virando dialog (item 4), o Esquadrão passa a ser a **única**
seção de conteúdo principal, ocupando toda a largura disponível.

- **Coluna de ações** (`app-coluna-acoes`): Membros (abre dialog), Iniciativa (`routerLink` para
  `/campanhas/:id/iniciativa`, mesmo destino do item "Iniciativa" do menu kebab atual), Convites
  (abre dialog com os dois códigos — ver item 5), Editar campanha, Excluir campanha, Calculadora
  (`CalculadoraFlutuante`), Caderno (`CadernoFlutuante`). Estado Na Base/Em Missão continua no
  cabeçalho (não é uma "ação", é um estado permanente).
- **Painel fixo à direita**: grid de página com uma segunda coluna sempre montada (mesmo padrão
  de `.espectador__grade`/`.espectador__feed`, mas mais larga — referência validada no POC:
  ~380–410px, não o token `--largura-painel-lateral` das sidebars em overlay), com
  `app-segmentado`/`app-segmentado-item` alternando entre "Rolagens" (conteúdo de
  `HistoricoRolagensSidebar`, mas sem o gatilho/overlay — sempre montado) e "Inventário"
  (`<app-inventario-esquadrao>`, mesmo componente que a visão de jogador já usa embutido).
  Substitui os dois `.utilitario-flutuante` de histórico/inventário do mestre — a visão de jogador
  continua com o padrão atual (overlay), fora de escopo.
- **Esquadrão + Criaturas**: mantém a mesma fonte de dados (`fichasEsquadrao()`,
  `criaturasEsquadrao()`), cabeçalho de seção preservado (contagem, alerta de sobrecarga,
  "Atualizado agora", botões "Nova Criatura"/"Novo Agente" — `abrirCriarCriatura`/
  `abrirCriarFicha`, inalterados). **Grid de 3 colunas** (supera a decisão de 2 colunas da m2-19,
  já que a coluna "Membros" some e sobra largura) — colapsa para 2 no breakpoint de tablet e 1 no
  mobile. Cada card ganha um avatar **quadrado** (~100–125px, não mais a faixa vertical alta de
  `detalhe__ficha-avatar` hoje) e perde os steppers de Vida/Energia inline — a barra de recurso
  volta a ser só leitura, como já é no espectador. `EspectadorFichaCard` ganha os dois recursos
  que seu próprio comentário já reservava como "v2, fora de escopo" na m8-07 (menu "⋯" — duplicar,
  remover da campanha, excluir, exatamente as ações de hoje, inalteradas — e o gatilho de "Abrir
  ficha" abaixo) e o card do mestre reaproveita esse componente.
- **Abrir ficha**: em vez de um botão de rodapé, é um **ícone só** (sem rótulo) ancorado no canto
  superior direito da própria foto do avatar — chip pequeno sobre a imagem, `aria-label="Abrir
  ficha de <nome>"`. Dispara `FichaFlutuante.abrir({ fichaId, tipo, usuarioIdDono })` — mesmo
  componente e mesmo padrão que `PainelEncontro` já usa (`abrirFichaFlutuante`/`#fichaFlutuante`).
  `FichaFlutuante`/`FichaFlutuanteConteudo`/`ficha-flutuante.model.ts` saem de
  `modules/encontro/componentes/` e vão para `modules/ficha/componentes/ficha-flutuante/` — não
  têm nada específico de encontro (só `FichaService` por `fichaId`/`tipo`) e passam a ser reusados
  por `encontro` e `campanha` sem um depender do outro. `PainelEncontro` só ajusta o caminho do
  import.

### 4. Dialog "Membros"

Aberta pelo item "Membros" da coluna de ações. Lista jogadores e espectadores da campanha
(`membrosOrdenados()`, já exclui/mostra o mestre conforme hoje) com, para cada jogador, a(s)
ficha(s) sumarizadas — reaproveita a carteirinha compacta já existente
(`.detalhe__equipe-carteirinha`, hoje usada na coluna Equipe do jogador: avatar + nome + classe,
sem clique). Ações de gestão de membro (transferir mestre, tornar espectador/jogador, remover)
continuam as mesmas de hoje (`podeGerenciarMembro`, `pedirTransferenciaMestre` etc.), só
reposicionadas para dentro da dialog.

### 5. Dialog "Convites"

Aberta pelo item "Convites" da coluna de ações. Mesmo conteúdo dos dois `detalhe__estatistica`
de convite atuais (código de jogador e de espectador, copiar, regenerar com confirmação) — sem
mudança de comportamento, só de local (saem da tira sempre visível para dentro da dialog).

## Critérios de Aceite

- `CampanhaDetalheJogador` é indistinguível do comportamento hoje coberto pelo ramo jogador de
  `CampanhaDetalhe` — mesma UI, mesmas ações, nenhuma regressão.
- `app-coluna-acoes` expande/retrai empurrando o conteúdo (sem sobrepor), com respiro constante
  entre coluna e conteúdo nos dois estados; persiste o estado; tem `role`/`aria` coerentes com um
  menu de navegação lateral; funciona por teclado (mesmo padrão de foco de `Abas`/`Segmentado`).
  Nenhum `max-width` artificial na área de conteúdo à direita dela.
- No mestre: Membros e Convites não aparecem mais sempre visíveis — só dentro das respectivas
  dialogs; não há mais coluna "Membros" ao lado do Esquadrão nem banner de alerta de ficha
  crítica; Iniciativa navega para a tela de Iniciativa a partir da coluna; o painel
  Rolagens/Inventário está sempre montado (nunca em overlay) e alterna sem perder o scroll de
  quem não está ativo.
- Esquadrão/Criaturas renderizam em grid de 3 colunas (2 no tablet, 1 no mobile) com avatar
  quadrado (~100–125px, mesmo padrão do espectador); nenhum stepper de Vida/Energia inline no
  card; "Abrir ficha" é um ícone só, ancorado no canto superior direito da foto, e abre a janela
  flutuante sem navegar; duplicar/remover da campanha/excluir continuam funcionando a partir do
  menu "⋯" do card.
- `FichaFlutuante` funciona a partir de `modules/ficha/componentes/`, consumida por `encontro`
  (sem regressão) e por `campanha` (novo consumo).
- `.utilitario-flutuante` e os 6 consumidores fora de escopo permanecem inalterados.
- `lint`/`test`/`build` dos workspaces afetados verdes; verificação ao vivo cobrindo mestre
  (`1920×1080` e `360×800`) comparada ao análogo `CampanhaEspectador`, e jogador (regressão) nos
  mesmos dois viewports.

## Fora de Escopo

- Redesenho da visão de **jogador** (só reposicionamento de arquivo nesta spec).
- Adoção de `app-coluna-acoes` em: ficha (`visualizar.page`, `visualizar-criatura.page`),
  Iniciativa (`painel-encontro.page`), e na visão de jogador da campanha — todos continuam com
  `.utilitario-flutuante`. Cada adoção é uma spec própria futura, mesmo padrão de `ui-28`…`ui-32`.
- Criaturas/NPCs como membros geridos via dialog "Membros" — hoje só jogadores e espectadores são
  membros; criaturas continuam exclusivas da coluna Esquadrão.
- Qualquer mudança de regra de negócio, permissão ou endpoint novo — puramente apresentação
  (mesmo dado que `CampanhaDetalhe` já busca hoje).
- Mudança de `80vw`/`85vw` para `90vw` — feita à parte, fora desta spec (ajuste mecânico já
  aplicado em todas as telas do sistema).

## Dependências

- `m8-07` (`EspectadorFichaCard`, grade de jogadores do espectador) — análogo aprovado e
  componente estendido por esta spec.
- `ui-17` (`PainelFlutuante`) — base de `FichaFlutuante`, realocada mas não alterada por dentro.
- `P-056`/`app-segmentado` — usado no toggle Rolagens⇆Inventário do painel fixo.
- `ui-28`…`ui-32` (`app-botao-icone`) — precedente de rollout gradual de primitivo seguido por
  esta spec para `app-coluna-acoes`.
- `m2-19`/`m2-20` (redesenho anterior de mestre/jogador do mesmo detalhe) — substituído, na parte
  de mestre, por esta spec; o banner de alerta e a coluna "Membros" da `m2-19` são explicitamente
  retirados (ver entregável 3), não apenas reposicionados.
