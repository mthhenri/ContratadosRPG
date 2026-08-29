import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { StepInput } from './step-input.component';

@Component({
  selector: 'app-step-input-hospedeiro',
  imports: [ReactiveFormsModule, StepInput],
  template: `<app-step-input [formControl]="controle" [min]="min" [max]="max" [passo]="passo" />`,
})
class Hospedeiro {
  controle = new FormControl(0);
  min = 0;
  max = 10;
  passo = 1;
}

describe('StepInput', () => {
  async function montar(config?: Partial<Pick<Hospedeiro, 'min' | 'max' | 'passo'>>) {
    await TestBed.configureTestingModule({ imports: [Hospedeiro] }).compileComponents();
    const fixture = TestBed.createComponent(Hospedeiro);
    if (config) {
      Object.assign(fixture.componentInstance, config);
    }
    await fixture.whenStable();
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      hospedeiro: fixture.componentInstance,
      input: elemento.querySelector('.stepper__valor') as HTMLInputElement,
      botaoMenos: elemento.querySelectorAll<HTMLButtonElement>('.stepper__botao')[0],
      botaoMais: elemento.querySelectorAll<HTMLButtonElement>('.stepper__botao')[1],
    };
  }

  it('reflete o valor do FormControl no input central (writeValue)', async () => {
    const { fixture, hospedeiro, input } = await montar();
    hospedeiro.controle.setValue(5);
    fixture.detectChanges();
    expect(input.value).toBe('5');
  });

  it('incrementa pelo passo e clampa no máximo', async () => {
    const { hospedeiro, botaoMais } = await montar();
    hospedeiro.controle.setValue(9);
    botaoMais.click();
    expect(hospedeiro.controle.value).toBe(10);
    botaoMais.click();
    expect(hospedeiro.controle.value).toBe(10);
  });

  it('decrementa pelo passo e clampa no mínimo', async () => {
    const { hospedeiro, botaoMenos } = await montar();
    hospedeiro.controle.setValue(1);
    botaoMenos.click();
    expect(hospedeiro.controle.value).toBe(0);
    botaoMenos.click();
    expect(hospedeiro.controle.value).toBe(0);
  });

  it('respeita passo fracionário arredondando a 2 casas', async () => {
    const { hospedeiro, botaoMais } = await montar({ passo: 0.2, max: 5 });
    hospedeiro.controle.setValue(0);
    botaoMais.click();
    expect(hospedeiro.controle.value).toBe(0.2);
  });

  it('atualiza o controle ao digitar direto no campo', async () => {
    const { hospedeiro, input } = await montar();
    input.value = '7';
    input.dispatchEvent(new Event('input'));
    expect(hospedeiro.controle.value).toBe(7);
  });
});
