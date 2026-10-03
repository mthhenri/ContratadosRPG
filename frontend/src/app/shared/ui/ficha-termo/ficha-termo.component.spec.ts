import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type FichaTermoCor, FichaTermo } from './ficha-termo.component';

@Component({
  imports: [FichaTermo],
  template: `
    <app-ficha-termo
      rotuloRemover="Remover 2d6"
      rotuloMais="Mais opções de 2d6"
      [cor]="cor()"
      [corSecundaria]="corSecundaria()"
      [temMais]="temMais()"
      [compacta]="compacta()"
      (remover)="remocoes = remocoes + 1"
    >
      <span fichaTermoRotulo>2d6</span>
      <span fichaTermoControles class="controle">±</span>
      <p class="corpo">Tipo</p>
      <p fichaTermoMais class="mais">Opções</p>
    </app-ficha-termo>
  `,
})
class Hospedeiro {
  readonly cor = signal<FichaTermoCor | null>('fisico');
  readonly corSecundaria = signal<FichaTermoCor | null>(null);
  readonly temMais = signal(true);
  readonly compacta = signal(false);
  remocoes = 0;
}

function montar() {
  const fixture = TestBed.createComponent(Hospedeiro);
  fixture.detectChanges();
  return { fixture, raiz: fixture.nativeElement as HTMLElement };
}

describe('FichaTermo', () => {
  it('projeta rótulo, controles e o corpo sempre visível', () => {
    const { raiz } = montar();
    expect(raiz.querySelector('.ficha-termo__rotulo')?.textContent).toContain('2d6');
    expect(raiz.querySelector('.ficha-termo__controles .controle')).not.toBeNull();
    expect(raiz.querySelector('.ficha-termo__conteudo .corpo')).not.toBeNull();
  });

  it('faixa na cor do tipo; composto divide a faixa; compacta sem tipo fica neutra', () => {
    const { fixture, raiz } = montar();
    const ficha = raiz.querySelector('.ficha-termo')!;
    expect(ficha.classList).toContain('ficha-termo--cor-fisico');
    fixture.componentInstance.corSecundaria.set('quimico');
    fixture.detectChanges();
    expect(ficha.classList).toContain('ficha-termo--cor2-quimico');
    fixture.componentInstance.cor.set(null);
    fixture.componentInstance.corSecundaria.set(null);
    fixture.componentInstance.compacta.set(true);
    fixture.detectChanges();
    expect(ficha.className).toBe('ficha-termo ficha-termo--compacta');
  });

  it('a área recolhível alterna com aria-expanded e some sem temMais', () => {
    const { fixture, raiz } = montar();
    const gatilho = raiz.querySelector<HTMLButtonElement>('.ficha-termo__mais-gatilho')!;
    expect(gatilho.getAttribute('aria-label')).toBe('Mais opções de 2d6');
    expect(raiz.querySelector('.mais')).toBeNull();
    expect(gatilho.getAttribute('aria-expanded')).toBe('false');
    gatilho.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.ficha-termo__mais .mais')).not.toBeNull();
    expect(gatilho.getAttribute('aria-expanded')).toBe('true');

    fixture.componentInstance.temMais.set(false);
    fixture.detectChanges();
    expect(raiz.querySelector('.ficha-termo__mais-gatilho')).toBeNull();
  });

  it('o × pede a remoção ao consumidor, com nome acessível', () => {
    const { fixture, raiz } = montar();
    const remover = raiz.querySelector<HTMLButtonElement>('.ficha-termo__remover')!;
    expect(remover.getAttribute('aria-label')).toBe('Remover 2d6');
    remover.click();
    expect(fixture.componentInstance.remocoes).toBe(1);
  });
});
