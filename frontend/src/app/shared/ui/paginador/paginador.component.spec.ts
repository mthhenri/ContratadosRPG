import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Paginador } from './paginador.component';

@Component({
  imports: [Paginador],
  template: `
    <app-paginador
      [pagina]="pagina()"
      [totalPaginas]="totalPaginas()"
      (paginaAlterada)="pagina.set($event)"
    />
  `,
})
class Hospedeiro {
  readonly pagina = signal(1);
  readonly totalPaginas = signal(44);
}

describe('Paginador', () => {
  function montar(pagina = 1, totalPaginas = 44) {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.pagina.set(pagina);
    fixture.componentInstance.totalPaginas.set(totalPaginas);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  function numeros(fixture: ReturnType<typeof montar>) {
    return Array.from(raiz(fixture).querySelectorAll<HTMLButtonElement>('.paginador__pagina')).map(
      (botao) => botao.textContent!.trim(),
    );
  }

  it('marca o host como landmark de navegação rotulado', () => {
    const container = raiz(montar()).querySelector('app-paginador') as HTMLElement;

    expect(container.getAttribute('role')).toBe('navigation');
    expect(container.getAttribute('aria-label')).toBe('Paginação');
  });

  it('mostra 2 páginas de cada lado da atual, com a atual marcada aria-current', () => {
    const fixture = montar(10, 44);

    expect(numeros(fixture)).toEqual(['8', '9', '10', '11', '12']);
    const atual = raiz(fixture).querySelector('[aria-current="page"]') as HTMLButtonElement;
    expect(atual.textContent!.trim()).toBe('10');
  });

  it('desliza a janela perto do início em vez de encolher', () => {
    expect(numeros(montar(1, 44))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('desliza a janela perto do fim em vez de encolher', () => {
    expect(numeros(montar(44, 44))).toEqual(['40', '41', '42', '43', '44']);
  });

  it('mostra só o total de páginas existentes quando ele é menor que a janela', () => {
    expect(numeros(montar(2, 3))).toEqual(['1', '2', '3']);
  });

  it('desabilita Primeira/Anterior na primeira página', () => {
    const fixture = montar(1, 44);
    const extremos = Array.from(raiz(fixture).querySelectorAll<HTMLButtonElement>('.paginador__extremo'));

    expect(extremos[0].disabled).toBe(true);
    expect(extremos[1].disabled).toBe(false);
    expect(raiz(fixture).querySelector<HTMLButtonElement>('.paginador__seta')!.disabled).toBe(true);
  });

  it('desabilita Última/Próxima na última página', () => {
    const fixture = montar(44, 44);
    const extremos = Array.from(raiz(fixture).querySelectorAll<HTMLButtonElement>('.paginador__extremo'));

    expect(extremos[1].disabled).toBe(true);
  });

  it('clicar num número, em Anterior/Próxima ou em Primeira/Última emite a página alvo', () => {
    const fixture = montar(10, 44);

    raiz(fixture).querySelector<HTMLButtonElement>('.paginador__pagina')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pagina()).toBe(8);

    const setas = raiz(fixture).querySelectorAll<HTMLButtonElement>('.paginador__seta');
    setas[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pagina()).toBe(9);

    raiz(fixture).querySelectorAll<HTMLButtonElement>('.paginador__extremo')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pagina()).toBe(44);
  });
});
