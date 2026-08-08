# Guia de criação — habilidades, progressão avulsa e identidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o pacote inicial obrigatório de habilidades, Nível/Prestígio exatos para ficha avulsa e a apresentação correta de classe, subclasse e Origem substituída.

**Architecture:** Regras de vagas iniciais ficam puras e tipadas em `shared/regras/agente`, separadas da progressão acumulada. `FichaCriar` compõe pacote inicial, vaga adicional de Experimento e progressão usando um único estado de seleções; valores finais de Nível/Prestígio passam por computeds usados por derivados e payload. A apresentação reutiliza `rotuloClasseCompleto` e o shell visual existente.

**Tech Stack:** TypeScript, Vitest, Angular 21 standalone, Signals, Reactive Forms, SCSS/BEM, Playwright na verificação ao vivo.

## Global Constraints

- `docs/core/sistema-v4.1.0.md` vence o código em regras de criação e progressão.
- O pacote inicial não entra em `calcularProgressaoAcumulada`; criação e progressão permanecem separadas.
- Civil escolhe 3 habilidades civis e não recebe os três pacotes convencionais.
- Experimento recebe pacote inicial + vaga adicional de Classe/Arquétipo + progressão.
- Templates não duplicam mapa de classe-base; usam função compartilhada/rotulador já existente.
- UI consome somente tokens e padrões aprovados de `docs/design/`.
- Preservar alterações existentes do autor em `docs/core/guia_de_mestre-v4.0.0.md`, `.superpowers/` e demais arquivos fora do escopo.
- Uma tarefa visual só fecha após inspeção pessoal em `1920×1080` e `360×800` com a skill `verify`.

---

### Task 0: Ativar a especificação operacional

**Files:**
- Create: `docs/specs/active/m3-64-guia-habilidades-progressao-avulsa.spec.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-07-guia-habilidades-progressao-e-resumo-identidade-design.md`.
- Produces: spec canônica ativa que referencia integralmente o design aprovado e enumera os critérios de aceite desta implementação.

- [ ] **Step 1: Create the active spec**

Registrar objetivo, entregáveis, fora de escopo e critérios de aceite auditáveis para os quatro blocos: Origem/Peculiaridade, classe-base + subclasse, pacotes iniciais e progressão avulsa.

- [ ] **Step 2: Check the spec location and content**

Run: `Get-ChildItem docs/specs/active; rg -n "Peculiaridade|4 Gerais|3 habilidades civis|Nível inicial exato|Prestígio inicial exato" docs/specs/active/m3-64-guia-habilidades-progressao-avulsa.spec.md`
Expected: um único arquivo de tarefa ativo e todas as cinco regras explícitas localizadas.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/active/m3-64-guia-habilidades-progressao-avulsa.spec.md
git commit -m "docs(spec): ativa guia de habilidades e progressão avulsa"
```

---

### Task 1: Regra pura dos pacotes iniciais

**Files:**
- Create: `shared/src/regras/agente/habilidades-iniciais.ts`
- Create: `shared/src/regras/agente/habilidades-iniciais.spec.ts`
- Modify: `shared/src/regras/agente/index.ts`

**Interfaces:**
- Produces: `TipoVagaHabilidade = 'geral' | 'classe' | 'classeOuArquetipo' | 'outraClasse' | 'civil'`.
- Produces: `HabilidadesPacoteInicialId = 'QUATRO_GERAIS' | 'DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO' | 'DUAS_CLASSE_OU_ARQUETIPO' | 'TRES_CIVIS'`.
- Produces: `HabilidadesPacoteInicialDto { readonly id; readonly rotulo; readonly vagas: readonly { readonly tipo: TipoVagaHabilidade; readonly quantidade: number }[] }`.
- Produces: `listarPacotesHabilidadesIniciais(classe: ClasseEnum): readonly HabilidadesPacoteInicialDto[]`.

- [ ] **Step 1: Write the failing tests**

Cobrir exatamente:

```ts
expect(listarPacotesHabilidadesIniciais(ClasseEnum.COMBATENTE).map((pacote) => pacote.id)).toEqual([
  'QUATRO_GERAIS',
  'DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO',
  'DUAS_CLASSE_OU_ARQUETIPO',
]);
expect(listarPacotesHabilidadesIniciais(ClasseEnum.COMBATENTE)[0].vagas).toEqual([
  { tipo: 'geral', quantidade: 4 },
]);
expect(listarPacotesHabilidadesIniciais(ClasseEnum.ESPECIALISTA)[1].vagas).toEqual([
  { tipo: 'geral', quantidade: 2 },
  { tipo: 'classeOuArquetipo', quantidade: 1 },
]);
expect(listarPacotesHabilidadesIniciais(ClasseEnum.SUPORTE)[2].vagas).toEqual([
  { tipo: 'classeOuArquetipo', quantidade: 2 },
]);
expect(listarPacotesHabilidadesIniciais(ClasseEnum.CIVIL)).toEqual([
  { id: 'TRES_CIVIS', rotulo: '3 Civis', vagas: [{ tipo: 'civil', quantidade: 3 }] },
]);
expect(listarPacotesHabilidadesIniciais(ClasseEnum.EXPERIMENTO_ARTIFICIAL)).toHaveLength(3);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/src/regras/agente/habilidades-iniciais.spec.ts`
Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implement the immutable catalog and selector**

Criar constantes `PACOTES_AGENTE` e `PACOTE_CIVIL`, retornar Civil somente quando `classe === ClasseEnum.CIVIL` e os três pacotes para todas as demais classes, inclusive subclasses de Experimento. Exportar pelo `index.ts`.

- [ ] **Step 4: Run focused and neighboring tests**

Run: `npx vitest run shared/src/regras/agente/habilidades-iniciais.spec.ts shared/src/regras/agente/progressao.spec.ts`
Expected: PASS sem alterar nenhuma expectativa de progressão.

- [ ] **Step 5: Commit**

```bash
git add shared/src/regras/agente/habilidades-iniciais.ts shared/src/regras/agente/habilidades-iniciais.spec.ts shared/src/regras/agente/index.ts
git commit -m "feat(shared): modela pacotes iniciais de habilidades"
```

---

### Task 2: Valores finais de Nível e Prestígio na ficha avulsa

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts`
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.html`
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.scss`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Produces no estado: `nivelManual: number`, `prestigioManual: number`, `sobrescreverProgressao: boolean`.
- Produces: `nivelInicial: Signal<number>` e `prestigioInicial: Signal<number>` como fontes únicas dos valores finais.
- Consumes: `novoAgente()` somente quando existe campanha e `sobrescreverProgressao === false`.

- [ ] **Step 1: Write failing component tests**

Adicionar casos que montam o componente com `campanhaId === null` e verificam:

```ts
componente['atualizar']({ nivelManual: 12, prestigioManual: 37 });
expect(componente['nivelInicial']()).toBe(12);
expect(componente['prestigioInicial']()).toBe(37);
expect(componente['progressaoAcumulada']()).toEqual(calcularProgressaoAcumulada({ classe: ClasseEnum.COMBATENTE, nivel: 12 }));
```

Espionar `FichaService.criarFicha` e exigir `dados.nivel === 12` e `dados.prestigio === 37`. Em campanha, testar cálculo por médias com sobrescrita desligada e valores manuais com sobrescrita ligada.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts -t "progressão manual"`
Expected: FAIL porque o estado e os computeds não existem e o payload avulso ainda força zero.

- [ ] **Step 3: Add final-value computeds and replace conditional zeros**

Inicializar `sobrescreverProgressao` como `campanhaId === null`; `nivelInicial` retorna o valor manual sanitizado nesse modo e `novoAgente().nivelInicial` no modo calculado; `prestigioInicial` segue a mesma decisão. Substituir todas as dependências de `novoAgente().nivelInicial` usadas em atributos, vida, energia, progressão, derivados, revisão, resumo e `construirFichaInicial` pelos valores finais adequados. Manter `novoAgente()` para regras de motivo, divisor, herança e anotações.

- [ ] **Step 4: Render the two modes explicitly**

No passo Novo agente:

- ficha avulsa: rótulos “Nível inicial exato” e “Prestígio inicial exato”, sem fórmula de média;
- campanha: médias e resultados calculados existentes + controle “Sobrescrever Nível e Prestígio”;
- sobrescrita ativa: exibir os mesmos dois campos finais usados na ficha avulsa.

Usar `min`, `max`, ajuda e estado de erro consistentes com `.campo` e `.campo__controle`; sem valor hardcoded de estilo.

- [ ] **Step 5: Run the complete page tests**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`
Expected: PASS, inclusive criação avulsa com valores altos e campanha nos dois modos.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.ts frontend/src/app/modules/ficha/paginas/criar/criar.page.html frontend/src/app/modules/ficha/paginas/criar/criar.page.scss frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(ficha): permite nível e prestígio exatos fora de campanha"
```

---

### Task 3: Composição do pacote inicial no passo Habilidades

**Files:**
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts`
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.html`
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.scss`
- Test: `frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts`

**Interfaces:**
- Consumes: `listarPacotesHabilidadesIniciais`, `HabilidadesPacoteInicialId`, `TipoVagaHabilidade`.
- Extends `MelhoriaEscolhida` with `origem: 'inicial' | 'experimento' | 'progressao'` or equivalent explicit provenance.
- Produces: `pacotesHabilidadesIniciais`, `pacoteHabilidadesSelecionado`, `vagasHabilidades` and a flattened `habilidadesEscolhidas` used by Peculiaridade and payload.

- [ ] **Step 1: Write failing tests for all packages**

Cobrir Combatente Nível 0 nos três pacotes, verificando alvos `[4 gerais]`, `[2 gerais, 1 classeOuArquetipo]` e `[2 classeOuArquetipo]`; Civil com `3 civil`; Experimento Artificial Nível 0 com pacote selecionado mais `+1 classeOuArquetipo` de origem `experimento`; Nível 5 somando alvos da progressão.

Adicionar teste de troca de pacote que remove escolhas excedentes/incompatíveis e teste de duplicata entre origens:

```ts
expect(componente['nomesEscolhidosMelhoria']()).toContain(habilidade.nome);
componente['adicionarMelhoria'](habilidade);
expect(componente['habilidadesEscolhidas']().filter((item) => item.nome === habilidade.nome)).toHaveLength(1);
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts -t "pacote inicial"`
Expected: FAIL porque o passo ainda não possui pacote selecionado nem proveniência.

- [ ] **Step 3: Implement package selection and composed targets**

Fazer `comHabilidades()` verdadeiro para qualquer classe definida. Exigir pacote antes de preencher vagas. Compor alvos por tipo, mas preservar a origem de cada vaga para que a UI mostre “Criação”, “Experimento” e “Progressão” separadamente. `melhoriasCompletas()` exige pacote selecionado, todas as vagas e fortificações. `habilidadesDoNivel()` passa a reunir todas as habilidades escolhidas (o nome pode ser migrado para `habilidadesEscolhidas()` se todas as chamadas e testes forem atualizados no mesmo commit).

- [ ] **Step 4: Build the package UI before the vacancy lists**

Adicionar cards/radios acessíveis para os pacotes; depois mostrar grupos de vagas com cabeçalhos semânticos. Civil vê somente “3 Civis”. Experimento vê o pacote escolhido e uma seção separada “Característica de Experimento” para a vaga adicional. Progressão aparece somente quando houver vagas de Nível/Treinamento.

- [ ] **Step 5: Preserve Peculiarity and payload behavior**

`temPeculiaridade()` deve consultar a lista achatada completa. A seleção adicional de Experimento continua aceitando Peculiaridade; Identidade esconde Origem; `construirFichaInicial` recebe cada habilidade uma única vez.

- [ ] **Step 6: Run component and shared suites**

Run: `npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts shared/src/regras/agente/habilidades-iniciais.spec.ts`
Expected: PASS para todos os pacotes, Civil, Experimento, progressão e payload.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/ficha/paginas/criar/criar.page.ts frontend/src/app/modules/ficha/paginas/criar/criar.page.html frontend/src/app/modules/ficha/paginas/criar/criar.page.scss frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts
git commit -m "feat(ficha): inclui habilidades iniciais no guia de criação"
```

---

### Task 4: Classe-base, subclasse e estado visual da Origem

**Files:**
- Modify: `frontend/src/app/modules/ficha/rotulos-ficha.ts`
- Test: `frontend/src/app/modules/ficha/rotulos-ficha.spec.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss`
- Test: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
- Modify: `frontend/src/app/modules/ficha/paginas/criar/criar.page.html`

**Interfaces:**
- Consumes: `classeBaseDeHabilidades(classe)` e `rotuloClasse`.
- Produces: `perfilClasseRotulos(classe, arquetipo): { readonly classeBase: string; readonly subclasse: string | null }` se apresentação separada for necessária; `rotuloClasseCompleto` continua disponível para consumidores textuais.

- [ ] **Step 1: Write failing label tests**

```ts
expect(perfilClasseRotulos(ClasseEnum.EXPERIMENTO_ARTIFICIAL, null)).toEqual({
  classeBase: 'Especialista',
  subclasse: 'Experimento Artificial',
});
expect(perfilClasseRotulos(ClasseEnum.COMBATENTE, null)).toEqual({ classeBase: 'Combatente', subclasse: null });
```

Adicionar teste de template que exige os dois textos para Experimento Artificial e somente um para classe simples.

- [ ] **Step 2: Write failing Origin-state template test**

Montar ficha Experimento com Peculiaridade e `origem: null`; exigir que o bloco contenha uma única ocorrência semântica de “Substituída pela Peculiaridade”, não contenha “Não definida” e não renderize o botão de edição de Origem.

- [ ] **Step 3: Run focused tests to verify failure**

Run: `npx vitest run frontend/src/app/modules/ficha/rotulos-ficha.spec.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts -t "Experimento Artificial|Substituída pela Peculiaridade"`
Expected: FAIL porque `classeTexto` usa `rotuloClasse` simples e o estado atual concorre com “Não definida”.

- [ ] **Step 4: Implement semantic labels**

Derivar classe-base pela função compartilhada já usada pelo catálogo. Na ficha e no guia, renderizar classe-base e subclasse em elementos distintos, preservando a hierarquia atual. Não codificar `Especialista` diretamente no componente.

- [ ] **Step 5: Restructure the Origin row**

No ramo Peculiaridade, renderizar apenas o estado substituído em um wrapper modificador como `.ficha-resumo__valor--estado`; aplicar grid/flex responsivo que permita quebra controlada e mantenha o chip dentro da coluna. O ramo normal mantém nome da Origem ou “Não definida” e o ícone conforme permissão.

- [ ] **Step 6: Run focused tests and diff check**

Run: `npx vitest run frontend/src/app/modules/ficha/rotulos-ficha.spec.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`
Expected: PASS.

Run: `git diff --check`
Expected: sem whitespace errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/ficha/rotulos-ficha.ts frontend/src/app/modules/ficha/rotulos-ficha.spec.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts frontend/src/app/modules/ficha/paginas/criar/criar.page.html
git commit -m "fix(ficha): apresenta classe completa e origem substituída"
```

---

### Task 5: Documentação persistente e gate final

**Files:**
- Move: `docs/specs/active/m3-64-guia-habilidades-progressao-avulsa.spec.md` to `docs/specs/done/m3-64-guia-habilidades-progressao-avulsa.spec.md`
- Modify: `docs/context/CONTEXT.md`
- Modify: `docs/context/HISTORY.md`
- Modify: `docs/context/PROBLEMS.md` para remover `P-012`

**Interfaces:**
- Consumes: todos os entregáveis anteriores.
- Produces: evidência auditável de testes, build, lint e verificação visual.

- [ ] **Step 1: Review the complete diff against the design spec**

Conferir separação criação/progressão, Civil, Experimento adicional, valores finais avulsos, payload, ausência de mapas duplicados e ausência de hardcodes visuais.

- [ ] **Step 2: Run automated quality gates**

Run:

```bash
npm run test --workspace=shared -- --exclude='dist/**'
npx vitest run frontend/src/app/modules/ficha/paginas/criar/criar.page.spec.ts frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts frontend/src/app/modules/ficha/rotulos-ficha.spec.ts
npm run build --workspace=shared
npm run build --workspace=frontend
npm run lint --workspace=frontend
```

Expected: novos testes e builds passam; falhas preexistentes de lint são comparadas com `docs/context/PROBLEMS.md` e relatadas separadamente.

- [ ] **Step 3: Run the real stack and verify desktop**

Usar a skill `verify`, viewport `1920×1080`, e percorrer: ficha avulsa Nível 12/Prestígio 37; os três pacotes; Civil; Experimento Artificial com Peculiaridade; classe-base + subclasse; resumo de Origem substituída.

- [ ] **Step 4: Verify mobile**

Repetir os estados representativos em `360×800`. Confirmar sem overflow, pacote selecionável por toque, rótulos legíveis, foco visível e chip de Origem sem colisão.

- [ ] **Step 5: Correct every observed divergence and rerun affected checks**

Registrar no relato final quais correções vieram da inspeção visual; nenhuma divergência fica apenas anotada se estiver dentro desta spec.

- [ ] **Step 6: Update persistent context**

Mover a spec operacional para `done/`, acrescentar narrativa no topo de `HISTORY.md`, editar somente seções afetadas de `CONTEXT.md` e remover `P-012` de `PROBLEMS.md` porque passa a ter consumidor completo.

- [ ] **Step 7: Final commit**

```bash
git add docs/specs docs/context/CONTEXT.md docs/context/HISTORY.md docs/context/PROBLEMS.md
git commit -m "docs(context): registra habilidades iniciais e progressão avulsa"
```
