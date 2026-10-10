import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Empilhamento } from './empilhamento.component';

@Component({
  imports: [Empilhamento],
  template: `<app-empilhamento [iniciais]="iniciais()" [atuais]="atuais()" [maximo]="maximo()" [rotulo]="rotulo()" />`,
})
class Hospedeiro {
  readonly iniciais = signal(3);
  readonly atuais = signal<number | undefined>(4);
  readonly maximo = signal(5);
  readonly rotulo = signal<string | undefined>(undefined);
}

describe('Empilhamento', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('app-empilhamento') as HTMLElement;
    const estados = () => Array.from(host.querySelectorAll('.empilhamento__caixa'))
      .map((caixa) => caixa.className.match(/--(\w+)$/)![1]);
    return { fixture, host, estados };
  }

  it('distingue inicial, comprado e vazio (3 iniciais, 1 comprado, 1 vazio)', () => {
    const { host, estados } = montar();
    expect(estados()).toEqual(['inicial', 'inicial', 'inicial', 'comprado', 'vazio']);
    expect(host.classList).not.toContain('empilhamento--regra');
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Empilhamento 4 de 5, 3 iniciais');
  });

  it('sem atuais é leitura de regra: só iniciais e vazios', () => {
    const { fixture, host, estados } = montar();
    fixture.componentInstance.atuais.set(undefined);
    fixture.componentInstance.rotulo.set('Pesada');
    fixture.detectChanges();
    expect(estados()).toEqual(['inicial', 'inicial', 'inicial', 'vazio', 'vazio']);
    expect(host.classList).toContain('empilhamento--regra');
    expect(host.getAttribute('aria-label')).toBe('Pesada — Empilhamento: 3 iniciais de 5');
  });

  it('atuais menor que iniciais não gera comprados', () => {
    const { fixture, estados } = montar();
    fixture.componentInstance.atuais.set(1);
    fixture.detectChanges();
    expect(estados()).toEqual(['inicial', 'vazio', 'vazio', 'vazio', 'vazio']);
  });

  it('atuais igual ao máximo preenche tudo, sem vazios', () => {
    const { fixture, estados } = montar();
    fixture.componentInstance.atuais.set(5);
    fixture.detectChanges();
    expect(estados()).toEqual(['inicial', 'inicial', 'inicial', 'comprado', 'comprado']);
  });

  it('mod sem empilhamento (máximo 1) tem uma caixa inicial', () => {
    const { fixture, host, estados } = montar();
    fixture.componentInstance.iniciais.set(1);
    fixture.componentInstance.atuais.set(1);
    fixture.componentInstance.maximo.set(1);
    fixture.detectChanges();
    expect(estados()).toEqual(['inicial']);
    expect(host.getAttribute('aria-label')).toBe('Empilhamento 1 de 1, 1 inicial');
  });
});
