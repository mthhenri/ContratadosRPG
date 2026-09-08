import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CalculadoraFlutuante } from './calculadora-flutuante.component';

describe('CalculadoraFlutuante', () => {
  let fixture: ComponentFixture<CalculadoraFlutuante>;

  beforeEach(async () => {
    // `app-painel-flutuante` persiste posição/minimizado em `localStorage` por `[id]`
    // ("calculadora") — sem isso, um teste anterior que minimiza vazaria o estado pro próximo.
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [CalculadoraFlutuante] }).compileComponents();
    fixture = TestBed.createComponent(CalculadoraFlutuante);
    fixture.detectChanges();
  });

  function janela(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela');
  }

  it('expõe o gatilho no contrato compartilhado e o mantém inline no mobile', () => {
    const gatilho = fixture.nativeElement.querySelector(
      '.calc-flutuante__gatilho',
    ) as HTMLButtonElement;

    expect(gatilho.classList).toContain('utilitario-flutuante');
    expect(gatilho.classList).toContain('utilitario-flutuante--calculadora');
    expect(gatilho.classList).toContain('utilitario-flutuante--inline-mobile');
  });

  it('alternar() abre se fechada e fecha se aberta — pública, um consumidor com [mostrarGatilho]="false" (ex.: o item "Calculadora" da coluna de ações do mestre da campanha) chama via referência de template', () => {
    expect(janela()).toBeNull();

    fixture.componentInstance.alternar();
    fixture.detectChanges();
    expect(janela()).not.toBeNull();

    fixture.componentInstance.alternar();
    fixture.detectChanges();
    expect(janela()).toBeNull();
  });

  it('alternar() restaura em vez de fechar quando a janela está aberta minimizada', () => {
    // Achado ao vivo: com uma janela minimizada de uma sessão anterior, `aberta` já valia `true`
    // — sem essa checagem, o próximo clique em "Calculadora" fechava uma janela que já estava
    // escondida, e o usuário nunca via nada abrir (indefinidamente, até limpar o localStorage).
    fixture.componentInstance.alternar();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[aria-label^="Minimizar"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(janela()!.hidden).toBe(true);

    fixture.componentInstance.alternar();
    fixture.detectChanges();

    expect(janela()!.hidden).toBe(false);
  });
});
