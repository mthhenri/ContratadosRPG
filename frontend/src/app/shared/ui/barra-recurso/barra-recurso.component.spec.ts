import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BarraRecurso, BarraRecursoTamanho, BarraRecursoTipo } from './barra-recurso.component';

/** Prova rótulo/valor/trilho, o limiar de alerta e a edição opcional por clique. */
@Component({
  imports: [BarraRecurso],
  template: `
    <app-barra-recurso
      rotulo="Vida"
      [recurso]="recurso()"
      [atual]="atual()"
      [maximo]="maximo()"
      [maximoEditavel]="maximoEditavel()"
      [editavel]="editavel()"
      [tamanho]="tamanho()"
      (atualAlterado)="atualEmitido.set($event)"
      (maximoAlterado)="maximoEmitido.set($event)"
    />
  `,
})
class Hospedeiro {
  readonly recurso = signal<BarraRecursoTipo>('vida');
  readonly atual = signal(18);
  readonly maximo = signal(20);
  readonly maximoEditavel = signal<number | null>(null);
  readonly editavel = signal(false);
  readonly tamanho = signal<BarraRecursoTamanho>('padrao');
  readonly atualEmitido = signal<number | null>(null);
  readonly maximoEmitido = signal<number | null>(null);
}

describe('BarraRecurso', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza rótulo e valor atual/máximo', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.barra-recurso__rotulo')?.textContent?.trim()).toBe('Vida');
    expect(elemento.querySelector('.barra-recurso__valor-atual')?.textContent?.trim()).toBe('18');
    expect(elemento.querySelector('.barra-recurso__max')?.textContent?.trim()).toBe('20');
  });

  it('preenche o trilho na proporção de atual/máximo', () => {
    const elemento = raiz(montar());

    const preenchimento = elemento.querySelector('.barra-recurso__preenchimento') as HTMLElement;
    expect(preenchimento.style.width).toBe('90%');
  });

  it('aplica o modificador do recurso', () => {
    const fixture = montar();

    for (const recurso of ['vida', 'energia'] as const) {
      fixture.componentInstance.recurso.set(recurso);
      fixture.detectChanges();
      const barra = raiz(fixture).querySelector('.barra-recurso') as HTMLElement;
      expect(barra.classList.contains(`barra-recurso--${recurso}`)).toBe(true);
    }
  });

  it('aplica a variante compacta quando solicitada', () => {
    const fixture = montar();
    fixture.componentInstance.tamanho.set('compacto');
    fixture.detectChanges();

    const barra = raiz(fixture).querySelector('.barra-recurso') as HTMLElement;
    expect(barra.classList.contains('barra-recurso--compacta')).toBe(true);
  });

  it('vira alerta abaixo de 25%, nos dois recursos', () => {
    const fixture = montar();
    fixture.componentInstance.atual.set(4);
    fixture.componentInstance.maximo.set(20);
    fixture.detectChanges();

    const barra = raiz(fixture).querySelector('.barra-recurso') as HTMLElement;
    expect(barra.classList.contains('barra-recurso--alerta')).toBe(true);
  });

  it('não é alerta em 25% ou acima', () => {
    const fixture = montar();
    fixture.componentInstance.atual.set(5);
    fixture.componentInstance.maximo.set(20);
    fixture.detectChanges();

    const barra = raiz(fixture).querySelector('.barra-recurso') as HTMLElement;
    expect(barra.classList.contains('barra-recurso--alerta')).toBe(false);
  });

  it('sem edição por padrão: valor atual não é clicável', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.barra-recurso__valor-atual--editavel')).toBeNull();
    expect(elemento.querySelector('.barra-recurso__entrada')).toBeNull();
  });

  it('com editavel, clicar no valor atual abre a digitação e confirma com Enter', () => {
    const fixture = montar();
    fixture.componentInstance.editavel.set(true);
    fixture.detectChanges();
    const elemento = raiz(fixture);

    const botaoValor = elemento.querySelector(
      '.barra-recurso__valor-atual--editavel',
    ) as HTMLButtonElement;
    expect(botaoValor).not.toBeNull();
    botaoValor.click();
    fixture.detectChanges();

    const entrada = elemento.querySelector('.barra-recurso__entrada') as HTMLInputElement;
    expect(entrada).not.toBeNull();
    entrada.value = '12';
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.atualEmitido()).toBe(12);
    expect(elemento.querySelector('.barra-recurso__entrada')).toBeNull();
  });

  it('com maximoEditavel, a digitação do máximo parte da base — não do valor exibido', () => {
    const fixture = montar();
    fixture.componentInstance.editavel.set(true);
    fixture.componentInstance.maximo.set(24); // exibido: já com bônus de equipamento
    fixture.componentInstance.maximoEditavel.set(20); // base armazenada, o que a edição altera
    fixture.detectChanges();
    const elemento = raiz(fixture);

    expect(elemento.querySelector('.barra-recurso__max')?.textContent?.trim()).toBe('24');

    (elemento.querySelector('.barra-recurso__max--editavel') as HTMLButtonElement).click();
    fixture.detectChanges();

    const entrada = elemento.querySelector('.barra-recurso__entrada') as HTMLInputElement;
    expect(entrada.value).toBe('20');
    entrada.value = '22';
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.maximoEmitido()).toBe(22);
  });
});
