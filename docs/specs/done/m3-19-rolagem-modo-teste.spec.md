# m3-19-rolagem-modo-teste.spec.md

> Task 19 do milestone `m3-ficha-jogador.spec.md`. Terceira do pacote **Rolagem v2**
> (`m3-16` gramática → `m3-18` dano tipado → **`m3-19` teste** → `m3-20` efeitos → `m3-21` presets →
> `m3-22` frontend). Depende de m3-16. Folha independente da m3-18.

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Testes": rola um pool de `(Atributo)` D20,
> **pega o maior**, soma **Proficiência (= nível)**; sucesso se ≥ DT. **O documento vence.**

## Objetivo

Adicionar o **modo TESTE** ao motor: rolar o pool de dados e **pegar o maior**, somando Proficiência
e bônus planos — a regra real de teste de atributo, distinta do `SOMA` (que soma). O modo é
**propriedade do roll**, não do texto da fórmula.

## Entregáveis

### 1. `RolagemModoEnum` (`shared/src/enums/rolagem-modo.enum.ts`, exportado em `index.ts`)

`TESTE | SOMA`. Ausente = `SOMA` (legado).

### 2. DTOs (`rolagem.dtos.ts`) — aditivos

- `RolagemDto` += `modo?: RolagemModoEnum`, `proficiencia?: number | null` (Civil/`null` = 0).
- Novo `ResultadoTesteDto` (`pool`, `maiorDado`, `descartados`, `proficiencia`, `bonusPlano`, `total`).
- `ResultadoRolagemDto` += `teste?` (presente só no modo TESTE; então `total = teste.total`).

### 3. Parser + roll (`rolagem.ts`)

- `interpretarFormula(texto, modo?)` / `validarFormula(texto, modo?)` — modo repassado.
- **Açúcar do teste:** no modo TESTE, um **atributo puro** (`luta`) vira o pool `(Atributo)`D20
  (`lutad20`) — implementado no ramo "atributo modificador" do parser. `FORd6`/`FOR*3`/constantes
  continuam explícitos.
- `rolarFormula` no modo TESTE → `montarResultadoTeste`: junta todos os `valores` num pool, pega
  `Math.max`, separa os `descartados`, e `total = maiorDado + proficiencia + bonusPlano`
  (bônus plano = atributos-modificador + constantes; tipo de dano é ignorado num teste).

## Casos de teste (`rolagem.spec.ts`, `rolarDado` injetado) — 7 novos, 31 no total

Açúcar `luta` → `(luta)`D20 (e `atributos` vazio) · regressão SOMA (`luta` = modificador) ·
pega o maior + Proficiência (pool `[5,18,9]` → 18 (+2) = 20; `descartados [5,9]`) · `luta` ==
`lutad20` no roll · Proficiência `null` = 0 · bônus plano (constante) somado · modo SOMA sem `teste`.

## Fora de escopo (próximas tasks)

Amplificadores/origens de atributo (ainda não existem no domínio; entram como bônus plano quando
existirem), crítico do teste (+2 por dado no limiar — fora do motor por ora), efeitos de habilidade
(m3-20), presets/UI (m3-21/m3-22). **Nota:** optei por **não** adicionar `modo` ao `ResultadoRolagemDto`
— a presença de `teste?` já sinaliza o modo TESTE (contrato mais enxuto que o esboço do plano).
