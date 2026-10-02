# rolagem-expressao-quantidade-dados.spec.md

> Spec avulsa, de **regra de domínio**: extensão **definitiva** do motor `shared/src/regras/rolagem/`,
> para **todos** os usuários. Nasce da `I-041` de `docs/context/IDEAS.md` (pedido do autor em
> 2026-10-02, "uma regra que eu não sabia que não estava implementada"). **Não faz parte do experimento
> do montador** — o experimento (`montador-rolagem-experimento.spec.md`) depende desta, não o contrário.
> Registra também a correção de `P-093`.

## Objetivo

Permitir que a **quantidade de dados** de um termo seja uma **conta qualquer** — `+ − × ÷` e
parênteses sobre números e fontes escalares (os 10 atributos, `PROF` e `NIV`) — e que o resultado seja
arredondado **para baixo**. Exemplos do autor: a média de dois atributos num teste,
`((INT+SOC)/2)d20kh1cm1+PROF`, e "somo Força com Vigor, multiplico por dois e rolo em d4",
`((FOR+VIG)*2)d4`. Hoje o motor só aceita `(ATR±n)dM` e `(ATR*Y)dM`; qualquer outra conta é
"Termo desconhecido".

## Decisões fechadas (autor, 2026-10-02)

1. **Qualquer conta com qualquer coisa**: `+ − × ÷`, parênteses, números inteiros e as fontes escalares,
   combinadas livremente.
2. **Arredondamento para baixo**, uma única vez, **ao fim da conta** (`sistema-v4.1.0.md:2027-2033`: "arredondar
   para baixo após a conclusão do cálculo"; exemplo 27,5 → 27). `(7/3)*3` vale 7, não 6.
3. **Vale para qualquer dado** (`d4`, `d6`, `d20`…), não só para teste, e para todos os usuários. É regra
   do jogo; **não há flag, não há reversão**.
4. **A regra fica escrita no guia de fórmulas do app**
   (`frontend/src/app/modules/ficha/componentes/guia-formula/`), não em `docs/core`. A fonte de verdade desta
   extensão é esta spec + o guia + os testes do motor.
5. **Correção do documento (`P-093`)**: `sistema-v4.1.0.md:2045` diz "assim como dito acima… arredondados
   para cima", contradizendo a seção logo acima (`:2027-2033`, para baixo) a que a própria frase remete.
   Corrigir "cima" para "baixo". `docs/core` é do autor: a correção entra nesta task **com a aprovação desta
   spec** e é a única alteração em `docs/core`.

## Pontos a confirmar na revisão (propostas do agente, não decisão do autor)

- **D1 — resultado da conta ≤ 0 num teste.** Hoje só `ATRdM…kh` (atributo nu) com atributo ≤ 0 aplica a regra
  de atributo zerado (rola 2+|n| dados e mantém o **menor**, `rolarTermo`); as formas de contagem explícita
  `(ATR±n)dM`/`(ATR*Y)dM` apenas travam em 0 dado, sem desvantagem. **Recomendo:** em forma nova com `kh`
  (pool de teste) e resultado ≤ 0, aplicar a regra de atributo zerado (a média de dois atributos *é* o
  atributo do teste; rolar 0 dado num teste é pior que a desvantagem); sem `kh` (dano), travar em 0.
  Alternativa: sempre travar em 0, como as formas atuais. As formas legadas **não mudam** em nenhuma das duas.
- **D2 — divisor que vira zero na rolagem.** Divisor literal zero (`(FOR/0)`) é fórmula inválida na
  interpretação. Divisor que depende de atributo e dá zero na rolagem (`(FOR/VIG)` com Vigor 0) resulta em
  **0 dado**, nunca em exceção.
- **D3 — escopo.** Só a **quantidade de dados**. Generalizar também os **bônus fixos** (`(FOR+VIG)*2` sem dado;
  hoje só `ATR*N` e `ATR/N`) fica de fora — o crítico (regra de dobrar atributos, exceto `PROF`/`NIV`)
  precisaria de decisão própria para contas que misturam as duas coisas.

## Entregáveis

1. **Avaliador de expressão** puro em `shared/src/regras/rolagem/`: lê a conta, respeita precedência
   (`* /` antes de `+ -`, associatividade à esquerda), parênteses aninhados e `-` unário; avalia com
   **aritmética exata (frações de inteiros)** e arredonda para baixo (`floor`) só no fim. Sem `eval`/`Function`.
   Limites explícitos de **profundidade** e de **tamanho** da conta (o backend valida texto vindo do cliente).
2. **Gramática**: `(<conta>)[dD]<faces><operadores>` passa a valer em `interpretarSegmento`, aceitando os
   mesmos operadores por pool (`kh`/`kl`/`cm`/`!`/`?`), sinal por termo e tag de tipo (`[Q]`, `[F-Q]`) como as
   outras formas de dado. O parser distingue por contexto: grupo seguido de `dM` é conta de quantidade; grupo
   com dados seguido de `[Tipo]` é pool tipado; grupo seguido de `#N` é repetição (nenhum deles muda).
3. **Interpretação**: novo campo opcional em `TermoDadoDto` guardando a conta interpretada (value object
   nomeado conforme `dto-conventions`), mantendo `quantidade` no default 1. `(ATR±n)dM` e `(ATR*Y)dM`
   **continuam produzindo exatamente o DTO e o resultado de hoje** — seja roteando-as pelo avaliador novo com
   saída idêntica, seja mantendo o caminho atual.
4. **Rolagem**: quantidade = piso da conta, limitada a `QUANTIDADE_DADOS_MAXIMA` (100) e a 0 por baixo
   (D1/D2 acima); crítico dobra a quantidade como hoje; `desvantagem` marcada no resultado quando D1 se aplica.
5. **Guia de fórmulas** (`guia-formula.component.ts`): seção nova com os dois exemplos do autor, a regra de
   arredondamento ("sempre para baixo, uma vez, no fim da conta") e a forma `((conta))dM`.
6. **Documento**: linha `:2045` de `docs/core/sistema-v4.1.0.md` corrigida de "cima" para "baixo" e `P-093`
   removido de `PROBLEMS.md` ao fechar (relato em `HISTORY.md`).
7. **Corpus**: `docs/design/propostas/montador-rolagem-formulas.json` (10 fórmulas dos jogadores + 78 de bateria)
   usado como snapshot de regressão.

## Critérios de Aceite

- **Snapshot antes de mexer**: gerar, com o motor **atual**, a interpretação (`interpretarFormula`) de todas as
  fórmulas do corpus e commitá-la como fixture; depois da mudança, toda fórmula que era válida produz o **mesmo**
  resultado e a mesma interpretação. Nenhum teste existente tem expectativa alterada.
- `npm run test --workspace=shared` verde, com testes novos citando `sistema-v4.1.0.md:2027-2033` cobrindo: precedência
  e parênteses aninhados; média `((INT+SOC)/2)` com 7 e 4 → 5 (não 6); `(7/3)*3` → 7; piso de negativo
  (−1,5 → −2, e a quantidade trava em 0); `((FOR+VIG)*2)d4` com 3 e 2 → 10 dados; teto de 100 dados; crítico
  dobrando; sinal por termo (`-((FOR+VIG)*2)d4` subtrai); combinação com `[Q]`, `[F-Q]` e `#2`; `PROF`/`NIV` e nomes
  por extenso (`força`) dentro da conta; D1 e D2 conforme decidido.
- Fórmulas inválidas devolvem erro claro, nunca lançam: parêntese aberto/fechado a mais, conta vazia (`()d6`),
  operador duplo (`**`), fonte desconhecida, divisão por zero literal, conta além dos limites de profundidade/tamanho.
- `((Int+soc)/2)d20kh1cm1+prof` (a fórmula "não funciona, mas deveria") passa a ser válida e rola.
- `npm run test --workspace=backend` sem regressão (o backend só chama `validarFormula`, em
  `encontro.service.ts:326`); lint dos workspaces tocados sem erro. **`npm run typecheck --workspace=shared` falha
  hoje por `P-092` (preexistente)** — relatar à parte, não corrigir aqui.
- Guia: `verify` com o guia aberto em `1920×1080` e `360×800`, lendo a seção nova (texto, sem overflow, rolagem do
  modal funcionando).
- Consumidores listados e conferidos (busca por `interpretarFormula`/`validarFormula`/`rolarFormula`): backend
  `encontro.service.ts`; frontend `ficha-rolagens`, `rolagem-rapida`, `ficha-combos`, `ficha-inventario`,
  `ficha-campanha-card`, `ficha-visualizacao`, `criatura-rolagem`, `executar-rolagem`, `rolagem-realizada`,
  `bandeja-dados.service`, `resultado-rolagem`, `rolagem-avulso`, painéis do Encontro e `montador-rolagem` (o
  Atual não precisa entender a forma nova, mas **não pode quebrar** ao receber uma fórmula com ela — conferir
  que o fallback "avançada" ou equivalente aparece). Nenhum consumidor lê `quantidadeAtributo*` fora do motor
  (conferido em 2026-10-02), então o formato novo não exige mudança neles.
- Teste de ponta a ponta no app real (`verify`): digitar `((FOR+VIG)*2)d4` e a fórmula da média na "Rolagem rápida",
  rolar e conferir o detalhamento na bandeja de dados.

## Fora de Escopo

- **Bônus fixo por conta** (`(FOR+VIG)*2` sem dado), funções (`min`, `max`, raiz), decimais literais, `×`/`÷` como
  caracteres: só ASCII `* /` — D3. Vira ideia em `IDEAS.md` se o autor quiser.
- Qualquer mudança no montador (é o experimento, em outra spec) e no formato salvo das fichas: a fórmula continua
  sendo só texto em `ficha.dados`, sem migration.
- Mexer na linha `:1185` (média de nível do esquadrão, "0,5 para cima") — é outra regra, com exceção própria.
- Alterar o comportamento de qualquer fórmula hoje válida.

## Dependências

Nenhuma spec anterior. Fontes de verdade: `docs/core/sistema-v4.1.0.md` — "Arredondamentos" (`:2025-2039`) e
"Ordem de Bônus" (`:2043-2049`); skill `regras-do-jogo` (motor puro, consumidores, fecho); `P-093` e `P-092`
de `PROBLEMS.md`. Bloqueia `montador-rolagem-experimento.spec.md`.

## Riscos e Mitigação

- **Ponto flutuante**: `7/3*3` em `number` pode dar 7,000000000000001 ou 6,999999999999999 e o `floor` erra um
  dado. Mitigação: aritmética exata de frações (numerador/denominador inteiros) e teste dedicado.
- **Parser por regex colidindo com as formas atuais** (`(ATR±n)dM` casando antes ou depois da forma geral muda o
  tratamento de desvantagem). Mitigação: o snapshot do corpus e a ordem explícita das tentativas no
  `interpretarSegmento`.
- **Conta patológica vinda do cliente** (aninhamento extremo, texto enorme) no backend. Mitigação: limites de
  profundidade e tamanho + avaliador sem `eval`.
- **D1 ambígua**: decidir antes de implementar; o teste cita a decisão tomada.
