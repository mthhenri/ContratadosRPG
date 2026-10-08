# Ficha Contra-Ataque Calculado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Contra-ataque" stat on the ficha auto-calculate from the player's `luta`/`vigor` attributes and which variant of the "Contra-Ataque" ability they have, instead of always showing "N/A" until someone types a number in by hand.

**Architecture:** A new pure formula function `calcularContraAtaque` lives in `shared/src/regras/agente/defesa.ts` (single source of truth, per project convention — proibições #26/#27). It's wired into two existing call paths that already resolve every other derived stat the same way: the frontend's live display fallback (`status-derivado.ts`) and the ficha-creation snapshot (`shared/regras/agente/derivados.ts`, called from both the frontend wizard and the backend). The existing "stored value wins over calculated" override mechanism (m3-10) is untouched — manual edits keep working exactly like Defesa/Esquiva/Bloqueio.

**Tech Stack:** TypeScript, Vitest (`shared`), Angular 21 + `@angular/build:unit-test` (`frontend`), NestJS (`backend`, untouched by this plan beyond one call-site update).

## Global Constraints

- Formula lives in `shared/regras` only — never re-implement or duplicate it in `frontend`/`backend` (proibições #26/#27, CLAUDE.md "Architecture Overview").
- Vanguarda's "Luta ÷ 2 ou Vigor ÷ 2" resolves to `Math.max` of the two — no new choice field in the data model (per user-approved design, see `docs/specs/active/m3-39-ficha-contra-ataque-calculado.spec.md`).
- Divisions by 2 round down (`Math.floor`) — doc `sistema-v4.1.0.md` "Arredondamentos", same convention as `saude.ts`.
- Do **not** change `aplicarLimitesPorClasse` / `LimitesClasseAplicarDto` / `AgenteNormalizadoDto` — that function is also used by the standalone public Calculadora (`frontend/src/app/modules/calculadora/paginas/agente/agente.page.ts`), whose form has no `luta` control at all. Clamp `luta` locally wherever it's needed instead (small duplicated one-liner is correct here — CLAUDE.md: "Three similar lines is better than a premature abstraction").
- DTOs follow the existing `<Conceito>CalcularDto` naming (`agente.dtos.ts` docstring) and functions follow `calcular<Conceito>`.

---

### Task 1: `calcularContraAtaque` — shared formula + DTO + unit tests

**Files:**
- Modify: `shared/src/regras/agente/agente.dtos.ts`
- Modify: `shared/src/regras/agente/defesa.ts`
- Modify: `shared/src/regras/agente/defesa.spec.ts`
- Modify: `shared/src/dtos/ficha/ficha.dtos.ts:219-224` (stale comment)

**Interfaces:**
- Produces: `ContraAtaqueCalcularDto { readonly luta: number; readonly vigor: number; readonly habilidades: readonly FichaHabilidadeDto[] }` and `calcularContraAtaque(dto: ContraAtaqueCalcularDto): number | null`, both exported from `shared/src/regras/agente` (via the existing `export * from './defesa'` / `export * from './agente.dtos'` barrel — no barrel edit needed).

- [ ] **Step 1: Write the failing tests**

Append to `shared/src/regras/agente/defesa.spec.ts` (add the new imports to the existing `import` lines at the top, and this new `describe` block at the end of the file):

```ts
import { describe, expect, it } from 'vitest';
import type { FichaHabilidadeDto } from '../../dtos/ficha';
import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import { calcularContraAtaque, calcularDefesa, calcularProficiencia } from './defesa';
```

(This replaces the current two import lines — merges `ArquetipoEnum`/`HabilidadeCategoriaEnum` into the existing enums import, adds the `FichaHabilidadeDto` type import, and adds `calcularContraAtaque` to the existing `./defesa` import.)

```ts
function habilidadeContraAtaque(
  categoria: HabilidadeCategoriaEnum,
  origem?: ArquetipoEnum,
): FichaHabilidadeDto {
  return {
    nome: 'Contra-Ataque',
    categoria,
    custoEnergia: 2,
    descricao: '(Reação)…',
    ...(origem === undefined ? {} : { origem }),
  };
}

describe('calcularContraAtaque', () => {
  it('sem a habilidade "Contra-Ataque" na ficha → null', () => {
    expect(calcularContraAtaque({ luta: 4, vigor: 4, habilidades: [] })).toBeNull();
  });

  it('Geral: Luta ÷ 2, arredondado para baixo', () => {
    const habilidades = [habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL)];
    expect(calcularContraAtaque({ luta: 4, vigor: 1, habilidades })).toBe(2);
    expect(calcularContraAtaque({ luta: 5, vigor: 1, habilidades })).toBe(2);
  });

  it('Lutador (Melhorada): Luta inteira', () => {
    const habilidades = [
      habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL_MELHORADA, ArquetipoEnum.LUTADOR),
    ];
    expect(calcularContraAtaque({ luta: 4, vigor: 1, habilidades })).toBe(4);
  });

  it('Vanguarda (Melhorada): usa o maior entre Luta ÷ 2 e Vigor ÷ 2', () => {
    const habilidades = [
      habilidadeContraAtaque(HabilidadeCategoriaEnum.GERAL_MELHORADA, ArquetipoEnum.VANGUARDA),
    ];
    expect(calcularContraAtaque({ luta: 2, vigor: 5, habilidades })).toBe(2); // floor(5/2)=2 > floor(2/2)=1
    expect(calcularContraAtaque({ luta: 6, vigor: 1, habilidades })).toBe(3); // floor(6/2)=3 > floor(1/2)=0
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=shared -- defesa.spec.ts`
Expected: FAIL — `calcularContraAtaque` is not exported / not defined.

- [ ] **Step 3: Add `ContraAtaqueCalcularDto` to `agente.dtos.ts`**

In `shared/src/regras/agente/agente.dtos.ts`, change the top import:

```ts
import { ClasseEnum } from '../../enums';
```

to:

```ts
import { ClasseEnum } from '../../enums';
import type { FichaHabilidadeDto } from '../../dtos/ficha';
```

Then insert this new interface right after `DefesaCalcularDto` (after its closing `}` on what is currently line 42, before the `ProficienciaCalcularDto` comment):

```ts
/**
 * Entrada de `calcularContraAtaque`: Luta e Vigor (o chamador aplica os bounds da classe antes de
 * passar — ver `obterLimitesClasse`) + as habilidades da ficha, usadas só para achar a habilidade
 * "Contra-Ataque" e resolver qual variante de fórmula se aplica (doc — "Habilidades Gerais
 * [Melhoradas]": Geral, Lutador Melhorada, Vanguarda Melhorada têm fórmulas diferentes).
 */
export interface ContraAtaqueCalcularDto {
  readonly luta: number;
  readonly vigor: number;
  readonly habilidades: readonly FichaHabilidadeDto[];
}
```

- [ ] **Step 4: Implement `calcularContraAtaque` in `defesa.ts`**

Change the top of `shared/src/regras/agente/defesa.ts` from:

```ts
import { ClasseEnum } from '../../enums';
import { DefesaCalcularDto, DefesaDto, ProficienciaCalcularDto } from './agente.dtos';
```

to:

```ts
import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import { ContraAtaqueCalcularDto, DefesaCalcularDto, DefesaDto, ProficienciaCalcularDto } from './agente.dtos';
```

Append this function at the end of the file:

```ts
/**
 * Contra-Ataque: bônus de Reação somado à Defesa ao reagir com a habilidade "Contra-Ataque"
 * (doc — "Habilidades Gerais [Melhoradas]"). Três variantes conforme a origem da habilidade na
 * ficha:
 *   - Geral (qualquer classe): Luta ÷ 2
 *   - Lutador (Melhorada): Luta inteira
 *   - Vanguarda (Melhorada): Luta ÷ 2 ou Vigor ÷ 2 — usa o maior, já que não há campo de escolha
 *     explícita no modelo de dados e um jogador racional sempre tomaria a opção maior
 * `null` quando a ficha não tem a habilidade "Contra-Ataque" (a UI mostra o placeholder "—"
 * nesse caso, sem chamar esta função).
 */
export function calcularContraAtaque(dto: ContraAtaqueCalcularDto): number | null {
  const habilidade = dto.habilidades.find((habilidade) => habilidade.nome === 'Contra-Ataque');
  if (!habilidade) {
    return null;
  }
  if (habilidade.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA) {
    if (habilidade.origem === ArquetipoEnum.LUTADOR) {
      return dto.luta;
    }
    if (habilidade.origem === ArquetipoEnum.VANGUARDA) {
      return Math.max(Math.floor(dto.luta / 2), Math.floor(dto.vigor / 2));
    }
  }
  return Math.floor(dto.luta / 2);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace=shared -- defesa.spec.ts`
Expected: PASS, all 5 new cases green.

- [ ] **Step 6: Update the stale comment on `FichaDerivadosDto.contraAtaque`**

In `shared/src/dtos/ficha/ficha.dtos.ts`, replace (around line 219-224):

```ts
  /**
   * Contra-Ataque — override **manual**, sem fórmula em `shared/regras` (a habilidade só existe
   * hoje como texto narrativo do catálogo; o motor não calcula essa stat). Só editável na ficha
   * quando o jogador tem a habilidade "Contra-Ataque" (`dados.habilidades`).
   */
  readonly contraAtaque?: number;
```

with:

```ts
  /**
   * Contra-Ataque — calculado por `calcularContraAtaque` (`shared/regras/agente/defesa`) a
   * partir da variante da habilidade "Contra-Ataque" em `dados.habilidades`; ausente quando a
   * ficha não tem a habilidade. Editável no próprio lugar como override manual (m3-10, mesmo
   * mecanismo de Defesa/Esquiva/Bloqueio) — o valor digitado vence o calculado.
   */
  readonly contraAtaque?: number;
```

- [ ] **Step 7: Run the full shared suite**

Run: `npm run test --workspace=shared`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add shared/src/regras/agente/agente.dtos.ts shared/src/regras/agente/defesa.ts shared/src/regras/agente/defesa.spec.ts shared/src/dtos/ficha/ficha.dtos.ts
git commit -m "feat(shared): calcula Contra-Ataque por variante da habilidade (Geral/Lutador/Vanguarda)"
```

---

### Task 2: Wire `calcularContraAtaque` into `calcularDerivados` (ficha-creation snapshot)

**Files:**
- Modify: `shared/src/regras/agente/derivados.ts`
- Modify: `shared/src/regras/agente/derivados.spec.ts`
- Modify: `frontend/src/app/modules/ficha/ficha-padrao.ts:124`
- Modify: `backend/src/modules/ficha/ficha.service.ts:470-471`
- Modify: `backend/src/modules/ficha/ficha.service.spec.ts:93-107`

**Interfaces:**
- Consumes: `calcularContraAtaque` from Task 1 (`shared/src/regras/agente/defesa.ts`), `ContraAtaqueCalcularDto`.
- Produces: `calcularDerivados(classe, nivel, atributos, habilidades?)` — same 3 required positional args as before, new 4th optional arg `habilidades: readonly FichaHabilidadeDto[] = []`. Existing 3-arg call sites keep compiling and behaving identically (habilidades defaults to `[]` → `contraAtaque` stays `undefined`, same as today).

- [ ] **Step 1: Write the failing test**

Add to `shared/src/regras/agente/derivados.spec.ts` — change the top imports from:

```ts
import { describe, expect, it } from 'vitest';

import { ClasseEnum } from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { calcularDerivados } from './derivados';
import { calcularDefesa } from './defesa';
import { calcularInventario } from './inventario';
```

to:

```ts
import { describe, expect, it } from 'vitest';

import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import type { FichaAtributosDto, FichaHabilidadeDto } from '../../dtos/ficha';
import { calcularDerivados } from './derivados';
import { calcularContraAtaque, calcularDefesa } from './defesa';
import { calcularInventario } from './inventario';
```

Then add this new `describe` block at the end of the file:

```ts
describe('calcularDerivados — contraAtaque', () => {
  it('sem habilidades (padrão) → contraAtaque undefined', () => {
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos);
    expect(derivados.contraAtaque).toBeUndefined();
  });

  it('com a habilidade "Contra-Ataque" → mesma fórmula de calcularContraAtaque', () => {
    const habilidades: FichaHabilidadeDto[] = [
      {
        nome: 'Contra-Ataque',
        categoria: HabilidadeCategoriaEnum.GERAL,
        custoEnergia: 2,
        descricao: '(Reação)…',
      },
    ];
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos, habilidades);
    expect(derivados.contraAtaque).toBe(
      calcularContraAtaque({ luta: atributos.luta, vigor: atributos.vigor, habilidades }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=shared -- derivados.spec.ts`
Expected: FAIL — `calcularDerivados` doesn't accept a 4th argument / `contraAtaque` stays `undefined` in the second case.

- [ ] **Step 3: Update `calcularDerivados`**

Replace the full contents of `shared/src/regras/agente/derivados.ts` with:

```ts
import type { ClasseEnum } from '../../enums';
import type { FichaAtributosDto, FichaDerivadosDto, FichaHabilidadeDto } from '../../dtos/ficha';
import { calcularDanoCorpo, calcularDanoFurtivo } from './dano';
import { calcularContraAtaque, calcularDefesa, calcularProficiencia } from './defesa';
import { calcularLimiteHabilidadesPorTurno } from './habilidades';
import { calcularInventario } from './inventario';
import { aplicarLimitesPorClasse, obterLimitesClasse } from './limites';
import { calcularDeslocamento } from './movimento';
import { calcularAreaPercepcao } from './percepcao';

/**
 * Monta o **snapshot de derivados** de uma ficha (m3-10 — "nada é exclusivamente calculado"): calcula
 * cada stat via as fórmulas de `agente` e devolve o bloco `FichaDerivadosDto` a ser **persistido na
 * criação** e depois editado livremente. Stats que a classe não possui (Civil: `defesa`,
 * `proficiencia`, `danoFurtivo`) saem como `undefined`. Só orquestra `shared/regras` — nenhuma
 * fórmula nova aqui (fonte única, proibições #26/#27). Import do DTO é **type-only** (zero-dep em
 * runtime; regras não passa a depender de dtos).
 *
 * `habilidades` (opcional, `[]` por padrão) só alimenta `calcularContraAtaque` — na prática quase
 * sempre vazio aqui, já que a habilidade "Contra-Ataque" normalmente só entra na ficha depois da
 * criação (via seletor de habilidades, m3-13), não durante o assistente.
 */
export function calcularDerivados(
  classe: ClasseEnum,
  nivel: number,
  atributos: FichaAtributosDto,
  habilidades: readonly FichaHabilidadeDto[] = [],
): FichaDerivadosDto {
  const normalizado = aplicarLimitesPorClasse({
    classe,
    nivel,
    vigor: atributos.vigor,
    destreza: atributos.destreza,
    forca: atributos.forca,
    vontade: atributos.vontade,
    sentidos: atributos.sentidos,
  });
  const entrada = { classe, ...normalizado };

  const limitesAtributo = obterLimitesClasse({ classe });
  const luta = Math.min(
    limitesAtributo.atributoMaximo,
    Math.max(limitesAtributo.atributoMinimo, atributos.luta),
  );

  const defesa = calcularDefesa(entrada);
  const proficiencia = calcularProficiencia(entrada);
  const danoFurtivo = calcularDanoFurtivo(entrada);
  const contraAtaque = calcularContraAtaque({ luta, vigor: normalizado.vigor, habilidades });

  return {
    defesa: defesa?.defesa,
    esquiva: defesa?.esquiva,
    bloqueio: defesa?.bloqueio,
    contraAtaque: contraAtaque ?? undefined,
    deslocamento: calcularDeslocamento(entrada),
    proficiencia: proficiencia ?? undefined,
    danoCorpoACorpo: calcularDanoCorpo(entrada),
    danoFurtivo: danoFurtivo ?? undefined,
    percepcao: calcularAreaPercepcao(entrada),
    inventarioMaximo: calcularInventario(entrada),
    habilidadesPorTurno: calcularLimiteHabilidadesPorTurno(entrada),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=shared -- derivados.spec.ts`
Expected: PASS.

- [ ] **Step 5: Pass `habilidades` through the two call sites**

In `frontend/src/app/modules/ficha/ficha-padrao.ts`, line 124, change:

```ts
      derivados: calcularDerivados(classe, nivel, atributos),
```

to:

```ts
      derivados: calcularDerivados(classe, nivel, atributos, habilidades),
```

(`habilidades` is already in scope — computed a few lines above at line 98-104 in the same function.)

In `backend/src/modules/ficha/ficha.service.ts`, lines 470-471, change:

```ts
    const derivados =
      dados.derivados ?? calcularDerivados(dados.classe, dados.nivel, dados.atributos);
```

to:

```ts
    const derivados =
      dados.derivados ?? calcularDerivados(dados.classe, dados.nivel, dados.atributos, dados.habilidades);
```

- [ ] **Step 6: Keep the backend test helper honest**

In `backend/src/modules/ficha/ficha.service.spec.ts`, lines 93-107 (`comSnapshot`), change:

```ts
    derivados: calcularDerivados(dados.classe, dados.nivel, dados.atributos),
```

to:

```ts
    derivados: calcularDerivados(dados.classe, dados.nivel, dados.atributos, dados.habilidades),
```

(Today's fixture has `habilidades: []` so this is a no-op for existing assertions — it just keeps the helper computing the exact same thing the service does, instead of silently drifting if a future test overrides `habilidades`.)

- [ ] **Step 7: Run the shared, frontend unit (ficha-padrao), and backend suites**

Run: `npm run test --workspace=shared`
Expected: PASS.

Run: `npm run test --workspace=backend -- ficha.service.spec.ts`
Expected: PASS.

Run: `npm run test --workspace=frontend -- --test-path-pattern=ficha-padrao`
(If that flag isn't recognized by the Angular 21 unit-test builder, run the full frontend suite instead: `npm run test --workspace=frontend`.)
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/src/regras/agente/derivados.ts shared/src/regras/agente/derivados.spec.ts frontend/src/app/modules/ficha/ficha-padrao.ts backend/src/modules/ficha/ficha.service.ts backend/src/modules/ficha/ficha.service.spec.ts
git commit -m "feat(shared): inclui contraAtaque no snapshot de derivados da criação de ficha"
```

---

### Task 3: Frontend live display — `status-derivado.ts`

**Files:**
- Modify: `frontend/src/app/modules/ficha/status-derivado.ts`

**Interfaces:**
- Consumes: `calcularContraAtaque`, `obterLimitesClasse` from `@contratados-rpg/shared/regras/agente` (Task 1); `FichaHabilidadeDto` from `@contratados-rpg/shared/dtos/ficha`.
- Produces: `EntradaAgente` now includes `readonly luta: number`. `montarInformacoesExtras(entrada, habilidades, derivados?, amplificadores?)` — **new required 2nd parameter** `habilidades: readonly FichaHabilidadeDto[]`, inserted before the two already-optional parameters. Every caller must be updated (Task 4 handles the one real caller).

- [ ] **Step 1: Update imports**

In `frontend/src/app/modules/ficha/status-derivado.ts`, change:

```ts
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaDerivadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteBloqueioAmplificadores,
  ajusteDanoFurtivoAmplificadores,
  ajusteDefesaAmplificadores,
  ajusteDeslocamentoAmplificadores,
  ajusteEsquivaAmplificadores,
  ajusteInventarioAmplificadores,
  aplicarLimitesPorClasse,
  calcularAreaPercepcao,
  calcularDanoCorpo,
  calcularDanoFurtivo,
  calcularDefesa,
  calcularDeslocamento,
  calcularInventario,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  incrementarDanoFurtivo,
} from '@contratados-rpg/shared/regras/agente';
```

to:

```ts
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaDerivadosDto,
  FichaHabilidadeDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteBloqueioAmplificadores,
  ajusteDanoFurtivoAmplificadores,
  ajusteDefesaAmplificadores,
  ajusteDeslocamentoAmplificadores,
  ajusteEsquivaAmplificadores,
  ajusteInventarioAmplificadores,
  aplicarLimitesPorClasse,
  calcularAreaPercepcao,
  calcularContraAtaque,
  calcularDanoCorpo,
  calcularDanoFurtivo,
  calcularDefesa,
  calcularDeslocamento,
  calcularInventario,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  incrementarDanoFurtivo,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';
```

- [ ] **Step 2: Extend `EntradaAgente` and `normalizarEntrada` with `luta`**

Change:

```ts
/** Entrada já normalizada aos limites da classe (os cinco atributos que as fórmulas consomem). */
export type EntradaAgente = { readonly classe: ClasseEnum } & ReturnType<typeof aplicarLimitesPorClasse>;

/**
 * Normaliza classe/nível/atributos aos limites da classe, devolvendo só o recorte que
 * `shared/regras/agente` consome. Garante que valores fora dos bounds nunca escapem ao cálculo.
 */
export function normalizarEntrada(
  classe: ClasseEnum,
  nivel: number,
  atributos: FichaAtributosDto,
): EntradaAgente {
  const normalizado = aplicarLimitesPorClasse({
    classe,
    nivel,
    vigor: atributos.vigor,
    destreza: atributos.destreza,
    forca: atributos.forca,
    vontade: atributos.vontade,
    sentidos: atributos.sentidos,
  });
  return { classe, ...normalizado };
}
```

to:

```ts
/**
 * Entrada já normalizada aos limites da classe (os cinco atributos que a maioria das fórmulas
 * consome, `+ luta` — usado só por `calcularContraAtaque`; clampado aqui do mesmo jeito, mas fora
 * de `aplicarLimitesPorClasse` porque essa função também serve a Calculadora pública, que não tem
 * campo de Luta no formulário).
 */
export type EntradaAgente = { readonly classe: ClasseEnum; readonly luta: number } & ReturnType<
  typeof aplicarLimitesPorClasse
>;

/**
 * Normaliza classe/nível/atributos aos limites da classe, devolvendo só o recorte que
 * `shared/regras/agente` consome. Garante que valores fora dos bounds nunca escapem ao cálculo.
 */
export function normalizarEntrada(
  classe: ClasseEnum,
  nivel: number,
  atributos: FichaAtributosDto,
): EntradaAgente {
  const normalizado = aplicarLimitesPorClasse({
    classe,
    nivel,
    vigor: atributos.vigor,
    destreza: atributos.destreza,
    forca: atributos.forca,
    vontade: atributos.vontade,
    sentidos: atributos.sentidos,
  });
  const limitesAtributo = obterLimitesClasse({ classe });
  const luta = Math.min(
    limitesAtributo.atributoMaximo,
    Math.max(limitesAtributo.atributoMinimo, atributos.luta),
  );
  return { classe, luta, ...normalizado };
}
```

- [ ] **Step 3: Wire the formula into `montarInformacoesExtras`**

Change the function signature from:

```ts
export function montarInformacoesExtras(
  entrada: EntradaAgente,
  derivados?: FichaDerivadosDto,
  amplificadores: readonly AmplificadorAplicadoDto[] = [],
): InfoExtra[] {
```

to:

```ts
export function montarInformacoesExtras(
  entrada: EntradaAgente,
  habilidades: readonly FichaHabilidadeDto[],
  derivados?: FichaDerivadosDto,
  amplificadores: readonly AmplificadorAplicadoDto[] = [],
): InfoExtra[] {
```

Then change:

```ts
    // Sem fórmula em `shared/regras` — puro override manual (ver `FichaDerivadosDto.contraAtaque`).
    linhaNumero('contraAtaque', 'Contra-ataque', null, (valor) => String(valor)),
```

to:

```ts
    linhaNumero(
      'contraAtaque',
      'Contra-ataque',
      calcularContraAtaque({ luta: entrada.luta, vigor: entrada.vigor, habilidades }),
      (valor) => String(valor),
    ),
```

- [ ] **Step 4: Type-check the package**

Run: `npm run build --workspace=frontend`
Expected: FAILS at this point with a compile error in `ficha-visualizacao.component.ts` (`montarInformacoesExtras` now requires a 2nd argument) — that's expected and confirms the signature change took effect. Task 4 fixes that call site.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/status-derivado.ts
git commit -m "feat(frontend): status-derivado calcula Contra-ataque em vez de sempre N/A"
```

---

### Task 4: Wire the new parameter into `FichaVisualizacao`, refresh stale comments, add coverage

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`

**Interfaces:**
- Consumes: `montarInformacoesExtras(entrada, habilidades, derivados?, amplificadores?)` from Task 3.

- [ ] **Step 1: Write the failing test**

In `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`, add this test right after the existing `'Contra-ataque fica editável quando o jogador tem a habilidade "Contra-Ataque"'` test (~line 253):

```ts
    it('Contra-ataque mostra o valor calculado (Luta ÷ 2) sem precisar de edição manual', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        habilidades: [
          {
            nome: 'Contra-Ataque',
            categoria: HabilidadeCategoriaEnum.GERAL,
            custoEnergia: 2,
            descricao: '(Reação)…',
          },
        ],
      };
      const { raiz } = montar(documento, 'Corvo', 42, true);
      const linhaDefesa = raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      const contraAtaque = Array.from(linhaDefesa.querySelectorAll('.ficha-mini')).find(
        (box) => box.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === 'Contra-ataque',
      )!;
      const botao = contraAtaque.querySelector<HTMLButtonElement>('.ficha-mini__valor--editavel')!;
      // dados.atributos.luta = 2 (ver fixture no topo do arquivo) → floor(2 / 2) = 1.
      expect(botao.textContent?.trim()).toBe('1');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=frontend -- ficha-visualizacao.component.spec.ts`
Expected: FAIL — either a compile error (from Task 3's signature change not yet wired here) or `botao.textContent` is `'N/A'` instead of `'1'`.

- [ ] **Step 3: Update the component's call site**

In `ficha-visualizacao.component.ts`, change:

```ts
  protected readonly informacoesExtras = computed(() =>
    montarInformacoesExtras(this.entrada(), this.dados().derivados, this.dados().inventario.amplificadores),
  );
```

to:

```ts
  protected readonly informacoesExtras = computed(() =>
    montarInformacoesExtras(
      this.entrada(),
      this.dados().habilidades,
      this.dados().derivados,
      this.dados().inventario.amplificadores,
    ),
  );
```

- [ ] **Step 4: Refresh the stale "sem cálculo" comment**

In the same file, change:

```ts
  /** Linha de Contra-ataque — puro override manual (`derivados.contraAtaque`); sem cálculo. */
  protected readonly contraAtaqueLinha = computed<InfoExtra>(
    () => this.informacoesExtras().find((info) => info.chave === 'contraAtaque')!,
  );
```

to:

```ts
  /**
   * Linha de Contra-ataque — calculada por `calcularContraAtaque` (Luta/Vigor conforme a
   * variante da habilidade); editável no próprio lugar como override manual (m3-10), igual
   * Defesa/Esquiva/Bloqueio.
   */
  protected readonly contraAtaqueLinha = computed<InfoExtra>(
    () => this.informacoesExtras().find((info) => info.chave === 'contraAtaque')!,
  );
```

- [ ] **Step 5: Refresh the stale HTML comment**

In `ficha-visualizacao.component.html`, change:

```html
          <!-- Contra-ataque: só existe hoje como habilidade narrativa (Lutador/Vanguarda) — o motor
               não tem um stat mecânico calculado pra ele ainda. Editável (override manual) só quando
               o jogador tem a habilidade; sem ela, segue o placeholder tracejado. -->
```

to:

```html
          <!-- Contra-ataque: calculado por variante da habilidade (Geral/Lutador/Vanguarda —
               shared/regras/agente/defesa). Editável (override manual, m3-10) só quando o jogador
               tem a habilidade; sem ela, segue o placeholder tracejado. -->
```

- [ ] **Step 6: Run the new test to verify it passes**

Run: `npm run test --workspace=frontend -- ficha-visualizacao.component.spec.ts`
Expected: PASS, including the new test and all pre-existing ones in this file (in particular the two Contra-ataque tests at ~line 211 and ~line 223 — re-read them before running to confirm no other assumption broke).

- [ ] **Step 7: Run the full frontend and shared suites**

Run: `npm run test --workspace=shared`
Run: `npm run test --workspace=frontend`
Expected: both PASS, zero regressions.

- [ ] **Step 8: Type-check / build the frontend**

Run: `npm run build --workspace=frontend`
Expected: PASS (confirms Task 3's Step 4 compile error is now resolved).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
git commit -m "feat(frontend): FichaVisualizacao exibe Contra-ataque calculado, não mais sempre N/A"
```

---

### Task 5: Manual verification in the running app

**Files:** none (verification only).

- [ ] **Step 1: Start the stack**

Follow the project's `verify` skill / `docs/CONVENTIONS.md` dev-server instructions (`npm run db:up`, `npm run backend:dev`, `npm run frontend:dev`).

- [ ] **Step 2: Confirm the fix on a real ficha**

Open a ficha owned by the logged-in user (or as mestre) that has a Lutador or Vanguarda arquétipo. Add the "Contra-Ataque" (or "Contra-Ataque" Melhorada) ability via the habilidade seletor (m3-13 UI). Confirm the "Contra-ataque" box in the Reações row immediately shows a calculated number instead of "N/A" — no page reload needed (it's a `computed` signal).

- [ ] **Step 3: Confirm manual override still works**

Click the calculated value, type a different number, press Enter. Confirm it persists (reload the page) and now shows the manually-typed value instead of the calculated one — this is the existing m3-10 override mechanism, unchanged by this plan.

- [ ] **Step 4: Confirm the no-ability case is unchanged**

On a ficha without the "Contra-Ataque" ability, confirm the box still shows the tracejado "—" placeholder, not editable.

## Self-Review Notes

- **Spec coverage:** every `Entregável` in `docs/specs/active/m3-39-ficha-contra-ataque-calculado.spec.md` maps to a task above — DTO/formula (Task 1), `calcularDerivados` wiring (Task 2), `status-derivado.ts` wiring (Task 3), component wiring + comments (Task 4). All `Critérios de Aceite` are covered by the tests in Tasks 1, 2, and 4, plus manual verification in Task 5.
- **Type consistency:** `calcularContraAtaque(dto: ContraAtaqueCalcularDto): number | null` (Task 1) is called identically in Task 2 (`derivados.ts`) and Task 3 (`status-derivado.ts`) — same field names (`luta`, `vigor`, `habilidades`) both times. `montarInformacoesExtras`'s new `habilidades` parameter (Task 3) is threaded through by the one real caller in Task 4 — no other caller exists (confirmed via repo-wide search during planning).
- **Out of scope, confirmed not touched:** `aplicarLimitesPorClasse` / `LimitesClasseAplicarDto` / `AgenteNormalizadoDto` (shared, also used by the public Calculadora) and the Vanguarda choice field (per approved design, `Math.max` instead).
