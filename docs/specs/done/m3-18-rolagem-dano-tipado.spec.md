# m3-18-rolagem-dano-tipado.spec.md

> Task 18 do milestone `m3-ficha-jogador.spec.md`. Segunda do pacote **Rolagem v2**
> (`m3-16` gramática → **`m3-18` dano tipado** → `m3-19` teste → `m3-20` efeitos → `m3-21` presets →
> `m3-22` frontend). Depende de m3-16. **Roll sem tag continua idêntico** ao legado.

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` — "Tipos de Dano" (Físico/Balístico/Explosão/
> Químico/Geral; **Composto** = junção de dois tipos, 50/50, resto pro primeiro; **Geral** irredutível).
> **O documento vence.**

## Objetivo

Adicionar **tipos de dano** ao motor puro (`shared/src/regras/rolagem/`): a fórmula pode marcar
trechos com `[Tipo]` (ex.: `2d8 [Balístico]`) ou `[TipoA-TipoB]` (Composto), e o resultado passa a
**agrupar o total por tipo**. Introduz o enum `TipoDanoEnum` reutilizável.

## Entregáveis

### 1. `TipoDanoEnum` (`shared/src/enums/tipo-dano.enum.ts`, exportado em `index.ts`)

Valores **iguais às strings** já usadas no `tipoDano` de `ModificacaoEfeitoDto` (compras) — zero
migração: `Físico | Balístico | Explosão | Químico | Geral`. `TIPOS_DANO_BLOQUEAVEIS` (os 4 sem Geral)
para validar Composto. Composto **não** é membro do enum — é um par ordenado.

### 2. DTOs (`rolagem.dtos.ts`) — aditivos/opcionais

- `TermoDadoDto`/`TermoAtributoDto` += `tipoDano?`, `composto?: ParTipoDano`.
- Novo `TermoConstanteDto` (constante tipada) e `FormulaInterpretadaDto` += `constantesTipadas?`.
- `DadosRoladosDto`/`AtributoAplicadoDto` += `tipoDano?`, `composto?`.
- Novo `GrupoDanoDto` (`tipoDano`, `total`, `composto?`) e `ResultadoRolagemDto` += `grupos?`.
- Chaves legadas (`dados`/`atributos`/`constante`/`total`) sempre populadas.

### 3. Parser (`interpretarFormula`) — segmentos por tag

- Sem `[` → caminho legado (um segmento sem tipo). Com `[` → `split` por `\[([^\]]+)\]` em
  segmentos `termos [Tipo]`; cada segmento estampa seus termos.
- Tag single via `resolverTipoDanoSimples` (tolerante a caixa/acentos, em `rolagem.dados.ts`);
  Composto exige **2 tipos bloqueáveis distintos** (Geral fora).
- Trecho **sem tag** numa fórmula tipada → **Físico**. Constante tipada → `constantesTipadas`.
- Erros claros: tipo desconhecido, tag sem termos antes, tag malformada/aberta.

### 4. Roll (`rolarFormula`) — agrupamento

- `agruparDano`: soma cada Composto por par e **só então divide** (⌈soma/2⌉ / ⌊soma/2⌋, resto pro
  primeiro) — a divisão é da **soma do segmento**, não termo a termo. Totais por tipo em `grupos`.
- `total` = soma dos grupos + termos sem tipo (legado) + constante sem tag.

## Casos de teste (`rolagem.spec.ts`, `rolarDado` injetado) — 9 novos, 24 no total

`2d8 [Balístico]` estampa tipo · agrupamento misto (Físico/Explosão) · trecho sem tag → Físico ·
Composto 15 → 8/7 (resto pro primeiro) · tags tolerantes (`[quimico]`) · rejeições (tipo
desconhecido, Composto com Geral, 3 tipos, tipos iguais, tag sem termos, tag aberta) · **regressão**
(sem tags → sem `grupos`) · valores do enum.

## Fora de escopo (próximas tasks)

Modo TESTE (m3-19), efeitos de habilidade (m3-20), presets encadeados (m3-21), UI (m3-22).
Resistências por tipo e o abatimento de Geral são regras de **aplicação de dano no alvo**, fora do
motor de rolagem (o motor só produz os totais por tipo).
