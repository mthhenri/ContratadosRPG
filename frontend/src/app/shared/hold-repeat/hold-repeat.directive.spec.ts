import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoldRepeat } from './hold-repeat.directive';

/**
 * Prova a repetição por pressão contínua (`appHoldRepeat`): um toque curto dá um passo; segurar
 * dispara um passo imediato e passa a repetir após o atraso; soltar para. O teclado (Enter/Espaço)
 * dá um passo. Usa temporizadores falsos para tornar o hold determinístico.
 */
@Component({
  imports: [HoldRepeat],
  template: `<button appHoldRepeat [atrasoInicial]="400" [intervaloRepeticao]="90" (passo)="contar()">
    +
  </button>`,
})
class Hospedeiro {
  readonly passos = signal(0);
  contar(): void {
    this.passos.update((n) => n + 1);
  }
}

describe('HoldRepeat', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, botao };
  }

  it('um toque curto (pressiona e solta antes do atraso) dá exatamente um passo', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      botao.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
      vi.advanceTimersByTime(120);
      botao.dispatchEvent(new MouseEvent('pointerup'));
      vi.advanceTimersByTime(1000);
      expect(fixture.componentInstance.passos()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('segurar dispara o passo imediato e repete após o atraso, e parar ao soltar', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      botao.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
      // Passo imediato.
      expect(fixture.componentInstance.passos()).toBe(1);
      // Atraso inicial → 1ª repetição; depois +2 em 180ms.
      vi.advanceTimersByTime(400);
      expect(fixture.componentInstance.passos()).toBe(2);
      vi.advanceTimersByTime(180);
      expect(fixture.componentInstance.passos()).toBe(4);
      // Soltou: para de repetir.
      botao.dispatchEvent(new MouseEvent('pointerup'));
      vi.advanceTimersByTime(1000);
      expect(fixture.componentInstance.passos()).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignora o botão direito do mouse', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      botao.dispatchEvent(new MouseEvent('pointerdown', { button: 2 }));
      vi.advanceTimersByTime(1000);
      expect(fixture.componentInstance.passos()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Enter/Espaço no teclado dão um passo', () => {
    const { fixture, botao } = montar();
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(fixture.componentInstance.passos()).toBe(2);
  });
});
