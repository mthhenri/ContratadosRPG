import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Paleta } from './paleta.component';
import type { PaletaItem } from './paleta';

@Component({
  imports: [Paleta],
  template: `<app-paleta [aberto]="aberto()" [itens]="itens" (escolheu)="escolhidos.push($event)" (fechou)="aberto.set(false)" />`,
})
class Hospedeiro {
  readonly aberto = signal(true);
  readonly escolhidos: string[] = [];
  readonly itens: PaletaItem[] = [
    { id: 'saude', rotulo: 'Saúde', contexto: 'Criação' },
    { id: 'habilidades', rotulo: 'Habilidades', contexto: 'Criação' },
    { id: 'habilidades-gerais', rotulo: 'Habilidades Gerais', contexto: 'Criação › Habilidades' },
  ];
}

describe('Paleta', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const campo = () => raiz.querySelector('input[role="combobox"]') as HTMLInputElement;
    const rotulos = () => Array.from(raiz.querySelectorAll('.paleta__rotulo')).map((e) => e.textContent!.trim());
    const digitar = (texto: string) => {
      campo().value = texto;
      campo().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const tecla = (key: string) => {
      campo().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    return { fixture, raiz, campo, rotulos, digitar, tecla };
  }

  it('lista todos os itens e filtra ao digitar', () => {
    const { rotulos, digitar } = montar();
    expect(rotulos()).toEqual(['Saúde', 'Habilidades', 'Habilidades Gerais']);
    digitar('habil');
    expect(rotulos()).toEqual(['Habilidades', 'Habilidades Gerais']);
  });

  it('Enter escolhe o item ativo e as setas movem a seleção', () => {
    const { fixture, digitar, tecla } = montar();
    digitar('habil');
    tecla('ArrowDown');
    tecla('Enter');
    expect(fixture.componentInstance.escolhidos).toEqual(['habilidades-gerais']);
  });

  it('as setas dão a volta e o campo expõe o item ativo para leitor de tela', () => {
    const { campo, raiz, tecla } = montar();
    tecla('ArrowUp');
    const ativo = raiz.querySelector('[aria-selected="true"]')!;
    expect(ativo.textContent).toContain('Habilidades Gerais');
    expect(campo().getAttribute('aria-activedescendant')).toBe(ativo.id);
  });

  it('clique escolhe e termo sem resultado mostra a mensagem de vazio', () => {
    const { fixture, raiz, digitar } = montar();
    (raiz.querySelectorAll('.paleta__item')[0] as HTMLElement).click();
    expect(fixture.componentInstance.escolhidos).toEqual(['saude']);
    digitar('xyz');
    expect(raiz.querySelector('.paleta__vazio')?.textContent).toContain('Nada encontrado');
  });

  it('as teclas tratadas não sobem para a página', () => {
    const { fixture, campo } = montar();
    const subiu = vi.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', subiu);
    campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(subiu).not.toHaveBeenCalled();
  });
});
