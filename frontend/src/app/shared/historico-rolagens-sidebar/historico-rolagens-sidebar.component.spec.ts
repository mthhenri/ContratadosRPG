import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { HistoricoRolagensSidebar } from './historico-rolagens-sidebar.component';

describe('HistoricoRolagensSidebar', () => {
  let fixture: ComponentFixture<HistoricoRolagensSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricoRolagensSidebar],
    }).compileComponents();
    fixture = TestBed.createComponent(HistoricoRolagensSidebar);
    fixture.componentRef.setInput('itens', []);
    fixture.detectChanges();
  });

  it('expõe o gatilho no contrato compartilhado sem reservar a calculadora por padrão', () => {
    const gatilho = obterGatilho();

    expect(gatilho.classList).toContain('utilitario-flutuante');
    expect(gatilho.classList).toContain('utilitario-flutuante--historico');
    expect(gatilho.classList).toContain('utilitario-flutuante--inline-mobile');
    expect(gatilho.classList).not.toContain('utilitario-flutuante--acima');
  });

  it('traduz acimaDaCalculadora no modificador compartilhado e preserva o modificador legado', () => {
    fixture.componentRef.setInput('acimaDaCalculadora', true);
    fixture.detectChanges();

    const gatilho = obterGatilho();
    expect(gatilho.classList).toContain('utilitario-flutuante--acima');
    expect(gatilho.classList).toContain('historico-rolagens__gatilho--empilhado');
  });

  it('mostra o esqueleto de carregamento (ui-14) em vez de um texto solto', () => {
    fixture.componentRef.setInput('carregando', true);
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    expect(painel.querySelector('.historico-rolagens__esqueleto')).not.toBeNull();
    expect(painel.querySelectorAll('.historico-rolagens__esqueleto-item').length).toBe(3);
    expect(painel.querySelector('app-estado-vazio')).toBeNull();
  });

  it('mostra o estado vazio (ui-14) quando não há rolagens e o carregamento terminou', () => {
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    const estadoVazio = painel.querySelector('app-estado-vazio');
    expect(estadoVazio).not.toBeNull();
    expect(estadoVazio?.querySelector('.estado-vazio__titulo')?.textContent?.trim()).toBe(
      'Nenhuma rolagem ainda.',
    );
    expect(painel.querySelector('.historico-rolagens__esqueleto')).toBeNull();
  });

  function obterGatilho(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.historico-rolagens__gatilho',
    ) as HTMLButtonElement;
  }
});
