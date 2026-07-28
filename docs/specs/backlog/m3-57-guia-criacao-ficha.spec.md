# m3-57-guia-criacao-ficha.spec.md

> Task 54 do milestone `m3-ficha-jogador.spec.md`. **Trio do guia de criação (`m3-57`…`m3-59`)** —
> esta é a base (tela, passos e regra de orçamento); `m3-58` acrescenta o passo de melhorias de
> nível e `m3-59` o de equipamento inicial.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "Criação de Personagem" (Atributos,
> Maestrias), "Níveis e Melhorias de Agente", "Prestígio e Patentes", "Informações Adicionais >
> Dinheiro" e "Iniciando um Novo Agente" (Nível Inicial, Prestígio Inicial, Bônus Monetário).
> **O documento vence** (proibição #27) — o texto abaixo é resumo de trabalho.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema "Terminal de
> Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Substituir o dialog de criação por uma **tela guiada por passos** que conduz o jogador pelas
escolhas de criação **na ordem e com as travas do documento** — inclusive o que o dialog de hoje
ignora: o **orçamento de 4 pontos** de atributo, o cálculo de **Nível e Prestígio iniciais** pelo
esquadrão (com **Bônus Monetário**), a **Identidade** e a **rolagem visível** do dinheiro inicial.
Nasce desktop **e** mobile.

## Ponto de partida

`FichaCriarDialog` (`frontend/src/app/modules/ficha/componentes/ficha-criar-dialog/`, aberto pelo
detalhe da campanha) coleta Codinome, Classe/Arquétipo, Nível, Prestígio, atributos e Maestria em
um dialog único e emite `FichaAssistenteResultado`, que a página monta via `construirFichaInicial`
(`modules/ficha/ficha-padrao.ts`). Ele **não** aplica o orçamento de pontos (deixa mexer livre até
o teto da classe), **não** calcula Nível/Prestígio pelo esquadrão, **não** concede o Bônus
Monetário e **não** coleta Identidade. O motor já tem o necessário: `calcularProgressaoAcumulada`,
`calcularNovoAgente`/`calcularBonusMonetario`, `rolarDinheiroInicial`, `obterBonusAtributos`,
`habilidadesIniciais`, `maestriaAtingivel`.

## Entregáveis

1. **Regra de orçamento de atributos no motor** — `shared/src/regras/agente/criacao.ts` (novo),
   exportado pelo `index.ts` da pasta, com testes. Nada de fórmula no frontend (proibição #26).
   - `calcularOrcamentoAtributos({ classe, nivel })` → `{ pontosCriacao: 4, pontosNivel,
     pontosTotais, maximoNaCriacao: 3, maximoDemaisNaCriacao: 2, maximoFinal }`, onde `pontosNivel`
     é `calcularProgressaoAcumulada({ classe, nivel }).atributos` e `maximoFinal` é o
     `atributoMaximo` de `obterLimitesClasse` (o doc: teto 3/2 vale "até a finalização da ficha",
     depois sobe).
   - `validarDistribuicaoAtributos({ classe, nivel, atributos })` → `{ gastos, saldo, violacoes[] }`
     — as violações cobrem estourar o total, passar do teto por atributo e valor abaixo de 0.
   - **Base 1 em cada atributo não conta** como ponto gasto; **bônus fixo de arquétipo/subclasse
     também não** (`obterBonusAtributos` entra depois, como hoje em `construirFichaInicial`).
   - **Zerar um atributo** é permitido (o doc deixa transferir o ponto base); o piso do guia é **0**,
     não o `atributoMinimo: -5` da classe. Atributo em 0 é sinalizado como desvantagem (rola dois
     D20 e fica com o menor).
2. **Tela do guia + aposentadoria do dialog.**
   - Rota `nova` em `frontend/src/app/modules/ficha/ficha.routes.ts`, **antes** de `:id` (senão
     `nova` casa como id) → `/painel/:campanhaId/ficha/nova`, lazy, página standalone `FichaCriar`
     em `modules/ficha/paginas/criar/`.
   - O botão "Nova ficha" do detalhe da campanha passa a **navegar** para a rota;
     `FichaCriarDialog` (componente, HTML, SCSS e spec) é **removido** e o seletor de dono
     (só mestre, §14) migra para o passo 01. Caminho único de criação.
   - **Shell:** trilha vertical de passos à esquerda (índice mono + título UPPERCASE, padrão de
     cabeçalho de seção do tema), conteúdo do passo ativo e **resumo vivo** (Vida/Energia/Defesa e
     saldo de pontos) à direita; rodapé com Voltar/Avançar. Passo já visitado é clicável; passo à
     frente só com o atual válido. Sair do guia pede confirmação.
   - **Rascunho:** `guia-criacao-rascunho.service.ts` serializa o estado em `localStorage` por
     campanha (mesmo padrão do carrinho da `m1-11`); ao entrar com rascunho existente, oferecer
     "retomar" ou "começar do zero"; ao concluir com sucesso, limpar.
   - **Estado:** um `EstadoGuiaCriacao` (signal) na página; cada passo é componente burro
     (`input`/`output`) em `componentes/guia-criacao/passos/`. **Nenhuma chamada por passo** — o
     guia roda sobre `shared/regras`, como as calculadoras públicas; só o "Criar ficha" final
     dispara `POST /ficha`, reusando `construirFichaInicial` (estendido para receber Identidade e
     o dinheiro já rolado, em vez de rolar sozinho).
3. **Passos 01–04, 07 e 09.** Os números abaixo são os do **fluxo final** (com a `m3-58` e a
   `m3-59` no lugar); entregue só esta task, o guia tem **7 passos numerados em sequência** na
   trilha — 06 e 08 não existem ainda.
   - **01 // BASE** — dono (`<select>` de membros, só mestre) + Codinome/Agente.
   - **02 // CLASSE** — classe → subclasse/arquétipo, mostrando o bônus fixo de atributos e
     **qual Habilidade Inicial vem de graça** (`habilidadesIniciais`).
   - **03 // NOVO AGENTE** — motivo de entrada (`MotivoEntradaAgenteEnum`) + médias de Nível e
     Prestígio **pré-calculadas das fichas da campanha** e editáveis → `calcularNovoAgente` devolve
     Nível inicial, Prestígio inicial (com dedução e piso de patente), patente, Bônus Monetário e
     **Amaldiçoado pelo Passado**. Esta última **não tem casa no contrato** — as condições da ficha
     são só as três da `m2-16b` (Morrendo/Machucado/Inconsciente) —, então o guia a registra como
     linha em `dados.anotacoes` (`m3-32`) e a destaca na Revisão; criar slot de condição permanente
     está fora de escopo. Campanha sem fichas
     → caminho **"primeiro agente"**: Nível 0, Prestígio 0, sem bônus, sem perguntar médias.
     Exibir o memorial do cálculo (média → dedução → piso), não só o número final.
   - **Requisito de dado:** `FichaResumoDto` (`shared/src/dtos/ficha/ficha-operacao.dtos.ts`) tem
     `nivel` mas **não** `prestigio` — acrescentar `prestigio` ao DTO e às listagens do
     `FichaRepository` (`(ficha.dados->>'prestigio')::int AS prestigio`, ao lado do `nivel`, nas
     consultas por campanha e por usuário). Sem isso não há média de Prestígio.
   - **04 // ATRIBUTOS** — steppers com **saldo vivo** contra `calcularOrcamentoAtributos`, teto por
     atributo, aviso ao zerar e Maestria (só no atributo final 6+, `maestriaAtingivel`).
     **Trava dura por padrão**: não avança com saldo diferente de zero nem com violação. Um botão
     **"modo livre"** destrava os limites (sempre disponível ao mestre) — a trava é do guia,
     client-side; o backend segue com a liberdade de edição da `m3-10`, sem regra nova.
   - **07 // RECURSOS** — rola `1000 + 4D4 × 250` (`rolarDinheiroInicial`) com os **4 dados
     visíveis**, permitindo rerolar enquanto o passo não é confirmado; soma o Bônus Monetário do
     passo 03 e mostra o total que vai para `dados.dinheiro`.
   - **09 // REVISÃO** — resumo completo da ficha montada + "Criar ficha" (`POST /ficha`), com erro
     do backend exibido sem perder o estado do guia.
4. **Passo 05 // IDENTIDADE.** Personalidade (traços) + Origem (Formações, Especialidade e
   gatilho), reusando os editores da ficha (`m3-25`) em vez de duplicar. É o momento certo: depois
   de definidas, Personalidade e Origem ficam **imutáveis para o dono** (`m3-24`). Para as três
   subclasses de **Experimento**, o passo oferece **Peculiaridade _ou_ Origem** — nunca as duas
   (`m3-41`: `experimentoComPeculiaridade` zera a Origem); escolher Peculiaridade adiciona a
   habilidade de Subclasse e esconde o editor de Origem.
5. **Mobile.** Mesmo componente: a trilha vira barra de progresso compacta no topo ("GUIA · 03/07" +
   régua), o resumo vivo vira faixa colapsável, Voltar/Avançar vão para rodapé fixo, alvos de toque
   ≥44px (`$alvo-toque`) e breakpoints de `_breakpoints.scss` (`$bp-mobile`/`$bp-tablet`). Sem
   scroll horizontal do body em 360/390/430px.
6. **Verificação ao vivo** (stack real + Playwright, skill `verify`): criar uma ficha de ponta a
   ponta pelo guia como jogador **e** como mestre criando para outro membro, conferindo no Postgres
   que atributos, Nível, Prestígio, dinheiro (inicial + bônus) e Identidade chegaram como o guia
   mostrou; e o mesmo fluxo em 390px.

## Critérios de Aceite

- "Nova ficha" abre `/painel/:campanhaId/ficha/nova`; o dialog antigo não existe mais no código.
- Não é possível concluir o guia com pontos de atributo sobrando ou estourados, nem com um atributo
  acima do teto — salvo com "modo livre" ligado.
- Numa campanha com fichas, o passo Novo Agente chega com as médias preenchidas e produz o mesmo
  Nível/Prestígio/Bônus que a calculadora Novo Agente da M1 para as mesmas entradas.
- O dinheiro da ficha criada é `1000 + 4D4×250` **mais** o Bônus Monetário quando o Prestígio
  inicial é maior que zero — e é exatamente o total exibido no passo 07.
- Personalidade e Origem definidas no guia chegam persistidas e já imutáveis para o dono; um
  Experimento com Peculiaridade não sai do guia com Origem.
- F5 no meio do guia oferece retomar de onde parou; concluir limpa o rascunho.
- Fluxo inteiro usável em 360–430px, sem scroll horizontal, com alvos de toque ≥44px.

## Fora de Escopo

- **Passo de melhorias de nível** (habilidades gerais/classe/arquétipo/outra classe e Fortificações
  de Personalidade) — é a `m3-58`. Até lá, uma ficha criada com Nível > 0 sai do guia com o
  orçamento de **atributos** do nível já aplicado, mas as habilidades do nível continuam sendo
  adicionadas na própria ficha (o editor da `m3-13` já existe).
- **Passo de equipamento inicial** (loja, teto $2500 / peso 5) — é a `m3-59`.
- Validação server-side do orçamento de pontos: o backend **não** ganha regra nova; a liberdade de
  edição da `m3-10` continua valendo (o guia é assistente na criação, não trava do domínio).
- Guia para ficha de criatura/NPC (M4) e para fichas do acervo sem campanha (`m3-28`) — o guia
  nasce no contexto de uma campanha; ficha sem campanha segue pelo caminho atual.

## Dependências

- `m3-01` (contrato `FichaJogadorDadosDto`), `m3-03` (`POST /ficha`), `m3-23`/`m3-24`/`m3-25`
  (Identidade), `m3-41` (Experimento + Peculiaridade), `m2-16` (fichas por membro na campanha),
  `m1-08` (calculadora Novo Agente — mesmo motor), `m1-11` (padrão de persistência em
  `localStorage`), `m3-26` (breakpoints e alvos de toque).
