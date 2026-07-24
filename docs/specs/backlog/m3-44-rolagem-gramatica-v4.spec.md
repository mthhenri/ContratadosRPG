# m3-44-rolagem-gramatica-v4.spec.md

> Task 41 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).
> Estende o pacote de rolagem (`m3-16`/`m3-29` — gramática v2/v3).

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` (Testes / Dano). **O documento vence**
> (proibição #27). Task de **motor** — `npm run test --workspace=shared` antes e depois.

## Objetivo

Estender a gramática de rolagem (v4) com dois recursos: **repetir o mesmo teste N vezes** e
**atributo + valor como fonte de dados**.

## Entregáveis

1. **Parênteses no parser.** Hoje `interpretarFormula`
   (`shared/src/regras/rolagem/rolagem.ts`, ~linha 295) e `interpretarOperadores` (~linha 114)
   **não suportam parênteses** — os dois recursos abaixo dependem de introduzir agrupamento por
   `(...)`. Estender o tokenizer/parser + `validarFormula` (~linha 359) sem quebrar a gramática v3
   (constantes, `+ATRIBUTO`, `ATRIBUTOdM`, `ATRIBUTO*n`, `[Tipo]`, `kh/kl/cm/!/?`).
2. **Repetição `#N` (item 20).** Sintaxe `(<fórmula>)#N` rola a fórmula inteira **N vezes
   independentes**, ex.: `(PONd20kh1cm1+PROF)#3` → 3 resultados separados. Definir o teto de N e
   como o resultado múltiplo entra em `ResultadoRolagemDto` (`rolagem.dtos.ts`) — provável lista
   de sub-resultados. `rolarFormula`/`rolarInterpretada` (~linhas 515/528) produzem os N.
3. **Atributo + valor como fonte de dados (item 21).** Sintaxe `(<ATRIBUTO>+<n>)dM` usa
   (atributo + n) como **quantidade de dados** de M faces, ex.: `(LUT+3)d20` = (Luta+3) dados de
   d20. Distinto do `ATRIBUTOdM` atual (que usa só o atributo). Encaixar em `interpretarFormula`.
4. **Cheatsheet + testes.** Atualizar o guia de fórmula
   (`frontend/src/app/modules/ficha/componentes/guia-formula/guia-formula.component.ts`) com os
   dois recursos e cobrir ambos com testes em `shared`.

## Critérios de Aceite

- `(PONd20kh1cm1+PROF)#3` produz 3 rolagens independentes exibidas separadamente.
- `(LUT+3)d20` rola (Luta+3) dados de 20 faces.
- Fórmulas da gramática v3 continuam válidas (sem regressão).
- Cheatsheet documenta a sintaxe nova; suíte `shared` verde.

## Fora de Escopo

- Dados físicos 3D e crítico automático (já fora de escopo desde a `m3-22`/`m3-30`).
- Aninhamento arbitrário além do necessário para os dois recursos (definir o mínimo viável).

## Dependências

- `m3-16`/`m3-29` (gramática v2/v3), `m3-30` (crítico mecânico — `cm`), `m3-21`/`m3-22`
  (runner/frontend de rolagem).
