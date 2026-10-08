# Preview "Ver como jogador" + Avatar no Esquadrão — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na tela de detalhe da campanha (`/painel/:id`), dar ao mestre (1) um avatar visível em cada mini-card do "Esquadrão" e (2) um jeito de alternar para ver a tela como um jogador específico veria, sem precisar de uma segunda conta.

**Architecture:** Tudo vive em `CampanhaDetalhe` (`frontend/src/app/modules/campanha/paginas/detalhe/`). O avatar é um campo a mais (`imagemUrl`, já devolvido pelo backend) renderizado no mini-card existente. O preview é um signal de apresentação (`previewJogador`) que troca qual `@if` de layout o template usa (mestre vs. jogador, um mecanismo que já existe hoje) e trava toda a interação com `pointer-events: none` enquanto ativo — não há mudança de backend, de rota nem de permissão real.

**Tech Stack:** Angular 21 (signals, `@if`/`@for` no template), SCSS (BEM `&__x`), Vitest + `TestBed` (padrão já usado em `detalhe.page.spec.ts`).

## Global Constraints

- Nenhuma mudança de backend, DTO ou endpoint — `FichaResumoDto.imagemUrl` e `CampanhaMembroResumoDto` já existem e já são buscados por esta página.
- O preview não persiste em nenhum lugar (sem query param, sem `localStorage`) — um F5 sempre volta ao estado normal de mestre.
- O preview é somente leitura: nenhuma ação (rolar, editar, excluir) deve executar de verdade enquanto ativo — via `pointer-events: none` no container de conteúdo, não via desabilitar cada handler individualmente.
- Toda a UI em português, seguindo o vocabulário já usado no arquivo (`mestre`, `jogador`, `ficha`, `campanha`).
- Seguir os padrões de teste já estabelecidos em `detalhe.page.spec.ts` (helpers `montar`, `abrirMenuCampanha`, `encontrarItemMenu`, fixtures `mestre()`/`jogador()`/`membrosDois()`/`membrosTres()`/`fichas`) — não reescrever o setup, só adicionar `describe`/`it` novos.
- Comandos de teste: `npm test` dentro de `frontend/` (builder `@angular/build:unit-test`, já configurado em `angular.json`).

---

### Task 1: Avatar nos cards do Esquadrão

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts:68-102` (interface `ItemFicha`), `:358-392` (computed `fichasPorMembro`)
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html:447-568` (bloco `.detalhe__ficha-card` dentro do `@for (ficha of fichasEsquadrao())`)
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss:1017-1041` (regras `&__ficha-card`/`&__ficha-link`, e `&__ficha-card--critico` mais abaixo)
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `FichaResumoDto.imagemUrl: string | null` (já existe, `shared/src/dtos/ficha/ficha-operacao.dtos.ts:134`).
- Produces: `ItemFicha.imagemUrl: string | null` — usado só dentro deste componente/template.

- [ ] **Step 1: Escrever o teste que falha**

Em `detalhe.page.spec.ts`, dentro do `describe('esquadrão (item 5)', ...)`, inserir o teste abaixo logo depois do teste `'mostra o aviso de Sobrecarregado só na ficha marcada'` (antes do teste `'"Nova ficha" abre o assistente de criação, sem criar de imediato'`):

```ts
    it('mostra o avatar da ficha quando ela tem imagemUrl, e o placeholder quando não tem', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [{ ...fichas[0], imagemUrl: 'https://exemplo.com/kane.png' }, fichas[1]],
      });

      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const kane = cartoes.find((c) => c.textContent?.includes('Kane'))!;
      const vera = cartoes.find((c) => c.textContent?.includes('Vera'))!;

      expect(kane.querySelector('.detalhe__ficha-avatar')).not.toBeNull();
      const imagemKane = kane.querySelector('.detalhe__ficha-avatar-imagem') as HTMLImageElement;
      expect(imagemKane).not.toBeNull();
      expect(imagemKane.getAttribute('src')).toBe('https://exemplo.com/kane.png');

      expect(vera.querySelector('.detalhe__ficha-avatar')).not.toBeNull();
      expect(vera.querySelector('.detalhe__ficha-avatar-imagem')).toBeNull();
    });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npm test`
Expected: FAIL no teste novo — `.detalhe__ficha-avatar` ainda não existe no template (`expect(kane.querySelector('.detalhe__ficha-avatar')).not.toBeNull()` recebe `null`).

- [ ] **Step 3: `ItemFicha` ganha `imagemUrl`**

Em `detalhe.page.ts`, dentro da interface `ItemFicha`:

```ts
  /** Dono da ficha — só precisou virar campo próprio no m2-19 (Esquadrão achatado, sem o loop por membro que antes dava esse dado de graça). */
  readonly usuarioId: number;
  /** URL do avatar da ficha (m3-62) — `null` sem imagem definida (cai no placeholder decorativo). */
  readonly imagemUrl: string | null;
  readonly nome: string;
```

- [ ] **Step 4: `fichasPorMembro` copia o campo**

No computed `fichasPorMembro`, no literal `item: ItemFicha`:

```ts
      const item: ItemFicha = {
        id: ficha.id,
        usuarioId: ficha.usuarioId,
        imagemUrl: ficha.imagemUrl,
        nome: ficha.nome,
```

- [ ] **Step 5: Template — avatar à esquerda, conteúdo existente à direita**

Em `detalhe.page.html`, envolver o conteúdo atual do card com o avatar. Abrir o wrapper logo após a tag do card:

```html
                <div
                  class="detalhe__ficha-card"
                  [class.detalhe__ficha-card--critico]="ficha.critico"
                  (dblclick)="abrirFichaDuploClique(campanhaAtual.id, ficha.id, $event)"
                  (auxclick)="abrirFichaCliqueDoMeio(campanhaAtual.id, ficha.id, $event)"
                >
                  <span class="detalhe__ficha-avatar" aria-hidden="true">
                    @if (ficha.imagemUrl; as urlImagem) {
                      <img class="detalhe__ficha-avatar-imagem" [src]="urlImagem" alt="" />
                    }
                  </span>
                  <div class="detalhe__ficha-conteudo">
                    <a
                      class="detalhe__ficha-link"
                      [routerLink]="['/painel', campanhaAtual.id, 'ficha', ficha.id]"
                    >
```

(o resto do conteúdo do card — topo, meta, identidade, vitais, rodapé — continua igual, só um nível mais indentado; a indentação em si é cosmética e pode ser ajustada pelo formatador do editor).

E fechar o wrapper novo antes do fechamento do card, no final do bloco (onde hoje só fecha `.detalhe__ficha-card`):

```html
                    </div>
                  }
                  </div>
                </div>
              </li>
```

(a linha `</div>` nova fecha `.detalhe__ficha-conteudo`; a linha seguinte já existente `</div>` continua fechando `.detalhe__ficha-card`).

- [ ] **Step 6: SCSS — layout em linha + avatar com placeholder**

Em `detalhe.page.scss`, trocar o bloco `&__ficha-card`/`&__ficha-link` por:

```scss
  &__ficha-card {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 10px;
    padding: 8px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: var(--accent-dim);
      border-color: var(--border-strong);
    }
  }

  // Avatar à esquerda do card (mesmo padrão visual da tela de Acervo, m3-62) — placeholder
  // listrado quando a ficha não tem `imagemUrl`, esticado pra acompanhar a altura do card
  // inteiro (que varia com a quantidade de reações/identidade exibidas).
  &__ficha-avatar {
    position: relative;
    width: 60px;
    flex: none;
    align-self: stretch;
    border-radius: var(--radius-control);
    background-color: var(--surface);
    background-image: repeating-linear-gradient(135deg, var(--border-strong) 0 3px, transparent 3px 9px);
    border: 1px solid var(--border-strong);
    overflow: hidden;
  }

  &__ficha-avatar-imagem {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__ficha-conteudo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__ficha-link {
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
  }
```

E no bloco `&__ficha-card--critico` (mais abaixo no mesmo arquivo), tingir também a moldura do avatar:

```scss
  &__ficha-card--critico {
    background: color-mix(in srgb, var(--vida) 8%, var(--surface));
    border-color: var(--vida-border);

    &:hover {
      background: color-mix(in srgb, var(--vida) 14%, var(--surface));
    }

    .detalhe__ficha-avatar {
      border-color: var(--vida-border);
    }
  }
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `cd frontend && npm test`
Expected: PASS — todos os testes existentes de `esquadrão (item 5)` continuam passando (a reestruturação não muda nenhuma classe/seletor usado por eles), mais o teste novo.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): avatar da ficha no card do Esquadrão"
```

---

### Task 2: "Ver como jogador" — escolher e entrar no preview

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts:263` (perto de `menuCampanhaAberto`), `:328-335` (perto de `ehMestre`), `:775-783` (`alternarMenuCampanha`/`fecharMenuCampanha`)
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html:48-78` (menu kebab do mestre), `:237` (gate das estatísticas), `:311` (gate da grade)
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `CampanhaMembroResumoDto { usuarioId: number; nome: string; papel: TipoCampanhaMembroPapelEnum }` (já importado), `membrosOrdenados()` (já existe), `fichasPorMembro()` (já existe), `fichaExibidaId` signal (já existe).
- Produces: signal `previewJogador: WritableSignal<CampanhaMembroResumoDto | null>`, computed `exibirComoMestre(): boolean`, computed `jogadoresDaCampanha(): readonly CampanhaMembroResumoDto[]`, signal `escolhendoPreviewJogador: WritableSignal<boolean>`, método `abrirEscolhaPreviewJogador(): void`, método `iniciarPreviewJogador(membro: CampanhaMembroResumoDto): void` — todos usados pela Task 3/4 e pelo template.

- [ ] **Step 1: Escrever os testes que falham**

No `detalhe.page.spec.ts`, adicionar um novo `describe`, logo depois do `describe('gestão de membros (m2-13)', ...)` (antes da constante `fichas`) — na verdade, como usa a fixture `fichas`, colocar **depois** da declaração de `const fichas` e do `describe('banner de alerta (item 1)', ...)`, por exemplo logo antes do `describe('tira de estatísticas (item 2)', ...)`:

```ts
  // === "Ver como jogador" (preview do mestre) ===
  describe('"Ver como jogador" (preview do mestre)', () => {
    it('não mostra a opção quando a campanha não tem jogadores', () => {
      const { fixture, raiz } = montar(mestre());

      abrirMenuCampanha(raiz, fixture);
      expect(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).toHaveLength(2);
    });

    it('mostra "Ver como jogador" como 3º item quando há jogadores na campanha', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois() });

      abrirMenuCampanha(raiz, fixture);
      expect(encontrarItemMenu(raiz, 'Ver como jogador')).not.toBeNull();
    });

    it('clicar em "Ver como jogador" lista os jogadores da campanha, com "Voltar"', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosTres() });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();

      const itens = Array.from(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).map((item) =>
        item.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(itens).toEqual(['Colega', 'Jogador', 'Voltar']);
    });

    it('"Voltar" volta pras ações normais do menu', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois() });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Voltar').click();
      fixture.detectChanges();

      const itens = Array.from(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).map((item) =>
        item.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(itens).toEqual(['Editar', 'Excluir', 'Ver como jogador']);
    });

    it('escolher um jogador troca para o layout de jogador, mostrando a ficha própria dele', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__grade')).toBeNull();
      expect(raiz.querySelector('.detalhe__jogador')).not.toBeNull();
      expect(raiz.querySelector('.card__titulo')?.textContent?.trim()).toBe('Vera');
    });

    it('escolher um jogador sem ficha mostra o estado vazio dele', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosTres(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Colega').click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
    });
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npm test`
Expected: FAIL — `encontrarItemMenu(raiz, 'Ver como jogador')` lança (item não encontrado), já que a opção ainda não existe no menu.

- [ ] **Step 3: Novos signals/computeds**

Em `detalhe.page.ts`, logo depois do computed `ehMestre` (antes de `membrosOrdenados`):

```ts
  /**
   * Membro sendo emulado pelo "Ver como jogador" — `null` fora do preview. Puro estado de
   * apresentação do cliente: nenhuma permissão real muda, o backend continua sendo a autoridade
   * (§14). Não persiste (sem query param/`localStorage`) — um F5 sempre volta ao `null`.
   */
  protected readonly previewJogador = signal<CampanhaMembroResumoDto | null>(null);

  /**
   * Decide o layout mostrado (mestre vs. jogador) — `ehMestre()` continua sendo a role real,
   * usada nas checagens de permissão de verdade; este computed é só para o template escolher
   * entre o layout de mestre e o de jogador, considerando o preview ativo.
   */
  protected readonly exibirComoMestre = computed(() => this.ehMestre() && !this.previewJogador());

  /**
   * `id` "efetivo" para checagens de exibição (dono da ficha, `minhaFichaExibida`) — o do
   * jogador emulado durante o preview, senão o do usuário real.
   */
  protected readonly usuarioIdPreview = computed(
    () => this.previewJogador()?.usuarioId ?? this.usuarioAtivoId(),
  );
```

E logo depois de `membrosOrdenados` (que já existe):

```ts
  /** Jogadores (papel `JOGADOR`) da campanha — opções do seletor "Ver como jogador". */
  protected readonly jogadoresDaCampanha = computed<readonly CampanhaMembroResumoDto[]>(() =>
    this.membrosOrdenados().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR),
  );
```

- [ ] **Step 4: Signal do 2º passo do menu + reset ao fechar**

Logo depois de `protected readonly menuCampanhaAberto = signal(false);`:

```ts
  /**
   * `true` enquanto o menu kebab do mestre mostra a lista de jogadores (2º passo de "Ver como
   * jogador"), em vez das ações normais (Editar/Excluir).
   */
  protected readonly escolhendoPreviewJogador = signal(false);
```

E em `fecharMenuCampanha`:

```ts
  protected fecharMenuCampanha(): void {
    this.menuCampanhaAberto.set(false);
    this.escolhendoPreviewJogador.set(false);
  }
```

- [ ] **Step 5: Métodos de ação**

Logo depois de `fecharMenuCampanha`:

```ts
  /** Abre a lista de jogadores da campanha dentro do menu kebab (1º passo de "Ver como jogador"). */
  protected abrirEscolhaPreviewJogador(): void {
    this.escolhendoPreviewJogador.set(true);
  }

  /**
   * Entra no preview "Ver como jogador" (2º passo): troca o layout para o do jogador escolhido e
   * mostra a ficha própria dele, se houver — mesma semeadura que `carregar` já faz para o jogador
   * real. Puramente de apresentação (ver `previewJogador`); nenhuma chamada ao backend.
   */
  protected iniciarPreviewJogador(membro: CampanhaMembroResumoDto): void {
    this.fecharMenuCampanha();
    this.previewJogador.set(membro);
    const propria = this.fichasPorMembro().get(membro.usuarioId)?.[0];
    this.fichaExibidaId.set(propria?.id ?? null);
  }
```

- [ ] **Step 6: Template — opção no menu + submenu de jogadores + gates trocados**

Em `detalhe.page.html`, no bloco do menu kebab do mestre (linhas 48-78), trocar a condição e o conteúdo do dropdown:

```html
        @if (exibirComoMestre()) {
          <div class="detalhe__cabecalho-menu-envoltorio">
            <button
              class="detalhe__cabecalho-menu-botao"
              type="button"
              aria-haspopup="menu"
              [attr.aria-expanded]="menuCampanhaAberto()"
              aria-label="Ações da campanha"
              (click)="alternarMenuCampanha()"
            >
              ⋯
            </button>
            @if (menuCampanhaAberto()) {
              <button
                class="detalhe__cabecalho-menu-fundo"
                type="button"
                aria-label="Fechar menu"
                (click)="fecharMenuCampanha()"
              ></button>
              <div class="detalhe__cabecalho-menu" role="menu">
                @if (!escolhendoPreviewJogador()) {
                  <button class="detalhe__cabecalho-menu-item" type="button" role="menuitem" (click)="abrirEdicao()">
                    <app-icone nome="editar" />
                    <span>Editar</span>
                  </button>
                  <button class="detalhe__cabecalho-menu-item" type="button" role="menuitem" (click)="pedirExclusao()">
                    <app-icone nome="excluir" />
                    <span>Excluir</span>
                  </button>
                  @if (jogadoresDaCampanha().length) {
                    <button
                      class="detalhe__cabecalho-menu-item"
                      type="button"
                      role="menuitem"
                      (click)="abrirEscolhaPreviewJogador()"
                    >
                      <app-icone nome="olho" />
                      <span>Ver como jogador</span>
                    </button>
                  }
                } @else {
                  @for (jogadorPreview of jogadoresDaCampanha(); track jogadorPreview.usuarioId) {
                    <button
                      class="detalhe__cabecalho-menu-item"
                      type="button"
                      role="menuitem"
                      (click)="iniciarPreviewJogador(jogadorPreview)"
                    >
                      <app-icone nome="protecoes" />
                      <span>{{ jogadorPreview.nome }}</span>
                    </button>
                  }
                  <button
                    class="detalhe__cabecalho-menu-item"
                    type="button"
                    role="menuitem"
                    (click)="escolhendoPreviewJogador.set(false)"
                  >
                    <app-icone nome="voltar" />
                    <span>Voltar</span>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
```

Trocar o gate das estatísticas/rolagens recentes (linha 237):

```html
    @if (exibirComoMestre()) {
      <div class="detalhe__estatisticas">
```

E o gate da grade (linha 311):

```html
    @if (exibirComoMestre()) {
    <div class="detalhe__grade">
```

Não mexer na checagem `!this.ehMestre()` dentro de `carregar()` (linha ~743) — ela só roda no carregamento inicial da página para um jogador de verdade (o preview nunca está ativo nesse momento, já que é um estado só alcançável clicando no menu depois da página carregada).

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `cd frontend && npm test`
Expected: PASS em todos os testes, incluindo os novos.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): mestre pode entrar no preview \"Ver como jogador\""
```

---

### Task 3: Barra de saída + bloqueio de interação

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts` (perto de `iniciarPreviewJogador`, Task 2)
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html:28-30` (abertura do `@else if`) e `:753-757` (fechamento)
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss` (perto de `&__banner-link`, por volta da linha 262)
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `previewJogador` signal, `fichaExibidaId`/`fichaExibidaDados` signals (Task 2 / já existentes).
- Produces: método `sairPreviewJogador(): void`.

- [ ] **Step 1: Escrever os testes que falham**

No `describe('"Ver como jogador" (preview do mestre)', ...)` criado na Task 2, adicionar:

```ts
    it('mostra a barra de "Visualizando como X" e trava a interação do conteúdo', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      const barra = raiz.querySelector('.detalhe__preview-barra');
      expect(barra?.textContent).toContain('Visualizando como');
      expect(barra?.textContent).toContain('Jogador');

      const conteudo = raiz.querySelector('.detalhe__conteudo');
      expect(conteudo?.classList.contains('detalhe__conteudo--bloqueado')).toBe(true);
    });

    it('"Sair da visualização" volta ao layout de mestre', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      (raiz.querySelector('.detalhe__preview-sair') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__preview-barra')).toBeNull();
      expect(raiz.querySelector('.detalhe__grade')).not.toBeNull();
      expect(raiz.querySelector('.detalhe__jogador')).toBeNull();
    });

    it('a área de conteúdo não fica travada fora do preview', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      expect(raiz.querySelector('.detalhe__conteudo')?.classList.contains('detalhe__conteudo--bloqueado')).toBe(
        false,
      );
    });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npm test`
Expected: FAIL — `.detalhe__preview-barra`/`.detalhe__conteudo` ainda não existem no template.

- [ ] **Step 3: Método `sairPreviewJogador`**

Em `detalhe.page.ts`, logo depois de `iniciarPreviewJogador`:

```ts
  /** Sai do preview "Ver como jogador" e volta ao layout de mestre. */
  protected sairPreviewJogador(): void {
    this.previewJogador.set(null);
    this.fichaExibidaId.set(null);
    this.fichaExibidaDados.set(null);
  }
```

- [ ] **Step 4: Template — banner fora do bloqueio + wrapper travado**

Em `detalhe.page.html`, na abertura do bloco (linhas 28-29 atuais):

```html
  } @else if (campanha(); as campanhaAtual) {
    @if (previewJogador(); as jogadorPreview) {
      <div class="detalhe__preview-barra" role="status">
        <app-icone nome="olho" />
        <span class="detalhe__preview-texto">
          Visualizando como <strong>{{ jogadorPreview.nome }}</strong> · somente leitura
        </span>
        <button
          class="botao botao--secundario detalhe__preview-sair"
          type="button"
          (click)="sairPreviewJogador()"
        >
          Sair da visualização
        </button>
      </div>
    }
    <div class="detalhe__conteudo" [class.detalhe__conteudo--bloqueado]="previewJogador() !== null">
    <header class="detalhe__cabecalho">
```

E no fechamento (linhas 753-757 atuais):

```html
      </div>
    </div>
    }
    </div>
  }
</section>
```

(a nova linha `</div>` fecha `.detalhe__conteudo`, logo antes do `}` que já fechava o `@else if`).

- [ ] **Step 5: SCSS — barra + travamento**

Em `detalhe.page.scss`, logo depois do bloco `&__banner-link` (que termina com a media query `bp.mobile` por volta da linha 262) e antes do comentário `// === Tira de estatísticas`:

```scss
  // === "Ver como jogador" (preview do mestre) — barra fixa fora do container travado (continua
  // clicável) + o container em si, que trava toda a interação (`pointer-events: none`) enquanto
  // o preview está ativo. Puro CSS: nenhum handler precisa checar o preview individualmente.
  &__preview-barra {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    padding: 10px 16px;
    background: var(--accent-dim);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-control);
    color: var(--accent);
  }

  &__preview-texto {
    flex: 1;
    min-width: 0;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text);
  }

  &__preview-sair {
    flex: none;
  }

  &__conteudo--bloqueado {
    pointer-events: none;
    opacity: 0.92;
  }
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd frontend && npm test`
Expected: PASS em todos os testes.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): barra de saída e bloqueio de interação no preview de jogador"
```

---

### Task 4: Fidelidade de permissão durante o preview

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts` (`podeAjustarFicha`, `minhaFichaExibida`)
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `exibirComoMestre()`, `usuarioIdPreview()` (Task 2).
- Produces: nenhuma interface nova — só corrige o comportamento de `podeAjustarFicha`/`minhaFichaExibida` já existentes.

- [ ] **Step 1: Escrever o teste que falha**

No `describe('"Ver como jogador" (preview do mestre)', ...)`, adicionar:

```ts
    it('permissão de edição no preview segue o jogador emulado, não o mestre real', () => {
      const fichasComColega: FichaResumoDto[] = [
        fichas[0],
        fichas[1],
        { ...fichas[1], id: 6, usuarioId: 3, nome: 'Rex' },
      ];
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosTres(), fichas: fichasComColega });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      // Ficha própria (Vera, do "Jogador" emulado, usuarioId 2): ações de dono habilitadas.
      abrirMenuCampanha(raiz, fixture);
      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(false);

      // Troca pra ficha de um colega (Rex, usuarioId 3, via "Ver ficha" na Equipe): sem ações de dono.
      const botaoRex = Array.from(raiz.querySelectorAll('.detalhe__equipe-ficha')).find((botao) =>
        botao.textContent?.includes('Rex'),
      ) as HTMLButtonElement;
      botaoRex.click();
      fixture.detectChanges();

      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(true);
    });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npm test`
Expected: FAIL na última asserção — hoje `podeAjustarFicha`/`minhaFichaExibida` usam a role/`id` reais do mestre, então "Excluir ficha" continua habilitado mesmo na ficha do colega.

- [ ] **Step 3: `podeAjustarFicha` usa o par mestre/`id` efetivos**

Em `detalhe.page.ts`:

```ts
  protected podeAjustarFicha(usuarioIdDono: number): boolean {
    return this.exibirComoMestre() || usuarioIdDono === this.usuarioIdPreview();
  }
```

- [ ] **Step 4: `minhaFichaExibida` usa o `id` efetivo**

```ts
  protected readonly minhaFichaExibida = computed<FichaRecuperadaDto | null>(() => {
    const fichaExibida = this.fichaExibidaDados();
    return fichaExibida && fichaExibida.usuarioId === this.usuarioIdPreview() ? fichaExibida : null;
  });
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd frontend && npm test`
Expected: PASS em todos os testes — inclusive os já existentes que usam `podeAjustarFicha`/`minhaFichaExibida` fora do preview (comportamento idêntico ao anterior nesse caso, já que `exibirComoMestre() === ehMestre()` e `usuarioIdPreview() === usuarioAtivoId()` quando `previewJogador()` é `null`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "fix(campanha): permissão de exibição no preview segue o jogador emulado"
```

---

## Verificação manual final (após as 4 tasks)

Seguir a skill `/verify` com o stack completo (Postgres + NestJS + Angular) rodando, logado como mestre numa campanha com pelo menos um jogador com ficha (com e sem avatar):

1. Conferir que os cards do Esquadrão mostram avatar (ou placeholder) à esquerda, com o resto das informações intacto à direita.
2. Abrir o menu kebab, clicar "Ver como jogador", escolher um jogador — confirmar troca de layout, barra de aviso no topo, e que nada é clicável na área de conteúdo.
3. Clicar "Sair da visualização" — confirmar volta ao layout de mestre.
4. Repetir o passo 2 e dar F5 — confirmar que a página volta ao modo mestre normal (preview não sobrevive ao reload).
