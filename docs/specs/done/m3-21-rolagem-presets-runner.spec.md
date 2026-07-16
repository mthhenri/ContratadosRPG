# m3-21-rolagem-presets-runner.spec.md

> Task 21 do milestone `m3-ficha-jogador.spec.md`. Quinta do pacote **Rolagem v2**
> (`m3-16` gramática → `m3-18` dano tipado → `m3-19` teste → `m3-20` efeitos → **`m3-21` presets** →
> `m3-22` frontend). Depende de m3-20. Última task **de motor** (m3-22 é a UI).

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Testes"/"Dano"/"Habilidades". **O documento vence.**

## Objetivo

Modelar presets **encadeados** (rolagem primária + passos seguintes) que podem **vincular
habilidades** e, ao serem usados, **gastar a Energia** delas e **aplicar seus efeitos** nas fórmulas.
O runner é **puro**: resolve e interpreta; o front rola cada passo e debita a energia.

## Entregáveis

### 1. `RolagemPresetTipoEnum` (`shared/src/enums/`, exportado)

`SIMPLES | ENCADEADO`. Ausente = `SIMPLES`.

### 2. DTOs de preset (`ficha.dtos.ts`) — aditivos, retrocompatíveis

- `FichaRolagemDto` += `modo?` (m3-19), `tipo?` (`RolagemPresetTipoEnum`), `seguintes?:
  FichaRolagemPassoDto[]`, `habilidades?: string[]` (nomes das habilidades da própria ficha).
- Novo `FichaRolagemPassoDto` (`nome`, `formula`, `modo?`, `descricao?`).
- Preset legado `{ nome, formula, descricao? }` lê como `SIMPLES`/`SOMA` — sem migração.

### 3. DTOs do runner (`rolagem.dtos.ts`)

`PresetResolverDto` (preset, atributos, proficiencia?, habilidades? da ficha), `PassoInterpretadoDto`
(nome, modo, formula, interpretacao já com efeitos), `PlanoPresetDto` (passos, energiaGasta,
energiaVariavel, habilidadesVinculadas).

### 4. Runner (`rolagem.ts`)

- **`resolverPreset(dto) → PlanoPresetDto`** (puro): resolve as habilidades vinculadas pelo nome,
  coleta seus `efeitos` e soma `custoEnergia` (fixos; `null` → `energiaVariavel`, não soma). Monta os
  passos (primária + `seguintes`), interpreta cada um no seu `modo` e funde os efeitos via
  `aplicarEfeitos` (roteados por `alvo`↔modo). Habilidades ausentes na ficha são ignoradas.
- **`rolarPasso(passo, atributos, proficiencia?, rolarDado?)`**: rola um passo já resolvido via
  `rolarInterpretada` (passo inválido → `null`). Energia é só **reportada**; o front debita pelo
  canal `ajusteVitalidade`/`energiaAtual` (m3-22).

## Casos de teste — 6 novos, 250 no total

Preset legado → 1 passo SOMA sem energia · encadeado devolve primária + seguintes na ordem (com
modos) · Força Bruta vinculada injeta FOR×3 e soma 4 de energia (rolar o passo → Físico 34) · custo
variável `[X E]` marca `energiaVariavel` sem somar · habilidade inexistente ignorada · `rolarPasso`
null em fórmula inválida.

## Fora de escopo (m3-22 — frontend)

Editor de preset (tipo/modo/passos/picker de habilidades), débito de energia via `ajusteVitalidade`,
render por tipo/teste, guia de fórmula (dialog), dadinho + teste na Visão Geral, ícone `dado`.
