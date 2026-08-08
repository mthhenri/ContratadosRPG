# Experimento com Peculiaridade — Origem no guia de criação e pós-criação — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o gap entre a spec `m3-57` e o guia de criação real: um Experimento (Bestial/Artificial/Híbrido) que escolhe Peculiaridade deixa de ter Origem, tanto na criação (mesmo no Nível 0) quanto depois de já criado.

**Architecture:** O passo `// Melhorias` do guia de criação vira `// Habilidades` e passa a existir também no Nível 0 para as três subclasses de Experimento (vaga garantida `+1`, mesmo padrão da Habilidade Inicial), sempre **antes** de `// Identidade` — só assim o guia sabe, ao chegar em Identidade, se a Origem deve existir. O passo `// Identidade` esconde o bloco de Origem quando `experimentoComPeculiaridade` é `true` (motor de regras já existente, `shared/regras/identidade`). No editor pós-criação, o Mestre ganha uma oferta de limpar a Origem no mesmo salvamento que adiciona a habilidade Peculiaridade. Nenhuma mudança no backend: `validarFormaIdentidade` já rejeita corretamente a combinação inválida — o trabalho aqui é garantir que o frontend nunca tente enviá-la.

**Tech Stack:** Angular standalone components (Signals), NestJS (sem mudanças nesta rodada), Vitest.

## Nota de implementação — duas correções em cima do design aprovado

Ao traduzir `docs/superpowers/specs/2026-08-07-experimento-peculiaridade-origem-design.md` em código, a leitura linha-a-linha do catálogo de habilidades (`shared/src/regras/agente/habilidades-catalogo.ts`) e do guia (`criar.page.ts`/`.html`) revelou duas correções necessárias — a intenção do design continua a mesma, só o detalhe de implementação mudou:

1. **A vaga garantida é `'classeOuArquetipo'`, não `'classe'`.** `gruposParaVaga('classe')` filtra só o grupo `id:'classe'` do catálogo (Habilidades de Classe das três classes-base). A lista "Habilidades de Subclasse" (Peculiaridade incluída) mora no grupo `id:'arquetipo'` (`grupoArquetipo`, `habilidades-catalogo.ts:145-153` — `HABILIDADES_SUBCLASSE[classe]`), que só as vagas `'classeOuArquetipo'`/`'outraClasse'` alcançam. A vaga `'classeOuArquetipo'` já é exatamente o bucket que hoje, num Experimento nível 1+, dá acesso a Peculiaridade — o gap real é só não existir no Nível 0. `gruposParaVaga` não muda nada.
2. **Duas correções de escopo maior, sem as quais a mudança quebra character silenciosamente:**
   - `habilidadesDoNivel()` (`criar.page.ts:198-206`) tem `if (!this.temMelhorias()) return [];` — com o passo existindo por `comHabilidades()` (novo) em vez de só `temMelhorias()`, esse guard precisa acompanhar a mesma condição, senão a Peculiaridade escolhida por um Experimento Nível 0 nunca entra na ficha final (fica escolhida na UI, mas some ao criar).
   - O resumo lateral (`criar.page.html:612/615/618`) e a Revisão (`criar.page.html:519`) têm posições de passo **hardcoded** (`estado().passo >= 4` assumindo Identidade sempre no índice 4, `@if (temMelhorias())` isolado). Como `// Habilidades` passa a vir **antes** de `// Identidade`, o índice de Identidade sobe pra 5 sempre que `comHabilidades()` é `true` — o que já acontece hoje para **qualquer** personagem nivelado (não só Experimento), já que `temMelhorias()` sozinho já entra em `comHabilidades()`. Sem corrigir esses pontos, o resumo lateral e a Revisão quebram (nunca revelam Identidade/Origem, ou nunca mostram as habilidades escolhidas) para todo personagem criado com Nível inicial > 0, não só para Experimentos.

## Global Constraints

- Nenhuma mudança de regra de jogo, catálogo de habilidades ou no motor `experimentoComPeculiaridade` (escopo do design).
- Nenhuma mudança no backend (`ficha.service.ts`) — ele já rejeita a combinação inválida corretamente; o trabalho é só garantir que o frontend nunca a envie.
- Fortificações de Personalidade continuam exatamente como estão, só acompanham o passo na mudança de nome/posição.
- `dinheiroTeste`/`dadosTeste` e qualquer outro campo fora do escopo desta spec não são tocados.

---

## Task 1: `ehClasseExperimento` — helper exportado do motor de Identidade

**Files:**
- Modify: `shared/src/regras/identidade/experimento.ts`
- Test: `shared/src/regras/identidade/experimento.spec.ts`

**Interfaces:**
- Produces: `ehClasseExperimento(classe: ClasseEnum): boolean` — `true` para as três subclasses de Experimento, exportado de `shared/src/regras/identidade` (via `index.ts`, que já faz `export * from './experimento'`). Usado por `criar.page.ts` na Task 2.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `shared/src/regras/identidade/experimento.spec.ts` (antes do fechamento do `describe('experimentoComPeculiaridade', ...)`, como um novo `describe` irmão):

```ts
describe('ehClasseExperimento', () => {
  it.each([ClasseEnum.EXPERIMENTO_BESTIAL, ClasseEnum.EXPERIMENTO_ARTIFICIAL, ClasseEnum.EXPERIMENTO_HIBRIDO])(
    'true para %s',
    (classe) => {
      expect(ehClasseExperimento(classe)).toBe(true);
    },
  );

  it.each([ClasseEnum.COMBATENTE, ClasseEnum.ESPECIALISTA, ClasseEnum.SUPORTE, ClasseEnum.CIVIL])(
    'false para %s',
    (classe) => {
      expect(ehClasseExperimento(classe)).toBe(false);
    },
  );
});
```

E atualizar o import no topo do arquivo:

```ts
import { ehClasseExperimento, experimentoComPeculiaridade } from './experimento';
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run shared/src/regras/identidade/experimento.spec.ts`
Expected: FAIL — `ehClasseExperimento` não está exportado.

- [ ] **Step 3: Exportar o helper, reusando `CLASSES_EXPERIMENTO`**

Em `shared/src/regras/identidade/experimento.ts`, adicionar a função exportada e fazer `experimentoComPeculiaridade` reusá-la (fonte única, sem duplicar a lista de 3 valores):

```ts
/**
 * `true` quando `classe` é uma das três subclasses de Experimento (`docs/core/sistema-v4.1.0.md` —
 * "⬡ Subclasse"). Reusado pelo guia de criação para conceder a vaga garantida de Habilidade de
 * Subclasse mesmo no Nível 0 (m3-58 só concede vagas a partir do Nível 1).
 */
export function ehClasseExperimento(classe: ClasseEnum): boolean {
  return CLASSES_EXPERIMENTO.includes(classe);
}

export function experimentoComPeculiaridade(
  classe: ClasseEnum,
  habilidades: readonly FichaHabilidadeDto[],
): boolean {
  if (!ehClasseExperimento(classe)) {
    return false;
  }
  return habilidades.some(
    (habilidade) => habilidade.nome === 'Peculiaridade' && habilidade.categoria === HabilidadeCategoriaEnum.SUBCLASSE,
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run shared/src/regras/identidade/experimento.spec.ts`
Expected: PASS — todos os casos, incluindo os já existentes de `experimentoComPeculiaridade`.

- [ ] **Step 5: Commit**

```bash
git add shared/src/regras/identidade/experimento.ts shared/src/regras/identidade/experimento.spec.ts
git commit -m "feat(shared): exporta ehClasseExperimento do motor de Identidade"
```

---

## Task 2: Guia de criação — trilha `// Habilidades` (nome, posição, vaga garantida)

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Consumes: `ehClasseExperimento(classe: ClasseEnum): boolean` (Task 1, `@contratados-rpg/shared/regras/identidade`).
- Produces: `comHabilidades: Signal<boolean>`, `ehExperimento: Signal<boolean>` — usados por Task 4 (`criar.page.html`) no lugar de `temMelhorias()` isolado em todo lugar que precisa saber se o passo `// Habilidades` existe.

- [ ] **Step 1: Escrever os testes que falham**

Em `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`, adicionar o import de `ClasseEnum.EXPERIMENTO_BESTIAL` (já vem do import existente `ClasseEnum` na linha 4 — nenhuma mudança de import necessária) e um novo `describe` logo após o bloco `describe('m3-58 — passo // MELHORIAS', ...)` (linha ~303):

```ts
describe('Experimento — vaga garantida de Habilidade de Subclasse (m3-58 + Peculiaridade)', () => {
  it('passo // Habilidades existe no Nível 0 para as três subclasses de Experimento', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });

    expect(componente['comHabilidades']()).toBe(true);
    expect(componente['passos']()).toContain('Habilidades');
    expect(componente['passos']().indexOf('Habilidades')).toBeLessThan(componente['passos']().indexOf('Identidade'));
  });

  it('sem classe Experimento e sem Melhorias, // Habilidades não existe (comportamento de hoje)', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.COMBATENTE });

    expect(componente['comHabilidades']()).toBe(false);
    expect(componente['passos']()).not.toContain('Habilidades');
  });

  it('vaga classeOuArquetipo ganha +1 fixo no Nível 0 para Experimento — nenhuma outra vaga aparece', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL });

    const vagas = componente['vagasMelhoria']();
    expect(vagas).toEqual([{ tipo: 'classeOuArquetipo', rotulo: 'Classe ou Arquétipo', alvo: 1 }]);
  });

  it('vaga classeOuArquetipo soma o +1 fixo às vagas normais do Nível (Experimento nível > 0)', () => {
    const { componente } = montar([fichaExistente]);
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, mediaNivel: 6 }); // nivelInicial 5
    const semExperimento = componente['progressaoAcumulada']().habilidadesClasseOuArquetipo;

    const vaga = componente['vagasMelhoria']().find((v) => v.tipo === 'classeOuArquetipo');
    expect(vaga?.alvo).toBe(semExperimento + 1);
  });

  it('escolher Peculiaridade na vaga garantida do Nível 0 conta como melhoria completa', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });

    componente['abrirSeletorMelhoria']('classeOuArquetipo');
    const peculiaridade = componente['gruposVagaAberta']()
      .flatMap((g) => g.subgrupos)
      .flatMap((s) => s.habilidades)
      .find((h) => h.nome === 'Peculiaridade');
    expect(peculiaridade).toBeDefined();

    componente['adicionarMelhoria'](peculiaridade!);
    componente['fecharSeletorMelhoria']();

    expect(componente['melhoriasCompletas']()).toBe(true);
    expect(componente['habilidadesDoNivel']().some((h) => h.nome === 'Peculiaridade')).toBe(true);
  });

  it('sem escolher nenhuma habilidade, o Nível 0 de Experimento fica com a vaga garantida pendente', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, passo: componente['passos']().indexOf('Habilidades') });

    expect(componente['passoValido']()).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts -t "Experimento — vaga garantida"`
Expected: FAIL — `comHabilidades` não existe; `vagasMelhoria` não tem bônus de Experimento; trilha não inclui `Habilidades` no Nível 0.

- [ ] **Step 3: Importar `ehClasseExperimento` e ajustar o import existente de `shared/regras/identidade`**

Em `criar.page.ts:13`, trocar:

```ts
import { FORMACOES } from '@contratados-rpg/shared/regras/identidade';
```

por:

```ts
import { FORMACOES, ehClasseExperimento, experimentoComPeculiaridade } from '@contratados-rpg/shared/regras/identidade';
```

(`experimentoComPeculiaridade` é usado na Task 3, mas importado aqui junto para não reabrir esta linha duas vezes.)

- [ ] **Step 4: Adicionar `ehExperimento` e `comHabilidades`, e usar `comHabilidades` na trilha**

Em `criar.page.ts`, logo depois de `temMelhorias` (linha ~164), adicionar os dois novos computeds e reescrever `passos`:

```ts
  /** `true` quando o Nível/Treinamento inicial (passo 03) é maior que 0 — só então o passo // MELHORIAS existe (m3-58). */
  protected readonly temMelhorias = computed(() => this.fichas().length > 0 && this.novoAgente().nivelInicial > 0);
  /** `true` quando a classe é uma subclasse de Experimento — precisa da vaga garantida mesmo no Nível 0 (doc: "ao criar seu agente, escolha uma característica anômala"). */
  protected readonly ehExperimento = computed(() => { const classe = this.estado().classe; return classe !== null && ehClasseExperimento(classe); });
  /** `true` quando o passo // HABILIDADES existe na trilha: Nível inicial > 0 (m3-58) OU Experimento (vaga garantida, mesmo no Nível 0). */
  protected readonly comHabilidades = computed(() => this.temMelhorias() || this.ehExperimento());
  /** Trilha de passos — // Habilidades (quando existe) vem antes de // Identidade: só depois de escolher habilidades o guia sabe se um Experimento vai ter Peculiaridade (e portanto não vai ter Origem). */
  protected readonly passos = computed<readonly string[]>(() => {
    const base = ['Base', 'Classe', 'Novo agente', 'Atributos'];
    return this.comHabilidades()
      ? [...base, 'Habilidades', 'Identidade', 'Recursos', 'Equipamento inicial', 'Revisão']
      : [...base, 'Identidade', 'Recursos', 'Equipamento inicial', 'Revisão'];
  });
```

- [ ] **Step 5: Vaga garantida — `+1` fixo em `'classeOuArquetipo'` para Experimento**

Substituir o computed `vagasMelhoria` (linha ~173-181) por:

```ts
  /** Vagas de habilidade do passo // HABILIDADES, só as com alvo > 0 — Civil nunca vê Geral/Classe própria/Arquétipo/Outra classe.
   * Experimento ganha +1 fixo em 'classeOuArquetipo' na criação (vaga garantida, mesmo padrão da Habilidade Inicial) — é essa
   * vaga que já dá acesso à lista "Habilidades de Subclasse" (Peculiaridade incluída, `habilidades-catalogo.ts` grupo 'arquetipo'). */
  protected readonly vagasMelhoria = computed<readonly VagaMelhoria[]>(() => {
    const p = this.progressaoAcumulada();
    const civil = this.classeCalculada() === ClasseEnum.CIVIL;
    const bonusExperimento = this.ehExperimento() ? 1 : 0;
    const vaga = (tipo: TipoVagaMelhoria, alvo: number): VagaMelhoria | null => alvo > 0 ? { tipo, rotulo: FichaCriar.ROTULOS_VAGA[tipo], alvo } : null;
    const vagas = civil
      ? [vaga('classe', p.habilidadesClasse), vaga('civil', p.habilidadesCivis)]
      : [vaga('geral', p.habilidadesGerais), vaga('classe', p.habilidadesClasse), vaga('classeOuArquetipo', p.habilidadesClasseOuArquetipo + bonusExperimento), vaga('outraClasse', p.habilidadesOutraClasse)];
    return vagas.filter((v): v is VagaMelhoria => v !== null);
  });
```

- [ ] **Step 6: `habilidadesDoNivel` acompanha `comHabilidades`, não só `temMelhorias`**

Em `habilidadesDoNivel` (linha ~198), trocar o guard:

```ts
  protected readonly habilidadesDoNivel = computed<readonly FichaHabilidadeDto[]>(() => {
    if (!this.comHabilidades()) return [];
```

(era `if (!this.temMelhorias()) return [];`.)

- [ ] **Step 7: `passoValido` — renomear o `case` de `'Melhorias'` para `'Habilidades'`**

Em `passoValido()` (linha ~333-354), trocar:

```ts
      case 'Melhorias': return e.modoLivre || this.melhoriasCompletas();
```

por:

```ts
      case 'Habilidades': return e.modoLivre || this.melhoriasCompletas();
```

- [ ] **Step 8: Rodar os testes novos e os já existentes do arquivo**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: os 5 novos testes do describe `Experimento — vaga garantida` passam; os testes do describe `m3-58 — passo // MELHORIAS` (linhas 239-303) **ainda falham** neste ponto, porque eles usam a string `'Melhorias'` para achar o passo — serão corrigidos na Task 4 (que também mexe no template). Confirmar que a única falha nova é exatamente esse mismatch de string, sem nenhum outro teste quebrado.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.ts frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(ficha): guia de criação garante vaga de Habilidade de Subclasse para Experimento no Nível 0"
```

---

## Task 3: Guia de criação — passo `// Identidade` reage à Peculiaridade

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Consumes: `experimentoComPeculiaridade(classe: ClasseEnum, habilidades: readonly FichaHabilidadeDto[]): boolean` (já importado na Task 2, Step 3).
- Produces: `temPeculiaridade: Signal<boolean>` — usado por Task 4 (`criar.page.html`) para esconder o bloco de Origem e trocar o rótulo no resumo/Revisão.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao `describe('Experimento — vaga garantida...')` da Task 2 (mesmo arquivo, mesmo bloco — é a continuação natural do fluxo de criação de um Experimento):

```ts
  it('escolher Peculiaridade dispensa Origem no passoValido de Identidade', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL });
    componente['abrirSeletorMelhoria']('classeOuArquetipo');
    const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
    componente['adicionarMelhoria'](peculiaridade);
    componente['fecharSeletorMelhoria']();

    componente['atualizar']({ passo: componente['passos']().indexOf('Identidade'), personalidade: 'Instável' });

    expect(componente['temPeculiaridade']()).toBe(true);
    expect(componente['passoValido']()).toBe(true); // sem nenhum campo de Origem preenchido
  });

  it('sem Peculiaridade, o passo Identidade de um Experimento continua exigindo Origem completa', () => {
    const { componente } = montar();
    componente['atualizar']({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, passo: 0 });
    componente['abrirSeletorMelhoria']('classeOuArquetipo');
    const outra = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome !== 'Peculiaridade')!;
    componente['adicionarMelhoria'](outra);
    componente['fecharSeletorMelhoria']();

    componente['atualizar']({ passo: componente['passos']().indexOf('Identidade'), personalidade: 'Instável' });

    expect(componente['temPeculiaridade']()).toBe(false);
    expect(componente['passoValido']()).toBe(false); // Origem continua obrigatória
  });

  it('cria a ficha de um Experimento com Peculiaridade sem enviar Origem (origem: null)', () => {
    const { fixture, componente } = montar();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    componente['atualizar']({ nome: 'Espécime-7', classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, dinheiro: { dados: [1, 1, 1, 1], inicial: 1000, rolado: true } });
    componente['abrirSeletorMelhoria']('classeOuArquetipo');
    const peculiaridade = componente['gruposVagaAberta']().flatMap((g) => g.subgrupos).flatMap((s) => s.habilidades).find((h) => h.nome === 'Peculiaridade')!;
    componente['adicionarMelhoria'](peculiaridade);
    componente['fecharSeletorMelhoria']();
    componente['atualizar']({ personalidade: 'Instável' });
    fixture.detectChanges();

    componente['criar']();

    const fichaService = TestBed.inject(FichaService) as unknown as { criarFicha: ReturnType<typeof vi.fn> };
    const payload = fichaService.criarFicha.mock.calls[0][0];
    expect(payload.dados.identidade.origem).toBeNull();
    expect(payload.dados.identidade.personalidade).toBe('Instável');
    expect(payload.dados.habilidades.some((h: { nome: string }) => h.nome === 'Peculiaridade')).toBe(true);
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts -t "Peculiaridade"`
Expected: FAIL — `temPeculiaridade` não existe; `passoValido('Identidade')` continua exigindo Origem sempre; `criar()` sempre manda `e.origem`.

- [ ] **Step 3: Adicionar `temPeculiaridade`**

Em `criar.page.ts`, logo depois de `habilidadesDoNivel` (linha ~206), adicionar:

```ts
  /** `true` quando a Peculiaridade já foi escolhida no passo // Habilidades — Experimento com ela não tem Origem (m3-41). */
  protected readonly temPeculiaridade = computed(() => {
    const classe = this.estado().classe;
    return classe !== null && experimentoComPeculiaridade(classe, this.habilidadesDoNivel());
  });
```

- [ ] **Step 4: `passoValido('Identidade')` dispensa Origem quando `temPeculiaridade()`**

Em `passoValido()`, trocar o `case 'Identidade'` (linha ~339-348):

```ts
      case 'Identidade': return e.personalidade.trim().length > 0
        && !/\s/.test(e.personalidade.trim())
        && (this.temPeculiaridade() || (
          e.origem.nome.trim().length > 0
          && e.origem.descricao.trim().length > 0
          && e.origem.formacao.every((item, indice) => (item.bonus !== null || e.formacoesCustomizadas[indice])
            && item.texto.trim().length > 0
            && (!this.definicaoFormacao(indice)?.parametro || Boolean(item.parametro?.trim())))
          && e.origem.especialidade.gatilho.trim().length > 0
          && e.origem.especialidade.efeito.trim().length > 0
          && e.origem.saberDeCampo.trim().length > 0
        ));
```

- [ ] **Step 5: `criar()` não envia Origem quando `temPeculiaridade()`**

Em `criar()` (linha ~376), trocar:

```ts
    const resultado = construirFichaInicial({ nome: e.nome, classe: e.classe, arquetipo: e.arquetipo, nivel: this.fichas().length ? this.novoAgente().nivelInicial : 0, prestigio: this.fichas().length ? this.novoAgente().prestigio.prestigioInicial : 0, atributos: e.atributos, maestria: e.maestria, identidade: { personalidade: e.personalidade, origem: e.origem }, dinheiro: this.totalDinheiro(), anotacoes: this.novoAgente().recebeAmaldicoadoPeloPassado ? 'Amaldiçoado pelo Passado' : '', habilidadesExtras: this.habilidadesDoNivel(), equipamentoInicial: e.kit });
```

por:

```ts
    const resultado = construirFichaInicial({ nome: e.nome, classe: e.classe, arquetipo: e.arquetipo, nivel: this.fichas().length ? this.novoAgente().nivelInicial : 0, prestigio: this.fichas().length ? this.novoAgente().prestigio.prestigioInicial : 0, atributos: e.atributos, maestria: e.maestria, identidade: { personalidade: e.personalidade, origem: this.temPeculiaridade() ? null : e.origem }, dinheiro: this.totalDinheiro(), anotacoes: this.novoAgente().recebeAmaldicoadoPeloPassado ? 'Amaldiçoado pelo Passado' : '', habilidadesExtras: this.habilidadesDoNivel(), equipamentoInicial: e.kit });
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts -t "Experimento"`
Expected: PASS — os 8 testes do describe (5 da Task 2 + 3 desta task).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.ts frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(ficha): passo Identidade do guia dispensa Origem quando o agente tem Peculiaridade"
```

---

## Task 4: Guia de criação — template (`criar.page.html`)

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.html`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Consumes: `comHabilidades()`, `temPeculiaridade()`, `passos()` (Tasks 2/3).

- [ ] **Step 1: Corrigir os testes existentes do describe `m3-58 — passo // MELHORIAS` que passaram a falhar na Task 2**

Em `criar.page.spec.ts`, no describe `m3-58 — passo // MELHORIAS` (linha ~239-303): trocar as duas ocorrências da string `'Melhorias'` usada como **nome do passo** por `'Habilidades'` — linha 243 (`expect(componente['passos']()).not.toContain('Melhorias')` → `.not.toContain('Habilidades')`) e linha 253 (`componente['passos']().indexOf('Melhorias')` → `.indexOf('Habilidades')`). A asserção da linha 242 (`expect(componente['temMelhorias']()).toBe(false)`) **não muda** — `temMelhorias` continua existindo como o computed nível-based isolado (Task 2), só `comHabilidades`/`passos` combinam ele com `ehExperimento`. Nenhuma outra mudança de asserção é necessária (os valores/índices continuam corretos, só o rótulo do passo mudou).

- [ ] **Step 2: Rodar os testes e confirmar que ainda falham (o template não mudou)**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts -t "m3-58"`
Expected: FAIL — o `@switch` do template ainda usa `'Melhorias'` como label do `@case`, então navegar para o passo pelo nome novo não renderiza nada.

- [ ] **Step 3: Renomear o `@case` e o cabeçalho do passo `// Habilidades`**

Em `criar.page.html:370-372`, trocar:

```html
            @case ('Melhorias') {
              <div class="guia__introducao">
                <span class="guia__introducao-codigo">PROGRESSÃO // MELHORIAS DE NÍVEL</span>
```

por:

```html
            @case ('Habilidades') {
              <div class="guia__introducao">
                <span class="guia__introducao-codigo">PROGRESSÃO // HABILIDADES</span>
```

(nenhuma outra linha dentro deste `@case` muda — vagas, Fortificações e modo livre continuam iguais.)

- [ ] **Step 4: `// Identidade` — esconder o bloco de Origem quando `temPeculiaridade()`**

Em `criar.page.html`, a seção de Origem vai de `<section class="guia__identidade-bloco guia__identidade-bloco--origem">` (linha 301) até o `</section>` de fechamento (linha 368). Envolver com `@if`/`@else`:

```html
              @if (!temPeculiaridade()) {
                <section class="guia__identidade-bloco guia__identidade-bloco--origem">
                  <header class="guia__identidade-cabecalho">
                    <span class="guia__identidade-marca">O</span>
                    <div><strong>Origem</strong><small>Passado, treinamento e conhecimento anterior ao recrutamento.</small></div>
                  </header>
                  <div class="guia__campos guia__campos--duas-colunas">
                    <label class="campo">
                      <span class="campo__rotulo">Nome da origem</span>
                      <input class="campo__controle" [value]="estado().origem.nome" (input)="atualizarOrigem('nome', valor($event))" placeholder="Ex.: Ex-militar" />
                    </label>
                    <label class="campo">
                      <span class="campo__rotulo">Descrição da origem</span>
                      <textarea class="campo__controle campo__controle--area" rows="3" [value]="estado().origem.descricao" (input)="atualizarOrigem('descricao', valor($event))"></textarea>
                    </label>
                  </div>

                  <div class="guia__subsecao"><span>Formações</span><i></i></div>
                  <p class="guia__subsecao-ajuda">Escolha uma formação do sistema ou selecione "Outra" para registrar uma opção autorizada pelo Mestre.</p>
                  <div class="guia__formacoes">
                    @for (linha of estado().origem.formacao; track $index) {
                      <div class="guia__formacao">
                        <label class="campo">
                          <span class="campo__rotulo">Formação {{ $index + 1 | number: '2.0-0' }}</span>
                          <select class="campo__controle" [attr.aria-label]="'Formação ' + ($index + 1)" [value]="linha.bonus ?? (estado().formacoesCustomizadas[$index] ? '__OUTRA__' : '')" (change)="mudarBonusFormacao($index, $event)">
                            <option value="">Selecione uma formação</option>
                            @for (grupo of gruposFormacao; track grupo.rotulo) {
                              <optgroup [label]="grupo.rotulo">
                                @for (opcao of grupo.opcoes; track opcao.codigo) {
                                  <option [value]="opcao.codigo">{{ opcao.rotulo }}</option>
                                }
                              </optgroup>
                            }
                            <option value="__OUTRA__">Outra (autorizada pelo Mestre)</option>
                          </select>
                        </label>
                        @if (definicaoFormacao($index); as definicao) {
                          @if (definicao.parametro === parametroEsquivaOuBloqueio) {
                            <label class="campo">
                              <span class="campo__rotulo">Escolha o benefício</span>
                              <select class="campo__controle" [value]="linha.parametro ?? ''" (change)="atualizarParametroFormacao($index, valor($event))">
                                <option value="">Selecione</option>
                                <option value="Esquiva">Esquiva</option>
                                <option value="Bloqueio">Bloqueio</option>
                              </select>
                            </label>
                          } @else if (definicao.parametro) {
                            <label class="campo">
                              <span class="campo__rotulo">{{ rotuloParametroFormacao(definicao.parametro) }}</span>
                              <input class="campo__controle" [value]="linha.parametro ?? ''" (input)="atualizarParametroFormacao($index, valor($event))" />
                            </label>
                          }
                        }
                        <label class="campo">
                          <span class="campo__rotulo">Texto registrado</span>
                          <input class="campo__controle" [value]="linha.texto" (input)="atualizarTextoFormacao($index, valor($event))" [placeholder]="estado().formacoesCustomizadas[$index] ? 'Descreva a formação autorizada' : 'Preenchido pela formação escolhida'" />
                        </label>
                      </div>
                    }
                  </div>

                  <div class="guia__subsecao"><span>Especialidade</span><i></i></div>
                  <p class="guia__subsecao-ajuda">A Especialidade é escrita livremente: defina quando ativa e qual efeito mecânico ela concede.</p>
                  <div class="guia__campos guia__campos--duas-colunas">
                    <label class="campo"><span class="campo__rotulo">Gatilho</span><input class="campo__controle" [value]="estado().origem.especialidade.gatilho" (input)="atualizarEspecialidade('gatilho', valor($event))" placeholder="Ex.: Ao agir sob fogo direto" /></label>
                    <label class="campo"><span class="campo__rotulo">Efeito</span><input class="campo__controle" [value]="estado().origem.especialidade.efeito" (input)="atualizarEspecialidade('efeito', valor($event))" placeholder="Ex.: +1 dado em um teste" /></label>
                  </div>
                  <label class="campo"><span class="campo__rotulo">Saber de campo</span><textarea class="campo__controle campo__controle--area" rows="3" [value]="estado().origem.saberDeCampo" (input)="atualizarOrigem('saberDeCampo', valor($event))" placeholder="Conhecimento prático que o agente traz de sua vida anterior."></textarea></label>
                </section>
              } @else {
                <section class="guia__identidade-bloco guia__identidade-bloco--origem">
                  <header class="guia__identidade-cabecalho">
                    <span class="guia__identidade-marca">O</span>
                    <div><strong>Peculiaridade</strong><small>Substitui a Origem — este agente não tem Formação, Especialidade nem Saber de Campo.</small></div>
                  </header>
                  <p class="guia__subsecao-ajuda">A Peculiaridade concede um bônus e uma penalidade desconhecida — o Mestre define os dois em jogo, fora deste guia.</p>
                </section>
              }
```

- [ ] **Step 5: Resumo lateral e Revisão — trocar índice fixo `4` por `passos().indexOf('Identidade')`, e `temMelhorias()` isolado por `comHabilidades()`**

Em `criar.page.html:519` (bloco Revisão), trocar:

```html
                @if (temMelhorias()) {
                  <div><dt>Melhorias de nível</dt><dd>{{ melhoriasPreenchidasTotal() }}/{{ melhoriasAlvoTotal() }} vagas</dd></div>
                }
```

por:

```html
                @if (comHabilidades()) {
                  <div><dt>Habilidades</dt><dd>{{ melhoriasPreenchidasTotal() }}/{{ melhoriasAlvoTotal() }} vagas</dd></div>
                }
```

Em `criar.page.html:612/615/618` (resumo lateral), trocar as três linhas:

```html
            @if ((estado().passo >= 4 || visitado() >= 4) && estado().personalidade.trim()) {
              <div class="guia__resumo-linha"><span>Personalidade</span><b>{{ estado().personalidade }}</b></div>
            }
            @if ((estado().passo >= 4 || visitado() >= 4) && estado().origem.nome.trim()) {
              <div class="guia__resumo-linha"><span>Origem</span><b>{{ estado().origem.nome }}</b></div>
            }
            @if ((estado().passo >= 4 || visitado() >= 4) && formacoesPreenchidas().length) {
```

por:

```html
            @if ((estado().passo >= passos().indexOf('Identidade') || visitado() >= passos().indexOf('Identidade')) && estado().personalidade.trim()) {
              <div class="guia__resumo-linha"><span>Personalidade</span><b>{{ estado().personalidade }}</b></div>
            }
            @if ((estado().passo >= passos().indexOf('Identidade') || visitado() >= passos().indexOf('Identidade')) && (temPeculiaridade() || estado().origem.nome.trim())) {
              <div class="guia__resumo-linha"><span>Origem</span><b>{{ temPeculiaridade() ? 'Peculiaridade' : estado().origem.nome }}</b></div>
            }
            @if ((estado().passo >= passos().indexOf('Identidade') || visitado() >= passos().indexOf('Identidade')) && !temPeculiaridade() && formacoesPreenchidas().length) {
```

Em `criar.page.html:626` (resumo lateral, bloco "Melhorias"), trocar:

```html
            @if (temMelhorias() && (estado().passo >= passos().indexOf('Melhorias') || visitado() >= passos().indexOf('Melhorias'))) {
              <div class="guia__resumo-linha"><span>Melhorias</span><b>{{ melhoriasPreenchidasTotal() }}/{{ melhoriasAlvoTotal() }} vagas</b></div>
            }
```

por:

```html
            @if (comHabilidades() && (estado().passo >= passos().indexOf('Habilidades') || visitado() >= passos().indexOf('Habilidades'))) {
              <div class="guia__resumo-linha"><span>Habilidades</span><b>{{ melhoriasPreenchidasTotal() }}/{{ melhoriasAlvoTotal() }} vagas</b></div>
            }
```

- [ ] **Step 6: Rodar todos os testes do arquivo**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: PASS — todos os testes, incluindo os 8 novos das Tasks 2/3 e os corrigidos do m3-58.

- [ ] **Step 7: Verificação ao vivo rápida (skill `verify`)**

Rodar o frontend localmente, criar um Experimento Bestial do zero (Nível 0): confirmar que o passo `// Habilidades` aparece antes de `// Identidade`, mostra 1 vaga "Classe ou Arquétipo" com a lista de Subclasse (Peculiaridade incluída), e que escolher Peculiaridade some com o bloco de Origem no passo seguinte. Escolher outra habilidade de Subclasse: Origem continua pedida. Checar mobile (360px) e desktop (1920px) — sem scroll horizontal, sem quebra de layout na nova posição do passo.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.html frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(ficha): guia de criação renomeia Melhorias->Habilidades, reposiciona antes de Identidade e some com a Origem na Peculiaridade"
```

---

## Task 5: Pós-criação — `FichaEdicaoService.limparOrigem()`

**Files:**
- Modify: `frontend/src/app/modules/ficha/ficha-edicao.service.ts`
- Test: `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts`

**Interfaces:**
- Produces: `FichaEdicaoService.limparOrigem(): void` — usado pela Task 7 (wiring do novo output `origemLimpa` de `FichaVisualizacao`).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao describe `Identidade (m3-25)` de `visualizar.page.spec.ts` (logo depois do teste `'sem derivados stored (ficha antiga), define a Origem sem quebrar'`, linha ~797):

```ts
    it('limparOrigem: remove a Origem e o delta de Formação dela, sem tocar Personalidade', () => {
      const { fixture } = montar({ usuarioLogadoId: 99 }); // mestre
      const componente = fixture.componentInstance;
      const carregada = componente['ficha']()!;
      const derivadosBase = calcularDerivados(carregada.dados.classe, carregada.dados.nivel, carregada.dados.atributos);
      const origem = origemComFormacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO);
      componente['ficha'].set({
        ...carregada,
        dados: {
          ...carregada.dados,
          identidade: { personalidade: 'Instável', origem },
          derivados: { ...derivadosBase, deslocamento: derivadosBase.deslocamento! + 1 },
        },
      });

      componente['fichaEdicao'].limparOrigem();

      const d = componente['ficha']()!.dados;
      expect(d.identidade).toEqual({ personalidade: 'Instável', origem: null });
      expect(d.derivados!.deslocamento).toBe(derivadosBase.deslocamento);
    });

    it('limparOrigem sem Origem definida é um no-op seguro', () => {
      const { fixture } = montar({ usuarioLogadoId: 99 });
      const componente = fixture.componentInstance;

      expect(() => componente['fichaEdicao'].limparOrigem()).not.toThrow();
      expect(componente['ficha']()!.dados.identidade?.origem ?? null).toBeNull();
    });
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts -t "limparOrigem"`
Expected: FAIL — `limparOrigem` não existe em `FichaEdicaoService`.

- [ ] **Step 3: Implementar `limparOrigem()`**

Em `ficha-edicao.service.ts`, logo depois de `ajustarOrigem` (linha ~392, antes de `private identidadeAtual`), adicionar:

```ts
  /** Limpa a Origem (Peculiaridade a substitui, m3-41) — mestre-only: o output que dispara isto só emite sob essa trava (`ficha-visualizacao.component.ts`). */
  limparOrigem(): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const origemAnterior = this.identidadeAtual(fichaAtual).origem;
    const derivadosAtuais = fichaAtual.dados.derivados;
    const derivados = derivadosAtuais && origemAnterior
      ? removerFormacaoDosDerivados(derivadosAtuais, origemAnterior.formacao)
      : derivadosAtuais;
    const identidade: FichaIdentidadeDto = { ...this.identidadeAtual(fichaAtual), origem: null };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, identidade, derivados } });
    this.agendarPersistencia();
  }
```

(`removerFormacaoDosDerivados` já está importado no topo do arquivo, linha 22 — reusado sem mudança de import.)

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts -t "limparOrigem"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/ficha-edicao.service.ts frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts
git commit -m "feat(ficha): FichaEdicaoService ganha limparOrigem para o fluxo pós-criação da Peculiaridade"
```

---

## Task 6: Pós-criação — `FichaVisualizacao` oferece limpar a Origem ao adicionar Peculiaridade (lógica)

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`

**Interfaces:**
- Consumes: `experimentoComPeculiaridade` (já importado no arquivo, usado por `origemBloqueadaPorPeculiaridade`).
- Produces: `origemLimpa: OutputEmitterRef<void>` (novo output) — usado pela Task 8 (wiring nas páginas host).
- Produces: `mudarHabilidades(novas: readonly FichaHabilidadeDto[]): void` (protected, chamado do template na Task 7 no lugar de `ajusteHabilidades.emit($event)` direto).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao describe `Identidade (m3-25) — lógica sem UI dedicada na tela` de `ficha-visualizacao.component.spec.ts` (depois do último teste, linha ~1027), usando o `dados` base já existente no topo do arquivo (`ClasseEnum.COMBATENTE` — os novos testes sobrescrevem `classe`/`habilidades` via spread):

```ts
    describe('m3-XX — oferta de limpar Origem ao adicionar Peculiaridade (mestre-only)', () => {
      const dadosExperimentoComOrigem: FichaJogadorDadosDto = {
        ...dados,
        classe: ClasseEnum.EXPERIMENTO_BESTIAL,
        arquetipo: null,
        habilidades: [],
        identidade: { personalidade: 'Instável', origem: origemExemplo },
      };
      const peculiaridade: FichaHabilidadeDto = {
        nome: 'Peculiaridade',
        categoria: HabilidadeCategoriaEnum.SUBCLASSE,
        custoEnergia: 0,
        descricao: '...',
      };

      it('mestre adiciona Peculiaridade com Origem definida: fica pendente de confirmação, não emite nada ainda', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        const origensLimpas: void[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));
        alvo.fixture.componentInstance.origemLimpa.subscribe(() => origensLimpas.push(undefined));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);

        expect(habilidadesEmitidas).toEqual([]);
        expect(origensLimpas).toEqual([]);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toEqual([peculiaridade]);
      });

      it('confirmar a oferta emite as duas mudanças — habilidades e origemLimpa — no mesmo gesto', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        let origemLimpaChamadas = 0;
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));
        alvo.fixture.componentInstance.origemLimpa.subscribe(() => origemLimpaChamadas++);

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);
        alvo.fixture.componentInstance['confirmarLimparOrigemEHabilidade']();

        expect(habilidadesEmitidas).toEqual([[peculiaridade]]);
        expect(origemLimpaChamadas).toBe(1);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toBeNull();
      });

      it('cancelar a oferta descarta a mudança de habilidade — nada é emitido', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);
        alvo.fixture.componentInstance['cancelarLimparOrigem']();

        expect(habilidadesEmitidas).toEqual([]);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toBeNull();
      });

      it('dono (não-mestre) adiciona Peculiaridade com Origem definida: passa direto, sem oferta', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, false);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);

        expect(habilidadesEmitidas).toEqual([[peculiaridade]]);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toBeNull();
      });

      it('mestre adiciona Peculiaridade sem Origem definida: passa direto, nada para limpar', () => {
        const semOrigem: FichaJogadorDadosDto = { ...dadosExperimentoComOrigem, identidade: { personalidade: 'Instável', origem: null } };
        const alvo = montar(semOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);

        expect(habilidadesEmitidas).toEqual([[peculiaridade]]);
      });

      it('mudança de habilidade que não introduz Peculiaridade passa direto, mesmo com Origem definida', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));
        const outraHabilidade: FichaHabilidadeDto = { nome: 'Foco', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 1, descricao: '...' };

        alvo.fixture.componentInstance['mudarHabilidades']([outraHabilidade]);

        expect(habilidadesEmitidas).toEqual([[outraHabilidade]]);
      });
    });
```

Adicionar `FichaHabilidadeDto` ao import de tipos do topo do arquivo (linha 14-18), que hoje só traz `FichaFragmentoConsumidoDto | FichaJogadorDadosDto | FichaOrigemDto`.

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts -t "oferta de limpar Origem"`
Expected: FAIL — `origemLimpa`, `mudarHabilidades`, `confirmarLimparOrigemEHabilidade`, `cancelarLimparOrigem` e `habilidadesPendentesPeculiaridade` não existem.

- [ ] **Step 3: Implementar o output e o estado de confirmação pendente**

Em `ficha-visualizacao.component.ts`, logo depois de `readonly ajusteHabilidades = output<readonly FichaHabilidadeDto[]>();` (linha 464), adicionar:

```ts
  /** Emite quando o mestre confirma a limpeza de Origem ao adicionar Peculiaridade (`mudarHabilidades`). */
  readonly origemLimpa = output<void>();
```

Depois de `origemEditavel` (linha ~1642), adicionar o estado e os três métodos:

```ts
  /**
   * Lista de habilidades pendente de confirmação — só fica não-`null` quando o **mestre** acabou de
   * adicionar "Peculiaridade" a um Experimento que já tem Origem definida (`origemBloqueadaPorPeculiaridade`
   * ainda `false` antes desta mudança). `null` = nenhuma oferta em aberto.
   */
  protected readonly habilidadesPendentesPeculiaridade = signal<readonly FichaHabilidadeDto[] | null>(null);

  /**
   * Intercepta toda mudança de habilidades vinda de `FichaHabilidades` (`habilidadesMudou`). Só quando
   * a mudança **introduz** a Peculiaridade (não estava lá antes) numa ficha de Experimento que **já tem**
   * Origem definida e quem edita é o **mestre**, a mudança fica pendente de confirmação — a Origem seria
   * apagada no mesmo salvamento (`confirmarLimparOrigemEHabilidade`). Em qualquer outro caso, passa direto.
   */
  protected mudarHabilidades(novasHabilidades: readonly FichaHabilidadeDto[]): void {
    const tinhaPeculiaridade = this.origemBloqueadaPorPeculiaridade();
    const teraPeculiaridade = experimentoComPeculiaridade(this.dados().classe, novasHabilidades);
    if (!tinhaPeculiaridade && teraPeculiaridade && this.ehMestre() && this.origemAtual() !== null) {
      this.habilidadesPendentesPeculiaridade.set(novasHabilidades);
      return;
    }
    this.ajusteHabilidades.emit(novasHabilidades);
  }

  /** Confirma a oferta — emite a mudança de habilidades e a limpeza de Origem no mesmo gesto (mesmo salvamento, debounced juntos em `FichaEdicaoService`). */
  protected confirmarLimparOrigemEHabilidade(): void {
    const pendente = this.habilidadesPendentesPeculiaridade();
    this.habilidadesPendentesPeculiaridade.set(null);
    if (!pendente) {
      return;
    }
    this.ajusteHabilidades.emit(pendente);
    this.origemLimpa.emit();
  }

  /** Cancela a oferta — descarta a mudança de habilidade pendente, nada é emitido. */
  protected cancelarLimparOrigem(): void {
    this.habilidadesPendentesPeculiaridade.set(null);
  }
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts -t "oferta de limpar Origem"`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte inteira do arquivo (evitar regressão nos ~1600 testes já existentes)**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
git commit -m "feat(ficha): FichaVisualizacao oferece limpar a Origem ao mestre adicionar Peculiaridade"
```

---

## Task 7: Pós-criação — diálogo de confirmação (`ficha-visualizacao.component.html`)

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`

**Interfaces:**
- Consumes: `habilidadesPendentesPeculiaridade()`, `mudarHabilidades()`, `confirmarLimparOrigemEHabilidade()`, `cancelarLimparOrigem()` (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao mesmo describe da Task 6 (`m3-XX — oferta de limpar Origem...`):

```ts
      it('a UI mostra a confirmação quando a oferta fica pendente, e os dois botões chamam os métodos certos', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade'].set([peculiaridade]);
        alvo.fixture.detectChanges();

        const dialogo = alvo.raiz.querySelector('.ficha-ident__aviso-peculiaridade');
        expect(dialogo?.textContent).toContain('substituir a Origem atual');

        const confirmar = vi.spyOn(alvo.fixture.componentInstance as unknown as { confirmarLimparOrigemEHabilidade: () => void }, 'confirmarLimparOrigemEHabilidade');
        (alvo.raiz.querySelector('[data-testid="confirmar-limpar-origem"]') as HTMLButtonElement).click();
        expect(confirmar).toHaveBeenCalled();
      });
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts -t "a UI mostra a confirmação"`
Expected: FAIL — `.ficha-ident__aviso-peculiaridade` não existe no DOM.

- [ ] **Step 3: Rewire `(habilidadesMudou)` para `mudarHabilidades($event)`**

Em `ficha-visualizacao.component.html:1414`, trocar:

```html
            (habilidadesMudou)="ajusteHabilidades.emit($event)"
```

por:

```html
            (habilidadesMudou)="mudarHabilidades($event)"
```

- [ ] **Step 4: Adicionar o diálogo de confirmação**

Logo depois do `</p-dialog>` do editor de Origem (linha 343), adicionar:

```html
        <p-dialog
          [visible]="habilidadesPendentesPeculiaridade() !== null"
          [modal]="true"
          [draggable]="false"
          [resizable]="false"
          [dismissableMask]="true"
          header="Confirmar Peculiaridade"
          styleClass="ficha-ident__aviso-peculiaridade"
          (onHide)="cancelarLimparOrigem()"
        >
          <p>Isso vai substituir a Origem atual, que será apagada. Confirma?</p>
          <div class="ficha-ident__classe-acoes">
            <button
              class="ficha-cartao__acao ficha-cartao__acao--confirmar"
              type="button"
              data-testid="confirmar-limpar-origem"
              (click)="confirmarLimparOrigemEHabilidade()"
            >
              Confirmar
            </button>
            <button class="ficha-cartao__acao" type="button" (click)="cancelarLimparOrigem()">
              Cancelar
            </button>
          </div>
        </p-dialog>
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npx vitest run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
Expected: PASS — inclusive todos os testes das Tasks 6/7 e a suíte completa do arquivo.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
git commit -m "feat(ficha): diálogo de confirmação para limpar a Origem ao adicionar Peculiaridade"
```

---

## Task 8: Pós-criação — conectar `(origemLimpa)` nas páginas host

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`

**Interfaces:**
- Consumes: `origemLimpa` (Task 6), `FichaEdicaoService.limparOrigem()` (Task 5) — ambos já testados isoladamente; esta task é só a fiação de template, no mesmo padrão 1:1 já usado pelos outros ~19 outputs de `FichaVisualizacao`.

- [ ] **Step 1: Conectar em `visualizar.page.html`**

Em `visualizar.page.html:190`, logo depois de `(ajusteOrigem)="fichaEdicao.ajustarOrigem($event)"`, adicionar:

```html
      (ajusteOrigem)="fichaEdicao.ajustarOrigem($event)"
      (origemLimpa)="fichaEdicao.limparOrigem()"
```

- [ ] **Step 2: Conectar em `detalhe.page.html`**

Em `detalhe.page.html:584`, logo depois de `(ajusteOrigem)="fichaEdicao.ajustarOrigem($event)"`, adicionar a mesma linha. `[ehMestre]="false"` está fixo nesta página (visão compacta do jogador) — a oferta nunca dispara aqui, mas a fiação segue o mesmo padrão 1:1 que os outros 19 outputs já usam nesta página, por consistência e para não deixar um output órfão se essa página um dia passar a mostrar `ehMestre` dinâmico:

```html
      (ajusteOrigem)="fichaEdicao.ajustarOrigem($event)"
      (origemLimpa)="fichaEdicao.limparOrigem()"
```

- [ ] **Step 3: Rodar as suítes das duas páginas (garantir que nada quebrou por causa do novo binding)**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.spec.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`
Expected: PASS.

- [ ] **Step 4: Verificação ao vivo (skill `verify`) — fluxo completo pós-criação**

Numa ficha de Experimento já criada, com Origem definida: logado como **mestre**, adicionar a habilidade Peculiaridade pela aba Habilidades — confirmar que a oferta aparece, confirmar, checar que a ficha salva sem erro e o chip "Substituída pela Peculiaridade" aparece na Identidade. Logado como **dono** da mesma ficha: repetir a tentativa de adicionar Peculiaridade — confirmar que a oferta **não aparece** (mesma trava de `origemEditavel`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html
git commit -m "feat(ficha): conecta a limpeza de Origem por Peculiaridade nas páginas de visualização"
```

---

## Self-Review

**Spec coverage** — os 4 pontos do design (`docs/superpowers/specs/2026-08-07-experimento-peculiaridade-origem-design.md`):
1. Passo `// Habilidades` muda de nome e posição → Tasks 2 e 4.
2. Vaga garantida na criação → Task 2 (com a correção de `'classe'` para `'classeOuArquetipo'`, ver "Nota de implementação").
3. Passo `// Identidade` reage à Peculiaridade → Task 3 (lógica) e Task 4 (template).
4. Pós-criação, limpar Origem ao adicionar Peculiaridade, mestre-only → Tasks 5, 6, 7, 8.
Testes listados na spec (`experimento.spec.ts`, `criar.page.spec.ts`, `ficha-visualizacao.component.spec.ts`) — todos cobertos; `ficha.service.spec.ts` não precisa de mudança (backend já rejeita a combinação inválida, confirmado por leitura de `validarFormaIdentidade`).

**Placeholder scan** — nenhum "TBD"/"implementar depois"; todo código de cada Step está completo (nenhuma etapa terceiriza detalhe para "similar à Task N").

**Type consistency** — `ehClasseExperimento(classe: ClasseEnum): boolean` (Task 1) usado com a mesma assinatura em `criar.page.ts` (Task 2); `experimentoComPeculiaridade` mantém a assinatura já existente; `limparOrigem(): void` (Task 5) e `origemLimpa: output<void>` (Task 6) casam sem parâmetro, consistente com o padrão dos outros outputs `void` do arquivo (não há nenhum hoje, mas `output<void>()` é a forma padrão do Angular Signals para eventos sem payload).
