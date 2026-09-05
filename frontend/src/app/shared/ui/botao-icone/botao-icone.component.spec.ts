import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';

import { Tooltip } from '../../tooltip/tooltip.directive';
import { BotaoIcone } from './botao-icone.component';

@Component({
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
    <a app-botao-icone tamanho="mini" routerLink="/campanhas" aria-label="Voltar" [appTooltip]="'Voltar'">
      <span aria-hidden="true">←</span>
    </a>
    <button
      app-botao-icone
      [redondo]="true"
      aria-label="Remover avatar"
      [appTooltip]="'Remover avatar'"
      type="button"
    >
      <span aria-hidden="true">✕</span>
    </button>
  `,
  imports: [BotaoIcone, RouterLink],
})
class Hospedeiro {
  readonly desabilitado = signal(false);
}

describe('BotaoIcone', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro], providers: [provideRouter([])] });
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

  it('veste uma âncora com o tamanho `mini`, sem perder o nome acessível (ui-28)', () => {
    const fixture = montar();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;

    expect(link.classList).toContain('botao-icone');
    expect(link.classList).toContain('botao-icone--mini');
    expect(link.getAttribute('aria-label')).toBe('Voltar');
  });

  it('veste o selo circular com `redondo` (ui-30)', () => {
    const fixture = montar();
    const botoes = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const redondo = botoes[1];

    expect(redondo.classList).toContain('botao-icone--redondo');
    expect(redondo.classList).toContain('botao-icone--compacto');
  });

  it('preserva o estado desabilitado nativo', () => {
    const fixture = montar();
    const botao = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    fixture.componentInstance.desabilitado.set(true);
    fixture.detectChanges();

    expect(botao.disabled).toBe(true);
  });
});
