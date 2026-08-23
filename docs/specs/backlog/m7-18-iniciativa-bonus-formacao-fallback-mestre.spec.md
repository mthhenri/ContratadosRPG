# m7-18-iniciativa-bonus-formacao-fallback-mestre.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate. Pedido direto do autor: "na origem, não está
> aplicando os dados da iniciativa a mais".

## Objetivo

Certas Formações de Origem concedem dado extra na rolagem de Iniciativa
(`FormacaoBonusEnum.PERICIA_DADO_INICIATIVA`, regra em `docs/core/sistema-v4.1.0.md`, tabela de
Formações). Esse bônus já é aplicado corretamente quando o **próprio jogador** rola a Iniciativa
pela ficha, mas é ignorado quando o **mestre** usa o atalho "Rolar tudo" no painel do Encontro — o
dado extra da origem simplesmente não entra na conta nesse caminho, resultando numa iniciativa mais
baixa do que a ficha do agente deveria produzir.

## Estado atual

- `shared/src/regras/identidade/formacoes.ts:217` —
  `obterDadoExtraIniciativaFormacao(formacoes: readonly FichaFormacaoDto[]): number` soma o dado
  extra de `PERICIA_DADO_INICIATIVA` entre as formações da origem.
- `frontend/src/app/modules/ficha/rolar-iniciativa.ts:41-58` — usada quando o **jogador** rola a
  própria iniciativa pela ficha: `dadoExtraIniciativaDaFicha`/`dadosDeIniciativaDaFicha` somam esse
  bônus (mais o amplificador Atento) ao pool de Destreza antes de `rolarIniciativaDaFicha`. Esse
  caminho está correto.
- `frontend/src/app/modules/encontro/paginas/painel/painel-encontro.page.ts:914-932` —
  `rolarTudo()` (atalho do mestre) monta a fórmula como `` `${dados}D6+${combatente.iniciativaBonus}` ``
  onde `dados = Math.max(1, combatente.destreza)` e `iniciativaBonus` é só o **bônus fixo** da
  criatura (`EncontroCombatenteResumoDto.iniciativaBonus`,
  `shared/src/dtos/encontro/encontro.dtos.ts:116-124`). Esse DTO/fallback nunca inclui o dado extra
  de Formação nem o ajuste do amplificador Atento — decisão documentada no próprio código (comentário
  nas linhas 905-912 do painel e 119-122 do DTO: o bônus completo "não é um número fixo... só o
  documento completo da ficha resolve"), mas que deixa o fallback do mestre sistematicamente abaixo
  do valor correto para qualquer agente com Formação de iniciativa.
- Não existe hoje uma função central `calcularIniciativa` em `shared/regras/agente` — a única lógica
  formal é `rolarIniciativaDaFicha(dados: FichaJogadorDadosDto)`
  (`frontend/src/app/modules/ficha/rolar-iniciativa.ts:58`), que recebe o documento inteiro da ficha
  e por isso enxerga a origem; o backend do Encontro, ao montar `EncontroCombatenteResumoDto`, não
  expõe esse dado extra separadamente.

## Entregáveis

1. O mapper do Encontro (`backend/src/modules/encontro/encontro-combatente.mapper.ts`), que já
   carrega a ficha completa para montar outros campos calculados (resistências de `m7-17` seguem o
   mesmo padrão), passa a calcular também o dado extra de iniciativa vindo de Formação — reaproveitar
   `obterDadoExtraIniciativaFormacao` de `shared/regras/identidade`, sem duplicar a soma no backend.
2. `EncontroCombatenteResumoDto` ganha um campo (ex.: `dadoExtraIniciativa: number`, default 0 para
   avulso/criatura sem origem) expondo esse valor calculado, ao lado do `iniciativaBonus` já
   existente.
3. `rolarTudo()` (e qualquer outro ponto do painel do mestre que monte a fórmula de iniciativa a
   partir do resumo do combatente) passa a somar `dadoExtraIniciativa` à quantidade de dados D6
   antes de rolar: `dados = Math.max(1, combatente.destreza) + combatente.dadoExtraIniciativa`.
4. Não alterar o caminho do jogador (`rolar-iniciativa.ts`) — ele já está correto e continua sendo a
   fonte de verdade quando o próprio jogador rola.
5. Avulso e criatura continuam com `dadoExtraIniciativa = 0` (não têm Formação de origem).

## Critérios de Aceite

- Um agente com Formação que concede dado extra de Iniciativa, tendo a própria iniciativa rolada
  pelo mestre via "Rolar tudo", recebe o mesmo número de dados D6 que receberia rolando pela própria
  ficha (Destreza + dado extra de Formação), não só Destreza.
- Um agente sem essa Formação, ou uma criatura/avulso, mantém exatamente o comportamento atual
  (sem regressão).
- `npm run test -w shared`, `npm run test -w backend` e `npm run test -w frontend` verdes, com teste
  de regressão cobrindo `rolarTudo` com um combatente tendo Formação de iniciativa.
- Verificação pela skill `verify`: montar um encontro com um agente com essa Formação, usar "Rolar
  tudo" como mestre e conferir que a quantidade de dados rolados bate com a rolagem manual pela
  ficha do mesmo agente.

## Fora de Escopo

- Unificar `rolarIniciativaDaFicha` e o fallback do mestre numa única função central de cálculo de
  iniciativa — os dois caminhos continuam existindo separadamente; esta task só corrige o dado que
  falta em um deles.
- Amplificador Atento no fallback do mestre, se ele depender de estado de aplicação que hoje só é
  lido no contexto completo da ficha (avaliar ao implementar; se o valor já vier plano no resumo do
  combatente, incluir também — senão, registrar como pendência separada em `PROBLEMS.md`, não
  bloquear esta task por isso).
- Editar a fórmula manualmente por combatente (isso é `m7-19`).

## Dependências

`m7-04` (backend de condução do encontro), `m7-17` (padrão de campo calculado no mapper a partir da
ficha carregada).
