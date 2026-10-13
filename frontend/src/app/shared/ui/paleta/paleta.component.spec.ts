import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Paleta } from './paleta.component';
import type { PaletaItem, PaletaNo } from './paleta';

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

@Component({
  imports: [Paleta],
  template: `<app-paleta [aberto]="aberto()" [itens]="itens" [arvore]="arvore" [idAtivo]="idAtivo()"
    (escolheu)="escolhidos.push($event)" (fechou)="aberto.set(false)" />`,
})
class HospedeiroArvore {
  readonly aberto = signal(true);
  readonly idAtivo = signal<string | undefined>(undefined);
  readonly escolhidos: string[] = [];
  readonly arvore: PaletaNo[] = [
    { id: 'c1', rotulo: 'Criação', filhos: [
      { id: 'at', rotulo: 'Atributos', filhos: [{ id: 'ma', rotulo: 'Maestrias' }] },
      { id: 'sa', rotulo: 'Saúde' },
    ] },
    { id: 'c2', rotulo: 'Combate' },
  ];
  readonly itens: PaletaItem[] = [
    { id: 'c1', rotulo: 'Criação' },
    { id: 'at', rotulo: 'Atributos', contexto: 'Criação' },
    { id: 'ma', rotulo: 'Maestrias', contexto: 'Criação › Atributos' },
    { id: 'sa', rotulo: 'Saúde', contexto: 'Criação' },
    { id: 'c2', rotulo: 'Combate' },
  ];
}

describe('Paleta em árvore', () => {
  function montar(idAtivo?: string) {
    TestBed.configureTestingModule({ imports: [HospedeiroArvore] });
    const fixture = TestBed.createComponent(HospedeiroArvore);
    fixture.componentInstance.idAtivo.set(idAtivo);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const campo = () => raiz.querySelector('input[role="combobox"]') as HTMLInputElement;
    const rotulos = () => Array.from(raiz.querySelectorAll('.paleta__rotulo')).map((e) => e.textContent!.trim());
    const ativo = () => raiz.querySelector('[aria-selected="true"]')?.textContent?.trim();
    const digitar = (texto: string) => {
      campo().value = texto;
      campo().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const tecla = (key: string) => {
      campo().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    return { fixture, raiz, campo, rotulos, ativo, digitar, tecla };
  }

  it('abre recolhido, com role tree, nível e aria-expanded só em quem tem filhos', () => {
    const { raiz, rotulos } = montar();
    expect(rotulos()).toEqual(['Criação', 'Combate']);
    expect(raiz.querySelector('ul')!.getAttribute('role')).toBe('tree');
    const [criacao, combate] = Array.from(raiz.querySelectorAll('[role="treeitem"]'));
    expect(criacao!.getAttribute('aria-level')).toBe('1');
    expect(criacao!.getAttribute('aria-expanded')).toBe('false');
    expect(combate!.hasAttribute('aria-expanded')).toBe(false);
  });

  it('chevron abre e fecha sem navegar; clique no título navega', () => {
    const { fixture, raiz, rotulos } = montar();
    (raiz.querySelector('.paleta__alternar') as HTMLElement).click();
    fixture.detectChanges();
    expect(rotulos()).toEqual(['Criação', 'Atributos', 'Saúde', 'Combate']);
    expect(fixture.componentInstance.escolhidos).toEqual([]);
    (raiz.querySelectorAll('.paleta__item')[2] as HTMLElement).click();
    expect(fixture.componentInstance.escolhidos).toEqual(['sa']);
    (raiz.querySelector('.paleta__alternar') as HTMLElement).click();
    fixture.detectChanges();
    expect(rotulos()).toEqual(['Criação', 'Combate']);
  });

  it('→ abre e entra no primeiro filho; ← volta ao pai e depois recolhe', () => {
    const { campo, rotulos, ativo, tecla } = montar();
    tecla('ArrowRight');
    expect(rotulos()).toEqual(['Criação', 'Atributos', 'Saúde', 'Combate']);
    tecla('ArrowRight');
    expect(ativo()).toBe('Atributos');
    tecla('ArrowLeft');
    expect(ativo()).toBe('Criação');
    tecla('ArrowLeft');
    expect(rotulos()).toEqual(['Criação', 'Combate']);
    expect(campo().getAttribute('aria-activedescendant')).toBeTruthy();
  });

  it('→ em folha e ← em raiz recolhida não fazem nada; Home/End e Enter navegam', () => {
    const { fixture, ativo, tecla } = montar();
    tecla('ArrowLeft');
    expect(ativo()).toBe('Criação');
    tecla('End');
    expect(ativo()).toBe('Combate');
    tecla('ArrowRight');
    expect(ativo()).toBe('Combate');
    tecla('Home');
    tecla('Enter');
    tecla('End');
    tecla('Enter');
    expect(fixture.componentInstance.escolhidos).toEqual(['c1', 'c2']);
  });

  it('abre já no caminho da seção ativa, com ela selecionada; reabrir recomeça', () => {
    const { fixture, rotulos, ativo, raiz } = montar('ma');
    expect(rotulos()).toEqual(['Criação', 'Atributos', 'Maestrias', 'Saúde', 'Combate']);
    expect(ativo()).toBe('Maestrias');
    (raiz.querySelector('.paleta__alternar') as HTMLElement).click(); // recolhe Criação
    fixture.componentInstance.aberto.set(false);
    fixture.detectChanges();
    fixture.componentInstance.aberto.set(true);
    fixture.detectChanges();
    expect(rotulos()).toEqual(['Criação', 'Atributos', 'Maestrias', 'Saúde', 'Combate']);
  });

  it('com termo volta à lista plana (listbox, com caminho) e ao apagar volta à árvore', () => {
    const { raiz, rotulos, digitar } = montar();
    digitar('maest');
    expect(raiz.querySelector('ul')!.getAttribute('role')).toBe('listbox');
    expect(rotulos()).toEqual(['Maestrias']);
    expect(raiz.querySelector('.paleta__contexto')!.textContent).toContain('Criação › Atributos');
    digitar('xyz');
    expect(raiz.querySelector('.paleta__vazio')?.textContent).toContain('Nada encontrado');
    digitar('');
    expect(raiz.querySelector('ul')!.getAttribute('role')).toBe('tree');
    expect(rotulos()).toEqual(['Criação', 'Combate']);
  });

  it('→ ← são ignoradas no modo filtrado', () => {
    const { fixture, digitar, ativo, tecla } = montar();
    digitar('a');
    const antes = ativo();
    const evento = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('input').dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
    tecla('Escape');
    expect(ativo()).toBe(antes);
  });
});
