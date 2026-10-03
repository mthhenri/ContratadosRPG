# montador-exp-01-tokenizacao-formula.spec.md

> Task 1/4 do guarda-chuva `montador-rolagem-experimento.spec.md` (`IDEAS.md` `I-041`). Sem UI.

## Objetivo

O motor passa a ler o texto da fórmula como **lista ordenada de peças** e a recompor o texto a partir delas, sem
mudar nenhum resultado de rolagem — é o modelo que as versões novas do montador vão editar (tasks 02–04).

## Entregáveis

1. Em `shared/src/regras/rolagem/`, `tokenizarFormula(texto): FormulaTokenizadaDto | null` e
   `montarFormula(FormulaTokenizadaDto): string`, funções puras.
2. Peças (`PecaFormulaDto`, em `rolagem.dtos.ts`): dado (quantidade número, fonte ou conta; faces; `kh`/`kl`, `cm`,
   `!`, `?`), fonte escalar (com `*N`/`/N`), número, conta de bônus fixo e atalho `CORPO`/`FURTIVO`; cada uma com
   sinal e tag de tipo simples ou composto (atalho sem tag). A repetição `#N` fica na fórmula (`repeticoes`).
3. A leitura usa as **mesmas** funções do motor: os auxiliares de leitura saem de `rolagem.ts` para
   `rolagem.leitura.ts` (interno, não reexportado), sem mudança de comportamento.
4. `tokenizarFormula` remonta e só devolve as peças se `interpretarFormula` ler o texto remontado igual ao original
   (com atalhos, sob expansões representativas); senão `null` — nunca uma peça trocada em silêncio.

## Critérios de Aceite

- Toda fórmula do corpus (`docs/design/propostas/montador-rolagem-formulas.json`) válida no motor tem peças e
  `montarFormula(tokenizarFormula(texto))` é interpretada igual ao original; as inválidas devolvem `null`.
- Os testes existentes do motor não mudam; `npm run test --workspace=shared` verde; lint sem erro.

## Fora de Escopo

UI, seletor, gate e modelo de estado (tasks 02–04); qualquer mudança de regra ou de resultado de rolagem.

## Dependências

`rolagem-expressao-quantidade-dados.spec.md` (em `done/`).
