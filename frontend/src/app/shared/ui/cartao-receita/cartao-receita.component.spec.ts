import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CartaoReceita } from './cartao-receita.component';

@Component({
  imports: [CartaoReceita],
  template: `
    <button
      app-cartao-receita
      type="button"
      class="consumidor__receita"
      [descricao]="descricao()"
      [ativo]="ativo()"
      (click)="cliques = cliques + 1"
    >
      Dano de arma
    </button>
  `,
})
class Hospedeiro {
  readonly descricao = signal<string | null>('Já vem com 2d6 + Força [Físico]');
  readonly ativo = signal<boolean | null>(null);
  cliques = 0;
}

function montar() {
  const fixture = TestBed.createComponent(Hospedeiro);
  fixture.detectChanges();
  const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  return { fixture, botao };
}

describe('CartaoReceita', () => {
  it('o host é o botão nativo, com título, descrição e a classe do consumidor', () => {
    const { botao } = montar();
    expect(botao.classList).toContain('cartao-receita');
    expect(botao.classList).toContain('consumidor__receita');
    expect(botao.querySelector('.cartao-receita__titulo')?.textContent?.trim()).toBe('Dano de arma');
    expect(botao.querySelector('.cartao-receita__descricao')?.textContent).toContain('2d6');
  });

  it('sem descrição, só o título', () => {
    const { fixture, botao } = montar();
    fixture.componentInstance.descricao.set(null);
    fixture.detectChanges();
    expect(botao.querySelector('.cartao-receita__descricao')).toBeNull();
  });

  it('aria-pressed só existe quando o consumidor informa [ativo]', () => {
    const { fixture, botao } = montar();
    expect(botao.hasAttribute('aria-pressed')).toBe(false);
    fixture.componentInstance.ativo.set(true);
    fixture.detectChanges();
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.classList).toContain('cartao-receita--ativo');
    fixture.componentInstance.ativo.set(false);
    fixture.detectChanges();
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(botao.classList).not.toContain('cartao-receita--ativo');
  });

  it('o clique é do consumidor', () => {
    const { fixture, botao } = montar();
    botao.click();
    expect(fixture.componentInstance.cliques).toBe(1);
  });
});
