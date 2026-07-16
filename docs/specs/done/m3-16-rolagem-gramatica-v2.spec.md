# m3-16-rolagem-gramatica-v2.spec.md

> Task 16 do milestone `m3-ficha-jogador.spec.md`. Primeira das 6 do pacote **Rolagem v2**
> (`m3-16` gramática → `m3-18` dano tipado → `m3-19` teste → `m3-20` efeitos de habilidade →
> `m3-21` presets/runner → `m3-22` frontend). Fundação léxica: **não muda o comportamento somado**.

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Atributos"/"Testes"/"Dano" (o atributo como
> **fonte de dados** de um teste e o escalonamento `Atributo × N` de habilidades). **O documento vence.**

## Objetivo

Estender o parser puro `interpretarFormula`/`rolarFormula` (`shared/src/regras/rolagem/`) com dois
recursos léxicos, **ainda somando tudo** (modo TESTE e dano tipado vêm nas próximas tasks):

1. **Atributo como fonte de dados** — `ATRdM` (ex.: `FORd6`, `lutad20`): a quantidade de dados é o
   **valor do atributo** no momento da rolagem, não um literal.
2. **Escalonamento de atributo** — `ATR*N` / `ATR/N` (ex.: `FOR*3`, `LUT/2`): multiplica/divide o
   valor do atributo por um inteiro. Divisão usa **piso** (`Math.floor`).

E **rejeitar parênteses** explicitamente (fora de escopo na v1) com mensagem clara.

## Entregáveis

### 1. DTOs (`rolagem.dtos.ts`) — aditivos, opcionais

- `TermoDadoDto` += `quantidadeAtributo?: keyof FichaAtributosDto` — quando presente, a contagem de
  dados = valor do atributo no roll (ignora `quantidade`, que fica no default 1).
- `TermoAtributoDto` += `multiplicador?: number` (`ATR*N`) e `divisor?: number` (`ATR/N`).

### 2. Parser (`interpretarFormula`)

Ordem de reconhecimento de cada termo (após split por `+`/`-`):
1. Dado literal `^(\d*)[dD](\d+)$` (atual).
2. **Dado por atributo** `^([A-Za-z]+)[dD](\d+)$` **e** o prefixo resolve num atributo → `quantidadeAtributo`.
3. **Atributo escalado** `^([A-Za-z]+)([*/])(\d+)$` **e** o prefixo resolve num atributo → `multiplicador`/`divisor` (`/0` = erro).
4. Constante `^\d+$` (atual).
5. Atributo modificador (atual).
6. Senão → `Termo desconhecido`.

Antes do split: se o texto contém `(` ou `)` → `{ valida:false, erro:'Parênteses ainda não são suportados.' }`.
`rotulo` do termo de atributo = corpo original em MAIÚSCULAS (ex.: `FOR*3`), como hoje.

### 3. Roll (`rolarFormula`)

- Dado com `quantidadeAtributo`: contagem = `clamp(atributos[attr] ?? 0, 0, QUANTIDADE_DADOS_MAXIMA)`
  (atributo ≤ 0 → 0 dados, `valores: []`, `subtotal: 0`).
- Atributo escalado: `valor = sinal * Math.floor((atributos[attr] ?? 0) * (multiplicador ?? 1) / (divisor ?? 1))`.

## Casos de teste (`rolagem.spec.ts`, `rolarDado` injetado)

- `FORd6` com FOR=6 → 6 dados de 6 faces; `quantidadeAtributo:'forca'` na interpretação.
- `lutad20` (nome curto e completo `lutad20`) → LUT dados de 20 faces.
- `FOR*3` com FOR=6 → +18; `LUT/2` com LUT=3 → +1 (piso).
- `FOR/0` → inválida; `(1d20)` → inválida (parênteses).
- **Regressão:** todos os casos atuais (`1d20+LUT`, `2d6-FOR`, etc.) permanecem idênticos.

## Fora de escopo (próximas tasks)

Modo TESTE / pegar-o-maior (m3-19), tags de dano `[Tipo]`/Composto (m3-18), efeitos de habilidade
(m3-20), presets encadeados (m3-21), qualquer UI (m3-22). Encadear `*` e `/` no mesmo termo
(`FOR*3/2`) e escalar dados (`FORd6*2`) ficam para depois — rejeitados por ora.
