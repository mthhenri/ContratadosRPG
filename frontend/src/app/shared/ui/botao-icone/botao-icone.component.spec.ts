import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Tooltip } from '../../tooltip/tooltip.directive';
import { BotaoIcone } from './botao-icone.component';

@Component({
  imports: [BotaoIcone],
  template: `
    <button
      app-botao-icone
      type="button"
      aria-label="Copiar código de convite"
      [appTooltip]="'Copiar código de convite'"
      [disabled]="desabilitado()"
    >
      <span aria-hidden="true">⧉</span>
    </button>
  `,
})
class Hospedeiro {
  readonly desabilitado = signal(false);
}

describe('BotaoIcone', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  it('veste a ação apenas por ícone sem perder seu nome acessível', () => {
    const fixture = montar();
    const botao = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(botao.classList).toContain('botao-icone');
    expect(botao.classList).toContain('botao-icone--compacto');
    expect(botao.getAttribute('aria-label')).toBe('Copiar código de convite');
    expect(fixture.debugElement.query((elemento) => elemento.nativeElement === botao).injector.get(Tooltip).appTooltip()).toBe(
      'Copiar código de convite',
    );
  });

  it('preserva o estado desabilitado nativo', () => {
    const fixture = montar();
    const botao = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    fixture.componentInstance.desabilitado.set(true);
    fixture.detectChanges();

    expect(botao.disabled).toBe(true);
  });
});
