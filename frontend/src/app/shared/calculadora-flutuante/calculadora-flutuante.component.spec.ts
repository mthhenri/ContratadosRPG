import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CalculadoraFlutuante } from './calculadora-flutuante.component';

describe('CalculadoraFlutuante', () => {
  let fixture: ComponentFixture<CalculadoraFlutuante>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CalculadoraFlutuante] }).compileComponents();
    fixture = TestBed.createComponent(CalculadoraFlutuante);
    fixture.detectChanges();
  });

  it('expõe o gatilho no contrato compartilhado e o mantém inline no mobile', () => {
    const gatilho = fixture.nativeElement.querySelector(
      '.calc-flutuante__gatilho',
    ) as HTMLButtonElement;

    expect(gatilho.classList).toContain('utilitario-flutuante');
    expect(gatilho.classList).toContain('utilitario-flutuante--calculadora');
    expect(gatilho.classList).toContain('utilitario-flutuante--inline-mobile');
  });
});
