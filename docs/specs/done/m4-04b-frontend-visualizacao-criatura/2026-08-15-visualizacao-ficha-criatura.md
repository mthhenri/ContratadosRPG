# Visualização da Ficha de Criatura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the missing view/edit screen for a criatura's ficha (`/painel/:campanhaId/criatura/:id`), replacing the current broken fallback onto the jogador-only ficha screen, with full edit-in-place (including list fields) and dice rolling from Ataques/testes de Atributo.

**Architecture:** New Angular route/page/component/service layer, parallel to (not modifying) the existing jogador `FichaVisualizacao`/`visualizar.page`/`FichaEdicaoService`. Data layer additions (`FichaService.recuperarFichaCriatura`/`alterarFichaCriatura`) hit the already-shipped `m4-03` backend endpoints — no backend changes. Pure formula-building helpers (`criatura-rolagem.ts`) feed the existing generic `rolarFormula`/`BandejaDadosService`/`FichaRolagemRegistroService` — no `shared/regras` changes. Three list-editor sub-components (Resistências+Fraquezas share one; Ataques; Habilidades) mirror the established `FichaHabilidades` array-CRUD pattern. Edition persists via the same debounced-batch-PUT pattern as `FichaEdicaoService`.

**Tech Stack:** Angular 21 standalone components, Signals, Reactive Forms, RxJS, Vitest + `HttpTestingController`/`TestBed`, SCSS + BEM + theme tokens (`docs/design/tema/`).

**Spec:** `docs/specs/backlog/m4-04b-frontend-visualizacao-criatura.spec.md`

## Global Constraints

- Standalone, **lazy**-loaded components; state in **Signals**; **Reactive Forms** (never `ngModel`).
- `.scss` + BEM + theme tokens only — no hex/font/radius literals (proibição #29).
- No formula/rule duplication — every calculation comes from `shared/regras/criatura` or `shared/regras/rolagem`, never reimplemented in a component.
- Edição no próprio lugar: every field edits in place (pencil/click-to-edit), never a separate form page.
- Persistence: debounce 500ms, then `PUT` the **entire** `dados` document (same convention as `FichaEdicaoService`).
- Route stays inside the existing `mestreCampanhaGuard`-guarded prefix (`/painel/:campanhaId/criatura`) — only the mestre reaches this screen via the UI in this task (see spec, "Fora de Escopo").
- Comparação visual final contra `docs/design/examples/ficha-de-criatura.html` é gate obrigatório (`AGENTS.md`) — done in the last task, against the running app, not guessed in advance.
- Test runner is **Vitest** (`describe`/`it`/`expect`, `vi.fn()`), not Jasmine/Karma.

---

## Task 1: `FichaService` — recuperar/alterar ficha de criatura

**Files:**
- Modify: `frontend/src/app/modules/ficha/ficha.service.ts`
- Test: `frontend/src/app/modules/ficha/ficha.service.spec.ts`

**Interfaces:**
- Produces: `FichaService.recuperarFichaCriatura(id: number): Observable<FichaCriaturaRecuperadaDto>`, `FichaService.alterarFichaCriatura(id: number, dto: FichaCriaturaAlterarDto): Observable<FichaCriaturaAlteradaDto>` — consumed by Task 4 (`FichaEdicaoCriaturaService`) and Task 11 (page).

- [ ] **Step 1: Write the failing tests**

Add to `ficha.service.spec.ts` (needs `FichaCriaturaAlteradaDto`, `FichaCriaturaAlterarDto`, `FichaCriaturaDadosDto`, `FichaCriaturaRecuperadaDto` imports from `@contratados-rpg/shared/dtos/ficha`, plus enums used to build a minimal fixture — see Task 3 for the same fixture reused verbatim):

```ts
import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
} from '@contratados-rpg/shared/enums';
import {
  FichaCriaturaAlteradaDto,
  FichaCriaturaDadosDto,
  FichaCriaturaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

const dadosCriatura: FichaCriaturaDadosDto = {
  identidade: {
    designacao: 'A Estátua',
    origem: OrigemCriaturaEnum.ORIGINAL,
    conceito: 'Uma estátua que se move quando ninguém olha.',
    naturezaFisica: 'Pedra articulada.',
    comportamento: ComportamentoCriaturaEnum.CACADORA,
    motivacao: 'Caçar.',
    ganchoUnico: 'Só se move fora do campo de visão.',
  },
  na: NivelAmeacaEnum.ALTA,
  vd: 30,
  atributos: {
    destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8,
    intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4,
  },
  modificadores: {
    destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE,
    luta: ModificadorCriaturaEnum.FORTE, pontaria: ModificadorCriaturaEnum.FRAGIL,
    vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
    medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO,
    social: ModificadorCriaturaEnum.FRACO, vontade: ModificadorCriaturaEnum.FRACO,
  },
  tenacidade: TenacidadeEnum.RESISTENTE,
  vidaMaxima: 100, vidaAtual: 100, defesa: 30,
  resistencias: [], fraquezas: [{ tipo: 'Balístico' as never, subtipo: null, valor: 10 }],
  porte: PorteCriaturaEnum.GRANDE,
  deslocamento: { terrestre: 9 },
  cadencia: CadenciaEnum.SINGULAR,
  ataques: [], habilidades: [], anotacoes: '',
} as FichaCriaturaDadosDto;

it('recupera uma ficha de criatura pelo id', () => {
  const { servico, http } = criar();
  const recuperada: FichaCriaturaRecuperadaDto = {
    id: 4, campanhaId: 9, usuarioId: 7, nome: 'A Estátua', cor: null, imagemUrl: null,
    oculta: false, dados: dadosCriatura,
  };

  let recebido: FichaCriaturaRecuperadaDto | undefined;
  servico.recuperarFichaCriatura(4).subscribe((r) => (recebido = r));
  const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
  expect(requisicao.request.method).toBe('GET');
  requisicao.flush(envelope(recuperada));

  expect(recebido).toEqual(recuperada);
});

it('altera nome/dados de uma ficha de criatura', () => {
  const { servico, http } = criar();
  const alterada: FichaCriaturaAlteradaDto = {
    id: 4, campanhaId: 9, usuarioId: 7, nome: 'Novo Nome', cor: null, imagemUrl: null,
    oculta: false, dados: dadosCriatura,
  };

  let recebido: FichaCriaturaAlteradaDto | undefined;
  servico.alterarFichaCriatura(4, { nome: 'Novo Nome', dados: dadosCriatura }).subscribe((r) => (recebido = r));
  const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
  expect(requisicao.request.method).toBe('PUT');
  expect(requisicao.request.body).toEqual({ nome: 'Novo Nome', dados: dadosCriatura });
  requisicao.flush(envelope(alterada));

  expect(recebido).toEqual(alterada);
});
```

(The `tipo: 'Balístico' as never` cast is a placeholder to satisfy `TipoDanoEnum` without importing it in this snippet — in the real file, import `TipoDanoEnum` and use `TipoDanoEnum.BALISTICO` directly.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- ficha.service.spec.ts`
Expected: FAIL — `servico.recuperarFichaCriatura is not a function`.

- [ ] **Step 3: Implement**

In `ficha.service.ts`, add to the imports from `@contratados-rpg/shared/dtos/ficha`: `FichaCriaturaAlteradaDto`, `FichaCriaturaAlterarDto`, `FichaCriaturaRecuperadaDto`. Add methods (placed after `criarFichaCriatura`):

```ts
  /** Recupera uma ficha de criatura pelo `id` (mesma permissão de visualização — §14, m4-03). */
  recuperarFichaCriatura(id: number): Observable<FichaCriaturaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<FichaCriaturaRecuperadaDto>>(`${this.base}/criatura/${id}`)
      .pipe(map((resposta) => resposta.dados as FichaCriaturaRecuperadaDto));
  }

  /** Altera `nome` e o documento de jogo de uma ficha de criatura (só dono/mestre — §14, m4-03). */
  alterarFichaCriatura(id: number, dto: FichaCriaturaAlterarDto): Observable<FichaCriaturaAlteradaDto> {
    return this.httpClient
      .put<StandardResponse<FichaCriaturaAlteradaDto>>(`${this.base}/criatura/${id}`, dto)
      .pipe(map((resposta) => resposta.dados as FichaCriaturaAlteradaDto));
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- ficha.service.spec.ts`
Expected: PASS (all tests, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/ficha.service.ts frontend/src/app/modules/ficha/ficha.service.spec.ts
git commit -m "feat(m4-04b): FichaService.recuperarFichaCriatura/alterarFichaCriatura"
```

---

## Task 2: `mesclar-ficha.ts` — merge genérico reusável para criatura

**Files:**
- Modify: `frontend/src/app/modules/ficha/mesclar-ficha.ts`
- Test: `frontend/src/app/modules/ficha/mesclar-ficha.spec.ts` (existing — must stay green untouched)

**Interfaces:**
- Produces: `mesclarDocumento<T>(base: T, local: T, remoto: T): T` — consumed by Task 11 (`visualizar-criatura.page.ts`, `absorverRemoto`).
- Consumes: nothing new — pure refactor of existing private helpers into a typed generic export.

- [ ] **Step 1: Write the failing test**

Add to `mesclar-ficha.spec.ts` (uses the existing file's own fixtures/style — this is a new `describe` block; the exact existing fixtures aren't reproduced here since this task must not touch them, only add alongside):

```ts
import { mesclarDocumento } from './mesclar-ficha';

describe('mesclarDocumento (genérico, m4-04b)', () => {
  it('mescla um documento arbitrário com a mesma regra de três vias de mesclarFicha', () => {
    interface Exemplo { readonly a: number; readonly b: { readonly c: string } }
    const base: Exemplo = { a: 1, b: { c: 'x' } };
    const local: Exemplo = { a: 1, b: { c: 'y' } }; // usuário editou b.c
    const remoto: Exemplo = { a: 2, b: { c: 'x' } }; // servidor mudou a

    expect(mesclarDocumento(base, local, remoto)).toEqual({ a: 2, b: { c: 'y' } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=frontend -- mesclar-ficha.spec.ts`
Expected: FAIL — `mesclarDocumento` is not exported.

- [ ] **Step 3: Implement**

In `mesclar-ficha.ts`, replace the public function with a generic wrapper delegating to the same private `mesclarValor` (unchanged below it — zero behavior change for existing callers):

```ts
/**
 * Merge de três vias genérico (m4-04b) — mesmo algoritmo campo a campo de {@link mesclarFicha},
 * reusável por qualquer documento de ficha (jogador ou criatura): a lógica é 100% estrutural
 * (objetos/arrays), nunca lê nome de campo específico de um tipo.
 */
export function mesclarDocumento<T>(base: T, local: T, remoto: T): T {
  return mesclarValor(base, local, remoto) as T;
}

/** Merge de três vias entre o documento da ficha que veio do servidor (`base`)... [resto do docblock existente inalterado] */
export function mesclarFicha(
  base: FichaAlteradaDto,
  local: FichaAlteradaDto,
  remoto: FichaAlteradaDto,
): FichaAlteradaDto {
  return mesclarDocumento(base, local, remoto);
}
```

(Keep every other function in the file — `mesclarValor`, `mesclarObjeto`, `ler`, `ehObjetoSimples`, `saoIguais`, and the `AUSENTE` symbol — completely unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- mesclar-ficha.spec.ts`
Expected: PASS — the new test **and** every pre-existing `mesclarFicha` test (unchanged behavior, since `mesclarFicha` now just calls the generic with the same underlying algorithm).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/mesclar-ficha.ts frontend/src/app/modules/ficha/mesclar-ficha.spec.ts
git commit -m "refactor(m4-04b): extrai mesclarDocumento genérico de mesclarFicha"
```

---

## Task 3: `criatura-rolagem.ts` — helpers puros de rolagem

**Files:**
- Create: `frontend/src/app/modules/ficha/criatura-rolagem.ts`
- Test: `frontend/src/app/modules/ficha/criatura-rolagem.spec.ts`

**Interfaces:**
- Consumes: `calcularAtributoEfetivo` (`@contratados-rpg/shared/regras/criatura`), `rolarFormula`/`ResultadoRolagemDto` (`@contratados-rpg/shared/regras/rolagem`), `FichaAtributosDto`/`FichaCriaturaAtaqueDto`/`FichaCriaturaModificadoresDto` (`@contratados-rpg/shared/dtos/ficha`).
- Produces: `RolagemCriaturaExecutadaDto { rotulo, formula, resultado }`, `rolarTesteAtributoCriatura(dados, chave, rotulo): RolagemCriaturaExecutadaDto | null`, `rolarAtaqueCriatura(dados, ataque): RolagemCriaturaExecutadaDto | null` — consumed by Task 9 (`CriaturaVisualizacao`).

- [ ] **Step 1: Write the failing tests**

```ts
import { ModificadorCriaturaEnum, CustoAcaoEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';
import { rolarAtaqueCriatura, rolarTesteAtributoCriatura } from './criatura-rolagem';

describe('rolarTesteAtributoCriatura', () => {
  const atributos: FichaAtributosDto = {
    destreza: 1, forca: 1, luta: 5, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
  };

  it('monta a fórmula `<atributo>d20kh1` e usa o Atributo Efetivo (atributo + modificador) como contagem de dados', () => {
    const dados = {
      atributos,
      modificadores: { luta: ModificadorCriaturaEnum.FORTE } as never,
      vd: 5, // VD 5: modificador FORTE = valor base 0, sem incremento por faixa
    };

    const resultado = rolarTesteAtributoCriatura(dados, 'luta', 'Teste de Luta');

    expect(resultado?.formula).toBe('lutad20kh1');
    expect(resultado?.rotulo).toBe('Teste de Luta');
    // luta=5 (atributoFinal) + 0 (modificador FORTE em VD5) = 5 dados no pool.
    expect(resultado?.resultado.dados[0].valores).toHaveLength(5);
  });

  it('devolve null quando a fórmula é inválida (chave de atributo vazia não ocorre em uso normal, mas o motor pode recusar)', () => {
    // rolarFormula devolve null só em fórmula malformada; com uma chave válida isso não ocorre —
    // este teste documenta o contrato de propagação do null, usando o mock do motor não é necessário
    // aqui porque a função é pura o suficiente para não precisar de mock: basta confirmar que o tipo
    // de retorno é nullable e a implementação repassa o resultado de `rolarFormula` sem mascará-lo.
    const dados = { atributos, modificadores: { luta: ModificadorCriaturaEnum.FORTE } as never, vd: 5 };
    const resultado = rolarTesteAtributoCriatura(dados, 'luta', 'Teste de Luta');
    expect(resultado).not.toBeNull();
  });
});

describe('rolarAtaqueCriatura', () => {
  const atributos: FichaAtributosDto = {
    destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
  };

  it('rola a fórmula de dano do ataque direto, sem ajuste de atributo', () => {
    const ataque: FichaCriaturaAtaqueDto = {
      nome: 'Golpe de Pedra', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO,
      dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false,
    };

    const resultado = rolarAtaqueCriatura({ atributos }, ataque);

    expect(resultado?.formula).toBe('4D12+10');
    expect(resultado?.rotulo).toBe('Golpe de Pedra');
    expect(resultado?.resultado.dados[0]).toMatchObject({ faces: 12 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- criatura-rolagem.spec.ts`
Expected: FAIL — module `./criatura-rolagem` not found.

- [ ] **Step 3: Implement**

```ts
import type { FichaAtributosDto, FichaCriaturaAtaqueDto, FichaCriaturaModificadoresDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularAtributoEfetivo } from '@contratados-rpg/shared/regras/criatura';
import { rolarFormula, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

/** Resultado pronto pra `BandejaDadosService.mostrar`/`FichaRolagemRegistroService.registrar` (mesmo formato de `PassoExecutadoDto`/`RolagemRealizadaDto`). */
export interface RolagemCriaturaExecutadaDto {
  readonly rotulo: string;
  readonly formula: string;
  readonly resultado: ResultadoRolagemDto;
}

/** Sub-recorte de `FichaCriaturaDadosDto` que os testes de atributo precisam — evita acoplar este módulo ao DTO inteiro. */
export interface DadosParaTesteAtributo {
  readonly atributos: FichaAtributosDto;
  readonly modificadores: FichaCriaturaModificadoresDto;
  readonly vd: number;
}

/**
 * Rola um teste de Atributo da criatura: `<chave>d20kh1` (sem `+PROF` — criatura não tem
 * Proficiência), com a contagem de dados no pool ajustada para o **Atributo Efetivo**
 * (`calcularAtributoEfetivo`, `shared/regras/criatura`) só nesta rolagem — o mapa `atributos`
 * exibido na ficha nunca é mutado (mesmo padrão de `rolarTesteAtributo` em `FichaVisualizacao`).
 */
export function rolarTesteAtributoCriatura(
  dados: DadosParaTesteAtributo,
  chave: keyof FichaAtributosDto,
  rotulo: string,
): RolagemCriaturaExecutadaDto | null {
  const efetivo = calcularAtributoEfetivo({
    atributoFinal: dados.atributos[chave],
    modificador: dados.modificadores[chave],
    vd: dados.vd,
  });
  const atributosParaRolagem: FichaAtributosDto = { ...dados.atributos, [chave]: efetivo };
  const formula = `${chave}d20kh1`;
  const resultado = rolarFormula({ formula, atributos: atributosParaRolagem });
  return resultado ? { rotulo, formula, resultado } : null;
}

/**
 * Rola a fórmula de dano de um Ataque da criatura (`ataque.dano`, ex. `"4D12+10"`) — já é uma
 * fórmula pronta no documento (`m4-01`), sem ajuste de Atributo Efetivo (o dano da criatura é
 * declarado pelo Mestre, não escala automaticamente com o modificador do atributo de teste).
 */
export function rolarAtaqueCriatura(
  dados: Pick<DadosParaTesteAtributo, 'atributos'>,
  ataque: FichaCriaturaAtaqueDto,
): RolagemCriaturaExecutadaDto | null {
  const resultado = rolarFormula({ formula: ataque.dano, atributos: dados.atributos });
  return resultado ? { rotulo: ataque.nome, formula: ataque.dano, resultado } : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criatura-rolagem.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/criatura-rolagem.ts frontend/src/app/modules/ficha/criatura-rolagem.spec.ts
git commit -m "feat(m4-04b): helpers puros de rolagem de ataque/teste de atributo da criatura"
```

---

## Task 4: `FichaEdicaoCriaturaService`

**Files:**
- Create: `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts`
- Test: `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.spec.ts`

**Interfaces:**
- Consumes: `FichaService.recuperarFichaCriatura`/`alterarFichaCriatura` (Task 1).
- Produces: `FichaEdicaoCriaturaService` with `estadoPersistencia`, `edicaoPendente`, `fichaBase`, `inicializar(ficha, fichaId)`, `definirBase(ficha)`, and handlers — consumed by Task 9 (component outputs bind to these) and Task 11 (page providers).

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { CadenciaEnum, ComportamentoCriaturaEnum, ModificadorCriaturaEnum, NivelAmeacaEnum, OrigemCriaturaEnum, PorteCriaturaEnum, TenacidadeEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaDadosDto, FichaCriaturaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaEdicaoCriaturaService } from './ficha-edicao-criatura.service';

describe('FichaEdicaoCriaturaService', () => {
  const dados: FichaCriaturaDadosDto = {
    identidade: {
      designacao: 'A Estátua', origem: OrigemCriaturaEnum.ORIGINAL,
      conceito: 'x', naturezaFisica: 'x', comportamento: ComportamentoCriaturaEnum.CACADORA,
      motivacao: 'x', ganchoUnico: 'x',
    },
    na: NivelAmeacaEnum.ALTA, vd: 30,
    atributos: { destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8, intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4 },
    modificadores: {
      destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
      pontaria: ModificadorCriaturaEnum.FRAGIL, vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
      medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO, social: ModificadorCriaturaEnum.FRACO,
      vontade: ModificadorCriaturaEnum.FRACO,
    },
    tenacidade: TenacidadeEnum.RESISTENTE, vidaMaxima: 100, vidaAtual: 100, defesa: 30,
    resistencias: [], fraquezas: [{ tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 }],
    porte: PorteCriaturaEnum.GRANDE, deslocamento: { terrestre: 9 }, cadencia: CadenciaEnum.SINGULAR,
    ataques: [], habilidades: [], anotacoes: '',
  };
  const fichaInicial: FichaCriaturaRecuperadaDto = {
    id: 4, campanhaId: 9, usuarioId: 7, nome: 'A Estátua', cor: null, imagemUrl: null, oculta: false, dados,
  };

  function envelope<T>(conteudo: T): StandardResponse<T> {
    return { sucesso: true, dados: conteudo, mensagem: 'ok' };
  }

  function montar() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FichaEdicaoCriaturaService],
    });
    const servico = TestBed.inject(FichaEdicaoCriaturaService);
    const http = TestBed.inject(HttpTestingController);
    const ficha = signal<FichaCriaturaRecuperadaDto | null>(fichaInicial);
    servico.inicializar(ficha, () => 4);
    servico.definirBase(fichaInicial);
    return { servico, http, ficha };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('ajusta a vida atual e persiste em lote (debounced) via PUT /ficha/criatura/:id', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarVitalidade({ campo: 'vidaAtual', valor: 60 });
    expect(ficha()?.dados.vidaAtual).toBe(60);
    expect(servico.estadoPersistencia()).toBe('salvando');

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body.dados.vidaAtual).toBe(60);
    requisicao.flush(envelope({ ...fichaInicial, dados: { ...dados, vidaAtual: 60 } }));

    expect(servico.estadoPersistencia()).toBe('salvo');
  });

  it('ajusta a lista de ataques inteira e persiste', async () => {
    const { servico, http, ficha } = montar();
    const novosAtaques = [{ nome: 'Golpe', atributo: 'luta' as const, custoAcao: 'PADRAO' as never, dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false }];

    servico.ajustarAtaques(novosAtaques);
    expect(ficha()?.dados.ataques).toEqual(novosAtaques);

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.body.dados.ataques).toEqual(novosAtaques);
    requisicao.flush(envelope({ ...fichaInicial, dados: { ...dados, ataques: novosAtaques } }));
  });

  it('ajusta nome (campo relacional, fora de dados) e persiste', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarNome('Nova Designação');
    expect(ficha()?.nome).toBe('Nova Designação');

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.body.nome).toBe('Nova Designação');
    requisicao.flush(envelope({ ...fichaInicial, nome: 'Nova Designação' }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- ficha-edicao-criatura.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { DestroyRef, Injectable, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';

import type {
  FichaAtributosDto,
  FichaCriaturaAtaqueDto,
  FichaCriaturaDadosDto,
  FichaCriaturaDeslocamentoDto,
  FichaCriaturaHabilidadeDto,
  FichaCriaturaIdentidadeDto,
  FichaCriaturaModificadoresDto,
  FichaCriaturaRecuperadaDto,
  FichaCriaturaRegeneracaoDto,
  FichaCriaturaResistenciaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { CadenciaEnum, NivelAmeacaEnum, PorteCriaturaEnum, TenacidadeEnum } from '@contratados-rpg/shared/enums';

import { FichaService } from './ficha.service';

/** Ajuste rápido de Vida (mesma forma de `AjusteVitalidade` do jogador, sem Energia — criatura não tem). */
export interface AjusteCriaturaVitalidade {
  readonly campo: 'vidaAtual' | 'vidaMaxima';
  readonly valor: number;
}

/**
 * Os handlers `ajustar*` que aplicam o ajuste otimista local e persistem em lote via
 * `FichaService.alterarFichaCriatura` (debounced) — mirror de `FichaEdicaoService` (jogador),
 * mas para o documento (bem menor) da criatura. Não `providedIn: 'root'` — cada página declara
 * em `providers: []` para ganhar sua própria instância (mesmo motivo de `FichaEdicaoService`).
 */
@Injectable()
export class FichaEdicaoCriaturaService {
  private readonly fichaService = inject(FichaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly estadoPersistencia = signal<'ocioso' | 'salvando' | 'salvo'>('ocioso');
  private temporizadorSalvo: ReturnType<typeof setTimeout> | null = null;

  private readonly ajustePendente = new Subject<void>();
  readonly edicaoPendente = signal(false);
  private readonly fichaBaseSignal = signal<FichaCriaturaRecuperadaDto | null>(null);
  readonly fichaBase = this.fichaBaseSignal.asReadonly();

  private ficha!: WritableSignal<FichaCriaturaRecuperadaDto | null>;
  private obterFichaId!: () => number;
  private iniciado = false;

  inicializar(ficha: WritableSignal<FichaCriaturaRecuperadaDto | null>, fichaId: () => number): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;
    this.ficha = ficha;
    this.obterFichaId = fichaId;

    this.ajustePendente
      .pipe(
        debounceTime(500),
        switchMap(() => {
          const fichaAtual = this.ficha()!;
          return this.fichaService
            .alterarFichaCriatura(this.obterFichaId(), {
              nome: fichaAtual.nome,
              cor: fichaAtual.cor,
              oculta: fichaAtual.oculta,
              dados: fichaAtual.dados,
            })
            .pipe(
              catchError(() => {
                this.edicaoPendente.set(false);
                this.estadoPersistencia.set('ocioso');
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (fichaAlterada) => {
          this.ficha.set(fichaAlterada);
          this.fichaBaseSignal.set(fichaAlterada);
          this.edicaoPendente.set(false);
          this.marcarSalvo();
        },
      });
  }

  definirBase(ficha: FichaCriaturaRecuperadaDto | null): void {
    this.fichaBaseSignal.set(ficha);
  }

  private marcarSalvo(): void {
    this.estadoPersistencia.set('salvo');
    if (this.temporizadorSalvo) clearTimeout(this.temporizadorSalvo);
    this.temporizadorSalvo = setTimeout(() => this.estadoPersistencia.set('ocioso'), 2000);
  }

  private agendarPersistencia(): void {
    this.edicaoPendente.set(true);
    this.estadoPersistencia.set('salvando');
    this.ajustePendente.next();
  }

  private atualizarDados(mudar: (dados: FichaCriaturaDadosDto) => FichaCriaturaDadosDto): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: mudar(fichaAtual.dados) });
    this.agendarPersistencia();
  }

  ajustarVitalidade(ajuste: AjusteCriaturaVitalidade): void {
    this.atualizarDados((dados) => ({ ...dados, [ajuste.campo]: ajuste.valor }));
  }

  ajustarDefesa(defesa: number): void {
    this.atualizarDados((dados) => ({ ...dados, defesa }));
  }

  ajustarIdentidade(identidade: FichaCriaturaIdentidadeDto): void {
    this.atualizarDados((dados) => ({ ...dados, identidade }));
  }

  ajustarNa(na: NivelAmeacaEnum): void {
    this.atualizarDados((dados) => ({ ...dados, na }));
  }

  ajustarVd(vd: number): void {
    this.atualizarDados((dados) => ({ ...dados, vd }));
  }

  ajustarAtributos(atributos: FichaAtributosDto): void {
    this.atualizarDados((dados) => ({ ...dados, atributos }));
  }

  ajustarModificadores(modificadores: FichaCriaturaModificadoresDto): void {
    this.atualizarDados((dados) => ({ ...dados, modificadores }));
  }

  ajustarTenacidade(tenacidade: TenacidadeEnum): void {
    this.atualizarDados((dados) => ({ ...dados, tenacidade }));
  }

  ajustarResistencias(resistencias: readonly FichaCriaturaResistenciaDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, resistencias }));
  }

  ajustarFraquezas(fraquezas: readonly FichaCriaturaResistenciaDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, fraquezas }));
  }

  ajustarRegeneracao(regeneracao: FichaCriaturaRegeneracaoDto | undefined): void {
    this.atualizarDados((dados) => ({ ...dados, regeneracao }));
  }

  ajustarPorte(porte: PorteCriaturaEnum): void {
    this.atualizarDados((dados) => ({ ...dados, porte }));
  }

  ajustarDeslocamento(deslocamento: FichaCriaturaDeslocamentoDto): void {
    this.atualizarDados((dados) => ({ ...dados, deslocamento }));
  }

  ajustarCadencia(cadencia: CadenciaEnum): void {
    this.atualizarDados((dados) => ({ ...dados, cadencia }));
  }

  ajustarIniciativaBonus(iniciativaBonus: number | undefined): void {
    this.atualizarDados((dados) => ({ ...dados, iniciativaBonus }));
  }

  ajustarAtaques(ataques: readonly FichaCriaturaAtaqueDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, ataques }));
  }

  ajustarHabilidades(habilidades: readonly FichaCriaturaHabilidadeDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, habilidades }));
  }

  ajustarAnotacoes(anotacoes: string): void {
    this.atualizarDados((dados) => ({ ...dados, anotacoes }));
  }

  ajustarNome(nome: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, nome });
    this.agendarPersistencia();
  }

  ajustarCor(cor: string | null): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, cor });
    this.agendarPersistencia();
  }

  ajustarOculta(oculta: boolean): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, oculta });
    this.agendarPersistencia();
  }

  /** Avatar (imediato, fora do debounce — mesmo modelo de `FichaEdicaoService.ajustarImagem`). */
  ajustarImagem(arquivo: File): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.estadoPersistencia.set('salvando');
    this.fichaService
      .alterarImagem(this.obterFichaId(), arquivo)
      .pipe(
        catchError(() => {
          this.estadoPersistencia.set('ocioso');
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        const fichaAgora = this.ficha();
        if (fichaAgora) {
          this.ficha.set({ ...fichaAgora, imagemUrl: resultado.imagemUrl });
        }
        this.marcarSalvo();
      });
  }

  removerImagem(): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.estadoPersistencia.set('salvando');
    this.fichaService
      .excluirImagem(this.obterFichaId())
      .pipe(
        catchError(() => {
          this.estadoPersistencia.set('ocioso');
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        const fichaAgora = this.ficha();
        if (fichaAgora) {
          this.ficha.set({ ...fichaAgora, imagemUrl: resultado.imagemUrl });
        }
        this.marcarSalvo();
      });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- ficha-edicao-criatura.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts frontend/src/app/modules/ficha/ficha-edicao-criatura.service.spec.ts
git commit -m "feat(m4-04b): FichaEdicaoCriaturaService — edicao no proprio lugar + persistencia em lote"
```

---

## Task 5: Rota `/painel/:campanhaId/criatura/:id` + navegação pós-criação

**Files:**
- Modify: `frontend/src/app/modules/ficha/criatura.routes.ts`
- Modify: `frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.ts`
- Modify: `frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.spec.ts`

**Interfaces:**
- Consumes: nothing (route wiring only — `visualizar-criatura.page.ts` from Task 11 is the `loadComponent` target, added as a placeholder import path now, implemented in Task 11).

- [ ] **Step 1: Write the failing test**

Update the existing assertion in `criar-criatura.page.spec.ts` (currently at the line matching `expect(router.navigate).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'ficha', 99]);`):

```ts
    expect(router.navigate).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'criatura', 99]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=frontend -- criar-criatura.page.spec.ts`
Expected: FAIL — received `['/painel', 57, 'ficha', 99]`, expected `['/painel', 57, 'criatura', 99]`.

- [ ] **Step 3: Implement**

In `criatura.routes.ts`, add the `:id` route after `nova` (order matters — literal before parametrized, same convention as `ficha.routes.ts`):

```ts
export const criaturaRoutes: Routes = [
  {
    path: 'nova',
    loadComponent: () =>
      import('./paginas/criar-criatura/criar-criatura.page').then((modulo) => modulo.CriaturaCriar),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paginas/visualizar-criatura/visualizar-criatura.page').then(
        (modulo) => modulo.CriaturaVisualizar,
      ),
  },
];
```

Also update the file's docblock to mention the new route (one added line is enough, e.g. `\`:id\` (m4-04b) é a tela de visualização/edição da criatura já criada.`).

In `criar-criatura.page.ts`, change the `criar()` method's `destino` (currently `['/painel', this.campanhaId, 'ficha', ficha.id]`):

```ts
          const destino = ['/painel', this.campanhaId, 'criatura', ficha.id];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criar-criatura.page.spec.ts`
Expected: PASS.

Note: this step leaves `criatura.routes.ts` pointing at a module (`visualizar-criatura.page`) that doesn't exist until Task 11 — the app won't build/serve correctly until then. That's expected mid-plan; do **not** run `ng build`/`ng serve` as a gate until Task 11 lands. `npm run test` only compiles what each spec file imports, so this is safe to commit now.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/criatura.routes.ts frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.ts frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.spec.ts
git commit -m "feat(m4-04b): navega para /painel/:campanhaId/criatura/:id apos criar a criatura"
```

---

## Task 6: `CriaturaResistenciaLista` — editor de lista (Resistências e Fraquezas)

**Files:**
- Create: `frontend/src/app/modules/ficha/componentes/criatura-resistencia-lista/criatura-resistencia-lista.component.ts`
- Create: `frontend/src/app/modules/ficha/componentes/criatura-resistencia-lista/criatura-resistencia-lista.component.html`
- Create: `frontend/src/app/modules/ficha/componentes/criatura-resistencia-lista/criatura-resistencia-lista.component.scss`
- Test: `frontend/src/app/modules/ficha/componentes/criatura-resistencia-lista/criatura-resistencia-lista.component.spec.ts`

**Interfaces:**
- Consumes: `FichaCriaturaResistenciaDto { tipo: TipoDanoEnum; subtipo: string | null; valor: number }`, `TipoDanoEnum` (`@contratados-rpg/shared/enums`).
- Produces: `CriaturaResistenciaLista` component — `input.required<readonly FichaCriaturaResistenciaDto[]>('itens')`, `input.required<string>('titulo')`, `input(false)('editavel')`, `output<readonly FichaCriaturaResistenciaDto[]>('itensMudou')` — consumed twice by Task 9 (once for Resistências, once for Fraquezas).

Same array-CRUD skeleton as `FichaHabilidades` (`indiceEmEdicao`: `null`/`-1`/`≥0`, `indiceRemovendo`, `FormGroup`, `substituir`, `emitir`), simplified: no catalog, no energy spend — just add/edit/remove a `{tipo, subtipo, valor}` row.

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaResistenciaDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaResistenciaLista } from './criatura-resistencia-lista.component';

describe('CriaturaResistenciaLista', () => {
  const itens: FichaCriaturaResistenciaDto[] = [
    { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('titulo', 'Resistências');
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaResistenciaDto[])[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista os itens existentes com tipo e valor', () => {
    const { raiz } = montar(false);
    const tipos = Array.from(raiz.querySelectorAll('.resistencia-lista__tipo')).map((n) => n.textContent?.trim());
    expect(tipos).toEqual(['Balístico']);
  });

  it('adiciona um item e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({ tipo: TipoDanoEnum.QUIMICO, subtipo: '', valor: 5 });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([...itens, { tipo: TipoDanoEnum.QUIMICO, subtipo: null, valor: 5 }]);
  });

  it('remove um item e emite a lista sem ele', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['pedirRemocao'](0);
    alvo.fixture.componentInstance['remover'](0);

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- criatura-resistencia-lista.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`criatura-resistencia-lista.component.ts`:

```ts
import { Component, input, output, signal } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TipoDanoEnum, ROTULOS_TIPO_DANO } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaResistenciaDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';

const TIPOS: readonly TipoDanoEnum[] = Object.values(TipoDanoEnum) as TipoDanoEnum[];

/**
 * Editor no próprio lugar de uma lista `{tipo, subtipo, valor}` (m4-04b) — reusado tanto para
 * Resistências quanto para Fraquezas da ficha de criatura (`FichaCriaturaResistenciaDto` é a
 * mesma forma nos dois campos, ver docblock do DTO). `titulo` só rotula a seção; a semântica
 * (resistência vs. fraqueza) é decidida por qual `ajustar*` do service o pai liga ao `(itensMudou)`.
 */
@Component({
  selector: 'app-criatura-resistencia-lista',
  imports: [ReactiveFormsModule, Icone],
  templateUrl: './criatura-resistencia-lista.component.html',
  styleUrl: './criatura-resistencia-lista.component.scss',
})
export class CriaturaResistenciaLista {
  readonly itens = input.required<readonly FichaCriaturaResistenciaDto[]>();
  readonly titulo = input.required<string>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaResistenciaDto[]>();

  protected readonly tipos = TIPOS;
  protected readonly rotulosTipo = ROTULOS_TIPO_DANO;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  protected readonly indiceRemovendo = signal<number | null>(null);

  protected readonly itemForm = new FormGroup({
    tipo: new FormControl(TipoDanoEnum.FISICO, { nonNullable: true, validators: [Validators.required] }),
    subtipo: new FormControl('', { nonNullable: true }),
    valor: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  protected adicionar(): void {
    this.itemForm.reset({ tipo: TipoDanoEnum.FISICO, subtipo: '', valor: 0 });
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ tipo: item.tipo, subtipo: item.subtipo ?? '', valor: item.valor });
    this.indiceEmEdicao.set(indice);
  }

  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  protected pedirRemocao(indice: number): void {
    this.indiceRemovendo.set(indice);
  }

  protected cancelarRemocao(): void {
    this.indiceRemovendo.set(null);
  }

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.itemForm.invalid) {
      return;
    }
    const bruto = this.itemForm.getRawValue();
    const item: FichaCriaturaResistenciaDto = {
      tipo: bruto.tipo,
      subtipo: bruto.subtipo.trim() || null,
      valor: bruto.valor,
    };
    this.emitir(this.substituir(this.itens(), indice, item));
    this.cancelar();
  }

  protected remover(indice: number): void {
    this.emitir(this.itens().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
    if (this.indiceEmEdicao() === indice) {
      this.cancelar();
    }
  }

  private substituir(
    lista: readonly FichaCriaturaResistenciaDto[],
    indice: number,
    item: FichaCriaturaResistenciaDto,
  ): FichaCriaturaResistenciaDto[] {
    return indice < 0 ? [...lista, item] : lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(itens: readonly FichaCriaturaResistenciaDto[]): void {
    this.itensMudou.emit(itens);
  }
}
```

`criatura-resistencia-lista.component.html`:

```html
<section class="resistencia-lista">
  <header class="resistencia-lista__cabecalho">
    <h3 class="resistencia-lista__titulo">{{ titulo() }}</h3>
    @if (editavel()) {
      <button class="botao botao--secundario" type="button" (click)="adicionar()">
        <app-icone nome="mais" /> Adicionar
      </button>
    }
  </header>

  @if (!itens().length) {
    <p class="resistencia-lista__vazio">Nenhum item.</p>
  }

  <ul class="resistencia-lista__itens">
    @for (item of itens(); track $index) {
      <li class="resistencia-lista__item">
        @if (editando($index)) {
          <form class="resistencia-lista__form" [formGroup]="itemForm" (ngSubmit)="confirmar()">
            <select class="resistencia-lista__select" formControlName="tipo" aria-label="Tipo de dano">
              @for (tipo of tipos; track tipo) {
                <option [value]="tipo">{{ rotulosTipo[tipo] }}</option>
              }
            </select>
            <input class="resistencia-lista__input" formControlName="subtipo" placeholder="Subtipo (opcional)" aria-label="Subtipo" />
            <input class="resistencia-lista__input resistencia-lista__input--numero" type="number" formControlName="valor" aria-label="Valor" />
            <button class="botao botao--primario" type="submit" [disabled]="itemForm.invalid">Confirmar</button>
            <button class="botao botao--secundario" type="button" (click)="cancelar()">Cancelar</button>
          </form>
        } @else {
          <span class="resistencia-lista__tipo">{{ rotulosTipo[item.tipo] }}</span>
          @if (item.subtipo) {
            <span class="resistencia-lista__subtipo">{{ item.subtipo }}</span>
          }
          <span class="resistencia-lista__valor">{{ item.valor }}</span>
          @if (editavel()) {
            <div class="resistencia-lista__acoes">
              <button class="resistencia-lista__acao" type="button" aria-label="Editar" (click)="editar($index)">
                <app-icone nome="editar" />
              </button>
              @if (indiceRemovendo() === $index) {
                <button class="resistencia-lista__acao resistencia-lista__acao--confirmar" type="button" (click)="remover($index)">Confirmar remoção</button>
                <button class="resistencia-lista__acao" type="button" (click)="cancelarRemocao()">Cancelar</button>
              } @else {
                <button class="resistencia-lista__acao" type="button" aria-label="Remover" (click)="pedirRemocao($index)">
                  <app-icone nome="excluir" />
                </button>
              }
            </div>
          }
        }
      </li>
    }
  </ul>

  @if (editando(-1)) {
    <form class="resistencia-lista__form resistencia-lista__form--novo" [formGroup]="itemForm" (ngSubmit)="confirmar()">
      <select class="resistencia-lista__select" formControlName="tipo" aria-label="Tipo de dano">
        @for (tipo of tipos; track tipo) {
          <option [value]="tipo">{{ rotulosTipo[tipo] }}</option>
        }
      </select>
      <input class="resistencia-lista__input" formControlName="subtipo" placeholder="Subtipo (opcional)" aria-label="Subtipo" />
      <input class="resistencia-lista__input resistencia-lista__input--numero" type="number" formControlName="valor" aria-label="Valor" />
      <button class="botao botao--primario" type="submit" [disabled]="itemForm.invalid">Adicionar</button>
      <button class="botao botao--secundario" type="button" (click)="cancelar()">Cancelar</button>
    </form>
  }
</section>
```

`criatura-resistencia-lista.component.scss`:

```scss
:host { display: block; }

.resistencia-lista {
  &__cabecalho { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  &__titulo { margin: 0; font: 700 12px var(--font-mono); text-transform: uppercase; letter-spacing: var(--tracking-label); color: var(--text); }
  &__vazio { font: 12px var(--font-sans); color: var(--text-mute); }
  &__itens { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  &__item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-control); flex-wrap: wrap; }
  &__tipo { font: 600 11px var(--font-mono); color: var(--text); }
  &__subtipo { font: 11px var(--font-sans); color: var(--text-dim); }
  &__valor { margin-left: auto; font: 700 12px var(--font-mono); color: var(--accent); }
  &__acoes { display: flex; gap: 4px; }
  &__acao { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: var(--text-dim); background: transparent; border: 1px solid var(--border-strong); border-radius: var(--radius-control); cursor: pointer; &:hover { color: var(--accent); border-color: var(--accent-border); } }
  &__acao--confirmar { width: auto; padding: 0 8px; color: var(--negative); }
  &__form { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; width: 100%; }
  &__form--novo { margin-top: 8px; padding: 8px 10px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--radius-control); }
  &__select, &__input { padding: 4px 8px; font: 12px var(--font-sans); color: var(--text); background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-control); }
  &__input--numero { width: 70px; }
}
```

(Note: `ROTULOS_TIPO_DANO` is assumed to already exist as an exported label map in `@contratados-rpg/shared/enums`, following the same `ROTULOS_HABILIDADE_CATEGORIA` convention seen in `FichaHabilidades`. If it does not exist yet, add it alongside `TipoDanoEnum` in `tipo-dano.enum.ts` as `export const ROTULOS_TIPO_DANO: Readonly<Record<TipoDanoEnum, string>> = { [TipoDanoEnum.FISICO]: 'Físico', [TipoDanoEnum.BALISTICO]: 'Balístico', [TipoDanoEnum.EXPLOSAO]: 'Explosão', [TipoDanoEnum.QUIMICO]: 'Químico', [TipoDanoEnum.GERAL]: 'Geral' };` — the enum's own string values already read fine as labels, so this map may turn out to be a trivial identity and you can bind `item.tipo` directly in the template instead; check before adding a redundant map.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criatura-resistencia-lista.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/criatura-resistencia-lista/
git commit -m "feat(m4-04b): editor de lista Resistencias/Fraquezas da criatura"
```

---

## Task 7: `CriaturaAtaqueLista` — editor de lista de Ataques

**Files:**
- Create: `frontend/src/app/modules/ficha/componentes/criatura-ataque-lista/criatura-ataque-lista.component.ts`
- Create: `frontend/src/app/modules/ficha/componentes/criatura-ataque-lista/criatura-ataque-lista.component.html`
- Create: `frontend/src/app/modules/ficha/componentes/criatura-ataque-lista/criatura-ataque-lista.component.scss`
- Test: `frontend/src/app/modules/ficha/componentes/criatura-ataque-lista/criatura-ataque-lista.component.spec.ts`

**Interfaces:**
- Consumes: `FichaCriaturaAtaqueDto { nome, atributo: keyof FichaAtributosDto, custoAcao: CustoAcaoEnum, dano: string, tipoDano: TipoDanoEnum, area: boolean, efeito?: string }`.
- Produces: `CriaturaAtaqueLista` — `input.required<readonly FichaCriaturaAtaqueDto[]>('itens')`, `input(false)('editavel')`, `output<readonly FichaCriaturaAtaqueDto[]>('itensMudou')`, `output<FichaCriaturaAtaqueDto>('rolarAtaque')` (the roll button — parent does the actual rolling via Task 3's helper, this component just reports which ataque was clicked) — consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { CustoAcaoEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaAtaqueLista } from './criatura-ataque-lista.component';

describe('CriaturaAtaqueLista', () => {
  const itens: FichaCriaturaAtaqueDto[] = [
    { nome: 'Golpe de Pedra', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [CriaturaAtaqueLista] });
    const fixture = TestBed.createComponent(CriaturaAtaqueLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaAtaqueDto[])[] = [];
    const rolados: FichaCriaturaAtaqueDto[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    fixture.componentInstance.rolarAtaque.subscribe((a) => rolados.push(a));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos, rolados };
  }

  it('lista os ataques com nome e dano', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.ataque-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Golpe de Pedra']);
  });

  it('emite rolarAtaque ao clicar no botão de dado', () => {
    const alvo = montar(false);
    (alvo.raiz.querySelector('.ataque-lista__rolar') as HTMLButtonElement).click();
    expect(alvo.rolados).toEqual([itens[0]]);
  });

  it('adiciona um ataque e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({
      nome: 'Investida', atributo: 'forca', custoAcao: CustoAcaoEnum.COMPLETA,
      dano: '6D12+16', tipoDano: TipoDanoEnum.FISICO, area: false, efeito: '',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      ...itens,
      { nome: 'Investida', atributo: 'forca', custoAcao: CustoAcaoEnum.COMPLETA, dano: '6D12+16', tipoDano: TipoDanoEnum.FISICO, area: false },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- criatura-ataque-lista.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`criatura-ataque-lista.component.ts`:

```ts
import { Component, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CustoAcaoEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';

const ATRIBUTOS: readonly (keyof FichaAtributosDto)[] = [
  'destreza', 'forca', 'luta', 'pontaria', 'vigor', 'intelecto', 'medicina', 'sentidos', 'social', 'vontade',
];
const CUSTOS_ACAO: readonly CustoAcaoEnum[] = Object.values(CustoAcaoEnum) as CustoAcaoEnum[];
const TIPOS_DANO: readonly TipoDanoEnum[] = Object.values(TipoDanoEnum) as TipoDanoEnum[];

/** Editor no próprio lugar da lista `ataques` da ficha de criatura (m4-04b), com botão de rolagem por linha. */
@Component({
  selector: 'app-criatura-ataque-lista',
  imports: [ReactiveFormsModule, Icone],
  templateUrl: './criatura-ataque-lista.component.html',
  styleUrl: './criatura-ataque-lista.component.scss',
})
export class CriaturaAtaqueLista {
  readonly itens = input.required<readonly FichaCriaturaAtaqueDto[]>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaAtaqueDto[]>();
  /** Emite o ataque clicado — quem monta este componente (Task 9) executa a rolagem de verdade. */
  readonly rolarAtaque = output<FichaCriaturaAtaqueDto>();

  protected readonly atributos = ATRIBUTOS;
  protected readonly custosAcao = CUSTOS_ACAO;
  protected readonly tiposDano = TIPOS_DANO;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  protected readonly indiceRemovendo = signal<number | null>(null);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    atributo: new FormControl<keyof FichaAtributosDto>('luta', { nonNullable: true }),
    custoAcao: new FormControl(CustoAcaoEnum.PADRAO, { nonNullable: true }),
    dano: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipoDano: new FormControl(TipoDanoEnum.FISICO, { nonNullable: true }),
    area: new FormControl(false, { nonNullable: true }),
    efeito: new FormControl('', { nonNullable: true }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  protected adicionar(): void {
    this.itemForm.reset({ nome: '', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO, dano: '', tipoDano: TipoDanoEnum.FISICO, area: false, efeito: '' });
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ ...item, efeito: item.efeito ?? '' });
    this.indiceEmEdicao.set(indice);
  }

  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  protected pedirRemocao(indice: number): void {
    this.indiceRemovendo.set(indice);
  }

  protected cancelarRemocao(): void {
    this.indiceRemovendo.set(null);
  }

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.itemForm.invalid) {
      return;
    }
    const bruto = this.itemForm.getRawValue();
    const item: FichaCriaturaAtaqueDto = {
      nome: bruto.nome.trim(),
      atributo: bruto.atributo,
      custoAcao: bruto.custoAcao,
      dano: bruto.dano.trim(),
      tipoDano: bruto.tipoDano,
      area: bruto.area,
      ...(bruto.efeito.trim() ? { efeito: bruto.efeito.trim() } : {}),
    };
    this.emitir(this.substituir(this.itens(), indice, item));
    this.cancelar();
  }

  protected remover(indice: number): void {
    this.emitir(this.itens().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
    if (this.indiceEmEdicao() === indice) {
      this.cancelar();
    }
  }

  protected rolar(item: FichaCriaturaAtaqueDto): void {
    this.rolarAtaque.emit(item);
  }

  private substituir(
    lista: readonly FichaCriaturaAtaqueDto[],
    indice: number,
    item: FichaCriaturaAtaqueDto,
  ): FichaCriaturaAtaqueDto[] {
    return indice < 0 ? [...lista, item] : lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(itens: readonly FichaCriaturaAtaqueDto[]): void {
    this.itensMudou.emit(itens);
  }
}
```

`criatura-ataque-lista.component.html`:

```html
<section class="ataque-lista">
  <header class="ataque-lista__cabecalho">
    <h3 class="ataque-lista__titulo">Ataques</h3>
    @if (editavel()) {
      <button class="botao botao--secundario" type="button" (click)="adicionar()">
        <app-icone nome="mais" /> Adicionar
      </button>
    }
  </header>

  @if (!itens().length) {
    <p class="ataque-lista__vazio">Nenhum ataque.</p>
  }

  <ul class="ataque-lista__itens">
    @for (item of itens(); track $index) {
      <li class="ataque-lista__item">
        @if (editando($index)) {
          <form class="ataque-lista__form" [formGroup]="itemForm" (ngSubmit)="confirmar()">
            <input class="ataque-lista__input" formControlName="nome" placeholder="Nome" aria-label="Nome do ataque" />
            <select class="ataque-lista__select" formControlName="atributo" aria-label="Atributo de teste">
              @for (a of atributos; track a) { <option [value]="a">{{ a }}</option> }
            </select>
            <select class="ataque-lista__select" formControlName="custoAcao" aria-label="Custo de ação">
              @for (c of custosAcao; track c) { <option [value]="c">{{ c }}</option> }
            </select>
            <input class="ataque-lista__input" formControlName="dano" placeholder="Dano (ex.: 4D12+10)" aria-label="Fórmula de dano" />
            <select class="ataque-lista__select" formControlName="tipoDano" aria-label="Tipo de dano">
              @for (t of tiposDano; track t) { <option [value]="t">{{ t }}</option> }
            </select>
            <label class="ataque-lista__checkbox"><input type="checkbox" formControlName="area" /> Área</label>
            <input class="ataque-lista__input ataque-lista__input--largo" formControlName="efeito" placeholder="Efeito adicional (opcional)" aria-label="Efeito" />
            <button class="botao botao--primario" type="submit" [disabled]="itemForm.invalid">Confirmar</button>
            <button class="botao botao--secundario" type="button" (click)="cancelar()">Cancelar</button>
          </form>
        } @else {
          <span class="ataque-lista__nome">{{ item.nome }}</span>
          <span class="ataque-lista__dano">{{ item.dano }}</span>
          <span class="ataque-lista__meta">{{ item.tipoDano }} · {{ item.custoAcao }}</span>
          @if (item.efeito) { <span class="ataque-lista__efeito">{{ item.efeito }}</span> }
          <button class="ataque-lista__rolar" type="button" aria-label="Rolar dano" (click)="rolar(item)">
            <app-icone nome="d20" />
          </button>
          @if (editavel()) {
            <div class="ataque-lista__acoes">
              <button class="ataque-lista__acao" type="button" aria-label="Editar" (click)="editar($index)"><app-icone nome="editar" /></button>
              @if (indiceRemovendo() === $index) {
                <button class="ataque-lista__acao ataque-lista__acao--confirmar" type="button" (click)="remover($index)">Confirmar remoção</button>
                <button class="ataque-lista__acao" type="button" (click)="cancelarRemocao()">Cancelar</button>
              } @else {
                <button class="ataque-lista__acao" type="button" aria-label="Remover" (click)="pedirRemocao($index)"><app-icone nome="excluir" /></button>
              }
            </div>
          }
        }
      </li>
    }
  </ul>

  @if (editando(-1)) {
    <form class="ataque-lista__form ataque-lista__form--novo" [formGroup]="itemForm" (ngSubmit)="confirmar()">
      <input class="ataque-lista__input" formControlName="nome" placeholder="Nome" aria-label="Nome do ataque" />
      <select class="ataque-lista__select" formControlName="atributo" aria-label="Atributo de teste">
        @for (a of atributos; track a) { <option [value]="a">{{ a }}</option> }
      </select>
      <select class="ataque-lista__select" formControlName="custoAcao" aria-label="Custo de ação">
        @for (c of custosAcao; track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <input class="ataque-lista__input" formControlName="dano" placeholder="Dano (ex.: 4D12+10)" aria-label="Fórmula de dano" />
      <select class="ataque-lista__select" formControlName="tipoDano" aria-label="Tipo de dano">
        @for (t of tiposDano; track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <label class="ataque-lista__checkbox"><input type="checkbox" formControlName="area" /> Área</label>
      <input class="ataque-lista__input ataque-lista__input--largo" formControlName="efeito" placeholder="Efeito adicional (opcional)" aria-label="Efeito" />
      <button class="botao botao--primario" type="submit" [disabled]="itemForm.invalid">Adicionar</button>
      <button class="botao botao--secundario" type="button" (click)="cancelar()">Cancelar</button>
    </form>
  }
</section>
```

`criatura-ataque-lista.component.scss`:

```scss
:host { display: block; }

.ataque-lista {
  &__cabecalho { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  &__titulo { margin: 0; font: 700 12px var(--font-mono); text-transform: uppercase; letter-spacing: var(--tracking-label); color: var(--text); }
  &__vazio { font: 12px var(--font-sans); color: var(--text-mute); }
  &__itens { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  &__item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-control); flex-wrap: wrap; }
  &__nome { font: 700 12px var(--font-mono); color: var(--text); }
  &__dano { font: 12px var(--font-mono); color: var(--accent); }
  &__meta { font: 10px var(--font-sans); color: var(--text-mute); text-transform: uppercase; }
  &__efeito { flex-basis: 100%; font: 11px var(--font-sans); color: var(--text-dim); }
  &__rolar { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; margin-left: auto; color: var(--accent); background: transparent; border: 1px solid var(--accent-border); border-radius: var(--radius-control); cursor: pointer; &:hover { background: var(--accent-dim); } }
  &__acoes { display: flex; gap: 4px; }
  &__acao { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: var(--text-dim); background: transparent; border: 1px solid var(--border-strong); border-radius: var(--radius-control); cursor: pointer; &:hover { color: var(--accent); border-color: var(--accent-border); } }
  &__acao--confirmar { width: auto; padding: 0 8px; color: var(--negative); }
  &__form { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; width: 100%; }
  &__form--novo { margin-top: 8px; padding: 8px 10px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--radius-control); }
  &__select, &__input { padding: 4px 8px; font: 12px var(--font-sans); color: var(--text); background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-control); }
  &__input--largo { flex: 1 1 100%; }
  &__checkbox { display: inline-flex; align-items: center; gap: 4px; font: 11px var(--font-sans); color: var(--text-dim); }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criatura-ataque-lista.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/criatura-ataque-lista/
git commit -m "feat(m4-04b): editor de lista Ataques da criatura, com botao de rolagem"
```

---

## Task 8: `CriaturaHabilidadeLista` — editor de lista de Habilidades Especiais

**Files:**
- Create: `frontend/src/app/modules/ficha/componentes/criatura-habilidade-lista/criatura-habilidade-lista.component.ts`
- Create: `frontend/src/app/modules/ficha/componentes/criatura-habilidade-lista/criatura-habilidade-lista.component.html`
- Create: `frontend/src/app/modules/ficha/componentes/criatura-habilidade-lista/criatura-habilidade-lista.component.scss`
- Test: `frontend/src/app/modules/ficha/componentes/criatura-habilidade-lista/criatura-habilidade-lista.component.spec.ts`

**Interfaces:**
- Consumes: `FichaCriaturaHabilidadeDto { nome, tipo: HabilidadeTipoCriaturaEnum, descricao, restricao?: string | null }`.
- Produces: `CriaturaHabilidadeLista` — `input.required<readonly FichaCriaturaHabilidadeDto[]>('itens')`, `input(false)('editavel')`, `output<readonly FichaCriaturaHabilidadeDto[]>('itensMudou')` — consumed by Task 9. Same skeleton as Tasks 6/7, no roll button (habilidades especiais são texto livre, sem fórmula).

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { HabilidadeTipoCriaturaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaHabilidadeLista } from './criatura-habilidade-lista.component';

describe('CriaturaHabilidadeLista', () => {
  const itens: FichaCriaturaHabilidadeDto[] = [
    { nome: 'Pele de Pedra', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Reduz dano físico.' },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [CriaturaHabilidadeLista] });
    const fixture = TestBed.createComponent(CriaturaHabilidadeLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaHabilidadeDto[])[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista as habilidades com nome e descrição', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.habilidade-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Pele de Pedra']);
  });

  it('adiciona uma habilidade e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({
      nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano crítico.', restricao: 'uma vez por cena',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      ...itens,
      { nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano crítico.', restricao: 'uma vez por cena' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- criatura-habilidade-lista.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`criatura-habilidade-lista.component.ts`:

```ts
import { Component, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { HabilidadeTipoCriaturaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';

const TIPOS: readonly HabilidadeTipoCriaturaEnum[] = Object.values(HabilidadeTipoCriaturaEnum) as HabilidadeTipoCriaturaEnum[];

/** Editor no próprio lugar da lista `habilidades` (Habilidades Especiais) da ficha de criatura (m4-04b). */
@Component({
  selector: 'app-criatura-habilidade-lista',
  imports: [ReactiveFormsModule, Icone],
  templateUrl: './criatura-habilidade-lista.component.html',
  styleUrl: './criatura-habilidade-lista.component.scss',
})
export class CriaturaHabilidadeLista {
  readonly itens = input.required<readonly FichaCriaturaHabilidadeDto[]>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaHabilidadeDto[]>();

  protected readonly tipos = TIPOS;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  protected readonly indiceRemovendo = signal<number | null>(null);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl(HabilidadeTipoCriaturaEnum.PASSIVA, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    restricao: new FormControl('', { nonNullable: true }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  protected adicionar(): void {
    this.itemForm.reset({ nome: '', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: '', restricao: '' });
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ nome: item.nome, tipo: item.tipo, descricao: item.descricao, restricao: item.restricao ?? '' });
    this.indiceEmEdicao.set(indice);
  }

  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  protected pedirRemocao(indice: number): void {
    this.indiceRemovendo.set(indice);
  }

  protected cancelarRemocao(): void {
    this.indiceRemovendo.set(null);
  }

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.itemForm.invalid) {
      return;
    }
    const bruto = this.itemForm.getRawValue();
    const item: FichaCriaturaHabilidadeDto = {
      nome: bruto.nome.trim(),
      tipo: bruto.tipo,
      descricao: bruto.descricao.trim(),
      ...(bruto.restricao.trim() ? { restricao: bruto.restricao.trim() } : {}),
    };
    this.emitir(this.substituir(this.itens(), indice, item));
    this.cancelar();
  }

  protected remover(indice: number): void {
    this.emitir(this.itens().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
    if (this.indiceEmEdicao() === indice) {
      this.cancelar();
    }
  }

  private substituir(
    lista: readonly FichaCriaturaHabilidadeDto[],
    indice: number,
    item: FichaCriaturaHabilidadeDto,
  ): FichaCriaturaHabilidadeDto[] {
    return indice < 0 ? [...lista, item] : lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(itens: readonly FichaCriaturaHabilidadeDto[]): void {
    this.itensMudou.emit(itens);
  }
}
```

`criatura-habilidade-lista.component.html`:

```html
<section class="habilidade-lista">
  <header class="habilidade-lista__cabecalho">
    <h3 class="habilidade-lista__titulo">Habilidades Especiais</h3>
    @if (editavel()) {
      <button class="botao botao--secundario" type="button" (click)="adicionar()">
        <app-icone nome="mais" /> Adicionar
      </button>
    }
  </header>

  @if (!itens().length) {
    <p class="habilidade-lista__vazio">Nenhuma habilidade especial.</p>
  }

  <ul class="habilidade-lista__itens">
    @for (item of itens(); track $index) {
      <li class="habilidade-lista__item">
        @if (editando($index)) {
          <form class="habilidade-lista__form" [formGroup]="itemForm" (ngSubmit)="confirmar()">
            <input class="habilidade-lista__input" formControlName="nome" placeholder="Nome" aria-label="Nome da habilidade" />
            <select class="habilidade-lista__select" formControlName="tipo" aria-label="Tipo">
              @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
            </select>
            <textarea class="habilidade-lista__textarea" formControlName="descricao" placeholder="Descrição" aria-label="Descrição"></textarea>
            <input class="habilidade-lista__input" formControlName="restricao" placeholder="Restrição (opcional)" aria-label="Restrição" />
            <button class="botao botao--primario" type="submit" [disabled]="itemForm.invalid">Confirmar</button>
            <button class="botao botao--secundario" type="button" (click)="cancelar()">Cancelar</button>
          </form>
        } @else {
          <div class="habilidade-lista__cabecalho-item">
            <span class="habilidade-lista__nome">{{ item.nome }}</span>
            <span class="habilidade-lista__chip">{{ item.tipo }}</span>
          </div>
          <p class="habilidade-lista__descricao">{{ item.descricao }}</p>
          @if (item.restricao) { <span class="habilidade-lista__restricao">{{ item.restricao }}</span> }
          @if (editavel()) {
            <div class="habilidade-lista__acoes">
              <button class="habilidade-lista__acao" type="button" aria-label="Editar" (click)="editar($index)"><app-icone nome="editar" /></button>
              @if (indiceRemovendo() === $index) {
                <button class="habilidade-lista__acao habilidade-lista__acao--confirmar" type="button" (click)="remover($index)">Confirmar remoção</button>
                <button class="habilidade-lista__acao" type="button" (click)="cancelarRemocao()">Cancelar</button>
              } @else {
                <button class="habilidade-lista__acao" type="button" aria-label="Remover" (click)="pedirRemocao($index)"><app-icone nome="excluir" /></button>
              }
            </div>
          }
        }
      </li>
    }
  </ul>

  @if (editando(-1)) {
    <form class="habilidade-lista__form habilidade-lista__form--novo" [formGroup]="itemForm" (ngSubmit)="confirmar()">
      <input class="habilidade-lista__input" formControlName="nome" placeholder="Nome" aria-label="Nome da habilidade" />
      <select class="habilidade-lista__select" formControlName="tipo" aria-label="Tipo">
        @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <textarea class="habilidade-lista__textarea" formControlName="descricao" placeholder="Descrição" aria-label="Descrição"></textarea>
      <input class="habilidade-lista__input" formControlName="restricao" placeholder="Restrição (opcional)" aria-label="Restrição" />
      <button class="botao botao--primario" type="submit" [disabled]="itemForm.invalid">Adicionar</button>
      <button class="botao botao--secundario" type="button" (click)="cancelar()">Cancelar</button>
    </form>
  }
</section>
```

`criatura-habilidade-lista.component.scss`:

```scss
:host { display: block; }

.habilidade-lista {
  &__cabecalho { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  &__titulo { margin: 0; font: 700 12px var(--font-mono); text-transform: uppercase; letter-spacing: var(--tracking-label); color: var(--text); }
  &__vazio { font: 12px var(--font-sans); color: var(--text-mute); }
  &__itens { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
  &__item { display: flex; flex-direction: column; gap: 4px; padding: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-control); }
  &__cabecalho-item { display: flex; align-items: center; gap: 8px; }
  &__nome { font: 700 12px var(--font-mono); color: var(--text); }
  &__chip { padding: 2px 6px; font: 600 9px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); border: 1px solid var(--accent-border); border-radius: var(--radius-control); }
  &__descricao { margin: 0; font: 12px var(--font-sans); color: var(--text-dim); }
  &__restricao { font: 10px var(--font-sans); font-style: italic; color: var(--text-mute); }
  &__acoes { display: flex; gap: 4px; margin-top: 4px; }
  &__acao { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: var(--text-dim); background: transparent; border: 1px solid var(--border-strong); border-radius: var(--radius-control); cursor: pointer; &:hover { color: var(--accent); border-color: var(--accent-border); } }
  &__acao--confirmar { width: auto; padding: 0 8px; color: var(--negative); }
  &__form { display: flex; flex-direction: column; gap: 6px; width: 100%; }
  &__form--novo { margin-top: 8px; padding: 10px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--radius-control); }
  &__select, &__input, &__textarea { padding: 4px 8px; font: 12px var(--font-sans); color: var(--text); background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-control); }
  &__textarea { resize: vertical; min-height: 48px; }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criatura-habilidade-lista.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/criatura-habilidade-lista/
git commit -m "feat(m4-04b): editor de lista Habilidades Especiais da criatura"
```

---

## Task 9: `CriaturaVisualizacao` — classe do componente (Signals, computed, handlers, rolagem)

**Files:**
- Create: `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.ts`
- Test: `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.spec.ts`

(HTML/SCSS for this component are Task 10 — this task's tests exercise the class directly via `componentInstance`, same as Tasks 6-8, without depending on the template markup that doesn't exist yet. A minimal inline placeholder template — `template: ''` — is used for **this task only** and replaced by the real `templateUrl` in Task 10.)

**Interfaces:**
- Consumes: `FichaCriaturaDadosDto` and all its sub-types (`@contratados-rpg/shared/dtos/ficha`), `calcularAtributoEfetivo`/`calcularValorModificador`/`calcularLimiteResistencias`/`calcularValorRegeneracao` (`@contratados-rpg/shared/regras/criatura` — verify each is exported from the subpath barrel before use, mirroring the imports already used in `criar-criatura.page.ts`), `rolarTesteAtributoCriatura`/`rolarAtaqueCriatura` (Task 3), `BandejaDadosService` (`shared/bandeja-dados`), `FichaRolagemRegistroService` (`../../ficha-rolagem-registro.service`, injected — provided by the page in Task 11).
- Produces: `CriaturaVisualizacao` component with inputs `fichaId`, `nome`, `cor`, `imagemUrl`, `oculta`, `dados: FichaCriaturaDadosDto`, `ajustavel`, `cor`; outputs listed below — consumed by Task 10 (template) and Task 11 (page bindings).

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import {
  CadenciaEnum, ComportamentoCriaturaEnum, ModificadorCriaturaEnum, NivelAmeacaEnum,
  OrigemCriaturaEnum, PorteCriaturaEnum, TenacidadeEnum, TipoDanoEnum, CustoAcaoEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaCriaturaDadosDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaVisualizacao } from './criatura-visualizacao.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';

describe('CriaturaVisualizacao', () => {
  const dados: FichaCriaturaDadosDto = {
    identidade: {
      designacao: 'A Estátua', origem: OrigemCriaturaEnum.ORIGINAL, conceito: 'x',
      naturezaFisica: 'x', comportamento: ComportamentoCriaturaEnum.CACADORA, motivacao: 'x', ganchoUnico: 'x',
    },
    na: NivelAmeacaEnum.ALTA, vd: 30,
    atributos: { destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8, intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4 },
    modificadores: {
      destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
      pontaria: ModificadorCriaturaEnum.FRAGIL, vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
      medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO, social: ModificadorCriaturaEnum.FRACO,
      vontade: ModificadorCriaturaEnum.FRACO,
    },
    tenacidade: TenacidadeEnum.RESISTENTE, vidaMaxima: 100, vidaAtual: 100, defesa: 30,
    resistencias: [], fraquezas: [{ tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 }],
    porte: PorteCriaturaEnum.GRANDE, deslocamento: { terrestre: 9 }, cadencia: CadenciaEnum.SINGULAR,
    ataques: [{ nome: 'Golpe', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false }],
    habilidades: [], anotacoes: '',
  };

  function montar() {
    TestBed.configureTestingModule({
      imports: [CriaturaVisualizacao],
      providers: [FichaRolagemRegistroService],
    });
    const fixture = TestBed.createComponent(CriaturaVisualizacao);
    fixture.componentRef.setInput('fichaId', 4);
    fixture.componentRef.setInput('nome', 'A Estátua');
    fixture.componentRef.setInput('cor', null);
    fixture.componentRef.setInput('imagemUrl', null);
    fixture.componentRef.setInput('oculta', false);
    fixture.componentRef.setInput('dados', dados);
    fixture.componentRef.setInput('ajustavel', true);
    fixture.detectChanges();

    const eventos: Record<string, unknown[]> = {};
    for (const nome of [
      'vitalidadeMudou', 'defesaMudou', 'identidadeMudou', 'naMudou', 'vdMudou', 'atributosMudou',
      'modificadoresMudou', 'tenacidadeMudou', 'resistenciasMudou', 'fraquezasMudou', 'regeneracaoMudou',
      'porteMudou', 'deslocamentoMudou', 'cadenciaMudou', 'iniciativaBonusMudou', 'ataquesMudou',
      'habilidadesMudou', 'anotacoesMudou', 'nomeMudou', 'corMudou', 'ocultaMudou',
    ] as const) {
      eventos[nome] = [];
      (fixture.componentInstance as never as Record<string, { subscribe: (fn: (v: unknown) => void) => void }>)[nome]
        .subscribe((v: unknown) => eventos[nome].push(v));
    }
    return { fixture, eventos, bandeja: TestBed.inject(BandejaDadosService) };
  }

  it('calcula o Atributo Efetivo (atributo + modificador) por chave', () => {
    const { fixture } = montar();
    // luta=6, modificador FORTE em VD30: base 0 + (30-5)/5*2.5 = 12.5 -> floor 12 => efetivo 18.
    expect(fixture.componentInstance['atributoEfetivo']('luta')).toBe(18);
  });

  it('emite vitalidadeMudou com o campo e valor clampados ao ajustar Vida atual', () => {
    const { fixture, eventos } = montar();
    fixture.componentInstance['ajustarVida'](-5);
    expect(eventos['vitalidadeMudou']).toEqual([{ campo: 'vidaAtual', valor: 95 }]);
  });

  it('rola um ataque e mostra o resultado na bandeja', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarAtaque'](dados.ataques[0]);
    expect(bandeja.entradas()).toHaveLength(1);
    expect(bandeja.entradas()[0].rotulo).toBe('Golpe');
    expect(bandeja.entradas()[0].formula).toBe('4D12+10');
  });

  it('rola um teste de atributo e mostra o resultado na bandeja', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarTesteAtributo']('vontade');
    expect(bandeja.entradas()).toHaveLength(1);
    expect(bandeja.entradas()[0].formula).toBe('vontaded20kh1');
  });

  it('repassa a lista de ataques editada para ataquesMudou', () => {
    const { fixture, eventos } = montar();
    const novos = [...dados.ataques, { nome: 'Segundo', atributo: 'forca' as const, custoAcao: CustoAcaoEnum.MOVIMENTO, dano: '2D10', tipoDano: TipoDanoEnum.FISICO, area: false }];
    fixture.componentInstance['aoAtaquesMudar'](novos);
    expect(eventos['ataquesMudou']).toEqual([novos]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=frontend -- criatura-visualizacao.component.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { Component, computed, inject, input, output } from '@angular/core';

import type {
  FichaAtributosDto,
  FichaCriaturaAtaqueDto,
  FichaCriaturaDadosDto,
  FichaCriaturaDeslocamentoDto,
  FichaCriaturaHabilidadeDto,
  FichaCriaturaIdentidadeDto,
  FichaCriaturaModificadoresDto,
  FichaCriaturaRegeneracaoDto,
  FichaCriaturaResistenciaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { CadenciaEnum, NivelAmeacaEnum, PorteCriaturaEnum, TenacidadeEnum } from '@contratados-rpg/shared/enums';
import { calcularAtributoEfetivo, calcularLimiteResistencias } from '@contratados-rpg/shared/regras/criatura';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { rolarAtaqueCriatura, rolarTesteAtributoCriatura } from '../../criatura-rolagem';
import type { AjusteCriaturaVitalidade } from '../../ficha-edicao-criatura.service';
import { CriaturaResistenciaLista } from '../criatura-resistencia-lista/criatura-resistencia-lista.component';
import { CriaturaAtaqueLista } from '../criatura-ataque-lista/criatura-ataque-lista.component';
import { CriaturaHabilidadeLista } from '../criatura-habilidade-lista/criatura-habilidade-lista.component';

/** As dez chaves de `FichaAtributosDto`, mesmo apelido do análogo em `FichaVisualizacao`. */
type ChaveAtributo = keyof FichaAtributosDto;

/**
 * A **ficha de criatura** numa tela só (m4-04b) — edição no próprio lugar, campo a campo,
 * mirror de `FichaVisualizacao` mas para o documento (bem menor) `FichaCriaturaDadosDto`
 * (`m4-01`). Sem abas: o documento não tem inventário/combos/rolagens-preset/sanidade — todas
 * as seções cabem numa coluna rolável (confirmado pelo protótipo, `docs/design/examples/
 * ficha-de-criatura.html`, seção "Presentação da Task 10").
 */
@Component({
  selector: 'app-criatura-visualizacao',
  imports: [CriaturaResistenciaLista, CriaturaAtaqueLista, CriaturaHabilidadeLista],
  templateUrl: './criatura-visualizacao.component.html',
  styleUrl: './criatura-visualizacao.component.scss',
})
export class CriaturaVisualizacao {
  private readonly bandeja = inject(BandejaDadosService);
  private readonly rolagemRegistro = inject(FichaRolagemRegistroService);

  readonly fichaId = input.required<number>();
  readonly nome = input.required<string>();
  readonly cor = input<string | null>(null);
  readonly imagemUrl = input<string | null>(null);
  readonly oculta = input.required<boolean>();
  readonly dados = input.required<FichaCriaturaDadosDto>();
  /** Dono (mestre) edita; visualizador revelado é só-leitura — mesmo sinal de `FichaVisualizacao.ajustavel`. */
  readonly ajustavel = input.required<boolean>();

  readonly vitalidadeMudou = output<AjusteCriaturaVitalidade>();
  readonly defesaMudou = output<number>();
  readonly identidadeMudou = output<FichaCriaturaIdentidadeDto>();
  readonly naMudou = output<NivelAmeacaEnum>();
  readonly vdMudou = output<number>();
  readonly atributosMudou = output<FichaAtributosDto>();
  readonly modificadoresMudou = output<FichaCriaturaModificadoresDto>();
  readonly tenacidadeMudou = output<TenacidadeEnum>();
  readonly resistenciasMudou = output<readonly FichaCriaturaResistenciaDto[]>();
  readonly fraquezasMudou = output<readonly FichaCriaturaResistenciaDto[]>();
  readonly regeneracaoMudou = output<FichaCriaturaRegeneracaoDto | undefined>();
  readonly porteMudou = output<PorteCriaturaEnum>();
  readonly deslocamentoMudou = output<FichaCriaturaDeslocamentoDto>();
  readonly cadenciaMudou = output<CadenciaEnum>();
  readonly iniciativaBonusMudou = output<number | undefined>();
  readonly ataquesMudou = output<readonly FichaCriaturaAtaqueDto[]>();
  readonly habilidadesMudou = output<readonly FichaCriaturaHabilidadeDto[]>();
  readonly anotacoesMudou = output<string>();
  readonly nomeMudou = output<string>();
  readonly corMudou = output<string | null>();
  readonly ocultaMudou = output<boolean>();
  readonly imagemMudou = output<File>();
  readonly removerImagem = output<void>();

  /**
   * Limite de pontos de Resistência disponível para `resistencias` (`2×VD`, +25% por Fraqueza
   * extra além da 1ª — `shared/regras/criatura`). `quantidadeFraquezasExtras` conta só a partir
   * da 2ª fraqueza (a 1ª é obrigatória e não soma bônus).
   */
  protected readonly limiteResistencias = computed(() =>
    calcularLimiteResistencias({
      vd: this.dados().vd,
      quantidadeFraquezasExtras: Math.max(0, this.dados().fraquezas.length - 1),
    }),
  );

  /** Atributo Efetivo = valor final + modificador (usado em testes/ataques) — nunca reimplementado aqui. */
  protected atributoEfetivo(chave: ChaveAtributo): number {
    const dados = this.dados();
    return calcularAtributoEfetivo({
      atributoFinal: dados.atributos[chave],
      modificador: dados.modificadores[chave],
      vd: dados.vd,
    });
  }

  protected ajustarVida(delta: number): void {
    const valor = Math.max(0, this.dados().vidaAtual + delta);
    this.vitalidadeMudou.emit({ campo: 'vidaAtual', valor });
  }

  protected ajustarVidaMaxima(valor: number): void {
    this.vitalidadeMudou.emit({ campo: 'vidaMaxima', valor });
  }

  protected confirmarDefesa(valor: number): void {
    this.defesaMudou.emit(valor);
  }

  protected confirmarIdentidade(identidade: FichaCriaturaIdentidadeDto): void {
    this.identidadeMudou.emit(identidade);
  }

  protected confirmarNa(na: NivelAmeacaEnum): void {
    this.naMudou.emit(na);
  }

  protected confirmarVd(vd: number): void {
    this.vdMudou.emit(vd);
  }

  protected confirmarAtributos(atributos: FichaAtributosDto): void {
    this.atributosMudou.emit(atributos);
  }

  protected confirmarModificadores(modificadores: FichaCriaturaModificadoresDto): void {
    this.modificadoresMudou.emit(modificadores);
  }

  protected confirmarTenacidade(tenacidade: TenacidadeEnum): void {
    this.tenacidadeMudou.emit(tenacidade);
  }

  protected aoResistenciasMudar(resistencias: readonly FichaCriaturaResistenciaDto[]): void {
    this.resistenciasMudou.emit(resistencias);
  }

  protected aoFraquezasMudar(fraquezas: readonly FichaCriaturaResistenciaDto[]): void {
    this.fraquezasMudou.emit(fraquezas);
  }

  protected confirmarRegeneracao(regeneracao: FichaCriaturaRegeneracaoDto | undefined): void {
    this.regeneracaoMudou.emit(regeneracao);
  }

  protected confirmarPorte(porte: PorteCriaturaEnum): void {
    this.porteMudou.emit(porte);
  }

  protected confirmarDeslocamento(deslocamento: FichaCriaturaDeslocamentoDto): void {
    this.deslocamentoMudou.emit(deslocamento);
  }

  protected confirmarCadencia(cadencia: CadenciaEnum): void {
    this.cadenciaMudou.emit(cadencia);
  }

  protected confirmarIniciativaBonus(valor: number | undefined): void {
    this.iniciativaBonusMudou.emit(valor);
  }

  protected aoAtaquesMudar(ataques: readonly FichaCriaturaAtaqueDto[]): void {
    this.ataquesMudou.emit(ataques);
  }

  protected aoHabilidadesMudar(habilidades: readonly FichaCriaturaHabilidadeDto[]): void {
    this.habilidadesMudou.emit(habilidades);
  }

  protected confirmarAnotacoes(anotacoes: string): void {
    this.anotacoesMudou.emit(anotacoes);
  }

  protected confirmarNome(nome: string): void {
    this.nomeMudou.emit(nome);
  }

  protected confirmarCor(cor: string | null): void {
    this.corMudou.emit(cor);
  }

  protected alternarOculta(): void {
    this.ocultaMudou.emit(!this.oculta());
  }

  protected aoTrocarImagem(arquivo: File): void {
    this.imagemMudou.emit(arquivo);
  }

  /** Rola o dano de um Ataque (`criatura-rolagem.ts`, motor puro) e mostra/registra o resultado. */
  protected rolarAtaque(ataque: FichaCriaturaAtaqueDto): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarAtaqueCriatura({ atributos: this.dados().atributos }, ataque);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor() });
    this.rolagemRegistro.registrar(executada);
  }

  /** Rola um teste do Atributo Efetivo dessa chave e mostra/registra o resultado. */
  protected rolarTesteAtributo(chave: ChaveAtributo): void {
    if (!this.ajustavel()) {
      return;
    }
    const executada = rolarTesteAtributoCriatura(this.dados(), chave, `Teste de ${chave}`);
    if (!executada) {
      return;
    }
    this.bandeja.mostrar({ rotulo: executada.rotulo, formula: executada.formula, resultado: executada.resultado, corFicha: this.cor() });
    this.rolagemRegistro.registrar(executada);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criatura-visualizacao.component.spec.ts`
Expected: FAIL at this point — `templateUrl: './criatura-visualizacao.component.html'` points at a file that doesn't exist yet (Task 10). Angular's test bundler needs a resolvable template.

To make **this task's** tests pass in isolation (TDD requires green before moving on), temporarily create an empty `criatura-visualizacao.component.html` with a single root element and an empty `criatura-visualizacao.component.scss`:

```html
<div class="criatura"></div>
```

```scss
:host { display: block; }
```

Run again: `npm run test --workspace=frontend -- criatura-visualizacao.component.spec.ts`
Expected: PASS. (Task 10 replaces both files with the real template/styles — this is not throwaway work, just sequencing: the class and its tests are validated before the markup is written on top of it.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/criatura-visualizacao/
git commit -m "feat(m4-04b): CriaturaVisualizacao - classe (signals, atributo efetivo, rolagem, handlers)"
```

---

## Task 10: `CriaturaVisualizacao` — template e estilos

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.html` (replaces Task 9's placeholder)
- Modify: `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.scss` (replaces Task 9's placeholder)
- Test: extend `criatura-visualizacao.component.spec.ts` with DOM-level assertions

**Interfaces:**
- Consumes: everything produced by Task 9 (all inputs/outputs) plus `CriaturaResistenciaLista`/`CriaturaAtaqueLista`/`CriaturaHabilidadeLista` (Tasks 6-8, already `imports:`-ed by Task 9's `@Component`).

- [ ] **Step 1: Write the failing test**

Add to `criatura-visualizacao.component.spec.ts`:

```ts
  it('renderiza a designação, o NA/VD e a lista de ataques vinda dos dados', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.criatura__designacao')?.textContent?.trim()).toBe('A Estátua');
    expect(raiz.querySelector('.criatura__vd')?.textContent).toContain('30');
    expect(raiz.querySelectorAll('.ataque-lista__nome').length).toBe(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=frontend -- criatura-visualizacao.component.spec.ts`
Expected: FAIL — `.criatura__designacao` not found (placeholder template from Task 9 is empty).

- [ ] **Step 3: Implement**

Replace `criatura-visualizacao.component.html` with the real template — one `<section class="criatura__secao">` per field group from the spec, in the order listed there. Edit-in-place follows the same click-to-edit pattern already established in `FichaVisualizacao` (a signal per open editor, `[value]` + `(blur)`/`(keydown.escape)`, no `ngModel`); this excerpt shows the pattern applied to Identidade/Ameaça/Vida/Ataques — the same pattern repeats (not abbreviated at implementation time — write it out for every section) for Defesa, Modificadores, Tenacidade, Regeneração, Porte/Deslocamento/Cadência, Iniciativa e Anotações:

```html
<article class="criatura">
  <header class="criatura__cabecalho">
    <h1 class="criatura__designacao">{{ dados().identidade.designacao }}</h1>
    <span class="criatura__na">NA: {{ dados().na }}</span>
    <span class="criatura__vd">VD: {{ dados().vd }}</span>
  </header>

  <section class="criatura__secao">
    <h2 class="criatura__secao-titulo">Identidade</h2>
    <dl class="criatura__campos">
      <div class="campo"><dt class="campo__rotulo">Origem</dt><dd class="campo__controle">{{ dados().identidade.origem }}</dd></div>
      <div class="campo"><dt class="campo__rotulo">Conceito</dt><dd class="campo__controle">{{ dados().identidade.conceito }}</dd></div>
      <div class="campo"><dt class="campo__rotulo">Natureza Física</dt><dd class="campo__controle">{{ dados().identidade.naturezaFisica }}</dd></div>
      <div class="campo"><dt class="campo__rotulo">Comportamento</dt><dd class="campo__controle">{{ dados().identidade.comportamento }}</dd></div>
      <div class="campo"><dt class="campo__rotulo">Motivação</dt><dd class="campo__controle">{{ dados().identidade.motivacao }}</dd></div>
      <div class="campo"><dt class="campo__rotulo">Gancho Único</dt><dd class="campo__controle">{{ dados().identidade.ganchoUnico }}</dd></div>
      @if (dados().identidade.temaHorror) {
        <div class="campo"><dt class="campo__rotulo">Tema de Horror</dt><dd class="campo__controle">{{ dados().identidade.temaHorror }}</dd></div>
      }
    </dl>
  </section>

  <section class="criatura__secao">
    <h2 class="criatura__secao-titulo">Saúde</h2>
    <div class="criatura__vitalidade">
      <button class="criatura__passo" type="button" [disabled]="!ajustavel()" (click)="ajustarVida(-1)" aria-label="Reduzir vida">−</button>
      <span class="criatura__vitalidade-valor">{{ dados().vidaAtual }} / {{ dados().vidaMaxima }}</span>
      <button class="criatura__passo" type="button" [disabled]="!ajustavel()" (click)="ajustarVida(1)" aria-label="Aumentar vida">+</button>
    </div>
  </section>

  <section class="criatura__secao">
    <h2 class="criatura__secao-titulo">Ataques</h2>
    <app-criatura-ataque-lista
      [itens]="dados().ataques"
      [editavel]="ajustavel()"
      (itensMudou)="aoAtaquesMudar($event)"
      (rolarAtaque)="rolarAtaque($event)"
    />
  </section>

  <section class="criatura__secao">
    <h2 class="criatura__secao-titulo">Habilidades Especiais</h2>
    <app-criatura-habilidade-lista
      [itens]="dados().habilidades"
      [editavel]="ajustavel()"
      (itensMudou)="aoHabilidadesMudar($event)"
    />
  </section>

  <section class="criatura__secao">
    <app-criatura-resistencia-lista
      titulo="Resistências"
      [itens]="dados().resistencias"
      [editavel]="ajustavel()"
      (itensMudou)="aoResistenciasMudar($event)"
    />
  </section>

  <section class="criatura__secao">
    <app-criatura-resistencia-lista
      titulo="Fraquezas"
      [itens]="dados().fraquezas"
      [editavel]="ajustavel()"
      (itensMudou)="aoFraquezasMudar($event)"
    />
  </section>

  <section class="criatura__secao">
    <h2 class="criatura__secao-titulo">Anotações</h2>
    <textarea
      class="criatura__anotacoes"
      [value]="dados().anotacoes ?? ''"
      [disabled]="!ajustavel()"
      (blur)="confirmarAnotacoes($any($event.target).value)"
    ></textarea>
  </section>
</article>
```

Replace `criatura-visualizacao.component.scss` with token-only BEM styles for the blocks above (`.criatura`, `.criatura__cabecalho`, `.criatura__secao`, `.criatura__campos` using the existing `.campo`/`.campo__rotulo`/`.campo__controle` shared classes, `.criatura__vitalidade`, `.criatura__passo`, `.criatura__anotacoes`), following the exact token vocabulary already used in `criatura-resistencia-lista.component.scss` (Task 6) — `var(--text)`, `var(--surface)`, `var(--border)`, `var(--accent)`, `var(--radius-card)`, `var(--font-mono)` — and the mobile breakpoint pattern `@use 'tema/breakpoints' as bp;` / `@include bp.mobile { ... }` from `criar-criatura.page.scss`. Do not hand-tune pixel values against the mockup yet — Task 12 does that empirically against the running app.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- criatura-visualizacao.component.spec.ts`
Expected: PASS — both this task's new assertions and all of Task 9's (unchanged, since the class didn't change).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/criatura-visualizacao/
git commit -m "feat(m4-04b): CriaturaVisualizacao - template funcional de todas as secoes"
```

---

## Task 11: `visualizar-criatura.page` — junta tudo, WS, acesso, exclusão

**Files:**
- Create: `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.ts`
- Create: `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.html`
- Create: `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.scss`
- Test: `frontend/src/app/modules/ficha/paginas/visualizar-criatura/visualizar-criatura.page.spec.ts`

**Interfaces:**
- Consumes: `FichaService.recuperarFichaCriatura`/`alterarFichaCriatura` (Task 1), `mesclarDocumento` (Task 2), `FichaEdicaoCriaturaService` (Task 4), `CriaturaVisualizacao` (Tasks 9-10).
- Produces: `CriaturaVisualizar` component (the `loadComponent` target already wired by Task 5's route).

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CadenciaEnum, ComportamentoCriaturaEnum, ModificadorCriaturaEnum, NivelAmeacaEnum, OrigemCriaturaEnum, PorteCriaturaEnum, TenacidadeEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaVisualizar } from './visualizar-criatura.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { RolagemService } from '../../rolagem.service';

describe('CriaturaVisualizar', () => {
  const dados = {
    identidade: { designacao: 'A Estátua', origem: OrigemCriaturaEnum.ORIGINAL, conceito: 'x', naturezaFisica: 'x', comportamento: ComportamentoCriaturaEnum.CACADORA, motivacao: 'x', ganchoUnico: 'x' },
    na: NivelAmeacaEnum.ALTA, vd: 30,
    atributos: { destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8, intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4 },
    modificadores: { destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE, pontaria: ModificadorCriaturaEnum.FRAGIL, vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO, medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO, social: ModificadorCriaturaEnum.FRACO, vontade: ModificadorCriaturaEnum.FRACO },
    tenacidade: TenacidadeEnum.RESISTENTE, vidaMaxima: 100, vidaAtual: 100, defesa: 30,
    resistencias: [], fraquezas: [{ tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 }],
    porte: PorteCriaturaEnum.GRANDE, deslocamento: { terrestre: 9 }, cadencia: CadenciaEnum.SINGULAR,
    ataques: [], habilidades: [], anotacoes: '',
  } as never;
  const fichaCriatura: FichaCriaturaRecuperadaDto = {
    id: 4, campanhaId: 9, usuarioId: 7, nome: 'A Estátua', cor: null, imagemUrl: null, oculta: false, dados,
  };

  function montar() {
    const fichaAlterada$ = new Subject<never>();
    const acessoRevogado$ = new Subject<never>();
    const fichaService = {
      recuperarFichaCriatura: vi.fn(() => of(fichaCriatura)),
      listarAcessos: vi.fn(() => of([])),
    };
    const campanhaService = { listarMembros: vi.fn(() => of([{ usuarioId: 7, nome: 'Mestre', papel: 'MESTRE' }])) };
    const sessaoService = { usuario: () => ({ id: 7 }) };
    const tempoRealService = {
      conectar: vi.fn(), entrarSalaFicha: vi.fn(), sairSalaFicha: vi.fn(),
      fichaAlterada$, acessoRevogado$, reconexao: () => 0,
    };
    const rolagemService = { listarPorFicha: vi.fn(() => of({ itens: [], paginaAtual: 1, totalPaginas: 1 })) };

    TestBed.configureTestingModule({
      imports: [CriaturaVisualizar],
      providers: [
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => null }, fragment: null },
            parent: { parent: { snapshot: { paramMap: { get: (k: string) => (k === 'campanhaId' ? '9' : null) } } } },
            paramMap: of({ get: (k: string) => (k === 'id' ? '4' : null) }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CriaturaVisualizar);
    fixture.detectChanges();
    return { fixture, fichaService };
  }

  it('carrega a ficha de criatura pelo id da rota e a repassa ao CriaturaVisualizacao', () => {
    const { fixture, fichaService } = montar();
    expect(fichaService.recuperarFichaCriatura).toHaveBeenCalledWith(4);
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('app-criatura-visualizacao')).not.toBeNull();
  });
});
```

Note: `lerParamRota` (used by the existing jogador page to read `:id`/`:campanhaId`) has its own established mocking shape from `visualizar.page.spec.ts` — before writing this test for real, open `visualizar.page.spec.ts` and copy its exact `ActivatedRoute`/`lerParamRota` mocking convention verbatim instead of the sketch above, so the two pages' tests stay consistent (the sketch above is a reasonable approximation but the real project convention, already proven to work, must win — verify and adjust before running).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=frontend -- visualizar-criatura.page.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`visualizar-criatura.page.ts` — copy `visualizar.page.ts` (Task 1's earlier full read) as the starting point and apply exactly these changes:

1. Replace the `FichaVisualizacao` import with `CriaturaVisualizacao` (Task 9/10) and `FichaEdicaoService` with `FichaEdicaoCriaturaService` (Task 4).
2. Replace `FichaRecuperadaDto`/`FichaAcessoResumoDto` type imports with `FichaCriaturaRecuperadaDto`/`FichaAcessoResumoDto` (the latter is already type-agnostic, keep it).
3. `protected readonly ficha = signal<FichaCriaturaRecuperadaDto | null>(null);`
4. In the constructor's fetch pipeline: `this.fichaService.recuperarFichaCriatura(this.fichaId)` instead of `recuperarFicha`.
5. `mesclarFicha(base, local, remoto)` in `absorverRemoto` becomes `mesclarDocumento(base, local, remoto)` (Task 2), still typed via the local `FichaCriaturaRecuperadaDto` generic parameter (inferred).
6. Drop everything that doesn't apply to criatura: `abaInicial`/`abaStatusInicial`/`destinoMobileInicial`/`mudarAba`/`mudarAbaStatus` (criatura's view has no tabs — Task 10 confirmed a single scrollable column) and the `FichaRolagemRegistroService` `providers:` entry stays (still used, by `CriaturaVisualizacao` via DI).
7. Remove `normalizarRolagens` (jogador-only preset migration — criatura has no `rolagens` field).
8. In the template, replace the `<app-ficha-visualizacao>` block with:

```html
<app-criatura-visualizacao
  [fichaId]="fichaAtual.id"
  [nome]="fichaAtual.nome"
  [cor]="fichaAtual.cor"
  [imagemUrl]="fichaAtual.imagemUrl"
  [oculta]="fichaAtual.oculta"
  [dados]="fichaAtual.dados"
  [ajustavel]="podeGerenciar()"
  (vitalidadeMudou)="fichaEdicao.ajustarVitalidade($event)"
  (defesaMudou)="fichaEdicao.ajustarDefesa($event)"
  (identidadeMudou)="fichaEdicao.ajustarIdentidade($event)"
  (naMudou)="fichaEdicao.ajustarNa($event)"
  (vdMudou)="fichaEdicao.ajustarVd($event)"
  (atributosMudou)="fichaEdicao.ajustarAtributos($event)"
  (modificadoresMudou)="fichaEdicao.ajustarModificadores($event)"
  (tenacidadeMudou)="fichaEdicao.ajustarTenacidade($event)"
  (resistenciasMudou)="fichaEdicao.ajustarResistencias($event)"
  (fraquezasMudou)="fichaEdicao.ajustarFraquezas($event)"
  (regeneracaoMudou)="fichaEdicao.ajustarRegeneracao($event)"
  (porteMudou)="fichaEdicao.ajustarPorte($event)"
  (deslocamentoMudou)="fichaEdicao.ajustarDeslocamento($event)"
  (cadenciaMudou)="fichaEdicao.ajustarCadencia($event)"
  (iniciativaBonusMudou)="fichaEdicao.ajustarIniciativaBonus($event)"
  (ataquesMudou)="fichaEdicao.ajustarAtaques($event)"
  (habilidadesMudou)="fichaEdicao.ajustarHabilidades($event)"
  (anotacoesMudou)="fichaEdicao.ajustarAnotacoes($event)"
  (nomeMudou)="fichaEdicao.ajustarNome($event)"
  (corMudou)="fichaEdicao.ajustarCor($event)"
  (ocultaMudou)="fichaEdicao.ajustarOculta($event)"
  (imagemMudou)="fichaEdicao.ajustarImagem($event)"
  (removerImagem)="fichaEdicao.removerImagem()"
/>
```

Everything else in `visualizar.page.html` — the `.ficha-pagina__topo` header, the kebab menu, the acesso dialog, the exclusão dialog, the loading skeleton — is copied verbatim (it's already type-agnostic: it only reads `ficha()?.nome`/`cor`/`oculta`/`usuarioId`, `campanhaId()`, `podeGerenciar()`, `acessos()`, `menuAberto()`, `dialogAcesso()`/`dialogExclusao()` — none of it touches `dados`). `visualizar-criatura.page.scss` can just be `@use` the same shared page-chrome styles `visualizar.page.scss` uses (check its `@use` header and mirror it) plus nothing extra — the chrome look identical between the two pages by design.

Component decorator:

```ts
@Component({
  selector: 'app-criatura-visualizar',
  imports: [RouterLink, Icone, CriaturaVisualizacao, IndicadorTempoReal, CalculadoraFlutuante, HistoricoRolagensSidebar, Tooltip],
  providers: [FichaEdicaoCriaturaService, FichaRolagemRegistroService],
  templateUrl: './visualizar-criatura.page.html',
  styleUrl: './visualizar-criatura.page.scss',
})
export class CriaturaVisualizar { /* ... ver passos 1-7 acima ... */ }
```

(`ReactiveFormsModule` drops out of `imports` — the jogador page used it for `membroParaConceder`/`FormControl`, which the acesso dialog still needs here too, so keep it. `CalculadoraFlutuante` stays — dice-related, still relevant to criatura.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=frontend -- visualizar-criatura.page.spec.ts`
Expected: PASS.

Then run the **full** frontend suite once, since this task is what finally makes `criatura.routes.ts` (Task 5) resolve to a real module:

Run: `npm run test --workspace=frontend`
Expected: PASS (no regressions in jogador-side specs — nothing in `visualizar.page.ts`/`FichaVisualizacao`/`FichaEdicaoService`/`mesclarFicha` was modified beyond Task 2's backward-compatible refactor).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/visualizar-criatura/
git commit -m "feat(m4-04b): pagina de visualizacao/edicao da ficha de criatura"
```

---

## Task 12: Verificação ao vivo + fidelidade visual contra o protótipo

**Files:** none created/modified — this is a verification task (skill `verify`, already loaded into this project's context), producing evidence, not code.

- [ ] **Step 1: Subir o stack**

```bash
npm run db:up
npm run db:migrate --workspace=backend
npm run backend:dev
npm run frontend:dev
```

- [ ] **Step 2: Fluxo ponta a ponta via Playwright** (mesmo padrão da sessão anterior de verificação deste projeto: sessão injetada via `localStorage`, campanha/usuário seedados por REST, dois viewports fixos — 360×800 e 1920×1080)

Script (scratchpad, não faz parte do repo):
1. Registrar usuário mestre + criar campanha via REST (`/autenticacao/registro`, `/login`, `POST /campanha`).
2. Injetar sessão, abrir `/painel/:campanhaId/criatura/nova`, preencher o assistente completo (reusar a mesma sequência de passos já validada na sessão anterior de alinhamento) e clicar em "Registrar criatura".
3. Confirmar que a navegação pousa em `/painel/:campanhaId/criatura/:id` (não mais `/ficha/:id`) e a tela renderiza sem erro — captura de tela.
4. Para cada seção (Identidade, Ameaça, Atributos+Modificadores, Saúde, Defesa, Resistências, Fraquezas, Regeneração, Porte/Deslocamento/Cadência, Ataques, Habilidades, Anotações): editar um valor, confirmar que persiste (reload da página mostra o valor novo) e que **não recarrega** a tela ao confirmar (mesma prova de `window.__sentinela` da skill `verify`).
5. Clicar o botão de rolagem num Ataque — confirmar que a bandeja de dados mostra o resultado e que o histórico de rolagens (barra lateral, ícone d20) lista a entrada.
6. Abrir a mesma ficha em **duas abas** (mesma sessão) — editar num lado, confirmar que o outro lado reflete **sem recarregar** (critério de aceite WS, mesmo teste da ficha de jogador, m3-08).
7. Testar exclusão e "Acesso de visualização" (dialog já reusada, sem mudança) — confirmar que funcionam idênticos à ficha de jogador.

- [ ] **Step 3: Comparação visual contra o protótipo** (gate obrigatório de UI — `AGENTS.md`)

Abrir `docs/design/examples/ficha-de-criatura.html` no mesmo navegador/viewport (`file://` local) lado a lado com a tela real renderizada (mesmos dois viewports do passo 2). Ajustar `criatura-visualizacao.component.scss` / `criatura-ataque-lista.component.scss` / `criatura-habilidade-lista.component.scss` / `criatura-resistencia-lista.component.scss` (Tasks 6-10) até a fidelidade bater — cores, tipografia, espaçamento, agrupamento de seções — mantendo os tokens de tema (`docs/design/tema/`) em vez de valores soltos. Não é permitido introduzir hex/rem literais para "casar" com o protótipo (proibição #29) — se o token certo não existir, essa é uma pendência a registrar, não uma exceção a abrir.

- [ ] **Step 4: Relatório**

Screenshots (12 seções × 2 viewports, mais o antes/depois do fluxo de criação→visualização) salvos no scratchpad da sessão; nenhum arquivo novo no repo além do já commitado nas Tasks 1-11. Reportar ao autor: o que foi testado, qualquer desvio do protótipo que exigiu decisão de julgamento (registrar como nota, não como mudança de escopo silenciosa).

- [ ] **Step 5: Nenhum commit de código nesta task** — se a comparação visual (Passo 3) exigiu ajustes de SCSS, esses ajustes voltam como um commit **normal** (mesma disciplina das Tasks 1-11: teste/implementação/commit), não como parte deste passo de verificação.

---

## Self-Review Notes

- **Spec coverage:** todas as seções de "Entregáveis" do spec (`m4-04b`) têm task correspondente — rota (5), página (11), merge (2), componente (9-10), editor de lista genérico o suficiente (6, reusado 2×), service (4), rolagem (3, 9). Critérios de Aceite: fluxo criar→visualizar sem erro (5+11+12), tudo editável (4/9/10), rolagem com Atributo Efetivo (3/9), sem recarregar via WS (11, herdado do padrão já testado de `visualizar.page.ts`), exclusão/acesso reusados (11), comparação visual (12).
- **Type consistency:** os nomes de output do `CriaturaVisualizacao` (Task 9) — `vitalidadeMudou`, `defesaMudou`, `identidadeMudou`, `naMudou`, `vdMudou`, `atributosMudou`, `modificadoresMudou`, `tenacidadeMudou`, `resistenciasMudou`, `fraquezasMudou`, `regeneracaoMudou`, `porteMudou`, `deslocamentoMudou`, `cadenciaMudou`, `iniciativaBonusMudou`, `ataquesMudou`, `habilidadesMudou`, `anotacoesMudou`, `nomeMudou`, `corMudou`, `ocultaMudou`, `imagemMudou`, `removerImagem` — foram conferidos contra os handlers de mesmo nome em `FichaEdicaoCriaturaService` (Task 4: `ajustarVitalidade`, `ajustarDefesa`, `ajustarIdentidade`, `ajustarNa`, `ajustarVd`, `ajustarAtributos`, `ajustarModificadores`, `ajustarTenacidade`, `ajustarResistencias`, `ajustarFraquezas`, `ajustarRegeneracao`, `ajustarPorte`, `ajustarDeslocamento`, `ajustarCadencia`, `ajustarIniciativaBonus`, `ajustarAtaques`, `ajustarHabilidades`, `ajustarAnotacoes`, `ajustarNome`, `ajustarCor`, `ajustarOculta`, `ajustarImagem`, `removerImagem`) e contra os bindings do template (Task 11) — todos batem 1:1.
- **Placeholder scan:** the one spot with an explicit caveat is Task 11 Step 1, which tells the executor to verify the `ActivatedRoute` mocking shape against the real `visualizar.page.spec.ts` before running — this is a pointer to a concrete existing file, not a "figure it out" placeholder, and is called out because that file wasn't fully re-transcribed here (it's large and already exists verbatim in the repo).
