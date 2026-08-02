# m2-20-painel-campanha-detalhe-jogador.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-19) — task `m2-20`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Hoje `/painel/:id` (`CampanhaDetalhe`) renderiza **o mesmo template** para mestre e jogador,
só escondendo blocos via `@if (ehMestre())`. Esta task cria uma **visão dedicada ao papel
JOGADOR**: a `m2-19` já cobriu o mestre (banner/stats/rolagens/Membros+Esquadrão); aqui, quando
`!ehMestre()`, a página passa a mostrar a ficha do jogador como conteúdo principal —
reaproveitando o componente real `<app-ficha-visualizacao>` (não uma réplica) — com Equipe e
Sessão como coluna lateral larga, e a possibilidade de **trocar qual ficha aparece** na
coluna principal para qualquer ficha de colega compartilhada com o jogador. Escolhido entre três
direções comparadas em protótipo (**A · Ficha em Primeiro Plano** — a aprovada — B · Meu Posto,
C · Abas do Jogador).

> **Revisão pós-entrega ("card de equipe"):** a versão inicialmente entregue usava
> `[modo]="'embutido'"` (colunas empilhadas, ficha completa com todas as abas) só para a ficha
> de colega, mantendo a própria ficha completa/empilhada. Revisão de UX subsequente trocou os
> dois casos por um único `modo="compacto"` — 2 colunas (Identidade+Atributos empilhados num
> agrupador único ao lado da Status sem abas — Inventário/Habilidades/Rolagens sem seletor), sem
> Prestígio, aplicado tanto à própria ficha quanto à de colega. Editar Informações/Extras/
> História passou a exigir "Abrir ficha completa". O texto abaixo foi atualizado pra refletir
> essa decisão — o modo `'embutido'` não existe mais no componente (uma 1ª tentativa de
> `'compacto'` manteve as 3 colunas lado a lado, só mais estreitas — abandonada por deixar um
> vão vazio enorme antes de Atributos quando a Status, sem abas, ficava mais alta que as outras
> duas colunas).

## Entregáveis

1. **Template condicional por papel** em `detalhe.page.html`: o bloco `@if (ehMestre())` passa a
   envolver o layout da `m2-19`; um novo `@else` renderiza o layout desta task. `carregar()`
   continua buscando `campanha`/`membros`/`fichas` (leve) como hoje para os dois papéis — o
   fetch adicional do item 4 só acontece no ramo jogador.
2. **Reuso do componente real, não uma réplica**: `<app-ficha-visualizacao>` embutido na coluna
   principal (~900px), com os mesmos inputs/outputs já wireados em
   `visualizar.page.html:158-166` (`fichaId`, `nome`, `dados`, `ajustavel`, `podeRolar`,
   `ehMestre`, `abaInicial`/`abaMudou`, e todos os `ajuste*`/output de mutação). A ficha exibida
   é controlada por um novo `signal<number | null> fichaExibidaId`, inicializado com o `id` da
   própria ficha do usuário assim que `fichas()` carrega.
3. **Novo input `modo: 'padrao' | 'compacto'`** em `FichaVisualizacao`
   (`ficha-visualizacao.component.ts`, ao lado de `abaInicial`/`destinoMobileInicial`): quando
   `'compacto'`, reduz as 3 colunas do `'padrao'` (Identidade 420 + Atributos 260 + Status mín.
   420 ≈ 1130px — mais do que a coluna principal aqui tem, mesmo numa tela real de 1600px, já
   que os `@media (max-width: ...)` do componente são por *viewport*, não por *container*) pra 2:
   Identidade+Atributos empilhados num agrupador único (`&__coluna-agente`, 500px) ao lado da
   Status (min. 260px). Também esconde o mini-stat de Prestígio e substitui as abas de Status por
   Inventário/Habilidades/Rolagens sempre visíveis, sem seletor — Informações/Extras/História
   ficam só na ficha completa (`modo="padrao"`, via "Abrir ficha completa"). `visualizar.page.html`
   continua passando `modo="padrao"` (ou omitindo, com esse como default) — comportamento
   inalterado lá.
4. **Fetch da ficha completa**: quando `fichaExibidaId` muda, `CampanhaDetalhe` chama
   `fichaService.recuperarFicha(fichaExibidaId)` (mesma chamada de `VisualizarPage`) para obter
   o `FichaRecuperadaDto` (com `dados` completo) — hoje a página só busca `FichaResumoDto[]`
   (leve, para a lista de membros), insuficiente para alimentar `<app-ficha-visualizacao>`.
5. **Handlers de mutação compartilhados**: os ~19 métodos `ajustar*` que `VisualizarPage`
   (`visualizar.page.ts:575-935`) já implementa — cada um aplicando o ajuste otimista local e
   persistindo via `FichaService` — são extraídos para um serviço/composable reusável (recebe o
   signal da ficha exibida e devolve o conjunto de handlers para os outputs do componente).
   `VisualizarPage` e `CampanhaDetalhe` passam a consumir o mesmo lugar em vez de duplicar as
   ~19 chamadas ao `FichaService`. Quando a ficha exibida não pertence ao usuário (visualização
   de colega compartilhada — item 7) os outputs de escrita ficam inertes: expressa-se via
   `[ajustavel]`/`[podeRolar]` (`false` quando `!podeAjustarFicha(donoIdDaFichaExibida)`), a
   mesma regra que já protege os steppers de Vida/Energia nos mini-cards hoje — o
   próprio componente já esconde os controles de edição quando `ajustavel` é `false` (mesmo
   padrão de `podeGerenciar()` em `visualizar.page.html:162-164`).
6. **Coluna principal (ficha)**: `<app-ficha-visualizacao modo="compacto">` dentro de um card
   com cabeçalho próprio (nome da ficha exibida + botão "Abrir completa" linkando para
   `/painel/:id/ficha/:fichaId` — a rota já existente de `VisualizarPage`) no topo e um botão
   "Abrir ficha completa" ao final; a estrutura interna (Identidade, Vitalidade/Condições,
   Reações, Resistências, Atributos, Inventário/Habilidades/Rolagens) é a própria do componente,
   sem reimplementar nada visualmente — o `modo` compacto (item 3) que resolve a largura e some
   com Prestígio/abas. A mini-aba **Rolagens** não duplica o feed: mostra uma nota apontando para
   a coluna "Sessão" ao lado (item 8).
7. **Botão "Ver ficha" para trocar a ficha exibida**: na coluna lateral estreita (Equipe), cada
   colega com ficha **visível ao usuário atual** ganha um botão "Ver ficha" — esse conjunto é
   exatamente o que `fichasPorMembro()`/`fichas()` já contém hoje (o backend já filtra por
   `listarVisiveisParaUsuario`: a própria + as concedidas via `usuario_ficha_acesso`), **sem
   nenhuma mudança de backend**. Clicar troca `fichaExibidaId` para a ficha daquele colega
   (dispara o fetch do item 4); um destaque (ex. borda/accent) marca de quem é a ficha exibida
   no momento, e um botão "Ver minha ficha" (ou o próprio item do usuário no roster) volta para
   a própria. Colega com mais de uma ficha visível: um botão por ficha.
8. **Coluna lateral larga (450px)** — "Equipe" (roster compacto — avatar pequeno + nome +
   Vida/Energia resumidas dos colegas visíveis, já calculável de `fichasPorMembro()`, sem fetch
   novo) e "Sessão" (as rolagens mais recentes do feed já existente, `rolagensFeed()`).
9. **`max-width: 80vw`** no container principal, mesmo valor da `m2-18`/`m2-19`.
10. Mobile: a coluna lateral empilha abaixo da ficha (mesma ordem, ficha primeiro); a barra
    inferior fixa do componente (m3-60) só lista os destinos que o `modo="compacto"` tem
    (Agente/Inventário/Habilidades/Rolagens) e a página reserva o piso equivalente
    (`--piso-flutuante`) pra bandeja de dados e pro fim da coluna lateral não ficarem cobertos
    por ela.

## Critérios de Aceite

- Jogador abrindo `/painel/:id` vê o card compacto (`modo="compacto"`) da própria ficha como
  conteúdo principal, com edição no próprio lugar funcionando nos campos que o modo compacto
  expõe (Vida/Energia, Dinheiro, Atributos, Inventário/Habilidades/Rolagens — mesmos
  campos/regras da `VisualizarPage`); Informações/Extras/História exigem "Abrir ficha completa".
- "Ver ficha" aparece só para colegas cuja ficha o jogador enxerga (própria + compartilhadas via
  `usuario_ficha_acesso`) — nunca para uma ficha não compartilhada; clicar troca a ficha exibida
  sem navegar de página.
- Ficha de colega exibida via "Ver ficha" é **só leitura** (`ajustavel=false`) quando o usuário
  não é dono nem mestre — nenhum stepper/editor fica clicável indevidamente.
- "Abrir ficha completa"/"Abrir completa" navegam para a rota dedicada da ficha exibida no
  momento (não sempre a própria).
- Nenhuma lógica de mutação de ficha é duplicada entre `VisualizarPage` e `CampanhaDetalhe` —
  ambas consomem o mesmo conjunto de handlers extraído (item 5).
- `modo="compacto"` reduz as colunas internas pra 2 (Identidade+Atributos empilhados ao lado da
  Status), sem Prestígio e sem abas de Status (só Inventário/Habilidades/Rolagens, sempre
  visíveis) — testado numa tela ≥1600px — `VisualizarPage` continua com o comportamento de
  sempre (`modo="padrao"`, 3 colunas largas, todas as abas), sem regressão.
- `max-width: 80vw`; mobile sem scroll horizontal, ficha antes da coluna lateral empilhada.
- `lint`/`test`/`build` do frontend verdes; verificação ao vivo cobrindo troca de ficha,
  permissão de edição e responsividade do modo compacto.

## Fora de Escopo

- Qualquer mudança na regra de visibilidade/permissão de ficha (§14) — "Ver ficha" só expõe o
  que `usuario_ficha_acesso`/posse já autorizavam; nenhum endpoint novo.
- Conceder/revogar acesso de visualização a partir desta tela (fluxo já existe em
  `FichaAcesso`/`m3-04`, fora de escopo aqui).
- A visão de **mestre** deste detalhe — é a `m2-19`.
- Reestilizar `FichaCombos`/abas internas do componente — permanece como está hoje.

## Dependências

- `m2-19` (layout de mestre do mesmo detalhe — o `@if`/`@else` de papel depende dela existir).
- `m2-18` (mesmo `max-width: 80vw`).
- `FichaVisualizacao` (`fichaId`/`nome`/`dados`/`ajustavel`/`podeRolar`/`ehMestre` +
  ~19 outputs `ajuste*`) e `VisualizarPage` (`visualizar.page.ts:575-935`, os handlers a
  extrair).
- `usuario_ficha_acesso`/`FichaRepository.listarVisiveisParaUsuario` (base do conjunto "Ver
  ficha", já implementada, m3-04).
- `m3-27` (feed de rolagens, coluna "Sessão").
