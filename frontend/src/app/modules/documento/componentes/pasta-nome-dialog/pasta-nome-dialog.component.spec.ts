import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PastaNomeDialog } from './pasta-nome-dialog.component';

@Component({
  imports: [PastaNomeDialog],
  template: `<app-pasta-nome-dialog
    titulo="Renomear pasta"
    rotuloConfirmar="Renomear"
    [nomeInicial]="nomeInicial()"
    [enviando]="enviando()"
    (confirmou)="confirmados.push($event)"
    (fechou)="fechou = fechou + 1"
  />`,
})
class Hospedeiro {
  readonly nomeInicial = signal('Pistas');
  readonly enviando = signal(false);
  readonly confirmados: string[] = [];
  fechou = 0;
}

describe('PastaNomeDialog', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const campo = raiz.querySelector('input.campo__controle') as HTMLInputElement;
    const formulario = raiz.querySelector('form') as HTMLFormElement;
    const digitar = (valor: string) => {
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, raiz, campo, formulario, digitar, host: fixture.componentInstance };
  }

  it('abre com o nome inicial e o título/rótulo recebidos', () => {
    const { raiz, campo } = montar();

    expect(campo.value).toBe('Pistas');
    expect(raiz.textContent).toContain('Renomear pasta');
    expect(raiz.querySelector('button[type="submit"]')?.textContent).toContain('Renomear');
  });

  it('confirma o nome aparado', () => {
    const { formulario, digitar, host } = montar();

    digitar('  Mapas da cidade  ');
    formulario.dispatchEvent(new Event('submit'));

    expect(host.confirmados).toEqual(['Mapas da cidade']);
  });

  it('recusa nome só com espaços e mostra o erro', () => {
    const { fixture, raiz, formulario, digitar, host } = montar();

    digitar('   ');
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(host.confirmados).toEqual([]);
    expect(raiz.textContent).toContain('Dê um nome à pasta.');
  });

  it('não confirma duas vezes enquanto a escrita está em voo', () => {
    const { fixture, formulario, host } = montar();
    host.enviando.set(true);
    fixture.detectChanges();

    formulario.dispatchEvent(new Event('submit'));

    expect(host.confirmados).toEqual([]);
  });

  it('Cancelar fecha sem confirmar', () => {
    const { raiz, host } = montar();

    (raiz.querySelector('.pasta-nome__acao--cancelar') as HTMLButtonElement).click();

    expect(host.fechou).toBe(1);
    expect(host.confirmados).toEqual([]);
  });
});
