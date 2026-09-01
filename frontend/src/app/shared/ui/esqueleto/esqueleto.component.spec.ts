import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Esqueleto } from './esqueleto.component';

/**
 * Prova o essencial do primitivo: renderiza como bloco decorativo (`aria-hidden`), aceitando a
 * classe BEM do consumidor no mesmo elemento — mesma composição que `app-botao` já usa.
 */
@Component({
  imports: [Esqueleto],
  template: `<app-esqueleto class="lista__esqueleto-linha" />`,
})
class Hospedeiro {}

describe('Esqueleto', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza como bloco decorativo, oculto de leitores de tela', () => {
    const elemento = (montar().nativeElement as HTMLElement).querySelector('app-esqueleto');

    expect(elemento).not.toBeNull();
    expect(elemento?.getAttribute('aria-hidden')).toBe('true');
  });

  it('preserva a classe BEM do consumidor, aplicada no mesmo elemento', () => {
    const elemento = (montar().nativeElement as HTMLElement).querySelector('app-esqueleto');

    expect(elemento?.classList.contains('esqueleto')).toBe(true);
    expect(elemento?.classList.contains('lista__esqueleto-linha')).toBe(true);
  });
});
