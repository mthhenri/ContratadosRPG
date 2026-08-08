# Ações de ficha no menu do jogador (painel de campanha) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer "Remover da campanha", "Excluir ficha" e "Acesso de visualização" — hoje só acessíveis pelo kebab por-mini-card do mestre ou pela ficha completa — para o menu "⋯" do jogador em `/painel/:id`, agindo sobre a ficha exibida na coluna principal.

**Architecture:** Tudo em `frontend/src/app/modules/campanha/paginas/detalhe/` (`detalhe.page.ts`/`.html`/`.scss`). Sem componente novo, sem endpoint novo — reusa `FichaService` (`atribuirCampanha`, `excluirFicha`, `listarAcessos`, `concederAcesso`, `revogarAcesso`) e os métodos que já existem no kebab por-mini-card (`removerDaCampanha`, `pedirExcluirFicha`, `confirmarExcluirFicha`). A dialog de "Acesso de visualização" duplica o padrão já usado em `visualizar.page.ts` (mesma API), sem extração de componente — o design (`docs/superpowers/specs/2026-08-08-painel-jogador-acoes-ficha-design.md`) documenta essa escolha.

**Tech Stack:** Angular 21 (signals, `@if`/`@for` control flow, Reactive Forms), Vitest (`ng test --runner vitest`), SCSS com tokens do tema "Terminal de Contenção".

## Global Constraints

- Nomenclatura, comentários e strings de UI em português, no estilo já usado no arquivo (comentários curtos, só quando o "porquê" não é óbvio).
- SCSS só com tokens do tema (`var(--...)`) — proibição #29 do projeto. Nenhuma cor/tamanho hardcoded fora dos já usados nos blocos copiados.
- Nenhum endpoint backend novo. Nenhuma mudança em `visualizar.page.ts`/`.html`/`.scss` nem no menu/kebab do **mestre**.
- Cada task termina com `npx ng test --include=src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts --watch=false` rodado de dentro de `frontend/`, 100% verde.

---

## Task 1: "Remover da campanha" / "Excluir ficha" no menu do cabeçalho do jogador

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss`
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Produces: `protected readonly minhaFichaExibida: Signal<FichaRecuperadaDto | null>` (computed) — ficha exibida quando `usuarioId === usuarioAtivoId()`, senão `null`. Consumida pelo `[disabled]` dos itens de menu (aqui e na Task 2) e por `membrosElegiveisAcesso` (Task 2).
- Produces: `private avancarFichaExibidaApos(fichaRemovidaId: number): void` — se `fichaExibidaId()` era a ficha removida, aponta para outra ficha própria restante ou limpa a seleção. Chamado por `removerDaCampanha`/`confirmarExcluirFicha` (aqui) — nenhuma outra task depende dele diretamente.
- Consumes: `removerDaCampanha(fichaId: number)`, `pedirExcluirFicha(fichaId: number, fichaNome: string)`, `confirmarExcluirFicha()`, `fecharMenuCampanha()` — já existem no arquivo (m3-52/item 6), só ganham 2-3 linhas cada.

- [ ] **Step 1: Escrever os testes que falham**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`, adicione o helper `encontrarItemMenu` logo abaixo da função `abrirMenuCampanha` (por volta da linha 216):

```ts
  function encontrarItemMenu(raiz: HTMLElement, texto: string): HTMLButtonElement {
    const item = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__cabecalho-menu-item')).find(
      (botao) => botao.textContent?.replace(/\s+/g, ' ').trim().includes(texto),
    );
    if (!item) {
      throw new Error(`Item de menu "${texto}" não encontrado`);
    }
    return item;
  }
```

Substitua o teste `'dá ao jogador o kebab de ficha, nunca o de campanha (Editar/Excluir)'` (dentro de `describe('menu de ações da campanha (item 6)', ...)`, por volta da linha 250) por:

```ts
    it('dá ao jogador o kebab de ficha, nunca o de campanha (Editar/Excluir)', () => {
      const { fixture, raiz } = montar(jogador());
      const botao = raiz.querySelector('.detalhe__cabecalho-menu-botao');
      expect(botao?.getAttribute('aria-label')).toBe('Ações de ficha');

      abrirMenuCampanha(raiz, fixture);
      const itens = Array.from(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).map((item) =>
        item.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(itens).toEqual([
        'Criar nova ficha',
        'Vincular ficha existente',
        'Remover da campanha',
        'Excluir ficha',
      ]);
    });
```

Adicione um novo `describe`, depois do bloco `describe('visão do jogador (m2-20)', ...)` (fecha por volta da linha 1312, antes do `});` final do arquivo):

```ts
  // === Ações de ficha no menu do cabeçalho do jogador — remover/excluir agem sobre a ficha
  // exibida na coluna principal, não sobre uma ficha escolhida no menu (que não existe aqui). ===
  describe('ações de ficha no menu do jogador (remover/excluir)', () => {
    it('desabilita "Remover da campanha"/"Excluir ficha" quando a ficha exibida é de um colega, habilita na própria', () => {
      const { fixture, raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);

      expect(encontrarItemMenu(raiz, 'Remover da campanha').disabled).toBe(false);
      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(false);

      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      );
      botaoKane?.click();
      fixture.detectChanges();

      expect(encontrarItemMenu(raiz, 'Remover da campanha').disabled).toBe(true);
      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(true);
    });

    it('"Remover da campanha" age sobre a ficha exibida, fecha o menu e troca para outra ficha própria', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Remover da campanha').click();
      fixture.detectChanges();

      // Ficha exibida inicial é Vera (id 4, primeira própria de `usuarioId: 2`).
      expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
      // Zeta (id 5) é a outra ficha própria restante — o painel troca para ela sozinho.
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
    });

    it('"Remover da campanha" sem outra ficha própria restante cai no estado vazio do jogador', () => {
      const { fixture, raiz, fichaService } = montar({
        usuarioId: 2,
        membros: membrosDois(),
        fichas: fichas.filter((ficha) => ficha.id !== 5),
      });
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Remover da campanha').click();
      fixture.detectChanges();

      expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
      expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
    });

    it('"Excluir ficha" abre a confirmação da ficha exibida e fecha o menu; cancelar não chama o serviço', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Excluir ficha').click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
      const dialog = raiz.querySelector('.dialogo');
      expect(dialog?.textContent).toContain('Vera');
      expect(fichaService.excluirFicha).not.toHaveBeenCalled();

      (raiz.querySelector('.dialogo .botao--secundario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(fichaService.excluirFicha).not.toHaveBeenCalled();
    });

    it('confirmar "Excluir ficha" chama FichaService.excluirFicha e troca para outra ficha própria', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Excluir ficha').click();
      fixture.detectChanges();

      (raiz.querySelector('.dialogo .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.excluirFicha).toHaveBeenCalledWith(4);
      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
    });
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

De dentro de `frontend/`:

```bash
npx ng test --include=src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts --watch=false
```

Esperado: FAIL — o teste `'dá ao jogador o kebab de ficha...'` falha porque a lista real ainda é só `['Criar nova ficha', 'Vincular ficha existente']`, e os 5 testes novos do `describe('ações de ficha no menu do jogador...')` falham porque `encontrarItemMenu` lança `Item de menu "Remover da campanha" não encontrado` (os botões ainda não existem no template).

- [ ] **Step 3: Implementar `minhaFichaExibida` e `avancarFichaExibidaApos`**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`, logo depois do computed `podeAjustarFichaExibida` (por volta da linha 463):

```ts
  /**
   * Ficha exibida quando ela é sua (dono) — controla o `[disabled]` das ações de ficha do menu do
   * cabeçalho do jogador (remover da campanha/excluir/acesso de visualização): elas só fazem
   * sentido para a própria ficha, nunca para a de um colega vista via "Ver ficha".
   */
  protected readonly minhaFichaExibida = computed<FichaRecuperadaDto | null>(() => {
    const fichaExibida = this.fichaExibidaDados();
    return fichaExibida && fichaExibida.usuarioId === this.usuarioAtivoId() ? fichaExibida : null;
  });
```

Logo antes do método `removerDaCampanha` (por volta da linha 1134, depois do comentário que fecha o parágrafo de `removerDaCampanha`), adicione o helper privado:

```ts
  /**
   * Depois de remover/excluir a ficha exibida (`fichaExibidaId`), aponta para outra ficha própria
   * restante na campanha, se houver, ou limpa a seleção — o template cai no estado vazio do
   * jogador. Não faz nada se a ficha removida não era a exibida (ação vinda do kebab do mestre,
   * onde `fichaExibidaId` nunca é setado).
   */
  private avancarFichaExibidaApos(fichaRemovidaId: number): void {
    if (this.fichaExibidaId() !== fichaRemovidaId) {
      return;
    }
    const restante = this.fichas().find((ficha) => ficha.usuarioId === this.usuarioAtivoId());
    if (restante) {
      this.fichaExibidaId.set(restante.id);
    } else {
      this.fichaExibidaId.set(null);
      this.fichaExibidaDados.set(null);
    }
  }
```

- [ ] **Step 4: Ligar `removerDaCampanha`/`pedirExcluirFicha`/`confirmarExcluirFicha` ao menu do cabeçalho**

Em `detalhe.page.ts`, troque:

```ts
  protected removerDaCampanha(fichaId: number): void {
    this.fecharMenuFicha();
    if (this.removendo() !== null) {
      return;
    }
    this.removendo.set(fichaId);
    this.fichaService
      .atribuirCampanha(fichaId, null)
      .pipe(finalize(() => this.removendo.set(null)))
      .subscribe({
        next: () => {
          this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId));
        },
      });
  }
```

por:

```ts
  protected removerDaCampanha(fichaId: number): void {
    this.fecharMenuFicha();
    this.fecharMenuCampanha();
    if (this.removendo() !== null) {
      return;
    }
    this.removendo.set(fichaId);
    this.fichaService
      .atribuirCampanha(fichaId, null)
      .pipe(finalize(() => this.removendo.set(null)))
      .subscribe({
        next: () => {
          this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== fichaId));
          this.avancarFichaExibidaApos(fichaId);
        },
      });
  }
```

Troque:

```ts
  protected pedirExcluirFicha(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    this.confirmandoExcluirFicha.set({ id: fichaId, nome: fichaNome });
  }
```

por:

```ts
  protected pedirExcluirFicha(fichaId: number, fichaNome: string): void {
    this.fecharMenuFicha();
    this.fecharMenuCampanha();
    this.confirmandoExcluirFicha.set({ id: fichaId, nome: fichaNome });
  }
```

Troque:

```ts
  protected confirmarExcluirFicha(): void {
    const pendente = this.confirmandoExcluirFicha();
    if (!pendente || this.excluindoFicha() !== null) {
      return;
    }
    this.excluindoFicha.set(pendente.id);
    this.fichaService
      .excluirFicha(pendente.id)
      .pipe(finalize(() => this.excluindoFicha.set(null)))
      .subscribe({
        next: () => {
          this.confirmandoExcluirFicha.set(null);
          this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== pendente.id));
        },
      });
  }
```

por:

```ts
  protected confirmarExcluirFicha(): void {
    const pendente = this.confirmandoExcluirFicha();
    if (!pendente || this.excluindoFicha() !== null) {
      return;
    }
    this.excluindoFicha.set(pendente.id);
    this.fichaService
      .excluirFicha(pendente.id)
      .pipe(finalize(() => this.excluindoFicha.set(null)))
      .subscribe({
        next: () => {
          this.confirmandoExcluirFicha.set(null);
          this.fichas.update((lista) => lista.filter((ficha) => ficha.id !== pendente.id));
          this.avancarFichaExibidaApos(pendente.id);
        },
      });
  }
```

- [ ] **Step 5: Adicionar os dois itens no menu do cabeçalho do jogador**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`, dentro do bloco `@else` do menu do jogador (por volta da linha 103-122), depois do botão "Vincular ficha existente" e antes do `</div>` que fecha `.detalhe__cabecalho-menu`:

```html
                <button
                  class="detalhe__cabecalho-menu-item"
                  type="button"
                  role="menuitem"
                  [disabled]="!minhaFichaExibida() || removendo() === minhaFichaExibida()?.id"
                  (click)="removerDaCampanha(minhaFichaExibida()!.id)"
                >
                  <app-icone nome="voltar" />
                  <span>
                    {{ removendo() === minhaFichaExibida()?.id ? 'Removendo…' : 'Remover da campanha' }}
                  </span>
                </button>
                <button
                  class="detalhe__cabecalho-menu-item"
                  type="button"
                  role="menuitem"
                  [disabled]="!minhaFichaExibida()"
                  (click)="pedirExcluirFicha(minhaFichaExibida()!.id, minhaFichaExibida()!.nome)"
                >
                  <app-icone nome="excluir" />
                  <span>Excluir ficha</span>
                </button>
```

- [ ] **Step 6: Estilo do estado desabilitado no item de menu**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss`, dentro do bloco `&__cabecalho-menu-item` (por volta da linha 173-197), troque:

```scss
    &:hover {
      background: var(--surface-2);
      color: var(--accent);
    }

    @include bp.mobile {
      min-height: bp.$alvo-toque;
    }
  }
```

(a ocorrência dentro de `&__cabecalho-menu-item`, não a de `&__cabecalho-menu-botao` logo acima) por:

```scss
    &:hover:not(:disabled) {
      background: var(--surface-2);
      color: var(--accent);
    }

    &:disabled {
      opacity: 0.55;
      cursor: default;
    }

    @include bp.mobile {
      min-height: bp.$alvo-toque;
    }
  }
```

- [ ] **Step 7: Rodar os testes e confirmar que passam**

```bash
npx ng test --include=src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts --watch=false
```

Esperado: PASS — todos os testes existentes continuam verdes, mais os 6 novos/atualizados deste step.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): remover/excluir ficha no menu do jogador, sobre a ficha exibida"
```

---

## Task 2: "Acesso de visualização" no menu do cabeçalho do jogador

**Files:**
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`
- Modify: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss`
- Test: `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`

**Interfaces:**
- Consumes: `minhaFichaExibida` (Task 1) — controla `[disabled]` do item e é a fonte do `fichaId` passado a `listarAcessos`/`concederAcesso`/`revogarAcesso`. `membros` (signal privado já existente) e `usuarioAtivoId` (computed já existente).
- Produces: `protected readonly dialogAcessoFicha: Signal<boolean>`, `protected readonly acessosFichaExibida: Signal<readonly FichaAcessoResumoDto[]>`, `protected readonly membroParaConcederAcesso: FormControl<number | null>`, `protected readonly concedendoAcesso: Signal<boolean>`, `protected readonly revogandoAcesso: Signal<number | null>`, `protected readonly membrosElegiveisAcesso: Signal<readonly CampanhaMembroResumoDto[]>`, `protected abrirAcessoFicha(): void`, `protected fecharAcessoFicha(): void`, `protected concederAcessoFicha(): void`, `protected revogarAcessoFicha(usuarioId: number): void` — nenhuma outra task depende deles.

- [ ] **Step 1: Escrever os testes que falham**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`, adicione `FichaAcessoResumoDto` ao import de tipos de ficha (linha 17):

```ts
import type { FichaAcessoResumoDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
```

No objeto `fichaService` dentro de `montar()` (por volta da linha 136-137, logo depois de `atribuirCampanha`), adicione:

```ts
      listarAcessos: vi.fn(() => of([] as FichaAcessoResumoDto[])),
      concederAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ id: 1, fichaId, usuarioId })),
      revogarAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ fichaId, usuarioId })),
```

Depois de `membrosDois` (por volta da linha 211), adicione um terceiro membro elegível para os testes de concessão (o mestre e o próprio dono nunca são elegíveis):

```ts
  // Campanha com mestre + dois jogadores — base dos testes de "Acesso de visualização" (só o
  // 3º membro é elegível a receber acesso da ficha do jogador `usuarioId: 2`: o mestre já vê tudo,
  // e o próprio dono não concede acesso a si mesmo).
  const membrosTres = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { usuarioId: 3, nome: 'Colega', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
  ];
```

Atualize (de novo) o teste `'dá ao jogador o kebab de ficha, nunca o de campanha (Editar/Excluir)'` para incluir o novo item, na posição entre "Vincular ficha existente" e "Remover da campanha":

```ts
      expect(itens).toEqual([
        'Criar nova ficha',
        'Vincular ficha existente',
        'Acesso de visualização',
        'Remover da campanha',
        'Excluir ficha',
      ]);
```

No `describe('ações de ficha no menu do jogador (remover/excluir)', ...)` adicionado na Task 1, acrescente estes testes (pode renomear o `describe` para `'ações de ficha no menu do jogador (remover/excluir/acesso)'`):

```ts
    it('desabilita "Acesso de visualização" quando a ficha exibida é de um colega, habilita na própria', () => {
      const { fixture, raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);
      expect(encontrarItemMenu(raiz, 'Acesso de visualização').disabled).toBe(false);

      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      );
      botaoKane?.click();
      fixture.detectChanges();

      expect(encontrarItemMenu(raiz, 'Acesso de visualização').disabled).toBe(true);
    });

    it('"Acesso de visualização" abre a dialog, busca e lista as concessões da ficha exibida, e fecha o menu', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      expect(fichaService.listarAcessos).toHaveBeenCalledWith(4);
      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
      const dialog = raiz.querySelector('.dialogo');
      expect(dialog?.textContent).toContain('Colega');
    });

    it('a lista de membros elegíveis exclui o mestre, o próprio dono e quem já tem acesso', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      const opcoes = Array.from(raiz.querySelectorAll('.acesso__select option')).map((opcao) =>
        opcao.textContent?.trim(),
      );
      expect(opcoes).toEqual(['Selecione um membro…']);
      expect(raiz.querySelector('.acesso__vazio-elegiveis')).not.toBeNull();
    });

    it('conceder acesso chama FichaService.concederAcesso e recarrega a lista', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      const seletor = raiz.querySelector('.acesso__select') as HTMLSelectElement;
      seletor.value = '3';
      seletor.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      (raiz.querySelector('.acesso__acao') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.concederAcesso).toHaveBeenCalledWith(4, 3);
      expect(fichaService.listarAcessos).toHaveBeenCalledTimes(2);
    });

    it('revogar acesso chama FichaService.revogarAcesso e recarrega a lista', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      (raiz.querySelector('.acesso__revogar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.revogarAcesso).toHaveBeenCalledWith(4, 3);
      expect(fichaService.listarAcessos).toHaveBeenCalledTimes(2);
    });

    it('mostra a contagem de acessos concedidos no item do menu', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();
      (raiz.querySelector('.dialogo__fundo') as HTMLButtonElement).click();
      fixture.detectChanges();
      abrirMenuCampanha(raiz, fixture);

      const contagem = encontrarItemMenu(raiz, 'Acesso de visualização').querySelector(
        '.detalhe__cabecalho-menu-contagem',
      );
      expect(contagem?.textContent?.trim()).toBe('1');
    });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
npx ng test --include=src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts --watch=false
```

Esperado: FAIL — o teste dos itens do menu falha (falta "Acesso de visualização" na lista) e os 6 testes novos falham em `encontrarItemMenu(raiz, 'Acesso de visualização')` (`Item de menu "Acesso de visualização" não encontrado`).

- [ ] **Step 3: Implementar os signals, o computed e os métodos**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts`, troque o import de forms (linha 13):

```ts
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
```

por:

```ts
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
```

Troque o import de tipos de ficha (linha 21):

```ts
import type { FichaRecuperadaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
```

por:

```ts
import type { FichaAcessoResumoDto, FichaRecuperadaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
```

Logo depois do computed `minhaFichaExibida` (adicionado na Task 1), adicione:

```ts
  /** Dialog "Acesso de visualização" da ficha exibida (menu do cabeçalho do jogador) aberta. */
  protected readonly dialogAcessoFicha = signal(false);
  /** Concessões ativas da ficha exibida — carregadas ao abrir a dialog e após conceder/revogar. */
  protected readonly acessosFichaExibida = signal<readonly FichaAcessoResumoDto[]>([]);
  /** Membro selecionado para receber acesso (Reactive Forms — sem `ngModel`). */
  protected readonly membroParaConcederAcesso = new FormControl<number | null>(null);
  protected readonly concedendoAcesso = signal(false);
  /** `usuarioId` cuja revogação está em voo — desabilita só a linha correspondente. */
  protected readonly revogandoAcesso = signal<number | null>(null);

  /**
   * Membros elegíveis a receber acesso à ficha exibida: exclui o mestre (já vê tudo), o próprio
   * dono (é sempre `usuarioAtivoId()` aqui — `minhaFichaExibida` só existe pra própria ficha) e
   * quem já tem concessão ativa. Mesma regra de `membrosElegiveis` de `visualizar.page.ts`.
   */
  protected readonly membrosElegiveisAcesso = computed<readonly CampanhaMembroResumoDto[]>(() => {
    const jaConcedido = new Set(this.acessosFichaExibida().map((acesso) => acesso.usuarioId));
    return this.membros().filter(
      (membro) =>
        membro.usuarioId !== this.usuarioAtivoId() &&
        membro.papel !== TipoCampanhaMembroPapelEnum.MESTRE &&
        !jaConcedido.has(membro.usuarioId),
    );
  });
```

No fim da classe `CampanhaDetalhe`, logo antes do `}` final (depois de `confirmarExcluirFicha`), adicione:

```ts

  /**
   * Abre a dialog "Acesso de visualização" da ficha exibida (menu do cabeçalho do jogador) e busca
   * as concessões atuais — mesma API de `visualizar.page.ts` (`listarAcessos`), escopada à ficha
   * exibida em vez do `fichaId` de rota.
   */
  protected abrirAcessoFicha(): void {
    const ficha = this.minhaFichaExibida();
    if (!ficha) {
      return;
    }
    this.fecharMenuCampanha();
    this.membroParaConcederAcesso.setValue(null);
    this.dialogAcessoFicha.set(true);
    this.carregarAcessosFichaExibida(ficha.id);
  }

  /** Fecha a dialog "Acesso de visualização". */
  protected fecharAcessoFicha(): void {
    this.dialogAcessoFicha.set(false);
  }

  /** (Re)carrega as concessões ativas da ficha exibida — usado ao abrir e após conceder/revogar. */
  private carregarAcessosFichaExibida(fichaId: number): void {
    this.fichaService
      .listarAcessos(fichaId)
      .subscribe({ next: (acessos) => this.acessosFichaExibida.set(acessos) });
  }

  /** Concede a visualização da ficha exibida ao membro selecionado e recarrega a lista. */
  protected concederAcessoFicha(): void {
    const ficha = this.minhaFichaExibida();
    const usuarioId = this.membroParaConcederAcesso.value;
    if (!ficha || usuarioId === null || this.concedendoAcesso()) {
      return;
    }
    this.concedendoAcesso.set(true);
    this.fichaService
      .concederAcesso(ficha.id, usuarioId)
      .pipe(finalize(() => this.concedendoAcesso.set(false)))
      .subscribe({
        next: () => {
          this.membroParaConcederAcesso.setValue(null);
          this.carregarAcessosFichaExibida(ficha.id);
        },
      });
  }

  /** Revoga a visualização da ficha exibida de um membro e recarrega a lista. */
  protected revogarAcessoFicha(usuarioId: number): void {
    const ficha = this.minhaFichaExibida();
    if (!ficha || this.revogandoAcesso() !== null) {
      return;
    }
    this.revogandoAcesso.set(usuarioId);
    this.fichaService
      .revogarAcesso(ficha.id, usuarioId)
      .pipe(finalize(() => this.revogandoAcesso.set(null)))
      .subscribe({
        next: () => this.carregarAcessosFichaExibida(ficha.id),
      });
  }
```

- [ ] **Step 4: Adicionar o item de menu e a dialog no template**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html`, insira este botão **antes** do botão "Remover da campanha" adicionado na Task 1 (ou seja, logo depois de "Vincular ficha existente"):

```html
                <button
                  class="detalhe__cabecalho-menu-item"
                  type="button"
                  role="menuitem"
                  [disabled]="!minhaFichaExibida()"
                  (click)="abrirAcessoFicha()"
                >
                  <app-icone nome="olho" />
                  <span>Acesso de visualização</span>
                  @if (acessosFichaExibida().length) {
                    <span class="detalhe__cabecalho-menu-contagem">{{ acessosFichaExibida().length }}</span>
                  }
                </button>
```

No fim do arquivo, depois do bloco `@if (confirmandoExcluirFicha(); as pendenteExcluir) { ... }` (a última dialog do arquivo), adicione:

```html

@if (dialogAcessoFicha()) {
  <div class="dialogo" role="dialog" aria-modal="true" aria-label="Acesso de visualização">
    <button class="dialogo__fundo" type="button" aria-label="Fechar" (click)="fecharAcessoFicha()"></button>
    <div class="dialogo__painel acesso">
      <header class="dialogo__cabecalho">
        <span class="card__indice"><app-icone nome="olho" /></span>
        <h2 class="dialogo__titulo">Acesso de Visualização</h2>
        <span class="card__regua"></span>
        <button class="dialogo__fechar" type="button" aria-label="Fechar" (click)="fecharAcessoFicha()">
          ✕
        </button>
      </header>

      <p class="acesso__ajuda">
        Conceda a visualização desta ficha a outros membros da campanha. Eles poderão vê-la, mas não
        editá-la; você pode revogar a qualquer momento.
      </p>

      <div class="acesso__conceder">
        <select
          class="acesso__select"
          aria-label="Membro para conceder acesso"
          [formControl]="membroParaConcederAcesso"
        >
          <option [ngValue]="null" disabled>Selecione um membro…</option>
          @for (membro of membrosElegiveisAcesso(); track membro.usuarioId) {
            <option [ngValue]="membro.usuarioId">{{ membro.nome }}</option>
          }
        </select>
        <button
          class="botao botao--primario acesso__acao"
          type="button"
          [disabled]="membroParaConcederAcesso.value === null || concedendoAcesso()"
          (click)="concederAcessoFicha()"
        >
          <app-icone nome="mais" />
          {{ concedendoAcesso() ? 'Concedendo…' : 'Conceder' }}
        </button>
      </div>

      @if (membrosElegiveisAcesso().length === 0) {
        <p class="acesso__vazio-elegiveis">Nenhum outro membro disponível para conceder acesso.</p>
      }

      @if (acessosFichaExibida().length) {
        <ul class="acesso__lista">
          @for (acesso of acessosFichaExibida(); track acesso.usuarioId) {
            <li class="acesso__item">
              <span class="acesso__avatar" aria-hidden="true"></span>
              <span class="acesso__nome">{{ acesso.nome }}</span>
              <button
                class="botao botao--secundario acesso__revogar"
                type="button"
                [disabled]="revogandoAcesso() !== null"
                (click)="revogarAcessoFicha(acesso.usuarioId)"
              >
                <app-icone nome="excluir" />
                {{ revogandoAcesso() === acesso.usuarioId ? 'Revogando…' : 'Revogar' }}
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="acesso__vazio">Nenhum acesso concedido ainda.</p>
      }
    </div>
  </div>
}
```

- [ ] **Step 5: Estilo da contagem no menu e do painel de acesso**

Em `frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss`, logo depois do bloco `&__cabecalho-menu-item` (já com o `&:disabled` da Task 1), adicione dentro do mesmo bloco pai (`.detalhe`):

```scss
  &__cabecalho-menu-contagem {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-mute);
  }
```

Logo depois do bloco `.dialogo { ... }` (por volta da linha 1741, onde fecha a chave do `.dialogo`), adicione (copiado de `frontend/src/app/modules/ficha/paginas/visualizar/visualizar.page.scss`, mesma nota de duplicação por view encapsulation já usada no comentário do `.dialogo` acima):

```scss

// === Painel "Acesso de visualização" (dentro de `.dialogo__painel.acesso`) — mesmo bloco de
// `visualizar.page.scss`, copiado aqui (view encapsulation não deixa reusar o `.scss` de outro
// componente). ===
.acesso {
  &__ajuda {
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-dim);
    margin: 0 0 16px;
  }

  &__conceder {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  &__select {
    flex: 1;
    min-width: 200px;
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    padding: 11px 12px;
    font-family: var(--font-sans);
    font-size: 14px;
    outline: none;

    &:focus {
      border-color: var(--accent-border);
    }
  }

  &__acao {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 11px 18px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__vazio-elegiveis,
  &__vazio {
    font-family: var(--font-sans);
    font-size: 13px;
    font-style: italic;
    color: var(--text-mute);
    margin: 12px 0 0;
  }

  &__lista {
    list-style: none;
    margin: 16px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
  }

  &__avatar {
    width: 30px;
    height: 30px;
    flex: none;
    border-radius: var(--radius-control);
    background-color: var(--surface-2);
    background-image: repeating-linear-gradient(135deg, var(--border-strong) 0 3px, transparent 3px 9px);
    border: 1px solid var(--border-strong);
  }

  &__nome {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  &__revogar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex: none;
  }
}
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

```bash
npx ng test --include=src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts --watch=false
```

Esperado: PASS — todos os testes, incluindo os da Task 1 e os 7 novos/atualizados desta task.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.html frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.scss frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts
git commit -m "feat(campanha): acesso de visualização da ficha no menu do jogador"
```

---

## Task 3: Registrar a ideia de granularidade de permissão em IDEAS.md

**Files:**
- Modify: `docs/context/IDEAS.md`

**Interfaces:** Nenhuma — só documentação, sem código/teste.

- [ ] **Step 1: Adicionar a entrada I-010**

Em `docs/context/IDEAS.md`, no final da seção `## Abertas` (depois da entrada `I-009`, antes do `---` que abre `## Promovidas`), adicione:

```markdown

### I-010 — Granularidade na permissão de visualização de ficha · ficha/acesso

- **Ideia:** hoje o "Acesso de Visualização" (`FichaAcessoResumoDto`, m3-04) é binário — quem
  recebe acesso vê a ficha inteira (exceto `CAMPOS_PRIVADOS_FICHA`, sempre omitidos) ou não vê
  nada. Dar ao dono/mestre controle mais fino sobre o que cada concessão libera (ex.: só
  status/vitalidade, sem inventário/anotações; ou histórico/identidade escondidos de alguns
  membros).
- **Origem:** pedido do autor ao revisar o menu "⋯" do painel de campanha (2026-08-08) — junto do
  pedido de trazer as ações de ficha (remover/excluir) e o "Acesso de visualização" para fora da
  ficha completa, para o painel do jogador (ver
  `docs/superpowers/specs/2026-08-08-painel-jogador-acoes-ficha-design.md`).
- **Por quê:** a granularidade atual força tudo-ou-nada; um dono que quer compartilhar só parte da
  ficha (ex.: vitalidade para o grupo, mas não o histórico pessoal) não tem opção hoje.
- **Custo aparente:** médio-alto — schema (uma concessão precisaria guardar quais seções/campos
  libera, não só o `usuarioId`) + UI de seleção nos dois lugares que hoje mostram a dialog de
  acesso (`visualizar.page` e, desde este pedido, `campanha/detalhe.page`) + `validarPermissaoVisualizacao`
  no backend teria que aplicar o recorte por seção, não só por `CAMPOS_PRIVADOS_FICHA` fixo.
```

- [ ] **Step 2: Commit**

```bash
git add docs/context/IDEAS.md
git commit -m "docs(ideas): registra granularidade de permissão de visualização (I-010)"
```

---

## Self-Review

- **Cobertura do design:** os 3 itens do menu (Acesso, Remover, Excluir) — Tasks 1-2. Comportamento pós-remover/excluir (troca de ficha ou estado vazio) — Task 1 (`avancarFichaExibidaApos`). `IDEAS.md` — Task 3. "Fora de escopo" do design (sem componente compartilhado, sem mudar `visualizar.page`, sem mudar o menu do mestre) — nenhuma task toca esses arquivos.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todo código e teste está por extenso.
- **Consistência de tipos:** `minhaFichaExibida` (Task 1) é `Signal<FichaRecuperadaDto | null>`, consumido em Task 2 com `.id`/`.usuarioId` (ambos existem em `FichaRecuperadaDto`, já usados no arquivo em `fichaExibidaDados()`). `FichaAcessoResumoDto` = `{ usuarioId, nome }`, igual ao uso em `acesso.usuarioId`/`acesso.nome` nos templates e testes.
