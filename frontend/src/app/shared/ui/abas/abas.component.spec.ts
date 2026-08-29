import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Aba } from './aba.component';
import { Abas } from './abas.component';

/**
 * Prova os papéis ARIA (`tablist`/`tab`/`aria-selected`), a classe de estado ativo, e a
 * navegação por teclado (setas com wrap, `Home`/`End`) recuperada do algoritmo de
 * `ficha-visualizacao.component.ts` (`navegarAbas`/`focarAba`, m3-11) que nunca chegou a ser
 * ligado a um template. Ativação automática: mover o foco já emite `(navegou)`, e o consumidor
 * decide a seleção do mesmo jeito que já fazia no `(click)`.
 */
@Component({
  imports: [Abas, Aba],
  template: `
    <app-abas rotulo="Abas de teste" (navegou)="selecionar($event)">
      <button app-aba valor="a" [ativa]="ativa() === 'a'" (click)="selecionar('a')">Aba A</button>
      <button app-aba valor="b" [ativa]="ativa() === 'b'" (click)="selecionar('b')">Aba B</button>
      <button app-aba valor="c" [ativa]="ativa() === 'c'" (click)="selecionar('c')">Aba C</button>
    </app-abas>
  `,
})
class Hospedeiro {
  readonly ativa = signal('a');

  selecionar(valor: string): void {
    this.ativa.set(valor);
  }
}

describe('Abas', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  function botoes(fixture: ReturnType<typeof montar>) {
    return Array.from(raiz(fixture).querySelectorAll<HTMLButtonElement>('button[app-aba]'));
  }

  function teclar(alvo: HTMLElement, key: string) {
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  it('marca o container como tablist com o rótulo informado', () => {
    const container = raiz(montar()).querySelector('app-abas') as HTMLElement;

    expect(container.getAttribute('role')).toBe('tablist');
    expect(container.getAttribute('aria-label')).toBe('Abas de teste');
  });

  it('marca cada item como tab e só o ativo como aria-selected/tabindex 0', () => {
    const [a, b, c] = botoes(montar());

    expect(a.getAttribute('role')).toBe('tab');
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('0');
    expect(a.classList.contains('abas__item--ativa')).toBe(true);

    expect(b.getAttribute('aria-selected')).toBe('false');
    expect(b.getAttribute('tabindex')).toBe('-1');
    expect(b.classList.contains('abas__item--ativa')).toBe(false);

    expect(c.getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowRight move o foco e ativa o próximo item, com wrap do último para o primeiro', () => {
    const fixture = montar();
    const [a, b, c] = botoes(fixture);

    teclar(a, 'ArrowRight');
    fixture.detectChanges();
    expect(document.activeElement).toBe(b);
    expect(b.getAttribute('aria-selected')).toBe('true');

    teclar(b, 'ArrowRight');
    fixture.detectChanges();
    expect(document.activeElement).toBe(c);

    teclar(c, 'ArrowRight');
    fixture.detectChanges();
    expect(document.activeElement).toBe(a);
    expect(a.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft move o foco para trás, com wrap do primeiro para o último', () => {
    const fixture = montar();
    const [a, , c] = botoes(fixture);

    teclar(a, 'ArrowLeft');
    fixture.detectChanges();
    expect(document.activeElement).toBe(c);
    expect(c.getAttribute('aria-selected')).toBe('true');
  });

  it('Home e End pulam para o primeiro e o último item', () => {
    const fixture = montar();
    const [a, , c] = botoes(fixture);

    teclar(a, 'End');
    fixture.detectChanges();
    expect(document.activeElement).toBe(c);

    teclar(c, 'Home');
    fixture.detectChanges();
    expect(document.activeElement).toBe(a);
  });

  it('ignora outras teclas sem mover foco nem emitir navegou', () => {
    const fixture = montar();
    const [a] = botoes(fixture);
    a.focus();

    teclar(a, 'Tab');
    fixture.detectChanges();
    expect(fixture.componentInstance.ativa()).toBe('a');
  });
});
