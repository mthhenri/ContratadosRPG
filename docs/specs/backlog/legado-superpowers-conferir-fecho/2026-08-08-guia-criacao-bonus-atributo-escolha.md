# Guia de criação — bônus de atributo "à escolha" no passo // Classe — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Engenheiro, Assassino, Acadêmico e Experimento Híbrido têm um ponto de "Atributos Bônus" marcado como "à escolha" no documento (`sistema-v4.1.0.md`) que hoje nunca é capturado em lugar nenhum — o jogador simplesmente não recebe esse ponto. O passo `// Classe` do guia de criação passa a pedir a escolha e registrá-la para o resto do guia (`// Atributos`, `// Revisão`, ficha final).

**Architecture:** `shared/src/regras/agente/arquetipo.ts` ganha duas funções novas (`obterSlotsEscolhaBonus`, `obterBonusAtributosComEscolha`) ao lado da `obterBonusAtributos` existente, que **não muda** (continua só o fixo). O guia (`criar.page.ts`) guarda a escolha do jogador num novo campo de estado `bonusEscolhido` (um valor por slot) e troca a chamada de `obterBonusAtributos` por `obterBonusAtributosComEscolha` em todo lugar que hoje lê o bônus do perfil. `criar.page.html` ganha um `<select>` por slot no passo `// Classe`. `ficha-padrao.ts` (`construirFichaInicial`) recebe a mesma escolha para que a ficha final persistida já saia com o atributo certo.

**Tech Stack:** TypeScript puro (`shared/`), Angular standalone components (Signals), Vitest.

## Global Constraints

- `obterBonusAtributos` não muda — continua determinística, só o bônus fixo (proibição #27: doc é fonte única, e o doc já separa fixo de "à escolha").
- Nenhuma mudança no editor de ficha pós-criação (`ficha-edicao.service.ts`) — fora de escopo.
- Nenhuma mudança de regra de jogo, catálogo de habilidades, cálculo de saúde/energia — só o bônus de atributo.
- Híbrido: as duas escolhas são independentes; repetir o mesmo atributo nas duas é permitido (empilha +2) — confirmado com o usuário, não é ambiguidade a resolver no código.

---

## Task 1: Motor de regras — `obterSlotsEscolhaBonus` e `obterBonusAtributosComEscolha`

**Files:**
- Modify: `shared/src/regras/agente/arquetipo.ts`
- Test: `shared/src/regras/agente/arquetipo.spec.ts`

**Interfaces:**
- Produces: `type SlotEscolhaAtributo = readonly (keyof FichaAtributosDto)[]`; `obterSlotsEscolhaBonus(dto: BonusAtributosObterDto): readonly SlotEscolhaAtributo[]`; `obterBonusAtributosComEscolha(dto: BonusAtributosObterDto, escolhas: readonly (keyof FichaAtributosDto | null)[]): BonusAtributos`. Exportados via `shared/src/regras/agente/index.ts` (já faz `export * from './arquetipo'`, nenhuma mudança no index). Usados por `ficha-padrao.ts` (Task 2) e `criar.page.ts` (Task 3).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `shared/src/regras/agente/arquetipo.spec.ts`, como dois `describe` novos irmãos do existente:

```ts
import { obterBonusAtributosComEscolha, obterSlotsEscolhaBonus } from './arquetipo';

describe('obterSlotsEscolhaBonus', () => {
  it('Engenheiro: um slot com Força ou Destreza', () => {
    expect(
      obterSlotsEscolhaBonus({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO }),
    ).toEqual([['forca', 'destreza']]);
  });

  it('Assassino: um slot com Luta ou Pontaria', () => {
    expect(
      obterSlotsEscolhaBonus({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO }),
    ).toEqual([['luta', 'pontaria']]);
  });

  it('Acadêmico: um slot livre, sem Luta nem Pontaria', () => {
    const slots = obterSlotsEscolhaBonus({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ACADEMICO });
    expect(slots).toHaveLength(1);
    expect(slots[0]).not.toContain('luta');
    expect(slots[0]).not.toContain('pontaria');
    expect(slots[0]).toHaveLength(8);
  });

  it('Experimento Híbrido: dois slots livres iguais, sem Luta nem Pontaria', () => {
    const slots = obterSlotsEscolhaBonus({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null });
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual(slots[1]);
    expect(slots[0]).not.toContain('luta');
    expect(slots[0]).not.toContain('pontaria');
  });

  it('perfis sem ponto à escolha devolvem lista vazia', () => {
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR })).toEqual([]);
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, arquetipo: null })).toEqual([]);
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.CIVIL, arquetipo: null })).toEqual([]);
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.COMBATENTE, arquetipo: null })).toEqual([]);
  });
});

describe('obterBonusAtributosComEscolha', () => {
  it('soma o fixo com a escolha válida', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO },
        ['destreza'],
      ),
    ).toEqual({ intelecto: 1, destreza: 1 });
  });

  it('escolha null não soma nada além do fixo', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO },
        [null],
      ),
    ).toEqual({ destreza: 1 });
  });

  it('escolha fora das opções do slot é ignorada', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO },
        ['vigor'], // vigor não é opção do slot do Engenheiro (só forca/destreza)
      ),
    ).toEqual({ intelecto: 1 });
  });

  it('Híbrido com a mesma escolha nos dois slots empilha +2 no atributo', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null },
        ['vigor', 'vigor'],
      ),
    ).toEqual({ vigor: 2 });
  });

  it('Híbrido com escolhas diferentes soma +1 em cada', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null },
        ['vigor', 'intelecto'],
      ),
    ).toEqual({ vigor: 1, intelecto: 1 });
  });

  it('sem slots, devolve exatamente o bônus fixo (mesmo resultado de obterBonusAtributos)', () => {
    expect(
      obterBonusAtributosComEscolha({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR }, []),
    ).toEqual({ luta: 1, forca: 1 });
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run shared/src/regras/agente/arquetipo.spec.ts`
Expected: FAIL — `obterSlotsEscolhaBonus`/`obterBonusAtributosComEscolha` não existem.

- [ ] **Step 3: Implementar em `shared/src/regras/agente/arquetipo.ts`**

Adicionar ao final do arquivo (depois de `obterBonusAtributos`):

```ts
/** Um "slot" de bônus "à escolha": as chaves de atributo elegíveis para aquele ponto. */
export type SlotEscolhaAtributo = readonly (keyof FichaAtributosDto)[];

const TODOS_ATRIBUTOS: readonly (keyof FichaAtributosDto)[] = [
  'destreza', 'forca', 'luta', 'pontaria', 'vigor',
  'intelecto', 'medicina', 'sentidos', 'social', 'vontade',
];
const SEM_LUTA_OU_PONTARIA: SlotEscolhaAtributo = TODOS_ATRIBUTOS.filter(
  (atributo) => atributo !== 'luta' && atributo !== 'pontaria',
);

/**
 * Slots "à escolha" de cada arquétipo (doc — "Classes e Arquétipos"): Engenheiro e Assassino têm
 * um slot fechado com 2 opções; Acadêmico tem um slot livre (qualquer atributo, exceto Luta ou
 * Pontaria). Arquétipos sem ponto "à escolha" ficam de fora do mapa (`[]` no retorno da função).
 */
const SLOTS_ARQUETIPO: Partial<Record<ArquetipoEnum, readonly SlotEscolhaAtributo[]>> = {
  [ArquetipoEnum.ENGENHEIRO]: [['forca', 'destreza']],
  [ArquetipoEnum.ASSASSINO]: [['luta', 'pontaria']],
  [ArquetipoEnum.ACADEMICO]: [SEM_LUTA_OU_PONTARIA],
};

/**
 * Slots "à escolha" das subclasses (doc — "Subclasses"): só o Híbrido tem — os dois pontos de
 * `BONUS_SUBCLASSE[EXPERIMENTO_HIBRIDO]` (`{}`, todo "à escolha"). As duas escolhas são
 * independentes: repetir o mesmo atributo nas duas empilha +2 nele (não há "sem repetir" anotado
 * nessa linha do doc, ao contrário da habilidade "Mutável" da mesma subclasse).
 */
const SLOTS_SUBCLASSE: Partial<Record<ClasseEnum, readonly SlotEscolhaAtributo[]>> = {
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: [SEM_LUTA_OU_PONTARIA, SEM_LUTA_OU_PONTARIA],
};

/**
 * Slots de bônus "à escolha" do perfil atual — mesma precedência de `obterBonusAtributos`
 * (subclasse vence arquétipo). `[]` quando o perfil não tem nenhum ponto "à escolha".
 */
export function obterSlotsEscolhaBonus(dto: BonusAtributosObterDto): readonly SlotEscolhaAtributo[] {
  const daSubclasse = SLOTS_SUBCLASSE[dto.classe];
  if (daSubclasse) {
    return daSubclasse;
  }
  return (dto.arquetipo ? SLOTS_ARQUETIPO[dto.arquetipo] : undefined) ?? [];
}

/**
 * Combina o bônus fixo (`obterBonusAtributos`) com as escolhas do jogador — uma por slot, na mesma
 * ordem de `obterSlotsEscolhaBonus`. Escolha `null` ou fora das opções do slot correspondente não
 * soma nada nesse slot (nunca lança; a validação de "escolha obrigatória" é do chamador).
 */
export function obterBonusAtributosComEscolha(
  dto: BonusAtributosObterDto,
  escolhas: readonly (keyof FichaAtributosDto | null)[],
): BonusAtributos {
  const bonus: { [chave in keyof FichaAtributosDto]?: number } = { ...obterBonusAtributos(dto) };
  const slots = obterSlotsEscolhaBonus(dto);
  slots.forEach((slot, indice) => {
    const escolha = escolhas[indice];
    if (escolha && slot.includes(escolha)) {
      bonus[escolha] = (bonus[escolha] ?? 0) + 1;
    }
  });
  return bonus;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run shared/src/regras/agente/arquetipo.spec.ts`
Expected: PASS — todos os casos, incluindo os já existentes de `obterBonusAtributos`.

- [ ] **Step 5: Commit**

```bash
git add shared/src/regras/agente/arquetipo.ts shared/src/regras/agente/arquetipo.spec.ts
git commit -m "feat(shared): adiciona bônus de atributo à escolha (Engenheiro/Assassino/Acadêmico/Híbrido)"
```

---

## Task 2: `construirFichaInicial` aplica a escolha na ficha final

**Files:**
- Modify: `frontend/src/app/modules/ficha/ficha-padrao.ts`
- Test: `frontend/src/app/modules/ficha/ficha-padrao.spec.ts`

**Interfaces:**
- Consumes: `obterBonusAtributosComEscolha(dto, escolhas)` (Task 1, `@contratados-rpg/shared/regras/agente`).
- Produces: `OpcoesFichaInicial.bonusEscolhido?: readonly (keyof FichaAtributosDto | null)[]` — usado por `criar.page.ts` (Task 3) na chamada de `construirFichaInicial` dentro de `criar()`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao `describe('construirFichaInicial', ...)` de `frontend/src/app/modules/ficha/ficha-padrao.spec.ts`, depois do teste "soma o bônus fixo de Atributos do arquétipo aos atributos base":

```ts
  it('soma a escolha do jogador ao bônus fixo (Engenheiro: Intelecto fixo + Destreza escolhida)', () => {
    const { dados } = construirFichaInicial(
      base({
        classe: ClasseEnum.ESPECIALISTA,
        arquetipo: ArquetipoEnum.ENGENHEIRO,
        atributos: { ...ATRIBUTOS_BASE_PADRAO, intelecto: 2, destreza: 2 },
        bonusEscolhido: ['destreza'],
      }),
    );
    expect(dados.atributos.intelecto).toBe(3);
    expect(dados.atributos.destreza).toBe(3);
  });

  it('sem bonusEscolhido, perfil com ponto à escolha recebe só o fixo (comportamento anterior)', () => {
    const { dados } = construirFichaInicial(
      base({
        classe: ClasseEnum.ESPECIALISTA,
        arquetipo: ArquetipoEnum.ACADEMICO,
        atributos: { ...ATRIBUTOS_BASE_PADRAO, intelecto: 2 },
      }),
    );
    expect(dados.atributos.intelecto).toBe(3); // só o fixo, sem escolha
  });
```

Também atualizar o import do topo do arquivo para incluir `ClasseEnum` (já importado) — nenhuma mudança de import necessária, `ArquetipoEnum`/`ClasseEnum` já vêm de `@contratados-rpg/shared/enums` na linha 2 do spec.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run frontend/src/app/modules/ficha/ficha-padrao.spec.ts`
Expected: FAIL — `bonusEscolhido` não existe em `OpcoesFichaInicial`/não é aplicado (o primeiro teste novo falha porque `dados.atributos.destreza` fica em `2`, não `3`; o segundo já passa por acidente mas fica no arquivo para travar o comportamento).

- [ ] **Step 3: Implementar em `ficha-padrao.ts`**

Trocar o import de `obterBonusAtributos` por `obterBonusAtributosComEscolha`:

```ts
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  habilidadesIniciais,
  maestriaAtingivel,
  obterBonusAtributosComEscolha,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';
```

Em `OpcoesFichaInicial`, adicionar o campo opcional logo depois de `maestria`:

```ts
  readonly maestria: keyof FichaAtributosDto | null;
  /**
   * Escolha do jogador para os pontos "à escolha" do perfil (Engenheiro/Assassino: 1 posição;
   * Acadêmico: 1 posição; Experimento Híbrido: 2 posições) — mesma ordem de
   * `obterSlotsEscolhaBonus`. Ausente/posição `null` não soma nada além do bônus fixo.
   */
  readonly bonusEscolhido?: readonly (keyof FichaAtributosDto | null)[];
```

Em `construirFichaInicial`, trocar a linha que chama `obterBonusAtributos`:

```ts
  const bonus = obterBonusAtributosComEscolha({ classe, arquetipo }, opcoes.bonusEscolhido ?? []);
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run frontend/src/app/modules/ficha/ficha-padrao.spec.ts`
Expected: PASS — todos os casos, incluindo os já existentes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/ficha-padrao.ts frontend/src/app/modules/ficha/ficha-padrao.spec.ts
git commit -m "feat(ficha): construirFichaInicial aplica a escolha do jogador ao bônus de atributo"
```

---

## Task 3: Estado e lógica do guia — `criar.page.ts`

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Consumes: `obterSlotsEscolhaBonus`, `obterBonusAtributosComEscolha`, `type SlotEscolhaAtributo` (Task 1); `OpcoesFichaInicial.bonusEscolhido` (Task 2).
- Produces: `estado().bonusEscolhido: readonly (ChaveAtributo | null)[]`; `slotsEscolhaBonus: Signal<readonly SlotEscolhaAtributo[]>`; `escolherBonusAtributo(indice: number, evento: Event): void` (recebe o `Event` bruto e faz o cast internamente — mesmo padrão de `mudarArquetipo`/`mudarClasse`). Usados pelo template (Task 4).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar a `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts` um novo `describe`, próximo aos outros `describe` de passo (ex.: depois de `describe('m3-58 — passo // HABILIDADES', ...)`):

```ts
  describe('bônus de atributo à escolha (Engenheiro/Assassino/Acadêmico/Híbrido)', () => {
    it('Engenheiro: passoValido(Classe) bloqueia sem escolha e libera com a escolha feita', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO });
      expect(componente['slotsEscolhaBonus']()).toEqual([['forca', 'destreza']]);
      expect(componente['passoValido']()).toBe(false);

      componente['escolherBonusAtributo'](0, { target: { value: 'destreza' } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual(['destreza']);
      expect(componente['passoValido']()).toBe(true);
      expect(componente['bonusAtributos']()).toEqual({ intelecto: 1, destreza: 1 });
    });

    it('Assassino: bonusAtributos() combina fixo + escolha em Luta/Pontaria', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO });
      componente['escolherBonusAtributo'](0, { target: { value: 'luta' } } as unknown as Event);
      expect(componente['bonusAtributos']()).toEqual({ destreza: 1, luta: 1 });
    });

    it('Acadêmico: slot livre sem Luta/Pontaria', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ACADEMICO });
      expect(componente['slotsEscolhaBonus']()[0]).not.toContain('luta');
      expect(componente['slotsEscolhaBonus']()[0]).not.toContain('pontaria');

      componente['escolherBonusAtributo'](0, { target: { value: 'vontade' } } as unknown as Event);
      expect(componente['bonusAtributos']()).toEqual({ intelecto: 1, vontade: 1 });
    });

    it('Experimento Híbrido: dois slots independentes, permite repetir o mesmo atributo', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO });
      expect(componente['slotsEscolhaBonus']()).toHaveLength(2);
      expect(componente['passoValido']()).toBe(false);

      componente['escolherBonusAtributo'](0, { target: { value: 'vigor' } } as unknown as Event);
      expect(componente['passoValido']()).toBe(false); // falta a 2ª escolha

      componente['escolherBonusAtributo'](1, { target: { value: 'vigor' } } as unknown as Event);
      expect(componente['passoValido']()).toBe(true);
      expect(componente['bonusAtributos']()).toEqual({ vigor: 2 });
    });

    it('perfil sem ponto à escolha (Lutador) não exige nada além do arquétipo', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      expect(componente['slotsEscolhaBonus']()).toEqual([]);
      expect(componente['passoValido']()).toBe(true);
    });

    it('trocar de arquétipo reseta a escolha anterior', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO });
      componente['escolherBonusAtributo'](0, { target: { value: 'forca' } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual(['forca']);

      componente['mudarArquetipo']({ target: { value: ArquetipoEnum.ASSASSINO } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual([]);
      expect(componente['passoValido']()).toBe(false);
    });

    it('trocar de classe reseta a escolha anterior', () => {
      const { componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, bonusEscolhido: ['vigor', 'vigor'] });
      componente['mudarClasse']({ target: { value: ClasseEnum.COMBATENTE } } as unknown as Event);
      expect(componente['estado']().bonusEscolhido).toEqual([]);
    });

    it('ficha final (criar()) persiste o bônus escolhido nos atributos', () => {
      const { fixture, componente } = montar();
      componente['atualizar']({
        nome: 'Agente-9', classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO,
        dinheiro: { dados: [1, 1, 1, 1], inicial: 1000, rolado: true },
        personalidade: 'Firme',
      });
      componente['escolherBonusAtributo'](0, { target: { value: 'forca' } } as unknown as Event);
      fixture.detectChanges();

      componente['criar']();

      const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
      const payload = fichaService.criarFicha.mock.calls[0][0];
      // base 1 + fixo (intelecto 1) / base 1 + fixo (0) + escolha (1) em força
      expect(payload.dados.atributos.intelecto).toBe(2);
      expect(payload.dados.atributos.forca).toBe(2);
    });
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: FAIL — `slotsEscolhaBonus`/`escolherBonusAtributo`/`estado().bonusEscolhido` não existem.

- [ ] **Step 3: Implementar em `criar.page.ts`**

Atualizar o import de `@contratados-rpg/shared/regras/agente` (linha 9) para incluir as duas funções novas:

```ts
import { calcularDerivados, calcularEnergia, calcularOrcamentoAtributos, calcularProgressaoAcumulada, calcularVida, catalogoHabilidades, habilidadesIniciais, listarPacotesHabilidadesIniciais, obterBonusAtributosComEscolha, obterSaudeClasse, obterSlotsEscolhaBonus, validarDistribuicaoAtributos } from '@contratados-rpg/shared/regras/agente';
import type { GrupoHabilidades, HabilidadeCatalogoItemDto, HabilidadesPacoteInicialId, SlotEscolhaAtributo, TipoVagaHabilidade } from '@contratados-rpg/shared/regras/agente';
```

Em `EstadoGuiaCriacao` (linha 39-54), adicionar o campo logo depois de `arquetipo`:

```ts
  readonly classe: ClasseEnum | null; readonly arquetipo: ArquetipoEnum | null;
  /** Escolha do jogador para os pontos "à escolha" do bônus de atributo do perfil (Engenheiro/
   * Assassino/Acadêmico: 1 posição; Experimento Híbrido: 2 posições) — mesma ordem de
   * `obterSlotsEscolhaBonus`. `[]` quando o perfil não tem nenhum ponto assim, ou ainda não
   * escolhido. */
  readonly bonusEscolhido: readonly (ChaveAtributo | null)[];
```

Em `normalizarEstado` (linha 61-74), adicionar a normalização do campo (para rascunhos salvos antes desta mudança):

```ts
    formacoesCustomizadas: estado.formacoesCustomizadas ?? estado.origem.formacao.map((item) => item.bonus === null && item.texto.trim().length > 0),
    bonusEscolhido: estado.bonusEscolhido ?? [],
```

No `signal<EstadoGuiaCriacao>` inicial do construtor (linha 112-117), adicionar `bonusEscolhido: []` logo depois de `arquetipo: null,`:

```ts
  protected readonly estado = signal<EstadoGuiaCriacao>({ passo: 0, nome: '', usuarioId: null, classe: null,
    arquetipo: null, bonusEscolhido: [], motivo: MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO, mediaNivel: 0, mediaPrestigio: 0,
```

Novo computed logo depois de `arquetipos` (linha 119-122):

```ts
  protected readonly arquetipos = computed(() => {
    const classe = this.estado().classe;
    return classe ? arquetiposDaClasse(classe) : [];
  });
  /** Slots de bônus "à escolha" do perfil atual (`shared/regras`) — `[]` sem nenhum ponto assim. */
  protected readonly slotsEscolhaBonus = computed<readonly SlotEscolhaAtributo[]>(() =>
    obterSlotsEscolhaBonus({ classe: this.classeCalculada(), arquetipo: this.estado().arquetipo }));
```

Trocar a linha do computed `bonusAtributos` (linha 136):

```ts
  protected readonly bonusAtributos = computed(() => obterBonusAtributosComEscolha({ classe: this.classeCalculada(), arquetipo: this.estado().arquetipo }, this.estado().bonusEscolhido));
```

Atualizar `mudarClasse` e `mudarArquetipo` (linhas 288, 290) para resetar a escolha:

```ts
  protected mudarClasse(evento: Event): void { const valor = this.valor(evento); this.atualizar({ classe: valor ? valor as ClasseEnum : null, arquetipo: null, bonusEscolhido: [], pacoteHabilidadesId: null, melhorias: [] }); }
  protected mudarMotivo(evento: Event): void { this.atualizar({ motivo: this.valor(evento) as MotivoEntradaAgenteEnum }); }
  protected mudarArquetipo(evento: Event): void { const valor = this.valor(evento); this.atualizar({ arquetipo: valor ? valor as ArquetipoEnum : null, bonusEscolhido: [] }); }
```

Novo método, logo depois de `mudarArquetipo`:

```ts
  /** Grava a escolha do jogador na posição `indice` de `bonusEscolhido` (substitui, não acumula).
   * Recebe o `Event` bruto do `<select>` e faz o cast — mesmo padrão de `mudarArquetipo`. */
  protected escolherBonusAtributo(indice: number, evento: Event): void {
    const valor = this.valor(evento);
    const chave = valor ? valor as ChaveAtributo : null;
    const bonusEscolhido = this.slotsEscolhaBonus().map((_, i) => (i === indice ? chave : this.estado().bonusEscolhido[i] ?? null));
    this.atualizar({ bonusEscolhido });
  }
```

Em `passoValido()`, caso `'Classe'` (linha 382), adicionar a checagem de slots preenchidos:

```ts
      case 'Classe': return e.classe !== null && (!ehClasseBase(e.classe) || e.arquetipo !== null)
        && this.slotsEscolhaBonus().every((_, indice) => e.bonusEscolhido[indice] != null);
```

Em `criar()` (linha 418-428), passar `bonusEscolhido` para `construirFichaInicial`:

```ts
    const resultado = construirFichaInicial({ nome: e.nome, classe: e.classe, arquetipo: e.arquetipo, bonusEscolhido: e.bonusEscolhido, nivel: this.nivelInicial(), prestigio: this.prestigioInicial(), atributos: e.atributos, maestria: e.maestria, identidade: { personalidade: e.personalidade, origem: this.temPeculiaridade() ? null : e.origem }, dinheiro: this.totalDinheiro(), anotacoes: this.novoAgente().recebeAmaldicoadoPeloPassado ? 'Amaldiçoado pelo Passado' : '', habilidadesExtras: this.habilidadesDoNivel(), equipamentoInicial: e.kit });
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: PASS — todos os casos, incluindo os já existentes (nenhum outro `passoValido('Classe')` ou fluxo de criação deve ter regredido).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.ts frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(guia-criacao): captura a escolha do jogador para o bônus de atributo à escolha"
```

---

## Task 4: Template — selects do passo // Classe

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.html`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Consumes: `slotsEscolhaBonus()`, `escolherBonusAtributo(indice, chave)`, `estado().bonusEscolhido` (Task 3); `campos` (já existente em `criar.page.ts:93-98`, lista de `{ chave: ChaveAtributo; nome: string }`).

- [ ] **Step 1: Escrever os testes de DOM que falham**

Adicionar ao mesmo `describe` da Task 3, em `criar.page.spec.ts`, exatamente estes três testes:

```ts
    it('DOM: Engenheiro mostra um select "Bônus à escolha" com só Força/Destreza', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO });
      fixture.detectChanges();

      const select = raiz.querySelector('[data-testid="bonus-escolha-0"]') as HTMLSelectElement;
      expect(select).not.toBeNull();
      const opcoes = Array.from(select.options).map((o) => o.value).filter(Boolean);
      expect(opcoes.sort()).toEqual(['destreza', 'forca'].sort());

      select.value = 'destreza';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(componente['estado']().bonusEscolhido).toEqual(['destreza']);
    });

    it('DOM: Experimento Híbrido mostra dois selects rotulados "1ª escolha" e "2ª escolha"', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO });
      fixture.detectChanges();

      expect(raiz.querySelector('[data-testid="bonus-escolha-0"]')).not.toBeNull();
      expect(raiz.querySelector('[data-testid="bonus-escolha-1"]')).not.toBeNull();
      const rotulos = Array.from(raiz.querySelectorAll('.campo__rotulo')).map((r) => r.textContent?.trim());
      expect(rotulos).toContain('1ª escolha de bônus');
      expect(rotulos).toContain('2ª escolha de bônus');
    });

    it('DOM: perfil sem ponto à escolha (Lutador) não mostra select nenhum de bônus', () => {
      const { fixture, raiz, componente } = montar();
      componente['atualizar']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR });
      fixture.detectChanges();

      expect(raiz.querySelector('[data-testid="bonus-escolha-0"]')).toBeNull();
    });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: FAIL — nenhum `[data-testid="bonus-escolha-N"]` existe no template ainda.

- [ ] **Step 3: Implementar em `criar.page.html`**

No passo `// Classe`, dentro de `<div class="guia__campos guia__campos--duas-colunas">` (linhas 133-158), adicionar depois do bloco `@if (arquetipos().length) { ... }` (fecha na linha 157), ainda dentro da mesma `<div class="guia__campos ...">`:

```html
                @if (arquetipos().length) {
                  <label class="campo">
                    <span class="campo__rotulo">Arquétipo</span>
                    <select class="campo__controle" [value]="estado().arquetipo ?? ''" (change)="mudarArquetipo($event)">
                      <option value="">Selecione</option>
                      @for (opcao of arquetipos(); track opcao.valor) {
                        <option [value]="opcao.valor">{{ opcao.rotulo }}</option>
                      }
                    </select>
                  </label>
                }
                @for (slot of slotsEscolhaBonus(); track $index) {
                  <label class="campo">
                    <span class="campo__rotulo">{{ slotsEscolhaBonus().length > 1 ? ($index + 1 === 1 ? '1ª' : '2ª') + ' escolha de bônus' : 'Bônus à escolha' }}</span>
                    <select class="campo__controle" [attr.data-testid]="'bonus-escolha-' + $index" [value]="estado().bonusEscolhido[$index] ?? ''" (change)="escolherBonusAtributo($index, $event)">
                      <option value="">Selecione</option>
                      @for (campo of campos; track campo.chave) {
                        @if (slot.includes(campo.chave)) {
                          <option [value]="campo.chave">{{ campo.nome }}</option>
                        }
                      }
                    </select>
                  </label>
                }
```

E trocar o rótulo da prévia (linha 175), de "Bônus fixo de atributos" para "Bônus de atributos":

```html
                      <div class="guia__briefing-bloco">
                        <span>Bônus de atributos</span>
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: PASS — os 3 testes novos e todos os já existentes (nenhuma regressão no passo `// Classe`/`// Atributos`/Resumo).

- [ ] **Step 5: Rodar a suíte inteira do módulo ficha para garantir zero regressão**

Run: `npx vitest run frontend/src/app/modules/ficha`
Expected: PASS — todos os specs do módulo, incluindo `ficha-padrao.spec.ts` (Task 2) e `criar.page.spec.ts` (Task 3/4).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.html frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(guia-criacao): renderiza os selects de bônus à escolha no passo // Classe"
```

---

## Task 5: Verificação ao vivo (skill `verify`)

**Files:** nenhum arquivo novo — só rodar a aplicação real.

- [ ] **Step 1: Subir o stack (Postgres + NestJS + Angular) via skill `verify`**

- [ ] **Step 2: No guia de criação (`/fichas/nova` ou `/painel/:id/ficha/nova`), percorrer os 4 perfis com ponto "à escolha"**

Para cada um — Especialista→Engenheiro, Especialista→Assassino, Especialista→Acadêmico, Subclasses de Experimento→Experimento Híbrido — confirmar:
- O select de bônus aparece com as opções certas (2 opções fechadas para Engenheiro/Assassino; 8 para Acadêmico e para cada slot do Híbrido, sem Luta/Pontaria).
- "Avançar" fica desabilitado até preencher todo(s) slot(s).
- O passo `// Atributos` mostra o chip `+N <atributo>` certo, já somando fixo + escolha.
- Trocar de arquétipo (ex.: Engenheiro → Assassino) limpa a escolha e volta a travar "Avançar".

- [ ] **Step 3: Confirmar que perfis sem ponto à escolha continuam sem nenhum select novo**

Lutador, Mercenário, Vanguarda, Paramédico, Diplomata, Comandante, Civil, Experimento Bestial, Experimento Artificial.

- [ ] **Step 4: Criar a ficha até o fim com um dos 4 perfis e conferir os atributos persistidos**

Completar o guia (Base → Classe → ... → Revisão → "Criar ficha") escolhendo, por exemplo, Acadêmico com escolha em Vontade. Abrir a ficha criada e confirmar que Intelecto e Vontade estão corretos (base + fixo + escolha).

- [ ] **Step 5: Checar mobile (360–430px) e desktop — sem quebra de layout na grade `guia__campos--duas-colunas`**
