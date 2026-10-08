# rolagem-expressao-quantidade-dados.spec.md

> Spec avulsa, de **regra de domínio**: extensão **definitiva** do motor `shared/src/regras/rolagem/`,
> para **todos** os usuários. Nasce da `I-041` de `docs/context/IDEAS.md` (pedido do autor em
> 2026-10-02, "uma regra que eu não sabia que não estava implementada"). **Não faz parte do experimento
> do montador** — o experimento (`montador-rolagem-experimento.spec.md`) depende desta, não o contrário.
> `docs/core` **não é alterado**: a contradição da linha 2045 fica anotada em `P-093`.

## Objetivo

Permitir que a **quantidade de dados** de um termo **e os bônus fixos** sejam uma **conta qualquer** — `+ − × ÷`
e parênteses sobre números e fontes escalares (os 10 atributos, `PROF` e `NIV`) — com o resultado arredondado
**para baixo**. Exemplos do autor: a média de dois atributos num teste, `((INT+SOC)/2)d20kh1cm1+PROF`;
"somo Força com Vigor, multiplico por dois e rolo em d4", `((FOR+VIG)*2)d4`; e o mesmo valor como bônus fixo,
`2d6+(FOR+VIG)*2`. Hoje o motor só aceita `(ATR±n)dM` e `(ATR*Y)dM` para quantidade, e `ATR*N`/`ATR/N` para
bônus; qualquer outra conta é "Termo desconhecido".

## Decisões fechadas (autor, 2026-10-02)

1. **Qualquer conta com qualquer coisa**: `+ − × ÷`, parênteses, números inteiros e as fontes escalares,
   combinadas livremente.
2. **Arredondamento para baixo**, uma única vez, **ao fim da conta** (`sistema-v4.1.0.md:2027-2033`: "arredondar
   para baixo após a conclusão do cálculo"; exemplo 27,5 → 27). `(7/3)*3` vale 7, não 6.
3. **Vale para qualquer dado** (`d4`, `d6`, `d20`…), não só para teste, e para todos os usuários. É regra
   do jogo; **não há flag, não há reversão**.
   **Vale também para o bônus fixo** (decisão de 2026-10-02): `(FOR+VIG)*2`, `FOR*VIG`, `2*(LUT+PROF)`,
   `(FOR+VIG)/2`, com sinal e tag de tipo como qualquer termo (`2d6 - (FOR+VIG)*2 [Q]`).
4. **A regra fica escrita no guia de fórmulas do app**
   (`frontend/src/app/modules/ficha/componentes/guia-formula/`), não em `docs/core`. A fonte de verdade desta
   extensão é esta spec + o guia + os testes do motor.
5. **`docs/core` não é alterado** (autor, 2026-10-02): `sistema-v4.1.0.md:2045` diz "assim como dito acima…
   arredondados para cima", contradizendo a seção logo acima (`:2027-2033`, para baixo) a que a própria frase
   remete. Fica **só anotado em `P-093`** (`ACEITO`); o motor e o guia valem "para baixo".
6. **D1 e D2 decididos** (autor, 2026-10-02, ambos conforme a recomendação):
   - **D1 — conta ≤ 0 num teste.** Em forma nova **com `kh`** (pool de teste) e resultado ≤ 0, vale a regra de
     atributo zerado (rola 2+|n| dados e mantém o **menor**, a mesma de `ATRdM…kh` nu em `rolarTermo`). **Sem
     `kh`** (dano), a quantidade trava em 0. As formas legadas `(ATR±n)dM` e `(ATR*Y)dM` **não mudam**: continuam
     travando em 0 dado, sem desvantagem.
   - **D2 — divisor.** Divisor literal zero (`(FOR/0)`) é fórmula inválida na interpretação; divisor que depende
     de atributo e dá zero na rolagem (`(FOR/VIG)` com Vigor 0) faz a conta valer **0** (0 dado, ou bônus 0),
     nunca exceção.
7. **D4 decidido — crítico num bônus fixo por conta** (autor, 2026-10-02: "apenas atributos de verdade dobram,
   nível/prestígio não"). O sistema manda dobrar "todos os dados e valores fixos (flat ou atributo)"
   (`sistema-v4.1.0.md:1810`; `Força × 6` vira `Força × 12`), **exceto valores originados de Patente ou Nível**
   (`:1965`; no motor, `PROF` e `NIV`, que é a regra já aplicada aos termos soltos). Para a quantidade de dados
   nada muda: o crítico dobra a contagem, como hoje. Para o bônus por conta, **dobra o que vem de atributos e de
   números fixos e não dobra o que vem de `PROF`/`NIV`**. Regra operacional, válida para qualquer conta:
   **valor no crítico = valor da conta + valor da conta com `PROF` e `NIV` zerados** (cada um já arredondado para
   baixo). Sem `PROF`/`NIV` isso é o dobro do valor final; só com `PROF`/`NIV` não dobra nada (como `PROF*2` hoje).
   Com ambos, a parcela de `PROF`/`NIV` fica e o resto dobra: `(FOR+PROF)*2` com Força 3 e `PROF` 2 vale 10 e,
   no crítico, 16 (a de Força vai de 6 para 12; a de `PROF` fica em 4). Num produto (`FOR*PROF`) a parcela de
   `PROF` não se separa e o valor não dobra. As formas legadas `ATR*N`/`ATR/N` **não mudam** (dobram o valor
   final, exceto `PROF`/`NIV`, como hoje). O arredondamento por parcela pode deslocar 1 ponto em contas com
   divisão (`(FOR+PROF)/2`, 3 e 2: 2 normal, 3 no crítico) — aceito e documentado no guia.

## Entregáveis

1. **Avaliador de conta** puro em `shared/src/regras/rolagem/`: lê a conta, respeita precedência
   (`* /` antes de `+ -`, associatividade à esquerda), parênteses aninhados e `-` unário; avalia com
   **aritmética exata (frações de inteiros)** e arredonda para baixo (`floor`) só no fim. Sem `eval`/`Function`.
   Limites explícitos de **profundidade** e de **tamanho** da conta (o backend valida texto vindo do cliente).
2. **Gramática**, em `interpretarSegmento`:
   - **Quantidade**: `(<conta>)[dD]<faces><operadores>`, com os mesmos operadores por pool (`kh`/`kl`/`cm`/`!`/`?`),
     sinal por termo e tag de tipo (`[Q]`, `[F-Q]`) das outras formas de dado.
   - **Bônus fixo**: um termo (o trecho entre `+`/`−` de nível superior) sem dado, formado por números, fontes,
     `* /` e parênteses — `FOR*VIG`, `(FOR+VIG)*2`, `2*(LUT+PROF)` — com sinal e tag de tipo. `ATR*N` e `ATR/N`
     são casos particulares e **mantêm DTO e resultado de hoje**.
   - **Desambiguação por contexto** (nada do que vale hoje muda): grupo seguido de `dM` é conta de quantidade;
     grupo **com dados** seguido de `[Tipo]` é pool tipado; grupo seguido de `#N` é repetição da fórmula inteira;
     grupo **só de números e fontes**, sem `dM` nem `#N`, é conta de bônus fixo; grupo com dados sem tag nem `#N`
     segue sendo erro de parse.
   - **A conta é o termo.** Termos vizinhos separados por `+`/`−` arredondam cada um (`FOR/2+VIG/2`, com 3 e 3, dá
     2, como hoje); **para somar antes de arredondar, parênteses** (`(FOR/2+VIG/2)` dá 3). O guia explica isso.
3. **Interpretação**: a conta interpretada vira um value object (nomeado conforme `dto-conventions`) guardado em
   campo opcional de `TermoDadoDto` (quantidade) e num termo de bônus por conta (extensão de `TermoAtributoDto`
   ou termo novo, preservando `rotulo` para o detalhamento e o agrupamento por tipo de dano). `(ATR±n)dM`,
   `(ATR*Y)dM`, `ATR*N` e `ATR/N` **continuam produzindo exatamente o DTO e o resultado de hoje** — seja roteando-as
   pelo avaliador novo com saída idêntica, seja mantendo o caminho atual.
4. **Rolagem**: quantidade = piso da conta, limitada a `QUANTIDADE_DADOS_MAXIMA` (100) e a 0 por baixo (D1/D2);
   crítico dobra a quantidade como hoje; `desvantagem` marcada no resultado quando D1 se aplica. Bônus por conta =
   piso da conta, somado com o sinal do termo e listado em `atributos` do resultado (`rotulo` + `valor`), de modo que
   o detalhamento da bandeja de dados não muda; crítico conforme D4 (decisão 7).
5. **Guia de fórmulas** (`guia-formula.component.ts`): seção nova com os exemplos do autor, a regra de
   arredondamento ("sempre para baixo, uma vez, no fim da conta", e parênteses para somar antes de arredondar), as
   formas `((conta))dM` e `(conta)` de bônus, e a nota do crítico ("no crítico, o que vem de atributos e de números dobra; o que vem de `PROF` e `NIV` não").
6. **Corpus**: `docs/specs/active/montador-rolagem-experimento/montador-rolagem-formulas.json` (10 fórmulas dos jogadores + 78 de bateria)
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
- Testes do **bônus fixo**: `(FOR+VIG)*2` com 3 e 2 → 10; `FOR*VIG` e `2*(LUT+PROF)`; `FOR/2+VIG/2` com 3 e 3 → 2 contra
  `(FOR/2+VIG/2)` → 3 (a conta é o termo); sinal (`2d6-(FOR+VIG)*2`) e tag (`(FOR+VIG)*2[Q]`, `[F-Q]`); divisor zero
  literal inválido e por atributo valendo 0; crítico conforme D4: `(FOR+VIG)*2` com 3 e 2 → 10 e 20, `(FOR+PROF)*2`
  com 3 e 2 → 10 e 16, `PROF*FOR` e `PROF*2` não dobram, `(FOR+PROF)/2` com 3 e 2 → 2 e 3; `ATR*N`/`ATR/N`
  idênticos ao snapshot; `(2d6+FOR)` sem tag nem `#N` continua erro de parse.
- Fórmulas inválidas devolvem erro claro, nunca lançam: parêntese aberto/fechado a mais, conta vazia (`()d6`),
  operador duplo (`**`), fonte desconhecida, divisão por zero literal, conta além dos limites de profundidade/tamanho.
- `((Int+soc)/2)d20kh1cm1+prof` (a fórmula "não funciona, mas deveria") passa a ser válida e rola; o corpus lista
  também as formas novas esperadas (`esperada_apos_expressao`).
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
- `docs/core` **sem diferença** no diff (a contradição segue só em `P-093`).
- Teste de ponta a ponta no app real (`verify`): digitar `((FOR+VIG)*2)d4`, `2d6+(FOR+VIG)*2` e a fórmula da média
  na "Rolagem rápida", rolar (também com crítico) e conferir o detalhamento na bandeja de dados.

## Fora de Escopo

- Funções (`min`, `max`, raiz), decimais literais e `×`/`÷` como caracteres: só ASCII `* /`. Vira ideia em
  `IDEAS.md` se o autor quiser.
- **Editar `docs/core`** (inclusive a linha 2045): decisão do autor, fica só em `P-093`.
- Qualquer mudança no montador (é o experimento, em outra spec) e no formato salvo das fichas: a fórmula continua
  sendo só texto em `ficha.dados`, sem migration.
- Mexer na linha `:1185` (média de nível do esquadrão, "0,5 para cima") — é outra regra, com exceção própria.
- Alterar o comportamento de qualquer fórmula hoje válida.

## Dependências

Nenhuma spec anterior. Fontes de verdade: `docs/core/sistema-v4.1.0.md` — "Arredondamentos" (`:2025-2039`), crítico
(`:1810`, `:1965`) e "Ordem de Bônus" (`:2043-2049`, só para a contradição); skill `regras-do-jogo` (motor puro,
consumidores, fecho); `P-093` e `P-092` de `PROBLEMS.md`. Bloqueia `montador-rolagem-experimento.spec.md`.

## Riscos e Mitigação

- **Ponto flutuante**: `7/3*3` em `number` pode dar 7,000000000000001 ou 6,999999999999999 e o `floor` erra um
  dado. Mitigação: aritmética exata de frações (numerador/denominador inteiros) e teste dedicado.
- **Parser por regex colidindo com as formas atuais** (`(ATR±n)dM` casando antes ou depois da forma geral muda o
  tratamento de desvantagem). Mitigação: o snapshot do corpus e a ordem explícita das tentativas no
  `interpretarSegmento`.
- **Conta patológica vinda do cliente** (aninhamento extremo, texto enorme) no backend. Mitigação: limites de
  profundidade e tamanho + avaliador sem `eval`.
- **Crítico por parcela com divisão** desloca até 1 ponto (o piso é por parcela): é a regra decidida (D4), não um
  defeito — o teste cita o caso `(FOR+PROF)/2` e o guia o descreve.
- **Bônus por conta colidir com `ATR*N`/`ATR/N`**: o termo `FOR*3` hoje usa piso de `(base*mult)/div` e o crítico
  dobra o valor final; a forma nova não pode deslocar essa conta. Mitigação: o snapshot do corpus e os testes dos
  dois caminhos lado a lado.

## Fecho (2026-10-03)

Implementada conforme a spec. Desvios e escolhas de implementação registrados para auditoria:

- **Duas expectativas de teste antigas mudaram**, contra o critério "nenhum teste existente tem expectativa alterada":
  `(LUT+3)` sem `dM` e `(LUT)`/`2d6 + (LUT)` eram afirmados inválidos (m3-46). A desambiguação desta spec (grupo só de
  números e fontes, sem `dM` nem `#N`, é conta de bônus fixo) os torna válidos; nenhuma fórmula **válida** de antes mudou
  (snapshot do corpus sem divergência).
- **Limites escolhidos:** 200 caracteres (`CONTA_TAMANHO_MAXIMO`), 8 níveis de parêntese (`CONTA_PROFUNDIDADE_MAXIMA`) e 9
  dígitos por número (`CONTA_NUMERO_DIGITOS_MAXIMO`), em `rolagem.dados.ts`.
- **Conta só de números** vira constante (bônus) ou quantidade literal (dado) já na interpretação, com as regras do `NdM`
  literal (`(1-1)d6` e `(200)d6` são inválidos).
- **Grupo só de fontes com tag** (`(FOR+VIG)[Q]`) virou bônus tipado — antes era erro; grupo com dado sem tag e
  `(2d12+2)[F]` seguem inválidos.
- Fora do escopo e registrado: `P-094` (o guia estoura 24 px no mobile por uma frase antiga).

