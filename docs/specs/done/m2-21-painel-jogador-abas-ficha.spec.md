# m2-21-painel-jogador-abas-ficha.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-20) — task `m2-21`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

A `m2-20` entregou a visão de **jogador** de `/painel/:id`: `<app-ficha-visualizacao modo="compacto">`
na coluna principal e uma lateral de 450px com **Equipe** + **Sessão**. O modo compacto resolveu a
largura empilhando Identidade+Atributos numa `coluna-agente` e desligando as abas do card de Status
— Inventário/Habilidades/Rolagens passaram a ficar **sempre visíveis, um embaixo do outro**, e o
glance de Combate (Deslocamento/Hab. por Turno/Percepção/Dano Furtivo/Dano C. a C.) foi realocado
pra dentro do card de Atributos porque a aba Informações deixou de existir.

O resultado é uma coluna 1 altíssima (Identidade + Vitalidade + Reações + Resistências + Atributos +
Combate) contra uma coluna 2 que rola sem fim. Esta task **religa as abas no modo compacto**, com um
conjunto reduzido, e redistribui o conteúdo: Atributos e Combate voltam pra coluna 2 numa aba
**Informações**, e **Rolagens sai do card** pra viver na lateral, entre Equipe e Sessão — junto do
histórico da sessão, que é onde a rolagem é lida.

Fecha também um buraco de fluxo: hoje o jogador que chega numa campanha **sem ficha** não tem como
criar nem vincular uma sem sair da página. Ganha um menu "⋯" no cabeçalho com as duas ações — sem
nenhuma mudança de backend.

## Entregáveis

1. **Abas reduzidas no `modo="compacto"`** de `FichaVisualizacao`. Não é uma barra nova: é o mesmo
   mecanismo `abaStatusAtiva`/`selecionarAbaStatus`/`ABAS_STATUS` que o `modo="padrao"` já usa, hoje
   desligado por `@if (modo() !== 'compacto')`
   (`ficha-visualizacao.component.html:1113`) e pelos `@if (modo() === 'compacto' || ...)` que forçam
   Inventário/Habilidades/Rolagens simultâneos (`:1289`, `:1315`, `:1330`). O compacto passa a expor
   **três** abas, nesta ordem:

   | Aba | Conteúdo no compacto |
   |---|---|
   | Informações | Atributos (+ Proficiência/Maestria) · Combate · Anotações |
   | Inventário | `<app-ficha-inventario [compacto]="true">`, como hoje |
   | Habilidades | `<app-ficha-habilidades [compacto]="true">`, como hoje |

   Rolagens sai do card (item 3). Extras/História continuam fora do compacto — só na ficha completa.
   O `modo="padrao"` mantém as seis abas e o comportamento atual, sem regressão.

2. **Aba Informações do compacto** — composição própria, diferente da aba homônima do
   `modo="padrao"` (que tem glance editável + `app-ficha-sanidade` + Anotações):
   - **Atributos**: o `.ficha-visao__coluna--atributos` inteiro **migra da coluna 1 pra dentro desta
     aba** — Proficiência + Maestria + os 10 atributos em 2 colunas internas, com teste rolado e
     edição em grupo pelo lápis, exatamente como hoje. Some do `&__coluna-agente`, que volta a ser
     só **Identidade + Vitalidade/Condições + Reações + Resistências**.
   - **Combate**: o bloco `ficha-combate-rapido--cinco` alimentado por `statusRapido()`
     (`ficha-visualizacao.component.html:1061-1098`) sai de dentro do card de Atributos e vira uma
     seção própria da aba. Continua **só leitura** — sem o lápis de editar da ficha completa —, com
     o botão de rolar preservado em Dano Furtivo e Dano C. a C.
   - **Anotações**: o bloco `ficha-status__anotacoes-caixa` da aba Informações do `modo="padrao"`
     (`:1252-1287`), **editável no próprio lugar** (mesma edição inline da m3-32). O bloco já vem
     com `@if (ajustavel())` — ficha de colega em leitura não mostra nem a caixa (o backend nem
     manda `dados.anotacoes` pro visualizador, m3-51).

   Ficam **fora** desta aba, de propósito: `app-ficha-sanidade` (Sequelas/Traumas/Lesões), o lápis de
   edição do glance de Combate e um bloco de Nível/Prestígio — tudo continua só na ficha completa.

3. **Card "Rolagens" na lateral, entre Equipe e Sessão.** A lateral de 450px passa a empilhar
   **Equipe → Rolagens → Sessão**. O card novo tem `max-height` e scroll próprio com
   `appOverflowFade`, o mesmo tratamento que Equipe e Sessão já recebem, pra que os três caibam sem
   empurrar Sessão pra fora da tela. Conteúdo: o toggle "Rolagem oculta" + `<app-ficha-rolagens>` —
   isto é, o que a aba Rolagens do compacto renderiza hoje, menos a nota
   `ficha-rolagem-nota` ("Histórico da sessão na coluna Sessão, ao lado"), que perde o motivo de
   existir.

4. **`<app-ficha-rolagens-painel>`** (`frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/`)
   — componente fino que existe pra que o item 3 não duplique lógica derivada. Recebe `dados`
   (`FichaDadosDto`) + `editavel`/`podeRolar` e deriva internamente `atributosEfetivos`,
   `proficiencia` e `atalhosDano` chamando as mesmas funções puras que `FichaVisualizacao` chama
   hoje (`ficha-visualizacao.component.ts:866,881,1073,1263`): `calcularAtributosEfetivos` e
   `calcularProficiencia` de `shared/regras`, e `normalizarEntrada`/`montarInformacoesExtras` de
   `frontend/src/app/modules/ficha/status-derivado.ts`. Nenhuma dessas funções muda de lugar — o
   componente novo só as chama. Renderiza o toggle "Rolagem oculta" + `<app-ficha-rolagens>` e repassa os
   outputs `rolagensMudou`/`energiaGasta`/`rolagemFeita`. **Dois consumidores**: a aba Rolagens do
   `modo="padrao"` (que passa a delegar pra ele, sem mudança visual) e a lateral de
   `CampanhaDetalhe`. Nenhum `computed` de rolagem fica duplicado entre os dois lugares.

5. **`FichaRolagemRegistroService`** (`frontend/src/app/modules/ficha/`) — carrega o signal
   `oculta` e o `registrar()` que hoje vivem em `FichaVisualizacao`
   (`ficha-visualizacao.component.ts:901-937`). A extração é necessária, não cosmética: o toggle
   "Rolagem oculta" passa a morar na **lateral** enquanto `rolarTesteAtributo` e `rolarDano`
   continuam disparando de **dentro do card** (`:1041`, `:1062`) — os dois precisam ler a mesma
   flag e postar pelo mesmo caminho. Mesmo padrão de extração compartilhada que o
   `FichaEdicaoService` da m2-20 estabeleceu (`detalhe.page.ts:136,490`), inclusive a inicialização
   com o signal da ficha exibida e o `fichaId` corrente. `FichaVisualizacao` e `CampanhaDetalhe`
   injetam o serviço; a emissão de `rolagemRegistrada` pra bandeja/feed segue igual.

6. **Menu "⋯" do jogador no cabeçalho**, ao lado do botão de voltar às campanhas
   (`detalhe.page.html:37`) — mesmo lugar e mesma marcação de dropdown que o mestre já tem
   (`:48-79`, `menuCampanhaAberto`/`alternarMenuCampanha`). Aparece quando `!ehMestre()`, sempre
   (não só quando o jogador está sem ficha), com dois itens:
   - **Criar nova ficha** → abre o `<app-ficha-criar-dialog>` que **já está montado nesta página**
     (`:635-644`), hoje alcançável só pelo mestre; passa `[podeEscolherDono]="false"` (o dono é o
     próprio usuário) e reusa o `criarFicha()` existente (`detalhe.page.ts:896`).
   - **Vincular ficha existente** → dialog novo com um select das fichas do acervo do usuário,
     descrito no item 7.

7. **Dialog "Vincular ficha existente"** — usa `fichaService.listarMinhasFichas()` e mostra
   **apenas** as fichas com `campanhaId === null` (acervo solto, m3-28). Confirmar chama
   `fichaService.atribuirCampanha(fichaId, campanhaAtual.id)`. **Nenhum endpoint novo**: os dois já
   existem (`ficha.controller.ts` `PUT :id/campanha`, `ficha.service.ts:65,140`). Acervo vazio não
   renderiza um select vazio: mostra estado vazio ("Você não tem fichas fora de campanha") com link
   pro acervo. Jogador com ficha na campanha continua podendo vincular outra — a lateral já suporta
   múltiplas fichas por membro desde a m2-20.

8. **Pós-ação (itens 6 e 7)**: criar ou vincular recarrega `fichas()` da campanha e aponta
   `fichaExibidaId` pra ficha recém-adicionada (disparando o fetch de `recuperarFicha` que a m2-20
   já wireou), de modo que ela aparece na coluna principal sem recarregar a página. O estado vazio
   "Você ainda não tem uma ficha nesta campanha" (`detalhe.page.html:552`) ganha um atalho pras
   mesmas duas ações do menu.

9. **Mobile — adaptação do visual atual**, sem layout dedicado (fica pra uma task futura). A barra
   inferior fixa (m3-60) mantém **cinco destinos** no compacto: `agente`, `informacoes`,
   `inventario`, `habilidades`, `rolagens`. `COMPACTO_DESTINOS_MOBILE`
   (`ficha-visualizacao.component.ts:227-232`) ganha `'informacoes'` e mantém `'rolagens'`. Os
   quatro primeiros trocam a aba do card como sempre; **`'rolagens'` é o único destino que não é uma
   aba** — no compacto ele não altera `abaStatusAtiva` nem o `#` da URL, só emite `abaStatusMudou`,
   e `CampanhaDetalhe` reage rolando a página até o card Rolagens da lateral. A lateral empilha
   abaixo da ficha na ordem Equipe → Rolagens → Sessão. O `--piso-flutuante` já reservado pela
   m2-20 continua cobrindo barra + bandeja de dados.

## Critérios de Aceite

- No painel de jogador, a segunda coluna do card compacto tem uma barra com **Informações ·
  Inventário · Habilidades**; só a aba ativa renderiza (nada de três blocos empilhados).
- A aba Informações mostra Atributos (com Proficiência/Maestria, teste rolado e lápis de edição),
  o glance de Combate só leitura com os dois botões de rolar dano, e Anotações editáveis inline.
- A coluna 1 do compacto termina em Resistências — Atributos e Combate não aparecem mais lá.
- A lateral tem **Equipe, Rolagens e Sessão** nessa ordem; Rolagens rola dentro do próprio card sem
  empurrar Sessão pra fora da área visível numa tela de 900px de altura.
- Rolar do card Rolagens da lateral registra no feed e aparece na bandeja de dados; o toggle
  "Rolagem oculta" da lateral também afeta as rolagens disparadas de dentro do card (teste de
  atributo, dano) — uma flag só, um caminho de registro só.
- `modo="padrao"` (`VisualizarPage`) segue com as seis abas, Rolagens inclusa, sem mudança visual —
  agora renderizada por `<app-ficha-rolagens-painel>`.
- Nenhum `computed` de rolagem (`atributosEfetivos`/`proficiencia`/`atalhosDano`) e nenhum registro
  de rolagem fica duplicado entre `FichaVisualizacao` e `CampanhaDetalhe`.
- O "⋯" aparece pro jogador ao lado do voltar e **não** aparece pro mestre no lugar do menu dele.
  "Criar nova ficha" abre o assistente sem seletor de dono; "Vincular ficha existente" lista só
  fichas com `campanhaId === null` e, ao confirmar, a ficha passa a aparecer na Equipe e na coluna
  principal sem recarregar a página.
- Acervo sem fichas soltas mostra estado vazio no dialog, não um select vazio.
- Mobile: barra inferior com cinco destinos; tocar em Rolagens rola até o card da lateral em vez de
  trocar a aba; sem scroll horizontal em 360px.
- `lint`/`test`/`build` do frontend verdes; verificação ao vivo (`.agents/skills/verify/SKILL.md`)
  cobrindo troca de aba, rolagem pela lateral, criar/vincular ficha e a barra mobile.

## Fora de Escopo

- **Qualquer mudança de backend.** Criar e vincular ficha usam endpoints existentes (m3-28); a
  visibilidade de ficha continua a da m2-20/§14.
- Layout **dedicado** ao mobile — esta task só adapta o visual atual; um recorte pensado pra
  celular é uma task futura.
- A visão de **mestre** deste detalhe (m2-19) e o `modo="padrao"` da ficha completa, além da
  delegação do item 4.
- Sequelas/Traumas/Lesões, Extras e História no card compacto — seguem exclusivas da ficha completa.
- Desvincular ficha da campanha pelo menu do jogador (o mestre já tem "Remover da campanha" no
  kebab da ficha, `detalhe.page.html:670-679`).

## Dependências

- `m2-20` (card compacto, lateral Equipe/Sessão, `FichaEdicaoService`, `fichaExibidaId` e o fetch de
  `recuperarFicha` — tudo que esta task rearranja).
- `m3-60` (barra inferior mobile e `DESTINOS_MOBILE`/`COMPACTO_DESTINOS_MOBILE`).
- `m3-28` (`PUT /ficha/:id/campanha` e `listarMinhasFichas()` com `campanhaId`, base do item 7).
- `m3-27` (feed de rolagens da coluna Sessão e o registro via `RolagemService`).
- `m3-32` (Anotações editáveis), `m3-13` (Habilidades), `m3-44` (Inventário).

---

## Nota de entrega (2026-08-02)

Os 9 entregáveis saíram como especificado. Três pontos onde a implementação precisou decidir algo
que a spec não fechava — registrados aqui porque afetam quem ler esta spec depois:

1. **Atributos no compacto continuam só leitura.** O item 2 diz "com teste rolado e edição em grupo
   pelo lápis, exatamente como hoje" e o critério de aceite cita "lápis de edição". Prevaleceu o
   "exatamente como hoje": o bloco migrou **sem alteração**, e nele o lápis é gateado por
   `ajustavelAmplo()` — a restrição pós-entrega da m2-20 (o card de equipe edita Dinheiro,
   Vida/Energia, Condições e Inventário; o resto exige "Abrir ficha completa"). Alargar a edição
   seria reverter uma decisão registrada, não implementar esta spec. As **Anotações** são a única
   exceção, e por pedido explícito do item 2.

2. **`FichaVisualizacao` perdeu o output `(rolagemRegistrada)`.** O item 5 pedia a extração da flag
   e do registro; manter também o output faria a mesma rolagem chegar à página por dois caminhos
   (o output e o `registrada$` do serviço). As duas páginas passaram a escutar só o serviço — que é
   o que "um caminho de registro só" do critério de aceite exige.

3. **Bug pré-existente corrigido no caminho (fora do escopo declarado).** O card de Status
   transbordava por baixo da coluna lateral desde a m2-20 (`flex: 0 0 500px` + `min-width: 260px`
   pedindo 776px numa linha de 644). Passava despercebido enquanto a coluna 2 tinha só listas; com
   Atributos dentro dela, o item 1 desta spec seria inutilizável sem corrigir. Ver o registro da
   task no `HISTORY.md` e a armadilha nova em `CONTEXT.md` §6.

Verificação ao vivo: 29 checagens Playwright, todas verdes (ver `HISTORY.md`).
