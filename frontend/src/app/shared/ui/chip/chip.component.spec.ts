import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Icone } from '../../icone/icone.component';
import { Chip, ChipSeveridade, ChipTom, ChipVariante } from './chip.component';

/** Prova o selo canônico (`padrao`) e a variante discreta (`sutil`) auditadas na `ui-03`. */
@Component({
  imports: [Chip, Icone],
  template: `<app-chip [variante]="variante()" [severidade]="severidade()"
    [tom]="tom()" [quebravel]="quebravel()"
    ><app-icone nome="alerta" />{{ texto() }}</app-chip>`,
})
class Hospedeiro {
  readonly variante = signal<ChipVariante>('padrao');
  readonly severidade = signal<ChipSeveridade | undefined>(undefined);
  readonly tom = signal<ChipTom>('sutil');
  readonly texto = signal('CLASSE-E // CONFIDENCIAL');
  readonly quebravel = signal(false);
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
    expect(chip!.classList.contains("chip--quebravel")).toBe(false);
  });

  it('aplica o modificador sutil quando pedido', () => {
    const fixture = montar();
    fixture.componentInstance.variante.set('sutil');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('.chip.chip--sutil')).not.toBeNull();
  });

  it("permite optar pela quebra sem perder texto, variante ou ícone e permite desfazê-la", () => {
    const fixture = montar();
    fixture.componentInstance.variante.set("sutil");
    fixture.componentInstance.texto.set("+1 em ESCOLHA ( exceto LUT ou PON )");
    fixture.componentInstance.quebravel.set(true);
    fixture.detectChanges();

    const chip = raiz(fixture).querySelector(".chip");
    const host = raiz(fixture).querySelector("app-chip");
    expect(chip?.classList).toContain("chip--quebravel");
    expect(chip?.classList).toContain("chip--sutil");
    expect(host?.classList).toContain("chip-host--quebravel");
    expect(chip?.textContent?.trim()).toBe("+1 em ESCOLHA ( exceto LUT ou PON )");
    expect(chip?.querySelector("app-icone")).not.toBeNull();

    fixture.componentInstance.quebravel.set(false);
    fixture.detectChanges();
    expect(chip?.classList).not.toContain("chip--quebravel");
    expect(host?.classList).not.toContain("chip-host--quebravel");
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

describe('Chip — severidade sucesso', () => {
  it('aplica a classe da severidade de sucesso (pn-10)', () => {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.severidade.set('sucesso');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.chip--severidade-sucesso')).not.toBeNull();
  });
});

describe('Chip — severidades de recurso (revisao-visual-regras)', () => {
  it.each(['energia', 'ajuda'] as const)('aplica a classe da severidade %s', (severidade) => {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.severidade.set(severidade);
    fixture.detectChanges();

    const chip = (fixture.nativeElement as HTMLElement).querySelector('.chip');
    expect(chip?.classList).toContain(`chip--severidade-${severidade}`);
    expect(chip?.querySelector('app-icone')).not.toBeNull();
  });
});
