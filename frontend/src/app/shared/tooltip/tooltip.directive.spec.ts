import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Tooltip } from './tooltip.directive';

/**
 * Prova o tooltip por hover sustentado (`appTooltip`): o balão só abre após o atraso (300 ms padrão),
 * carrega o texto passado, some ao sair/clicar, e não abre com texto vazio. O balão é portado para o
 * `<body>` (por isso os testes consultam `document.body`). Temporizadores falsos tornam o hover
 * determinístico.
 */
@Component({
  imports: [Tooltip],
  template: `<button [appTooltip]="texto()" [appTooltipDelay]="300">Habilidade</button>`,
})
class Hospedeiro {
  readonly texto = signal<string>('Soma sua Força × 3 no dano.');
}

describe('Tooltip', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, botao };
  }

  const balao = () => document.body.querySelector('[role="tooltip"]');

  afterEach(() => {
    document.body.querySelectorAll('[role="tooltip"]').forEach((no) => no.remove());
  });

  it('abre o balão com o texto só depois do atraso; some ao sair', () => {
    vi.useFakeTimers();
    try {
      const { botao } = montar();
      botao.dispatchEvent(new Event('pointerenter'));
      // Antes do atraso: nada ainda.
      vi.advanceTimersByTime(200);
      expect(balao()).toBeNull();
      // Depois do atraso: balão com o texto.
      vi.advanceTimersByTime(120);
      expect(balao()?.textContent).toContain('Soma sua Força');
      // Sai o mouse: some.
      botao.dispatchEvent(new Event('pointerleave'));
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('texto vazio não abre nada', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      fixture.componentInstance.texto.set('');
      fixture.detectChanges();
      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(1000);
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sair antes do atraso cancela a abertura', () => {
    vi.useFakeTimers();
    try {
      const { botao } = montar();
      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(150);
      botao.dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(1000);
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('destruir o componente remove o balão aberto', () => {
    vi.useFakeTimers();
    try {
      const { fixture, botao } = montar();
      botao.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(300);
      expect(balao()).not.toBeNull();
      fixture.destroy();
      expect(balao()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
