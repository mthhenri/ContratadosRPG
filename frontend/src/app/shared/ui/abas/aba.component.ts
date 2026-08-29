import { Component, ElementRef, computed, inject, input } from '@angular/core';

/**
 * Item de aba (`ui-03` · `P-034`), companion de `app-abas`. Veste o `<button>` do consumidor por
 * seletor de atributo (mesmo padrão do `Botao`), então o host é o botão nativo — sem nó extra
 * dentro da barra.
 *
 * A seleção continua sendo do consumidor: `[ativa]` só reflete o estado, `(click)` na aba
 * continua chamando o método de seleção do consumidor como já fazia antes desta task.
 */
@Component({
  selector: 'button[app-aba]',
  template: `<ng-content />`,
  styleUrl: './aba.component.scss',
  host: {
    role: 'tab',
    '[class]': 'classes()',
    '[attr.aria-selected]': 'ativa() ? "true" : "false"',
    '[attr.tabindex]': 'ativa() ? 0 : -1',
  },
})
export class Aba {
  private readonly elemento = inject<ElementRef<HTMLButtonElement>>(ElementRef);

  /** Identificador estável do item, usado pelo `app-abas` para navegação por teclado. */
  readonly valor = input.required<string>();

  /** Estado de seleção, decidido pelo consumidor. */
  readonly ativa = input(false);

  protected readonly classes = computed(() =>
    this.ativa() ? 'abas__item abas__item--ativa' : 'abas__item',
  );

  /** Move o foco do teclado para este item — usado pela navegação por setas do `app-abas`. */
  focar(): void {
    this.elemento.nativeElement.focus();
  }

  /**
   * Se este item tem o foco de teclado agora. `app-abas` usa isto (não `ativa()`) pra achar o
   * item de partida da navegação por setas: `.focus()` é síncrono, mas `ativa()` só reflete o
   * clique/navegação anterior depois do próximo ciclo do Angular — em setas em sequência rápida
   * (ex.: Playwright disparando duas seguidas), ler `ativa()` via árvore de sinais pega o estado
   * de ANTES do primeiro passo ainda não ter sido processado pela detecção de mudanças do
   * consumidor, e a segunda seta repete o primeiro passo em vez de avançar (achado ao vivo no
   * gate visual da `ui-03`).
   */
  estaFocado(): boolean {
    return this.elemento.nativeElement === document.activeElement;
  }
}
