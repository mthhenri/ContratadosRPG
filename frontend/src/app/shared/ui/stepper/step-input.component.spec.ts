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

@Component({
  selector: 'app-step-input-hospedeiro-nao-digitavel',
  imports: [ReactiveFormsModule, StepInput],
  template: `<app-step-input
    [formControl]="controle"
    [comSinal]="comSinal"
    [digitavel]="false"
  />`,
})
class HospedeiroNaoDigitavel {
  controle = new FormControl(0);
  comSinal = false;
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

describe('StepInput — digitavel=false', () => {
  async function montar(config?: Partial<Pick<HospedeiroNaoDigitavel, 'comSinal'>>) {
    await TestBed.configureTestingModule({ imports: [HospedeiroNaoDigitavel] }).compileComponents();
    const fixture = TestBed.createComponent(HospedeiroNaoDigitavel);
    if (config) {
      Object.assign(fixture.componentInstance, config);
    }
    await fixture.whenStable();
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      hospedeiro: fixture.componentInstance,
      valor: elemento.querySelector('.stepper__valor--exibicao') as HTMLSpanElement,
      botaoMenos: elemento.querySelectorAll<HTMLButtonElement>('.stepper__botao')[0],
      botaoMais: elemento.querySelectorAll<HTMLButtonElement>('.stepper__botao')[1],
    };
  }

  it('não renderiza um <input> — o valor é um <span> só-leitura', async () => {
    const { fixture } = await montar();
    expect((fixture.nativeElement as HTMLElement).querySelector('input')).toBeNull();
  });

  it('um toque curto no botão soma/subtrai um passo (via appHoldRepeat)', async () => {
    const { fixture, hospedeiro, botaoMais, botaoMenos } = await montar();
    hospedeiro.controle.setValue(5);
    botaoMais.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    botaoMais.dispatchEvent(new MouseEvent('pointerup'));
    fixture.detectChanges();
    expect(hospedeiro.controle.value).toBe(6);
    botaoMenos.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    botaoMenos.dispatchEvent(new MouseEvent('pointerup'));
    fixture.detectChanges();
    expect(hospedeiro.controle.value).toBe(5);
  });

  it('segurar o botão repete o passo', async () => {
    const { fixture, hospedeiro, botaoMais } = await montar();
    hospedeiro.controle.setValue(0);
    vi.useFakeTimers();
    try {
      botaoMais.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
      vi.advanceTimersByTime(400 + 90 * 2);
      fixture.detectChanges();
      expect(hospedeiro.controle.value).toBeGreaterThan(1);
      botaoMais.dispatchEvent(new MouseEvent('pointerup'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('sem comSinal, exibe o valor bruto', async () => {
    const { fixture, hospedeiro, valor } = await montar();
    hospedeiro.controle.setValue(3);
    fixture.detectChanges();
    expect(valor.textContent?.trim()).toBe('3');
    expect(valor.classList.contains('stepper__valor--ativo')).toBe(false);
  });

  it('com comSinal, antepõe "+" a valores positivos e marca --ativo quando != 0', async () => {
    const { fixture, hospedeiro, valor } = await montar({ comSinal: true });
    hospedeiro.controle.setValue(3);
    fixture.detectChanges();
    expect(valor.textContent?.trim()).toBe('+3');
    expect(valor.classList.contains('stepper__valor--ativo')).toBe(true);

    hospedeiro.controle.setValue(0);
    fixture.detectChanges();
    expect(valor.textContent?.trim()).toBe('0');
    expect(valor.classList.contains('stepper__valor--ativo')).toBe(false);

    hospedeiro.controle.setValue(-2);
    fixture.detectChanges();
    expect(valor.textContent?.trim()).toBe('-2');
    expect(valor.classList.contains('stepper__valor--ativo')).toBe(true);
  });
});
