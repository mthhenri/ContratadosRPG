import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Chip, ChipVariante } from './chip.component';

/** Prova o selo canônico (`padrao`) e a variante discreta (`sutil`) auditadas na `ui-03`. */
@Component({
  imports: [Chip],
  template: `<app-chip [variante]="variante()">{{ texto() }}</app-chip>`,
})
class Hospedeiro {
  readonly variante = signal<ChipVariante>('padrao');
  readonly texto = signal('CLASSE-E // CONFIDENCIAL');
}

describe('Chip', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza o texto projetado dentro do selo canônico', () => {
    const chip = raiz(montar()).querySelector('.chip');

    expect(chip).not.toBeNull();
    expect(chip!.textContent?.trim()).toBe('CLASSE-E // CONFIDENCIAL');
    expect(chip!.classList.contains('chip--sutil')).toBe(false);
  });

  it('aplica o modificador sutil quando pedido', () => {
    const fixture = montar();
    fixture.componentInstance.variante.set('sutil');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('.chip.chip--sutil')).not.toBeNull();
  });
});
