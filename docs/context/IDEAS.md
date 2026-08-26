# IDEAS.md — Insights e Ideias

> **O que este arquivo é:** o lugar onde ideias levantadas durante uma conversa **não se perdem**.
> Um insight que apareceu no meio de outra task, uma feature que alguém imaginou, uma direção que
> vale considerar um dia. Nada aqui é compromisso.
>
> **A porta de saída importa mais que a entrada.** Quando uma ideia amadurece, ela vira uma spec em
> `docs/specs/backlog/` e **sai da lista de abertas**, indo para "Promovidas" com o link da spec.
> Sem isso, este arquivo vira um segundo backlog concorrente e o `docs/specs/backlog/` deixa de ser
> a fila real.
>
> **O que NÃO entra aqui:** trabalho já decidido (isso é spec no backlog), bug ou dívida (isso é
> [`PROBLEMS.md`](PROBLEMS.md)), e decisão já tomada (isso é `CONTEXT.md` §5).
>
> **Formato de entrada** — copie o bloco abaixo:
>
> ```markdown
> ### I-0NN — <título curto> · <área>
>
> - **Ideia:** o que é, em uma ou duas frases.
> - **Origem:** de onde saiu (task, conversa, observação de uso).
> - **Por quê:** que problema real ela resolveria — se não houver, provavelmente não é uma ideia.
> - **Custo aparente:** o que ela exigiria (schema novo? motor novo? só UI?).
> ```

---

## Abertas

### I-001 — Campanha com status, briefing e log de atividade · campanha

- **Ideia:** dar à campanha os elementos que os protótipos aprovados já desenham mas o sistema não
  tem: **status** (ao vivo / agendada / pausada), um **briefing** textual, um **log de atividade** e
  um **indicador de membro online**.
- **Origem:** `m2-09` e `m2-15` — esse conteúdo aparece em `docs/design/examples/` e foi
  deliberadamente deixado de fora das duas tasks por não existir dado real que o alimentasse.
- **Por quê:** hoje a tela de campanha mostra pouco mais que nome, descrição e membros. Estes quatro
  elementos são exatamente o que transformaria a lista em um painel com informação de verdade — e o
  desenho deles já foi aprovado.
- **Custo aparente:** schema novo em `campanha` (status, briefing) e provavelmente uma tabela de
  eventos para o log. O indicador online sai de graça do gateway WebSocket que já existe. As specs
  `m2-18`/`m2-19`/`m2-20` do backlog atacam a mesma tela e podem absorver parte disto.

### I-002 — Passe de redução do bundle inicial · frontend

- **Ideia:** auditar o que está no chunk inicial do frontend e empurrar para lazy o que não é
  necessário no primeiro paint, em vez de continuar elevando o budget.
- **Origem:** observação recorrente ao longo de `m1-06`…`m3-27` — ver `PROBLEMS.md` `P-004`.
- **Por quê:** o budget já subiu quatro vezes. Ele deixou de ser um limite e virou um registro do
  que aconteceu, o que anula a razão de existir dele.
- **Custo aparente:** só frontend, sem schema nem regra. Provavelmente uma task de meio dia com
  `source-map-explorer` na frente.

### I-003 — Registrar trabalho que chega por PR sem passar pelo fluxo de spec · processo

- **Ideia:** decidir o que fazer com trabalho vindo de branches `claude/*` mergeadas por PR, que
  hoje não atualiza documentação nenhuma. Ou o merge passa a exigir o registro, ou fica explícito
  que essa via é não-documentada.
- **Origem:** `PROBLEMS.md` `P-002` — 11 commits reais entraram sem registro depois da `m3-27`.
- **Por quê:** o `HISTORY.md` só vale se for completo. Um histórico com buracos silenciosos é pior
  que um histórico assumidamente parcial, porque ninguém sabe onde estão os buracos.
- **Custo aparente:** zero de código. É uma decisão de processo — possivelmente uma linha no
  `CLAUDE.md` ou um item no template de PR.

### I-004 — Venda de Fragmentos na ficha · ficha/fragmentos

- **Ideia:** dar ao inventário da ficha um botão "Vender" num fragmento portado, usando o cálculo de
  `shared/regras/compras/venda.ts` (`obterValorFragmento`/`calcularVendaFragmentos`) que já existe e
  já é testado — hoje só está acoplado à calculadora M1 de criação de personagem.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — a regra e a tabela de preços existem, só
  não há caminho de UI na ficha viva.
- **Por quê:** um agente em campanha acumula fragmentos que não pretende usar; hoje a única forma de
  convertê-los em dinheiro é sair da ficha e recalcular na tela de criação.
- **Custo aparente:** só frontend — reusar `venda.ts` (`shared`) e o padrão de painel de ação já
  usado por "Aplicar em..."/"Consumir" (`ficha-inventario.component.ts`).

### I-005 — Identificação de Poder de fragmentos · ficha/fragmentos

- **Ideia:** modelar o estado "fragmento não identificado" e o teste de Intelecto (DT 15 + 5 por
  módulo acima de V) que o doc exige para revelar o que um fragmento faz.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — hoje todo fragmento nasce "identificado":
  módulo, tipo e função ficam visíveis assim que o item existe na ficha.
- **Por quê:** é uma peça de suspense/risco do sistema original (o doc — "⬥ Identificação de Poder")
  que a implementação atual pula inteiramente, achatando a descoberta de fragmentos a uma decisão
  sem custo.
- **Custo aparente:** schema (flag `identificado` no item + módulo/tipo "ocultos" até então) e UI de
  teste — médio, mexe em como o item é exibido antes/depois de identificado.

### I-006 — Auto-desacoplamento e redução de módulo ao perder uso · ficha/fragmentos

- **Ideia:** quando o item hospedeiro de um fragmento Potencializador "perde seu uso" (destruído/
  quebrado/gasto — o doc não define o gatilho exato para itens não-consumíveis), o fragmento deveria
  se desacoplar sozinho e cair 1 módulo, mantendo o custo de Energia do módulo antigo.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1934`.
- **Por quê:** hoje um fragmento acoplado fica preso ao item para sempre (só remoção manual), e a
  ficha não rastreia "uso"/durabilidade de item nenhum — implementar isso exigiria primeiro decidir
  o que "perder o uso" significa mecanicamente para itens não-consumíveis, o que o doc não deixa
  claro e não deveria ser decidido de forma isolada.
- **Custo aparente:** precisa de uma primitiva de "durabilidade/uso de item" que não existe hoje —
  provavelmente maior que qualquer outra peça isolada de fragmentos.

### I-007 — Colapso e transformação em criatura · ficha/fragmentos

- **Ideia:** a cadeia final da Afinidade — morrer em Anomalia Biológica leva a "Colapso", e o
  agente se transforma numa criatura conforme a faixa de Afinidade (Ameaça Baixa a Apocalíptica).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1962-1968`. A
  `m3-67` cobre o Limite Mínimo de Energia e a Anomalia Biológica, mas para explicitamente antes
  desta parte.
- **Por quê:** é essencialmente "fim da ficha de jogador" — sai do modelo de ficha de agente para
  algo parecido com ficha de criatura/NPC (`m4-ficha-criatura-npc.spec.md`, ainda backlog). Faz mais
  sentido revisitar quando aquele milestone existir de verdade, em vez de modelar uma transformação
  para um sistema que ainda não tem forma.
- **Custo aparente:** alto — depende de `m4` existir primeiro.

### I-008 — Forja de Fragmentos e Fragmento Módulo ∅ · ficha/fragmentos

- **Ideia:** um local de base (Forja) onde combinar N fragmentos de um módulo em 1 de módulo
  superior, e a receita especial do Fragmento Módulo ∅ (propriedades negociadas com o Mestre).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1990-2005`.
- **Por quê:** é um sistema de crafting inteiro (gate de patente, consumo de N itens, custo em
  dinheiro, uma tela/local novo) que não cabe dentro do componente de inventário atual — mais perto
  de merecer sua própria spec de UI (tela de "Base"/LDA) do que de ser espremido na ficha.
- **Custo aparente:** alto — motor (fácil, tabela de proporções) + UI nova (uma tela de base que
  ainda não existe no app).

### I-009 — Redução de Módulo de fragmentos · ficha/fragmentos

- **Ideia:** as duas formas do doc de reduzir o módulo de um fragmento: via uso em item consumível
  (ex.: granada — reduz 1 módulo, mas mantém o custo de Energia do módulo acima) e via redução
  sintética no LDA (patente Força Tarefa+, 50% do valor de venda + espera de uma missão, gera 2
  fragmentos do módulo inferior).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1982-1988`. Chegou
  a ter uma spec dedicada (`m3-68`), removida do backlog por decisão do autor.
- **Por quê:** a via do item consumível é cálculo puro simples, mas a via do LDA depende de "esperar
  uma missão" — conceito que não existe em nenhum outro lugar do app hoje (sem sistema de missões).
  Modelar isso exigiria inventar uma simplificação (ex.: liberação manual pelo Mestre) sem um
  sistema de missão real para ancorar a decisão.
- **Custo aparente:** médio — motor fácil (duas funções puras + tabela de custo do LDA reusando
  `venda.ts`); a parte incerta é a UI/estado da espera do LDA sem um sistema de missão existente.

### I-010 — Granularidade na permissão de visualização de ficha · ficha/acesso

- **Ideia:** hoje o "Acesso de Visualização" (`FichaAcessoResumoDto`, m3-04) é binário — quem
  recebe acesso vê a ficha inteira (exceto `CAMPOS_PRIVADOS_FICHA`, sempre omitidos) ou não vê
  nada. Dar ao dono/mestre controle mais fino sobre o que cada concessão libera (ex.: só
  status/vitalidade, sem inventário/anotações; ou histórico/identidade escondidos de alguns
  membros).
- **Origem:** pedido do autor ao revisar o menu "⋯" do painel de campanha (2026-08-08) — junto do
  pedido de trazer as ações de ficha (remover/excluir) e o "Acesso de visualização" para fora da
  ficha completa, para o painel do jogador (ver
  `docs/superpowers/specs/2026-08-08-painel-jogador-acoes-ficha-design.md`).
- **Por quê:** a granularidade atual força tudo-ou-nada; um dono que quer compartilhar só parte da
  ficha (ex.: vitalidade para o grupo, mas não o histórico pessoal) não tem opção hoje.
- **Custo aparente:** médio-alto — schema (uma concessão precisaria guardar quais seções/campos
  libera, não só o `usuarioId`) + UI de seleção nos dois lugares que hoje mostram a dialog de
  acesso (`visualizar.page` e, desde este pedido, `campanha/detalhe.page`) + `validarPermissaoVisualizacao`
  no backend teria que aplicar o recorte por seção, não só por `CAMPOS_PRIVADOS_FICHA` fixo.

### I-012 — Foto de contrato, separada do avatar do jogador · ficha/avatar

- **Ideia:** um segundo campo de imagem na ficha, a "foto de contrato" — só o **mestre** define/
  troca essa foto (nunca o dono), distinta do avatar (`imagem_url`, `m3-62`) que o **jogador**
  escolhe e que todo mundo vê hoje. As duas convivem na mesma ficha, com dono de escrita diferente.
- **Origem:** pedido do autor logo após a `m3-62` (avatar da ficha) entrar no ar.
- **Por quê:** hoje só existe um avatar, editável por dono ou mestre — não há como o mestre registrar
  uma imagem "oficial"/de dossiê sem sobrescrever a que o próprio jogador escolheu (ou vice-versa).
- **Custo aparente:** médio — reusa a maior parte do que a `m3-62` já construiu (armazenamento,
  validação de MIME/tamanho, endpoint multipart), mas precisa de uma segunda coluna
  (`ficha.imagem_contrato_url`?), um segundo par de endpoint dedicado com permissão **mestre-only**
  (distinta de `validarPermissaoEdicao`, que hoje deixa dono e mestre editarem igual) e decidir onde
  ela aparece na UI (cabeçalho? aba própria?) — ainda não especificado.

### I-014 — M8 sugerido: documentos e anotações de campanha · campanha/documentos

- **Ideia:** criar um módulo de documentos da campanha — possivelmente M8 — no qual o mestre possa
  cadastrar conteúdo em texto ou imagem, compartilhar documentos selecionados com os jogadores e
  oferecer aos jogadores uma biblioteca dos documentos recebidos dentro da própria campanha. Os
  **cadernos privados** que antes faziam parte desta ideia já foram especificados separadamente em
  `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`.
- **Origem:** conversa com o autor em 2026-08-11, ao levantar módulos futuros para a plataforma.
- **Por quê:** materiais de sessão, pistas, handouts e notas de preparação ficam hoje fora do
  sistema. Centralizá-los preserva o contexto da campanha e permite controlar claramente o que é
  privado do mestre e o que já foi revelado aos jogadores.
- **Custo aparente:** alto — modelo de documento e de compartilhamento/visibilidade, upload e
  armazenamento de imagens e biblioteca por campanha. A
  busca textual inicial será feita no **PostgreSQL**, que continua como fonte de verdade: `tsvector`,
  consulta amigável e índice GIN, sempre recortados pelas permissões da campanha. Ainda falta decidir
  quais formatos de documento são aceitos e se haverá versionamento ou organização por pastas/tags.
  A numeração M8 é sugestão, não decisão de roadmap.
- **Evolução futura — Elasticsearch:** permanece uma opção para busca semântica/híbrida, maior
  sofisticação de relevância ou volume que justifique um índice separado. Nesse cenário, PostgreSQL
  continua autoritativo e Elasticsearch é projeção reconstruível, sincronizada em criação, alteração
  e remoção e filtrada pelas permissões antes da consulta. A especificação futura deverá validar
  hospedagem, sincronização/reindexação, divisão em trechos, embeddings e tratamento de exclusões.
- **Upgrade futuro — mesa investigativa/mapa mental:** depois da biblioteca básica, os documentos
  poderiam existir também numa superfície virtual colaborativa. Os jogadores organizariam textos,
  imagens e pistas livremente, colocariam itens lado a lado, criariam conexões visuais entre eles e
  acrescentariam anotações próprias, formando um mapa mental da investigação ou da campanha. Esse
  upgrade exigiria posicionamento livre, persistência do layout, conexões entre nós, colaboração em
  tempo real e regras de edição/visibilidade. É uma evolução da M8 centrada em conhecimento e pistas,
  distinta do tabletop tático da M10, que é centrado em mapas, tokens e posicionamento de cena.

### I-015 — M9 sugerido: assistência por IA · inteligência artificial

- **Ideia:** integrar assistência de IA — possivelmente como M9 — em diferentes pontos do produto:
  no guia de criação de personagem, como ajuda para dúvidas sobre o sistema e como ferramenta de
  escrita e preparação para o mestre.
- **Origem:** conversa com o autor em 2026-08-11, ao levantar módulos futuros para a plataforma.
- **Por quê:** uma assistência contextual pode reduzir a barreira de entrada nas regras, apoiar a
  criação de personagens e acelerar a preparação de campanhas, aproveitando os documentos do
  sistema e o contexto que já existe na plataforma.
- **Custo aparente:** alto e ainda exploratório — integração com provedor, desenho de contexto e
  permissões, custos e limites de uso, privacidade dos dados da campanha, prevenção de respostas
  incorretas sobre regras e UX específica para cada caso. Provedor ainda não definido (Gemini,
  OpenAI ou outro); também falta decidir se será uma experiência única ou recursos independentes.
  A numeração M9 é sugestão, não decisão de roadmap.

### I-016 — M10 sugerido: tabletop virtual e biblioteca de tokens · campanha/mapa

- **Ideia:** criar um tabletop virtual — possivelmente como M10 — no qual o mestre possa montar ou
  carregar um mapa e posicionar, mover e gerenciar os tokens dos participantes da cena. Cada agente
  teria uma biblioteca própria de imagens de token, com upload de múltiplas opções e seleção do
  token que será exibido no tabletop em cada momento.
- **Origem:** conversa com o autor em 2026-08-11, ao levantar módulos futuros para a plataforma.
- **Por quê:** o controle de cenas e iniciativas organiza o estado narrativo e mecânico, mas ainda
  deixa a representação espacial fora do sistema. Um tabletop integrado permitiria conduzir
  posicionamento e movimentação usando diretamente as fichas, cenas e participantes da campanha;
  múltiplos tokens por agente também cobririam mudanças de aparência, equipamento ou estado sem
  substituir permanentemente a imagem principal da ficha.
- **Custo aparente:** muito alto — canvas ou superfície interativa, upload e armazenamento de mapas
  e tokens, associação dos tokens às fichas, sincronização em tempo real, controles de zoom e
  movimentação, permissões e UI de mestre/jogador. Ainda precisa decidir suporte a grade e medidas,
  camadas, obstáculos, áreas, névoa de guerra/visibilidade, vínculo com cenas e iniciativa, quem pode
  mover cada token e se a escolha do token ativo pertence ao jogador, ao mestre ou a ambos. Também
  precisa definir limites e tratamento das imagens enviadas. A numeração M10 é sugestão, não decisão
  de roadmap.

### I-017 — M11 sugerido: Base, esquadrões e histórico operacional · campanha/organização

- **Ideia:** representar a estrutura institucional da Fundação acima das campanhas: uma **Base da
  Fundação** contém **esquadrões**; um esquadrão reúne seus **agentes** e possui um histórico de
  **missões/campanhas**. A experiência seria inicialmente mais documental e histórica do que
  mecânica, dando uma existência concreta ao Esquadrão 251 e à trajetória de suas operações, em vez
  de transformar a Base desde o começo num conjunto de loja, enfermaria, reparos e outros serviços.
- **Origem:** conversa com o autor em 2026-08-11, ao refinar a sugestão de uma possível M11.
- **Por quê:** hoje o esquadrão existe implicitamente dentro da campanha, e a ficha do agente não
  informa a qual esquadrão ele pertence. Isso inverte a hierarquia percebida: conceitualmente, a
  Base contém o esquadrão, o esquadrão reúne agentes e participa de missões ou campanhas. Tornar essa
  estrutura explícita cria identidade coletiva, preserva o histórico entre operações e permite
  acompanhar o esquadrão mesmo quando campanhas acabam ou agentes mudam.
- **Custo aparente:** médio-alto — novas entidades/relacionamentos para Base e Esquadrão, vínculo e
  histórico de participação dos agentes, reorganização da navegação e migração do conceito hoje
  implícito em campanha. O primeiro corte pode ser essencialmente documental: identidade da Base e
  do esquadrão, membros atuais e antigos, campanhas/missões associadas e linha histórica. Serviços
  mecânicos da Base não fazem parte do núcleo e poderiam ser upgrades independentes.
- **Decisões abertas:** definir se “campanha” e “missão” são a mesma entidade em durações diferentes
  ou se a campanha contém missões; se um agente pode mudar de esquadrão preservando histórico; se
  uma campanha pode envolver mais de um esquadrão; e se o vínculo pertence à ficha, ao usuário ou a
  uma participação histórica própria. Embora chamada provisoriamente de M11, a ideia também pode ser
  tratada como uma ampliação tardia da M2. A numeração indica agrupamento de escopo, não dependência:
  M7–M11 podem ser executadas em outra ordem — por exemplo, IA não depende obrigatoriamente de
  documentos.

### I-022 — Caderno: importar em lote, arrastar-e-soltar e exportar `.md` · campanha/caderno

- **Ideia:** depois da importação de **um** arquivo Markdown por vez
  (`docs/specs/done/caderno-importar-markdown.spec.md`), ampliar o trânsito de arquivos do
  Caderno: selecionar vários `.md` de uma vez (uma página por arquivo), arrastar-e-soltar arquivos
  sobre a janela do Caderno, e o caminho inverso — exportar uma página (ou o caderno inteiro) como
  `.md`/`.zip`.
- **Origem:** recortado explicitamente do escopo de `caderno-importar-markdown.spec.md` (2026-08-25),
  para a primeira entrega ficar em um fluxo só.
- **Por quê:** quem já mantém notas fora do sistema (Obsidian, pasta de `.md`) traz um diretório
  inteiro, não um arquivo; e sem exportação o conteúdo entra no Caderno mas não sai dele.
- **Custo aparente:** só frontend. Lote pede resultado por arquivo (sucesso/erro parcial) e algum
  indicador de progresso; arrastar-e-soltar pede zona de soltura e estados de hover na janela
  flutuante; exportação de caderno inteiro pede empacotamento no navegador. Nenhuma mudança de
  schema, endpoint ou contrato.

---

## Promovidas

Ideias que viraram spec. Ficam aqui só para não serem reinventadas.

| Ideia | Virou | Quando |
|---|---|---|
| I-011 — Colorir os dadinhos do pool por tipo de dano | implementado direto (pedido pequeno o bastante pra pular a spec formal) — ver `HISTORY.md` | 2026-08-11 |
| I-013 — M7 sugerido: cenas e controle de combate | milestone **M7 — Encontro de Combate**, concluído (`m7-01`…`m7-20`, `docs/specs/done/`; `docs/specs/backlog/m7-encontro-combate.spec.md`) | 2026-08-24 |
| I-018 — Inventário de esquadrão sem esperar o módulo de Base | implementado (`docs/superpowers/specs/2026-08-12-inventario-de-esquadrao-design.md`; componentes `inventario-esquadrao`/`inventario-esquadrao-sidebar`) | 2026-08-24 |
| I-019 — Topbar: renomear "Painel", ícone próprio de Fichas, limpar menu de perfil | `docs/specs/backlog/renomear-painel-para-campanhas.spec.md` (escopo ampliado em 2026-08-25 para incluir a rota `/painel`→`/campanhas`, não só o rótulo) | 2026-08-24 |
| I-020 — Preservar itens modificados no inventário de esquadrão | `docs/specs/backlog/preservar-modificacoes-inventario-esquadrao.spec.md` | 2026-08-24 |
| I-021 — Descrição textual das modificações no item do inventário | implementado (`docs/specs/done/descricao-modificacoes-item-inventario.spec.md`) | 2026-08-24 |

---

## Descartadas

Ideias consideradas e recusadas, com o motivo. Serve para não voltarem sozinhas.

*(Nenhuma ainda.)*
