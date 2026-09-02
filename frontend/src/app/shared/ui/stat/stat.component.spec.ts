import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Stat, StatVariante } from './stat.component';

/** Prova rótulo/valor e as três variantes de cor auditadas na `ui-03` (nenhuma por padrão). */
@Component({
  imports: [Stat],
  template: `<app-stat [rotulo]="rotulo()" [valor]="valor()" [variante]="variante()" />`,
})
class Hospedeiro {
  readonly rotulo = signal('Vida');
  readonly valor = signal<string | number | undefined>(18);
  readonly variante = signal<StatVariante | undefined>(undefined);
}

describe('Stat', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza rótulo e valor nas classes canônicas', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.stat__rotulo')?.textContent?.trim()).toBe('Vida');
    expect(elemento.querySelector('.stat__valor')?.textContent?.trim()).toBe('18');
  });

  it('mostra traço atenuado quando o valor não foi preenchido', () => {
    const fixture = montar();
    fixture.componentInstance.valor.set(undefined);
    fixture.detectChanges();

    const valor = raiz(fixture).querySelector('.stat__valor');
    const marcadorAusente = valor?.querySelector('.stat__valor--sem-valor');

    expect(valor?.textContent?.trim()).toBe('—');
    expect(marcadorAusente).not.toBeNull();
    expect(marcadorAusente?.getAttribute('aria-label')).toBe('Não preenchido');
  });

  it('preserva zero como valor informado', () => {
    const fixture = montar();
    fixture.componentInstance.valor.set(0);
    fixture.detectChanges();

    const valor = raiz(fixture).querySelector('.stat__valor');

    expect(valor?.textContent?.trim()).toBe('0');
    expect(valor?.querySelector('.stat__valor--sem-valor')).toBeNull();
  });

  it('não aplica modificador de cor por padrão', () => {
    const stat = raiz(montar()).querySelector('.stat') as HTMLElement;

    expect(stat.classList.contains('stat--vida')).toBe(false);
    expect(stat.classList.contains('stat--energia')).toBe(false);
    expect(stat.classList.contains('stat--positivo')).toBe(false);
  });

  it('aplica o modificador de cada variante semântica', () => {
    const fixture = montar();
    const stat = () => raiz(fixture).querySelector('.stat') as HTMLElement;

    for (const variante of ['vida', 'energia', 'positivo'] as const) {
      fixture.componentInstance.variante.set(variante);
      fixture.detectChanges();
      expect(stat().classList.contains(`stat--${variante}`)).toBe(true);
    }
  });
});
