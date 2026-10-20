import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { DestinoPasta } from '../../documento-arvore';
import { PastaDestinoDialog } from './pasta-destino-dialog.component';

@Component({
  imports: [PastaDestinoDialog],
  template: `<app-pasta-destino-dialog
    titulo="Mover Carta"
    [destinos]="destinos"
    [atualId]="atualId()"
    (confirmou)="confirmados.push($event)"
    (fechou)="fechou = fechou + 1"
  />`,
})
class Hospedeiro {
  readonly destinos: readonly DestinoPasta[] = [
    { id: null, rotulo: 'Raiz da Biblioteca', nivel: 0 },
    { id: 1, rotulo: 'Pistas', nivel: 1 },
    { id: 2, rotulo: 'Cidade', nivel: 2 },
  ];
  readonly atualId = signal<number | null>(null);
  readonly confirmados: (number | null)[] = [];
  fechou = 0;
}

describe('PastaDestinoDialog', () => {
  function montar(atualId: number | null = null) {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.atualId.set(atualId);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, host: fixture.componentInstance };
  }

  const submit = (raiz: HTMLElement): HTMLButtonElement =>
    raiz.querySelector('button[type="submit"]') as HTMLButtonElement;

  it('abre no destino atual, com a raiz do mesmo jeito: nada a mover, botão desabilitado', () => {
    const { raiz } = montar(null);

    expect(raiz.textContent).toContain('Mover Carta');
    expect(raiz.querySelector('.seletor__valor')?.textContent?.trim()).toBe('Raiz da Biblioteca');
    expect(submit(raiz).disabled).toBe(true);
  });

  it('abre na pasta onde o item está agora', () => {
    const { raiz } = montar(1);

    expect(raiz.querySelector('.seletor__valor')?.textContent?.trim()).toBe('Pistas');
    expect(submit(raiz).disabled).toBe(true);
  });

  it('Cancelar fecha sem confirmar', () => {
    const { raiz, host } = montar();

    (raiz.querySelector('.pasta-destino__acao--cancelar') as HTMLButtonElement).click();

    expect(host.fechou).toBe(1);
    expect(host.confirmados).toEqual([]);
  });
});
