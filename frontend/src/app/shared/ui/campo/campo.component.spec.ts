import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Campo, CampoTamanho } from './campo.component';

/**
 * Prova o invólucro de campo: rótulo, dica e erro pelas classes BEM canônicas, os três degraus
 * de tamanho medidos na auditoria, e — o contrato mais frágil — o controle projetado
 * continuando filho DIRETO do `<label>`, de que depende a regra global de asterisco
 * obrigatório (`label:has(> input:required)`, em `styles/tema/_base.scss`).
 */
@Component({
  imports: [Campo],
  template: `
    <app-campo [rotulo]="rotulo()" [tamanho]="tamanho()" [dica]="dica()" [erro]="erro()">
      <input class="autenticacao__entrada" type="text" required />
    </app-campo>
  `,
})
class Hospedeiro {
  readonly rotulo = signal('Login');
  readonly tamanho = signal<CampoTamanho>('padrao');
  readonly dica = signal('');
  readonly erro = signal('');
}

describe('Campo', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza o rótulo dentro do <label> do bloco canônico', () => {
    const campo = raiz(montar()).querySelector('label.campo');

    expect(campo).not.toBeNull();
    expect(campo!.querySelector('.campo__rotulo')?.textContent?.trim()).toBe('Login');
  });

  it('mantém o controle projetado como filho direto do <label>', () => {
    const controle = raiz(montar()).querySelector('label.campo > input');

    expect(controle).not.toBeNull();
    expect(controle!.classList.contains('autenticacao__entrada')).toBe(true);
  });

  it('deixa o rótulo como primeiro filho, onde o asterisco de obrigatório é desenhado', () => {
    const campo = raiz(montar()).querySelector('label.campo') as HTMLElement;

    expect(campo.firstElementChild?.classList.contains('campo__rotulo')).toBe(true);
  });

  it('esconde dica e erro enquanto não houver texto', () => {
    const elemento = raiz(montar());

    expect(elemento.querySelector('.campo__dica')).toBeNull();
    expect(elemento.querySelector('.campo__erro')).toBeNull();
  });

  it('mostra e esconde o erro conforme a mensagem que o consumidor decide', () => {
    const fixture = montar();

    fixture.componentInstance.erro.set('Mínimo de 6 caracteres.');
    fixture.detectChanges();
    expect(raiz(fixture).querySelector('.campo__erro')?.textContent?.trim()).toBe(
      'Mínimo de 6 caracteres.',
    );

    fixture.componentInstance.erro.set('');
    fixture.detectChanges();
    expect(raiz(fixture).querySelector('.campo__erro')).toBeNull();
  });

  it('mostra a dica quando informada', () => {
    const fixture = montar();
    fixture.componentInstance.dica.set('Use o login que o mestre cadastrou.');
    fixture.detectChanges();

    expect(raiz(fixture).querySelector('.campo__dica')?.textContent?.trim()).toBe(
      'Use o login que o mestre cadastrou.',
    );
  });

  it('aplica o modificador de cada degrau de tamanho, e nenhum no padrão', () => {
    const fixture = montar();
    const campo = () => raiz(fixture).querySelector('label.campo') as HTMLElement;

    expect(campo().classList.contains('campo--compacto')).toBe(false);
    expect(campo().classList.contains('campo--amplo')).toBe(false);

    fixture.componentInstance.tamanho.set('compacto');
    fixture.detectChanges();
    expect(campo().classList.contains('campo--compacto')).toBe(true);
    expect(campo().classList.contains('campo--amplo')).toBe(false);

    fixture.componentInstance.tamanho.set('amplo');
    fixture.detectChanges();
    expect(campo().classList.contains('campo--amplo')).toBe(true);
    expect(campo().classList.contains('campo--compacto')).toBe(false);
  });
});
