# ui-35-montador-rolagem.spec.md

> Spec avulsa, fora da fila de milestone. Origem: conversa com o autor sobre tornar a
> "Rolagem rápida" da ficha mais "end-user" — hoje é só um `<input type="text">` livre, e o
> único apoio é a cheatsheet estática `guia-formula` (explica a sintaxe, não monta nada).

## Objetivo

Dar à "Rolagem rápida" de `ficha-rolagens.component` um teclado de botões (`MontadorRolagem`)
que insere tokens de fórmula direto na mesma `FormControl<string>` já usada hoje — sem exigir
que o jogador decore a sintaxe do motor (`kh`/`kl`/`cm`/`!`/`?`, tags `[Tipo]`, `(ATR±n)dM`,
`(<fórmula>)#N`) para montar um teste ou um dano tipado. O campo de texto livre continua
existindo e editável a qualquer momento — o teclado só escreve nele, nunca o substitui.

## Componente análogo aprovado

`frontend/src/app/shared/calculadora-flutuante/` (`.component.ts`/`.html`/`.scss`): grade de
botões BEM (`calc-flutuante__tecla`, modificadores `--operador`/`--funcao`/`--igual`) que
concatena tokens num `signal<string>` via `inserir(token)`, com guarda simples de "operador
substitui o anterior". `MontadorRolagem` replica essa mecânica de inserção, trocando dígitos
por tokens de fórmula de rolagem. Densidade, iconografia e comportamento responsivo (grade que
quebra linha) devem seguir esse mesmo padrão — conferir lado a lado na verificação visual.

Para grupos de seleção única (se algum vier a existir), o padrão normativo é
`Segmentado`/`SegmentadoItem` (`P-056`, `docs/design/DESIGN.md:176`). Não há primitivo pronto
para toggle múltiplo independente — usar `Botao`/`BotaoIcone` com `aria-pressed` manual, como já
feito no botão de visibilidade de `rolagem-avulso.component.html`.

## Entregáveis

1. Componente novo `MontadorRolagem`, standalone, em
   `frontend/src/app/shared/montador-rolagem/` (`montador-rolagem.component.ts/html/scss`),
   recebendo a fórmula via `model.required<string>()` (mesmo espírito de
   `CalculadoraFlutuante.aberta`) — lê e escreve a mesma string que já alimenta `rapida` em
   `ficha-rolagens.component.ts`. Sem parser client-side de "onde inserir": é concatenação de
   string com guardas simples, igual ao componente análogo. Nenhuma regra de dados vive aqui
   (proibição #26 do `CLAUDE.md`) — validação continua sendo `validarFormula`, já existente.
2. Grupos de token (cada um vira uma seção visual do teclado):
   - **Dado**: 7 botões — `d3`, `d4`, `d6`, `d8`, `d10`, `d12`, `d20` (dados canônicos do
     sistema, `docs/core/sistema-v4.1.0.md` — "Dados"; sem `d100`). Insere `d{N}`.
   - **Atributo**: 10 botões (`DES`, `FOR`, `LUT`, `PON`, `VIG`, `INT`, `MED`, `SEN`, `SOC`,
     `VON` — `ABREVIACOES_ATRIBUTO`) + `PROF`/`NIV`. Insere a sigla, com `+` automático quando
     o campo não está vazio e o último caractere não é operador/`(`.
   - **Manter maior / Manter menor**: dois botões (`kh`, `kl`) + `StepInput` compacto ao lado
     (padrão N=1) — insere `kh{N}`/`kl{N}` como um único token.
   - **Avançado** (margem de crítico / explosão / implosão): `cm{N}` (com `StepInput`,
     padrão N=1), `!`, `?`.
   - **Tipo de dano**: 5 botões, um por `TipoDanoEnum` (Físico/Balístico/Explosão/
     Químico/Geral), cor do token do tema (`--dano-fisico` etc.) — insere `[F]`…`[G]`.
   - **Atalhos do agente**: `CORPO`/`FURTIVO`, visíveis só quando `atalhosDano()` (input já
     existente do componente pai) tem valor — mesma regra que já vale para `guia-formula`.
   - **Operadores/fixos**: `+`, `-`, `(`, `)`, dígitos `0`-`9`, apagar último, limpar.
3. **Ação composta "Dado por atributo+ajuste"**: mini-formulário inline (atributo — lista dos
   10 + `PROF`/`NIV` —, deslocamento via `StepInput` com sinal, dado via os mesmos botões
   `d3`…`d20`) que insere o bloco inteiro `(ATR±n)dM` de uma vez, sem o usuário digitar nenhum
   parêntese à mão. Os operadores por pool (`kh`/`kl`/`cm`/`!`/`?`) continuam inseridos depois,
   token a token, encostados nesse bloco.
4. **Ação composta "Repetir tudo" (`#N`)**: botão que envolve a string **atual inteira** do
   campo em `(...)` e acrescenta `#N` no final (`N` via `StepInput`, padrão 2, teto
   `REPETICOES_MAXIMA = 20` do motor). Habilitado só quando a fórmula atual não está vazia.
5. Integração em `ficha-rolagens.component.html`: um `BotaoIcone`/`Botao` "Montar" ao lado do
   `<app-guia-formula>` existente (linha ~6-9), que abre/fecha um painel colapsável **abaixo**
   do input de "Rolagem rápida" (não modal — o input continua visível enquanto o teclado
   escreve nele, reforçando o modelo "teclado que edita texto visível"). `guia-formula`
   continua existindo sem alteração — as duas formas de apoio (consulta passiva / montagem
   ativa) convivem.
6. Teste unitário do componente novo cobrindo: inserção simples por grupo, guarda de
   operador (não duplica `+`/`-` seguidos), as duas ações compostas (conferir a string exata
   gerada para os três exemplos de aceite abaixo) e abrir/fechar do painel.

## Critérios de Aceite

- `npm run test --workspace=shared` sem regressão (motor não muda nesta task).
- `npm run test --workspace=frontend`, `npm run lint --workspace=frontend` e
  `npm run build --workspace=frontend` verdes, com os testes novos do entregável 6 passando.
- Reproduzir, só clicando no teclado (sem digitar no input), as três fórmulas validadas nesta
  conversa contra o parser real (`interpretarFormula`) e confirmar que `rapidaValida()` aceita
  cada uma:
  1. `3D10+FOR [Físico] + 3D6 [Químico]` — dois termos de dado com tags de dano diferentes.
  2. `(LUT+2)d20kh1cm1+PROF+5` — via ação composta "Dado por atributo+ajuste" (`LUT`, `+2`,
     `d20`) seguida de `kh1`, `cm1`, `+PROF`, `+5`.
  3. Montar `(PON+1)d20kh1cm1+PROF+3+2+1` pelo teclado (ação composta "Dado por
     atributo+ajuste" com `PON`/`+1`/`d20`, seguida de `kh1`, `cm1`, `+PROF`, `+3`, `+2`,
     `+1`) e então clicar "Repetir tudo" com N=2 — o resultado esperado é
     `((PON+1)d20kh1cm1+PROF+3+2+1)#2`, com os parênteses balanceados automaticamente pela
     ação composta. Esse é o caso que, digitado à mão pelo autor nesta conversa, saiu com um
     `)` a mais (`...+1))#2`) e teria falhado a validação — a ação composta existe para evitar
     exatamente esse erro.
- Gate visual obrigatório (skill `verify`, `1920×1080` e `360×800`): abrir a aplicação real,
  expandir o painel do `MontadorRolagem` na aba Rolagens de uma ficha, montar as três fórmulas
  acima só pelos botões, rolar de verdade (bandeja de dados mostra resultado). Conferir que a
  grade de botões e o mini-formulário de "Dado por atributo+ajuste" quebram linha sem overflow
  no mobile, que o painel não sobrepõe o input de forma confusa, e que o resultado visual "parece
  parte do mesmo produto" que `calculadora-flutuante` (densidade, iconografia, tokens do tema).
- `docs/context/HISTORY.md` ganha o bloco desta task no topo; `docs/context/CONTEXT.md` é
  atualizado nas seções afetadas.

## Fora de Escopo

- Campo `formula` do formulário de preset (`ficha-rolagens.component.html` ~linha 348/427) e
  `rolagem-avulso.component` (sem atributos de ficha disponíveis ali, o grupo "Atributo" do
  teclado ficaria capado) — registrar como ideia (`IDEAS.md`) para uma v2, não implementar aqui.
- Qualquer parsing "inteligente" de posição de inserção (ex.: entender que já existe um `kh1`
  no meio da string e trocar por `kh2` em vez de duplicar) — a v1 é só concatenação, como o
  componente análogo.
- Qualquer mudança no motor `shared/src/regras/rolagem/` — a gramática já suporta tudo que o
  teclado precisa; esta task é só UI.
- Persistir preferências do teclado (último dado usado, grupo aberto) entre sessões —
  `localStorage`/backend fora de escopo, estado só em memória (Signals), como
  `CalculadoraFlutuante.historico`.

## Dependências

Nenhuma. Não bloqueia nem é bloqueada por spec ativa.

## Riscos e Mitigação

- **Ação composta "Repetir tudo" produzir parênteses desbalanceados** se a string atual já
  tiver parênteses abertos por outro caminho (ex.: usuário monta metade de um
  `(ATR+n)dM` e clica "Repetir tudo" antes de fechar). Mitigação: o botão só embrulha a string
  inteira (`(` + string atual + `)#N`) — desbalanceamento pré-existente vira erro visível em
  `rapidaValida()` como qualquer outro erro de digitação; não é responsabilidade da ação
  composta validar o que já estava lá, só não introduzir um erro novo por conta própria (o que
  ela não faz, por construção — sempre fecha o que ela mesma abre).
- **Grade de 7 dados + 12 atributos/fontes + 5 tipos de dano + avançado + operadores** pode
  ficar densa demais e "não parecer nosso produto" (risco central do gate de design do
  `CLAUDE.md`). Mitigação: seguir a densidade/agrupamento visual do `calculadora-flutuante`
  (seções separadas, não uma grade única) e resolver divergência **antes** de apresentar,
  conforme o processo obrigatório de UI.
