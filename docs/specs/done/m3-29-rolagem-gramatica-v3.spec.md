# m3-29-rolagem-gramatica-v3.spec.md

> Refinamento do pacote **Rolagem v2** (`m3-16`…`m3-22`). Sucede a gramática v2. **Aposenta os "modos"
> de rolagem**: um teste deixa de ser um `RolagemModoEnum` que soma Proficiência por baixo dos panos e
> passa a ser uma **expressão de dados explícita** (`LUTd20kh1 + PROF`).

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Gerais"/"Testes": teste = rodar (Atributo) D20 e
> **pegar o maior** (linha 1201); `+Proficiência` por nível (684; exemplo 1307 — maior dado + Prof);
> **atributo zerado = 2 dados, pega o menor** (270); margem de crítico natural 1 (1216). **O documento
> vence.** Explosão/implosão **não existem** no documento — entram como operadores de ferramenta.

## Objetivo

Dissolver o `RolagemModoEnum { SOMA | TESTE }` numa gramática de dados pura. A fórmula especifica 100%
do roll; a Proficiência é um termo escrito (`+PROF`), nunca implícito. Novos operadores **por pool de
dado**: manter maior/menor, margem de crítico (informativa), explosão e implosão.

## Entregáveis

### 1. Gramática — operadores por termo de dado (`NdM` e `ATRdM`)

| Sintaxe | Significado |
|---|---|
| `khN` / `kh` | Manter os N **maiores** (padrão 1). Subtotal = soma dos mantidos. |
| `klN` / `kl` | Manter os N **menores** (padrão 1). |
| `cmN` / `cm` | Margem de crítico N (padrão 1): limiar = `faces − N + 1`. **Conta** mantidos ≥ limiar; **sem efeito** no total (só informativo). |
| `!` / `!>=N` / `!N` | **Explosão** (não-canônica): a cada dado ≥ limiar (bare `!` = máximo), rola +1 dado (recursivo, com teto). |
| `?` / `?<=N` / `?N` | **Implosão** (não-canônica): a cada dado ≤ limiar (bare `?` = mínimo), rola +1 dado (recursivo, com teto). |

Erros (retornam `{ valida:false, erro }`, nunca lançam): `kh`+`kl` juntos; `!`+`?` juntos; operador
repetido; `kh0`/`kl0`/`cm0`; sufixo desconhecido. Guards atuais mantidos (faces/quantidade ≥ 1, teto
`QUANTIDADE_DADOS_MAXIMA`, sem parênteses).

### 2. DTOs (`rolagem.dtos.ts`) — aditivos + remoções

- `TermoDadoDto` += `manterMaior?`, `manterMenor?`, `margemCritico?`, `explosao?`, `implosao?`, `bonusDados?`.
- `DadosRoladosDto` += `mantidos?`, `descartados?`, `criticos?`, `desvantagem?` (omitidos quando o
  operador não foi usado → shape legado intacto). `valores` inclui explodidos/imploididos.
- **Remover** `ResultadoTesteDto`, `teste?` (`ResultadoRolagemDto`), `modo?` (`RolagemDto`,
  `PassoInterpretadoDto`). **Manter** `proficiencia`/`nivel` (fontes `PROF`/`NIV`).

### 3. Motor (`rolagem.ts`) — sem `modo`

- `interpretarFormula(texto)` / `validarFormula(texto)` — sem `modo`. Novo `interpretarOperadores`.
  Remover o açúcar TESTE (atributo puro volta a ser sempre modificador).
- `rolarInterpretada(formula, atributos, proficiencia?, nivel?, rolarDado?)` — caminho único: rolar →
  explodir/implodir (com teto) → keep → contar crítico → subtotal dos mantidos → agrupar dano → total.
- **Desvantagem intrínseca:** `ATRd20kh…` com atributo ≤ 0 → rola `2 − attr` dados e **inverte** o keep
  para menor (regra 270), marca `desvantagem: true`. Sem "modo".
- `aplicarEfeitos(formula, efeitos)` — infere papel: `ehTeste = dados.some(kh/kl)`; roteia por `alvo`.
  `BONUS_TESTE DADO` incrementa `bonusDados` no termo com keep (vantagem = pool maior, mesmo kh).
- `resolverPreset`/`rolarPasso` — sem `modo`.
- **`normalizarPresetLegado(preset)`** (puro, idempotente): reescreve presets com `modo:'TESTE'` para a
  notação nova (`luta` → `lutad20kh1 + PROF`) e dropa `modo` em todos os níveis (recursivo em `seguintes`).

### 4. Enums / ficha

Deletar `enums/rolagem-modo.enum.ts` + linha do barrel; remover `modo?` de `FichaRolagemDto`/
`FichaRolagemPassoDto`.

### 5. Frontend

`ficha-visualizacao` (teste = `${chave}d20kh1 + PROF`), `ficha-rolagens` (remove toggles/badges de modo),
`bandeja-dados` (mostra mantidos/descartados/críticos/desvantagem por termo), `guia-formula` (documenta
kh/kl/cm/!/?; remove seção Teste × Soma). Migração aplicada no load da ficha via `normalizarPresetLegado`.

## Casos de teste (`rolagem.spec.ts`, `rolarDado` injetado)

Reescrever blocos modo/efeitos/presets/fontes. Novos: kh/kl (top/bottom N, default 1, N>pool); cm
(d20 e não-d20, só entre mantidos); explosão (`!`, `!>=N`, teto); implosão (`?`, `?<=N`); keep após
explosão; sinal negativo; validação (conflitos/`kh0`/desconhecido); inferência em `aplicarEfeitos`;
`normalizarPresetLegado` (reescrita, idempotência, recursão, SOMA inalterado).

## Fora de escopo

Efeito automático de crítico (+2 no teste / dobrar dano), dano furtivo escalado, passivo de Intelecto
(2º melhor dado max 5), auxiliar/ajudar, iniciativa dedicada — o motor expõe as **primitivas**
(contagem de crítico, keep-N, soma), a aplicação mecânica fica com o preset/mestre.
