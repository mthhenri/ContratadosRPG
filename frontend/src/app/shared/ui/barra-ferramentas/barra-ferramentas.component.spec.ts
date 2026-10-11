import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BarraFerramentas } from './barra-ferramentas.component';
import { BarraFerramentasSeparador } from './barra-ferramentas-separador.component';

@Component({
  imports: [BarraFerramentas, BarraFerramentasSeparador],
  template: `
    <app-barra-ferramentas rotulo="Ações da peça">
      <button type="button" id="a">A</button>
      <button type="button" id="b" disabled>B</button>
      <app-barra-ferramentas-separador />
      <button type="button" id="c">C</button>
    </app-barra-ferramentas>
  `,
})
class Hospedeiro {}

describe('BarraFerramentas', () => {
  function montar() {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const botao = (id: string) => raiz.querySelector<HTMLButtonElement>(`#${id}`)!;
    const teclar = (alvo: HTMLElement, key: string) =>
      alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    return { raiz, botao, teclar };
  }

  it('é uma toolbar rotulada, com separador acessível', () => {
    const { raiz } = montar();
    const barra = raiz.querySelector('app-barra-ferramentas')!;
    expect(barra.getAttribute('role')).toBe('toolbar');
    expect(barra.getAttribute('aria-label')).toBe('Ações da peça');
    expect(raiz.querySelector('app-barra-ferramentas-separador')?.getAttribute('role')).toBe('separator');
  });

  it('as setas movem o foco entre os itens habilitados, em círculo', () => {
    const { botao, teclar } = montar();
    botao('a').focus();
    teclar(botao('a'), 'ArrowRight');
    expect(document.activeElement).toBe(botao('c'));
    teclar(botao('c'), 'ArrowRight');
    expect(document.activeElement).toBe(botao('a'));
    teclar(botao('a'), 'ArrowLeft');
    expect(document.activeElement).toBe(botao('c'));
  });

  it('Home e End vão ao primeiro e ao último item habilitado', () => {
    const { botao, teclar } = montar();
    botao('a').focus();
    teclar(botao('a'), 'End');
    expect(document.activeElement).toBe(botao('c'));
    teclar(botao('c'), 'Home');
    expect(document.activeElement).toBe(botao('a'));
  });
});
