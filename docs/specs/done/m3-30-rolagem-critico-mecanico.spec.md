# m3-30-rolagem-critico-mecanico.spec.md

> **Nota (m3-31):** a **aplicação automática de efeitos de habilidade** (m3-20) foi **aposentada** depois
> desta spec. O crítico continua igual — dobra a **fórmula crua** (dados, fixos e atributos **escritos na
> fórmula**), exceto PROF/NIV. A única diferença é que, hoje, um `FOR×3` (ex.: Força Bruta) precisa estar
> **escrito na fórmula** do passo para ser dobrado; não há mais fusão automática vinda da habilidade.

> Sucede a **Gramática v3** (`m3-29`) e o modelo de **efeitos de habilidade** (`m3-20`). Torna o
> **crítico** uma mecânica de verdade nas rolagens de preset: um passo pode ser marcado como **critável**
> e, com isso, ganha a ação **"Rolar crítico"** que **dobra o dano**.

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "⬥ Crítico e Margem de Crítico". O crítico em
> **dano** é simples: **Dobrar** (linha 1217) — dobra **todos os dados e valores fixos (flat ou atributo),
> com todas as bonificações aplicadas** (ex.: `3D10 + Força×6` → `6D10 + Força×12`, incluindo Força Bruta).
> A exceção (linha 1303): **valores originados de Patente ou Nível se mantêm** (não dobram). **O documento
> vence.** O crítico de **teste** (+2 por crítico, 1218) fica fora deste escopo — segue informativo (`cm`).

## Objetivo

Permitir que o jogador marque um passo de preset (tipicamente o dano) como **critável**. A UI passa a
oferecer dois botões — **"Rolar"** e **"Rolar crítico"** — e o crítico dobra o dano conforme o documento
(dados, fixos e atributos escritos na fórmula), exceto Patente/Nível.

## Entregáveis

### 1. Dados

- `FichaRolagemDto.critico?` e `FichaRolagemPassoDto.critico?` (`boolean`): marca o passo primário / um
  seguinte como critável. Ausente = não. Persistido no JSONB opaco (sem migração de backend).
- `PassoInterpretadoDto.critico` (`boolean`, sempre presente): resolvido por `resolverPreset`.
- `ResultadoRolagemDto.critico?`: `true` quando a rolagem foi de crítico (dano dobrado).

### 2. Motor (`shared/regras/rolagem`)

- `rolarInterpretada(...)` e `rolarPasso(...)` ganham um parâmetro final `critico = false`.
- **Dados:** `rolarTermo` dobra o **número de dados** rolados quando crítico (regra 1217 — `2d8` vira
  `4d8`, rolagem fresca, não `2× a soma`).
- **Atributos:** dobra a contribuição de cada atributo, **exceto** `proficiencia`/`nivel` (PROF/NIV —
  regra 1303).
- **Fixos:** dobra as constantes (tipadas e sem tag).
- Marca `ResultadoRolagemDto.critico = true`.
- `resolverPreset` carrega `critico` de cada passo; `normalizarPresetLegado` **preserva** o campo.

### 3. Frontend

- **Editor** (`ficha-rolagens`): checkbox **"Passo critável"** no passo primário e em cada seguinte;
  serializado enxuto (`critico: true` só quando marcado).
- **Visão do preset:** passo critável mostra **"Rolar crítico"** (accent sólido + glow) ao lado de
  "Rolar"; chama `rolarPassoDoPreset(preset, passo, true)`. O rótulo da bandeja recebe o sufixo `· CRÍTICO`.
- **Bandeja:** realce de crítico **maior + glow** — o **total** brilha (crítico de dano ou termo que bateu
  a margem `cm`), selo **"crítico ×2"** na rolagem dobrada, e o indicador `◆` de margem ficou maior com
  brilho. Só tokens do tema (proibição #29).

## Verificação

- `shared` **301** testes: dobra de dados/fixos/atributos, exceção PROF/NIV, grupo de dano tipado,
  `resolverPreset` carrega `critico`, `rolarPasso(critico)` dobra + efeito de habilidade.
- `frontend` **317** testes: serialização de `critico` (primário e seguinte), "Rolar crítico" marca a
  entrada da bandeja como crítica.
- Render real (Playwright): passo critável mostra os dois botões; "Rolar crítico" dobra o pool
  (`2D8`→`4D8`) e a Força Bruta (`FOR×3 18`→`36`), com total em glow e selo "crítico ×2".
