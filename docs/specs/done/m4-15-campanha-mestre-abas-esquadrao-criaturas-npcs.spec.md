# m4-15-campanha-mestre-abas-esquadrao-criaturas-npcs.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, revisão do trabalho de NPC.
> Pedido direto do autor (2026-10-04): na tela da campanha do mestre, a seção "Criaturas e NPCs"
> deve virar **abas, todas no mesmo padrão**, com **ordem** e **tipo** corrigidos e as **ações do
> cartão** revistas. Revisa a integração feita na `m4-09`
> (`docs/specs/done/m4-09-frontend-integracao-fichas-especiais.spec.md`) na visão do mestre.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogos aprovados obrigatórios:** o Esquadrão da mesma tela (`EspectadorFichaCard` em
> `detalhe-mestre.page.html`) como padrão de cartão e de cabeçalho de seção; o primitivo
> `app-abas`/`app-aba` (`shared/ui/abas/`) como barra, com o uso já aprovado em
> `ficha-visualizacao` e `criatura-visualizacao`. Mapear shell, densidade, hierarquia,
> espaçamento, controles, estados, iconografia e comportamento responsivo — não só "usar os
> tokens".

## Objetivo

Hoje o corpo da campanha do mestre empilha o Esquadrão (cartão do espectador) e, logo abaixo, um
`app-cartao` "Criaturas e NPCs" com outro cartão (o do acervo), outro cabeçalho, filtro em select,
botões grandes dentro de cada cartão e lista na ordem do backend, sem indicar o tipo. O resultado
não lê como uma única visão de fichas. Esta task troca isso por **três abas — Esquadrão ·
Criaturas · NPCs —** com a mesma estrutura em cada uma: cabeçalho de seção com contagem e botão de
criar, grade de cartões do mesmo padrão e estado vazio.

## Decisões de abertura

Tomadas com o autor antes da escrita:

1. **Abas, não filtro.** Esquadrão, Criaturas e NPCs são três abas do mesmo bloco. O select
   "Exibir" e o título "Criaturas e NPCs" saem. **Sem aba "Todos"**: o tipo vem da própria aba, e a
   etiqueta de tipo do acervo (`mostrarTipo`, `m4-12`) **não** é usada aqui.
2. **Cartão padrão: o do Esquadrão.** Criatura e NPC passam a usar um cartão do mesmo padrão do
   `EspectadorFichaCard`; só mostram os campos que cada tipo realmente tem — nada inventado.
3. **Ordem A–Z** em Criaturas e NPCs, a mesma do acervo (`m4-12`): `Intl.Collator('pt-BR',
   { sensitivity: 'base' })`, desempate por id. O Esquadrão **mantém** a ordem atual.

## Entregáveis

### 1. Estrutura em abas (`detalhe-mestre.page.html`)

- Dentro de `detalhe-mestre__esquadrao`, `app-abas` com `app-aba` Esquadrão / Criaturas / NPCs, e
  o conteúdo de cada uma em container com `[appAbaPainel]`. Aba inicial: Esquadrão. Colapso
  só-ícone no mobile segundo o primitivo (cada aba precisa de ícone canônico — usar os já
  existentes: `membros`/equivalente de Esquadrão, `alerta` ou o ícone de criatura em uso, `agente`
  para NPC; **confirmar no catálogo de ícones**, sem criar ícone novo).
- Cada aba traz o cabeçalho de seção do Esquadrão (`detalhe-mestre__secao`: título, régua,
  contagem, botão primário de criar): **Novo Agente**, **Nova criatura**, **Novo NPC**, com a
  API completa de `app-botao` (`variante`, `estilo`, `tamanho`, `posicaoIcone`). Os destinos são
  os atuais (`abrirCriarFicha()`, `/campanhas/:id/criatura/nova`, `/campanhas/:id/npc/novo`). O
  texto "atualizado há…" (`textoAtualizacao`) acompanha o cabeçalho como hoje.
- Estado vazio por aba, no padrão `detalhe-mestre__estado`/`app-estado-vazio`: "Nenhuma ficha na
  campanha ainda." (Esquadrão — texto atual), "Nenhuma criatura nesta campanha." e "Nenhum NPC nesta
  campanha." (textos novos, sem inventar regra).
- Esqueleto de carga (`dados.carregando()`): a silhueta acompanha a barra de abas e uma grade; sem
  manutenção paralela do layout.
- Painel lateral (Rolagens/Inventário), coluna de ações e cabeçalho da página **não mudam**.

### 2. Cartões

- **Esquadrão:** `EspectadorFichaCard`, sem mudança.
- **Criatura:** `CriaturaEsquadraoCard` (`componentes/criatura-esquadrao-card/`). Hoje ele **não é
  renderizado em nenhum template** (só aparece em comentário de `detalhe-mestre.page.ts`);
  conferir que continua coerente com o `EspectadorFichaCard` e adotá-lo. Se o recorte
  `FichaResumoDto → CriaturaEsquadraoCardDados` não existir mais, recriar a projeção (função pura,
  com spec), reaproveitando `rotulos-criatura.ts`.
- **NPC:** cartão do mesmo padrão (avatar hachurado com o botão "Abrir ficha", identidade com
  categoria/nível, `app-barra-recurso` de Vida e de Energia, linha de reações, faixa "Última
  rolagem", menu ⋯). Só campos que o NPC tem e que `FichaResumoDto` já entrega — Vida, Energia,
  Defesa, Esquiva, Bloqueio, nível, categoria. **Civil não tem Energia** (`calcularEnergia`
  → 0): a barra não aparece (nenhum "0" fabricado). Contra-Ataque não existe no resumo do NPC e não é exibido. Avaliar **generalizar o
  `EspectadorFichaCard`/`CriaturaEsquadraoCard`** versus criar `NpcEsquadraoCard`; registrar a
  escolha no fecho. Se faltar dado no `FichaResumoDto`, **parar e perguntar ao autor**; não mudar
  contrato por conta própria.
- Controles e chips só por `shared/ui/` com a API completa; nenhum `<button>` nativo estilizado à
  mão. Se algo não for coberto, **parar e perguntar ao autor**.

### 3. Ações do cartão

Substituem os botões grandes do corpo ("Acesso de jogadores", "Ficha rápida") e a nota "Última
rolagem" (a faixa do rodapé do cartão já a mostra):

- **Abrir ficha** (ícone sobre o avatar): criatura abre a janela flutuante, como hoje. A janela
  flutuante **não suporta NPC** (`ficha-flutuante.model.ts`: só `JOGADOR`/`CRIATURA`); para o NPC,
  o ícone abre a **ficha completa em nova aba** (`/campanhas/:campanhaId/npc/:id`). Suportar NPC
  na janela flutuante **fica fora** desta task (vira ideia em `IDEAS.md` ao fechar).
- **Menu ⋯**, o mesmo dropdown já usado no Esquadrão, nos dois tipos: **Abrir ficha completa**,
  **Acesso de jogadores** (abre o diálogo existente de concessão/revogação; só mestre), **Duplicar
  ficha**, **Remover da campanha**, **Excluir ficha**. O menu do NPC passa a existir (hoje só a
  criatura tem). Conferir no backend que duplicar/remover/excluir já funcionam para `NPC` (o
  `duplicarFicha` e a atribuição de campanha já tratam CRIATURA/NPC); se algum não funcionar,
  registrar em `PROBLEMS.md` e **não** corrigir aqui.
- O diálogo "Acesso de visualização" sai de `CampanhaFichasEspeciais` para um componente próprio
  usado pela página do mestre (sem mudar o comportamento, o `FichaAcessoEstadoService`, nem os
  eventos de tempo real). Evitar acrescentar mais responsabilidade a `detalhe-mestre.page.ts`: o
  estado do diálogo e do menu por tipo fica no que for extraído; registrar no fecho a razão se
  ficar na página.

### 4. Ordem A–Z

Função pura única de ordenação por nome (collator acima), usada pelo acervo (`acervo.page.ts`,
hoje com `COMPARADOR_NOME` local) **e** pelas abas Criaturas/NPCs, para não duplicar a regra.
Spec própria cobre acento, caixa e desempate por id.

### 5. `app-campanha-fichas-especiais` e a visão do jogador

`detalhe-jogador.page.html` continua usando `app-campanha-fichas-especiais` (somente leitura,
`gerenciavel` falso). **A visão do jogador não muda nesta task.** O componente perde o ramo de
mestre (botões de criar, filtro de mestre, menu, acesso, nota de rolagem) **somente se** esse ramo
ficar sem uso; nenhum estilo ou código morto fica. Qualquer divergência de ordem/tipo na visão do
jogador entra como ideia em `IDEAS.md`, sem tocar aqui.

## Critérios de Aceite

- Na campanha do mestre, `1920×1080` e `360×800`: três abas na mesma barra; as três com o mesmo
  cabeçalho, a mesma grade e a mesma densidade; criatura e NPC com cartão indistinguível em
  padrão do cartão do Esquadrão; **não parece HTML genérico**.
- Criaturas e NPCs em ordem A–Z (acento e caixa ignorados); contagem de cada aba correta.
- Nenhum campo fabricado: Civil sem barra de Energia; criatura sem Esquiva/Bloqueio/Contra-ataque.
- Ações: Abrir ficha (criatura flutuante, NPC nova aba) e menu ⋯ completo nos dois tipos; acesso de
  jogadores e demais itens funcionam como antes.
- Visão do jogador, coluna de ações, painel lateral, tempo real e backend inalterados.
- Foco visível, navegação por teclado nas abas (primitivo), contraste e alvos de toque ≥ 44 px no
  mobile; sem overflow em nenhum viewport.
- Nenhum código ou estilo morto; nenhum hardcode; todo controle com o primitivo e inputs certos.

## Verificação exigida

- **Testes:** `detalhe-mestre.page.spec.ts` (abas, contagens, ordem, ações por tipo, estados
  vazios, esqueleto), specs dos cartões, da função de ordenação, do diálogo de acesso extraído e de
  `campanha-fichas-especiais.component.spec.ts` (jogador sem regressão); `acervo.page.spec.ts`
  continua verde com a ordenação compartilhada. Reaproveitar as asserções existentes; só
  estrutura e seletores mudam.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em `1920×1080`
  **e** `360×800`: cada aba com dados e vazia; criatura, NPC combatente e NPC Civil; menu ⋯ aberto
  em cada tipo (no último cartão: abre para cima quando falta espaço); diálogo de acesso;
  "Abrir ficha" de criatura (janela flutuante) e de NPC (nova aba); esqueleto de carga; painel
  lateral convivendo com as abas; mobile com abas só-ícone. Comparação com o Esquadrão registrada
  no fecho. O agente principal inspeciona pessoalmente.
- Estado persistido em `localStorage` (a aba ativa **não** é persistida nesta task; confirmar que
  nada novo é gravado).
- O app real precisa estar rodando; reaproveitar o stack já no ar e **avisar o autor** antes de
  subir outro (ver `verify`).

## Fora de Escopo

- A visão do jogador (`detalhe-jogador`) e a do espectador.
- Janela flutuante para NPC (ideia a registrar ao fechar).
- Guia de criação de NPC (`m4-13`), ficha completa de NPC (`m4-14`), acervo além de consumir a
  ordenação compartilhada (`m4-12`).
- Backend, DTOs, rotas, permissões e tempo real.
- Aba "Todos", filtro e etiqueta de tipo nesta tela.

## Dependências

- `m4-09` (`done`) — a integração atual; `m4-10` (`done`) — refinamento mobile que precisa
  sobreviver; `m4-12` (`done`) — ordenação A–Z e rótulos de tipo.
- `m4-13` e `m4-14` são independentes desta.
