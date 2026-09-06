import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ValorEditavel } from './valor-editavel.component';

@Component({
  selector: 'app-anfitriao-teste',
  imports: [ValorEditavel],
  template: `
    <app-valor-editavel
      [valor]="valor()"
      [editando]="editando()"
      [desabilitado]="desabilitado()"
      rotuloAria="Vida atual"
      (editarSolicitado)="editando.set(true)"
    >
      <input class="entrada-teste" [value]="valor()" (blur)="editando.set(false)" />
    </app-valor-editavel>
  `,
})
class AnfitriaoTeste {
  readonly valor = signal<number>(20);
  readonly editando = signal(false);
  readonly desabilitado = signal(false);
}

describe('ValorEditavel', () => {
  function montar() {
    const fixture = TestBed.createComponent(AnfitriaoTeste);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra o valor num botão clicável quando não está editando', () => {
    const fixture = montar();
    const elemento = fixture.nativeElement as HTMLElement;
    const botao = elemento.querySelector<HTMLButtonElement>('.valor-editavel__botao');
    expect(botao).not.toBeNull();
    expect(botao?.textContent?.trim()).toContain('20');
    expect(botao?.getAttribute('aria-label')).toBe('Editar Vida atual');
    expect(elemento.querySelector('.entrada-teste')).toBeNull();
  });

  it('clicar no botão emite `editarSolicitado`, que o anfitrião usa para trocar pro estado de edição', () => {
    const fixture = montar();
    const elemento = fixture.nativeElement as HTMLElement;
    elemento.querySelector<HTMLButtonElement>('.valor-editavel__botao')?.click();
    fixture.detectChanges();

    expect(elemento.querySelector('.valor-editavel__botao')).toBeNull();
    expect(elemento.querySelector('.entrada-teste')).not.toBeNull();
  });

  it('`[editando]=true` projeta o conteúdo do consumidor em vez do botão', () => {
    const fixture = montar();
    fixture.componentInstance.editando.set(true);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.valor-editavel__botao')).toBeNull();
    expect(elemento.querySelector<HTMLInputElement>('.entrada-teste')?.value).toBe('20');
  });

  it('`[desabilitado]=true` desabilita o botão (herda o esmaecido do `app-botao`)', () => {
    const fixture = montar();
    fixture.componentInstance.desabilitado.set(true);
    fixture.detectChanges();

    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.valor-editavel__botao',
    );
    expect(botao?.disabled).toBe(true);
  });
});
