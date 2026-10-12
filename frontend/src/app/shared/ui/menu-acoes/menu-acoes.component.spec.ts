import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { MenuAcoes, type MenuAcoesItem } from './menu-acoes.component';

@Component({
  imports: [MenuAcoes],
  template: `<app-menu-acoes rotulo="Publicar" [itens]="itens()" [desabilitado]="desabilitado()" (escolheu)="escolhidos.push($event)" />`,
})
class Hospedeiro {
  readonly itens = signal<readonly MenuAcoesItem[]>([
    { id: 'rascunho', rotulo: 'Publicar rascunho', descricao: 'Só testers veem.' },
    { id: 'versao', rotulo: 'Publicar versão', descricao: 'Todos veem.' },
  ]);
  readonly desabilitado = signal(false);
  readonly escolhidos: string[] = [];
}

describe('MenuAcoes', () => {
  function montar() {
    const fixture = TestBed.createComponent(Hospedeiro);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const gatilho = () => raiz.querySelector<HTMLButtonElement>('button')!;
    const painel = () => raiz.querySelector<HTMLElement>('[role="menu"]');
    const tecla = (key: string) => {
      painel()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    return { fixture, raiz, gatilho, painel, tecla };
  }

  afterEach(() => document.body.replaceChildren());

  it('começa fechado, com aria-haspopup, e abre ao clicar', () => {
    const { fixture, gatilho, painel } = montar();
    expect(gatilho().getAttribute('aria-haspopup')).toBe('menu');
    expect(gatilho().getAttribute('aria-expanded')).toBe('false');
    expect(painel()).toBeNull();
    gatilho().click();
    fixture.detectChanges();
    expect(painel()).not.toBeNull();
    expect(gatilho().getAttribute('aria-expanded')).toBe('true');
    expect(painel()!.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
  });

  it('escolher um item emite o id e fecha o menu', () => {
    const { fixture, gatilho, painel } = montar();
    gatilho().click();
    fixture.detectChanges();
    painel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.escolhidos).toEqual(['versao']);
    expect(painel()).toBeNull();
  });

  it('as setas movem o item ativo e Enter escolhe; Esc fecha e devolve o foco ao botão', () => {
    const { fixture, gatilho, painel, tecla } = montar();
    gatilho().focus();
    gatilho().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(painel()!.getAttribute('aria-activedescendant')).toMatch(/-0$/);
    tecla('ArrowDown');
    expect(painel()!.getAttribute('aria-activedescendant')).toMatch(/-1$/);
    tecla('ArrowDown');
    expect(painel()!.getAttribute('aria-activedescendant')).toMatch(/-0$/);
    tecla('End');
    tecla('Enter');
    expect(fixture.componentInstance.escolhidos).toEqual(['versao']);
    gatilho().click();
    fixture.detectChanges();
    tecla('Escape');
    expect(painel()).toBeNull();
    expect(document.activeElement).toBe(gatilho());
  });

  it('item desabilitado é pulado e não escolhe', () => {
    const { fixture, gatilho, painel, tecla } = montar();
    fixture.componentInstance.itens.set([
      { id: 'rascunho', rotulo: 'Rascunho' },
      { id: 'versao', rotulo: 'Versão', desabilitado: true },
    ]);
    fixture.detectChanges();
    gatilho().click();
    fixture.detectChanges();
    tecla('ArrowDown');
    expect(painel()!.getAttribute('aria-activedescendant')).toMatch(/-0$/);
    painel()!.querySelectorAll<HTMLElement>('[role="menuitem"]')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.escolhidos).toEqual([]);
  });

  it('desabilitado não abre; clique fora fecha', () => {
    const { fixture, gatilho, painel } = montar();
    fixture.componentInstance.desabilitado.set(true);
    fixture.detectChanges();
    gatilho().click();
    fixture.detectChanges();
    expect(painel()).toBeNull();
    fixture.componentInstance.desabilitado.set(false);
    fixture.detectChanges();
    gatilho().click();
    fixture.detectChanges();
    expect(painel()).not.toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(painel()).toBeNull();
  });
});
