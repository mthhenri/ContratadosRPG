# Ajuste manual de dados por atributo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um terceiro ajuste manual por atributo — quantos **dados** ele rola em testes/rolagens — sem alterar o valor base do atributo (Energia, Deslocamento, Vida, Maestria continuam intocados).

**Architecture:** Novo campo opcional `dadosTeste` em `FichaJogadorDadosDto` (irmão de `modificadoresTeste`), somado ao atributo **efetivo** (pós-lesão) por uma nova função pura `calcularAtributosParaDados` em `shared/regras/agente/lesao.ts`. O resultado (`atributosParaDados`) substitui `atributosEfetivos` só nos pontos que **rolam dados** a partir do atributo (teste de atributo, presets/rolagem avulsa) — leitura de valor, DT e bake de lesão permanente continuam em `atributosEfetivos`, sem mudança. Editado no mesmo grupo de `AjusteAtributos` (junto de atributo/Maestria/modificador), com um quarto stepper no card de edição.

**Tech Stack:** Angular (signals/computed), TypeScript, Vitest — mesmo stack do resto do monorepo `shared`/`frontend`.

## Global Constraints

- Viewports fixos de verificação visual do projeto (skill `verify`): **mobile 360×800** (Galaxy S20 FE), **desktop 1920×1080** (FullHD) — únicos dois tamanhos usados, nunca a janela padrão do navegador.
- `dadosTeste` é **só manual** nesta entrega — nada em Lesões/Sequelas/Traumas/Condições o alimenta automaticamente.
- **Nenhuma mudança no motor de rolagem** (`shared/regras/rolagem`): a desvantagem intrínseca (atributo ≤ 0 → `2+|attr|`d20 kl1) já existe e continua disparando a partir do valor que `atributosParaDados` produzir.
- **Fora do alcance** (ficam em `atributosEfetivos`, sem o ajuste manual): `calcularDtAtributo` (DT é alvo derivado, não fonte de dados) e o bake de lesões permanentes em `ficha-edicao.service.ts` (`aplicarProgressao`).
- **Fora do alcance** (não consomem `FichaAtributosDto` de uma ficha persistida): `FichaInventario.rolarDanoItem`/`FichaVisualizacao.rolarDano` — as fórmulas de dano de arma/corpo (`calcularDanoCorpo`/`calcularStatItem`) são sempre notação de dado literal (`"2D6 [Físico]"`), nunca usam um atributo como fonte de dados; e a Calculadora standalone (`Descanso`) — recebe um valor de atributo digitado à mão no formulário, não a ficha, e não existe feature de "Iniciativa" no módulo `ficha`.
- Sem clamp/piso em `dadosTeste` — mesma liberdade dos steppers existentes (atributo, modificador).
- DTOs seguem o padrão do repositório: interfaces simples, sem `class-validator`.

---

## Consumidores confirmados de "atributo como fonte de dados" (o que muda de `atributosEfetivos` para `atributosParaDados`)

| Local | Arquivo | Uso |
|---|---|---|
| Teste de atributo (dadinho do card) | `ficha-visualizacao.component.ts` → `rolarTesteAtributo` | Monta `${campo.chave}d20kh1cm1 + PROF` e resolve o pool via o mapa de atributos passado a `rolarFormula`. |
| Presets/habilidades + rolagem avulsa | `ficha-rolagens-painel.component.html` → `[atributos]` de `FichaRolagens` | `FichaRolagens` passa esse mapa para `resolverPreset`/`rolarFormula`/`executarPassoPreset` — fórmulas de preset **podem** conter `ATRdM`/`(ATR±n)dM`. |

Tudo o mais que consome `atributos()`/`atributosEfetivos()` (leitura do valor na ficha, `dtAtributo`, `rolarDano`, `FichaInventario`) **não muda** — ver Global Constraints acima para o porquê de cada um.

---

### Task 1: Campo `dadosTeste` no DTO da ficha

**Files:**
- Modify: `shared/src/dtos/ficha/ficha.dtos.ts:422` (logo após o campo `modificadoresTeste`, dentro de `FichaJogadorDadosDto`)

**Interfaces:**
- Produces: `FichaJogadorDadosDto.dadosTeste?: Partial<Record<keyof FichaAtributosDto, number>>`

- [ ] **Step 1: Adicionar o campo com doc comment**

Em `shared/src/dtos/ficha/ficha.dtos.ts`, logo depois do bloco do campo `modificadoresTeste` (linha 422, `readonly modificadoresTeste?: Partial<Record<keyof FichaAtributosDto, number>>;`), adicionar:

```ts
  /**
   * Ajuste manual de quantos **dados** o atributo rola em testes/rolagens (distinto de
   * `modificadoresTeste`, que soma no **resultado**) — some ao atributo efetivo (lesão) só na
   * contagem de dados do pool, sem alterar o atributo base nem Energia/Deslocamento/Vida/Maestria.
   * Manual apenas — Lesões/Sequelas/Condições não o alimentam automaticamente. Sem piso: pode
   * zerar/negativar, disparando a desvantagem intrínseca já existente no motor de rolagem
   * (atributo ≤ 0 → rola `2+|attr|` dados e mantém o menor). **Opcional** por retrocompatibilidade
   * e parcial — atributo ausente cai em 0.
   */
  readonly dadosTeste?: Partial<Record<keyof FichaAtributosDto, number>>;
```

- [ ] **Step 2: Checar tipos do pacote `shared`**

Run: `npm run build --workspace=shared` (ou `npx tsc --noEmit -p shared` se o workspace não tiver script `build`)
Expected: sem erros — campo novo é opcional, não quebra nenhum consumidor existente.

- [ ] **Step 3: Commit**

```bash
git add shared/src/dtos/ficha/ficha.dtos.ts
git commit -m "Adicionar campo dadosTeste ao DTO da ficha (ajuste manual de dados por atributo)"
```

---

### Task 2: `calcularAtributosParaDados` (shared/regras/agente/lesao.ts)

**Files:**
- Modify: `shared/src/regras/agente/lesao.ts` (adicionar função nova, ao lado de `calcularAtributosEfetivos`)
- Modify: `shared/src/regras/agente/lesao.spec.ts` (novos casos)

**Interfaces:**
- Consumes: `calcularAtributosEfetivos(atributos, lesoes): FichaAtributosDto` (já existe, linha 42 de `lesao.ts`); `FichaAtributosDto`, `FichaLesaoDto` (`shared/src/dtos/ficha`).
- Produces: `calcularAtributosParaDados(atributos: FichaAtributosDto, lesoes: readonly FichaLesaoDto[], dadosTeste: Partial<Record<keyof FichaAtributosDto, number>>): FichaAtributosDto` — exportado via `shared/src/regras/agente/index.ts` (`export * from './lesao'`, sem mudança no barrel).

- [ ] **Step 1: Escrever os testes que falham primeiro**

Em `shared/src/regras/agente/lesao.spec.ts`, importar a função nova e adicionar um novo `describe` ao final do arquivo (depois do `describe('lesão → atributo efetivo', ...)` existente, mesmo nível):

```ts
import {
  calcularAtributoEfetivo,
  calcularAtributosEfetivos,
  calcularAtributosParaDados,
  somarLesoesAtributo,
} from './lesao';
```

```ts
describe('atributo para dados (lesão + ajuste manual)', () => {
  const base: FichaAtributosDto = {
    destreza: 2,
    forca: 6,
    luta: 2,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 2,
  };

  const lesao = (
    atributo: keyof FichaAtributosDto,
    pontos: number,
  ): FichaLesaoDto => ({ atributo, pontos, severidade: SeveridadeLesaoEnum.LEVE, permanente: false });

  it('soma o ajuste manual ao atributo efetivo (sem lesão = ajuste direto sobre o base)', () => {
    const paraDados = calcularAtributosParaDados(base, [], { destreza: 1, forca: -2 });
    expect(paraDados.destreza).toBe(3);
    expect(paraDados.forca).toBe(4);
    // Atributo sem entrada no ajuste → igual ao base (cai em 0).
    expect(paraDados.luta).toBe(2);
  });

  it('combina lesão (efetivo) com o ajuste manual', () => {
    // Força 6 base, −2 lesão → 4 efetivo, −1 manual → 3.
    const paraDados = calcularAtributosParaDados(base, [lesao('forca', 2)], { forca: -1 });
    expect(paraDados.forca).toBe(3);
  });

  it('sem piso — o ajuste manual pode negativar além do que a lesão já negativou', () => {
    // Força 6 base, −5 lesão → 1 efetivo, −3 manual → −2.
    const paraDados = calcularAtributosParaDados(base, [lesao('forca', 5)], { forca: -3 });
    expect(paraDados.forca).toBe(-2);
  });

  it('ajuste vazio devolve o mapa efetivo intacto e não muta o base', () => {
    const paraDados = calcularAtributosParaDados(base, [], {});
    expect(paraDados).toEqual(base);
    expect(base.forca).toBe(6);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run shared/src/regras/agente/lesao.spec.ts`
Expected: FAIL — `calcularAtributosParaDados` não existe ainda (erro de import/tipo).

- [ ] **Step 3: Implementar a função**

Em `shared/src/regras/agente/lesao.ts`, adicionar ao final do arquivo (depois de `calcularAtributosEfetivos`):

```ts
/**
 * Atributo efetivo (lesão) + ajuste manual de dados (`dadosTeste`, `FichaJogadorDadosDto`) — usado
 * **só** como contagem de dados de rolagem (teste de atributo, presets). Energia/Deslocamento/Vida/
 * Maestria continuam calculados sobre o atributo base, nunca sobre este mapa. Sem piso — pode
 * negativar além do que a lesão já negativou; atributo ausente em `dadosTeste` cai em 0 (sem ajuste).
 */
export function calcularAtributosParaDados(
  atributos: FichaAtributosDto,
  lesoes: readonly FichaLesaoDto[],
  dadosTeste: Partial<Record<keyof FichaAtributosDto, number>>,
): FichaAtributosDto {
  const efetivos = calcularAtributosEfetivos(atributos, lesoes);
  const paraDados = { ...efetivos };
  (Object.keys(paraDados) as (keyof FichaAtributosDto)[]).forEach((chave) => {
    paraDados[chave] = efetivos[chave] + (dadosTeste[chave] ?? 0);
  });
  return paraDados;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run shared/src/regras/agente/lesao.spec.ts`
Expected: PASS — todos os `describe` do arquivo, incluindo os 4 casos novos.

- [ ] **Step 5: Commit**

```bash
git add shared/src/regras/agente/lesao.ts shared/src/regras/agente/lesao.spec.ts
git commit -m "Adicionar calcularAtributosParaDados (lesao + ajuste manual de dados)"
```

---

### Task 3: Estado e lógica do componente (`FichaVisualizacao`)

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`

**Interfaces:**
- Consumes: `calcularAtributosParaDados` (Task 2, importado de `@contratados-rpg/shared/regras/agente`); `FichaJogadorDadosDto.dadosTeste` (Task 1).
- Produces: `AjusteAtributos.dadosTeste: Record<keyof FichaAtributosDto, number>` (campo novo na interface já exportada, linha 284); `protected readonly atributosParaDados: Signal<FichaAtributosDto>`; `protected readonly dadosTeste: Signal<Record<ChaveAtributo, number>>` (leitura); `protected dadosTesteDe(chave: ChaveAtributo): number`; `protected readonly rascunhoDadosTeste: WritableSignal<Record<ChaveAtributo, number> | null>`; `protected ajustarDadosTesteRascunho(chave: ChaveAtributo, delta: number): void`. Consumido por Task 4 (template) e Task 5 (`ficha-edicao.service.ts`).

- [ ] **Step 1: Escrever o teste que falha primeiro**

Em `ficha-visualizacao.component.spec.ts`, adicionar um teste logo depois do teste existente `'marca Maestria só em atributo com 6+ e emite atributos + maestria ao salvar (lógica, sem UI de Atributos na tela)'` (por volta da linha 709), mesmo estilo (chamada direta dos métodos protegidos via colchete, sem tocar no DOM):

```ts
  it('ajusta dados de teste de um atributo no rascunho e emite junto com o resto do grupo ao salvar', () => {
    const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
    const ajustes: { dadosTeste: Record<string, number> }[] = [];
    componente.ajusteAtributos.subscribe((a) => ajustes.push(a));

    componente['editarAtributos']();
    // Antes de qualquer ajuste, o rascunho completo nasce zerado (as 10 chaves).
    expect(componente['rascunhoDadosTeste']()!.destreza).toBe(0);

    componente['ajustarDadosTesteRascunho']('destreza', 1);
    componente['ajustarDadosTesteRascunho']('destreza', 1);
    componente['ajustarDadosTesteRascunho']('forca', -1);
    componente['confirmarAtributos']();

    expect(ajustes).toHaveLength(1);
    expect(ajustes[0].dadosTeste.destreza).toBe(2);
    expect(ajustes[0].dadosTeste.forca).toBe(-1);
    expect(ajustes[0].dadosTeste.luta).toBe(0);
  });

  it('lê o ajuste de dados de teste persistido fora da edição (dadosTesteDe)', () => {
    const documento = { ...dados, dadosTeste: { destreza: -1 } };
    const componente = montar(documento, 'Corvo', 42, true).fixture.componentInstance;

    expect(componente['dadosTesteDe']('destreza')).toBe(-1);
    expect(componente['dadosTesteDe']('forca')).toBe(0);
  });

  it('o teste de atributo rola com o ajuste manual de dados somado ao efetivo (sem mexer no atributo exibido)', () => {
    // Destreza base 2, sem lesão, ajuste manual +1 → pool de 3 dados no teste, mas o valor
    // exibido na ficha (atributosEfetivos) continua 2.
    const documento = { ...dados, dadosTeste: { destreza: 1 } };
    const componente = montar(documento, 'Corvo', 42, true).fixture.componentInstance;

    expect(componente['atributosEfetivos']().destreza).toBe(2);
    expect(componente['atributosParaDados']().destreza).toBe(3);
  });
```

O fixture `dados` (linha 34 do spec) tem `destreza: 2` — é o único valor absoluto que os testes acima dependem (no teste de `atributosParaDados`, `2 + 1 = 3`); os demais asserts são sobre o **delta** do ajuste (`dadosTeste.destreza`/`.forca`), não sobre o valor absoluto do atributo, então não dependem de `forca`. Ainda assim, usar `Read` no arquivo antes de finalizar para confirmar que o fixture não mudou.

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts -t "dados de teste"`
Expected: FAIL — `rascunhoDadosTeste`/`ajustarDadosTesteRascunho`/`dadosTesteDe`/`atributosParaDados` ainda não existem, e `AjusteAtributos` ainda não tem `dadosTeste`.

- [ ] **Step 3: Importar `calcularAtributosParaDados`**

Em `ficha-visualizacao.component.ts`, no bloco de import de `@contratados-rpg/shared/regras/agente` (linhas 35-49), adicionar `calcularAtributosParaDados` à lista (ordem alfabética, junto de `calcularAtributosEfetivos`):

```ts
import {
  MAESTRIA_PONTOS_MINIMO,
  ajusteEnergiaAmplificadores,
  ajusteVidaAmplificadores,
  calcularAtributosEfetivos,
  calcularAtributosParaDados,
  calcularEnergia,
  calcularInventario,
  calcularProficiencia,
  modificadoresTesteAmplificadores,
  montarResistencias,
  calcularVida,
  maestriaAtingivel,
  obterLimitesClasse,
  somarLesoesAtributo,
} from '@contratados-rpg/shared/regras/agente';
```

- [ ] **Step 4: Estender `AjusteAtributos`**

Na interface `AjusteAtributos` (linha 284-288), adicionar o campo novo e atualizar o doc comment:

```ts
/**
 * Edição em grupo dos atributos + Maestria + modificadores de teste + ajuste manual de dados — a
 * página persiste os quatro em `atributos`, `maestria`, `modificadoresTeste` e `dadosTeste`
 * (redesenho de comparação visual: os três ajustes só são editáveis junto, na mesma tela — não há
 * canal separado).
 */
export interface AjusteAtributos {
  readonly atributos: FichaAtributosDto;
  readonly maestria: keyof FichaAtributosDto | null;
  readonly modificadoresTeste: Record<keyof FichaAtributosDto, number>;
  readonly dadosTeste: Record<keyof FichaAtributosDto, number>;
}
```

- [ ] **Step 5: Computed de leitura (`dadosTeste`/`dadosTesteDe`/`atributosParaDados`)**

Logo depois do computed `modificadoresTeste` (linha 967, `protected readonly modificadoresTeste = computed(() => this.dados().modificadoresTeste ?? {});`), adicionar:

```ts
  /**
   * Ajuste manual de dados por atributo (ex.: sequela/condição reduzindo dados sem mexer no
   * atributo — hoje só editável manualmente aqui) — persistido em `dados.dadosTeste`.
   */
  protected readonly dadosTeste = computed(() => this.dados().dadosTeste ?? {});

  /** Ajuste manual de dados de um atributo, resolvido a 0 quando ausente. */
  protected dadosTesteDe(chave: ChaveAtributo): number {
    return this.dadosTeste()[chave] ?? 0;
  }
```

Logo depois do computed `atributosEfetivos` (linha 915-917), adicionar:

```ts
  /**
   * Atributos **para dados** = efetivo (lesão) + ajuste manual de `dadosTeste` — usado **só** como
   * contagem de dados de rolagem (`rolarTesteAtributo`, presets em `FichaRolagensPainel`). Energia/
   * Deslocamento/Vida/Maestria e o valor exibido na ficha continuam em `atributosEfetivos`/`atributos`,
   * intocados por este ajuste.
   */
  protected readonly atributosParaDados = computed(() =>
    calcularAtributosParaDados(this.atributos(), this.estado().lesoes, this.dados().dadosTeste ?? {}),
  );
```

- [ ] **Step 6: Rascunho de edição (`rascunhoDadosTeste`, helper completo, ajuste)**

Logo depois de `rascunhoModificadoresTeste` (linha 998, `protected readonly rascunhoModificadoresTeste = signal<Record<ChaveAtributo, number> | null>(null);`), adicionar:

```ts
  /** Rascunho do ajuste manual de dados durante a edição — completo (as 10 chaves, 0 onde ausente). */
  protected readonly rascunhoDadosTeste = signal<Record<ChaveAtributo, number> | null>(null);
```

Logo depois de `modificadoresTesteCompletos()` (linha 1001-1008), adicionar:

```ts
  /** Record completo (as 10 chaves) do ajuste manual de dados persistido, preenchendo 0 onde ausente. */
  private dadosTesteCompletos(): Record<ChaveAtributo, number> {
    const persistidos = this.dadosTeste();
    const completo = {} as Record<ChaveAtributo, number>;
    (Object.keys(this.atributos()) as ChaveAtributo[]).forEach((chave) => {
      completo[chave] = persistidos[chave] ?? 0;
    });
    return completo;
  }
```

Logo depois de `ajustarModificadorTesteRascunho` (linha 1011-1017), adicionar:

```ts
  /** Passo −/+ no ajuste manual de dados do rascunho (sem clamp — mesma liberdade dos demais). */
  protected ajustarDadosTesteRascunho(chave: ChaveAtributo, delta: number): void {
    const atual = this.rascunhoDadosTeste();
    if (!atual) {
      return;
    }
    this.rascunhoDadosTeste.set({ ...atual, [chave]: atual[chave] + delta });
  }
```

- [ ] **Step 7: Ligar no ciclo de edição (`editarAtributos`/`cancelarAtributos`/`confirmarAtributos`)**

Em `editarAtributos()` (linha 1696-1701), adicionar a semeadura do rascunho:

```ts
  protected editarAtributos(): void {
    this.rascunhoAtributos.set({ ...this.atributos() });
    this.rascunhoMaestria.set(this.dados().maestria);
    this.rascunhoModificadoresTeste.set(this.modificadoresTesteCompletos());
    this.rascunhoDadosTeste.set(this.dadosTesteCompletos());
    this.editandoAtributos.set(true);
  }
```

Em `cancelarAtributos()` (linha 1704-1708), adicionar a limpeza:

```ts
  protected cancelarAtributos(): void {
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadoresTeste.set(null);
    this.rascunhoDadosTeste.set(null);
  }
```

Em `confirmarAtributos()` (linha 1739-1749), incluir `dadosTeste` na guarda e no emit:

```ts
  protected confirmarAtributos(): void {
    const atributos = this.rascunhoAtributos();
    const modificadoresTeste = this.rascunhoModificadoresTeste();
    const dadosTeste = this.rascunhoDadosTeste();
    if (!atributos || !modificadoresTeste || !dadosTeste) {
      return;
    }
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadoresTeste.set(null);
    this.rascunhoDadosTeste.set(null);
    this.ajusteAtributos.emit({ atributos, maestria: this.rascunhoMaestria(), modificadoresTeste, dadosTeste });
  }
```

- [ ] **Step 8: `rolarTesteAtributo` usa `atributosParaDados` em vez de `atributosEfetivos`**

Em `rolarTesteAtributo` (linha 1038-1066), trocar as duas referências a `this.atributosEfetivos()` pelo novo `this.atributosParaDados()` — **só neste método**; `atributosEfetivos` continua existindo e sendo usado em todo o resto do componente (`dtAtributo`, `rolarDano`, leitura do valor no template):

```ts
  protected rolarTesteAtributo(campo: CampoAtributo): void {
    if (!this.podeRolar()) {
      return;
    }
    const dadosFormacao = this.bonusRolagemAtributoFormacao(campo.chave).dados;
    const atributosParaDados = this.atributosParaDados();
    const atributo = atributosParaDados[campo.chave] + dadosFormacao;
    const sufixo = this.sufixoModificador(this.modificadorTeste(campo.chave));
    // A fórmula que vai ao **motor** mantém `kh1` — é o gatilho da desvantagem intrínseca (atributo ≤ 0).
    const formula = `${campo.chave}d20kh1cm1 + PROF${sufixo}`;
    // O motor lê a contagem do pool direto do mapa de atributos — o dado de Formação e o ajuste
    // manual entram ajustando só a chave deste teste, sem alterar o atributo exibido em nenhum
    // outro lugar da ficha.
    const atributosParaRolagem =
      dadosFormacao !== 0 ? { ...atributosParaDados, [campo.chave]: atributo } : atributosParaDados;
    const resultado = rolarFormula({
      formula,
      atributos: atributosParaRolagem,
      proficiencia: this.proficiencia(),
      nivel: this.dados().nivel,
    });
    if (resultado) {
      // Legenda **honesta** (m3-31): em **desvantagem** (atributo ≤ 0) o motor rola `(2+|attr|)d20` e
      // mantém o **menor** — então a fórmula exibida troca `kh1`→`kl1` e mostra a contagem real, em vez de
      // exibir `kh1` (mantém o maior) numa rolagem que na verdade manteve o menor.
      const formulaExibida = atributo <= 0 ? `${2 - atributo}d20kl1cm1 + PROF${sufixo}` : formula;
      this.bandeja.mostrar({ rotulo: campo.nome, formula: formulaExibida, resultado });
      this.registrarRolagem({ rotulo: campo.nome, formula: formulaExibida, resultado });
    }
  }
```

- [ ] **Step 9: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
Expected: PASS — todos os testes do arquivo, incluindo os 3 novos.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
git commit -m "Adicionar estado e logica do ajuste manual de dados no card de atributos"
```

---

### Task 4: Template e SCSS — quarto stepper no card de atributo

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss`

**Interfaces:**
- Consumes: `rascunhoDadosTeste()`, `ajustarDadosTesteRascunho(chave, delta)`, `dadosTesteDe(chave)` (Task 3).

- [ ] **Step 1: Stepper em modo edição**

Em `ficha-visualizacao.component.html`, logo depois do bloco `<!-- Modificador de teste ... -->` `<div class="ficha-atributo__modificador">...</div>` (linhas 965-992), adicionar dentro do mesmo `@if (editandoAtributos())` (mesma `<div class="ficha-atributo ficha-atributo--edicao">`):

```html
                      <!-- Ajuste manual de dados: quantos D20 o atributo rola nos testes/rolagens,
                           sem alterar o valor base (Energia/Deslocamento/Vida/Maestria intocados). -->
                      <div class="ficha-atributo__dados">
                        <app-icone [nome]="'dado'" class="ficha-atributo__dados-icone" />
                        <button
                          class="ficha-atributo__dados-passo"
                          type="button"
                          appHoldRepeat
                          [attr.aria-label]="'Reduzir dados de teste de ' + campo.nome"
                          (passo)="ajustarDadosTesteRascunho(campo.chave, -1)"
                        >
                          −
                        </button>
                        <span
                          class="ficha-atributo__dados-valor"
                          [class.ficha-atributo__dados-valor--ativo]="rascunhoDadosTeste()?.[campo.chave] !== 0"
                        >
                          {{ (rascunhoDadosTeste()?.[campo.chave] ?? 0) >= 0 ? '+' : '' }}{{ rascunhoDadosTeste()?.[campo.chave] ?? 0 }}
                        </span>
                        <button
                          class="ficha-atributo__dados-passo"
                          type="button"
                          appHoldRepeat
                          [attr.aria-label]="'Aumentar dados de teste de ' + campo.nome"
                          (passo)="ajustarDadosTesteRascunho(campo.chave, 1)"
                        >
                          +
                        </button>
                      </div>
```

- [ ] **Step 2: Badge em modo leitura (só quando ativo)**

No mesmo arquivo, dentro do `@else` (modo leitura, `<div class="ficha-atributo">`), logo depois do bloco `<!-- Modificador de teste — só leitura ... -->` `<span class="ficha-atributo__mod-valor">...</span>` (linhas 1049-1059), adicionar:

```html
                      <!-- Ajuste manual de dados — só aparece quando há algo ativo (±N); a maioria
                           das fichas nunca mexe nisso, então fica invisível por padrão em vez de
                           somar mais um elemento sempre-visível ao card. -->
                      @if (dadosTesteDe(campo.chave) !== 0) {
                        <span
                          class="ficha-atributo__dados-badge"
                          [appTooltip]="
                            'Ajuste manual de dados: ' +
                            (dadosTesteDe(campo.chave) > 0 ? '+' : '') +
                            dadosTesteDe(campo.chave)
                          "
                        >
                          <app-icone [nome]="'dado'" />
                          {{ dadosTesteDe(campo.chave) > 0 ? '+' : '' }}{{ dadosTesteDe(campo.chave) }}
                        </span>
                      }
```

- [ ] **Step 3: SCSS do stepper de edição + badge de leitura**

Em `ficha-visualizacao.component.scss`, logo depois do bloco `&__mod-valor { ... }` (linhas 2367-2378, dentro do seletor `.ficha-atributo`), adicionar:

```scss
  // Ajuste manual de dados (m3-6x): passo -/+ que soma na CONTAGEM de dados do pool, não no
  // atributo nem no resultado — mesmo tratamento visual do `__modificador`, só com um ícone de
  // dado pra não confundir as duas linhas (uma soma no resultado, a outra na quantidade de dados).
  &__dados {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
  }

  &__dados-icone {
    width: 10px;
    height: 10px;
    color: var(--text-mute);
  }

  &__dados-passo {
    @extend .ficha-passo;
    width: 18px;
    height: 18px;
    font-size: 12px;
  }

  &__dados-valor {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--text-mute);
    min-width: 17px;
    text-align: center;

    &--ativo {
      color: var(--accent);
    }
  }

  // Badge de leitura (só renderizado quando há ajuste ativo — ver template) — mesmo tratamento
  // discreto do `__lesao`, com o ícone de dado pra diferenciar da penalidade de lesão.
  &__dados-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;

    app-icone {
      width: 10px;
      height: 10px;
    }
  }
```

- [ ] **Step 4: Alvo de toque (44×44) dos novos botões −/+**

No mesmo arquivo, na seção "Alvos de toque que a m3-56 não cobriu (m3-60)" (a partir da linha 2419), logo depois da regra `.ficha-atributo__mod-passo { @include alvo-de-toque; }` (linha 2446-2448), adicionar:

```scss
// − / + do ajuste manual de dados do atributo — mesmo raciocínio do `__mod-passo` logo acima:
// caixa visual de 18px, área de toque de 44px por cima.
.ficha-atributo__dados-passo {
  @include alvo-de-toque;
}
```

- [ ] **Step 5: Compactar no card `--2col`**

No bloco `&--2col { ... }` (a partir da linha 2155), logo depois da regra `.ficha-atributo__mod-valor { font-size: 10px; line-height: 1; }` (linhas 2219-2224), adicionar a mesma compactação para o novo valor:

```scss
    // Ajuste manual de dados: mesma compactação do modificador — a grade de 5 linhas x 2 colunas
    // não pode empurrar o card além da altura da coluna de Identidade.
    .ficha-atributo__dados-valor {
      font-size: 10px;
      line-height: 1;
    }
```

- [ ] **Step 6: Checar tipos/lint do frontend**

Run: `npx ng build frontend --configuration=development` (ou `npm run frontend:build` se existir esse script — checar `package.json` antes de rodar)
Expected: build sem erros (template novo referencia só símbolos já criados na Task 3).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss
git commit -m "Adicionar stepper de ajuste manual de dados no card de atributos"
```

---

### Task 5: Persistência (`ficha-edicao.service.ts`) + ajustar chamadas existentes

**Files:**
- Modify: `frontend/src/app/modules/ficha/ficha-edicao.service.ts:170-183` (`ajustarAtributos`)
- Modify: `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts` (duas chamadas diretas a `ajustarAtributos` que hoje montam `AjusteAtributos` à mão)

**Interfaces:**
- Consumes: `AjusteAtributos.dadosTeste` (Task 3).
- Produces: `FichaJogadorDadosDto.dadosTeste` persistido junto do resto do grupo.

- [ ] **Step 1: Persistir `dadosTeste` em `ajustarAtributos`**

Em `ficha-edicao.service.ts`, no método `ajustarAtributos` (linhas 170-183), adicionar o campo ao objeto montado:

```ts
  ajustarAtributos(ajuste: AjusteAtributos): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const dadosNovos: FichaJogadorDadosDto = {
      ...fichaAtual.dados,
      atributos: ajuste.atributos,
      maestria: ajuste.maestria,
      modificadoresTeste: ajuste.modificadoresTeste,
      dadosTeste: ajuste.dadosTeste,
    };
    this.ficha.set({ ...fichaAtual, dados: this.aplicarProgressao(fichaAtual.dados, dadosNovos) });
    this.agendarPersistencia();
  }
```

- [ ] **Step 2: Ajustar as duas chamadas diretas existentes em `visualizar.page.spec.ts`**

Essas duas chamadas montam `AjusteAtributos` na mão sem passar por `FichaVisualizacao` — como o campo `dadosTeste` agora é obrigatório na interface, o TypeScript vai reclamar (`Property 'dadosTeste' is missing`) até serem atualizadas. Em `visualizar.page.spec.ts`:

Na chamada por volta da linha 545-549:
```ts
    componente['fichaEdicao'].ajustarAtributos({
      atributos: novosAtributos,
      maestria: null,
      modificadoresTeste: {} as AjusteAtributos['modificadoresTeste'],
      dadosTeste: {} as AjusteAtributos['dadosTeste'],
    });
```

Na chamada por volta da linha 598-602:
```ts
    componente['fichaEdicao'].ajustarAtributos({
      atributos: { ...carregada.dados.atributos, forca: 6, vigor: 4 },
      maestria: null,
      modificadoresTeste: {} as AjusteAtributos['modificadoresTeste'],
      dadosTeste: {} as AjusteAtributos['dadosTeste'],
    });
```

(Usar `Read` no arquivo antes de editar para confirmar que as linhas não se moveram desde este plano.)

- [ ] **Step 3: Rodar os testes da página e do serviço**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts`
Expected: PASS — as duas chamadas ajustadas continuam batendo os mesmos asserts de derivados (o `dadosTeste` vazio não afeta Vida/Energia/etc., só o pool de dados).

- [ ] **Step 4: Checar tipos do frontend inteiro**

Run: `npx tsc --noEmit -p frontend` (ou o script equivalente do `package.json`)
Expected: sem erros — nenhum outro call site de `ajustarAtributos`/`AjusteAtributos` existe fora dos dois já ajustados (confirmado por grep antes deste plano).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/ficha-edicao.service.ts frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts
git commit -m "Persistir dadosTeste ao ajustar atributos"
```

---

### Task 6: Presets/rolagem avulsa usam `atributosParaDados` (`FichaRolagensPainel`)

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/ficha-rolagens-painel.component.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/ficha-rolagens-painel.component.html:20`

**Interfaces:**
- Consumes: `calcularAtributosParaDados` (Task 2).
- Produces: `protected readonly atributosParaDados: Signal<FichaAtributosDto>` (substitui o `atributosEfetivos` local deste componente — usado só nesse único binding).

Sem spec dedicado para este componente hoje (`ficha-rolagens-painel.component.spec.ts` não existe) — a cobertura desta task vem da Task 7 (verificação ao vivo: rolar um preset que referencia um atributo com `dadosTeste` ativo e conferir a contagem de dados na bandeja).

- [ ] **Step 1: Trocar o computed local**

Em `ficha-rolagens-painel.component.ts`, trocar o import (linha 8) e o computed (linhas 57-60):

```ts
import {
  calcularAtributosParaDados,
  calcularProficiencia,
} from '@contratados-rpg/shared/regras/agente';
```

```ts
  /** Atributos **para dados** (lesão + ajuste manual) — a mesma base que o teste de atributo rola. */
  protected readonly atributosParaDados = computed(() =>
    calcularAtributosParaDados(this.dados().atributos, this.dados().estado.lesoes, this.dados().dadosTeste ?? {}),
  );
```

- [ ] **Step 2: Atualizar o binding no template**

Em `ficha-rolagens-painel.component.html:20`, trocar:

```html
  [atributos]="atributosEfetivos()"
```

por:

```html
  [atributos]="atributosParaDados()"
```

- [ ] **Step 3: Checar tipos do frontend**

Run: `npx tsc --noEmit -p frontend`
Expected: sem erros — `atributosEfetivos` não é mais referenciado neste arquivo (nem no `.ts` nem no `.html`), então não sobra import/computed morto.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/ficha-rolagens-painel.component.ts frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/ficha-rolagens-painel.component.html
git commit -m "Usar atributosParaDados nos presets e na rolagem avulsa do painel"
```

---

### Task 7: Verificação ao vivo — layout nos dois viewports fixos (OBRIGATÓRIO, não pular)

Esta task só existe porque a Task 4 adiciona um elemento a mais por atributo (10 atributos × 1 stepper novo) dentro de um card já testado nos dois tamanhos fixos do projeto. Nenhuma outra task deste plano altera layout.

**Files:** nenhum (task de verificação manual/ao vivo — usa a skill `verify`, não escreve código).

- [ ] **Step 1: Subir o stack real**

Seguir a skill `verify` (`.claude/skills/verify/SKILL.md`): `npm run db:up`, `npm run db:migrate --workspace=backend`, `npm run backend:dev` (3100), `npm run frontend:dev` (4300).

- [ ] **Step 2: Montar uma sessão autenticada com uma ficha de teste**

Via Playwright + REST, conforme a skill `verify`: registrar usuário, criar campanha, criar ficha, plantar `localStorage['contratados-rpg.sessao']`. Ajustar o `dadosTeste` de pelo menos 2 atributos direto no Postgres ou pela própria UI (editar atributo → mexer no stepper novo → salvar), para garantir que o badge de leitura (`ficha-atributo__dados-badge`) apareça em pelo menos uma caixa.

- [ ] **Step 3: Verificar em mobile (360×800, Galaxy S20 FE)**

`browser.newContext({ viewport: { width: 360, height: 800 } })`. Abrir a ficha, entrar em edição de Atributos. Conferir:
- Zero scroll horizontal no card de Atributos.
- Os botões `−`/`+` do novo stepper de dados atingem o alvo de toque (medir a caixa clicável real, não só a visual — deve ser ≥44×44 como os outros steppers da mesma linha, `alvo-de-toque` mixin).
- Nenhum atributo da grade "estoura" a coluna nem quebra linha de forma estranha (a grade de 5 atributos × 2 colunas continua fechando sem órfão solto).
- O stepper de dados não vira o elemento mais chamativo do card — mesmo tratamento visual (tamanho de fonte, cor muted) dos outros dois já existentes (valor, modificador).
- Sair da edição: o badge `ficha-atributo__dados-badge` aparece só nos atributos com `dadosTeste !== 0`, do tamanho/posição esperados (não empurra o valor do atributo nem o "−N" de lesão, se houver).

- [ ] **Step 4: Verificar em desktop (1920×1080, FullHD)**

`browser.newContext({ viewport: { width: 1920, height: 1080 } })`. Repetir as mesmas checagens do Step 3. Confirmar também que o card de Atributos não cresceu a ponto de ficar visivelmente mais alto que o card de Identidade ao lado (o redesenho atual os mantém pareados).

- [ ] **Step 5: Rolar um preset que usa um atributo com `dadosTeste` ativo**

Na aba/painel de Rolagens, criar ou usar um preset com fórmula `<ABREV>d20kh1` para o atributo ajustado no Step 2, rolar, e conferir na bandeja de dados que a contagem de dados exibida bate com efetivo+ajuste manual (prova a Task 6 ao vivo, já que não há spec automatizado para esse componente).

- [ ] **Step 6: Reportar o resultado**

Se algo estourar/quebrar em qualquer um dos dois viewports, voltar à Task 4 e ajustar o SCSS antes de considerar o plano concluído — não é uma etapa opcional nem um "nice to have".

---

## Self-Review (already applied)

- **Cobertura do spec:** Modelo de dados (Task 1), Cálculo (Task 2), Onde entra (Tasks 3, 6 — com a correção de escopo documentada nas Global Constraints: Iniciativa/Descanso não existem/não se aplicam, `FichaInventario`/`rolarDano` não usam atributo como fonte de dados hoje), UI (Tasks 3-4), Critério de verificação (Task 7), Testes (Tasks 2, 3, 5) — todas as seções do spec têm task correspondente.
- **Consistência de tipos:** `AjusteAtributos.dadosTeste: Record<keyof FichaAtributosDto, number>` (completo, como `modificadoresTeste`) vs. `FichaJogadorDadosDto.dadosTeste?: Partial<Record<...>>` (opcional/parcial) — mesma relação já existente entre `modificadoresTeste` nos dois níveis; um `Record` completo satisfaz um `Partial<Record>` sem cast. `calcularAtributosParaDados` devolve `FichaAtributosDto` (mesmo shape de `calcularAtributosEfetivos`), consumido igual em `rolarTesteAtributo`/`FichaRolagensPainel`.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todo step tem código completo ou comando exato.
