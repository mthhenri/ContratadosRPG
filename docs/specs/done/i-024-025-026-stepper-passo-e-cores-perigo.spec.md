# i-024-025-026-stepper-passo-e-cores-perigo.spec.md

> Task avulsa que fecha três ideias de `IDEAS.md` — `I-024`, `I-025`, `I-026` — depois de conferir
> cada uma contra o código atual (a "porta de entrada" das três já mudou de forma desde que foram
> escritas, principalmente por causa do `P-057`/`P-058`, que nasceram na mesma sessão).

## Contexto (auditoria antes de implementar)

- **`I-024`** (perigo = primário): **já resolvida**, sem diff necessário. `ui-12-tokens-
  semanticos-de-estado` (spec em `done/`) desacoplou a severidade `perigo` de `--accent` faz
  tempo — `Botao` e `Chip` usam `var(--erro)`, `app-valor-editavel` (`P-057`) usa `var(--vida)`
  pro seu `variante="perigo"`; nenhum dos dois é `--accent`. Não sobrou nenhuma cópia local de
  `.botao--perigo` (`grep -rn "\.botao--perigo\b" frontend/src --include=*.scss` só acha o
  primitivo). Esta task só fecha a entrada em `IDEAS.md`.
- **`I-025`** (primitivo de "stat editável" pra `ficha-mini`/`ficha-atributo`): **metade
  resolvida por acidente**. A parte "editar in-line + dadinho de rolar" de `ficha-mini` (Nível,
  Prestígio, Dinheiro, Dano C.a.C./Furtivo) já é composição de `app-valor-editavel` +
  `app-botao-icone` desde o `P-057`/`P-058` — não precisa de primitivo novo. A parte que **não**
  tem dono é o stepper de "segurar para repetir" (`appHoldRepeat`, sem digitação) que
  `ficha-atributo` usa três vezes (valor do atributo, modificador de teste, ajuste de dados).
- **`I-026`** (`[tamanho]="compacto"` no `StepInput`): o input `[tamanho]` já existe
  (`padrao`/`compacto`/`mini`) e `guia-equipamento-loja` já usa `mini`. Mas `.ficha-passo` em
  `ficha-visualizacao` não é mais um stepper completo — é só um botão avulso de segurar-repetir
  que flanqueia `app-barra-recurso` (Vida/Energia), forma que `app-step-input` (botão+valor+botão
  num bloco só) não cobre. `[tamanho]` como pedido literalmente pela ideia não resolve nada novo.
- **Achado**: `I-025` e `I-026`, juntas, apontam pro mesmo buraco real — um botão de segurar-
  repetir sem digitação, hoje duplicado (com geometria ligeiramente diferente em cada cópia) em
  pelo menos 7 lugares: `.ficha-atributo__stepper`/`__modificador`/`__dados` (×3, ficha-
  visualizacao), `.criatura__atributo-linha-stepper` (×1, criatura-visualizacao), `.ficha-passo`
  de custo de habilidade (×2, ficha-habilidades) e de pontos de lesão (×1, ficha-sanidade).
  Decisão do autor: estender `app-step-input` em vez de criar um primitivo novo.

## Objetivo

Dar ao `app-step-input` um modo "sem digitação" (`[digitavel]="false"`) — só os dois botões com
segurar-para-repetir e um valor só-leitura no meio — e migrar os 7 usos identificados pra ele,
convergindo a identidade visual (hoje com pequenas variações de tamanho/cor entre cópias) para o
tamanho `mini` já existente do primitivo.

## Entregáveis

1. `StepInput` (`shared/ui/stepper/`) ganha dois inputs novos, opt-in:
   - `[digitavel]` (`boolean`, default `true`): quando `false`, os botões trocam `(click)` por
     `appHoldRepeat`/`(passo)` (import do diretório `shared/hold-repeat/`) e o valor central vira
     `<span class="stepper__valor stepper__valor--exibicao">` só-leitura, sem `<input>` — sem
     digitação direta nem foco. Comportamento e marcação de `digitavel=true` (default) continuam
     byte-idênticos aos 6 consumidores atuais da Simulação.
   - `[comSinal]` (`boolean`, default `false`, só relevante com `digitavel=false`): antepõe `+`
     a valores positivos e aplica o modificador `.stepper__valor--ativo` (cor `--accent`) quando
     o valor é diferente de zero — replica `.ficha-atributo__mod-valor--ativo`/`__dados-valor--
     ativo`.
2. SCSS do primitivo: estilo de `.stepper__valor--exibicao` (mesma tipografia/alinhamento do
   `<input>`, sem cursor de texto) e `.stepper__valor--ativo`.
3. Migrar para `app-step-input[digitavel]="false"[tamanho]="mini"` (usando `[valorExterno]`/
   `(valorAlterado)` onde o dado é um Signal solto, `[formControl]` onde já é `FormControl`):
   - `ficha-visualizacao.component`: `.ficha-atributo__stepper` (valor do atributo, sem `[min]`/
     `[max]` — "liberdade total", m3-10), `.ficha-atributo__modificador` (`[comSinal]="true"`) e
     `.ficha-atributo__dados` (`[comSinal]="true"`). Os três usam `[valorExterno]`/
     `(valorAlterado)`; os métodos `ajustarAtributoRascunho`/`ajustarModificadorTesteRascunho`/
     `ajustarDadosTesteRascunho` (hoje recebem um delta) viram um setter de valor absoluto —
     `app-step-input` já faz o clamp/soma internamente.
   - `criatura-visualizacao.component`: `.criatura__atributo-linha-stepper` — já existe
     `definirAtributoRascunho(chave, valor)` como setter absoluto; `(valorAlterado)` liga direto
     nele. `ajustarAtributoRascunho(chave, delta)` fica sem uso e sai.
   - `ficha-habilidades.component`: os dois steppers de custo (variável e fixo) — `[formControl]`
     direto (`custoVariavel`/`habilidadeForm.controls.custoEnergia`) com `[min]="0"`; os métodos
     `ajustarCusto`/`ajustarCustoVariavel` (só faziam `Math.max(0, atual+delta)`, que o primitivo
     já cobre com `[min]`) ficam sem uso e saem.
   - `ficha-sanidade.component`: o stepper de pontos — `[formControl]="lesaoForm.controls.pontos"`
     com `[min]="0"`; `ajustarPontos` sai pelo mesmo motivo.
   - Apagar a marcação/CSS local que cada um substitui (`.ficha-passo`, `.ficha-atributo__mod-
     passo`/`__dados-passo`/`__mod-valor`/`__dados-valor`, `.criatura__passo`/`__atributo-linha-
     valor`, os dois `.ficha-passo` locais de `ficha-habilidades`/`ficha-sanidade` e
     `.habilidades__valor`/`.sanidade__pontos`) — a task não termina enquanto a cópia existir.
4. `DESIGN.md`: documentar `[digitavel]`/`[comSinal]` na seção do `StepInput`.
5. `IDEAS.md`: remover `I-024` de Abertas (nota curta: resolvida por `ui-12`, sem spec própria
   necessária); substituir `I-025`/`I-026` por uma nota curta apontando para esta spec em
   `docs/specs/done/`.

## Critérios de Aceite

- Convergência visual **deliberada, não pixel-diff-zero**: os 7 pontos migrados passam a ter a
  mesma geometria `mini` do primitivo (hoje variam entre 18px/20px/22px de botão e cores
  diferentes de "não ativo") — documentar cada divergência aceita no fecho, mesmo padrão do
  `P-057`/`P-058` ("convergência de identidade aceita conscientemente").
- Testes focados dos 5 arquivos alterados + suíte completa do `frontend` sem regressão; lint sem
  erro novo.
- Gate visual ao vivo (skill `verify`) em `1920×1080` e `360×800`, cobrindo os quatro pontos de
  entrada: edição de Atributos da ficha de Agente (stepper + modificador + dados), edição de
  Atributos da ficha de Criatura, o editor de habilidade (custo fixo e variável) e o editor de
  lesão de Sanidade — segurar o botão precisa repetir (não só um clique), e o card de Atributos
  (3 colunas, o mais apertado dos quatro) não pode ganhar overflow com o `mini` um pouco maior que
  os 18px atuais do modificador/dados.
- `grep -rln "class=\"ficha-passo\"\|class=\"criatura__passo\"" frontend/src` não deve mais achar
  os 7 pontos migrados (só o que ficou de propósito fora de escopo, abaixo).

## Fora de Escopo

- Os botões `.ficha-passo` que flanqueiam `app-barra-recurso` (Vida/Energia) em
  `ficha-visualizacao` e em `detalhe.page` (`campanha`) — são dois botões avulsos ao redor de
  **outro** primitivo, não um bloco botão-valor-botão; `app-step-input` não tem como hospedar um
  `ng-content` de terceiro no meio sem mudar o contrato dos 6 consumidores digitáveis atuais.
  Registrar em `IDEAS.md` como ideia própria se o autor quiser revisitar depois.
- Mudar o texto de aria-label (`Diminuir`/`Aumentar`) dos 6 consumidores digitáveis atuais.
- Qualquer refino de `app-valor-editavel`/`app-botao-icone` — a metade de `I-025` que eles já
  resolvem fica como está.

## Dependências

`P-057`/`P-058` em `done/` (é o que mudou a forma do problema). `ui-12-tokens-semanticos-de-
estado` em `done/` (é o que já resolve `I-024`).

## Riscos e Mitigação

- **Card de Atributos é a coluna mais estreita do app** (3 colunas lado a lado no desktop) —
  `mini` (26px) é maior que os 18px atuais de modificador/dados. Mitigação: gate visual ao vivo
  nesse card especificamente, nos dois viewports, antes de fechar; se apertar demais, considerar
  aceitar quebra de sub-linha já prevista (`ficha-atributo-linha__secundaria` já empilha no
  mobile) em vez de forçar um tamanho novo no primitivo.
- **`ajustarAtributoRascunho`/`ajustarModificadorTesteRascunho`/`ajustarDadosTesteRascunho` mudam
  de assinatura** (delta → valor absoluto): conferir que nenhum outro call site dentro do mesmo
  componente ainda chama a versão antiga.
