import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Icone } from '../../icone/icone.component';
import { Chip, ChipSeveridade, ChipTom, ChipVariante } from './chip.component';

/** Prova o selo canônico (`padrao`) e a variante discreta (`sutil`) auditadas na `ui-03`. */
@Component({
  imports: [Chip, Icone],
  template: `<app-chip [variante]="variante()" [severidade]="severidade()" [tom]="tom()"><app-icone nome="alerta" />{{ texto() }}</app-chip>`,
})
class Hospedeiro {
  readonly variante = signal<ChipVariante>('padrao');
  readonly severidade = signal<ChipSeveridade | undefined>(undefined);
  readonly tom = signal<ChipTom>('sutil');
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

  it('aplica a severidade e o tom sem alterar o slot opcional de ícone', () => {
    const fixture = montar();
    fixture.componentInstance.severidade.set('aviso');
    fixture.componentInstance.tom.set('contorno');
    fixture.detectChanges();

    const chip = raiz(fixture).querySelector('.chip');
    expect(chip?.classList).toContain('chip--severidade-aviso');
    expect(chip?.classList).toContain('chip--tom-contorno');
    expect(chip?.querySelector('app-icone')).not.toBeNull();
  });
});
