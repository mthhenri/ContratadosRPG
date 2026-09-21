# ui-39-iniciativa-jogador-layout-e-separacao.spec.md

> Spec avulsa, fora da fila de milestone. Continuação de `ui-37`/`ui-38` (visão do mestre): leva
> para a tela real **"Iniciativa" — visão do jogador** o layout aprovado pelo autor no mock
> "POC Iniciativa do jogador" (artifact `https://claude.ai/artifact/RVpTU96NWP8QnTapabA6nY`) e, na
> mesma tarefa, **separa mestre e jogador em páginas distintas**, no molde de `detalhe-shell` /
> `detalhe-mestre` / `detalhe-jogador` da campanha.

## Objetivo

1. **Separar** o `PainelEncontro` — hoje um componente de ~1200 linhas que alterna mestre e
   jogador por `@if (modoMestre())` — em uma casca que resolve o papel, uma página do mestre, uma
   página do jogador e um serviço de dados compartilhado. Sem mudar nenhum comportamento do mestre.
2. **Redesenhar a visão do jogador** com a mesma composição do mestre (coluna de ações · trilha ·
   Rolagens · palco), em que a **própria ficha do jogador ocupa o palco inteiro** e as ações dele
   (rolar iniciativa, avançar turno) moram no topo da trilha.

Nenhuma regra nova: `ordemRodada`, Cadência, permissão e `revelado` continuam vindo prontos do
backend/`shared/regras`. Nenhum DTO, endpoint ou migração muda.

## Análogo aprovado (registro do `design-fidelity`)

| Parte da tela | Análogo no código | O que se herda |
|---|---|---|
| Casca (coluna + cabeçalho + linha) | visão do mestre (`ui-37`) — `.iniciativa-mestre` | coluna 56/200px encostada na topbar e na borda, cabeçalho `//`, trilha 262px, Rolagens `clamp(300px, 23.44vw, 450px)`, breakpoints 1080/560 |
| Trilha | `app-trilha-turnos` (ui-37) | contadores, itens, ativo/agiu, faixa horizontal no tablet |
| Bloco de ação do topo da trilha | `.painel__bloco--vez` + `app-conducao-turno` | moldura acesa (accent) quando há o que fazer; `app-botao` primário; ícone de avançar |
| Rolagens | `app-historico-rolagens-sidebar [fixo]` (ui-37) | idêntico ao do mestre |
| Ficha no palco | `app-ficha-campanha-card` — o mesmo que o detalhe do jogador e a coluna lateral de hoje | a ficha inteira, sem reescrever nenhuma parte dela |
| Estado vazio | `app-estado-vazio` (ui-38) | "Nenhum combate em andamento" |

## Decisões (do autor, no mock)

- **Mantém** a trilha e as Rolagens do mestre. O jogador não vê a ficha de quem age.
- O **palco** é a ficha do jogador, no espaço que no mestre é ocupado pela condução + ficha resumida
  + grade — ocupando tudo, sem a barra de situação.
- **Rolar iniciativa** e **Avançar turno** ficam num bloco de ação no **topo da trilha**, logo
  abaixo dos contadores Rodada/Turno (que continuam).
- O item do jogador na trilha ganha a marca **"Você"**.
- A coluna de ações do jogador só tem **Ferramentas** (Calculadora e Caderno), que saem dos botões
  flutuantes — mesma migração do detalhe do jogador (`ui-34`).
- No desktop, trilha e Rolagens ficam **fixas na altura da janela** enquanto o palco rola
  (`position: sticky`), para a ficha comprida não empurrá-las para fora de vista.

Decisões desta spec (o mock não cobre):

- **Jogador sem ficha em campo** (ou espectador): o palco mostra a **grade de combatentes de
  leitura** (`.grade--compacta.grade--palco`, sem controles), como o mestre a vê; o bloco de ação
  diz "Você está assistindo a este combate". Trilha e Rolagens iguais.
- **Sem combate:** casca + `app-estado-vazio` "Nenhum combate em andamento.", como o mestre (`ui-38`).
- **Encerrado** (URL de um combate do histórico): o bloco de ação mostra "Encerrado", sem botões.
- O chip "Espectador" do cabeçalho **sai** (aparecia também para quem joga).

Ajustes decididos na execução, depois de ver o app real (o mock desenhava a ficha à mão; o cartão real
tem regras próprias):

- **Cabeçalho do palco:** o `app-ficha-campanha-card` traz a faixa "Ficha de Jogador · FICHA-JGD-NNNN";
  passa `[mostrarTopo]="false"`. O cabeçalho "Minha ficha" do mock (título, régua, chip) foi
  removido a pedido do autor após ver o app: a ficha começa no topo do palco.
- **Faixa 1081–1599px:** o cartão de ficha só empilha pela largura da *janela* (`bp.tablet`) e pede ~700px
  de palco; três colunas deixam ~650px a 1366px e cortam as abas. Nessa faixa a trilha e as Rolagens
  dividem **uma só coluna** de 300px (empilhadas, `sticky`); ≥ 1600px valem as três colunas do mock.
- **Mobile com a ficha no palco:** a coluna de ações (barra fixa no rodapé) colide com a `.ficha-nav` do
  cartão; ela some e Calculadora/Caderno sobem para o cabeçalho, como no `detalhe-jogador`.

## Entregáveis

### A. Separação mestre/jogador

1. **`EncontroPainelDadosService`** (`paginas/painel/encontro-painel-dados.service.ts`,
   `@Injectable()`, provido pela casca): tudo o que os dois papéis compartilham — `campanhaId`,
   carga (`encontro`, `fichasCampanha`, `encontrosDaCampanha`, `membros`, `campanhaNome`, feed de
   rolagens), `paramMap`/`:encontroId`, reconexão, sala e assinaturas de socket
   (`encontroAlterado$`, `rolagemRegistrada$`), slot de contexto da topbar, derivados
   (`carregando`, `ehMestre`, `combatentes`, `combatenteDaVez`, `acoesRestantesDaVez`,
   `mutavel`/`emMontagem`/`emCombate`, `faltamIniciativas`, `ehDaVez`/`jaAgiu`/`nivelAmeaca`),
   `emOperacao` e a execução de chamadas ao `EncontroService` (`executarNoEncontro`,
   `avancarTurno`).
2. **`PainelEncontroShell`** (`paginas/painel/painel-shell.page.ts`): provê o serviço (que lê o
   `campanhaId` e o `:encontroId` da rota) e monta `PainelEncontroMestre` **ou** `PainelEncontroJogador`.
   Enquanto o papel é desconhecido (membros ainda não chegaram) ou o usuário é mestre, monta a do
   mestre (que já traz o esqueleto de carregamento); com o papel resolvido como não-mestre, a do
   jogador. As rotas (`encontro.routes.ts`) passam a apontar para a casca.
3. **`PainelEncontroMestre`** (`paginas/painel-mestre/`): tudo o que é do mestre, **sem mudança
   observável** — coluna de ações, cabeçalho, histórico, condução, ficha resumida, grade, seletor,
   avulso, Novo combate, Calculadora/Caderno, esqueleto de carregamento.
4. **`PainelEncontroJogador`** (`paginas/painel-jogador/`): o que é do jogador (item B).
5. **Casca compartilhada de layout:** as regras de layout comuns às duas páginas (`__conteudo`,
   `__cabecalho`, `__linha`, `__trilha`, `__rolagens`, `__palco`, `__secao*`, `.grade--palco`) vão
   para um parcial SCSS (`paginas/_casca-iniciativa.scss`, mixin), incluído pelas duas — sem
   copiar CSS. O mestre continua idêntico.
6. O `painel-encontro.page.*` antigo é **removido**; seus testes são redistribuídos (item D).

### B. Visão do jogador

7. **`app-trilha-turnos`** ganha (compatível com o mestre): o slot de projeção `[trilhaAcao]`
   entre os contadores e a lista, e o input `meuCombatenteId` — o item do próprio jogador recebe
   `.trilha__item--voce`, o subtítulo **"Você"** (em `--accent`, negrito) e, sem ninguém na vez
   (montagem), é o alvo do rolar-até-o-item. Contadores + slot formam um bloco `.trilha__topo`
   (separado da lista por uma linha), que na faixa do tablet fica à esquerda e, no mobile, ocupa a
   linha inteira.
8. **`app-acao-jogador`** (`modules/encontro/componentes/acao-jogador/`): bloco de ação, componente
   burro que emite intenções. Estados:
   - **montagem, sem iniciativa** — "Sua iniciativa" + detalhe + botão **Rolar iniciativa**
     (`app-botao` primário, ícone `dado`); acende (`--acesa`) quando o mestre chamou a rolagem.
   - **montagem, com iniciativa** — "Aguardando" + "Iniciativa N" + "Combate ainda não iniciado.".
   - **combate, minha vez** — acesa: "Sua vez" + nome + "N ação/ações restante(s)" + botão
     **Avançar turno** (primário, mesmo ícone de `app-conducao-turno`).
   - **combate, vez de outro** — "Age agora" + nome + "Você é o próximo." /
     "Faltam N turnos para a sua vez." (N vem de `turnosAteAVez`, considerando todos os slots do
     jogador na rodada e a virada de rodada).
   - **sem combatente meu** — "Assistindo" + "Você está assistindo a este combate".
   - **encerrado** — "Encerrado", sem botões.
   Os botões respeitam `emOperacao` (`disabled`) e têm alvo de 44px no mobile.
9. **`turnosAteAVez(encontro, combatenteId)`** em `encontro-leitura.util.ts` (função pura,
   testada): menor distância cíclica, em slots de `ordemRodada`, do turno atual até um slot do
   combatente; `null` fora do combate ou se ele não está na ordem.
10. **`PainelEncontroJogador` — comportamento:**
    - `app-coluna-acoes` (`id="iniciativa-jogador"`, "Ações da iniciativa"): só **Ferramentas** —
      Calculadora e Caderno, `[pressionado]` como no mestre.
    - Cabeçalho: voltar, `//`, "Iniciativa · {nome}", campanha, `app-chip` de estado, régua; no
      mobile com ficha no palco, as ferramentas (Calculadora, Caderno).
    - Trilha (`meuCombatenteId`) com o `app-acao-jogador` projetado; Rolagens
      `app-historico-rolagens-sidebar [fixo]`.
    - **Palco:** com combatente com ficha em campo → o
      `app-ficha-campanha-card` da própria ficha (mesmos bindings de hoje: `ajustavel`,
      `podeRolar`, `fichaEdicao.*`, `mostrarRolagensCompacto`, `mostrarTopo=false`), ocupando toda a
      largura do palco, sem cabeçalho de seção,
      com `FichaEdicaoService`/`FichaRolagemRegistroService` declarados na página; sem ficha em
      campo → seção "Todos os combatentes" com a grade de leitura; sem encontro → estado vazio.
    - Continuam: rolar a própria iniciativa (preset da ficha, `iniciativaFormulaCustom`, entrada no
      feed e na bandeja), o chamado do mestre (`iniciativaPedida` + notificação "Role sua
      iniciativa"), o aviso "Sua vez!" (uma vez por slot), avançar turno só na própria vez,
      `app-ficha-flutuante` para a grade de leitura e para "Ver ficha" do Caderno.
    - **Saem** (substituídos pela nova composição): a coluna lateral de 70% + a divisão
      `iniciativa-tela`, o botão "Minha ficha" do cabeçalho, o histórico flutuante de rolagens, o
      chip "Espectador" e os contadores redundantes do mobile.
11. **Responsivo:** ≥ 1600px, três colunas com trilha e Rolagens `sticky`; 1081–1599px, uma coluna
    lateral (trilha sobre Rolagens) `sticky`; `bp.tablet` empilha (trilha → palco → Rolagens) e a trilha
    vira faixa, com o `.trilha__topo` à esquerda dela; `bp.mobile` põe o bloco de ação na linha
    inteira, com a ação primária já na primeira tela, e — com a ficha no palco — troca a coluna de
    ações por dois `app-botao-icone` (Calculadora, Caderno) no cabeçalho. A largura da ficha é a do
    palco: o cartão real decide o próprio empilhamento.

### C. Regras de UI

12. Todo controle usa o primitivo de `shared/ui/` com a API completa; sem `style=""` inline (o
    `[style.--cor-*]` de variável CSS é a exceção já usada), sem seletor de ID, sem
    hex/fonte/raio hardcoded. `app-coluna-acoes-item` com `[pressionado]` para Calculadora/Caderno.
13. `docs/design/DESIGN.md`: registrar a composição da visão do jogador e a separação; `HISTORY.md`,
    `CONTEXT.md`, `MEMORY.md`/`PROBLEMS.md` conforme o que sobreviver à tarefa.

### D. Testes

14. Specs: `encontro-painel-dados.service.spec.ts` (carga, broadcast da própria campanha / de
    outra, histórico não é arrastado, feed sem duplicar, reconexão), `painel-shell.page.spec.ts`
    (papel → página), `painel-mestre.page.spec.ts` e `painel-jogador.page.spec.ts` (os testes de
    hoje redistribuídos, **sem enfraquecer nenhuma asserção**), `acao-jogador.component.spec.ts`,
    `trilha-turnos` (slot, "Você", alvo do scroll) e `encontro-leitura.util.spec.ts`
    (`turnosAteAVez`). Um arquivo de apoio de testes compartilha fixtures e providers.

## Critérios de Aceite

- `npm run test --workspace=frontend` verde; lint sem erro novo; build de produção sem aviso novo.
  Todo teste do `painel-encontro.page.spec.ts` antigo continua existindo (na página certa) ou
  ganha justificativa explícita no `HISTORY.md`.
- **Gate visual obrigatório** (`verify`, stack real, `1920×1080`, `1366×768`, `960×1080` e
  `360×800`), em três papéis: **mestre** (regressão — comparar antes/depois: montagem, combate,
  encerrado, sem combate, Editar, seletor/avulso, coluna retraída/expandida), **jogador com ficha
  em campo** (montagem sem iniciativa, com iniciativa, vez de outro, sua vez, encerrado) e
  **jogador sem ficha em campo**. Comparar com o mock aprovado e com `detalhe-jogador`. Sem
  overflow horizontal; foco visível; alvos de 44px no mobile; trilha e Rolagens fixas no desktop.
- Rolar iniciativa e avançar turno funcionam ponta a ponta (dois usuários) e o mestre vê o efeito.

## Fora de Escopo

- **P-073** (espectador preso em "Carregando o combate…"): continua aberto em `PROBLEMS.md`; a
  casca preserva o comportamento de hoje para quem não consegue listar membros.
- O jogador **abrir a ficha de um colega** a partir da tela quando tem ficha em campo: a grade que
  permitia isso sai da visão dele (o mock aprovado não a tem). Segue possível para quem assiste sem
  ficha (grade de leitura) e pelo Caderno.
- Qualquer mudança dentro de `app-ficha-campanha-card`, do backend, dos DTOs ou de regras.
- Histórico de combates para o jogador; o feed de rolagens continua sendo o de sempre.
- Abas Inventário/Habilidades/Rolagens redesenhadas — são as do card real, como estão.

## Dependências

`ui-37`/`ui-38` (visão do mestre), `ui-34` (coluna de ações e migração dos painéis flutuantes),
`m7-05`/`m7-06`/`m7-08`/`m7-13`/`m8-05` (tela atual e composição de leitura). Referências de
estrutura: `campanha-detalhe-mestre-coluna-acoes.spec.md` (casca + serviço de dados).

## Riscos e Mitigação

- **Trabalho de outra sessão nos mesmos arquivos.** O `painel-encontro.page.*` tinha alterações não
  commitadas de outra sessão (esqueleto de carregamento do mestre, `[pressionado]` da Calculadora/
  Caderno). Elas são carregadas para a página do mestre **sem alteração de comportamento**, e o
  fecho registra o que foi movido.
- **Regressão do mestre na extração.** Mitigada por: mesma suíte de testes redistribuída, parcial
  SCSS sem mudança de regras e comparação visual antes/depois nos quatro viewports.
