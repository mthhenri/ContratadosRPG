import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MenuInsercao } from './menu-insercao.component';
import type { MenuInsercaoOpcao } from './menu-insercao';

@Component({
  imports: [MenuInsercao],
  template: `<app-menu-insercao
    [aberto]="aberto()"
    [opcoes]="opcoes"
    (escolheu)="escolhidos.push($event)"
    (fechou)="aberto.set(false)"
  />`,
})
class Hospedeiro {
  readonly aberto = signal(true);
  readonly escolhidos: string[] = [];
  readonly opcoes: MenuInsercaoOpcao[] = [
    { id: 'SECAO', rotulo: 'Seção', termos: ['titulo'] },
    { id: 'NOTA', rotulo: 'Nota' },
    { id: 'HABILIDADE', rotulo: 'Habilidade', termos: ['hab'] },
  ];
}

describe('MenuInsercao', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const campo = () => raiz.querySelector('input[role="combobox"]') as HTMLInputElement;
    const rotulos = () => Array.from(raiz.querySelectorAll('.menu-insercao__rotulo')).map((e) => e.textContent!.trim());
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

  it('lista as opções e filtra pelo apelido', () => {
    const { rotulos, digitar } = montar();
    expect(rotulos()).toEqual(['Seção', 'Nota', 'Habilidade']);
    digitar('/hab');
    expect(rotulos()).toEqual(['Habilidade']);
  });

  it('setas movem a opção ativa e Enter escolhe', () => {
    const { fixture, tecla } = montar();
    tecla('ArrowDown');
    tecla('Enter');
    expect(fixture.componentInstance.escolhidos).toEqual(['NOTA']);
  });

  it('Esc fecha sem escolher e o menu some', () => {
    const { fixture, raiz, tecla } = montar();
    tecla('Escape');
    expect(fixture.componentInstance.aberto()).toBe(false);
    expect(fixture.componentInstance.escolhidos).toEqual([]);
    expect(raiz.querySelector('.menu-insercao')).toBeNull();
  });

  it('sem correspondência mostra o aviso e Enter não escolhe nada', () => {
    const { fixture, raiz, digitar, tecla } = montar();
    digitar('zzz');
    expect(raiz.querySelector('.menu-insercao__vazio')?.textContent).toContain('Nada encontrado');
    tecla('Enter');
    expect(fixture.componentInstance.escolhidos).toEqual([]);
  });

  it('expõe o padrão combobox/listbox com a opção ativa', () => {
    const { raiz, campo } = montar();
    expect(campo().getAttribute('aria-activedescendant')).toBe(raiz.querySelector('[role="option"]')!.id);
    expect(raiz.querySelector('[role="listbox"]')).not.toBeNull();
    expect(raiz.querySelectorAll('[role="option"]')).toHaveLength(3);
  });
});
