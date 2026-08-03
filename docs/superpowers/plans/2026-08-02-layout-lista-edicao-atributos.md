# Layout em lista para edição de atributos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No card de Atributos da ficha (`FichaVisualizacao`), trocar a grade de caixas do **modo de edição** por uma lista vertical (estrela de Maestria + nome completo + valor com −/+ na 1ª sub-linha; modificador de teste e ajuste de dados, cada um com rótulo de texto, na 2ª sub-linha), mantendo o modo leitura bit-a-bit idêntico.

**Architecture:** Mudança puramente de apresentação em `ficha-visualizacao.component.html`/`.scss` — nenhum estado, computed ou método novo. O `@if (editandoAtributos())` que hoje decide **por atributo** (caixa de edição vs. caixa de leitura) dentro da mesma grade sobe para o nível do **grupo** (Físicos/Mentais): quando em edição, o grupo renderiza uma lista (`.ficha-atributos__lista` / `.ficha-atributo-linha`); quando não, renderiza a mesma grade de sempre (`.ficha-atributos__grade`, marcação copiada sem nenhuma alteração).

**Tech Stack:** Angular 21 standalone components, signals, SCSS com `@use` de `bp` (mixins de breakpoint do projeto).

**Spec:** `docs/superpowers/specs/2026-08-02-layout-lista-edicao-atributos-design.md`

## Global Constraints

- Muda **só o modo de edição** do card de Atributos (`ficha-visualizacao.component.html`, bloco `@if (editandoAtributos())` dentro de `.ficha-atributos--2col`). O modo leitura (grade compacta) fica **idêntico** — mesma marcação, mesmo CSS.
- **Puramente visual**: nenhum estado, computed ou método novo. Reusa integralmente `rascunhoAtributos`, `rascunhoMaestria`, `rascunhoModificadoresTeste`, `rascunhoDadosTeste`, `ajustarAtributoRascunho`, `ajustarModificadorTesteRascunho`, `ajustarDadosTesteRascunho`, `alternarMaestria`, `maestriaHabilitada`.
- Grupos **Físicos**/**Mentais** continuam existindo como seções (mesmo `gruposAtributos`, mesmo `<span class="ficha-atributos__rotulo-grupo">`).
- Sub-linha 1: estrela de Maestria + **nome completo** (`campo.nome`, não `campo.abrev`) + valor com `−`/`+` alinhado à direita.
- Sub-linha 2: os dois mini-steppers (modificador de teste, ajuste de dados) lado a lado no desktop, cada um com um **rótulo de texto** ("Mod." / "Dados").
- **Desktop (fora de `bp.mobile`, ≥560px):** sub-linha 2 sempre lado a lado, nunca empilha.
- **Mobile (`bp.mobile`, ≤560px):** sub-linha 2 empilha **condicionalmente**, só se não couber lado a lado.
- Remove o CSS especial do "5º atributo órfão" (`> *:nth-child(5)` dentro de `&.ficha-atributos__grade--edicao`) — **só** do contexto de edição; o modo leitura mantém sua própria regra de órfão intacta.
- Estrela de Maestria e os três steppers (valor, modificador, dados) continuam com alvo de toque ≥44px no mobile — já garantido pelas classes reusadas (`.ficha-atributo__maestria`, `.ficha-passo`, `.ficha-atributo__mod-passo`, `.ficha-atributo__dados-passo` já têm `@include alvo-de-toque`/regra própria de mobile; nenhuma CSS nova de touch-target é necessária).
- **Nenhum teste novo é necessário** (mudança puramente de apresentação) — os testes existentes de `ficha-visualizacao.component.spec.ts` devem continuar passando sem alteração, pois nenhum depende de marcação HTML.
- Verificação **ao vivo obrigatória** (skill `verify`, stack real) nos dois viewports fixos do projeto antes de fechar: **Mobile 360×800** (Galaxy S20 FE) e **Desktop 1920×1080** (FullHD).

---

### Task 1: Reestruturar a marcação de edição de Atributos (HTML + SCSS)

**Files:**
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html:917-1116`
- Modify: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss` (adiciona um bloco novo; remove dois trechos de CSS que ficam órfãos)

**Interfaces:**
- Consumes: `gruposAtributos` (readonly, já existe no componente), `editandoAtributos()`, `rascunhoAtributos()`, `rascunhoMaestria()`, `rascunhoModificadoresTeste()`, `rascunhoDadosTeste()`, `ajustarAtributoRascunho(chave, delta)`, `ajustarModificadorTesteRascunho(chave, delta)`, `ajustarDadosTesteRascunho(chave, delta)`, `alternarMaestria(chave)`, `maestriaHabilitada(chave)`, `limiteMaestria`, `atributosEfetivos()`, `maestriaAtual()`, `penalidadesLesao()`, `podeRolar()`, `rolarTesteAtributo(campo)`, `dtAtributo(chave)`, `atributos()`, `modificadorTeste(chave)`, `dadosTesteDe(chave)` — todos já existem, nenhuma assinatura muda.
- Produces: duas novas classes CSS puramente de apresentação — `.ficha-atributos__lista` (container da lista, um por grupo) e `.ficha-atributo-linha` (bloco de uma linha, com elementos `__principal`, `__nome`, `__valor`, `__secundaria`, `__mini`, `__rotulo-mini`). Nenhuma outra task depende delas.

- [ ] **Step 1: Substituir o bloco de renderização dos atributos em edição/leitura**

Abra `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`. Localize o bloco que começa em `<div class="ficha-atributos ficha-atributos--2col">` (linha 917) e vai até o `</div>` de fechamento correspondente (linha 1116, logo antes do comentário "m2-21: o glance de Combate..."). Substitua **todo esse bloco** (linhas 917-1116) pelo texto abaixo — note que o ramo `@else` (modo leitura) é **copiado sem nenhuma alteração** do bloco original, só re-indentado um nível a mais:

```html
        <div class="ficha-atributos ficha-atributos--2col">
          @for (grupo of gruposAtributos; track grupo.rotulo) {
            <div class="ficha-atributos__grupo">
              <span class="ficha-atributos__rotulo-grupo">{{ grupo.rotulo }}</span>
              @if (editandoAtributos()) {
                <!-- Lista vertical em edição (troca a grade de caixas — só neste modo, ver
                     docs/superpowers/specs/2026-08-02-layout-lista-edicao-atributos-design.md):
                     cada atributo é uma linha de duas sub-linhas, sem grid, sem 5º item órfão. -->
                <div class="ficha-atributos__lista">
                  @for (campo of grupo.campos; track campo.chave) {
                    <div class="ficha-atributo-linha">
                      <div class="ficha-atributo-linha__principal">
                        <button
                          class="ficha-atributo__maestria"
                          type="button"
                          [class.ficha-atributo__maestria--ativa]="rascunhoMaestria() === campo.chave"
                          [disabled]="!maestriaHabilitada(campo.chave)"
                          [attr.aria-label]="'Maestria em ' + campo.nome"
                          [appTooltip]="'Maestria em ' + campo.nome + ' — requer ' + limiteMaestria + '+ pontos'"
                          (click)="alternarMaestria(campo.chave)"
                        >
                          ★
                        </button>
                        <span class="ficha-atributo-linha__nome">{{ campo.nome }}</span>
                        <div class="ficha-atributo__stepper">
                          <button
                            class="ficha-passo"
                            type="button"
                            appHoldRepeat
                            [attr.aria-label]="'Reduzir ' + campo.nome"
                            (passo)="ajustarAtributoRascunho(campo.chave, -1)"
                          >
                            −
                          </button>
                          <span class="ficha-atributo-linha__valor">{{ rascunhoAtributos()?.[campo.chave] }}</span>
                          <button
                            class="ficha-passo"
                            type="button"
                            appHoldRepeat
                            [attr.aria-label]="'Aumentar ' + campo.nome"
                            (passo)="ajustarAtributoRascunho(campo.chave, 1)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div class="ficha-atributo-linha__secundaria">
                        <!-- Modificador de teste (soma na fórmula rolada, ex.: Amplificador aplicado) —
                             só editável aqui, na mesma tela de edição dos atributos. -->
                        <div class="ficha-atributo-linha__mini">
                          <span class="ficha-atributo-linha__rotulo-mini">Mod.</span>
                          <div class="ficha-atributo__modificador">
                            <button
                              class="ficha-atributo__mod-passo"
                              type="button"
                              appHoldRepeat
                              [attr.aria-label]="'Reduzir modificador de teste de ' + campo.nome"
                              (passo)="ajustarModificadorTesteRascunho(campo.chave, -1)"
                            >
                              −
                            </button>
                            <span
                              class="ficha-atributo__mod-valor"
                              [class.ficha-atributo__mod-valor--ativo]="rascunhoModificadoresTeste()?.[campo.chave] !== 0"
                            >
                              {{ (rascunhoModificadoresTeste()?.[campo.chave] ?? 0) >= 0 ? '+' : '' }}{{ rascunhoModificadoresTeste()?.[campo.chave] ?? 0 }}
                            </span>
                            <button
                              class="ficha-atributo__mod-passo"
                              type="button"
                              appHoldRepeat
                              [attr.aria-label]="'Aumentar modificador de teste de ' + campo.nome"
                              (passo)="ajustarModificadorTesteRascunho(campo.chave, 1)"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <!-- Ajuste manual de dados: quantos D20 o atributo rola nos testes/rolagens,
                             sem alterar o valor base (Energia/Deslocamento/Vida/Maestria intocados). -->
                        <div class="ficha-atributo-linha__mini">
                          <span class="ficha-atributo-linha__rotulo-mini">Dados</span>
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
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="ficha-atributos__grade">
                  @for (campo of grupo.campos; track campo.chave) {
                    <div
                      class="ficha-atributo"
                      [class.ficha-atributo--maestria]="maestriaAtual() === campo.chave"
                      [class.ficha-atributo--lesionado]="penalidadesLesao()[campo.chave] > 0"
                    >
                      @if (podeRolar()) {
                        <button
                          class="ficha-atributo__rolar"
                          type="button"
                          [attr.aria-label]="'Rolar teste de ' + campo.nome"
                          [appTooltip]="'Rolar teste de ' + campo.nome"
                          (click)="rolarTesteAtributo(campo)"
                        >
                          <app-icone [nome]="'dado'" />
                        </button>
                      }
                      <span
                        class="ficha-atributo__abrev ficha-atributo__abrev--dica"
                        tabindex="0"
                        [appTooltip]="campo.nome + ' — DT ' + dtAtributo(campo.chave)"
                        [attr.aria-label]="campo.nome + ' — DT ' + dtAtributo(campo.chave)"
                      >
                        @if (maestriaAtual() === campo.chave) {
                          <span class="ficha-atributo__estrela" aria-hidden="true">★</span>
                        }
                        {{ campo.abrev }}
                        @if (maestriaAtual() === campo.chave) {
                          <span class="ficha-atributo__estrela" aria-hidden="true">★</span>
                        }
                      </span>
                      <span class="ficha-atributo__valor">
                        {{ atributosEfetivos()[campo.chave] }}
                        @if (penalidadesLesao()[campo.chave] > 0) {
                          <span
                            class="ficha-atributo__lesao"
                            [appTooltip]="
                              'Base ' +
                              atributos()[campo.chave] +
                              ' · lesão −' +
                              penalidadesLesao()[campo.chave]
                            "
                          >
                            −{{ penalidadesLesao()[campo.chave] }}
                          </span>
                        }
                      </span>
                      <span
                        class="ficha-atributo__mod-valor"
                        [class.ficha-atributo__mod-valor--ativo]="modificadorTeste(campo.chave) !== 0"
                        [appTooltip]="'Modificador de teste de ' + campo.nome"
                      >
                        {{ modificadorTeste(campo.chave) >= 0 ? '+' : '' }}{{ modificadorTeste(campo.chave) }}
                      </span>
                      @if (dadosTesteDe(campo.chave) !== 0) {
                        <span
                          class="ficha-atributo__dados-badge"
                          [appTooltip]="
                            'Ajuste manual de dados: ' +
                            (dadosTesteDe(campo.chave) > 0 ? '+' : '') +
                            dadosTesteDe(campo.chave)
                          "
                          [attr.aria-label]="
                            'Ajuste manual de dados: ' +
                            (dadosTesteDe(campo.chave) > 0 ? '+' : '') +
                            dadosTesteDe(campo.chave)
                          "
                        >
                          <app-icone [nome]="'dado'" />
                          {{ dadosTesteDe(campo.chave) > 0 ? '+' : '' }}{{ dadosTesteDe(campo.chave) }}
                        </span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
```

Confira que o `@else` acima é idêntico, elemento por elemento e binding por binding, ao bloco de leitura que existia antes (o antigo ramo `@else` do `@if (editandoAtributos())` que ficava **por atributo**, dentro da mesma grade). Nenhuma classe, binding ou texto do modo leitura pode mudar.

- [ ] **Step 2: Adicionar os estilos da lista de edição**

Em `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss`, localize o bloco `.ficha-atributos { ... }` (a regra que começa com `display: flex; flex-direction: column; gap: 14px;` e tem os elementos `&__grupo`, `&__rotulo-grupo`, `&__grade`, `&--2col`). Logo **depois** do `}` que fecha esse bloco (e **antes** de `.ficha-atributo {` que vem em seguida), insira:

```scss
// Lista vertical em edição do card de Atributos (troca a grade de caixas — ver design em
// docs/superpowers/specs/2026-08-02-layout-lista-edicao-atributos-design.md): cada atributo é uma
// linha de duas sub-linhas. Reusa as classes de stepper/maestria/modificador/dados já existentes em
// `.ficha-atributo` (mod-passo, dados-passo, maestria, stepper) — só a moldura da linha é nova.
.ficha-atributos__lista {
  display: flex;
  flex-direction: column;
}

.ficha-atributo-linha {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 2px;

  // Separador fino entre atributos (substitui a borda por caixa da grade) — o primeiro item do
  // grupo não ganha borda: já é delimitado pelo rótulo do grupo acima.
  & + & {
    border-top: 1px solid var(--border);
  }

  &__principal {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__nome {
    flex: 1 1 auto;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text);
  }

  &__valor {
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    min-width: 20px;
    text-align: center;
  }

  &__secundaria {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-left: 28px; // alinha com o nome, depois da largura da estrela de Maestria

    // Mobile: empilha as duas mini-steppers só se não couberem lado a lado — desktop nunca empilha
    // (ver design, seção Responsivo).
    @include bp.mobile {
      flex-wrap: wrap;
      padding-left: 0;
    }
  }

  &__mini {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__rotulo-mini {
    font-family: var(--font-mono);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: var(--tracking-label);
    color: var(--text-dim);
  }
}

```

- [ ] **Step 3: Remover o CSS órfão do 5º atributo em edição**

No mesmo arquivo SCSS, dentro do bloco `.ficha-atributos { &--2col { .ficha-atributos__grade { @include bp.mobile { ... } } } }`, localize exatamente este trecho (dentro do `@include bp.mobile` que já existe ali):

```scss
        // m3-60 follow-up: em EDIÇÃO cada box ganha stepper de valor + estrela de Maestria + stepper
        // de modificador de teste — 3 colunas nos ~110px de sobra por box (medido ao vivo, 360px de
        // viewport) espremia esses controles quase colados, e o 5º atributo (VIG) sobrava sozinho
        // numa 2ª linha com um buraco vazio ao lado (a régua de 3 colunas não fecha 5 itens direito).
        // Volta pro mesmo 2 colunas + 5º centralizado do desktop — os boxes de edição já são
        // confortáveis nesse arranjo lá (mesma largura de coluna, ~120px).
        &.ficha-atributos__grade--edicao {
          grid-template-columns: repeat(2, minmax(0, 1fr));

          > *:nth-child(5) {
            grid-column: 1 / -1;
            justify-self: center;
            width: calc(50% - 3px);
          }
        }
```

Remova esse trecho inteiro (comentário incluído). O `@include bp.mobile { ... }` que sobra deve terminar logo depois do `> *:nth-child(5) { grid-column: auto; justify-self: stretch; width: auto; }` que já existia acima dele (esse continua — é a regra do órfão em **leitura**, que não muda).

- [ ] **Step 4: Remover o modificador `.ficha-atributo--edicao`, agora sem uso**

Ainda no mesmo arquivo, dentro do bloco `.ficha-atributo { ... }` (a regra que começa com `position: relative; display: flex; flex-direction: column; ...`), localize e remova este trecho:

```scss
  // Box em edição: valor menor (dá lugar ao stepper) + estrela de Maestria.
  &--edicao {
    gap: 7px;
    .ficha-atributo__valor {
      font-size: 18px;
      min-width: 22px;
      text-align: center;
    }
  }

```

Esse modificador só era aplicado pela antiga caixa de edição, que não existe mais (a Step 1 removeu `class="ficha-atributo ficha-atributo--edicao"` deste componente). Não afeta `ficha-criar-dialog.component.html:147`, que usa a mesma classe mas tem seu próprio `.scss` — Angular escopa estilos por componente (encapsulamento), então essa regra nunca alcançou aquele componente.

- [ ] **Step 5: Rodar a suíte de testes do frontend**

Run: `npm run test --workspace=frontend -- --watch=false`
Expected: PASS (mesmo número de specs de antes — nenhum teste novo, nenhum teste depende da marcação HTML alterada).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss
git commit -m "Redesenhar edicao de atributos como lista vertical (m3-6x)"
```

---

### Task 2: Verificação ao vivo nos dois viewports fixos (obrigatória)

> **Nota para quem executa:** esta task não é código — **não dispatch pra um subagent implementador**. É a verificação manual que fecha o critério de aceite do spec. Execute diretamente (skill `verify`), com a stack rodando de verdade.

**Files:** nenhum (só inspeção visual).

- [ ] **Step 1: Subir a stack e abrir a ficha em modo de edição de Atributos**

Use a skill `verify` do projeto para subir a stack real e navegar até uma ficha de jogador com o card de Atributos aberto em edição (`editandoAtributos() === true`).

- [ ] **Step 2: Verificar no viewport Mobile — 360×800 (Galaxy S20 FE)**

Checar, na lista de edição:
- A lista não estoura a largura do card (nenhum texto/controle vazando a borda).
- A sub-linha 2 (Mod./Dados) **empilha** quando necessário — Mod. em cima, Dados embaixo — e não fica cortada nem sobreposta.
- A estrela de Maestria e os três steppers (valor, modificador, dados) têm alvo de toque confortável (nenhum controle minúsculo/difícil de tocar).
- O grupo Físicos (5 atributos) empilha em sequência sem nenhum item "sobrando" centralizado ou com espaço vazio ao lado.

- [ ] **Step 3: Verificar no viewport Desktop — 1920×1080 (FullHD)**

Checar, na lista de edição:
- Os dois mini-steppers (Mod./Dados) continuam **sempre lado a lado**, nunca empilhados.
- A sub-linha 1 (estrela + nome + valor) usa a largura disponível sem esticar demais nem deixar vão excessivo entre nome e valor.
- O separador fino entre atributos aparece entre cada linha, sem duplicar no primeiro item do grupo.

- [ ] **Step 4: Verificar o modo leitura nos dois viewports (regressão)**

Sair do modo de edição (Cancelar ou Salvar) e conferir que a grade compacta de leitura permanece **bit-a-bit idêntica** ao que já era antes desta mudança — mesmas caixas, mesmo 5º atributo órfão centralizado no grupo Físicos (mobile e desktop), nenhuma classe nova, nenhuma diferença visual.

- [ ] **Step 5: Reportar o resultado**

Se tudo bater com os critérios acima nos dois viewports: task concluída, pronta para a revisão final de branch. Se algo divergir (estouro de largura, empilhamento errado, regressão na leitura): registrar o achado e voltar à Task 1 para ajustar o SCSS antes de prosseguir.
